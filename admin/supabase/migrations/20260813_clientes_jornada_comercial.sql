create extension if not exists pgcrypto;

create table if not exists public.clientes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  telefone text,
  email text,
  cidade text,
  origem text,
  objetivo text,
  faixa_investimento numeric(14,2),
  entrada_disponivel numeric(14,2),
  capacidade_mensal numeric(14,2),
  aceita_baloes boolean,
  balao_maximo numeric(14,2),
  aceita_financiamento boolean,
  status text not null default 'novo',
  proximo_contato date,
  observacoes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Compatibilidade com bancos que já possuem uma versão anterior de clientes.
alter table public.clientes
  add column if not exists nome text,
  add column if not exists telefone text,
  add column if not exists email text,
  add column if not exists cidade text,
  add column if not exists origem text,
  add column if not exists objetivo text,
  add column if not exists faixa_investimento numeric(14,2),
  add column if not exists entrada_disponivel numeric(14,2),
  add column if not exists capacidade_mensal numeric(14,2),
  add column if not exists aceita_baloes boolean,
  add column if not exists balao_maximo numeric(14,2),
  add column if not exists aceita_financiamento boolean,
  add column if not exists status text default 'novo',
  add column if not exists proximo_contato date,
  add column if not exists observacoes text,
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

update public.clientes set status = 'novo' where status is null;
alter table public.clientes alter column status set default 'novo';

alter table public.clientes enable row level security;
drop policy if exists "clientes autenticados" on public.clientes;
create policy "clientes autenticados" on public.clientes for all to authenticated using (true) with check (true);

create index if not exists clientes_status_idx on public.clientes(status);

-- O módulo de clientes também pode ser instalado antes do módulo de simulações.
-- Nesse caso, o vínculo será criado posteriormente quando fluxo_simulacoes existir.
do $$
declare cliente_id_type text;
begin
  if to_regclass('public.fluxo_simulacoes') is not null then
    select pg_catalog.format_type(a.atttypid, a.atttypmod) into cliente_id_type
    from pg_catalog.pg_attribute a
    where a.attrelid = 'public.clientes'::regclass and a.attname = 'id' and not a.attisdropped;
    execute format('alter table public.fluxo_simulacoes add column if not exists cliente_id %s references public.clientes(id) on delete set null', cliente_id_type);

    create index if not exists fluxo_simulacoes_cliente_idx
      on public.fluxo_simulacoes(cliente_id);
  end if;
end
$$;
