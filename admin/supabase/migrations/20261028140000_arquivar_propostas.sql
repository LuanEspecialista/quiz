alter table public.cliente_propostas
  add column if not exists arquivada_em timestamptz;

create index if not exists cliente_propostas_arquivada_idx
  on public.cliente_propostas (arquivada_em, created_at desc);
