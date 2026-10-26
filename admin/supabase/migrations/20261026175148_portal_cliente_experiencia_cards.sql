-- Apresentação por vínculo cliente/empreendimento: mantém a preferência antiga,
-- permite escolher PDF, link, ambos ou ocultar para cada cliente.
ALTER TABLE public.cliente_empreendimentos
  ADD COLUMN IF NOT EXISTS apresentacao_modo text NOT NULL DEFAULT 'preferida';

ALTER TABLE public.cliente_empreendimentos
  DROP CONSTRAINT IF EXISTS cliente_empreendimentos_apresentacao_modo_check;

ALTER TABLE public.cliente_empreendimentos
  ADD CONSTRAINT cliente_empreendimentos_apresentacao_modo_check
  CHECK (apresentacao_modo IN ('preferida', 'pdf', 'link', 'ambas', 'nenhuma'));

-- O exemplo solicitado: o cliente Fernando, Ayra e unidade 205C têm link e PDF ativos.
UPDATE public.cliente_empreendimentos ce
SET apresentacao_modo = 'ambas'
FROM public.clientes c, public.empreendimentos e
WHERE ce.cliente_id = c.id
  AND ce.empreendimento_id = e.id
  AND c.nome ILIKE 'Fernando%'
  AND e.nome ILIKE '%Ayra%'
  AND EXISTS (
    SELECT 1
    FROM public.unidades u
    WHERE u.empreendimento_id = e.id
      AND u.id::text = ANY(coalesce(ce.unidade_ids_selecionadas, ARRAY[]::text[]))
      AND (
        lower(coalesce(u.codigo_unidade, '')) = '205c'
        OR lower(coalesce(u.numero_unidade, '')) = '205c'
        OR lower(coalesce(u.numero, '')) = '205c'
      )
  )
  AND EXISTS (
    SELECT 1
    FROM public.apresentacoes a
    WHERE a.empreendimento_id = e.id
      AND a.ativo
      AND nullif(btrim(a.link_url), '') IS NOT NULL
      AND (nullif(btrim(a.pdf_url), '') IS NOT NULL OR nullif(btrim(a.storage_path), '') IS NOT NULL)
  );

-- Resposta do portal com dados que a tela já esperava, unidades canônicas e recursos autorizados.
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
    SELECT coalesce(jsonb_agg(chosen.resource ORDER BY chosen.sort_order), '[]'::jsonb) AS resources
    FROM (
      SELECT
        1 AS sort_order,
        jsonb_build_object(
          'tipo', 'link',
          'titulo', coalesce(nullif(presentation.titulo, ''), enterprise.nome || ' · apresentação online'),
          'url', presentation.link_url
        ) AS resource
      FROM public.apresentacoes presentation
      WHERE presentation.empreendimento_id = enterprise.id
        AND presentation.ativo
        AND nullif(btrim(presentation.link_url), '') IS NOT NULL
        AND (
          coalesce(selection.apresentacao_modo, 'preferida') IN ('link', 'ambas')
          OR (
            coalesce(selection.apresentacao_modo, 'preferida') = 'preferida'
            AND (presentation.tipo_preferido = 'link' OR (nullif(btrim(presentation.pdf_url), '') IS NULL AND nullif(btrim(presentation.storage_path), '') IS NULL))
          )
        )
      UNION ALL
      SELECT
        2 AS sort_order,
        jsonb_build_object(
          'tipo', 'pdf',
          'titulo', coalesce(nullif(presentation.titulo, ''), enterprise.nome || ' · PDF da construtora'),
          'url', nullif(btrim(presentation.pdf_url), ''),
          'storage_path', nullif(btrim(presentation.storage_path), '')
        ) AS resource
      FROM public.apresentacoes presentation
      WHERE presentation.empreendimento_id = enterprise.id
        AND presentation.ativo
        AND (nullif(btrim(presentation.pdf_url), '') IS NOT NULL OR nullif(btrim(presentation.storage_path), '') IS NOT NULL)
        AND (
          coalesce(selection.apresentacao_modo, 'preferida') IN ('pdf', 'ambas')
          OR (
            coalesce(selection.apresentacao_modo, 'preferida') = 'preferida'
            AND (presentation.tipo_preferido <> 'link' OR nullif(btrim(presentation.link_url), '') IS NULL)
          )
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
