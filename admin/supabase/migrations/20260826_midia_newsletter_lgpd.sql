-- Mídias: a impressão digital impede uploads repetidos do mesmo arquivo.
alter table public.empreendimento_imagens
  add column if not exists conteudo_hash text;

create index if not exists empreendimento_imagens_hash_idx
  on public.empreendimento_imagens(empreendimento_id, conteudo_hash)
  where conteudo_hash is not null;

-- Newsletter é uma base de leads com consentimento, não uma conta de cliente.
create table if not exists public.newsletter_assinantes (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  nome text,
  idioma text not null default 'pt-BR',
  origem text not null default 'site',
  finalidade text not null default 'Conteúdos, oportunidades e atualizações imobiliárias',
  consentiu_em timestamptz not null default now(),
  ip_hash text,
  status text not null default 'ativo' check (status in ('ativo', 'descadastrado')),
  descadastrado_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint newsletter_assinantes_email_unico unique (email)
);

alter table public.newsletter_assinantes enable row level security;
revoke all on public.newsletter_assinantes from anon, authenticated;
grant select, insert, update, delete on public.newsletter_assinantes to authenticated;

drop policy if exists "newsletter_admin_manage" on public.newsletter_assinantes;
create policy "newsletter_admin_manage" on public.newsletter_assinantes
  for all to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- A inscrição pública passa por função de escopo mínimo. A tabela nunca é exposta.
create or replace function public.assinar_newsletter(
  p_email text,
  p_nome text default null,
  p_idioma text default 'pt-BR',
  p_origem text default 'site'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(p_email));
  v_nome text := nullif(trim(coalesce(p_nome, '')), '');
  v_idioma text := case when p_idioma in ('pt-BR', 'en-US', 'es') then p_idioma else 'pt-BR' end;
begin
  if v_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'E-mail inválido.' using errcode = '22023';
  end if;
  if length(v_email) > 254 or (v_nome is not null and length(v_nome) > 120) then
    raise exception 'Dados inválidos.' using errcode = '22023';
  end if;

  insert into public.newsletter_assinantes (email, nome, idioma, origem, consentiu_em, status, descadastrado_em, updated_at)
  values (v_email, v_nome, v_idioma, left(coalesce(nullif(trim(p_origem), ''), 'site'), 80), now(), 'ativo', null, now())
  on conflict (email) do update
  set nome = coalesce(excluded.nome, newsletter_assinantes.nome),
      idioma = excluded.idioma,
      origem = excluded.origem,
      consentiu_em = now(),
      status = 'ativo',
      descadastrado_em = null,
      updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.assinar_newsletter(text, text, text, text) from public;
grant execute on function public.assinar_newsletter(text, text, text, text) to anon, authenticated;

create or replace function public.descadastrar_newsletter(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare v_email text := lower(trim(p_email));
begin
  if v_email !~* '^[^\s@]+@[^\s@]+\.[^\s@]+$' then
    raise exception 'E-mail inválido.' using errcode = '22023';
  end if;
  update public.newsletter_assinantes
  set status = 'descadastrado', descadastrado_em = now(), updated_at = now()
  where email = v_email;
  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.descadastrar_newsletter(text) from public;
grant execute on function public.descadastrar_newsletter(text) to anon, authenticated;
