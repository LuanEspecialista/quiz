-- Metadados editoriais e biblioteca pública de imagens para artigos indexáveis.
alter table public.blog_posts
  add column if not exists cidade text,
  add column if not exists seo_titulo text,
  add column if not exists seo_descricao text,
  add column if not exists palavras_chave text[] not null default '{}',
  add column if not exists empreendimento_id text references public.empreendimentos(id) on delete set null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('blog-public', 'blog-public', true, 10485760, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = true, file_size_limit = 10485760, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "blog_public_media_read" on storage.objects;
create policy "blog_public_media_read" on storage.objects for select
  using (bucket_id = 'blog-public');

drop policy if exists "blog_admin_media_manage" on storage.objects;
create policy "blog_admin_media_manage" on storage.objects for all
  using (
    bucket_id = 'blog-public' and exists (
      select 1 from public.perfis_usuario p
      where p.user_id = auth.uid() and p.ativo = true and p.perfil in ('admin','equipe')
    )
  ) with check (
    bucket_id = 'blog-public' and exists (
      select 1 from public.perfis_usuario p
      where p.user_id = auth.uid() and p.ativo = true and p.perfil in ('admin','equipe')
    )
  );
