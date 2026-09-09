create table if not exists public.solicitacoes_acesso (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(nome) between 2 and 120),
  email text not null check (email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
  tipo text not null check (tipo in ('cliente','afiliado')),
  status text not null default 'pendente' check (status in ('pendente','aprovada','recusada')),
  user_id uuid references auth.users(id) on delete set null,
  solicitado_em timestamptz not null default now(),
  analisado_em timestamptz,
  analisado_por uuid references auth.users(id) on delete set null
);

create unique index if not exists solicitacao_acesso_pendente_email_tipo
  on public.solicitacoes_acesso (lower(email), tipo) where status = 'pendente';
alter table public.solicitacoes_acesso enable row level security;

drop policy if exists "solicitacoes admin" on public.solicitacoes_acesso;
create policy "solicitacoes admin" on public.solicitacoes_acesso for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create or replace function public.solicitar_acesso(p_nome text, p_email text, p_tipo text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_nome text := trim(p_nome); v_email text := lower(trim(p_email));
begin
  if char_length(v_nome) not between 2 and 120 then raise exception 'NOME_INVALIDO'; end if;
  if v_email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'EMAIL_INVALIDO'; end if;
  if p_tipo not in ('cliente','afiliado') then raise exception 'TIPO_INVALIDO'; end if;
  select id into v_id from public.solicitacoes_acesso
    where lower(email)=v_email and tipo=p_tipo and status='pendente' limit 1;
  if v_id is null then
    insert into public.solicitacoes_acesso(nome,email,tipo) values(v_nome,v_email,p_tipo) returning id into v_id;
  end if;
  return v_id;
end $$;
revoke all on function public.solicitar_acesso(text,text,text) from public;
grant execute on function public.solicitar_acesso(text,text,text) to anon, authenticated;
grant select,insert,update,delete on public.solicitacoes_acesso to authenticated;
