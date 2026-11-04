create or replace function public.validar_fluxo_exato_cliente_proposta()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_valores jsonb := coalesce(new.fluxo_snapshot -> 'valores', '{}'::jsonb);
  v_entrada numeric := coalesce(nullif(v_valores ->> 'entrada', '')::numeric, 0);
  v_parcela numeric := coalesce(nullif(v_valores ->> 'parcela', '')::numeric, 0);
  v_parcelas_ate integer := coalesce(nullif(v_valores ->> 'parcelas_ate_chaves', '')::integer, 0);
  v_balao numeric := coalesce(nullif(v_valores ->> 'balao', '')::numeric, 0);
  v_baloes_ate integer := coalesce(nullif(v_valores ->> 'baloes_ate_chaves', '')::integer, 0);
  v_nas_chaves numeric := coalesce(nullif(v_valores ->> 'nas_chaves', '')::numeric, 0);
  v_parcela_pos numeric := coalesce(nullif(v_valores ->> 'parcela_pos_chaves', '')::numeric, 0);
  v_parcelas_pos integer := coalesce(nullif(v_valores ->> 'parcelas_pos_chaves', '')::integer, 0);
  v_balao_pos numeric := coalesce(nullif(v_valores ->> 'balao_pos_chaves', '')::numeric, 0);
  v_baloes_pos integer := coalesce(nullif(v_valores ->> 'baloes_pos_chaves', '')::integer, 0);
  v_financiamento numeric := coalesce(nullif(new.fluxo_snapshot #>> '{distribuicao,financiamento_nas_chaves}', '')::numeric, 0);
  v_total_snapshot numeric;
  v_total_calculado numeric;
begin
  if jsonb_typeof(new.fluxo_snapshot -> 'valores') is distinct from 'object' then
    raise exception 'A composição detalhada do fluxo da proposta é obrigatória.' using errcode = '22023';
  end if;

  if v_entrada < 0 or v_parcela < 0 or v_parcelas_ate < 0
     or v_balao < 0 or v_baloes_ate < 0 or v_nas_chaves < 0
     or v_parcela_pos < 0 or v_parcelas_pos < 0
     or v_balao_pos < 0 or v_baloes_pos < 0 or v_financiamento < 0
     or v_baloes_ate > 120 or v_baloes_pos > 120 then
    raise exception 'A composição do fluxo contém valores ou quantidades inválidos.' using errcode = '22023';
  end if;

  if round(coalesce(new.entrada, 0), 2) <> round(v_entrada, 2)
     or round(coalesce(new.parcela_mensal, 0), 2) <> round(v_parcela, 2)
     or round(coalesce(new.balao, 0), 2) <> round(v_balao, 2)
     or coalesce(new.quantidade_baloes, 0) <> v_baloes_ate then
    raise exception 'Os valores financeiros da proposta não correspondem à composição do fluxo.' using errcode = '22023';
  end if;

  v_total_calculado := round(
    v_entrada
    + v_parcela * v_parcelas_ate
    + v_balao * v_baloes_ate
    + v_nas_chaves
    + v_parcela_pos * v_parcelas_pos
    + v_balao_pos * v_baloes_pos
    + v_financiamento,
    2
  );
  v_total_snapshot := nullif(new.fluxo_snapshot ->> 'total', '')::numeric;

  if new.valor_final is null
     or v_total_snapshot is null
     or round(v_total_snapshot, 2) <> round(new.valor_final, 2)
     or v_total_calculado <> round(new.valor_final, 2) then
    raise exception 'A soma detalhada da proposta precisa fechar exatamente, ao centavo, com o valor final da unidade.' using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function public.validar_fluxo_exato_cliente_proposta() from public, anon, authenticated;

drop trigger if exists trg_cliente_propostas_fluxo_exato on public.cliente_propostas;
create trigger trg_cliente_propostas_fluxo_exato
before insert on public.cliente_propostas
for each row execute function public.validar_fluxo_exato_cliente_proposta();
