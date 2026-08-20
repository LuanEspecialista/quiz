-- Adapta a tabela existente. Não cria uma segunda base de empreendimentos.
alter table public.apresentacoes
  add column if not exists ativo boolean not null default false,
  add column if not exists storage_path text,
  add column if not exists updated_at timestamptz not null default now();

-- Usa exatamente o tipo real de empreendimentos.id (text, integer, uuid etc.).
do $$
declare id_type text; current_type text;
begin
  select pg_catalog.format_type(a.atttypid,a.atttypmod) into id_type
  from pg_catalog.pg_attribute a where a.attrelid='public.empreendimentos'::regclass and a.attname='id' and not a.attisdropped;
  select pg_catalog.format_type(a.atttypid,a.atttypmod) into current_type
  from pg_catalog.pg_attribute a where a.attrelid='public.apresentacoes'::regclass and a.attname='empreendimento_id' and not a.attisdropped;
  if current_type is null then
    execute format('alter table public.apresentacoes add column empreendimento_id %s',id_type);
  elsif current_type <> id_type then
    execute 'alter table public.apresentacoes drop constraint if exists apresentacoes_empreendimento_id_fkey';
    execute format('alter table public.apresentacoes alter column empreendimento_id type %s using empreendimento_id::%s',id_type,id_type);
  end if;
end $$;

-- A chave dos empreendimentos existentes é textual (ex.: "zaya").
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'apresentacoes_empreendimento_id_fkey'
      and conrelid = 'public.apresentacoes'::regclass
  ) then
    alter table public.apresentacoes
      add constraint apresentacoes_empreendimento_id_fkey
      foreign key (empreendimento_id)
      references public.empreendimentos(id)
      on update cascade
      on delete cascade;
  end if;
end $$;

create unique index if not exists apresentacoes_empreendimento_id_key
  on public.apresentacoes (empreendimento_id);

-- Preserva as apresentações já referenciadas na tabela de empreendimentos.
insert into public.apresentacoes (empreendimento_id, ativo, pdf_url, storage_path, updated_at)
select
  e.id,
  true,
  e.pdf_apresentacao_url,
  null,
  coalesce(e.updated_at, now())
from public.empreendimentos e
where nullif(trim(e.pdf_apresentacao_url), '') is not null
on conflict (empreendimento_id)
do update set
  pdf_url = excluded.pdf_url,
  ativo = excluded.ativo,
  updated_at = excluded.updated_at;

alter table public.apresentacoes enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'apresentacoes'
      and policyname = 'Usuários autenticados gerenciam apresentações'
  ) then
    create policy "Usuários autenticados gerenciam apresentações"
      on public.apresentacoes
      for all
      to authenticated
      using (true)
      with check (true);
  end if;
end $$;

grant select, insert, update, delete on public.apresentacoes to authenticated;

comment on column public.apresentacoes.empreendimento_id is
  'Relação única com public.empreendimentos.id; não duplicar nome ou cidade nesta tabela.';
comment on column public.apresentacoes.storage_path is
  'Caminho relativo dentro do bucket pdfs, sob a pasta apresentacoes.';
