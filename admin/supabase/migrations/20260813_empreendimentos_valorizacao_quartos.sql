-- Campos comerciais do empreendimento usados nos cards e nas comparações.
-- 0 em quartos_disponiveis representa Studio; um empreendimento pode ter várias tipologias.
alter table public.empreendimentos
  add column if not exists valorizacao_aa numeric(7,3),
  add column if not exists quartos_disponiveis integer[] not null default '{}';

alter table public.empreendimentos
  drop constraint if exists empreendimentos_valorizacao_aa_check;
alter table public.empreendimentos
  add constraint empreendimentos_valorizacao_aa_check
  check (valorizacao_aa is null or valorizacao_aa between 0 and 100);

alter table public.unidades
  add column if not exists quartos integer;

alter table public.unidades
  drop constraint if exists unidades_quartos_check;
alter table public.unidades
  add constraint unidades_quartos_check check (quartos is null or quartos >= 0);

comment on column public.empreendimentos.valorizacao_aa is
  'Premissa editável de valorização anual do empreendimento; não é indicador oficial.';
comment on column public.empreendimentos.quartos_disponiveis is
  'Tipologias de dormitórios confirmadas; 0 representa Studio.';
comment on column public.unidades.quartos is
  'Quantidade confirmada de quartos; 0 somente quando a unidade for explicitamente Studio.';
