-- Captação da ação da Liga Brasileira de Pádel. A tabela fica isolada dos clientes
-- existentes; o público só pode gravar através da função validada abaixo.
create table if not exists public.evento_padel_leads (
  id uuid primary key default gen_random_uuid(),
  evento_slug text not null default 'liga-brasileira-padel-balneario-camboriu-2026',
  nome text not null,
  telefone text not null,
  email text not null,
  consentimento boolean not null default true,
  consentimento_em timestamptz not null default now(),
  origem text not null default 'landing-padel-2026',
  created_at timestamptz not null default now(),
  constraint evento_padel_leads_nome_valido check (char_length(nome) between 2 and 120),
  constraint evento_padel_leads_telefone_valido check (telefone ~ '^[0-9]{10,13}$'),
  constraint evento_padel_leads_email_valido check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  constraint evento_padel_leads_evento_email_unico unique (evento_slug, email)
);

alter table public.evento_padel_leads enable row level security;
revoke all on table public.evento_padel_leads from public, anon, authenticated;
grant select on table public.evento_padel_leads to authenticated;

drop policy if exists evento_padel_leads_admin_read on public.evento_padel_leads;
create policy evento_padel_leads_admin_read
  on public.evento_padel_leads
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.perfis_usuario p
      where p.user_id = (select auth.uid())
        and p.perfil = 'admin'
        and p.ativo is true
    )
  );

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
  -- Honeypot preenchido: resposta positiva, sem criar registo.
  if nullif(btrim(coalesce(p_site, '')), '') is not null then
    return pg_catalog.jsonb_build_object('ok', true);
  end if;

  if p_consentimento is distinct from true then
    raise exception 'É necessário autorizar o uso dos dados para participar.' using errcode = '22023';
  end if;

  v_nome := pg_catalog.regexp_replace(pg_catalog.btrim(coalesce(p_nome, '')), '\s+', ' ', 'g');
  v_telefone := pg_catalog.regexp_replace(coalesce(p_telefone, ''), '[^0-9]', '', 'g');
  v_email := pg_catalog.lower(pg_catalog.btrim(coalesce(p_email, '')));

  if pg_catalog.char_length(v_nome) < 2 or pg_catalog.char_length(v_nome) > 120 then
    raise exception 'Informe um nome válido.' using errcode = '22023';
  end if;
  if pg_catalog.char_length(v_telefone) < 10 or pg_catalog.char_length(v_telefone) > 13 then
    raise exception 'Informe um telefone válido com DDD.' using errcode = '22023';
  end if;
  if v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or pg_catalog.char_length(v_email) > 254 then
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

revoke all on function public.registrar_lead_evento(text, text, text, boolean, text) from public;
grant execute on function public.registrar_lead_evento(text, text, text, boolean, text) to anon, authenticated;
