-- Refinamento da vitrine: códigos permanecem internos e a entrega fica disponível para filtro público.
alter table public.oportunidades_publicas
  add column if not exists entrega_ano integer,
  add column if not exists rotulo_publico text,
  add column if not exists empreendimento_nome_interno text;

alter table public.playbook_leads
  add column if not exists empreendimento_nome_interno text;

create or replace function public.listar_oportunidades_publicas()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', o.id,
    'titulo', coalesce(nullif(o.rotulo_publico, ''), case
      when lower(coalesce(o.tipo_publico, '')) like '%studio%' then 'Studio com potencial patrimonial'
      when o.entrega_ano is not null then 'Entrada estratégica com entrega planejada'
      else 'Seleção patrimonial no litoral'
    end),
    'resumo', coalesce(o.resumo_publico, 'Uma oportunidade selecionada para uma conversa estratégica.'),
    'tipo', coalesce(o.tipo_publico, 'Residencial'),
    'cidade', o.cidade_publica,
    'entrega_ano', o.entrega_ano,
    'entrada', o.entrada_publica,
    'parcela', o.parcela_publica,
    'imagem', o.imagem_capa_url,
    'imagens', o.imagens_publicas,
    'valores_revisados_em', o.valores_revisados_em,
    'precisa_revisao', (o.proxima_revisao_em is null or o.proxima_revisao_em < current_date)
  ) order by o.ordem, o.created_at desc) filter (where o.id is not null), '[]'::jsonb)
  from public.oportunidades_publicas o
  where o.ativo_publico = true
    and o.valores_revisados_em is not null
    and (o.proxima_revisao_em is null or o.proxima_revisao_em >= current_date);
$$;

drop function if exists public.solicitar_interesse_oportunidade(uuid, text, text, text, text, text, boolean);
create or replace function public.solicitar_interesse_oportunidade(
  p_oportunidade_id uuid,
  p_nome text,
  p_telefone text,
  p_email text default null,
  p_objetivo text default null,
  p_faixa_entrada text default null,
  p_consentimento boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_oportunidade public.oportunidades_publicas%rowtype;
  v_lead_id uuid;
  v_nome text := nullif(trim(p_nome), '');
  v_telefone text := nullif(trim(p_telefone), '');
  v_email text := nullif(lower(trim(coalesce(p_email, ''))), '');
  v_objetivo text := nullif(trim(coalesce(p_objetivo, '')), '');
  v_faixa text := nullif(trim(coalesce(p_faixa_entrada, '')), '');
  v_notes text;
begin
  if v_nome is null or char_length(v_nome) < 2 or char_length(v_nome) > 120 then raise exception 'NOME_INVALIDO'; end if;
  if v_telefone is null or regexp_replace(v_telefone, '\D', '', 'g') !~ '^[0-9]{10,13}$' then raise exception 'TELEFONE_INVALIDO'; end if;
  if v_email is not null and v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'EMAIL_INVALIDO'; end if;
  if not coalesce(p_consentimento, false) then raise exception 'CONSENTIMENTO_OBRIGATORIO'; end if;

  select * into v_oportunidade
  from public.oportunidades_publicas
  where id = p_oportunidade_id and ativo_publico = true
    and valores_revisados_em is not null
    and (proxima_revisao_em is null or proxima_revisao_em >= current_date);
  if not found then raise exception 'OPORTUNIDADE_INDISPONIVEL'; end if;

  v_notes := concat_ws(E'\n',
    'Interesse captado no card público.',
    'Objetivo informado: ' || coalesce(v_objetivo, 'não informado'),
    'Faixa de entrada informada: ' || coalesce(v_faixa, 'não informada'),
    'Entrada exibida no card: ' || coalesce(to_char(v_oportunidade.entrada_publica, 'FM999G999G990D00'), 'sob consulta')
  );

  insert into public.playbook_leads (
    nome, telefone, email, origem, campanha, regiao, perfil, etapa, objetivo,
    consentimento_contato, notas, oportunidade_publica_id, codigo_oportunidade,
    empreendimento_nome_interno
  ) values (
    v_nome, v_telefone, v_email, 'site_oportunidade', v_oportunidade.codigo_publico,
    v_oportunidade.cidade_publica,
    case when v_objetivo ilike '%invest%' then 'investidor' else 'a_qualificar' end,
    'novo', v_objetivo, true, v_notes, v_oportunidade.id,
    v_oportunidade.codigo_publico, v_oportunidade.empreendimento_nome_interno
  ) returning id into v_lead_id;

  insert into public.alertas (tipo, titulo, descricao, prioridade, lido, data_alerta)
  values (
    'lead_site', 'Solicitação de ' || v_nome,
    v_nome || ' pediu uma conversa sobre uma oportunidade. Telefone: ' || v_telefone ||
      case when v_objetivo is not null then ' · Objetivo: ' || v_objetivo else '' end,
    'alta', false, now()
  );

  return v_lead_id;
end;
$$;
revoke all on function public.solicitar_interesse_oportunidade(uuid, text, text, text, text, text, boolean) from public;
grant execute on function public.solicitar_interesse_oportunidade(uuid, text, text, text, text, text, boolean) to anon, authenticated;

-- Publica os empreendimentos ativos que já têm imagem pública e entrada registrada.
insert into public.oportunidades_publicas (
  empreendimento_id, codigo_publico, titulo_publico, rotulo_publico, resumo_publico,
  tipo_publico, cidade_publica, entrega_ano, entrada_publica, imagem_capa_url,
  ativo_publico, ordem, valores_revisados_em, proxima_revisao_em, empreendimento_nome_interno
)
select
  e.id,
  'INT-' || upper(substr(md5(e.id), 1, 8)),
  'Oportunidade imobiliária',
  case
    when lower(coalesce(e.tipo, '')) like '%studio%' then 'Studio com potencial patrimonial'
    when coalesce(e.previsao_entrega, e.entrega_date) is not null then 'Entrada estratégica com entrega planejada'
    else 'Seleção patrimonial no litoral'
  end,
  'Uma oportunidade selecionada para morar, investir ou estudar uma estratégia patrimonial.',
  coalesce(nullif(e.tipo, ''), 'Residencial'),
  e.cidade,
  extract(year from coalesce(e.previsao_entrega, e.entrega_date))::integer,
  min(nullif(coalesce(u.entrada_sugerida, u.entrada_valor, 0), 0)) filter (where lower(coalesce(u.status,'')) in ('disponivel','disponível')),
  e.imagem_url,
  true,
  row_number() over (order by e.created_at desc)::integer,
  current_date,
  current_date + 30,
  e.nome
from public.empreendimentos e
left join public.unidades u on u.empreendimento_id = e.id
where e.ativo = true and e.imagem_url like 'http%'
group by e.id,e.tipo,e.cidade,e.previsao_entrega,e.entrega_date,e.imagem_url,e.created_at,e.nome
having min(nullif(coalesce(u.entrada_sugerida, u.entrada_valor, 0), 0)) filter (where lower(coalesce(u.status,'')) in ('disponivel','disponível')) is not null
on conflict (empreendimento_id) do update set
  tipo_publico = excluded.tipo_publico,
  cidade_publica = excluded.cidade_publica,
  entrega_ano = excluded.entrega_ano,
  entrada_publica = excluded.entrada_publica,
  imagem_capa_url = excluded.imagem_capa_url,
  rotulo_publico = excluded.rotulo_publico,
  empreendimento_nome_interno = excluded.empreendimento_nome_interno,
  valores_revisados_em = excluded.valores_revisados_em,
  proxima_revisao_em = excluded.proxima_revisao_em,
  updated_at = now();
