-- Camada comercial genérica. Não altera fluxos existentes nem cria condições presumidas.
create table if not exists public.planos_pagamento (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (length(trim(nome)) >= 2),
  tipo text not null default 'personalizado' check (tipo in ('direto','financiamento','misto','avista','personalizado')),
  construtora_id text references public.construtoras(id) on delete cascade,
  empreendimento_id text references public.empreendimentos(id) on delete cascade,
  unidade_id uuid references public.unidades(id) on delete cascade,
  componentes jsonb not null default '[]'::jsonb check (jsonb_typeof(componentes) = 'array'),
  regras_correcao jsonb not null default '{}'::jsonb check (jsonb_typeof(regras_correcao) = 'object'),
  status text not null default 'rascunho' check (status in ('rascunho','confirmado','inativo')),
  padrao boolean not null default false,
  ativo boolean not null default true,
  vigencia_inicio date,
  vigencia_fim date,
  observacoes text,
  criado_por uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint planos_pagamento_um_escopo check (
    num_nonnulls(construtora_id, empreendimento_id, unidade_id) = 1
  ),
  constraint planos_pagamento_vigencia_valida check (
    vigencia_fim is null or vigencia_inicio is null or vigencia_fim >= vigencia_inicio
  )
);

create unique index if not exists planos_pagamento_padrao_construtora
  on public.planos_pagamento(construtora_id) where padrao and ativo and construtora_id is not null;
create unique index if not exists planos_pagamento_padrao_empreendimento
  on public.planos_pagamento(empreendimento_id) where padrao and ativo and empreendimento_id is not null;
create unique index if not exists planos_pagamento_padrao_unidade
  on public.planos_pagamento(unidade_id) where padrao and ativo and unidade_id is not null;
create index if not exists planos_pagamento_empreendimento_idx on public.planos_pagamento(empreendimento_id);
create index if not exists planos_pagamento_unidade_idx on public.planos_pagamento(unidade_id);

create table if not exists public.planos_pagamento_historico (
  id bigint generated always as identity primary key,
  plano_id uuid not null,
  versao integer not null,
  snapshot jsonb not null,
  alterado_por uuid references auth.users(id) on delete set null default auth.uid(),
  alterado_em timestamptz not null default now(),
  unique (plano_id, versao)
);

create or replace function public.registrar_historico_plano_pagamento()
returns trigger language plpgsql security definer set search_path = '' as $$
declare proxima_versao integer;
begin
  select coalesce(max(versao), 0) + 1 into proxima_versao
  from public.planos_pagamento_historico where plano_id = old.id;
  insert into public.planos_pagamento_historico(plano_id, versao, snapshot, alterado_por)
  values (old.id, proxima_versao, to_jsonb(old), auth.uid());
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists planos_pagamento_historico_trigger on public.planos_pagamento;
create trigger planos_pagamento_historico_trigger before update on public.planos_pagamento
for each row execute function public.registrar_historico_plano_pagamento();

create table if not exists public.plantas_unidades (
  id uuid primary key default gen_random_uuid(),
  empreendimento_id text not null references public.empreendimentos(id) on delete cascade,
  unidade_id uuid references public.unidades(id) on delete cascade,
  tipologia text,
  titulo text not null,
  tipo text not null default 'humanizada' check (tipo in ('humanizada','tecnica','posicao','outra')),
  storage_path text not null unique,
  principal boolean not null default false,
  ordem integer not null default 0,
  criado_por uuid references auth.users(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint plantas_unidades_destino check (unidade_id is not null or nullif(trim(tipologia), '') is not null)
);

create index if not exists plantas_unidades_unidade_idx on public.plantas_unidades(unidade_id);
create index if not exists plantas_unidades_tipologia_idx on public.plantas_unidades(empreendimento_id, lower(tipologia));
create unique index if not exists plantas_unidades_principal_unidade
  on public.plantas_unidades(unidade_id) where principal and unidade_id is not null;

alter table public.planos_pagamento enable row level security;
alter table public.planos_pagamento_historico enable row level security;
alter table public.plantas_unidades enable row level security;

drop policy if exists "planos_pagamento_admin" on public.planos_pagamento;
create policy "planos_pagamento_admin" on public.planos_pagamento for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "planos_pagamento_historico_admin" on public.planos_pagamento_historico;
create policy "planos_pagamento_historico_admin" on public.planos_pagamento_historico for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));
drop policy if exists "plantas_unidades_admin" on public.plantas_unidades;
create policy "plantas_unidades_admin" on public.plantas_unidades for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

