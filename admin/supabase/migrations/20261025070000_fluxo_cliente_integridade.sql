alter table public.cliente_empreendimentos
  add column if not exists condicoes_unidades jsonb not null default '{}'::jsonb;

drop function if exists public.enviar_proposta_cliente(text,numeric,numeric,numeric,integer,text,text,text,numeric);

create or replace function public.portal_cliente()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'cliente', jsonb_build_object('nome',c.nome,'telefone',c.telefone,'email',c.email,'cpf',c.cpf,'objetivo',c.objetivo,'modo',c.modo_apresentacao,'horizonte',c.horizonte_investimento,'cidade',c.cidade),
    'oportunidades', coalesce(jsonb_agg(jsonb_build_object(
      'id',e.id,'nome',e.nome,'cidade',e.cidade,'bairro',e.bairro,'status',e.status,
      'entrega',coalesce(e.entrega,e.data_entrega),'entrega_date',e.entrega_date,'previsao_entrega',e.previsao_entrega,'data_entrega_chaves',e.data_entrega_chaves,
      'regras_correcao',coalesce(e.regras_correcao,'{}'::jsonb),'observacoes',e.observacoes,
      'cronograma',jsonb_build_object('inicio_obras',e.caracteristicas->'fluxo_comercial'->'inicio_obras'),
      'imagem_storage_path',case when ce.exibir_imagens then (select ei.storage_path from public.empreendimento_imagens ei where ei.empreendimento_id=e.id and ei.visivel_cliente order by ei.ordem nulls last,ei.created_at desc limit 1) end,
      'descricao',case when ce.exibir_descricao then e.descricao end,'preco',case when ce.exibir_preco then e.faixa_preco end,
      'area_minima',case when ce.exibir_especificacoes then e.area_minima end,'area_maxima',case when ce.exibir_especificacoes then e.area_maxima end,
      'caracteristicas',case when ce.exibir_especificacoes then e.caracteristicas end,'mensagem',ce.mensagem_personalizada,
      'exibir_investimento',ce.exibir_investimento,'exibir_fluxo',ce.exibir_fluxo,'permitir_proposta',ce.permitir_proposta,
      'desconto_percentual',ce.desconto_percentual,'observacao_comercial',ce.observacao_comercial,
      'apresentacao',(select jsonb_build_object('url',case when a.tipo_preferido='link' and nullif(a.link_url,'') is not null then a.link_url else a.pdf_url end,'tipo',case when a.tipo_preferido='link' and nullif(a.link_url,'') is not null then 'link' else 'pdf' end) from public.apresentacoes a where a.empreendimento_id=e.id and a.ativo and (a.pdf_url is not null or a.link_url is not null) order by a.updated_at desc limit 1),
      'unidades',coalesce((select jsonb_agg(jsonb_build_object('id',u.id,'codigo',coalesce(nullif(u.codigo_unidade,''),nullif(u.numero_unidade,''),nullif(u.numero,''),u.id::text),'numero',u.numero,'torre',u.torre,'andar',u.andar,'tipologia',u.tipologia,'area_privativa',u.area_privativa,'valor',coalesce(u.valor_tabela,0),'status',u.status,'fluxo_dados',u.fluxo_dados,'desconto_valor',greatest(0,coalesce(nullif(jsonb_extract_path_text(ce.condicoes_unidades,u.id::text,'desconto_valor'),'')::numeric,0)),'desconto_percentual',greatest(0,coalesce(nullif(jsonb_extract_path_text(ce.condicoes_unidades,u.id::text,'desconto_percentual'),'')::numeric,0))) order by u.torre nulls last,u.andar nulls last,u.numero nulls last) from public.unidades u where u.empreendimento_id=e.id and u.id::text=any(coalesce(ce.unidade_ids_selecionadas,'{}'::text[])) and lower(coalesce(u.status,'')) not in ('vendida','bloqueada','fora de tabela')),'[]'::jsonb)
    ) order by ce.ordem) filter(where e.id is not null),'[]'::jsonb)
  ) from public.clientes c left join public.cliente_empreendimentos ce on ce.cliente_id=c.id and ce.visivel left join public.empreendimentos e on e.id=ce.empreendimento_id
  where c.user_id=auth.uid() and c.acesso_portal and (c.acesso_expira_em is null or c.acesso_expira_em>now())
  group by c.id,c.nome,c.telefone,c.email,c.cpf,c.objetivo,c.modo_apresentacao,c.horizonte_investimento,c.cidade;
$$;
revoke all on function public.portal_cliente() from public,anon;
grant execute on function public.portal_cliente() to authenticated;

