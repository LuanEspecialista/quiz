-- Restringe a curadoria a uma única apresentação por cliente/empreendimento.
UPDATE public.cliente_empreendimentos
SET apresentacao_modo = 'preferida'
WHERE apresentacao_modo = 'ambas';

ALTER TABLE public.cliente_empreendimentos
  DROP CONSTRAINT IF EXISTS cliente_empreendimentos_apresentacao_modo_check;
ALTER TABLE public.cliente_empreendimentos
  ADD CONSTRAINT cliente_empreendimentos_apresentacao_modo_check
  CHECK (apresentacao_modo IN ('preferida', 'pdf', 'link', 'nenhuma'));

-- Snapshot privado de comprador, cônjuge, consentimento e anexos na proposta.
ALTER TABLE public.cliente_propostas
  ADD COLUMN IF NOT EXISTS dados_proponente jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS dados_conjuge jsonb,
  ADD COLUMN IF NOT EXISTS documentos jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS consentimento_dados_em timestamptz,
  ADD COLUMN IF NOT EXISTS consentimento_conjuge boolean NOT NULL DEFAULT false;

-- Bucket privado: identidade, comprovante de residência e certidões nunca são públicos.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'cliente-propostas',
  'cliente-propostas',
  false,
  10485760,
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Ajuda a impedir que o cliente remova um arquivo depois que ele foi anexado a uma proposta.
CREATE OR REPLACE FUNCTION public.cliente_proposta_documento_vinculado(p_storage_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.cliente_propostas p
    JOIN public.clientes c ON c.id = p.cliente_id
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(p.documentos) = 'array' THEN p.documentos ELSE '[]'::jsonb END
    ) AS doc(item)
    WHERE c.user_id = auth.uid()
      AND doc.item ->> 'storage_path' = p_storage_path
  );
$function$;
REVOKE ALL ON FUNCTION public.cliente_proposta_documento_vinculado(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cliente_proposta_documento_vinculado(text) TO authenticated;

DROP POLICY IF EXISTS cliente_propostas_documentos_admin_ou_proprio_select ON storage.objects;
CREATE POLICY cliente_propostas_documentos_admin_ou_proprio_select
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'cliente-propostas'
  AND (
    public.is_admin()
    OR (
      (storage.foldername(name))[1] = (SELECT auth.uid())::text
      AND EXISTS (
        SELECT 1 FROM public.clientes c
        WHERE c.user_id = (SELECT auth.uid())
          AND c.acesso_portal
          AND (c.acesso_expira_em IS NULL OR c.acesso_expira_em > now())
      )
    )
  )
);

DROP POLICY IF EXISTS cliente_propostas_documentos_proprio_insert ON storage.objects;
CREATE POLICY cliente_propostas_documentos_proprio_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'cliente-propostas'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND (storage.foldername(name))[2] ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND (storage.foldername(name))[3] IN (
    'identificacao', 'comprovante-residencia', 'certidao-casamento', 'identificacao-conjuge'
  )
  AND name ~* E'\\.(pdf|jpe?g|png|webp)$'
  AND EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.user_id = (SELECT auth.uid())
      AND c.acesso_portal
      AND (c.acesso_expira_em IS NULL OR c.acesso_expira_em > now())
  )
);

DROP POLICY IF EXISTS cliente_propostas_documentos_proprio_delete_pendente ON storage.objects;
CREATE POLICY cliente_propostas_documentos_proprio_delete_pendente
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'cliente-propostas'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND NOT public.cliente_proposta_documento_vinculado(name)
);

-- A RPC continua sendo o único caminho de criação de propostas para clientes.
DROP FUNCTION IF EXISTS public.enviar_proposta_cliente(text,numeric,numeric,numeric,integer,text,text,text,numeric,jsonb,text,text,text,text);

