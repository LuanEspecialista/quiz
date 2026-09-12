create index if not exists indicador_indicacoes_produto_idx on public.indicador_indicacoes(produto_id);

create or replace function public.portal_indicador()
returns jsonb language sql stable security definer set search_path=public as $$
select coalesce((select jsonb_build_object(
  'perfil',jsonb_build_object('id',a.id,'nome',a.nome,'etapa',a.etapa,'ativo',a.ativo,'termo_aceito_em',case when a.termo_versao=c.termo_versao then a.termo_aceito_em end,'termo_versao',a.termo_versao),
  'termo',jsonb_build_object('versao',c.termo_versao,'texto',c.termo_texto),
  'produtos',coalesce((select jsonb_agg(jsonb_build_object(
    'id',p.id,'tipo',p.tipo,'codigo',p.codigo,'titulo',p.titulo,'cidade',p.cidade,'regiao_aproximada',p.regiao_aproximada,
    'faixa_preco_min',p.faixa_preco_min,'faixa_preco_max',p.faixa_preco_max,'resumo',p.resumo,'publico_ideal',p.publico_ideal,
    'diferenciais',p.diferenciais,'perguntas',p.perguntas,'objecoes',p.objecoes,'roteiro',p.roteiro,'cuidados',p.cuidados,
    'capa_url',p.capa_url,'imagens',coalesce((select jsonb_agg(jsonb_build_object('id',ei.id,'titulo',ei.titulo,'storage_path',ei.storage_path,'url',ei.url) order by ord.pos)
      from jsonb_array_elements_text(p.imagem_ids) with ordinality ord(id,pos) join public.empreendimento_imagens ei on ei.id::text=ord.id
      where p.empreendimento_id=ei.empreendimento_id),'[]'::jsonb),
    'bonus_percentual',case when p.tipo='imovel' then c.bonus_imovel_percentual else c.bonus_carta_percentual end
  ) order by p.updated_at desc) from public.indicador_acessos ia join public.indicador_produtos p on p.id=ia.produto_id and p.ativo
    where ia.indicador_id=a.id and ia.liberado and a.etapa='aprovado' and a.termo_aceito_em is not null and a.termo_versao=c.termo_versao),'[]'::jsonb),
  'indicacoes',coalesce((select jsonb_agg(to_jsonb(i) order by i.created_at desc) from public.indicador_indicacoes i where i.indicador_id=a.id),'[]'::jsonb)
) from public.afiliados a cross join public.indicador_configuracoes c where a.user_id=auth.uid() and a.ativo limit 1),'{}'::jsonb);
$$;
revoke all on function public.portal_indicador() from public,anon;
grant execute on function public.portal_indicador() to authenticated;

create or replace function public.preparar_bonus_indicacao()
returns trigger language plpgsql security invoker set search_path=public as $$
declare v_percentual numeric;
begin
  select case when p.tipo='imovel' then c.bonus_imovel_percentual else c.bonus_carta_percentual end
    into v_percentual from public.indicador_produtos p cross join public.indicador_configuracoes c where p.id=new.produto_id;
  new.bonus_percentual:=v_percentual;
  new.bonus_previsto:=case when new.valor_referencia is null then null else round(new.valor_referencia*v_percentual/100,2) end;
  return new;
end $$;
drop trigger if exists indicador_indicacoes_prepara_bonus on public.indicador_indicacoes;
create trigger indicador_indicacoes_prepara_bonus before insert or update of produto_id,valor_referencia on public.indicador_indicacoes for each row execute function public.preparar_bonus_indicacao();
