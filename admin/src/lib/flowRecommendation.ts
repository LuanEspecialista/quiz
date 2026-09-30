import { analyzeInvestment, type PaymentPlan } from "./financialEngine";
import { analyzeFlow, type ClientCapacity, type FlowCompatibility } from "./flowCompatibility";

export type ClientObjective = "moradia" | "investimento" | "renda" | "revenda";
export type ClientRisk = "conservador" | "moderado" | "arrojado";

export type RecommendationProfile = ClientCapacity & {
  budget?: number;
  availableCapital?: number;
  minimumLiquidity?: number;
  objective?: ClientObjective;
  risk?: ClientRisk;
  cdiRate?: number;
  horizonMonths?: number;
  annualAppreciation?: number;
  monthlyRent?: number;
  monthlyHoldingCost?: number;
};

export type RecommendationInput = {
  unit: {
    id: string;
    valor_tabela?: number | null;
    area_privativa?: number | null;
    empreendimentos?: {
      nome?: string;
      valorizacao_aa?: number | null;
    };
    fluxo_dados?: Record<string, unknown>;
  };
  profile: RecommendationProfile;
};

export type RecommendationMetric = {
  label: string;
  value: number | null;
  status: "positivo" | "atencao" | "informativo" | "indisponivel";
};

export type RecommendationResult = {
  flow: FlowCompatibility;
  score: number | null;
  label: "melhor_aderencia" | "alternativa" | "requer_ajuste" | "dados_incompletos";
  confidence: "alta" | "media" | "baixa";
  reasons: string[];
  warnings: string[];
  metrics: RecommendationMetric[];
  investment: ReturnType<typeof analyzeInvestment> | null;
  liquidityAfterEntry: number | null;
  concentrationAtKeys: number | null;
};

const number = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const bounded = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));

function buildPlan(input: RecommendationInput, flow: FlowCompatibility): PaymentPlan | null {
  const price = number(input.unit.valor_tabela);
  if (!price || !flow.months || !flow.preKeysTarget) return null;
  return {
    price,
    monthsToKeys: flow.months,
    balloonCount: flow.balloonCount,
    entry: flow.suggestedEntry,
    installment: flow.suggestedInstallment,
    balloon: flow.suggestedBalloon,
    keys: 0,
    postKeys: Math.max(0, flow.balanceAtKeys),
    postKeysMonths: Math.max(12, number(input.profile.horizonMonths) - flow.months || 360),
    postKeysAnnualRate: 0,
    postKeysMode: "parcelas",
  };
}

