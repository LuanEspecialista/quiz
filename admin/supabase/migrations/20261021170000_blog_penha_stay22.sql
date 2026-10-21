update public.blog_posts as post
set blocos = jsonb_set(
  coalesce(post.blocos, '{}'::jsonb),
  '{stay22}',
  coalesce(post.blocos -> 'stay22', '{}'::jsonb) || jsonb_build_object(
    'ativo', true,
    'url', 'https://www.stay22.com/embed/6acfe25a89efbbe3a8e2fbae',
    'rotulo', 'PRAIAS DE PENHA',
    'titulo', 'Imagine desfrutar das praias e de toda a riqueza de Penha.',
    'texto', 'Depois de escolher o trecho que combina com o seu roteiro, confira opções de hospedagem para aproveitar a cidade. Compare localização, datas, valores e disponibilidade diretamente no mapa abaixo.',
    'venue', 'Praias de Penha'
  ),
  true
),
atualizado_em = now()
where post.id = (
  select id from public.blog_posts
   where slug = 'praias-de-penha-sc-guia-morar-curtir-investir'
     and status = 'publicado'
   limit 1
);
