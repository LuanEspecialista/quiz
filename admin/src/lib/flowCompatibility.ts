export type ClientCapacity = { entrada: number; parcela: number; balao: number };
export type FlowCompatibility = {
  status: "compativel" | "proposta" | "incompativel" | "incompleto";
  reason: string;
  months: number;
  balloonCount: number;
  preKeysPercent: number;
  preKeysTarget: number;
  suggestedEntry: number;
  suggestedInstallment: number;
  suggestedBalloon: number;
  balanceAtKeys: number;
  capacity: number;
  coverage: number;
};

const n = (...values: unknown[]) => {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
};

const monthNames: Record<string, number> = { jan:0, fev:1, mar:2, abr:3, mai:4, jun:5, jul:6, ago:7, set:8, out:9, nov:10, dez:11 };
function deliveryDate(value: unknown) {
  if (!value) return null;
  const raw = String(value).trim().toLowerCase();
  const direct = new Date(raw.length === 7 && /^\d{4}-\d{2}$/.test(raw) ? `${raw}-01T12:00:00` : raw);
  if (!Number.isNaN(direct.getTime())) return direct;
  const match = raw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/([a-z]{3,})\/?(\d{2,4})/);
  if (!match) return null;
  const month = monthNames[match[1].slice(0, 3)];
  let year = Number(match[2]);
  if (year < 100) year += 2000;
  return month === undefined ? null : new Date(year, month, 1, 12);
}

export function monthsUntilDelivery(value: unknown) {
  const date = deliveryDate(value);
  if (!date) return 0;
  const today = new Date();
  return Math.max(1, (date.getFullYear() - today.getFullYear()) * 12 + date.getMonth() - today.getMonth());
}

function percentFromRule(...values: unknown[]) {
  for (const value of values) {
    const raw = String(value || "");
    const split = raw.match(/(\d+(?:[.,]\d+)?)\s*[%/]\s*(\d+(?:[.,]\d+)?)/);
    if (split) return Number(split[1].replace(",", "."));
    const beforeKeys = raw.match(/(\d+(?:[.,]\d+)?)\s*%[^\d]*(?:ate|até)?\s*(?:as)?\s*chaves/i);
    if (beforeKeys) return Number(beforeKeys[1].replace(",", "."));
  }
  return 0;
}

export function getCommercialFlowProfile(unit: any) {
  const flow = unit?.fluxo_dados || {};
  const enterprise = unit?.empreendimentos || {};
  const rules = enterprise.regras_correcao || {};
  const commercial = readCommercialFlow(enterprise);
  const financingPercent = n(flow.percentual_financiamento, flow.percentual_pos_chaves, commercial.percentual_financiamento, commercial.percentual_pos_chaves, rules.percentual_financiamento);
  const distributedPreKeysPercent =
    n(flow.percentual_ato, commercial.percentual_ato, rules.percentual_ato) +
    n(flow.percentual_mensais, flow.percentual_parcelas, commercial.percentual_mensais, commercial.percentual_parcelas, rules.percentual_mensais) +
    n(flow.percentual_baloes, flow.percentual_balao, commercial.percentual_baloes, commercial.percentual_balao, rules.percentual_baloes);
  const preKeysPercent = n(flow.percentual_ate_chaves, flow.percentual_pre_chaves, flow.percentual_durante_obra, commercial.percentual_ate_chaves, commercial.percentual_pre_chaves, rules.percentual_ate_chaves, rules.percentual_pre_chaves, distributedPreKeysPercent, financingPercent ? 100 - financingPercent : 0, percentFromRule(flow.regra_pagamento, flow.regra_pos_chaves, rules.regra_pagamento, rules.regra_pos_chaves));
  if (!preKeysPercent || preKeysPercent >= 100) return null;
  // O filtro usa faixas comerciais padronizadas (10/90, 20/80, 30/70...).
  // O cálculo da unidade mantém o percentual exato, sem arredondar valores.
  const pre = Math.max(0, Math.min(100, Math.round(preKeysPercent / 10) * 10));
  const post = 100 - pre;
  return { preKeysPercent, postKeysPercent: 100 - preKeysPercent, label: `${pre}/${post}` };
}

