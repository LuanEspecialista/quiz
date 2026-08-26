-- O administrador controla explicitamente quando o cliente pode enviar proposta.
alter table public.cliente_empreendimentos
  add column if not exists permitir_proposta boolean not null default false;

do $$
declare cliente_id_type text; empreendimento_id_type text;
begin
  select pg_catalog.format_type(a.atttypid, a.atttypmod) into cliente_id_type from pg_catalog.pg_attribute a where a.attrelid='public.clientes'::regclass and a.attname='id' and not a.attisdropped;
  select pg_catalog.format_type(a.atttypid, a.atttypmod) into empreendimento_id_type from pg_catalog.pg_attribute a where a.attrelid='public.empreendimentos'::regclass and a.attname='id' and not a.attisdropped;
  execute format('create table if not exists public.cliente_propostas (
    id uuid primary key default gen_random_uuid(),
    cliente_id %s not null references public.clientes(id) on delete cascade,
    empreendimento_id %s not null references public.empreendimentos(id) on delete cascade,
    entrada numeric not null check (entrada >= 0),
    parcela_mensal numeric not null check (parcela_mensal >= 0),
    balao numeric not null check (balao >= 0),
    quantidade_baloes integer not null default 0 check (quantidade_baloes >= 0 and quantidade_baloes <= 120),
    objetivo text,
    mensagem text,
    status text not null default ''nova'' check (status in (''nova'',''em_analise'',''contraproposta'',''aceita'',''recusada'')),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )', cliente_id_type, empreendimento_id_type);
end $$;

alter table public.cliente_propostas enable row level security;
revoke all on public.cliente_propostas from anon, authenticated;
grant select, insert, update, delete on public.cliente_propostas to authenticated;

drop policy if exists "cliente_propostas_admin" on public.cliente_propostas;
create policy "cliente_propostas_admin" on public.cliente_propostas for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.enviar_proposta_cliente(
  p_empreendimento_id text, p_entrada numeric, p_parcela_mensal numeric,
  p_balao numeric default 0, p_quantidade_baloes integer default 0,
  p_objetivo text default null, p_mensagem text default null
)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_cliente_id public.clientes.id%type; v_empreendimento_id public.empreendimentos.id%type;
begin
  select id into v_cliente_id from public.clientes where user_id=auth.uid() and acesso_portal;
  if v_cliente_id is null then raise exception 'Acesso de cliente não encontrado.' using errcode='42501'; end if;
  begin v_empreendimento_id := p_empreendimento_id; exception when others then raise exception 'Empreendimento inválido.' using errcode='22023'; end;
  if not exists(select 1 from public.cliente_empreendimentos where cliente_id=v_cliente_id and empreendimento_id=v_empreendimento_id and visivel and permitir_proposta) then
    raise exception 'Esta oportunidade não está liberada para proposta.' using errcode='42501';
  end if;
  if coalesce(p_entrada,0)<0 or coalesce(p_parcela_mensal,0)<0 or coalesce(p_balao,0)<0 or coalesce(p_quantidade_baloes,0)<0 or coalesce(p_quantidade_baloes,0)>120 then
    raise exception 'Valores da proposta inválidos.' using errcode='22023';
  end if;
  insert into public.cliente_propostas(cliente_id,empreendimento_id,entrada,parcela_mensal,balao,quantidade_baloes,objetivo,mensagem)
  values(v_cliente_id,v_empreendimento_id,coalesce(p_entrada,0),coalesce(p_parcela_mensal,0),coalesce(p_balao,0),coalesce(p_quantidade_baloes,0),nullif(left(coalesce(p_objetivo,''),100),''),nullif(left(coalesce(p_mensagem,''),1500),''));
  return jsonb_build_object('ok',true);
end;$$;
revoke all on function public.enviar_proposta_cliente(text,numeric,numeric,numeric,integer,text,text) from public;
grant execute on function public.enviar_proposta_cliente(text,numeric,numeric,numeric,integer,text,text) to authenticated;

create or replace function public.portal_cliente()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'cliente',jsonb_build_object('nome',c.nome,'objetivo',c.objetivo,'modo',c.modo_apresentacao,'horizonte',c.horizonte_investimento,'cidade',c.cidade),
    'oportunidades',coalesce(jsonb_agg(jsonb_build_object(
      'id',e.id,'nome',e.nome,'cidade',e.cidade,'bairro',e.bairro,'status',e.status,
      'imagem_storage_path',case when ce.exibir_imagens then (select ei.storage_path from public.empreendimento_imagens ei where ei.empreendimento_id=e.id and ei.visivel_cliente order by ei.ordem nulls last,ei.created_at desc limit 1) end,
      'descricao',case when ce.exibir_descricao then e.descricao end,'preco',case when ce.exibir_preco then e.faixa_preco end,
      'area_minima',case when ce.exibir_especificacoes then e.area_minima end,'area_maxima',case when ce.exibir_especificacoes then e.area_maxima end,
      'caracteristicas',case when ce.exibir_especificacoes then e.caracteristicas end,'mensagem',ce.mensagem_personalizada,
      'exibir_investimento',ce.exibir_investimento,'exibir_fluxo',ce.exibir_fluxo,'permitir_proposta',ce.permitir_proposta
    ) order by ce.ordem) filter(where e.id is not null),'[]'::jsonb)
  ) from public.clientes c left join public.cliente_empreendimentos ce on ce.cliente_id=c.id and ce.visivel left join public.empreendimentos e on e.id=ce.empreendimento_id
  where c.user_id=auth.uid() and c.acesso_portal group by c.id,c.nome,c.objetivo,c.modo_apresentacao,c.horizonte_investimento,c.cidade;
$$;
revoke all on function public.portal_cliente() from public, anon;
grant execute on function public.portal_cliente() to authenticated;
