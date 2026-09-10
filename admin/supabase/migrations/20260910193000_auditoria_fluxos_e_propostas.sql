-- Trilho imutável das alterações comerciais críticas.
-- O conteúdo permanece restrito a administradores pelas políticas abaixo.
create table if not exists public.auditoria_eventos (
  id bigint generated always as identity primary key,
  tabela text not null,
  registro_id text,
  acao text not null check (acao in ('INSERT', 'UPDATE', 'DELETE')),
  dados_anteriores jsonb,
  dados_novos jsonb,
  usuario_id uuid default auth.uid(),
  criado_em timestamptz not null default now()
);

create index if not exists auditoria_eventos_tabela_registro_idx
  on public.auditoria_eventos (tabela, registro_id, criado_em desc);
create index if not exists auditoria_eventos_usuario_idx
  on public.auditoria_eventos (usuario_id, criado_em desc);

alter table public.auditoria_eventos enable row level security;

drop policy if exists "Administradores consultam auditoria" on public.auditoria_eventos;
create policy "Administradores consultam auditoria"
  on public.auditoria_eventos
  for select
  to authenticated
  using ((select public.is_admin()));

revoke all on table public.auditoria_eventos from anon;
revoke insert, update, delete on table public.auditoria_eventos from authenticated;
grant select on table public.auditoria_eventos to authenticated;

create or replace function public.registrar_auditoria_comercial()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  anterior jsonb;
  novo jsonb;
  identificador text;
begin
  anterior := case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end;
  novo := case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end;
  identificador := coalesce(novo ->> 'id', anterior ->> 'id');

  if tg_op = 'UPDATE' and anterior = novo then
    return new;
  end if;

  insert into public.auditoria_eventos (
    tabela, registro_id, acao, dados_anteriores, dados_novos, usuario_id
  ) values (
    tg_table_name, identificador, tg_op, anterior, novo, auth.uid()
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

revoke all on function public.registrar_auditoria_comercial() from public, anon, authenticated;

drop trigger if exists auditar_unidades on public.unidades;
create trigger auditar_unidades
after insert or update or delete on public.unidades
for each row execute function public.registrar_auditoria_comercial();

drop trigger if exists auditar_fluxo_simulacoes on public.fluxo_simulacoes;
create trigger auditar_fluxo_simulacoes
after insert or update or delete on public.fluxo_simulacoes
for each row execute function public.registrar_auditoria_comercial();

drop trigger if exists auditar_cliente_propostas on public.cliente_propostas;
create trigger auditar_cliente_propostas
after insert or update or delete on public.cliente_propostas
for each row execute function public.registrar_auditoria_comercial();

comment on table public.auditoria_eventos is
  'Histórico administrativo de estoque, simulações e propostas; não representa aprovação comercial.';
