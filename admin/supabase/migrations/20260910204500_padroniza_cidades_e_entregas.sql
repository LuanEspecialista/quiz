-- Cadastro canônico de cidades e entregas oficiais informadas pelo administrador.

drop policy if exists "Administradores cadastram cidades" on public.cidades;
create policy "Administradores cadastram cidades"
  on public.cidades for insert to authenticated
  with check ((select public.is_admin()));

drop policy if exists "Administradores atualizam cidades" on public.cidades;
create policy "Administradores atualizam cidades"
  on public.cidades for update to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create or replace function public.chave_cidade(p_valor text)
returns text
language sql
immutable
set search_path = public, pg_temp
as $$
  select trim(both '-' from regexp_replace(
    regexp_replace(
      regexp_replace(
        translate(lower(trim(coalesce(p_valor, ''))), 'áàâãäéèêëíìîïóòôõöúùûüç', 'aaaaaeeeeiiiiooooouuuuc'),
        '\s*[-/]?\s*(sc|santa catarina)\s*$', '', 'i'
      ),
      '^picarras$', 'balneario picarras', 'i'
    ),
    '[^a-z0-9]+', '-', 'g'
  ));
$$;

revoke execute on function public.chave_cidade(text) from anon;
grant execute on function public.chave_cidade(text) to authenticated;

update public.cidades set estado = 'SC' where id in ('penha','balneario-picarras','barra-velha','navegantes') and estado is null;

update public.empreendimentos e
set cidade = c.nome,
    cidade_id = c.id
from public.cidades c
where public.chave_cidade(e.cidade) = public.chave_cidade(c.nome)
  and (e.cidade is distinct from c.nome or e.cidade_id is distinct from c.id);

create or replace function public.normalizar_cidade_empreendimento()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_cidade public.cidades%rowtype;
begin
  if new.cidade_id is not null then
    select * into v_cidade from public.cidades where id = new.cidade_id;
  elsif nullif(trim(new.cidade), '') is not null then
    select * into v_cidade
    from public.cidades
    where public.chave_cidade(nome) = public.chave_cidade(new.cidade)
    limit 1;
  else
    new.cidade := null;
    new.cidade_id := null;
    return new;
  end if;

  if v_cidade.id is null then
    raise exception 'Cidade não cadastrada. Adicione-a no seletor antes de salvar o empreendimento.';
  end if;

  new.cidade_id := v_cidade.id;
  new.cidade := v_cidade.nome;
  return new;
end;
$$;

drop trigger if exists normalizar_cidade_empreendimento on public.empreendimentos;
create trigger normalizar_cidade_empreendimento
before insert or update of cidade, cidade_id on public.empreendimentos
for each row execute function public.normalizar_cidade_empreendimento();

with entregas(id, mes, data_final) as (
  values
    ('skyline', '2031-12', date '2031-12-31'),
    ('azure', '2031-01', date '2031-01-31'),
    ('ilha-de-capri', '2028-08', date '2028-08-31'),
    ('e827f4a9-41da-4803-852a-7e1bfcc80b48', '2030-11', date '2030-11-30'),
    ('73ce019a-244d-46d4-9eef-bd7cace21dbf', '2030-08', date '2030-08-31'),
    ('0c52056e-ca8f-4da6-bc51-d5ff0b20f1f3', '2029-10', date '2029-10-31'),
    ('kairos', '2031-11', date '2031-11-30'),
    ('orla-da-barra', '2029-09', date '2029-09-30'),
    ('68034d50-c0ef-479b-9147-53473bed8730', '2028-12', date '2028-12-31'),
    ('a19c5344-3e1a-472d-b8a6-e95a88c752db', '2030-04', date '2030-04-30'),
    ('edc5f671-4dd6-46f7-af4e-8cdbbeebeb90', '2027-09', date '2027-09-30'),
    ('e2a740fe-b088-4cd4-b969-65f08875bdae', '2030-09', date '2030-09-30'),
    ('1874027d-3512-4271-adfa-76f87de49932', '2029-01', date '2029-01-31'),
    ('992c558d-283a-42cd-8040-d7b42f8b4960', '2030-07', date '2030-07-31'),
    ('b2fc4baa-a99d-4754-b5e6-d674a6adc20a', '2028-03', date '2028-03-31'),
    ('0896a174-85c6-4de9-ac62-01dafd7aad86', '2029-11', date '2029-11-30'),
    ('zuri', '2031-06', date '2031-06-30')
)
update public.empreendimentos e
set entrega = x.mes,
    entrega_date = x.data_final,
    data_entrega = x.mes,
    data_entrega_chaves = x.data_final,
    previsao_entrega = x.data_final,
    updated_at = now()
from entregas x
where e.id = x.id;
