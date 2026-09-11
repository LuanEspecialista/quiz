-- Concilia estoque e histórico mensal na mesma transação.
-- Qualquer falha cancela toda a importação, evitando estoque sem snapshot.
create or replace function public.sincronizar_estoque_importado(
  p_empreendimento_id text,
  p_unidades jsonb,
  p_unidades_ausentes uuid[] default '{}'::uuid[],
  p_mes_referencia integer default extract(month from current_date)::integer,
  p_ano_referencia integer default extract(year from current_date)::integer
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  item jsonb;
  unidade_id uuid;
  atualizadas integer := 0;
  inseridas integer := 0;
  indisponibilizadas integer := 0;
begin
  if not public.is_admin() then
    raise exception 'Apenas administradores podem sincronizar o estoque';
  end if;
  if p_empreendimento_id is null or btrim(p_empreendimento_id) = '' then
    raise exception 'Empreendimento obrigatório';
  end if;
  if jsonb_typeof(p_unidades) <> 'array' or jsonb_array_length(p_unidades) = 0 then
    raise exception 'Nenhuma unidade válida recebida';
  end if;
  if p_mes_referencia not between 1 and 12 or p_ano_referencia not between 2000 and 2100 then
    raise exception 'Referência mensal inválida';
  end if;

  if coalesce(array_length(p_unidades_ausentes, 1), 0) > 0 then
    update public.unidades
       set status = 'indisponivel', updated_at = now()
     where empreendimento_id = p_empreendimento_id
       and id = any(p_unidades_ausentes)
       and status is distinct from 'indisponivel';
    get diagnostics indisponibilizadas = row_count;
  end if;

  for item in select value from jsonb_array_elements(p_unidades)
  loop
    if nullif(item->>'id', '') is not null then
      unidade_id := (item->>'id')::uuid;
      update public.unidades
         set torre = item->>'torre',
             torre_normalizada = item->>'torre_normalizada',
             codigo_unidade_normalizado = item->>'codigo_unidade_normalizado',
             codigo_unidade = item->>'codigo_unidade',
             numero_unidade = item->>'numero_unidade',
             numero = item->>'numero',
             sku = item->>'sku',
             tipologia = nullif(item->>'tipologia', ''),
             tipologia_dados = coalesce(item->'tipologia_dados', '{}'::jsonb),
             quartos = coalesce((item->>'quartos')::integer, 0),
             area_privativa = nullif(item->>'area_privativa', '')::numeric,
             vagas = coalesce((item->>'vagas')::integer, 0),
             valor_tabela = (item->>'valor_tabela')::numeric,
             status = item->>'status',
             fluxo_dados = coalesce(item->'fluxo_dados', '{}'::jsonb),
             updated_at = now()
       where id = unidade_id and empreendimento_id = p_empreendimento_id;
      if not found then
        raise exception 'Unidade % não pertence ao empreendimento informado', unidade_id;
      end if;
      atualizadas := atualizadas + 1;
    else
      insert into public.unidades (
        empreendimento_id, torre, torre_normalizada, codigo_unidade_normalizado,
        codigo_unidade, numero_unidade, numero, sku, tipologia, tipologia_dados,
        quartos, area_privativa, vagas, valor_tabela, status, fluxo_dados
      ) values (
        p_empreendimento_id, item->>'torre', item->>'torre_normalizada',
        item->>'codigo_unidade_normalizado', item->>'codigo_unidade',
        item->>'numero_unidade', item->>'numero', item->>'sku',
        nullif(item->>'tipologia', ''), coalesce(item->'tipologia_dados', '{}'::jsonb),
        coalesce((item->>'quartos')::integer, 0), nullif(item->>'area_privativa', '')::numeric,
        coalesce((item->>'vagas')::integer, 0), (item->>'valor_tabela')::numeric,
        item->>'status', coalesce(item->'fluxo_dados', '{}'::jsonb)
      ) returning id into unidade_id;
      inseridas := inseridas + 1;
    end if;

    insert into public.historico_tabelas_preco (
      empreendimento_id, unidade_id, codigo_unidade, mes_referencia,
      ano_referencia, valor_tabela, entrada_sugerida, fluxo_dados,
      status_unidade, atualizado_em
    ) values (
      p_empreendimento_id, unidade_id, item->>'codigo_unidade', p_mes_referencia,
      p_ano_referencia, (item->>'valor_tabela')::numeric,
      coalesce((item->'fluxo_dados'->>'ato')::numeric, 0),
      coalesce(item->'fluxo_dados', '{}'::jsonb), item->>'status', now()
    )
    on conflict (unidade_id, ano_referencia, mes_referencia)
      where unidade_id is not null
    do update set
      empreendimento_id = excluded.empreendimento_id,
      codigo_unidade = excluded.codigo_unidade,
      valor_tabela = excluded.valor_tabela,
      entrada_sugerida = excluded.entrada_sugerida,
      fluxo_dados = excluded.fluxo_dados,
      status_unidade = excluded.status_unidade,
      atualizado_em = now();
  end loop;

  return jsonb_build_object(
    'atualizadas', atualizadas,
    'inseridas', inseridas,
    'indisponibilizadas', indisponibilizadas,
    'historico', atualizadas + inseridas
  );
end;
$$;

revoke all on function public.sincronizar_estoque_importado(text,jsonb,uuid[],integer,integer) from public, anon;
grant execute on function public.sincronizar_estoque_importado(text,jsonb,uuid[],integer,integer) to authenticated;

comment on function public.sincronizar_estoque_importado(text,jsonb,uuid[],integer,integer) is
  'Importação administrativa atômica: concilia unidades, indisponibiliza ausentes e grava o snapshot mensal.';
