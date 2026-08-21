create extension if not exists pgcrypto;

do $$
declare unidade_id_type text;
declare cliente_id_type text;
begin
  select pg_catalog.format_type(a.atttypid, a.atttypmod) into unidade_id_type
  from pg_catalog.pg_attribute a
  where a.attrelid = 'public.unidades'::regclass and a.attname = 'id' and not a.attisdropped;

  select pg_catalog.format_type(a.atttypid, a.atttypmod) into cliente_id_type
  from pg_catalog.pg_attribute a
  where a.attrelid = 'public.clientes'::regclass and a.attname = 'id' and not a.attisdropped;

  execute format('create table if not exists public.fluxo_simulacoes (
    id uuid primary key default gen_random_uuid(),
    unidade_id %s not null references public.unidades(id) on delete cascade,
    cliente_id %s references public.clientes(id) on delete set null,
    nome text not null default ''Simulação'',
    cenario text not null default ''base'' check (cenario in (''conservador'',''base'',''otimista'')),
    valores jsonb not null default ''{}''::jsonb,
    travas jsonb not null default ''{}''::jsonb,
    premissas jsonb not null default ''{}''::jsonb,
    metricas jsonb not null default ''{}''::jsonb,
    cronograma jsonb not null default ''[]''::jsonb,
    status text not null default ''rascunho'' check (status in (''rascunho'',''valido'',''proposta_construtora'',''incompleto'')),
    created_by uuid default auth.uid(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
  )', unidade_id_type, cliente_id_type);
  execute format('alter table public.fluxo_simulacoes add column if not exists unidade_id %s references public.unidades(id) on delete cascade',unidade_id_type);
  execute format('alter table public.fluxo_simulacoes add column if not exists cliente_id %s references public.clientes(id) on delete set null',cliente_id_type);
end $$;

alter table public.fluxo_simulacoes
  add column if not exists nome text not null default 'Simulação',
  add column if not exists cenario text not null default 'base',
  add column if not exists valores jsonb not null default '{}'::jsonb,
  add column if not exists travas jsonb not null default '{}'::jsonb,
  add column if not exists premissas jsonb not null default '{}'::jsonb,
  add column if not exists metricas jsonb not null default '{}'::jsonb,
  add column if not exists cronograma jsonb not null default '[]'::jsonb,
  add column if not exists status text not null default 'rascunho',
  add column if not exists created_by uuid default auth.uid(),
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists fluxo_simulacoes_unidade_idx on public.fluxo_simulacoes(unidade_id, updated_at desc);
create index if not exists fluxo_simulacoes_cliente_idx on public.fluxo_simulacoes(cliente_id, updated_at desc);
alter table public.fluxo_simulacoes enable row level security;
drop policy if exists "fluxos somente admin" on public.fluxo_simulacoes;
create policy "fluxos somente admin" on public.fluxo_simulacoes for all to authenticated
using (public.is_admin()) with check (public.is_admin());

create or replace function public.pode_acessar_midia(p_storage_path text)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.empreendimento_imagens ei
    where ei.storage_path = p_storage_path and (
      exists (
        select 1 from public.clientes c
        join public.cliente_empreendimentos ce on ce.cliente_id = c.id
        where c.user_id = auth.uid() and c.acesso_portal and ce.empreendimento_id = ei.empreendimento_id
          and ce.visivel and ce.exibir_imagens and ei.visivel_cliente
      ) or exists (
        select 1 from public.afiliados a
        join public.afiliado_produtos ap on ap.afiliado_id = a.id
        where a.user_id = auth.uid() and a.ativo and ap.empreendimento_id = ei.empreendimento_id
          and ap.liberado and ap.exibir_imagens and ei.visivel_afiliado
      )
    )
  );
$$;
revoke all on function public.pode_acessar_midia(text) from public;
grant execute on function public.pode_acessar_midia(text) to authenticated;

