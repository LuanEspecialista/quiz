alter table public.indicadores
  add column if not exists tributacao jsonb not null default '{"tipo":"isento"}'::jsonb;

alter table public.indicadores drop constraint if exists indicadores_tributacao_object_check;
alter table public.indicadores add constraint indicadores_tributacao_object_check
  check (jsonb_typeof(tributacao) = 'object');

comment on column public.indicadores.tributacao is
  'Regra configurável para projetar rendimento líquido: isento, regressivo por prazo ou alíquota fixa.';
