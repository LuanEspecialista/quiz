-- Base que faltava para os módulos de curadoria e afiliados persistirem dados.
create extension if not exists pgcrypto;

alter table public.clientes
  add column if not exists user_id uuid,
  add column if not exists acesso_portal boolean not null default false,
  add column if not exists modo_apresentacao text not null default 'moradia',
  add column if not exists horizonte_investimento text,
  add column if not exists perfil_risco text,
  add column if not exists cidades_preferencia text[] not null default '{}';

alter table public.empreendimentos
  add column if not exists numero_pavimentos integer check (numero_pavimentos is null or numero_pavimentos > 0),
  add column if not exists categoria_afiliado text,
  add column if not exists entrada_afiliado numeric,
  add column if not exists parcela_afiliado numeric,
  add column if not exists quantidade_elevadores integer,
  add column if not exists quantidade_areas_lazer integer;

do $$
declare cliente_id_type text;
declare empreendimento_id_type text;
begin
  select pg_catalog.format_type(a.atttypid, a.atttypmod) into cliente_id_type from pg_catalog.pg_attribute a where a.attrelid = 'public.clientes'::regclass and a.attname = 'id' and not a.attisdropped;
  select pg_catalog.format_type(a.atttypid, a.atttypmod) into empreendimento_id_type from pg_catalog.pg_attribute a where a.attrelid = 'public.empreendimentos'::regclass and a.attname = 'id' and not a.attisdropped;
  execute format('create table if not exists public.cliente_empreendimentos (
    cliente_id %s not null references public.clientes(id) on delete cascade,
    empreendimento_id %s not null references public.empreendimentos(id) on delete cascade,
    ordem smallint not null default 1 check (ordem between 1 and 4), motivo text,
    visivel boolean not null default true, exibir_imagens boolean not null default false,
    exibir_descricao boolean not null default false, exibir_preco boolean not null default false,
    exibir_especificacoes boolean not null default false, exibir_investimento boolean not null default false,
    exibir_fluxo boolean not null default false, mensagem_personalizada text,
    created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
    primary key (cliente_id, empreendimento_id))', cliente_id_type, empreendimento_id_type);
end $$;

-- CREATE TABLE IF NOT EXISTS nao completa tabelas criadas por migrations antigas.
alter table public.cliente_empreendimentos
  add column if not exists visivel boolean not null default true,
  add column if not exists exibir_imagens boolean not null default false,
  add column if not exists exibir_descricao boolean not null default false,
  add column if not exists exibir_preco boolean not null default false,
  add column if not exists exibir_especificacoes boolean not null default false,
  add column if not exists exibir_investimento boolean not null default false,
  add column if not exists exibir_fluxo boolean not null default false,
  add column if not exists mensagem_personalizada text;

create table if not exists public.afiliados (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique,
  nome text not null,
  email text not null unique,
  telefone text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.afiliados
  add column if not exists user_id uuid,
  add column if not exists ativo boolean not null default true,
  add column if not exists updated_at timestamptz not null default now();
create unique index if not exists afiliados_user_id_key on public.afiliados(user_id) where user_id is not null;

create table if not exists public.regras_comissao_afiliado (
  id uuid primary key default gen_random_uuid(),
  tipo_produto text not null unique,
  percentual numeric(7,3) not null check (percentual between 0 and 100),
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
declare empreendimento_id_type text;
begin
  select pg_catalog.format_type(a.atttypid, a.atttypmod) into empreendimento_id_type from pg_catalog.pg_attribute a where a.attrelid = 'public.empreendimentos'::regclass and a.attname = 'id' and not a.attisdropped;
  execute format('create table if not exists public.afiliado_produtos (
    afiliado_id uuid not null references public.afiliados(id) on delete cascade,
    empreendimento_id %s not null references public.empreendimentos(id) on delete cascade,
    liberado boolean not null default false, confidencial boolean not null default false, instrucoes text,
    exibir_imagens boolean not null default false, exibir_descricao boolean not null default false,
    exibir_preco boolean not null default false, exibir_entrada_parcelas boolean not null default false,
    exibir_comissao boolean not null default false, exibir_especificacoes boolean not null default false,
    created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
    primary key (afiliado_id, empreendimento_id))', empreendimento_id_type);
end $$;

alter table public.afiliado_produtos
  add column if not exists exibir_imagens boolean not null default false,
  add column if not exists exibir_descricao boolean not null default false,
  add column if not exists exibir_preco boolean not null default false,
  add column if not exists exibir_entrada_parcelas boolean not null default false,
  add column if not exists exibir_comissao boolean not null default false,
  add column if not exists exibir_especificacoes boolean not null default false;

create index if not exists cliente_empreendimentos_cliente_idx on public.cliente_empreendimentos(cliente_id, ordem);
create index if not exists afiliado_produtos_afiliado_idx on public.afiliado_produtos(afiliado_id, liberado);

alter table public.cliente_empreendimentos enable row level security;
alter table public.afiliados enable row level security;
alter table public.afiliado_produtos enable row level security;
drop policy if exists "curadoria somente admin" on public.cliente_empreendimentos;
create policy "curadoria somente admin" on public.cliente_empreendimentos for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "afiliados somente admin" on public.afiliados;
create policy "afiliados somente admin" on public.afiliados for all to authenticated using (public.is_admin()) with check (public.is_admin());
drop policy if exists "produtos de afiliado somente admin" on public.afiliado_produtos;
create policy "produtos de afiliado somente admin" on public.afiliado_produtos for all to authenticated using (public.is_admin()) with check (public.is_admin());

create or replace function public.vincular_afiliado_email(p_afiliado_id uuid, p_email text)
returns boolean language plpgsql security definer set search_path = public, auth as $$
declare conta uuid;
begin
  if not public.is_admin() then raise exception 'Apenas administrador pode vincular afiliados'; end if;
  select id into conta from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if conta is null then return false; end if;
  update public.afiliados set user_id = conta, updated_at = now() where id = p_afiliado_id;
  return true;
end;
$$;
grant execute on function public.vincular_afiliado_email(uuid, text) to authenticated;
