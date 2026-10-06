-- Preserva cada tabela comercial importada como um snapshot independente.
-- A valorização real é informativa e não altera valorizacao_aa, usada nas projeções.

alter table public.historico_tabelas_preco
  add column if not exists snapshot_id uuid;

update public.historico_tabelas_preco
set snapshot_id = gen_random_uuid()
where snapshot_id is null;

-- Registros antigos do mesmo empreendimento/mês pertencem ao mesmo snapshot legado.
do $$
declare
  grupo record;
  novo_snapshot uuid;
begin
  for grupo in
    select distinct empreendimento_id, ano_referencia, mes_referencia
    from public.historico_tabelas_preco
    where empreendimento_id is not null
  loop
    novo_snapshot := gen_random_uuid();
    update public.historico_tabelas_preco
       set snapshot_id = novo_snapshot
     where empreendimento_id = grupo.empreendimento_id
       and ano_referencia = grupo.ano_referencia
       and mes_referencia = grupo.mes_referencia;
  end loop;
end $$;

alter table public.historico_tabelas_preco
  alter column snapshot_id set default gen_random_uuid(),
  alter column snapshot_id set not null;

drop index if exists public.historico_preco_unidade_mes_unico;
create unique index if not exists historico_preco_unidade_snapshot_unico
  on public.historico_tabelas_preco (unidade_id, snapshot_id)
  where unidade_id is not null;

create index if not exists historico_preco_empreendimento_snapshot_idx
  on public.historico_tabelas_preco (empreendimento_id, snapshot_id, atualizado_em desc);

drop function if exists public.sincronizar_estoque_importado(text,jsonb,uuid[],integer,integer);

create or replace function public.sincronizar_estoque_importado(
  p_empreendimento_id text,
  p_unidades jsonb,
  p_unidades_ausentes uuid[],
  p_mes_referencia integer,
  p_ano_referencia integer
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  item jsonb;
  v_unidade_id uuid;
  v_snapshot_id uuid := gen_random_uuid();
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
      v_unidade_id := (item->>'id')::uuid;
      update public.unidades
         set torre = item->>'torre', torre_normalizada = item->>'torre_normalizada',
             codigo_unidade_normalizado = item->>'codigo_unidade_normalizado',
             codigo_unidade = item->>'codigo_unidade', numero_unidade = item->>'numero_unidade',
             numero = item->>'numero', sku = item->>'sku', tipologia = nullif(item->>'tipologia', ''),
             tipologia_dados = coalesce(item->'tipologia_dados', '{}'::jsonb),
             quartos = coalesce((item->>'quartos')::integer, 0),
             area_privativa = nullif(item->>'area_privativa', '')::numeric,
             vagas = coalesce((item->>'vagas')::integer, 0), valor_tabela = (item->>'valor_tabela')::numeric,
             status = item->>'status', fluxo_dados = coalesce(item->'fluxo_dados', '{}'::jsonb), updated_at = now()
       where id = v_unidade_id and empreendimento_id = p_empreendimento_id;
      if not found then raise exception 'Unidade % não pertence ao empreendimento informado', v_unidade_id; end if;
      atualizadas := atualizadas + 1;
    else
      insert into public.unidades (
        empreendimento_id, torre, torre_normalizada, codigo_unidade_normalizado, codigo_unidade,
        numero_unidade, numero, sku, tipologia, tipologia_dados, quartos, area_privativa, vagas,
        valor_tabela, status, fluxo_dados
      ) values (
        p_empreendimento_id, item->>'torre', item->>'torre_normalizada', item->>'codigo_unidade_normalizado',
        item->>'codigo_unidade', item->>'numero_unidade', item->>'numero', item->>'sku', nullif(item->>'tipologia', ''),
        coalesce(item->'tipologia_dados', '{}'::jsonb), coalesce((item->>'quartos')::integer, 0),
        nullif(item->>'area_privativa', '')::numeric, coalesce((item->>'vagas')::integer, 0),
        (item->>'valor_tabela')::numeric, item->>'status', coalesce(item->'fluxo_dados', '{}'::jsonb)
      ) returning id into v_unidade_id;
      inseridas := inseridas + 1;
    end if;

    insert into public.historico_tabelas_preco (
      empreendimento_id, unidade_id, codigo_unidade, mes_referencia, ano_referencia, snapshot_id,
      valor_tabela, entrada_sugerida, fluxo_dados, status_unidade, atualizado_em
    ) values (
      p_empreendimento_id, v_unidade_id, item->>'codigo_unidade', p_mes_referencia, p_ano_referencia, v_snapshot_id,
      (item->>'valor_tabela')::numeric, coalesce((item->'fluxo_dados'->>'ato')::numeric, 0),
      coalesce(item->'fluxo_dados', '{}'::jsonb), item->>'status', now()
    );
  end loop;

  return jsonb_build_object(
    'snapshot_id', v_snapshot_id, 'atualizadas', atualizadas, 'inseridas', inseridas,
    'indisponibilizadas', indisponibilizadas, 'historico', atualizadas + inseridas
  );
end;
$$;

revoke all on function public.sincronizar_estoque_importado(text,jsonb,uuid[],integer,integer) from public, anon;
grant execute on function public.sincronizar_estoque_importado(text,jsonb,uuid[],integer,integer) to authenticated;
