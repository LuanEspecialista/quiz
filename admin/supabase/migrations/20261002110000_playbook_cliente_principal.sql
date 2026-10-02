-- O cadastro oficial fica em public.clientes.
-- O Playbook conserva apenas o histórico de interação, ligado ao cliente.
alter table public.playbook_interacoes
  add column if not exists cliente_id integer references public.clientes(id) on delete cascade;

alter table public.playbook_interacoes
  alter column lead_id drop not null;

create index if not exists playbook_interacoes_cliente_idx
  on public.playbook_interacoes(cliente_id, criada_em desc);

comment on column public.playbook_interacoes.cliente_id is
  'Cliente oficial da base principal; o Playbook não cria uma segunda ficha comercial.';
