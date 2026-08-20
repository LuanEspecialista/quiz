-- Preferências objetivas usadas pela curadoria e comparação de unidades.
-- Não cria FKs e, portanto, preserva IDs legados de qualquer tipo.
alter table if exists public.clientes
  add column if not exists quartos_desejados integer check (quartos_desejados is null or quartos_desejados >= 0),
  add column if not exists suites_desejadas integer check (suites_desejadas is null or suites_desejadas >= 0);

comment on column public.clientes.quartos_desejados is 'Quantidade total de dormitórios desejada pelo cliente.';
comment on column public.clientes.suites_desejadas is 'Quantidade de suítes desejada pelo cliente.';
notify pgrst, 'reload schema';
