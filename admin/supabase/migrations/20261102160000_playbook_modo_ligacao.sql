-- Tarefa 2: dados estruturados da descoberta feita durante uma ligação.
-- Esta migration é aditiva e deve ser revisada antes de ser aplicada.

alter table public.playbook_leads
  add column if not exists descoberta jsonb not null default '{}'::jsonb;

alter table public.playbook_leads
  add column if not exists encerrada_em timestamptz;

comment on column public.playbook_leads.descoberta is
  'Critérios coletados no Modo Ligação: finalidade, faixa, pagamento, prazo, cidade, perfil, decisão, preferências e temperatura.';

comment on column public.playbook_leads.encerrada_em is
  'Momento em que a ligação foi encerrada no Modo Ligação.';

create index if not exists playbook_leads_descoberta_gin_idx
  on public.playbook_leads using gin (descoberta);

-- As políticas RLS existentes permanecem válidas: a alteração não abre novas operações.
