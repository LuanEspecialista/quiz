alter table public.unidades
  drop constraint if exists unidades_status_check;

alter table public.unidades
  add constraint unidades_status_check check (
    lower(status) in (
      'disponivel',
      'disponível',
      'indisponivel',
      'indisponível',
      'reservada',
      'vendida',
      'bloqueada',
      'proposta',
      'permutada',
      'fora de tabela'
    )
  );