export function recommendUnit(input: RecommendationInput): RecommendationResult {
  const profile = input.profile;
  const flow = analyzeFlow(input.unit, {
    entrada: number(profile.entrada),
    parcela: number(profile.parcela),
    balao: number(profile.balao),
  });
  const price = number(input.unit.valor_tabela);
  const appreciation = number(profile.annualAppreciation || input.unit.empreendimentos?.valorizacao_aa);
  const horizonMonths = Math.max(flow.months || 0, number(profile.horizonMonths) || 60);
  const cdiRate = number(profile.cdiRate);
  const plan = buildPlan(input, flow);
  const investment = plan && appreciation !== 0 && cdiRate > 0
    ? analyzeInvestment(plan, {
      horizonMonths,
      annualAppreciation: appreciation,
      annualDiscountRate: cdiRate,
      acquisitionCostPct: 4,
      saleCostPct: 6,
      monthlyRent: number(profile.monthlyRent),
      vacancyPct: 8,
      monthlyHoldingCost: number(profile.monthlyHoldingCost),
      cdiRate,
    })
    : null;

  const reasons: string[] = [];
  const warnings: string[] = [];
  if (flow.status === "compativel") reasons.push("Fluxo até as chaves fecha dentro da capacidade informada.");
  else if (flow.status === "proposta") reasons.push("O fluxo pode ser levado para negociação, mas ainda exige ajuste comercial.");
  else if (flow.status === "incompleto") warnings.push("Faltam preço, prazo ou percentual oficial até as chaves.");
  else warnings.push(flow.reason);

  const availableCapital = number(profile.availableCapital);
  const minimumLiquidity = number(profile.minimumLiquidity);
  const liquidityAfterEntry = availableCapital > 0 ? availableCapital - flow.suggestedEntry : null;
  if (minimumLiquidity > 0 && liquidityAfterEntry !== null && liquidityAfterEntry < minimumLiquidity) {
    warnings.push("A entrada reduz a reserva abaixo da liquidez mínima informada.");
  } else if (liquidityAfterEntry !== null) {
    reasons.push("A entrada preserva a reserva mínima informada.");
  }

  const concentrationAtKeys = price > 0 ? bounded(flow.balanceAtKeys / price * 100) : null;
  if (concentrationAtKeys !== null && concentrationAtKeys >= 50) warnings.push("Há concentração relevante de saldo nas chaves/pós-chaves.");
  if (flow.balloonCount > 0 && flow.suggestedBalloon > number(profile.balao) && number(profile.balao) > 0) warnings.push("O balão sugerido supera o limite informado.");

  const budgetDistance = number(profile.budget) > 0 ? Math.abs(price - number(profile.budget)) / number(profile.budget) * 100 : 0;
  if (budgetDistance <= 10 && number(profile.budget) > 0) reasons.push("O preço está próximo da faixa de investimento do cliente.");
  if (profile.objective === "renda" && !number(profile.monthlyRent)) warnings.push("Informe o aluguel líquido para concluir Cap Rate e renda.");
  if (profile.risk === "conservador" && concentrationAtKeys !== null && concentrationAtKeys >= 40) warnings.push("O perfil conservador pede menor concentração de saldo nas chaves.");

  const scoreParts: number[] = [];
  if (flow.status === "compativel") scoreParts.push(35);
  else if (flow.status === "proposta") scoreParts.push(20);
  if (number(profile.budget) > 0) scoreParts.push(Math.max(0, 20 - budgetDistance));
  if (liquidityAfterEntry !== null) scoreParts.push(liquidityAfterEntry >= minimumLiquidity ? 15 : 0);
  if (concentrationAtKeys !== null) scoreParts.push(Math.max(0, 15 - concentrationAtKeys / 10));
  if (investment?.vpl != null && investment.vpl > 0) scoreParts.push(10);
  if (investment?.roi != null && investment.roi > 0) scoreParts.push(5);
  const score = scoreParts.length ? Number(scoreParts.reduce((sum, value) => sum + value, 0).toFixed(2)) : null;
  const confidence = flow.status === "incompleto" || !price ? "baixa" : investment ? "alta" : "media";
  const label = flow.status === "incompleto" ? "dados_incompletos" : score !== null && score >= 70 && warnings.length <= 1 ? "melhor_aderencia" : flow.status === "incompativel" ? "requer_ajuste" : "alternativa";

  const metrics: RecommendationMetric[] = [
    { label: "Entrada", value: flow.suggestedEntry, status: flow.suggestedEntry > number(profile.entrada) && number(profile.entrada) > 0 ? "atencao" : "informativo" },
    { label: "Balão sugerido", value: flow.suggestedBalloon, status: flow.suggestedBalloon > number(profile.balao) && number(profile.balao) > 0 ? "atencao" : "informativo" },
    { label: "Saldo nas chaves", value: flow.balanceAtKeys, status: concentrationAtKeys !== null && concentrationAtKeys >= 50 ? "atencao" : "informativo" },
    { label: "ROI líquido", value: investment?.roi ?? null, status: investment?.roi != null ? investment.roi > 0 ? "positivo" : "atencao" : "indisponivel" },
    { label: "TIR", value: investment?.tir ?? null, status: investment?.tir != null ? investment.tir > cdiRate ? "positivo" : "atencao" : "indisponivel" },
    { label: "VPL", value: investment?.vpl ?? null, status: investment?.vpl != null ? investment.vpl > 0 ? "positivo" : "atencao" : "indisponivel" },
    { label: "Cap Rate líquido", value: investment?.capRateNet ?? null, status: investment?.capRateNet != null ? "informativo" : "indisponivel" },
    { label: "Diferença vs CDI", value: investment?.roi != null && investment.benchmark.net > 0 ? investment.roi - (investment.benchmark.net / Math.max(1, investment.contributions) - 1) * 100 : null, status: investment ? "informativo" : "indisponivel" },
  ];

  return { flow, score, label, confidence, reasons, warnings, metrics, investment, liquidityAfterEntry, concentrationAtKeys };
}
