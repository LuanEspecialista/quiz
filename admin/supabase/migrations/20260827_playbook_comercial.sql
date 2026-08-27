create table if not exists public.playbook_leads (
  id uuid primary key default gen_random_uuid(),
  -- Bases legadas usam id de cliente inteiro ou UUID; referência textual evita
  -- uma chave estrangeira inválida sem alterar ou perder dados existentes.
  cliente_id text,
  nome text not null,
  telefone text,
  email text,
  origem text not null default 'outro',
  campanha text,
  regiao text,
  perfil text not null default 'a_qualificar',
  etapa text not null default 'novo',
  ticket_estimado numeric(14,2),
  prazo text,
  objetivo text,
  objecao_atual text,
  proxima_acao text,
  proximo_contato timestamptz,
  consentimento_contato boolean not null default false,
  notas text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create table if not exists public.playbook_interacoes (
  id uuid primary key default gen_random_uuid(), lead_id uuid not null references public.playbook_leads(id) on delete cascade,
  canal text not null default 'whatsapp', resumo text not null, proxima_acao text, criada_em timestamptz not null default now(), criado_por uuid references auth.users(id) on delete set null
);
alter table public.playbook_leads enable row level security;
alter table public.playbook_interacoes enable row level security;
drop policy if exists "playbook admin" on public.playbook_leads;
create policy "playbook admin" on public.playbook_leads for all to authenticated using(public.is_admin()) with check(public.is_admin());
drop policy if exists "playbook interacoes admin" on public.playbook_interacoes;
create policy "playbook interacoes admin" on public.playbook_interacoes for all to authenticated using(public.is_admin()) with check(public.is_admin());
create index if not exists playbook_leads_etapa_idx on public.playbook_leads(etapa, proximo_contato);
create index if not exists playbook_interacoes_lead_idx on public.playbook_interacoes(lead_id, criada_em desc);
