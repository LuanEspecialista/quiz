-- Metadados de mídia: cada imagem pode ser identificada e liberada por público.
-- Execute esta migração no Supabase antes de usar o novo gerenciador de galeria.
alter table public.empreendimento_imagens
  add column if not exists titulo text,
  add column if not exists storage_path text,
  add column if not exists categoria text not null default 'outro',
  add column if not exists tipologia_referencia text,
  add column if not exists visivel_cliente boolean not null default false,
  add column if not exists visivel_afiliado boolean not null default false;

alter table public.empreendimento_imagens
  drop constraint if exists empreendimento_imagens_categoria_check;

alter table public.empreendimento_imagens
  add constraint empreendimento_imagens_categoria_check
  check (categoria in ('planta', 'fachada', 'lazer', 'localizacao', 'decorado', 'outro'));

create index if not exists empreendimento_imagens_publicacao_idx
  on public.empreendimento_imagens (empreendimento_id, visivel_cliente, visivel_afiliado);

-- Os portais nunca recebem a capa global por padrão. Eles recebem somente a
-- primeira mídia que o administrador liberou explicitamente para o seu público.
create or replace function public.portal_cliente()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'cliente', jsonb_build_object(
      'nome', c.nome, 'objetivo', c.objetivo, 'modo', c.modo_apresentacao,
      'horizonte', c.horizonte_investimento, 'cidade', c.cidade
    ),
    'oportunidades', coalesce(jsonb_agg(jsonb_build_object(
      'id', e.id, 'nome', e.nome, 'cidade', e.cidade, 'bairro', e.bairro,
      'status', e.status,
      'imagem_url', case when ce.exibir_imagens then (select ei.url from public.empreendimento_imagens ei where ei.empreendimento_id = e.id and ei.visivel_cliente order by ei.ordem nulls last, ei.created_at desc limit 1) else null end,
      'descricao', case when ce.exibir_descricao then e.descricao else null end,
      'preco', case when ce.exibir_preco then e.faixa_preco else null end,
      'area_minima', case when ce.exibir_especificacoes then e.area_minima else null end,
      'area_maxima', case when ce.exibir_especificacoes then e.area_maxima else null end,
      'caracteristicas', case when ce.exibir_especificacoes then e.caracteristicas else null end,
      'mensagem', ce.mensagem_personalizada,
      'exibir_investimento', ce.exibir_investimento, 'exibir_fluxo', ce.exibir_fluxo
    ) order by ce.ordem) filter (where e.id is not null), '[]'::jsonb)
  )
  from public.clientes c
  left join public.cliente_empreendimentos ce on ce.cliente_id = c.id and ce.visivel
  left join public.empreendimentos e on e.id = ce.empreendimento_id
  where c.user_id = auth.uid() and c.acesso_portal
  group by c.id, c.nome, c.objetivo, c.modo_apresentacao, c.horizonte_investimento, c.cidade;
$$;

create or replace function public.catalogo_afiliado()
returns table(
  id text, nome text, cidade text, bairro text, status text, descricao text, imagem_url text,
  tipo text, faixa_preco numeric, area_minima numeric, area_maxima numeric,
  entrada_afiliado numeric, parcela_afiliado numeric, quantidade_elevadores integer,
  quantidade_areas_lazer integer, caracteristicas jsonb, percentual_comissao numeric,
  confidencial boolean, instrucoes text
) language sql stable security definer set search_path = public as $$
  select e.id::text, e.nome, e.cidade, e.bairro, e.status,
    case when ap.exibir_descricao then e.descricao else null end,
    case when ap.exibir_imagens then (select ei.url from public.empreendimento_imagens ei where ei.empreendimento_id = e.id and ei.visivel_afiliado order by ei.ordem nulls last, ei.created_at desc limit 1) else null end,
    coalesce(e.categoria_afiliado, e.tipo),
    case when ap.exibir_preco then e.faixa_preco else null end,
    case when ap.exibir_especificacoes then e.area_minima else null end,
    case when ap.exibir_especificacoes then e.area_maxima else null end,
    case when ap.exibir_entrada_parcelas then e.entrada_afiliado else null end,
    case when ap.exibir_entrada_parcelas then e.parcela_afiliado else null end,
    case when ap.exibir_especificacoes then e.quantidade_elevadores else null end,
    case when ap.exibir_especificacoes then e.quantidade_areas_lazer else null end,
    case when ap.exibir_especificacoes then e.caracteristicas else null end,
    case when ap.exibir_comissao then coalesce(rc.percentual, 0) else null end,
    ap.confidencial, ap.instrucoes
  from public.afiliados a
  join public.afiliado_produtos ap on ap.afiliado_id = a.id and ap.liberado
  join public.empreendimentos e on e.id = ap.empreendimento_id and e.ativo
  left join public.regras_comissao_afiliado rc on lower(rc.tipo_produto) = lower(coalesce(e.categoria_afiliado, e.tipo)) and rc.ativo
  where a.user_id = auth.uid() and a.ativo;
$$;
