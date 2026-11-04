-- Corrige escapes de regex na versão inicial da migração de captação.
alter table public.evento_padel_leads
  drop constraint if exists evento_padel_leads_email_valido;

alter table public.evento_padel_leads
  add constraint evento_padel_leads_email_valido
  check (email ~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$');

create or replace function public.registrar_lead_evento(
  p_nome text,
  p_telefone text,
  p_email text,
  p_consentimento boolean,
  p_site text default null
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
  v_evento constant text := 'liga-brasileira-padel-balneario-camboriu-2026';
begin
  if nullif(btrim(coalesce(p_site, '')), '') is not null then
    return pg_catalog.jsonb_build_object('ok', true);
  end if;

  if p_consentimento is distinct from true then
    raise exception 'É necessário autorizar o uso dos dados para participar.' using errcode = '22023';
  end if;

  v_nome := pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(p_nome, '')), '[[:space:]]+', ' ', 'g');
  v_telefone := pg_catalog.regexp_replace(coalesce(p_telefone, ''), '[^0-9]', '', 'g');
  v_email := pg_catalog.lower(pg_catalog.btrim(coalesce(p_email, '')));

  if pg_catalog.char_length(v_nome) < 2 or pg_catalog.char_length(v_nome) > 120 then
    raise exception 'Informe um nome válido.' using errcode = '22023';
  end if;
  if pg_catalog.char_length(v_telefone) < 10 or pg_catalog.char_length(v_telefone) > 13 then
    raise exception 'Informe um telefone válido com DDD.' using errcode = '22023';
  end if;
  if v_email !~* '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$' or pg_catalog.char_length(v_email) > 254 then
    raise exception 'Informe um e-mail válido.' using errcode = '22023';
  end if;

  insert into public.evento_padel_leads (
    evento_slug, nome, telefone, email, consentimento, consentimento_em, origem
  ) values (
    v_evento, v_nome, v_telefone, v_email, true, pg_catalog.now(), 'landing-padel-2026'
  )
  on conflict (evento_slug, email) do nothing;

  return pg_catalog.jsonb_build_object('ok', true);
end;
$function$;
