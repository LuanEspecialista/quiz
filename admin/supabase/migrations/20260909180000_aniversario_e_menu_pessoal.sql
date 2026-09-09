alter table public.clientes add column if not exists aniversario_dia smallint, add column if not exists aniversario_mes smallint;
alter table public.afiliados add column if not exists aniversario_dia smallint, add column if not exists aniversario_mes smallint;
alter table public.solicitacoes_acesso add column if not exists aniversario_dia smallint, add column if not exists aniversario_mes smallint;
alter table public.perfis_usuario add column if not exists menu_ordem jsonb not null default '[]'::jsonb;

alter table public.clientes drop constraint if exists clientes_aniversario_valido;
alter table public.clientes add constraint clientes_aniversario_valido check ((aniversario_dia is null and aniversario_mes is null) or (aniversario_dia is not null and aniversario_mes between 1 and 12 and aniversario_dia between 1 and case when aniversario_mes between 1 and 12 then extract(day from (make_date(2000,aniversario_mes,1)+interval '1 month'-interval '1 day')) else 0 end));
alter table public.afiliados drop constraint if exists afiliados_aniversario_valido;
alter table public.afiliados add constraint afiliados_aniversario_valido check ((aniversario_dia is null and aniversario_mes is null) or (aniversario_dia is not null and aniversario_mes between 1 and 12 and aniversario_dia between 1 and case when aniversario_mes between 1 and 12 then extract(day from (make_date(2000,aniversario_mes,1)+interval '1 month'-interval '1 day')) else 0 end));
alter table public.solicitacoes_acesso drop constraint if exists solicitacoes_aniversario_valido;
alter table public.solicitacoes_acesso add constraint solicitacoes_aniversario_valido check (aniversario_mes between 1 and 12 and aniversario_dia between 1 and case when aniversario_mes between 1 and 12 then extract(day from (make_date(2000,aniversario_mes,1)+interval '1 month'-interval '1 day')) else 0 end);

drop function if exists public.solicitar_acesso(text,text,text,text);
create function public.solicitar_acesso(p_nome text,p_email text,p_tipo text,p_usuario text,p_aniversario_dia integer,p_aniversario_mes integer)
returns uuid language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid;v_nome text:=trim(p_nome);v_email text:=lower(trim(p_email));v_usuario text:=lower(trim(p_usuario));
begin
 if char_length(v_nome) not between 2 and 120 then raise exception 'NOME_INVALIDO';end if;
 if v_email!~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then raise exception 'EMAIL_INVALIDO';end if;
 if p_tipo not in ('cliente','afiliado') then raise exception 'TIPO_INVALIDO';end if;
 if v_usuario!~ '^[a-z0-9][a-z0-9._-]{2,23}$' then raise exception 'USUARIO_INVALIDO';end if;
 if p_aniversario_mes not between 1 and 12 or p_aniversario_dia not between 1 and extract(day from (make_date(2000,p_aniversario_mes,1)+interval '1 month'-interval '1 day')) then raise exception 'ANIVERSARIO_INVALIDO';end if;
 if exists(select 1 from public.perfis_usuario where lower(usuario)=v_usuario) or exists(select 1 from public.solicitacoes_acesso where lower(usuario)=v_usuario and status='pendente') then raise exception 'USUARIO_EM_USO';end if;
 select id into v_id from public.solicitacoes_acesso where lower(email)=v_email and tipo=p_tipo and status='pendente' limit 1;
 if v_id is null then insert into public.solicitacoes_acesso(nome,email,usuario,tipo,aniversario_dia,aniversario_mes) values(v_nome,v_email,v_usuario,p_tipo,p_aniversario_dia,p_aniversario_mes) returning id into v_id;
 else update public.solicitacoes_acesso set nome=v_nome,usuario=v_usuario,aniversario_dia=p_aniversario_dia,aniversario_mes=p_aniversario_mes where id=v_id; end if;
 return v_id;
end $$;
revoke all on function public.solicitar_acesso(text,text,text,text,integer,integer) from public;
grant execute on function public.solicitar_acesso(text,text,text,text,integer,integer) to anon,authenticated;

create or replace function public.salvar_menu_ordem(p_ordem jsonb)
returns void language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if auth.uid() is null then raise exception 'NAO_AUTENTICADO'; end if;
 if jsonb_typeof(p_ordem) <> 'array' or jsonb_array_length(p_ordem) > 40 then raise exception 'ORDEM_INVALIDA'; end if;
 if exists(select 1 from jsonb_array_elements(p_ordem) item where jsonb_typeof(item) <> 'string' or length(item #>> '{}') > 60) then raise exception 'ORDEM_INVALIDA'; end if;
 update public.perfis_usuario set menu_ordem=p_ordem where user_id=auth.uid();
end $$;
revoke all on function public.salvar_menu_ordem(jsonb) from public,anon;
grant execute on function public.salvar_menu_ordem(jsonb) to authenticated;
