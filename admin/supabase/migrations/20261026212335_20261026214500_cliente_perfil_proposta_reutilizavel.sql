-- Perfil reutilizável de proposta. Nenhum snapshot antigo é promovido automaticamente:
-- o perfil só é criado/atualizado após opt-in explícito no portal.
DO $migration$
DECLARE
  v_cliente_id_type text;
BEGIN
  SELECT pg_catalog.format_type(a.atttypid, a.atttypmod)
    INTO v_cliente_id_type
  FROM pg_catalog.pg_attribute a
  WHERE a.attrelid = 'public.clientes'::regclass
    AND a.attname = 'id'
    AND NOT a.attisdropped;

  IF v_cliente_id_type IS NULL THEN
    RAISE EXCEPTION 'Não foi possível identificar o tipo de clientes.id.';
  END IF;

  EXECUTE format($ddl$
    CREATE TABLE IF NOT EXISTS public.cliente_proposta_perfis (
      cliente_id %s PRIMARY KEY REFERENCES public.clientes(id) ON DELETE CASCADE,
      dados_proponente jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(dados_proponente) = 'object'),
      dados_conjuge jsonb,
      documentos jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(documentos) = 'array'),
      consentimento_reutilizacao_em timestamptz NOT NULL,
      consentimento_reutilizacao_versao text NOT NULL,
      consentimento_conjuge_reutilizacao_em timestamptz,
      updated_at timestamptz NOT NULL DEFAULT now()
    )
  $ddl$, v_cliente_id_type);
  EXECUTE format($queue$
    CREATE TABLE IF NOT EXISTS public.cliente_proposta_documentos_exclusao_pendente (
      storage_path text PRIMARY KEY,
      cliente_id %s NOT NULL,
      cliente_nome text,
      documento_tipo text,
      nome_original text,
      requested_by uuid,
      requested_at timestamptz NOT NULL DEFAULT now(),
      last_attempt_at timestamptz,
      last_error text
    )
  $queue$, v_cliente_id_type);
END
$migration$;

ALTER TABLE public.cliente_proposta_perfis ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cliente_proposta_perfis FROM PUBLIC, anon, authenticated;
ALTER TABLE public.cliente_proposta_documentos_exclusao_pendente ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.cliente_proposta_documentos_exclusao_pendente FROM PUBLIC, anon, authenticated;
ALTER TABLE public.cliente_proposta_documentos_exclusao_pendente ADD COLUMN IF NOT EXISTS cliente_nome text;
DO $migration$
DECLARE
  v_constraint record;
BEGIN
  FOR v_constraint IN
    SELECT conname
    FROM pg_catalog.pg_constraint
    WHERE conrelid = 'public.cliente_proposta_documentos_exclusao_pendente'::regclass
      AND confrelid = 'public.clientes'::regclass
      AND contype = 'f'
  LOOP
    EXECUTE format('ALTER TABLE public.cliente_proposta_documentos_exclusao_pendente DROP CONSTRAINT %I', v_constraint.conname);
  END LOOP;
END
$migration$;
CREATE INDEX IF NOT EXISTS cliente_propostas_cliente_created_at_idx
  ON public.cliente_propostas (cliente_id, created_at DESC);

-- Mescla por tipo após opt-in explícito; o documento enviado mais recentemente
-- substitui o mesmo tipo no perfil, preservando os demais anexos autorizados.
CREATE OR REPLACE FUNCTION public.mesclar_documentos_proposta(p_perfil jsonb, p_ultimo_envio jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public, pg_temp
AS $function$
  SELECT coalesce(jsonb_agg(escolhido.item ORDER BY escolhido.tipo), '[]'::jsonb)
  FROM (
    SELECT DISTINCT ON (candidatos.tipo) candidatos.item, candidatos.tipo
    FROM (
      SELECT item, item ->> 'tipo' AS tipo, 1 AS prioridade
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(p_perfil) = 'array' THEN p_perfil ELSE '[]'::jsonb END
      ) AS anterior(item)
      UNION ALL
      SELECT item, item ->> 'tipo' AS tipo, 2 AS prioridade
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(p_ultimo_envio) = 'array' THEN p_ultimo_envio ELSE '[]'::jsonb END
      ) AS recente(item)
    ) AS candidatos
    WHERE candidatos.tipo IS NOT NULL
    ORDER BY candidatos.tipo, candidatos.prioridade DESC
  ) AS escolhido;
