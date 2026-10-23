begin;

-- Mantém os valores oficiais arredondados da tabela e acrescenta os aliases
-- consumidos pelo CRM. O residual de centavos é aplicado somente à última
-- parcela pós-chaves para que a soma contratual feche exatamente no preço.
with base as (
  select
    u.id,
    u.fluxo_dados as fluxo,
    u.valor_tabela as preco,
    coalesce(u.entrada_valor, (u.fluxo_dados->>'ato')::numeric, 0) as ato,
    coalesce((u.fluxo_dados->>'parcela_obra_valor')::numeric, 0) as parcela_obra,
    coalesce((u.fluxo_dados->>'reforco_obra_valor')::numeric, 0) as reforco_obra,
    coalesce((u.fluxo_dados->>'parcela_pos_chaves_valor')::numeric, 0) as parcela_pos,
    coalesce((u.fluxo_dados->>'reforco_pos_chaves_valor')::numeric, 0) as reforco_pos,
    coalesce((u.fluxo_dados->>'quantidade_parcelas_obra')::numeric, 0) as qtd_obra,
    coalesce((u.fluxo_dados->>'quantidade_reforcos_obra')::numeric, 0) as qtd_reforco_obra,
    coalesce((u.fluxo_dados->>'quantidade_parcelas_pos_chaves')::numeric, 0) as qtd_pos,
    coalesce((u.fluxo_dados->>'quantidade_reforcos_pos_chaves')::numeric, 0) as qtd_reforco_pos
  from public.unidades u
  where u.empreendimento_id = 'pinna'
), calc as (
  select *, round(preco - (ato + parcela_obra*qtd_obra + reforco_obra*qtd_reforco_obra + parcela_pos*qtd_pos + reforco_pos*qtd_reforco_pos), 2) as ajuste
  from base
), payload as (
  select id, fluxo || jsonb_build_object(
    'mensais_obra_qtd', qtd_obra,
    'mensais_obra_val', parcela_obra,
    'baloes_obra_qtd', qtd_reforco_obra,
    'baloes_obra_val', reforco_obra,
    'mensais_pos_qtd', qtd_pos,
    'mensais_pos_val', parcela_pos,
    'baloes_pos_qtd', qtd_reforco_pos,
    'baloes_pos_val', reforco_pos,
    'total_fluxo_tabela', preco,
    'ajuste_arredondamento', ajuste,
    'ultima_parcela_pos_chaves_valor', round(parcela_pos + ajuste, 2),
    'fluxo_reconciliado', true
  ) as novo_fluxo
  from calc
)
update public.unidades u
set fluxo_dados = p.novo_fluxo,
    updated_at = now()
from payload p
where u.id = p.id;

update public.historico_tabelas_preco h
set fluxo_dados = u.fluxo_dados
from public.unidades u
where h.empreendimento_id = 'pinna'
  and h.unidade_id = u.id
  and h.mes_referencia = 10
  and h.ano_referencia = 2026;

commit;
