export type ClientCapacity = { entrada: number; parcela: number; balao: number };
export type FlowCompatibility = {
  status: "compativel" | "incompativel" | "incompleto";
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

function monthsUntil(value: unknown) {
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

export function analyzeFlow(unit: any, client: ClientCapacity): FlowCompatibility {
  const flow = unit.fluxo_dados || {};
  const enterprise = unit.empreendimentos || {};
  const rules = enterprise.regras_correcao || {};
  const commercial = readCommercialFlow(enterprise);
  const price = n(unit.valor_tabela, unit.preco);
  const months = Math.round(n(flow.meses_ate_chaves, flow.quantidade_parcelas_ate_chaves, flow.numero_parcelas, monthsUntil(enterprise.entrega || enterprise.previsao_entrega || enterprise.data_entrega || unit.data_entrega)));
  const financingPercent = n(flow.percentual_financiamento, rules.percentual_financiamento);
  const preKeysPercent = n(flow.percentual_ate_chaves, flow.percentual_pre_chaves, flow.percentual_durante_obra, commercial.percentual_ate_chaves, rules.percentual_ate_chaves, rules.percentual_pre_chaves, financingPercent ? 100 - financingPercent : 0, percentFromRule(flow.regra_pagamento, flow.regra_pos_chaves, rules.regra_pagamento, rules.regra_pos_chaves));
  const annualBalloons = n(commercial.baloes_por_ano);
  const balloonCount = Math.max(0, Math.round(n(flow.quantidade_baloes, flow.numero_baloes, flow.quantidade_reforcos, annualBalloons && months ? annualBalloons * Math.floor(months / 12) : 0, months ? Math.floor(months / 12) : 0)));
  const entryPercent = n(flow.percentual_ato, commercial.percentual_ato, rules.percentual_ato);
  const mandatoryEntry = n(unit.entrada_sugerida, unit.entrada, flow.ato, flow.entrada, price && entryPercent ? price * entryPercent / 100 : 0);
  const blank: FlowCompatibility = { status: "incompleto", reason: "Cadastre valor, entrega e percentual até as chaves.", months, balloonCount, preKeysPercent, preKeysTarget: 0, suggestedEntry: 0, suggestedInstallment: 0, suggestedBalloon: 0, balanceAtKeys: 0, capacity: 0 };
  if (!price || !months || !preKeysPercent) return blank;

  const preKeysTarget = price * preKeysPercent / 100;
  const capacity = client.entrada + client.parcela * months + client.balao * balloonCount;
  if (mandatoryEntry > client.entrada) return { ...blank, status: "incompativel", reason: `Entrada mínima acima do limite do cliente.`, preKeysTarget, balanceAtKeys: price - preKeysTarget, capacity };
  if (capacity + 0.01 < preKeysTarget) return { ...blank, status: "incompativel", reason: `Capacidade até as chaves abaixo do fluxo exigido.`, preKeysTarget, balanceAtKeys: price - preKeysTarget, capacity };

  const suggestedEntry = Math.min(client.entrada, preKeysTarget);
  let remaining = Math.max(0, preKeysTarget - suggestedEntry);
  const suggestedBalloon = balloonCount ? Math.min(client.balao, remaining / balloonCount) : 0;
  remaining -= suggestedBalloon * balloonCount;
  const suggestedInstallment = months ? remaining / months : 0;
  if (suggestedInstallment > client.parcela + 0.01) return { ...blank, status: "incompativel", reason: "A parcela necessária ultrapassa o limite informado.", preKeysTarget, suggestedEntry, suggestedBalloon, suggestedInstallment, balanceAtKeys: price - preKeysTarget, capacity };
  return { status: "compativel", reason: "O fluxo pode ser distribuído dentro dos limites informados.", months, balloonCount, preKeysPercent, preKeysTarget, suggestedEntry, suggestedInstallment, suggestedBalloon, balanceAtKeys: price - preKeysTarget, capacity };
}
import { readCommercialFlow } from "./realEstateStandard";