$function$;
REVOKE ALL ON FUNCTION public.mesclar_documentos_proposta(jsonb, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.portal_cliente_proposta_perfil()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_perfil jsonb;
BEGIN
  SELECT jsonb_build_object(
    'dados_proponente',
      jsonb_build_object(
        'nome', c.nome,
        'cpf', c.cpf,
        'telefone', c.telefone,
        'email', c.email,
        'profissao', c.profissao
      ) || coalesce(perfil.dados_proponente, '{}'::jsonb),
    'dados_conjuge', CASE
      WHEN perfil.consentimento_conjuge_reutilizacao_em IS NOT NULL THEN perfil.dados_conjuge
      ELSE NULL
    END,
    'documentos', CASE
      WHEN perfil.consentimento_reutilizacao_em IS NULL THEN '[]'::jsonb
      ELSE (
        SELECT coalesce(jsonb_agg(doc.item), '[]'::jsonb)
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(perfil.documentos) = 'array' THEN perfil.documentos ELSE '[]'::jsonb END
        ) AS doc(item)
        WHERE perfil.consentimento_conjuge_reutilizacao_em IS NOT NULL
          OR doc.item ->> 'tipo' NOT IN ('certidao_casamento', 'identificacao_conjuge')
      )
    END,
    'reutilizacao_autorizada', perfil.consentimento_reutilizacao_em IS NOT NULL,
    'reutilizacao_conjuge_autorizada', perfil.consentimento_conjuge_reutilizacao_em IS NOT NULL,
    'perfil_atualizado_em', perfil.updated_at
  )
  INTO v_perfil
  FROM public.clientes c
  LEFT JOIN public.cliente_proposta_perfis perfil ON perfil.cliente_id = c.id
  WHERE c.user_id = auth.uid()
    AND c.acesso_portal
    AND (c.acesso_expira_em IS NULL OR c.acesso_expira_em > now())
  LIMIT 1;

  IF v_perfil IS NULL THEN
    RAISE EXCEPTION 'Acesso de cliente não encontrado ou expirado.' USING errcode = '42501';
  END IF;

  RETURN v_perfil;
END
$function$;
REVOKE ALL ON FUNCTION public.portal_cliente_proposta_perfil() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_cliente_proposta_perfil() TO authenticated;

-- Sugestão histórica separada: o portal só a usa depois que o cliente escolhe
-- explicitamente "Usar os dados e anexos do último envio".
CREATE OR REPLACE FUNCTION public.portal_cliente_ultima_proposta_sugestao()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_sugestao jsonb;
BEGIN
  SELECT jsonb_build_object(
    'dados_proponente', ultimo.dados_proponente,
    'dados_conjuge', CASE WHEN ultimo.consentimento_conjuge THEN ultimo.dados_conjuge ELSE NULL END,
    'documentos', (
      SELECT coalesce(jsonb_agg(doc.item), '[]'::jsonb)
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(ultimo.documentos) = 'array' THEN ultimo.documentos ELSE '[]'::jsonb END
      ) AS doc(item)
      WHERE ultimo.consentimento_conjuge
         OR doc.item ->> 'tipo' NOT IN ('certidao_casamento', 'identificacao_conjuge')
    ),
    'enviado_em', ultimo.created_at
  ) INTO v_sugestao
  FROM public.clientes c
  JOIN LATERAL (
    SELECT p.dados_proponente, p.dados_conjuge, p.documentos, p.consentimento_conjuge, p.created_at
    FROM public.cliente_propostas p
    WHERE p.cliente_id = c.id
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT 1
  ) ultimo ON true
  WHERE c.user_id = auth.uid()
    AND c.acesso_portal
    AND (c.acesso_expira_em IS NULL OR c.acesso_expira_em > now())
  LIMIT 1;

  RETURN v_sugestao;
END
$function$;
REVOKE ALL ON FUNCTION public.portal_cliente_ultima_proposta_sugestao() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_cliente_ultima_proposta_sugestao() TO authenticated;