drop policy if exists "midias privadas por curadoria" on storage.objects;
create policy "midias privadas por curadoria" on storage.objects for select to authenticated
using (bucket_id = 'empreendimentos' and public.pode_acessar_midia(name));

create or replace function public.portal_cliente()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'cliente', jsonb_build_object('nome',c.nome,'objetivo',c.objetivo,'modo',c.modo_apresentacao,'horizonte',c.horizonte_investimento,'cidade',c.cidade),
    'oportunidades', coalesce(jsonb_agg(jsonb_build_object(
      'id',e.id,'nome',e.nome,'cidade',e.cidade,'bairro',e.bairro,'status',e.status,
      'imagem_storage_path', case when ce.exibir_imagens then (select ei.storage_path from public.empreendimento_imagens ei where ei.empreendimento_id=e.id and ei.visivel_cliente order by ei.ordem nulls last,ei.created_at desc limit 1) end,
      'descricao',case when ce.exibir_descricao then e.descricao end,
      'preco',case when ce.exibir_preco then e.faixa_preco end,
      'area_minima',case when ce.exibir_especificacoes then e.area_minima end,
      'area_maxima',case when ce.exibir_especificacoes then e.area_maxima end,
      'caracteristicas',case when ce.exibir_especificacoes then e.caracteristicas end,
      'mensagem',ce.mensagem_personalizada,'exibir_investimento',ce.exibir_investimento,'exibir_fluxo',ce.exibir_fluxo
    ) order by ce.ordem) filter(where e.id is not null),'[]'::jsonb)
  ) from public.clientes c
  left join public.cliente_empreendimentos ce on ce.cliente_id=c.id and ce.visivel
  left join public.empreendimentos e on e.id=ce.empreendimento_id
  where c.user_id=auth.uid() and c.acesso_portal
  group by c.id,c.nome,c.objetivo,c.modo_apresentacao,c.horizonte_investimento,c.cidade;
$$;

drop function if exists public.catalogo_afiliado();
create function public.catalogo_afiliado()
returns table(
  id text,nome text,cidade text,bairro text,status text,descricao text,imagem_url text,imagem_storage_path text,
  tipo text,faixa_preco numeric,area_minima numeric,area_maxima numeric,entrada_afiliado numeric,parcela_afiliado numeric,
  quantidade_elevadores integer,quantidade_areas_lazer integer,caracteristicas jsonb,percentual_comissao numeric,confidencial boolean,instrucoes text
) language sql stable security definer set search_path=public as $$
  select e.id::text,e.nome,e.cidade,e.bairro,e.status,
    case when ap.exibir_descricao then e.descricao end,null::text,
    case when ap.exibir_imagens then (select ei.storage_path from public.empreendimento_imagens ei where ei.empreendimento_id=e.id and ei.visivel_afiliado order by ei.ordem nulls last,ei.created_at desc limit 1) end,
    coalesce(e.categoria_afiliado,e.tipo),case when ap.exibir_preco then e.faixa_preco end,
    case when ap.exibir_especificacoes then e.area_minima end,case when ap.exibir_especificacoes then e.area_maxima end,
    case when ap.exibir_entrada_parcelas then e.entrada_afiliado end,case when ap.exibir_entrada_parcelas then e.parcela_afiliado end,
    case when ap.exibir_especificacoes then e.quantidade_elevadores end,case when ap.exibir_especificacoes then e.quantidade_areas_lazer end,
    case when ap.exibir_especificacoes then e.caracteristicas end,case when ap.exibir_comissao then coalesce(rc.percentual,0) end,
    ap.confidencial,ap.instrucoes
  from public.afiliados a join public.afiliado_produtos ap on ap.afiliado_id=a.id and ap.liberado
  join public.empreendimentos e on e.id=ap.empreendimento_id and e.ativo
  left join public.regras_comissao_afiliado rc on lower(rc.tipo_produto)=lower(coalesce(e.categoria_afiliado,e.tipo)) and rc.ativo
  where a.user_id=auth.uid() and a.ativo;
