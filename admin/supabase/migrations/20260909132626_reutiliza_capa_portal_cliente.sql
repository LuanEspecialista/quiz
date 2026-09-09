create or replace function public.portal_cliente()
returns jsonb language sql stable security definer set search_path=public,pg_temp as $$
 select jsonb_build_object(
  'cliente',jsonb_build_object('nome',c.nome,'objetivo',c.objetivo,'modo',c.modo_apresentacao,'horizonte',c.horizonte_investimento,'cidade',c.cidade),
  'oportunidades',coalesce(jsonb_agg(jsonb_build_object(
   'id',e.id,'nome',e.nome,'cidade',e.cidade,'bairro',e.bairro,'endereco',e.endereco,'status',e.status,
   'imagem_url',case when ce.exibir_imagens then e.imagem_url end,
   'descricao',case when ce.exibir_descricao then e.descricao end,'preco',case when ce.exibir_preco then e.faixa_preco end,
   'area_minima',case when ce.exibir_especificacoes then e.area_minima end,'area_maxima',case when ce.exibir_especificacoes then e.area_maxima end,
   'caracteristicas',case when ce.exibir_especificacoes or ce.exibir_descricao then e.caracteristicas end,
   'diferenciais',case when ce.exibir_descricao then e.diferenciais end,'lazer',case when ce.exibir_descricao then e.lazer end,
   'entrega',case when ce.exibir_especificacoes then coalesce(e.entrega_date::text,e.entrega,e.data_entrega) end,
   'mensagem',ce.mensagem_personalizada,'exibir_investimento',ce.exibir_investimento,'exibir_fluxo',ce.exibir_fluxo,'permitir_proposta',ce.permitir_proposta,
   'imagens',case when ce.exibir_imagens then coalesce((select jsonb_agg(jsonb_build_object('id',ei.id,'titulo',ei.titulo,'categoria',ei.categoria,'storage_path',ei.storage_path,'url',case when ei.storage_path is null then ei.url end) order by ei.ordem nulls last,ei.created_at) from public.empreendimento_imagens ei where ei.empreendimento_id=e.id),'[]'::jsonb) else '[]'::jsonb end,
   'plantas',case when ce.exibir_imagens or ce.exibir_especificacoes then coalesce((select jsonb_agg(jsonb_build_object('id',pu.id,'titulo',pu.titulo,'tipo',pu.tipo,'tipologia',pu.tipologia,'storage_path',pu.storage_path) order by pu.ordem,pu.created_at) from public.plantas_unidades pu where pu.empreendimento_id=e.id),'[]'::jsonb) else '[]'::jsonb end
  ) order by ce.ordem) filter(where e.id is not null),'[]'::jsonb)
 ) from public.clientes c left join public.cliente_empreendimentos ce on ce.cliente_id=c.id and ce.visivel left join public.empreendimentos e on e.id=ce.empreendimento_id
 where c.user_id=auth.uid() and c.acesso_portal group by c.id,c.nome,c.objetivo,c.modo_apresentacao,c.horizonte_investimento,c.cidade;
$$;
revoke all on function public.portal_cliente() from public,anon;
grant execute on function public.portal_cliente() to authenticated;
