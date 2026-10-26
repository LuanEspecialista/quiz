-- Mantém a apresentação ao vivo existente e configura um material independente para clientes.
ALTER TABLE public.apresentacoes
  ADD COLUMN IF NOT EXISTS cliente_ativo boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS cliente_tipo text,
  ADD COLUMN IF NOT EXISTS cliente_pdf_path text,
  ADD COLUMN IF NOT EXISTS cliente_link_url text,
  ADD COLUMN IF NOT EXISTS cliente_blog_post_id uuid REFERENCES public.blog_posts(id) ON DELETE SET NULL;

ALTER TABLE public.apresentacoes
  DROP CONSTRAINT IF EXISTS apresentacoes_cliente_tipo_check;
ALTER TABLE public.apresentacoes
  ADD CONSTRAINT apresentacoes_cliente_tipo_check
  CHECK (cliente_tipo IS NULL OR cliente_tipo IN ('pdf', 'link', 'post'));

-- A curadoria escolhe mostrar o material preparado para clientes ou ocultá-lo;
-- escolhas históricas de PDF/link se referiam ao material interno e viram a opção padrão.
UPDATE public.cliente_empreendimentos
SET apresentacao_modo = 'preferida'
WHERE coalesce(apresentacao_modo, 'preferida') NOT IN ('preferida', 'nenhuma');

ALTER TABLE public.cliente_empreendimentos
  DROP CONSTRAINT IF EXISTS cliente_empreendimentos_apresentacao_modo_check;
ALTER TABLE public.cliente_empreendimentos
  ADD CONSTRAINT cliente_empreendimentos_apresentacao_modo_check
  CHECK (apresentacao_modo IN ('preferida', 'nenhuma'));

-- PDFs exclusivos do portal de clientes são privados e só o painel pode gravar/remover.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('cliente-apresentacoes', 'cliente-apresentacoes', false, 262144000, ARRAY['application/pdf']::text[])
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    public = false,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS cliente_apresentacoes_admin_all ON storage.objects;
CREATE POLICY cliente_apresentacoes_admin_all
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'cliente-apresentacoes' AND public.is_admin())
WITH CHECK (bucket_id = 'cliente-apresentacoes' AND public.is_admin());

CREATE OR REPLACE FUNCTION public.portal_cliente_pode_ler_apresentacao(p_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.clientes c
    JOIN public.cliente_empreendimentos ce ON ce.cliente_id = c.id
    JOIN public.apresentacoes a ON a.empreendimento_id = ce.empreendimento_id
    WHERE c.user_id = auth.uid()
      AND c.acesso_portal
      AND (c.acesso_expira_em IS NULL OR c.acesso_expira_em > now())
      AND ce.visivel
      AND coalesce(ce.apresentacao_modo, 'preferida') <> 'nenhuma'
      AND a.cliente_ativo
      AND a.cliente_tipo = 'pdf'
      AND a.cliente_pdf_path = p_path
  );
$function$;

REVOKE ALL ON FUNCTION public.portal_cliente_pode_ler_apresentacao(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_cliente_pode_ler_apresentacao(text) TO authenticated;

-- Um cliente autenticado pode obter URL assinada somente para o PDF da própria curadoria ativa.
DROP POLICY IF EXISTS cliente_apresentacoes_portal_select ON storage.objects;
CREATE POLICY cliente_apresentacoes_portal_select
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'cliente-apresentacoes'
  AND public.portal_cliente_pode_ler_apresentacao(storage.objects.name)
);

CREATE OR REPLACE FUNCTION public.portal_cliente_experiencia()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_client public.clientes%ROWTYPE;
  v_payload jsonb;
  v_opportunities jsonb;