$$;
grant execute on function public.portal_cliente() to authenticated;
grant execute on function public.catalogo_afiliado() to authenticated;

create or replace function public.resolver_link_temporario(p_token text,p_senha text default null,p_user_agent text default null,p_ip text default null)
returns jsonb language plpgsql security definer set search_path=public,extensions as $$
declare l public.links_temporarios%rowtype;resultado jsonb;sucesso boolean:=false;motivo text;
begin
  select * into l from public.links_temporarios where token_hash=encode(digest(coalesce(p_token,''),'sha256'),'hex') for update;
  if l.id is null then return jsonb_build_object('ok',false,'codigo','invalido');end if;
  if l.revogado_em is not null or coalesce(l.bloqueado_manualmente,false) then motivo:='revogado';
  elsif l.expira_em<=now() then motivo:='expirado';
  elsif l.max_acessos is not null and l.acessos>=l.max_acessos then motivo:='limite';
  elsif l.senha_hash is not null and crypt(coalesce(p_senha,''),l.senha_hash)<>l.senha_hash then motivo:='senha';else sucesso:=true;end if;
  insert into public.links_temporarios_acessos(link_id,user_agent,ip_hash,sucesso,motivo) values(l.id,left(p_user_agent,500),case when p_ip is null then null else encode(digest(p_ip,'sha256'),'hex') end,sucesso,motivo);
  if not sucesso then return jsonb_build_object('ok',false,'codigo',motivo,'senha_necessaria',l.senha_hash is not null);end if;
  update public.links_temporarios set acessos=acessos+1,ultimo_acesso_em=now(),updated_at=now() where id=l.id;
  select jsonb_build_object('ok',true,'titulo',l.titulo,'publico',l.publico,'expira_em',l.expira_em,'permissoes',l.permissoes,
    'empreendimentos',coalesce(jsonb_agg(jsonb_build_object(
      'id',e.id::text,'nome',e.nome,'cidade',e.cidade,'bairro',e.bairro,'status',e.status,
      'descricao',case when coalesce((l.permissoes->>'descricao')::boolean,false) then e.descricao end,
      'preco',case when coalesce((l.permissoes->>'preco')::boolean,false) then e.faixa_preco end,
      'caracteristicas',case when coalesce((l.permissoes->>'descricao')::boolean,false) then e.caracteristicas end,
      'midias',case when coalesce((l.permissoes->>'imagens')::boolean,false) then (select coalesce(jsonb_agg(ei.storage_path) filter(where ei.storage_path is not null),'[]'::jsonb) from public.empreendimento_imagens ei where ei.empreendimento_id=e.id and case when l.publico='afiliado' then ei.visivel_afiliado else ei.visivel_cliente end) else '[]'::jsonb end,
      'pdf_path',case when coalesce((l.permissoes->>'pdf')::boolean,false) then (select a.storage_path from public.apresentacoes a where a.empreendimento_id=e.id and a.ativo limit 1) end,
      'fluxos',case when coalesce((l.permissoes->>'fluxo')::boolean,false) then (select coalesce(jsonb_agg(jsonb_build_object('nome',fs.nome,'cenario',fs.cenario,'valores',fs.valores,'premissas',fs.premissas,'metricas',fs.metricas,'cronograma',fs.cronograma,'status',fs.status) order by fs.updated_at desc),'[]'::jsonb) from public.fluxo_simulacoes fs join public.unidades u on u.id=fs.unidade_id where u.empreendimento_id=e.id and fs.status in ('valido','proposta_construtora')) else '[]'::jsonb end
    )) filter(where e.id is not null),'[]'::jsonb)) into resultado
  from public.empreendimentos e where e.id::text=any(l.empreendimento_ids_text);
  return resultado;
end $$;
grant execute on function public.resolver_link_temporario(text,text,text,text) to anon,authenticated;

notify pgrst, 'reload schema';