grant select, insert, update, delete on public.planos_pagamento to authenticated;
grant select, insert, update, delete on public.planos_pagamento_historico to authenticated;
grant usage, select on sequence public.planos_pagamento_historico_id_seq to authenticated;
grant select, insert, update, delete on public.plantas_unidades to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('plantas-unidades','plantas-unidades',false,20971520,array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "plantas_unidades_storage_select" on storage.objects;
create policy "plantas_unidades_storage_select" on storage.objects for select to authenticated
using (bucket_id='plantas-unidades' and (select public.is_admin()));
drop policy if exists "plantas_unidades_storage_insert" on storage.objects;
create policy "plantas_unidades_storage_insert" on storage.objects for insert to authenticated
with check (bucket_id='plantas-unidades' and (select public.is_admin()));
drop policy if exists "plantas_unidades_storage_update" on storage.objects;
create policy "plantas_unidades_storage_update" on storage.objects for update to authenticated
using (bucket_id='plantas-unidades' and (select public.is_admin()))
with check (bucket_id='plantas-unidades' and (select public.is_admin()));
drop policy if exists "plantas_unidades_storage_delete" on storage.objects;
create policy "plantas_unidades_storage_delete" on storage.objects for delete to authenticated
using (bucket_id='plantas-unidades' and (select public.is_admin()));

-- Corrige permissões excessivas sem retirar a leitura pública necessária aos indicadores.
drop policy if exists "clientes autenticados" on public.clientes;
drop policy if exists "clientes admin" on public.clientes;
create policy "clientes admin" on public.clientes for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Permitir alteracao de indicadores" on public.indicadores;
drop policy if exists "Permitir alteracao total indicadores" on public.indicadores;
drop policy if exists "Permitir leitura publica de indicadores" on public.indicadores;
drop policy if exists "Permitir leitura pública de indicadores" on public.indicadores;
drop policy if exists "Permitir leitura total indicadores" on public.indicadores;
create policy "indicadores_leitura_publica" on public.indicadores for select to anon, authenticated using (true);
create policy "indicadores_admin" on public.indicadores for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

drop policy if exists "Permitir alteracao total historico" on public.indicadores_historico;
drop policy if exists "Permitir leitura total historico" on public.indicadores_historico;
create policy "indicadores_historico_leitura_publica" on public.indicadores_historico for select to anon, authenticated using (true);
create policy "indicadores_historico_admin" on public.indicadores_historico for all to authenticated
using ((select public.is_admin())) with check ((select public.is_admin()));

-- Mantém o bucket atual e somente amplia o limite solicitado.
update storage.buckets set file_size_limit=262144000 where id='pdfs';

-- O painel real é /painel/. Não toca outras páginas cadastradas.
update public.site_paginas set caminho='/painel/' where caminho='/admin/';

-- O trigger é interno e não deve ficar exposto como RPC.
revoke all on function public.registrar_historico_plano_pagamento() from public, anon, authenticated;

-- Uma única política de leitura por tabela; operações de escrita seguem restritas ao admin.
drop policy if exists "indicadores_admin" on public.indicadores;
drop policy if exists "indicadores_leitura_publica" on public.indicadores;
create policy "indicadores_leitura_publica" on public.indicadores for select to anon, authenticated using (true);
create policy "indicadores_insert_admin" on public.indicadores for insert to authenticated with check ((select public.is_admin()));
create policy "indicadores_update_admin" on public.indicadores for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "indicadores_delete_admin" on public.indicadores for delete to authenticated using ((select public.is_admin()));

drop policy if exists "indicadores_historico_admin" on public.indicadores_historico;
drop policy if exists "indicadores_historico_leitura_publica" on public.indicadores_historico;
create policy "indicadores_historico_leitura_publica" on public.indicadores_historico for select to anon, authenticated using (true);
create policy "indicadores_historico_insert_admin" on public.indicadores_historico for insert to authenticated with check ((select public.is_admin()));
create policy "indicadores_historico_update_admin" on public.indicadores_historico for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "indicadores_historico_delete_admin" on public.indicadores_historico for delete to authenticated using ((select public.is_admin()));

create index if not exists planos_pagamento_construtora_idx on public.planos_pagamento(construtora_id);
create index if not exists planos_pagamento_criado_por_idx on public.planos_pagamento(criado_por);
create index if not exists planos_pagamento_historico_alterado_por_idx on public.planos_pagamento_historico(alterado_por);
create index if not exists plantas_unidades_criado_por_idx on public.plantas_unidades(criado_por);
