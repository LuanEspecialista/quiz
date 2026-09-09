alter table public.perfis_usuario
  add column if not exists usuario text;

alter table public.perfis_usuario
  drop constraint if exists perfis_usuario_usuario_formato;

alter table public.perfis_usuario
  add constraint perfis_usuario_usuario_formato
  check (usuario is null or usuario ~ '^[a-z0-9][a-z0-9._-]{2,23}$');

create unique index if not exists perfis_usuario_usuario_unico
  on public.perfis_usuario (lower(usuario))
  where usuario is not null;

create or replace function public.definir_meu_usuario(p_usuario text)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_usuario text := lower(trim(p_usuario));
begin
  if auth.uid() is null then
    raise exception 'NAO_AUTENTICADO';
  end if;

  if v_usuario !~ '^[a-z0-9][a-z0-9._-]{2,23}$' then
    raise exception 'USUARIO_INVALIDO';
  end if;

  if exists (
    select 1 from public.perfis_usuario
    where lower(usuario) = v_usuario and user_id <> auth.uid()
  ) then
    raise exception 'USUARIO_EM_USO';
  end if;

  update public.perfis_usuario
  set usuario = v_usuario, updated_at = now()
  where user_id = auth.uid() and ativo = true;

  if not found then
    raise exception 'PERFIL_INATIVO_OU_INEXISTENTE';
  end if;

  return v_usuario;
end;
$$;

revoke all on function public.definir_meu_usuario(text) from public, anon;
grant execute on function public.definir_meu_usuario(text) to authenticated;
