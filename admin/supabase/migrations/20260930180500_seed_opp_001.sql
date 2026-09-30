-- Corrige a publicação inicial do OPP-001 usando o ID real do empreendimento Moov.
insert into public.oportunidades_publicas (
  empreendimento_id, codigo_publico, titulo_publico, resumo_publico, tipo_publico,
  cidade_publica, entrada_publica, imagem_capa_url, ativo_publico, ordem,
  valores_revisados_em, proxima_revisao_em
)
select
  e.id,
  'OPP-001',
  'Oportunidade em análise',
  'Uma oportunidade para morar, investir ou estudar uma estratégia patrimonial.',
  coalesce(nullif(e.tipo, ''), 'Residencial'),
  e.cidade,
  73200.00,
  case when e.imagem_url like 'http%' then e.imagem_url else null end,
  true,
  1,
  current_date,
  current_date + 30
from public.empreendimentos e
where e.id = '2f8811f6-4f09-4f0f-ba63-3bd693a60628'
on conflict (empreendimento_id) do update set
  codigo_publico = excluded.codigo_publico,
  entrada_publica = excluded.entrada_publica,
  imagem_capa_url = excluded.imagem_capa_url,
  ativo_publico = excluded.ativo_publico,
  valores_revisados_em = excluded.valores_revisados_em,
  proxima_revisao_em = excluded.proxima_revisao_em,
  updated_at = now();
