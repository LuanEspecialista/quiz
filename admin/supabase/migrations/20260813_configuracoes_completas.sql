create table if not exists public.configuracoes (
  id integer primary key default 1 check (id = 1),
  taxa_administracao_padrao numeric(8,4) not null default 15 check (taxa_administracao_padrao between 0 and 100),
  fundo_reserva_padrao numeric(8,4) not null default 1 check (fundo_reserva_padrao between 0 and 100),
  taxa_juros_financiamento_anual numeric(8,4) not null default 11.5 check (taxa_juros_financiamento_anual between 0 and 100),
  incc_projetado_anual numeric(8,4) not null default 5.5 check (incc_projetado_anual between 0 and 100),
  valor_m2_referencia numeric(14,2) not null default 8500 check (valor_m2_referencia >= 0),
  rentabilidade_aluguel_anual numeric(8,4) not null default .5 check (rentabilidade_aluguel_anual between 0 and 100),
  moeda_padrao text not null default 'BRL' check (moeda_padrao in ('BRL','USD')),
  casas_decimais_taxas integer not null default 2 check (casas_decimais_taxas between 0 and 6),
  updated_at timestamptz not null default now()
);
insert into public.configuracoes(id) values(1) on conflict(id) do nothing;
alter table public.configuracoes enable row level security;
drop policy if exists "configuracoes leitura autenticada" on public.configuracoes;
create policy "configuracoes leitura autenticada" on public.configuracoes for select to authenticated using(true);
drop policy if exists "configuracoes admin" on public.configuracoes;
create policy "configuracoes admin" on public.configuracoes for all to authenticated using(public.is_admin()) with check(public.is_admin());

create extension if not exists pgcrypto;
alter table public.construtoras alter column id set default gen_random_uuid();
