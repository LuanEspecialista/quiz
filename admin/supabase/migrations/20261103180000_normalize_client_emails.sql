-- Corrige o padrão gerado pelo importador: "mail: pessoa@dominio.com".
update public.clientes
set email = lower(trim(regexp_replace(email, '^\s*(e-?mail|mail)\s*:\s*', '', 'i'))), updated_at = now()
where email ~* '^\s*(e-?mail|mail)\s*:\s*[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+\s*$';

create or replace function public.normalizar_email_cliente()
returns trigger language plpgsql as $$
begin
  new.email := nullif(lower(trim(new.email)), '');
  if new.email is not null then
    new.email := regexp_replace(new.email, '^\s*(e-?mail|mail)\s*:\s*', '', 'i');
    new.email := nullif(lower(trim(new.email)), '');
    if new.email is not null and new.email !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
      raise exception 'E-mail inválido. Informe somente o endereço, por exemplo: nome@provedor.com.' using errcode = '22023';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists normalizar_email_cliente on public.clientes;
create trigger normalizar_email_cliente
before insert or update of email on public.clientes
for each row execute function public.normalizar_email_cliente();

alter table public.clientes drop constraint if exists clientes_email_formato_valido;
alter table public.clientes add constraint clientes_email_formato_valido
check (email is null or email ~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$');
