-- Atribuição de leads da ação Pádel por corretor.
-- Conforme confirmação do utilizador, todos os cadastros existentes até agora
-- pertencem a Luan. Formulários antigos continuam compatíveis via wrapper.
alter table public.evento_padel_leads
  add column if not exists corretor_responsavel text;

update public.evento_padel_leads
set corretor_responsavel = 'Luan'
where evento_slug = 'liga-brasileira-padel-balneario-camboriu-2026';

update public.evento_padel_leads
set corretor_responsavel = 'Luan'
where corretor_responsavel is null or pg_catalog.btrim(corretor_responsavel) = '';

alter table public.evento_padel_leads
  alter column corretor_responsavel set default 'Luan',
  alter column corretor_responsavel set not null;

do $migration$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conrelid = 'public.evento_padel_leads'::pg_catalog.regclass
      and conname = 'evento_padel_leads_corretor_valido'
  ) then
    alter table public.evento_padel_leads
      add constraint evento_padel_leads_corretor_valido
      check (corretor_responsavel in ('Cris', 'Marcelo', 'Vanessa', 'Luan', 'Mirtes', 'Caroline'));
  end if;
end
$migration$;

-- Nova assinatura para formulários que enviam a atribuição escolhida.
create or replace function public.registrar_lead_evento(
  p_nome text,
  p_telefone text,
  p_email text,
  p_consentimento boolean,
  p_site text,
  p_corretor text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_nome text;
  v_telefone text;
  v_email text;
  v_corretor text;
  v_evento constant text := 'liga-brasileira-padel-balneario-camboriu-2026';
begin
  -- Honeypot preenchido: resposta positiva, sem criar registo.
  if nullif(pg_catalog.btrim(coalesce(p_site, '')), '') is not null then
    return pg_catalog.jsonb_build_object('ok', true);
  end if;

  if p_consentimento is distinct from true then
    raise exception 'É necessário autorizar o uso dos dados para participar.' using errcode = '22023';
  end if;

  v_nome := pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(p_nome, '')), '\s+', ' ', 'g');
  v_telefone := pg_catalog.regexp_replace(coalesce(p_telefone, ''), '[^0-9]', '', 'g');
  v_email := pg_catalog.lower(pg_catalog.btrim(coalesce(p_email, '')));
  v_corretor := pg_catalog.btrim(coalesce(p_corretor, ''));

  if pg_catalog.char_length(v_nome) < 2 or pg_catalog.char_length(v_nome) > 120 then
    raise exception 'Informe um nome válido.' using errcode = '22023';
  end if;
  if pg_catalog.char_length(v_telefone) < 10 or pg_catalog.char_length(v_telefone) > 13 then
    raise exception 'Informe um telefone válido com DDD.' using errcode = '22023';
  end if;
  if v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or pg_catalog.char_length(v_email) > 254 then
    raise exception 'Informe um e-mail válido.' using errcode = '22023';
  end if;
  if v_corretor not in ('Cris', 'Marcelo', 'Vanessa', 'Luan', 'Mirtes', 'Caroline') then
    raise exception 'Selecione um corretor responsável válido.' using errcode = '22023';
  end if;

  insert into public.evento_padel_leads (
    evento_slug, nome, telefone, email, corretor_responsavel,
    consentimento, consentimento_em, origem
  ) values (
    v_evento, v_nome, v_telefone, v_email, v_corretor,
    true, pg_catalog.now(), 'landing-padel-2026'
  )
  on conflict (evento_slug, email) do nothing;

  return pg_catalog.jsonb_build_object('ok', true);
end;
$function$;

-- Compatibilidade para versões antigas do formulário: usa Luan, conforme pedido.
create or replace function public.registrar_lead_evento(
  p_nome text,
  p_telefone text,
  p_email text,
  p_consentimento boolean,
  p_site text default null
)
returns jsonb
language sql
security definer
set search_path = ''
as $function$
  select public.registrar_lead_evento(p_nome, p_telefone, p_email, p_consentimento, p_site, 'Luan');
$function$;

revoke all on function public.registrar_lead_evento(text, text, text, boolean, text, text) from public;
revoke all on function public.registrar_lead_evento(text, text, text, boolean, text) from public;
grant execute on function public.registrar_lead_evento(text, text, text, boolean, text, text) to anon, authenticated;
grant execute on function public.registrar_lead_evento(text, text, text, boolean, text) to anon, authenticated;
