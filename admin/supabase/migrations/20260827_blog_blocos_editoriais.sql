-- Blocos opcionais para que cada post tenha narrativa editorial, não apenas texto corrido.
alter table public.blog_posts
  add column if not exists blocos jsonb not null default '{}'::jsonb;

comment on column public.blog_posts.blocos is
  'Blocos editoriais opcionais: destaque, prova, curiosidade e chamada para ação.';