-- Persiste o snapshot atual somente quando o cliente confirma a retenção para propostas futuras.
-- A autorização de retenção do cônjuge é separada da autorização para a proposta atual.
CREATE OR REPLACE FUNCTION public.salvar_cliente_proposta_perfil(
  p_proposta_id uuid,
  p_consentimento_reutilizacao boolean,
  p_consentimento_conjuge_reutilizacao boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_cliente_id public.clientes.id%TYPE;
  v_dados_proponente jsonb;
  v_dados_conjuge jsonb;
  v_documentos jsonb;
  v_documentos_perfil jsonb;
  v_conjuge_perfil jsonb;
BEGIN
  IF NOT coalesce(p_consentimento_reutilizacao, false) THEN
    RAISE EXCEPTION 'É necessária autorização explícita para salvar o perfil reutilizável.' USING errcode = '22023';
  END IF;

  SELECT c.id INTO v_cliente_id
  FROM public.clientes c
  WHERE c.user_id = auth.uid()
    AND c.acesso_portal
    AND (c.acesso_expira_em IS NULL OR c.acesso_expira_em > now())
  LIMIT 1;

  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'Acesso de cliente não encontrado ou expirado.' USING errcode = '42501';
  END IF;

  SELECT p.dados_proponente, p.dados_conjuge, p.documentos
    INTO v_dados_proponente, v_dados_conjuge, v_documentos
  FROM public.cliente_propostas p
  WHERE p.id = p_proposta_id
    AND p.cliente_id = v_cliente_id
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Proposta não encontrada para este cliente.' USING errcode = '42501';
  END IF;

  v_documentos := CASE
    WHEN jsonb_typeof(v_documentos) = 'array' THEN v_documentos
    ELSE '[]'::jsonb
  END;

  IF coalesce(p_consentimento_conjuge_reutilizacao, false) THEN
    v_conjuge_perfil := v_dados_conjuge;
    v_documentos_perfil := v_documentos;
  ELSE
    v_conjuge_perfil := NULL;
    SELECT coalesce(jsonb_agg(doc.item), '[]'::jsonb)
      INTO v_documentos_perfil
    FROM jsonb_array_elements(v_documentos) AS doc(item)
    WHERE doc.item ->> 'tipo' NOT IN ('certidao_casamento', 'identificacao_conjuge');
  END IF;

  INSERT INTO public.cliente_proposta_perfis AS perfil (
    cliente_id,
    dados_proponente,
    dados_conjuge,
    documentos,
    consentimento_reutilizacao_em,
    consentimento_reutilizacao_versao,
    consentimento_conjuge_reutilizacao_em,
    updated_at
  ) VALUES (
    v_cliente_id,
    coalesce(v_dados_proponente, '{}'::jsonb),
    v_conjuge_perfil,
    v_documentos_perfil,
    now(),
    'perfil-proposta-v1',
    CASE WHEN coalesce(p_consentimento_conjuge_reutilizacao, false) THEN now() ELSE NULL END,
    now()
  )
  ON CONFLICT (cliente_id) DO UPDATE SET
    dados_proponente = EXCLUDED.dados_proponente,
    dados_conjuge = EXCLUDED.dados_conjuge,
    documentos = public.mesclar_documentos_proposta(
      CASE
        WHEN coalesce(p_consentimento_conjuge_reutilizacao, false) THEN perfil.documentos
        ELSE (
          SELECT coalesce(jsonb_agg(doc.item), '[]'::jsonb)
          FROM jsonb_array_elements(
            CASE WHEN jsonb_typeof(perfil.documentos) = 'array' THEN perfil.documentos ELSE '[]'::jsonb END
          ) AS doc(item)
          WHERE doc.item ->> 'tipo' NOT IN ('certidao_casamento', 'identificacao_conjuge')
        )
      END,
      EXCLUDED.documentos
    ),
    consentimento_reutilizacao_em = now(),
    consentimento_reutilizacao_versao = 'perfil-proposta-v1',
    consentimento_conjuge_reutilizacao_em = CASE
      WHEN coalesce(p_consentimento_conjuge_reutilizacao, false) THEN now()
      ELSE NULL
    END,
    updated_at = now();

  RETURN jsonb_build_object('ok', true, 'salvo', true);
END
$function$;
REVOKE ALL ON FUNCTION public.salvar_cliente_proposta_perfil(uuid, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.salvar_cliente_proposta_perfil(uuid, boolean, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.portal_cliente_revogar_perfil_proposta()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_cliente_id public.clientes.id%TYPE;
  v_deleted integer := 0;
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

  DELETE FROM public.cliente_proposta_perfis WHERE cliente_id = v_cliente_id;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN jsonb_build_object('ok', true, 'revogado', v_deleted > 0);
END
$function$;
REVOKE ALL ON FUNCTION public.portal_cliente_revogar_perfil_proposta() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_cliente_revogar_perfil_proposta() TO authenticated;

CREATE OR REPLACE FUNCTION public.portal_cliente_revogar_perfil_conjuge_proposta()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_cliente_id public.clientes.id%TYPE;
  v_updated integer := 0;
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

  UPDATE public.cliente_proposta_perfis AS perfil
  SET dados_conjuge = NULL,
      documentos = (
        SELECT coalesce(jsonb_agg(doc.item), '[]'::jsonb)
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(perfil.documentos) = 'array' THEN perfil.documentos ELSE '[]'::jsonb END
        ) AS doc(item)
        WHERE doc.item ->> 'tipo' NOT IN ('certidao_casamento', 'identificacao_conjuge')
      ),
      consentimento_conjuge_reutilizacao_em = NULL,
      updated_at = now()
  WHERE perfil.cliente_id = v_cliente_id;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'revogado', v_updated > 0);
END
$function$;
REVOKE ALL ON FUNCTION public.portal_cliente_revogar_perfil_conjuge_proposta() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_cliente_revogar_perfil_conjuge_proposta() TO authenticated;

-- O caminho só é removível do Storage depois que saiu de todos os snapshots e do perfil.
CREATE OR REPLACE FUNCTION public.cliente_proposta_documento_vinculado(p_storage_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT (public.is_admin() OR split_part(coalesce(p_storage_path, ''), '/', 1) = (SELECT auth.uid())::text)
    AND (
      EXISTS (
        SELECT 1
        FROM public.cliente_propostas p
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE WHEN jsonb_typeof(p.documentos) = 'array' THEN p.documentos ELSE '[]'::jsonb END
        ) AS doc(item)
        WHERE doc.item ->> 'storage_path' = p_storage_path
      ) OR EXISTS (
        SELECT 1
        FROM public.cliente_proposta_perfis perfil
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE WHEN jsonb_typeof(perfil.documentos) = 'array' THEN perfil.documentos ELSE '[]'::jsonb END
        ) AS doc(item)
        WHERE doc.item ->> 'storage_path' = p_storage_path
      )
    );
