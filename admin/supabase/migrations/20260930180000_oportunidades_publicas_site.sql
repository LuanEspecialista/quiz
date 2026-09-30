-- Oportunidades públicas: mantém o empreendimento interno protegido por trás de um código público.
create table if not exists public.oportunidades_publicas (
  id uuid primary key default gen_random_uuid(),
  empreendimento_id text not null references public.empreendimentos(id) on delete cascade,
  codigo_publico text not null unique,
  titulo_publico text not null default 'Oportunidade imobiliária',
  resumo_publico text,
  tipo_publico text,
  cidade_publica text,
  entrada_publica numeric(14,2),
  parcela_publica numeric(14,2),
  imagem_capa_url text,
  imagens_publicas text[] not null default '{}',
  ativo_publico boolean not null default false,
  ordem integer not null default 0,
  valores_revisados_em date,
  proxima_revisao_em date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(empreendimento_id)
);

alter table public.playbook_leads
  add column if not exists oportunidade_publica_id uuid references public.oportunidades_publicas(id) on delete set null,
  add column if not exists codigo_oportunidade text;

alter table public.oportunidades_publicas enable row level security;
drop policy if exists "oportunidades publicas admin" on public.oportunidades_publicas;
create policy "oportunidades publicas admin" on public.oportunidades_publicas
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select on public.oportunidades_publicas to anon, authenticated;
grant insert, update, delete on public.oportunidades_publicas to authenticated;

drop policy if exists "playbook leads admin" on public.playbook_leads;
create policy "playbook leads admin" on public.playbook_leads
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
grant select, insert, update on public.playbook_leads to authenticated;

create index if not exists oportunidades_publicas_ativo_ordem_idx
  on public.oportunidades_publicas (ativo_publico, ordem);
create index if not exists playbook_leads_oportunidade_idx
  on public.playbook_leads (oportunidade_publica_id, criado_em desc);

create or replace function public.listar_oportunidades_publicas()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', o.id,
    'codigo', o.codigo_publico,
    'titulo', o.titulo_publico,
    'resumo', o.resumo_publico,
    'tipo', o.tipo_publico,
    'cidade', o.cidade_publica,
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
revoke all on function public.listar_oportunidades_publicas() from public;
grant execute on function public.listar_oportunidades_publicas() to anon, authenticated;

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
  where id = p_oportunidade_id
    and ativo_publico = true
    and valores_revisados_em is not null
    and (proxima_revisao_em is null or proxima_revisao_em >= current_date);
  if not found then raise exception 'OPORTUNIDADE_INDISPONIVEL'; end if;

  v_notes := concat_ws(E'\n',
    'Interesse captado no card público.',
    'Código da oportunidade: ' || v_oportunidade.codigo_publico,
    'Objetivo informado: ' || coalesce(v_objetivo, 'não informado'),
    'Faixa de entrada informada: ' || coalesce(v_faixa, 'não informada'),
    'Entrada exibida no card: ' || coalesce(to_char(v_oportunidade.entrada_publica, 'FM999G999G990D00'), 'sob consulta')
  );

  insert into public.playbook_leads (
    nome, telefone, email, origem, campanha, regiao, perfil, etapa,
    objetivo, consentimento_contato, notas, oportunidade_publica_id, codigo_oportunidade
  ) values (
    v_nome, v_telefone, v_email, 'site_oportunidade', v_oportunidade.codigo_publico,
    v_oportunidade.cidade_publica, case when v_objetivo ilike '%invest%' then 'investidor' else 'a_qualificar' end,
    'novo', v_objetivo, true, v_notes, v_oportunidade.id, v_oportunidade.codigo_publico
  ) returning id into v_lead_id;

  insert into public.alertas (tipo, titulo, descricao, prioridade, lido, data_alerta)
  values (
    'lead_site', 'Novo interesse no site · ' || v_oportunidade.codigo_publico,
    v_nome || ' demonstrou interesse. Telefone: ' || v_telefone ||
      case when v_objetivo is not null then ' · Objetivo: ' || v_objetivo else '' end,
    'alta', false, now()
  );

  return v_lead_id;
end;
$$;
revoke all on function public.solicitar_interesse_oportunidade(uuid, text, text, text, text, text, boolean) from public;
grant execute on function public.solicitar_interesse_oportunidade(uuid, text, text, text, text, text, boolean) to anon, authenticated;

-- Publica inicialmente apenas oportunidades que já possuem imagem pública e uma entrada registrada.
insert into public.oportunidades_publicas (
  empreendimento_id, codigo_publico, titulo_publico, resumo_publico, tipo_publico,
  cidade_publica, entrada_publica, imagem_capa_url, ativo_publico, ordem,
  valores_revisados_em, proxima_revisao_em
)
select
  e.id,
  v.codigo,
  'Oportunidade em análise',
  'Uma oportunidade para morar, investir ou estudar uma estratégia patrimonial.',
  coalesce(nullif(e.tipo, ''), 'Residencial'),
  e.cidade,
  v.entrada,
  case when e.imagem_url like 'http%' then e.imagem_url else null end,
  true,
  v.ordem,
  current_date,
  current_date + 30
from (values
  ('moov', 'OPP-001', 1, 73200.00::numeric),
  ('0360b5f4-c728-4112-b08a-b4f5513ecdc9', 'OPP-002', 2, 109994.60::numeric),
  ('azure', 'OPP-003', 3, 94500.15::numeric),
  ('ilha-de-capri', 'OPP-004', 4, 101000.00::numeric),
  ('grand-trianon', 'OPP-005', 5, 203297.00::numeric),
  ('poema', 'OPP-006', 6, 73760.05::numeric)
) as v(id, codigo, ordem, entrada)
join public.empreendimentos e on e.id = v.id
on conflict (empreendimento_id) do update set
  codigo_publico = excluded.codigo_publico,
  entrada_publica = excluded.entrada_publica,
  imagem_capa_url = excluded.imagem_capa_url,
  ativo_publico = excluded.ativo_publico,
  valores_revisados_em = excluded.valores_revisados_em,
  proxima_revisao_em = excluded.proxima_revisao_em,
  updated_at = now();
