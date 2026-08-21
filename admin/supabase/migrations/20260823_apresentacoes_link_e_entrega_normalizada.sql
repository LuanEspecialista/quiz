alter table if exists public.apresentacoes
  add column if not exists link_url text,
  add column if not exists tipo_preferido text not null default 'pdf'
    check (tipo_preferido in ('pdf','link'));

alter table if exists public.empreendimentos
  add column if not exists entrega_date date;

-- Preserva links cadastrados pelo modo de compatibilidade antes desta migração.
update public.apresentacoes a
set link_url = coalesce(a.link_url, nullif(e.caracteristicas->'apresentacao'->>'link_url','')),
    tipo_preferido = coalesce(nullif(e.caracteristicas->'apresentacao'->>'tipo_preferido',''),a.tipo_preferido,'pdf')
from public.empreendimentos e
where e.id = a.empreendimento_id
  and e.caracteristicas->'apresentacao' is not null;

create or replace function public.normalizar_mes_entrega(valor text)
returns date language plpgsql immutable as $$
declare
  v text := lower(trim(coalesce(valor,'')));
  partes text[];
  mes integer;
  ano integer;
begin
  if v = '' then return null; end if;
  v := translate(v, 'áàâãéêíóôõúç', 'aaaaeeiooouc');
  if v ~ '^\d{4}-\d{1,2}(-\d{1,2})?$' then
    partes := regexp_split_to_array(v, '-'); ano := partes[1]::integer; mes := partes[2]::integer;
  elsif v ~ '^\d{1,2}[/.-]\d{2,4}$' then
    partes := regexp_split_to_array(v, '[/.-]'); mes := partes[1]::integer; ano := partes[2]::integer;
  else
    mes := case
      when v ~ '^jan' then 1 when v ~ '^fev' then 2 when v ~ '^mar' then 3 when v ~ '^abr' then 4
      when v ~ '^mai' then 5 when v ~ '^jun' then 6 when v ~ '^jul' then 7 when v ~ '^ago' then 8
      when v ~ '^set' then 9 when v ~ '^out' then 10 when v ~ '^nov' then 11 when v ~ '^dez' then 12
    end;
    ano := nullif(substring(v from '(\d{2,4})'), '')::integer;
  end if;
  if ano between 0 and 99 then ano := 2000 + ano; end if;
  if ano not between 2000 and 2200 or mes not between 1 and 12 then return null; end if;
  return (make_date(ano, mes, 1) + interval '1 month - 1 day')::date;
exception when others then return null;
end $$;

update public.empreendimentos e
set entrega_date = public.normalizar_mes_entrega(coalesce(
  nullif(trim(e.entrega), ''),
  nullif(trim(to_jsonb(e)->>'previsao_entrega'), ''),
  nullif(trim(to_jsonb(e)->>'data_entrega'), '')
))
where e.entrega_date is null
  and coalesce(
    nullif(trim(e.entrega), ''),
    nullif(trim(to_jsonb(e)->>'previsao_entrega'), ''),
    nullif(trim(to_jsonb(e)->>'data_entrega'), '')
  ) is not null;

create or replace function public.sincronizar_entrega_empreendimento()
returns trigger language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    new.entrega_date := coalesce(new.entrega_date, public.normalizar_mes_entrega(coalesce(
      new.entrega,
      to_jsonb(new)->>'previsao_entrega',
      to_jsonb(new)->>'data_entrega'
    )));
  elsif new.entrega is distinct from old.entrega then
    new.entrega_date := public.normalizar_mes_entrega(new.entrega);
  elsif new.entrega_date is null then
    new.entrega_date := public.normalizar_mes_entrega(coalesce(
      new.entrega,
      to_jsonb(new)->>'previsao_entrega',
      to_jsonb(new)->>'data_entrega'
    ));
  end if;
  return new;
end $$;

drop trigger if exists trg_sincronizar_entrega_empreendimento on public.empreendimentos;
create trigger trg_sincronizar_entrega_empreendimento
before insert or update of entrega, entrega_date on public.empreendimentos
for each row execute function public.sincronizar_entrega_empreendimento();

comment on column public.apresentacoes.link_url is 'Link HTTPS externo para Canva ou outra apresentação.';
comment on column public.empreendimentos.entrega_date is 'Último dia do mês previsto para entrega; fonte normalizada para cálculos.';
notify pgrst, 'reload schema';