$function$;
REVOKE ALL ON FUNCTION public.cliente_proposta_documento_vinculado(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.cliente_proposta_documento_vinculado(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.remover_documento_proposta_referencias(p_cliente_id text, p_storage_path text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_cliente_id public.clientes.id%TYPE;
  v_user_id uuid;
  v_cliente_nome text;
  v_document_type text;
  v_document_name text;
  v_profile_rows integer := 0;
  v_proposal_rows integer := 0;
BEGIN
  IF nullif(trim(coalesce(p_storage_path, '')), '') IS NULL THEN
    RAISE EXCEPTION 'Caminho de documento inválido.' USING errcode = '22023';
  END IF;

  SELECT c.id, c.user_id, c.nome INTO v_cliente_id, v_user_id, v_cliente_nome
  FROM public.clientes c
  WHERE c.id::text = p_cliente_id
  LIMIT 1;

  IF v_cliente_id IS NULL OR v_user_id IS NULL THEN
    RAISE EXCEPTION 'Cliente não encontrado ou sem usuário vinculado.' USING errcode = '22023';
  END IF;
  IF split_part(p_storage_path, '/', 1) <> v_user_id::text THEN
    RAISE EXCEPTION 'O arquivo não pertence a este cliente.' USING errcode = '42501';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM public.cliente_propostas p
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(p.documentos) = 'array' THEN p.documentos ELSE '[]'::jsonb END
    ) AS doc(item)
    WHERE doc.item ->> 'storage_path' = p_storage_path
      AND p.cliente_id <> v_cliente_id
  ) OR EXISTS (
    SELECT 1
    FROM public.cliente_proposta_perfis perfil
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(perfil.documentos) = 'array' THEN perfil.documentos ELSE '[]'::jsonb END
    ) AS doc(item)
    WHERE doc.item ->> 'storage_path' = p_storage_path
      AND perfil.cliente_id <> v_cliente_id
  ) THEN
    RAISE EXCEPTION 'O arquivo está vinculado a mais de um cliente; exclusão bloqueada.' USING errcode = '42501';
  END IF;

  SELECT anexado.item ->> 'tipo', anexado.item ->> 'nome_original'
    INTO v_document_type, v_document_name
  FROM (
    SELECT doc.item, 1 AS prioridade
    FROM public.cliente_propostas p
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(p.documentos) = 'array' THEN p.documentos ELSE '[]'::jsonb END
    ) AS doc(item)
    WHERE p.cliente_id = v_cliente_id
      AND doc.item ->> 'storage_path' = p_storage_path
    UNION ALL
    SELECT doc.item, 2 AS prioridade
    FROM public.cliente_proposta_perfis perfil
    CROSS JOIN LATERAL jsonb_array_elements(
      CASE WHEN jsonb_typeof(perfil.documentos) = 'array' THEN perfil.documentos ELSE '[]'::jsonb END
    ) AS doc(item)
    WHERE perfil.cliente_id = v_cliente_id
      AND doc.item ->> 'storage_path' = p_storage_path
  ) AS anexado
  ORDER BY anexado.prioridade DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  INSERT INTO public.cliente_proposta_documentos_exclusao_pendente (
    storage_path, cliente_id, cliente_nome, documento_tipo, nome_original, requested_by, requested_at, last_attempt_at, last_error
  ) VALUES (
    p_storage_path, v_cliente_id, v_cliente_nome, v_document_type, v_document_name, auth.uid(), now(), NULL, NULL
  )
  ON CONFLICT (storage_path) DO UPDATE SET
    cliente_id = EXCLUDED.cliente_id,
    cliente_nome = EXCLUDED.cliente_nome,
    documento_tipo = EXCLUDED.documento_tipo,
    nome_original = EXCLUDED.nome_original,
    requested_by = EXCLUDED.requested_by,
    requested_at = now(),
    last_attempt_at = NULL,
    last_error = NULL;

  UPDATE public.cliente_proposta_perfis AS perfil
  SET documentos = (
    SELECT coalesce(jsonb_agg(doc.item), '[]'::jsonb)
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(perfil.documentos) = 'array' THEN perfil.documentos ELSE '[]'::jsonb END
    ) AS doc(item)
    WHERE doc.item ->> 'storage_path' IS DISTINCT FROM p_storage_path
  ),
  updated_at = now()
  WHERE perfil.cliente_id = v_cliente_id
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(perfil.documentos) = 'array' THEN perfil.documentos ELSE '[]'::jsonb END
      ) AS doc(item)
      WHERE doc.item ->> 'storage_path' = p_storage_path
    );
  GET DIAGNOSTICS v_profile_rows = ROW_COUNT;

  UPDATE public.cliente_propostas AS proposta
  SET documentos = (
    SELECT coalesce(jsonb_agg(doc.item), '[]'::jsonb)
    FROM jsonb_array_elements(
      CASE WHEN jsonb_typeof(proposta.documentos) = 'array' THEN proposta.documentos ELSE '[]'::jsonb END
    ) AS doc(item)
    WHERE doc.item ->> 'storage_path' IS DISTINCT FROM p_storage_path
  ),
  updated_at = now()
  WHERE proposta.cliente_id = v_cliente_id
    AND EXISTS (
      SELECT 1
      FROM jsonb_array_elements(
        CASE WHEN jsonb_typeof(proposta.documentos) = 'array' THEN proposta.documentos ELSE '[]'::jsonb END
      ) AS doc(item)
      WHERE doc.item ->> 'storage_path' = p_storage_path
    );
  GET DIAGNOSTICS v_proposal_rows = ROW_COUNT;

  RETURN (v_profile_rows + v_proposal_rows) > 0;
