-- Tipologias reutilizáveis: uma planta atende várias unidades sem perder exceções.
create table if not exists public.tipologias_unidades (
  id uuid primary key default gen_random_uuid(),
  empreendimento_id text not null references public.empreendimentos(id) on delete cascade,
  codigo text,
  nome text not null,
  variante text not null default 'padrao',
  quartos integer,
  suites integer,
  banheiros integer,
  vagas integer,
  area_privativa numeric,
  area_interna numeric,
  area_externa numeric,
  area_total numeric,
  possui_jardim boolean not null default false,
  espelhada boolean not null default false,
  acessivel boolean not null default false,
  torre text,
  finais text[] not null default '{}',
  chave_agrupamento text not null,
  ativa boolean not null default true,
  criado_por uuid default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (empreendimento_id, chave_agrupamento),
  check (nullif(trim(nome), '') is not null),
  check (area_interna is null or area_interna >= 0),
  check (area_externa is null or area_externa >= 0),
  check (area_total is null or area_total >= 0)
);

alter table public.tipologias_unidades enable row level security;
drop policy if exists "tipologias_admin" on public.tipologias_unidades;
create policy "tipologias_admin" on public.tipologias_unidades for all to authenticated
using (public.is_admin()) with check (public.is_admin());
grant select, insert, update, delete on public.tipologias_unidades to authenticated;

alter table public.unidades add column if not exists tipologia_id uuid references public.tipologias_unidades(id) on delete set null;
alter table public.unidades add column if not exists area_interna numeric;
alter table public.unidades add column if not exists area_externa numeric;
alter table public.unidades add column if not exists area_total numeric;
alter table public.unidades add column if not exists possui_jardim boolean not null default false;
alter table public.unidades add column if not exists planta_variacao text;
create index if not exists unidades_tipologia_id_idx on public.unidades(tipologia_id);

alter table public.plantas_unidades add column if not exists tipologia_id uuid references public.tipologias_unidades(id) on delete cascade;
alter table public.plantas_unidades add column if not exists variante text not null default 'padrao';
alter table public.plantas_unidades drop constraint if exists plantas_unidades_destino;
alter table public.plantas_unidades add constraint plantas_unidades_destino
check (unidade_id is not null or tipologia_id is not null or nullif(trim(tipologia), '') is not null);
create index if not exists plantas_unidades_tipologia_id_idx on public.plantas_unidades(tipologia_id);

-- Migração conservadora: agrupa somente combinações exatas já cadastradas.
insert into public.tipologias_unidades (
  empreendimento_id, nome, variante, quartos, suites, vagas, area_privativa,
  possui_jardim, chave_agrupamento
)
select
  u.empreendimento_id,
  trim(u.tipologia),
  case when lower(u.tipologia) ~ '(garden|jardim|giardino)' then 'jardim' else 'padrao' end,
  u.quartos,
  u.suites,
  u.vagas,
  u.area_privativa,
  lower(u.tipologia) ~ '(garden|jardim|giardino)',
  lower(md5(concat_ws('|', lower(trim(u.tipologia)), coalesce(u.area_privativa::text, ''), coalesce(u.quartos::text, ''), coalesce(u.suites::text, ''), coalesce(u.vagas::text, ''))))
from public.unidades u
where u.empreendimento_id is not null and nullif(trim(u.tipologia), '') is not null
group by u.empreendimento_id, trim(u.tipologia), lower(u.tipologia), u.quartos, u.suites, u.vagas, u.area_privativa
on conflict (empreendimento_id, chave_agrupamento) do nothing;

update public.unidades u
set tipologia_id = t.id
from public.tipologias_unidades t
where u.tipologia_id is null
  and u.empreendimento_id = t.empreendimento_id
  and t.chave_agrupamento = lower(md5(concat_ws('|', lower(trim(u.tipologia)), coalesce(u.area_privativa::text, ''), coalesce(u.quartos::text, ''), coalesce(u.suites::text, ''), coalesce(u.vagas::text, ''))));