export function analyzeFlow(unit: any, client: ClientCapacity): FlowCompatibility {
  const flow = unit.fluxo_dados || {};
  const enterprise = unit.empreendimentos || {};
  const rules = enterprise.regras_correcao || {};
  const commercial = readCommercialFlow(enterprise);
  const price = n(unit.valor_tabela, unit.preco);
  const deliveryMonths = monthsUntilDelivery(enterprise.entrega || enterprise.previsao_entrega || enterprise.data_entrega || unit.data_entrega || unit.data_entrega_unidade);
  // A tabela da construtora prevalece quando informa a quantidade contratual
  // de parcelas. A data de entrega é a contingência para produtos sem tabela.
  const months = Math.round(n(flow.meses_ate_chaves, flow.parcelas_antes_chaves, flow.quantidade_parcelas_ate_chaves, flow.numero_parcelas, commercial.parcelas_antes_chaves, deliveryMonths));
  const preKeysPercent = getCommercialFlowProfile(unit)?.preKeysPercent || 0;
  const annualBalloons = n(commercial.baloes_por_ano);
  const balloonCount = Math.max(0, Math.round(n(flow.quantidade_baloes, flow.numero_baloes, flow.quantidade_reforcos, annualBalloons && months ? annualBalloons * Math.floor(months / 12) : 0, months ? Math.floor(months / 12) : 0)));
  const entryPercent = n(flow.percentual_ato, commercial.percentual_ato, rules.percentual_ato);
  // Ato de tabela (normalmente 10%) é uma sugestão de composição, não uma
  // barreira. Só os campos explicitamente "mínimo" bloqueiam uma negociação.
  const suggestedDefaultEntry = n(unit.entrada_sugerida, unit.entrada, flow.ato, flow.entrada, price && entryPercent ? price * entryPercent / 100 : 0);
  const hardMinimumEntry = n(flow.entrada_minima, flow.ato_minimo, flow.valor_minimo_ato, commercial.entrada_minima, commercial.ato_minimo, rules.entrada_minima, rules.ato_minimo);
  const blank: FlowCompatibility = { status: "incompleto", reason: "Cadastre valor, entrega e percentual até as chaves.", months, balloonCount, preKeysPercent, preKeysTarget: 0, suggestedEntry: 0, suggestedInstallment: 0, suggestedBalloon: 0, balanceAtKeys: 0, capacity: 0, coverage: 0 };
  if (!price || !months || !preKeysPercent) return blank;

  const preKeysTarget = price * preKeysPercent / 100;
  // Se o cliente não delimitou entrada, partimos do ato sugerido de tabela.
  // Quando ele delimitou, testamos a entrada dele e redistribuímos o saldo.
  const scenarioEntry = Math.min(preKeysTarget, client.entrada > 0 ? client.entrada : suggestedDefaultEntry);
  const capacity = scenarioEntry + client.parcela * months + client.balao * balloonCount;
  const coverage = preKeysTarget > 0 ? capacity / preKeysTarget : 0;
  // A faixa "proposta" só existe quando o cliente cobre pelo menos 67% do mínimo
  // até as chaves. Não representa aprovação; apenas sinaliza que vale negociar.
  const statusForGap = coverage >= 0.67 ? "proposta" as const : "incompativel" as const;
  if (hardMinimumEntry > 0 && scenarioEntry + 0.01 < hardMinimumEntry) return { ...blank, status: statusForGap, reason: "A entrada mínima expressamente exigida pela construtora supera o limite informado.", preKeysTarget, suggestedEntry: scenarioEntry, balanceAtKeys: price - preKeysTarget, capacity, coverage };

  // Primeiro respeitamos entrada e parcela do cliente. Os balões fecham o
  // restante do percentual até as chaves. É a composição negociável 30/70,
  // 40/60 etc., e não uma reprodução rígida da tabela original.
  const paidByInstallments = client.parcela * months;
  const remainingForBalloons = Math.max(0, preKeysTarget - scenarioEntry - paidByInstallments);
  const requiredBalloon = balloonCount > 0 ? remainingForBalloons / balloonCount : 0;
  const requiredInstallment = balloonCount === 0 && months > 0 ? Math.max(0, preKeysTarget - scenarioEntry) / months : client.parcela;
  const canUseBalloons = balloonCount === 0 ? remainingForBalloons <= 0.01 : requiredBalloon <= client.balao + 0.01;
  const canUseInstallments = client.parcela > 0 || requiredInstallment <= 0.01;
  if (!canUseBalloons || !canUseInstallments || capacity + 0.01 < preKeysTarget) {
    const reason = balloonCount > 0 && requiredBalloon > client.balao + 0.01
      ? `Para fechar o percentual até as chaves, cada balão precisaria ser ${requiredBalloon.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`
      : "A capacidade até as chaves abaixo do fluxo exigido.";
    return { ...blank, status: statusForGap, reason, preKeysTarget, suggestedEntry: scenarioEntry, suggestedBalloon: requiredBalloon, suggestedInstallment: requiredInstallment, balanceAtKeys: price - preKeysTarget, capacity, coverage };
  }
  return { status: "compativel", reason: "O fluxo fecha dentro dos limites informados.", months, balloonCount, preKeysPercent, preKeysTarget, suggestedEntry: scenarioEntry, suggestedInstallment: requiredInstallment, suggestedBalloon: requiredBalloon, balanceAtKeys: price - preKeysTarget, capacity, coverage };
}
import { readCommercialFlow } from "./realEstateStandard";
