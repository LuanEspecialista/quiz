-- Biblioteca editorial do painel. Conteúdo público só é entregue quando publicado.
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  titulo text not null,
  slug text not null unique,
  resumo text,
  conteudo text,
  categoria text not null default 'Mercado imobiliário',
  layout text not null default 'artigo',
  imagem_capa_url text,
  imagens jsonb not null default '[]'::jsonb,
  cta_rotulo text,
  cta_url text,
  status text not null default 'rascunho' check (status in ('rascunho','revisao','publicado','arquivado')),
  publicado_em timestamptz,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  criado_por uuid references auth.users(id) on delete set null
);

create index if not exists blog_posts_status_publicado_em_idx on public.blog_posts(status, publicado_em desc);
create index if not exists blog_posts_categoria_idx on public.blog_posts(categoria);

alter table public.blog_posts enable row level security;

revoke all on public.blog_posts from anon, authenticated;
grant select on public.blog_posts to anon;
grant select, insert, update, delete on public.blog_posts to authenticated;

drop policy if exists "blog_public_reads_published" on public.blog_posts;
create policy "blog_public_reads_published" on public.blog_posts
  for select using (status = 'publicado' and publicado_em <= now());

drop policy if exists "blog_admin_manage" on public.blog_posts;
create policy "blog_admin_manage" on public.blog_posts
  for all using (
    exists (
      select 1 from public.perfis_usuario p
      where p.user_id = auth.uid() and p.ativo = true and p.perfil in ('admin','equipe')
    )
  ) with check (
    exists (
      select 1 from public.perfis_usuario p
      where p.user_id = auth.uid() and p.ativo = true and p.perfil in ('admin','equipe')
    )
  );
