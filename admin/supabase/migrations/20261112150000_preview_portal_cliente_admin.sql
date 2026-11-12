CREATE OR REPLACE FUNCTION public.portal_cliente_preview(p_cliente_id integer)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
  SELECT CASE WHEN public.is_admin() THEN jsonb_build_object(
    'cliente', jsonb_build_object(
      'nome', c.nome, 'telefone', c.telefone, 'email', c.email, 'cpf', c.cpf,
      'objetivo', c.objetivo, 'modo', c.modo_apresentacao, 'horizonte', c.horizonte_investimento,
      'cidade', c.cidade, 'acesso_expira_em', c.acesso_expira_em
    ),
    'oportunidades', coalesce(jsonb_agg(jsonb_build_object(
      'id', e.id, 'nome', e.nome, 'cidade', e.cidade, 'bairro', e.bairro,
      'status', e.status, 'entrega', coalesce(e.entrega, e.data_entrega),
      'entrega_date', e.entrega_date, 'previsao_entrega', e.previsao_entrega,
      'data_entrega_chaves', e.data_entrega_chaves,
      'regras_correcao', coalesce(e.regras_correcao, '{}'::jsonb),
      'observacoes', e.observacoes,
      'cronograma', jsonb_build_object('inicio_obras', e.caracteristicas->'fluxo_comercial'->'inicio_obras'),
      'imagem_storage_path', CASE WHEN ce.exibir_imagens THEN (
        SELECT ei.storage_path FROM public.empreendimento_imagens ei
        WHERE ei.empreendimento_id=e.id AND ei.visivel_cliente
        ORDER BY ei.ordem NULLS LAST, ei.created_at DESC LIMIT 1
      ) END,
      'descricao', CASE WHEN ce.exibir_descricao THEN e.descricao END,
      'preco', CASE WHEN ce.exibir_preco THEN e.faixa_preco END,
      'area_minima', CASE WHEN ce.exibir_especificacoes THEN e.area_minima END,
      'area_maxima', CASE WHEN ce.exibir_especificacoes THEN e.area_maxima END,
      'caracteristicas', CASE WHEN ce.exibir_especificacoes THEN e.caracteristicas END,
      'mensagem', ce.mensagem_personalizada,
      'exibir_investimento', ce.exibir_investimento, 'exibir_fluxo', ce.exibir_fluxo,
      'permitir_proposta', ce.permitir_proposta, 'desconto_percentual', ce.desconto_percentual,
      'observacao_comercial', ce.observacao_comercial,
      'apresentacao', (
        SELECT jsonb_build_object(
          'url', CASE WHEN a.tipo_preferido='link' AND nullif(a.link_url,'') IS NOT NULL THEN a.link_url ELSE a.pdf_url END,
          'tipo', CASE WHEN a.tipo_preferido='link' AND nullif(a.link_url,'') IS NOT NULL THEN 'link' ELSE 'pdf' END
        ) FROM public.apresentacoes a
        WHERE a.empreendimento_id=e.id AND a.ativo AND (a.pdf_url IS NOT NULL OR a.link_url IS NOT NULL)
        ORDER BY a.updated_at DESC LIMIT 1
      ),
      'unidades', coalesce((SELECT jsonb_agg(jsonb_build_object(
        'id', u.id, 'codigo', coalesce(nullif(u.codigo_unidade,''),nullif(u.numero_unidade,''),nullif(u.numero,''),u.id::text),
        'numero', u.numero, 'torre', u.torre, 'andar', u.andar, 'tipologia', u.tipologia,
        'area_privativa', u.area_privativa, 'valor', coalesce(u.valor_tabela,0), 'valor_tabela', coalesce(u.valor_tabela,0),
        'status', u.status, 'fluxo_dados', u.fluxo_dados,
        'desconto_valor', greatest(0,coalesce(nullif(jsonb_extract_path_text(ce.condicoes_unidades,u.id::text,'desconto_valor'),'')::numeric,0)),
        'desconto_percentual', greatest(0,coalesce(nullif(jsonb_extract_path_text(ce.condicoes_unidades,u.id::text,'desconto_percentual'),'')::numeric,ce.desconto_percentual,0))
      ) ORDER BY u.torre NULLS LAST,u.andar NULLS LAST,u.numero NULLS LAST)
      FROM public.unidades u WHERE u.empreendimento_id=e.id AND u.id::text=ANY(coalesce(ce.unidade_ids_selecionadas,'{}'::text[]))
      AND lower(coalesce(u.status,'')) NOT IN ('vendida','bloqueada','fora de tabela')), '[]'::jsonb)
    ) ORDER BY ce.ordem), '[]'::jsonb)
  ) ELSE '{}'::jsonb END
  FROM public.clientes c
  LEFT JOIN public.cliente_empreendimentos ce ON ce.cliente_id=c.id AND ce.visivel
  LEFT JOIN public.empreendimentos e ON e.id=ce.empreendimento_id
  WHERE c.id=p_cliente_id
  GROUP BY c.id,c.nome,c.telefone,c.email,c.cpf,c.objetivo,c.modo_apresentacao,c.horizonte_investimento,c.cidade,c.acesso_expira_em;
$function$;

REVOKE ALL ON FUNCTION public.portal_cliente_preview(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.portal_cliente_preview(uuid) TO authenticated;
NOTIFY pgrst, 'reload schema';
