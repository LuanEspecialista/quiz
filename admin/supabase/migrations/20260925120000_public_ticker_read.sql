-- O site público precisa refletir exatamente os indicadores que o administrador
-- deixou ativos no ticker, sem expor qualquer permissão de escrita.
drop policy if exists "indicadores_ticker_public_read" on public.indicadores_ticker_config;
create policy "indicadores_ticker_public_read"
  on public.indicadores_ticker_config
  for select
  to anon, authenticated
  using (true);