CREATE FUNCTION public.enviar_proposta_cliente(
  p_empreendimento_id text,
  p_entrada numeric,
  p_parcela_mensal numeric,
  p_balao numeric DEFAULT 0,
  p_quantidade_baloes integer DEFAULT 0,
  p_objetivo text DEFAULT NULL,
  p_mensagem text DEFAULT NULL,
  p_unidade_id text DEFAULT NULL,
  p_desconto_percentual numeric DEFAULT 0,
  p_fluxo_snapshot jsonb DEFAULT '{}'::jsonb,
  p_cpf text DEFAULT NULL,
  p_email text DEFAULT NULL,
  p_nome text DEFAULT NULL,
  p_telefone text DEFAULT NULL,
  p_profissao text DEFAULT NULL,
  p_estado_civil text DEFAULT NULL,
  p_dados_conjuge jsonb DEFAULT NULL,
  p_documentos jsonb DEFAULT '[]'::jsonb,
  p_proposta_id uuid DEFAULT gen_random_uuid(),
  p_consentimento_dados boolean DEFAULT false,
  p_consentimento_conjuge boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_cliente_id public.clientes.id%TYPE;
  v_unidade_id public.unidades.id%TYPE;
  v_proposta_id uuid := coalesce(p_proposta_id, gen_random_uuid());
  v_valor_original numeric := 0;
  v_desconto numeric := 0;
  v_desconto_valor numeric := 0;
  v_valor_final numeric := 0;
  v_fluxo jsonb := coalesce(p_fluxo_snapshot, '{}'::jsonb);
  v_documentos jsonb := coalesce(p_documentos, '[]'::jsonb);
  v_conjuge jsonb;
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_cpf text := nullif(regexp_replace(coalesce(p_cpf, ''), '[^0-9]', '', 'g'), '');
  v_cpf_conjuge text := nullif(regexp_replace(coalesce(p_dados_conjuge ->> 'cpf', ''), '[^0-9]', '', 'g'), '');
  v_email_conjuge text := nullif(lower(trim(coalesce(p_dados_conjuge ->> 'email', ''))), '');
  v_total numeric := nullif(v_fluxo ->> 'total', '')::numeric;
  v_prefix text;
BEGIN
  SELECT c.id INTO v_cliente_id
  FROM public.clientes c
  WHERE c.user_id = auth.uid()
    AND c.acesso_portal
    AND (c.acesso_expira_em IS NULL OR c.acesso_expira_em > now())
  LIMIT 1;

  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'Acesso de cliente não encontrado ou expirado.' USING errcode = '42501';
  END IF;
  IF nullif(trim(coalesce(p_nome, '')), '') IS NULL
     OR nullif(trim(coalesce(p_telefone, '')), '') IS NULL
     OR nullif(trim(coalesce(p_profissao, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Nome, telefone e profissão são obrigatórios.' USING errcode = '22023';
  END IF;
  IF v_email IS NULL OR v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' THEN
    RAISE EXCEPTION 'E-mail inválido.' USING errcode = '22023';
  END IF;
  IF v_cpf IS NULL OR length(v_cpf) <> 11 THEN
    RAISE EXCEPTION 'CPF inválido.' USING errcode = '22023';
  END IF;
  IF coalesce(p_estado_civil, '') NOT IN ('solteiro', 'casado_civil', 'uniao_estavel', 'divorciado', 'viuvo') THEN
    RAISE EXCEPTION 'Selecione o estado civil.' USING errcode = '22023';
  END IF;
  IF NOT coalesce(p_consentimento_dados, false) THEN
    RAISE EXCEPTION 'Confirme a autorização de uso dos dados para análise da proposta.' USING errcode = '22023';
  END IF;

  IF p_estado_civil IN ('casado_civil', 'uniao_estavel') THEN
    IF p_dados_conjuge IS NULL
       OR nullif(trim(coalesce(p_dados_conjuge ->> 'nome', '')), '') IS NULL
       OR nullif(trim(coalesce(p_dados_conjuge ->> 'telefone', '')), '') IS NULL
       OR nullif(trim(coalesce(p_dados_conjuge ->> 'profissao', '')), '') IS NULL
       OR v_email_conjuge IS NULL
       OR v_email_conjuge !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
       OR v_cpf_conjuge IS NULL
       OR length(v_cpf_conjuge) <> 11 THEN
      RAISE EXCEPTION 'Preencha os dados do cônjuge: nome, CPF, telefone, e-mail e profissão.' USING errcode = '22023';
    END IF;
    IF NOT coalesce(p_consentimento_conjuge, false) THEN
      RAISE EXCEPTION 'Confirme que o cônjuge autorizou o envio dos dados.' USING errcode = '22023';
    END IF;
    v_conjuge := jsonb_build_object(
      'nome', left(trim(p_dados_conjuge ->> 'nome'), 150),
      'cpf', v_cpf_conjuge,
      'telefone', left(trim(p_dados_conjuge ->> 'telefone'), 40),
      'email', v_email_conjuge,
      'profissao', left(trim(p_dados_conjuge ->> 'profissao'), 100)
    );
  ELSE
    v_conjuge := NULL;
  END IF;

  IF jsonb_typeof(v_documentos) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Lista de documentos inválida.' USING errcode = '22023';
  END IF;
  IF jsonb_array_length(v_documentos) > 8 THEN
    RAISE EXCEPTION 'Lista de documentos inválida.' USING errcode = '22023';
  END IF;
  v_prefix := auth.uid()::text || '/' || v_proposta_id::text || '/';
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_documentos) AS doc(item)
    WHERE coalesce(doc.item ->> 'tipo', '') NOT IN (
        'identificacao', 'comprovante_residencia', 'certidao_casamento', 'identificacao_conjuge'
      )
      OR coalesce(doc.item ->> 'mime_type', '') NOT IN (
        'application/pdf', 'image/jpeg', 'image/png', 'image/webp'
      )
      OR coalesce(doc.item ->> 'storage_path', '') NOT LIKE v_prefix || '%'
      OR doc.item ->> 'storage_path' !~* E'\\.(pdf|jpe?g|png|webp)$'
      OR nullif(doc.item ->> 'nome_original', '') IS NULL
      OR coalesce(doc.item ->> 'tamanho_bytes', '') !~ '^[0-9]{1,8}$'
      OR CASE
          WHEN coalesce(doc.item ->> 'tamanho_bytes', '') ~ '^[0-9]{1,8}$'
          THEN (doc.item ->> 'tamanho_bytes')::bigint NOT BETWEEN 1 AND 10485760
          ELSE true
         END
  ) THEN
    RAISE EXCEPTION 'Um ou mais documentos estão fora dos formatos permitidos.' USING errcode = '22023';
  END IF;
  IF (
    SELECT count(DISTINCT doc.item ->> 'storage_path')
    FROM jsonb_array_elements(v_documentos) AS doc(item)
  ) <> jsonb_array_length(v_documentos) THEN
    RAISE EXCEPTION 'Há documentos repetidos na proposta.' USING errcode = '22023';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(v_documentos) AS doc(item)
    LEFT JOIN storage.objects object
      ON object.bucket_id = 'cliente-propostas'
     AND object.name = doc.item ->> 'storage_path'
    WHERE object.id IS NULL
  ) THEN
    RAISE EXCEPTION 'Não foi possível localizar todos os documentos enviados.' USING errcode = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.cliente_empreendimentos
    WHERE cliente_id = v_cliente_id
      AND empreendimento_id = p_empreendimento_id
      AND visivel
      AND permitir_proposta
  ) THEN
    RAISE EXCEPTION 'Esta oportunidade não está liberada para proposta.' USING errcode = '42501';
  END IF;

  IF nullif(trim(coalesce(p_unidade_id, '')), '') IS NOT NULL THEN
    v_unidade_id := p_unidade_id::uuid;
    IF NOT EXISTS (
      SELECT 1 FROM public.cliente_empreendimentos
      WHERE cliente_id = v_cliente_id
        AND empreendimento_id = p_empreendimento_id
        AND v_unidade_id::text = ANY(coalesce(unidade_ids_selecionadas, '{}'::text[]))
    ) THEN
      RAISE EXCEPTION 'Esta unidade não está liberada para proposta.' USING errcode = '42501';
    END IF;
    SELECT coalesce(u.valor_tabela, 0),
           greatest(0, coalesce(nullif(jsonb_extract_path_text(ce.condicoes_unidades, v_unidade_id::text, 'desconto_valor'), '')::numeric, 0)),
           greatest(0, coalesce(nullif(jsonb_extract_path_text(ce.condicoes_unidades, v_unidade_id::text, 'desconto_percentual'), '')::numeric, ce.desconto_percentual, 0))
      INTO v_valor_original, v_desconto_valor, v_desconto
    FROM public.unidades u
    JOIN public.cliente_empreendimentos ce
      ON ce.empreendimento_id = u.empreendimento_id AND ce.cliente_id = v_cliente_id
    WHERE u.id = v_unidade_id
      AND u.empreendimento_id = p_empreendimento_id
      AND lower(coalesce(u.status, '')) NOT IN ('vendida', 'bloqueada', 'fora de tabela');
  ELSE
    SELECT coalesce(e.faixa_preco, 0), greatest(0, coalesce(ce.desconto_percentual, 0))
      INTO v_valor_original, v_desconto
    FROM public.empreendimentos e
    JOIN public.cliente_empreendimentos ce
      ON ce.empreendimento_id = e.id AND ce.cliente_id = v_cliente_id
    WHERE e.id = p_empreendimento_id;
  END IF;

  IF v_desconto_valor > 0 THEN
    v_desconto := least(100, round(v_desconto_valor / greatest(v_valor_original, 1) * 100, 6));
    v_valor_final := greatest(0, round(v_valor_original - v_desconto_valor, 2));
  ELSE
    v_desconto := greatest(0, least(100, v_desconto));
    v_valor_final := round(v_valor_original * (1 - v_desconto / 100), 2);
  END IF;
  IF v_total IS NULL OR abs(v_total - v_valor_final) > 0.02 OR v_total > v_valor_final + 0.02 THEN
    RAISE EXCEPTION 'O fluxo precisa fechar exatamente no valor final negociado da unidade.' USING errcode = '22023';
  END IF;
  IF coalesce(p_entrada, 0) < 0 OR coalesce(p_parcela_mensal, 0) < 0 OR coalesce(p_balao, 0) < 0
     OR coalesce(p_quantidade_baloes, 0) < 0 OR coalesce(p_quantidade_baloes, 0) > 120 THEN
    RAISE EXCEPTION 'Valores da proposta inválidos.' USING errcode = '22023';
  END IF;

  UPDATE public.clientes
  SET nome = left(trim(p_nome), 150),
      telefone = left(trim(p_telefone), 40),
      cpf = v_cpf,
      email = v_email,
      profissao = left(trim(p_profissao), 100),
      updated_at = now()
  WHERE id = v_cliente_id;

  INSERT INTO public.cliente_propostas (
    id, cliente_id, empreendimento_id, unidade_id, entrada, parcela_mensal, balao,
    quantidade_baloes, objetivo, mensagem, valor_original, desconto_percentual,
    valor_final, fluxo_snapshot, observacao_comercial, dados_proponente, dados_conjuge,
    documentos, consentimento_dados_em, consentimento_conjuge
  ) VALUES (
    v_proposta_id, v_cliente_id, p_empreendimento_id, v_unidade_id,
    coalesce(p_entrada, 0), coalesce(p_parcela_mensal, 0), coalesce(p_balao, 0),
    coalesce(p_quantidade_baloes, 0), nullif(left(coalesce(p_objetivo, ''), 100), ''),
    nullif(left(coalesce(p_mensagem, ''), 1500), ''), v_valor_original, v_desconto,
    v_valor_final, v_fluxo,
    (SELECT ce.observacao_comercial FROM public.cliente_empreendimentos ce
     WHERE ce.cliente_id = v_cliente_id AND ce.empreendimento_id = p_empreendimento_id LIMIT 1),
    jsonb_build_object(
      'nome', left(trim(p_nome), 150), 'cpf', v_cpf,
      'telefone', left(trim(p_telefone), 40), 'email', v_email,
      'profissao', left(trim(p_profissao), 100), 'estado_civil', p_estado_civil
    ),
    v_conjuge,
    v_documentos,
    now(),
    coalesce(p_consentimento_conjuge, false)
  );

  RETURN jsonb_build_object(
    'ok', true,
    'proposta_id', v_proposta_id,
    'valor_original', v_valor_original,
    'desconto_valor', v_desconto_valor,
    'desconto_percentual', v_desconto,
    'valor_final', v_valor_final,
    'documentos_recebidos', jsonb_array_length(v_documentos)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.enviar_proposta_cliente(
  text,numeric,numeric,numeric,integer,text,text,text,numeric,jsonb,text,text,text,text,
  text,text,jsonb,jsonb,uuid,boolean,boolean
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.enviar_proposta_cliente(
  text,numeric,numeric,numeric,integer,text,text,text,numeric,jsonb,text,text,text,text,
  text,text,jsonb,jsonb,uuid,boolean,boolean
) TO authenticated;
NOTIFY pgrst, 'reload schema';
