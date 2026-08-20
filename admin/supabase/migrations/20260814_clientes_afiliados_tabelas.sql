-- Deve existir antes das políticas e funções dos portais restritos (20260815).
create extension if not exists pgcrypto;

alter table public.clientes
  add column if not exists user_id uuid,
  add column if not exists acesso_portal boolean not null default false,
  add column if not exists cidades_preferencia text[] not null default '{}';

-- Bases antigas podem usar integer e bases novas UUID. Os vínculos usam
-- exatamente o tipo existente, sem conversão nem perda de integridade.
do $$
declare cliente_id_type text;
declare empreendimento_id_type text;
begin
  select pg_catalog.format_type(a.atttypid, a.atttypmod) into cliente_id_type
  from pg_catalog.pg_attribute a where a.attrelid = 'public.clientes'::regclass and a.attname = 'id' and not a.attisdropped;
  select pg_catalog.format_type(a.atttypid, a.atttypmod) into empreendimento_id_type
  from pg_catalog.pg_attribute a where a.attrelid = 'public.empreendimentos'::regclass and a.attname = 'id' and not a.attisdropped;
  execute format('create table if not exists public.cliente_empreendimentos (
    cliente_id %s not null references public.clientes(id) on delete cascade,
    empreendimento_id %s not null references public.empreendimentos(id) on delete cascade,
    ordem smallint not null default 1 check (ordem between 1 and 4), motivo text,
    created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
    primary key (cliente_id, empreendimento_id))', cliente_id_type, empreendimento_id_type);
end $$;

create table if not exists public.afiliados (
  id uuid primary key default gen_random_uuid(), user_id uuid unique, nome text not null,
  email text not null unique, telefone text, ativo boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

create table if not exists public.regras_comissao_afiliado (
  id uuid primary key default gen_random_uuid(), tipo_produto text not null unique,
  percentual numeric(7,3) not null check (percentual between 0 and 100), ativo boolean not null default true,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

do $$
declare empreendimento_id_type text;
begin
  select pg_catalog.format_type(a.atttypid, a.atttypmod) into empreendimento_id_type
  from pg_catalog.pg_attribute a where a.attrelid = 'public.empreendimentos'::regclass and a.attname = 'id' and not a.attisdropped;
  execute format('create table if not exists public.afiliado_produtos (
    afiliado_id uuid not null references public.afiliados(id) on delete cascade,
    empreendimento_id %s not null references public.empreendimentos(id) on delete cascade,
    liberado boolean not null default false, confidencial boolean not null default false, instrucoes text,
    created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
    primary key (afiliado_id, empreendimento_id))', empreendimento_id_type);
end $$;
