alter table public.blog_avaliacoes
  add column if not exists user_id uuid references auth.users(id) on delete cascade,
  add column if not exists publicar_perfil boolean not null default false,
  add column if not exists nome_publico text,
  add column if not exists avatar_url text;

alter table public.blog_leads
  add column if not exists consentiu_contato boolean not null default false,
  add column if not exists consentimento_em timestamptz,
  add column if not exists consentimento_revogado_em timestamptz,
  add column if not exists consentimento_versao text;

create unique index if not exists blog_avaliacoes_post_user_unique
  on public.blog_avaliacoes (post_id, user_id)
  where user_id is not null;

create index if not exists blog_avaliacoes_public_reviews_idx
  on public.blog_avaliacoes (post_id, atualizado_em desc)
  where publicar_perfil = true;

create unique index if not exists clientes_user_id_unique
  on public.clientes (user_id)
  where user_id is not null;

create or replace function public.registrar_avaliacao_blog(
  p_post_id uuid,
  p_sessao_id uuid,
  p_nota smallint,
  p_publicar_perfil boolean,
  p_nome_publico text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session_id uuid := p_sessao_id;
  v_existing_session_id uuid;
  v_nome text;
  v_avatar text;
begin
  if p_sessao_id is null or p_nota is null or p_nota not between 1 and 5 then
    raise exception 'Avaliação inválida';
  end if;

  if not exists (
    select 1 from public.blog_posts
    where id = p_post_id and status = 'publicado'
  ) then
    raise exception 'Artigo indisponível para avaliação';
  end if;

  if v_user_id is not null then
    select avaliacao.sessao_id
      into v_existing_session_id
      from public.blog_avaliacoes as avaliacao
     where avaliacao.post_id = p_post_id
       and avaliacao.user_id = v_user_id
     limit 1;

    if v_existing_session_id is not null then
      v_session_id := v_existing_session_id;
    elsif exists (
      select 1 from public.blog_avaliacoes as avaliacao
       where avaliacao.post_id = p_post_id
         and avaliacao.sessao_id = v_session_id
         and avaliacao.user_id is not null
         and avaliacao.user_id <> v_user_id
    ) then
      v_session_id := gen_random_uuid();
    end if;

    delete from public.blog_avaliacoes as avaliacao
     where avaliacao.post_id = p_post_id
       and avaliacao.sessao_id = p_sessao_id
       and avaliacao.user_id is null;

    if coalesce(p_publicar_perfil, false) then
      select
        coalesce(
          nullif(left(trim(p_nome_publico), 80), ''),
          nullif(left(trim(u.raw_user_meta_data ->> 'full_name'), 80), ''),
          nullif(left(trim(u.raw_user_meta_data ->> 'name'), 80), '')
        ),
        case
          when coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture') ~* '^https://'
          then left(coalesce(u.raw_user_meta_data ->> 'avatar_url', u.raw_user_meta_data ->> 'picture'), 2048)
          else null
        end
        into v_nome, v_avatar
        from auth.users as u
       where u.id = v_user_id;

      if nullif(trim(coalesce(v_nome, '')), '') is null then
        raise exception 'Informe o nome que deseja exibir junto à avaliação';
      end if;
    else
      v_nome := null;
      v_avatar := null;
    end if;

    insert into public.blog_avaliacoes (
      post_id, sessao_id, user_id, nota, publicar_perfil, nome_publico, avatar_url
    ) values (
      p_post_id, v_session_id, v_user_id, p_nota, coalesce(p_publicar_perfil, false), v_nome, v_avatar
    )
    on conflict (post_id, user_id) where user_id is not null
    do update set
      nota = excluded.nota,
      publicar_perfil = excluded.publicar_perfil,
      nome_publico = excluded.nome_publico,
      avatar_url = excluded.avatar_url,
      atualizado_em = now();
  else
    if exists (
      select 1 from public.blog_avaliacoes as avaliacao
       where avaliacao.post_id = p_post_id
         and avaliacao.sessao_id = v_session_id
         and avaliacao.user_id is not null
    ) then
      v_session_id := gen_random_uuid();
    end if;

    update public.blog_avaliacoes as avaliacao
       set nota = p_nota,
           publicar_perfil = false,
           nome_publico = null,
           avatar_url = null,
           atualizado_em = now()
     where avaliacao.post_id = p_post_id
       and avaliacao.sessao_id = v_session_id
       and avaliacao.user_id is null;

    if not found then
      insert into public.blog_avaliacoes (
        post_id, sessao_id, nota, publicar_perfil, nome_publico, avatar_url
      ) values (
        p_post_id, v_session_id, p_nota, false, null, null
      );
    end if;
  end if;
end;
$$;

create or replace function public.listar_avaliacoes_blog(p_post_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_result jsonb;
begin
  if not exists (
    select 1 from public.blog_posts
    where id = p_post_id and status = 'publicado'
  ) then
    return jsonb_build_object('total', 0, 'media', 0, 'recentes', '[]'::jsonb);
  end if;

  select jsonb_build_object(
    'total', coalesce((select count(*) from public.blog_avaliacoes where post_id = p_post_id), 0),
    'media', coalesce((
      select round(avg(avaliacao.nota)::numeric, 1)
        from public.blog_avaliacoes as avaliacao
       where avaliacao.post_id = p_post_id
    ), 0),
    'recentes', coalesce((
      select jsonb_agg(jsonb_build_object(
        'nome', recentes.nome_publico,
        'avatar_url', recentes.avatar_url,
        'nota', recentes.nota,
        'data', recentes.atualizado_em
      ) order by recentes.atualizado_em desc)
        from (
          select avaliacao.nome_publico, avaliacao.avatar_url, avaliacao.nota, avaliacao.atualizado_em
           from public.blog_avaliacoes as avaliacao
           where avaliacao.post_id = p_post_id
             and avaliacao.publicar_perfil = true
             and avaliacao.user_id is not null
             and nullif(trim(coalesce(avaliacao.nome_publico, '')), '') is not null
           order by avaliacao.atualizado_em desc
           limit 8
        ) as recentes
    ), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

create or replace function public.registrar_lead_blog(
  p_post_id uuid,
  p_nome text,
  p_interesses text[] default '{}',
  p_consentiu_contato boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_email text;
  v_nome text;
  v_client_id public.clientes.id%type;
begin
  if v_user_id is null then
    raise exception 'É necessário entrar na conta para salvar o cadastro';
  end if;

  select lower(trim(u.email))
    into v_email
    from auth.users as u
   where u.id = v_user_id;

  if nullif(v_email, '') is null then
    raise exception 'Não foi possível confirmar o e-mail da conta';
  end if;

  if p_post_id is not null and not exists (
    select 1 from public.blog_posts
     where id = p_post_id and status = 'publicado'
  ) then
    raise exception 'Artigo indisponível para cadastro';
  end if;

  if not coalesce(p_consentiu_contato, false) then
    update public.blog_leads
       set consentiu_contato = false,
           consentimento_revogado_em = now(),
           atualizado_em = now()
     where user_id = v_user_id;
    return;
  end if;

  v_nome := nullif(left(trim(coalesce(p_nome, '')), 120), '');
  if v_nome is null then
    raise exception 'Informe seu nome para continuar';
  end if;

  insert into public.blog_leads (
    user_id, email, nome, origem_post_id, interesses, status,
    consentiu_contato, consentimento_em, consentimento_revogado_em,
    consentimento_versao, atualizado_em
  ) values (
    v_user_id, v_email, v_nome, p_post_id, coalesce(p_interesses, '{}'), 'novo',
    true, now(), null, '2026-10-21', now()
  )
  on conflict (user_id) do update set
    email = excluded.email,
    nome = excluded.nome,
    origem_post_id = coalesce(public.blog_leads.origem_post_id, excluded.origem_post_id),
    interesses = case
      when cardinality(coalesce(p_interesses, '{}')) > 0 then coalesce(p_interesses, '{}')
      else public.blog_leads.interesses
    end,
    consentiu_contato = true,
    consentimento_em = now(),
    consentimento_revogado_em = null,
    consentimento_versao = excluded.consentimento_versao,
    atualizado_em = now();

  select cliente.id
    into v_client_id
    from public.clientes as cliente
   where cliente.user_id = v_user_id
      or (
        cliente.user_id is null
        and lower(trim(coalesce(cliente.email, ''))) = v_email
      )
   order by (cliente.user_id = v_user_id) desc, cliente.created_at asc nulls last
   limit 1;

  if v_client_id is null then
    insert into public.clientes (
      user_id, nome, email, origem, status, created_at, updated_at, acesso_portal
    ) values (
      v_user_id, v_nome, v_email, 'Blog', 'novo', now(), now(), false
    );
  else
    update public.clientes as cliente
       set user_id = v_user_id,
           nome = case
             when nullif(trim(coalesce(cliente.nome, '')), '') is null then v_nome
             else cliente.nome
           end,
           email = coalesce(nullif(trim(cliente.email), ''), v_email),
           origem = coalesce(nullif(trim(cliente.origem), ''), 'Blog'),
           status = coalesce(nullif(trim(cliente.status), ''), 'novo'),
           updated_at = now()
     where cliente.id = v_client_id;
  end if;
end;
$$;

revoke all on function public.registrar_avaliacao_blog(uuid, uuid, smallint, boolean, text) from public;
revoke all on function public.listar_avaliacoes_blog(uuid) from public;
revoke all on function public.registrar_lead_blog(uuid, text, text[], boolean) from public;

grant execute on function public.registrar_avaliacao_blog(uuid, uuid, smallint, boolean, text) to anon, authenticated;
grant execute on function public.listar_avaliacoes_blog(uuid) to anon, authenticated;
grant execute on function public.registrar_lead_blog(uuid, text, text[], boolean) to authenticated;

notify pgrst, 'reload schema';