create or replace function public.sincronizar_tipologias(p_empreendimento_id text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_criadas integer:=0; v_vinculadas integer:=0;
begin
  if not public.is_admin() then raise exception 'ACESSO_NEGADO'; end if;
  insert into public.tipologias_unidades (empreendimento_id,nome,variante,quartos,suites,vagas,area_privativa,possui_jardim,chave_agrupamento)
  select u.empreendimento_id,trim(u.tipologia),case when lower(u.tipologia)~'(garden|jardim|giardino)' then 'jardim' else 'padrao' end,
    u.quartos,u.suites,u.vagas,u.area_privativa,lower(u.tipologia)~'(garden|jardim|giardino)',
    lower(md5(concat_ws('|',lower(trim(u.tipologia)),coalesce(u.area_privativa::text,''),coalesce(u.quartos::text,''),coalesce(u.suites::text,''),coalesce(u.vagas::text,''))))
  from public.unidades u where u.empreendimento_id=p_empreendimento_id and nullif(trim(u.tipologia),'') is not null
  group by u.empreendimento_id,trim(u.tipologia),lower(u.tipologia),u.quartos,u.suites,u.vagas,u.area_privativa
  on conflict (empreendimento_id,chave_agrupamento) do nothing;
  get diagnostics v_criadas=row_count;
  update public.unidades u set tipologia_id=t.id from public.tipologias_unidades t
  where u.empreendimento_id=p_empreendimento_id and u.tipologia_id is null and t.empreendimento_id=u.empreendimento_id
    and t.chave_agrupamento=lower(md5(concat_ws('|',lower(trim(u.tipologia)),coalesce(u.area_privativa::text,''),coalesce(u.quartos::text,''),coalesce(u.suites::text,''),coalesce(u.vagas::text,''))));
  get diagnostics v_vinculadas=row_count;
  return jsonb_build_object('criadas',v_criadas,'vinculadas',v_vinculadas);
end $$;
revoke all on function public.sincronizar_tipologias(text) from public,anon;
grant execute on function public.sincronizar_tipologias(text) to authenticated;

-- Dados de conta exibidos ao próprio usuário; autorização continua em perfil/ativo.
alter table public.perfis_usuario add column if not exists nome_exibicao text;
alter table public.perfis_usuario add column if not exists avatar_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatares', 'avatares', false, 5242880, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "avatar_proprio_select" on storage.objects;
create policy "avatar_proprio_select" on storage.objects for select to authenticated
using (bucket_id='avatares' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "avatar_proprio_insert" on storage.objects;
create policy "avatar_proprio_insert" on storage.objects for insert to authenticated
with check (bucket_id='avatares' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "avatar_proprio_update" on storage.objects;
create policy "avatar_proprio_update" on storage.objects for update to authenticated
using (bucket_id='avatares' and (storage.foldername(name))[1]=(select auth.uid())::text)
with check (bucket_id='avatares' and (storage.foldername(name))[1]=(select auth.uid())::text);
drop policy if exists "avatar_proprio_delete" on storage.objects;
create policy "avatar_proprio_delete" on storage.objects for delete to authenticated
using (bucket_id='avatares' and (storage.foldername(name))[1]=(select auth.uid())::text);

create or replace function public.atualizar_meu_perfil(p_usuario text, p_nome_exibicao text, p_avatar_path text)
returns public.perfis_usuario
language plpgsql security definer set search_path=public,pg_temp
as $$
declare v_usuario text:=lower(trim(p_usuario)); v_result public.perfis_usuario;
begin
  if auth.uid() is null then raise exception 'NAO_AUTENTICADO'; end if;
  if v_usuario !~ '^[a-z0-9][a-z0-9._-]{2,23}$' then raise exception 'USUARIO_INVALIDO'; end if;
  if exists(select 1 from public.perfis_usuario where lower(usuario)=v_usuario and user_id<>auth.uid()) then raise exception 'USUARIO_EM_USO'; end if;
  update public.perfis_usuario set usuario=v_usuario, nome_exibicao=nullif(trim(p_nome_exibicao),''), avatar_path=nullif(trim(p_avatar_path),''), updated_at=now()
  where user_id=auth.uid() and ativo=true returning * into v_result;
  if v_result.user_id is null then raise exception 'PERFIL_INATIVO_OU_INEXISTENTE'; end if;
  return v_result;
end $$;
revoke all on function public.atualizar_meu_perfil(text,text,text) from public,anon;
grant execute on function public.atualizar_meu_perfil(text,text,text) to authenticated;

create or replace view public.cotacao_usd_brl_atual with (security_invoker=true) as
select
  coalesce(c.cotacao_manual,case c.tipo_ptax when 'compra' then x.cotacao_compra else x.cotacao_venda end)*(1+c.margem_cambio_percentual/100) as cotacao,
  x.data_cotacao,
  c.cotacao_manual is not null as manual,
  x.created_at as atualizado_em
from public.site_configuracoes c
left join lateral (
  select cotacao_compra,cotacao_venda,data_cotacao,created_at from public.cotacoes_cambio
  where par='USD/BRL' order by data_cotacao desc,created_at desc limit 1
) x on true where c.id=1;
grant select on public.cotacao_usd_brl_atual to anon,authenticated;