BEGIN
  SELECT *
  INTO v_client
  FROM public.clientes c
  WHERE c.user_id = auth.uid()
    AND c.acesso_portal
    AND (c.acesso_expira_em IS NULL OR c.acesso_expira_em > now())
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Acesso de cliente não encontrado ou expirado.' USING errcode = '42501';
  END IF;

  v_payload := public.portal_cliente();
  v_payload := jsonb_set(
    coalesce(v_payload, '{}'::jsonb),
    '{cliente}',
    coalesce(v_payload -> 'cliente', '{}'::jsonb) || jsonb_build_object(
      'nome', v_client.nome,
      'telefone', v_client.telefone,
      'email', v_client.email,
      'cpf', v_client.cpf,
      'acesso_expira_em', v_client.acesso_expira_em
    ),
    true
  );

  SELECT coalesce(
    jsonb_agg(
      opportunity.item || jsonb_build_object(
        'regras_correcao', coalesce(enterprise.regras_correcao, '{}'::jsonb),
        'entrega_date', enterprise.entrega_date,
        'previsao_entrega', enterprise.previsao_entrega,
        'data_entrega_chaves', enterprise.data_entrega_chaves,
        'cronograma', jsonb_build_object(
          'inicio_obras', enterprise.caracteristicas -> 'fluxo_comercial' -> 'inicio_obras'
        ),
        'apresentacao_modo', coalesce(selection.apresentacao_modo, 'preferida'),
        'apresentacoes', presentation.resources,
        'apresentacao', presentation.resources -> 0,
        'unidades', CASE
          WHEN selection.exibir_fluxo THEN coalesce((
            SELECT jsonb_agg(
              jsonb_build_object(
                'id', unit.id,
                'codigo', coalesce(nullif(unit.codigo_unidade, ''), nullif(unit.numero_unidade, ''), nullif(unit.numero, ''), unit.id::text),
                'numero', unit.numero,
                'torre', unit.torre,
                'andar', unit.andar,
                'tipologia', unit.tipologia,
                'area_privativa', unit.area_privativa,
                'valor', coalesce(unit.valor_tabela, 0),
                'valor_tabela', coalesce(unit.valor_tabela, 0),
                'status', unit.status,
                'fluxo_dados', coalesce(unit.fluxo_dados, '{}'::jsonb),
                'desconto_valor', greatest(0, coalesce(nullif(jsonb_extract_path_text(selection.condicoes_unidades, unit.id::text, 'desconto_valor'), '')::numeric, 0)),
                'desconto_percentual', greatest(0, coalesce(nullif(jsonb_extract_path_text(selection.condicoes_unidades, unit.id::text, 'desconto_percentual'), '')::numeric, selection.desconto_percentual, 0))
              )
              ORDER BY unit.torre NULLS LAST, unit.andar NULLS LAST, unit.numero NULLS LAST
            )
            FROM public.unidades unit
            WHERE unit.empreendimento_id = enterprise.id
              AND unit.id::text = ANY(coalesce(selection.unidade_ids_selecionadas, ARRAY[]::text[]))
              AND lower(coalesce(unit.status, '')) NOT IN ('vendida', 'bloqueada', 'fora de tabela')
          ), '[]'::jsonb)
          ELSE '[]'::jsonb
        END
      )
      ORDER BY opportunity.ordinality
    ),
    '[]'::jsonb
  )
  INTO v_opportunities
  FROM jsonb_array_elements(coalesce(v_payload -> 'oportunidades', '[]'::jsonb)) WITH ORDINALITY AS opportunity(item, ordinality)
  JOIN public.cliente_empreendimentos selection
    ON selection.cliente_id = v_client.id
   AND selection.empreendimento_id::text = (opportunity.item ->> 'id')
   AND selection.visivel
  JOIN public.empreendimentos enterprise
    ON enterprise.id = selection.empreendimento_id
  LEFT JOIN LATERAL (
    SELECT coalesce(jsonb_agg(chosen.resource), '[]'::jsonb) AS resources
    FROM (
      SELECT jsonb_build_object(
        'tipo', CASE WHEN a.cliente_tipo = 'pdf' THEN 'pdf' ELSE 'link' END,
        'origem', a.cliente_tipo,
        'titulo', CASE
          WHEN a.cliente_tipo = 'post' THEN post.titulo
          WHEN a.cliente_tipo = 'pdf' THEN coalesce(nullif(a.titulo, ''), enterprise.nome || ' · apresentação')
          ELSE coalesce(nullif(a.titulo, ''), enterprise.nome || ' · apresentação online')
        END,
        'url', CASE
          WHEN a.cliente_tipo = 'link' THEN a.cliente_link_url
          WHEN a.cliente_tipo = 'post' THEN '/blog/' || post.slug || '/?apresentacao=1'
          ELSE NULL
        END,
        'storage_path', CASE WHEN a.cliente_tipo = 'pdf' THEN a.cliente_pdf_path ELSE NULL END,
        'storage_bucket', CASE WHEN a.cliente_tipo = 'pdf' THEN 'cliente-apresentacoes' ELSE NULL END
      ) AS resource
      FROM public.apresentacoes a
      LEFT JOIN public.blog_posts post ON post.id = a.cliente_blog_post_id
      WHERE a.empreendimento_id = enterprise.id
        AND a.cliente_ativo
        AND coalesce(selection.apresentacao_modo, 'preferida') <> 'nenhuma'
        AND (
          (a.cliente_tipo = 'pdf' AND nullif(btrim(a.cliente_pdf_path), '') IS NOT NULL)
          OR (a.cliente_tipo = 'link' AND nullif(btrim(a.cliente_link_url), '') IS NOT NULL)
          OR (a.cliente_tipo = 'post' AND post.status = 'publicado' AND post.publicado_em <= now())
        )
    ) AS chosen
  ) AS presentation ON true;

  v_payload := jsonb_set(v_payload, '{oportunidades}', v_opportunities, true);
  RETURN v_payload;
END;
$function$;

REVOKE ALL ON FUNCTION public.portal_cliente_experiencia() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_cliente_experiencia() TO authenticated;
NOTIFY pgrst, 'reload schema';