END
$function$;
REVOKE ALL ON FUNCTION public.remover_documento_proposta_referencias(text, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.portal_cliente_excluir_documento_proposta(p_storage_path text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_cliente_id public.clientes.id%TYPE;
  v_removed boolean;
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

  v_removed := public.remover_documento_proposta_referencias(v_cliente_id::text, p_storage_path);
  RETURN jsonb_build_object('ok', true, 'removed', v_removed, 'history_removed', v_removed);
END
$function$;
REVOKE ALL ON FUNCTION public.portal_cliente_excluir_documento_proposta(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_cliente_excluir_documento_proposta(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_cliente_excluir_documento_proposta(p_cliente_id text, p_storage_path text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_removed boolean;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem excluir documentos de propostas.' USING errcode = '42501';
  END IF;

  v_removed := public.remover_documento_proposta_referencias(p_cliente_id, p_storage_path);
  RETURN jsonb_build_object('ok', true, 'removed', v_removed, 'history_removed', v_removed);
END
$function$;
REVOKE ALL ON FUNCTION public.admin_cliente_excluir_documento_proposta(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_cliente_excluir_documento_proposta(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.finalizar_cliente_proposta_documento_exclusao(p_storage_path text, p_erro text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_cliente_id public.clientes.id%TYPE;
BEGIN
  SELECT q.cliente_id INTO v_cliente_id
  FROM public.cliente_proposta_documentos_exclusao_pendente q
  WHERE q.storage_path = p_storage_path
  LIMIT 1;

  IF v_cliente_id IS NULL THEN
    RETURN jsonb_build_object('ok', true, 'pendente', false);
  END IF;

  IF NOT public.is_admin() AND NOT EXISTS (
    SELECT 1 FROM public.clientes c
    WHERE c.id = v_cliente_id
      AND c.user_id = auth.uid()
      AND c.acesso_portal
      AND (c.acesso_expira_em IS NULL OR c.acesso_expira_em > now())
  ) THEN
    RAISE EXCEPTION 'Acesso negado para finalizar esta exclusão.' USING errcode = '42501';
  END IF;

  IF nullif(trim(coalesce(p_erro, '')), '') IS NULL THEN
    DELETE FROM public.cliente_proposta_documentos_exclusao_pendente
    WHERE storage_path = p_storage_path;
    RETURN jsonb_build_object('ok', true, 'pendente', false);
  END IF;

  UPDATE public.cliente_proposta_documentos_exclusao_pendente
  SET last_attempt_at = now(), last_error = left(trim(p_erro), 500)
  WHERE storage_path = p_storage_path;
  RETURN jsonb_build_object('ok', true, 'pendente', true);
END
$function$;
REVOKE ALL ON FUNCTION public.finalizar_cliente_proposta_documento_exclusao(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalizar_cliente_proposta_documento_exclusao(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_listar_cliente_proposta_exclusoes_pendentes()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_pendentes jsonb;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Apenas administradores podem consultar exclusões pendentes.' USING errcode = '42501';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'cliente_id', pendente.cliente_id,
    'cliente_nome', pendente.cliente_nome,
    'storage_path', pendente.storage_path,
    'documento_tipo', pendente.documento_tipo,
    'nome_original', pendente.nome_original,
    'requested_at', pendente.requested_at,
    'last_attempt_at', pendente.last_attempt_at,
    'last_error', pendente.last_error
  ) ORDER BY pendente.requested_at DESC), '[]'::jsonb)
  INTO v_pendentes
  FROM (
    SELECT q.cliente_id, q.cliente_nome, q.storage_path, q.documento_tipo,
           q.nome_original, q.requested_at, q.last_attempt_at, q.last_error
    FROM public.cliente_proposta_documentos_exclusao_pendente q
    ORDER BY q.requested_at DESC
    LIMIT 100
  ) pendente;

  RETURN v_pendentes;
END
$function$;
REVOKE ALL ON FUNCTION public.admin_listar_cliente_proposta_exclusoes_pendentes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_listar_cliente_proposta_exclusoes_pendentes() TO authenticated;

DROP POLICY IF EXISTS cliente_propostas_documentos_proprio_delete_pendente ON storage.objects;
CREATE POLICY cliente_propostas_documentos_proprio_delete_pendente
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'cliente-propostas'
  AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  AND public.cliente_portal_pode_enviar_documentos_proposta()
  AND NOT public.cliente_proposta_documento_vinculado(name)
);

DROP POLICY IF EXISTS cliente_propostas_documentos_admin_delete ON storage.objects;
CREATE POLICY cliente_propostas_documentos_admin_delete
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'cliente-propostas'
  AND public.is_admin()
  AND NOT public.cliente_proposta_documento_vinculado(name)
);

-- A RPC continua aceitando novos uploads na pasta desta proposta. Reuso do perfil
-- exige consentimento vigente; reuso de histórico exige marca explícita por arquivo.
-- A definição atual, inclusive a validação de CNPJ alfanumérico, é preservada.
DO $migration$
DECLARE
  v_definition text;
  v_old text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef(
    'public.enviar_proposta_cliente(text,numeric,numeric,numeric,integer,text,text,text,numeric,jsonb,text,text,text,text,text,text,jsonb,jsonb,uuid,boolean,boolean)'::regprocedure
  ) INTO v_definition;

  IF v_definition IS NULL THEN
    RAISE EXCEPTION 'A função enviar_proposta_cliente não foi encontrada.';
  END IF;

  v_old := $old$OR coalesce(doc.item ->> 'storage_path', '') NOT LIKE v_prefix || '%'$old$;
  v_new := $new$OR NOT (
        coalesce(doc.item ->> 'storage_path', '') LIKE v_prefix || '%'
        OR (
          EXISTS (
            SELECT 1
            FROM public.cliente_proposta_perfis perfil
            CROSS JOIN LATERAL jsonb_array_elements(
              CASE WHEN jsonb_typeof(perfil.documentos) = 'array' THEN perfil.documentos ELSE '[]'::jsonb END
            ) AS salvo(item)
            WHERE perfil.cliente_id = v_cliente_id
              AND perfil.consentimento_reutilizacao_em IS NOT NULL
              AND salvo.item ->> 'storage_path' = doc.item ->> 'storage_path'
              AND salvo.item ->> 'tipo' = doc.item ->> 'tipo'
              AND (
                doc.item ->> 'tipo' NOT IN ('certidao_casamento', 'identificacao_conjuge')
                OR perfil.consentimento_conjuge_reutilizacao_em IS NOT NULL
              )
          )
          OR (
            doc.item ->> 'reuso_historico_confirmado' = 'true'
            AND (
              doc.item ->> 'tipo' NOT IN ('certidao_casamento', 'identificacao_conjuge')
              OR (p_estado_civil IN ('casado_civil', 'uniao_estavel') AND coalesce(p_consentimento_conjuge, false))
            )
            AND EXISTS (
              SELECT 1
              FROM public.cliente_propostas anterior
              CROSS JOIN LATERAL jsonb_array_elements(
                CASE WHEN jsonb_typeof(anterior.documentos) = 'array' THEN anterior.documentos ELSE '[]'::jsonb END
              ) AS salvo(item)
              WHERE anterior.cliente_id = v_cliente_id
                AND anterior.id = (
                  SELECT ultimo.id
                  FROM public.cliente_propostas ultimo
                  WHERE ultimo.cliente_id = v_cliente_id
                  ORDER BY ultimo.created_at DESC, ultimo.id DESC
                  LIMIT 1
                )
                AND salvo.item ->> 'storage_path' = doc.item ->> 'storage_path'
                AND salvo.item ->> 'tipo' = doc.item ->> 'tipo'
            )
          )
        )
      )$new$;

  IF position(v_old IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Não foi possível localizar a validação do caminho do documento na RPC.';
  END IF;

  v_definition := replace(v_definition, v_old, v_new);

  v_old := $old$RAISE EXCEPTION 'Um ou mais documentos estão fora dos formatos permitidos.' USING errcode = '22023';
  END IF;$old$;
  v_new := $new$RAISE EXCEPTION 'Um ou mais documentos estão fora dos formatos permitidos.' USING errcode = '22023';
  END IF;
  v_documentos := coalesce((
    SELECT jsonb_agg(doc.item - 'reuso_historico_confirmado' ORDER BY doc.ordinality)
    FROM jsonb_array_elements(v_documentos) WITH ORDINALITY AS doc(item, ordinality)
  ), '[]'::jsonb);$new$;
  IF position(v_old IN v_definition) = 0 THEN
    RAISE EXCEPTION 'Não foi possível localizar a validação para remover a marca temporária de reuso.';
  END IF;
  v_definition := replace(v_definition, v_old, v_new);

  EXECUTE v_definition;
END
$migration$;

NOTIFY pgrst, 'reload schema';
