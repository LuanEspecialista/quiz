create table if not exists public.blog_media_collections (
  id uuid primary key default gen_random_uuid(),
  nome text not null unique check (char_length(trim(nome)) between 2 and 100),
  descricao text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid not null default auth.uid()
);

create table if not exists public.blog_media_items (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid not null references public.blog_media_collections(id) on delete cascade,
  storage_path text not null unique,
  url_publica text not null,
  titulo text not null check (char_length(trim(titulo)) between 2 and 160),
  texto_alternativo text not null check (char_length(trim(texto_alternativo)) between 2 and 300),
  legenda text,
  criado_em timestamptz not null default now(),
  criado_por uuid not null default auth.uid()
);

create index if not exists blog_media_items_collection_created_idx
  on public.blog_media_items (collection_id, criado_em desc);

alter table public.blog_media_collections enable row level security;
alter table public.blog_media_items enable row level security;

create policy blog_media_collections_admin_only on public.blog_media_collections
  for all to authenticated
  using (exists (select 1 from public.perfis_usuario p where p.user_id = (select auth.uid()) and p.ativo = true and p.perfil = 'admin'))
  with check (exists (select 1 from public.perfis_usuario p where p.user_id = (select auth.uid()) and p.ativo = true and p.perfil = 'admin'));

create policy blog_media_items_admin_only on public.blog_media_items
  for all to authenticated
  using (exists (select 1 from public.perfis_usuario p where p.user_id = (select auth.uid()) and p.ativo = true and p.perfil = 'admin'))
  with check (exists (select 1 from public.perfis_usuario p where p.user_id = (select auth.uid()) and p.ativo = true and p.perfil = 'admin'));

create policy blog_media_admin_uploads on storage.objects
  for insert to authenticated
  with check (bucket_id = 'blog-public' and name like 'biblioteca/%' and exists (select 1 from public.perfis_usuario p where p.user_id = (select auth.uid()) and p.ativo = true and p.perfil = 'admin'));

create policy blog_media_admin_updates on storage.objects
  for update to authenticated
  using (bucket_id = 'blog-public' and name like 'biblioteca/%' and exists (select 1 from public.perfis_usuario p where p.user_id = (select auth.uid()) and p.ativo = true and p.perfil = 'admin'))
  with check (bucket_id = 'blog-public' and name like 'biblioteca/%' and exists (select 1 from public.perfis_usuario p where p.user_id = (select auth.uid()) and p.ativo = true and p.perfil = 'admin'));

create policy blog_media_admin_deletes on storage.objects
  for delete to authenticated
  using (bucket_id = 'blog-public' and name like 'biblioteca/%' and exists (select 1 from public.perfis_usuario p where p.user_id = (select auth.uid()) and p.ativo = true and p.perfil = 'admin'));