create or replace function public.enviar_proposta_cliente(
  p_empreendimento_id text,p_entrada numeric,p_parcela_mensal numeric,p_balao numeric default 0,p_quantidade_baloes integer default 0,
  p_objetivo text default null,p_mensagem text default null,p_unidade_id text default null,p_desconto_percentual numeric default 0,
  p_fluxo_snapshot jsonb default '{}'::jsonb,p_cpf text default null,p_email text default null,p_nome text default null,p_telefone text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_cliente_id public.clientes.id%type; v_unidade_id public.unidades.id%type; v_valor_original numeric:=0; v_desconto numeric:=0; v_desconto_valor numeric:=0; v_valor_final numeric:=0;
  v_fluxo jsonb:=coalesce(p_fluxo_snapshot,'{}'::jsonb); v_total numeric:=nullif(v_fluxo->>'total','')::numeric; v_email text:=nullif(lower(trim(coalesce(p_email,''))),''); v_cpf text:=nullif(regexp_replace(coalesce(p_cpf,''),'[^0-9]','','g'),'');
begin
  select id into v_cliente_id from public.clientes where user_id=auth.uid() and acesso_portal and (acesso_expira_em is null or acesso_expira_em>now()) limit 1;
  if v_cliente_id is null then raise exception 'Acesso de cliente não encontrado ou expirado.' using errcode='42501'; end if;
  if nullif(trim(coalesce(p_nome,'')),'') is null or nullif(trim(coalesce(p_telefone,'')),'') is null then raise exception 'Nome e telefone são obrigatórios.' using errcode='22023'; end if;
  if v_email is null or v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'E-mail inválido.' using errcode='22023'; end if;
  if v_cpf is null or length(v_cpf)<>11 then raise exception 'CPF inválido.' using errcode='22023'; end if;
  if not exists(select 1 from public.cliente_empreendimentos where cliente_id=v_cliente_id and empreendimento_id=p_empreendimento_id and visivel and permitir_proposta) then raise exception 'Esta oportunidade não está liberada para proposta.' using errcode='42501'; end if;
  if p_unidade_id is not null and btrim(p_unidade_id)<>'' then
    v_unidade_id:=p_unidade_id;
    if not exists(select 1 from public.cliente_empreendimentos where cliente_id=v_cliente_id and empreendimento_id=p_empreendimento_id and v_unidade_id::text=any(coalesce(unidade_ids_selecionadas,'{}'::text[]))) then raise exception 'Esta unidade não está liberada para proposta.' using errcode='42501'; end if;
    select coalesce(u.valor_tabela,0),greatest(0,coalesce(nullif(jsonb_extract_path_text(ce.condicoes_unidades,v_unidade_id::text,'desconto_valor'),'')::numeric,0)),greatest(0,coalesce(nullif(jsonb_extract_path_text(ce.condicoes_unidades,v_unidade_id::text,'desconto_percentual'),'')::numeric,ce.desconto_percentual,0)) into v_valor_original,v_desconto_valor,v_desconto
      from public.unidades u join public.cliente_empreendimentos ce on ce.empreendimento_id=u.empreendimento_id and ce.cliente_id=v_cliente_id
      where u.id=v_unidade_id and u.empreendimento_id=p_empreendimento_id and lower(coalesce(u.status,'')) not in ('vendida','bloqueada','fora de tabela');
  else
    select coalesce(e.faixa_preco,0),greatest(0,coalesce(ce.desconto_percentual,0)) into v_valor_original,v_desconto from public.empreendimentos e join public.cliente_empreendimentos ce on ce.empreendimento_id=e.id and ce.cliente_id=v_cliente_id where e.id=p_empreendimento_id;
  end if;
  if v_desconto_valor>0 then v_desconto:=least(100,round(v_desconto_valor/greatest(v_valor_original,1)*100,6)); v_valor_final:=greatest(0,round(v_valor_original-v_desconto_valor,2)); else v_desconto:=greatest(0,least(100,v_desconto)); v_valor_final:=round(v_valor_original*(1-v_desconto/100),2); end if;
  if v_total is null or abs(v_total-v_valor_final)>0.02 or v_total>v_valor_final+0.02 then raise exception 'O fluxo precisa fechar exatamente no valor final negociado da unidade.' using errcode='22023'; end if;
  if coalesce(p_entrada,0)<0 or coalesce(p_parcela_mensal,0)<0 or coalesce(p_balao,0)<0 or coalesce(p_quantidade_baloes,0)<0 or coalesce(p_quantidade_baloes,0)>120 then raise exception 'Valores da proposta inválidos.' using errcode='22023'; end if;
  update public.clientes set nome=left(trim(p_nome),150),telefone=left(trim(p_telefone),40),cpf=v_cpf,email=v_email,updated_at=now() where id=v_cliente_id;
  insert into public.cliente_propostas(cliente_id,empreendimento_id,unidade_id,entrada,parcela_mensal,balao,quantidade_baloes,objetivo,mensagem,valor_original,desconto_percentual,valor_final,fluxo_snapshot,observacao_comercial)
  values(v_cliente_id,p_empreendimento_id,v_unidade_id,coalesce(p_entrada,0),coalesce(p_parcela_mensal,0),coalesce(p_balao,0),coalesce(p_quantidade_baloes,0),nullif(left(coalesce(p_objetivo,''),100),''),nullif(left(coalesce(p_mensagem,''),1500),''),v_valor_original,v_desconto,v_valor_final,v_fluxo,(select ce.observacao_comercial from public.cliente_empreendimentos ce where ce.cliente_id=v_cliente_id and ce.empreendimento_id=p_empreendimento_id limit 1));
  return jsonb_build_object('ok',true,'valor_original',v_valor_original,'desconto_valor',v_desconto_valor,'desconto_percentual',v_desconto,'valor_final',v_valor_final);
end; $$;
revoke all on function public.enviar_proposta_cliente(text,numeric,numeric,numeric,integer,text,text,text,numeric,jsonb,text,text,text,text) from public;
grant execute on function public.enviar_proposta_cliente(text,numeric,numeric,numeric,integer,text,text,text,numeric,jsonb,text,text,text,text) to authenticated;
notify pgrst,'reload schema';
