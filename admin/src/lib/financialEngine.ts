export type PaymentPlan = {
  price: number;
  monthsToKeys: number;
  balloonCount: number;
  entry: number;
  installment: number;
  balloon: number;
  keys: number;
  postKeys: number;
  postKeysMonths?: number;
  postKeysAnnualRate?: number;
  postKeysMode?: "parcelas" | "baloes" | "misto" | "quitacao";
  postKeysBalloonCount?: number;
  postKeysBalloonValue?: number;
  /** Entrada pode ser dividida em atos com datas reais (mês 0 = assinatura). */
  entryStages?: Array<{ month: number; amount: number; label?: string }>;
};

export type CashEvent = { month: number; amount: number; category: string; label?: string };

const safe = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;

export function buildPaymentSchedule(plan: PaymentPlan): CashEvent[] {
  const events: CashEvent[] = [];
  const entryStages = (plan.entryStages || []).filter((stage) => safe(stage.amount) > 0);
  if (entryStages.length) {
    entryStages.forEach((stage, index) => events.push({
      month: Math.max(0, Math.round(safe(stage.month))),
      amount: -safe(stage.amount),
      category: "entrada",
      label: stage.label || (index === 0 ? "Ato" : `Entrada ${index + 1}`),
    }));
  } else if (plan.entry) events.push({ month: 0, amount: -plan.entry, category: "entrada", label: "Ato" });
  for (let month = 1; month <= plan.monthsToKeys; month += 1) {
    if (plan.installment) events.push({ month, amount: -plan.installment, category: "parcela" });
  }
  for (let index = 0; index < plan.balloonCount; index += 1) {
    const month = Math.max(1, Math.round(((index + 1) * plan.monthsToKeys) / Math.max(1, plan.balloonCount + 1)));
    if (plan.balloon) events.push({ month, amount: -plan.balloon, category: "balao" });
  }
  if (plan.keys) events.push({ month: plan.monthsToKeys, amount: -plan.keys, category: "chaves" });
  const postMonths = Math.max(0, Math.round(safe(plan.postKeysMonths)));
  const postMode = plan.postKeysMode || "parcelas";
  if (plan.postKeys > 0 && postMode === "quitacao") {
    events.push({ month: plan.monthsToKeys, amount: -plan.postKeys, category: "pos_chaves_quitacao" });
  } else if (plan.postKeys > 0 && postMode === "baloes") {
    const count = Math.max(1, Math.round(safe(plan.postKeysBalloonCount)) || 1);
    for (let index = 1; index <= count; index += 1) {
      const month = plan.monthsToKeys + Math.max(1, Math.round(index * Math.max(1, postMonths) / count));
      events.push({ month, amount: -(plan.postKeys / count), category: "pos_chaves_balao" });
    }
  } else if (plan.postKeys > 0 && postMode === "misto") {
    const count = Math.max(1, Math.round(safe(plan.postKeysBalloonCount)) || 1);
    const balloonValue = Math.min(plan.postKeys / count, Math.max(0, safe(plan.postKeysBalloonValue)));
    const balloonTotal = balloonValue * count;
    for (let index = 1; index <= count; index += 1) {
      const month = plan.monthsToKeys + Math.max(1, Math.round(index * Math.max(1, postMonths) / count));
      if (balloonValue) events.push({ month, amount: -balloonValue, category: "pos_chaves_balao" });
    }
    const installmentPrincipal = Math.max(0, plan.postKeys - balloonTotal);
    const monthlyRate = Math.pow(1 + Math.max(0, safe(plan.postKeysAnnualRate)) / 100, 1 / 12) - 1;
    const payment = postMonths > 0 ? (monthlyRate > 0 ? installmentPrincipal * monthlyRate / (1 - Math.pow(1 + monthlyRate, -postMonths)) : installmentPrincipal / postMonths) : installmentPrincipal;
    for (let index = 1; index <= postMonths; index += 1) {
      if (payment) events.push({ month: plan.monthsToKeys + index, amount: -payment, category: "pos_chaves_parcela" });
    }
  } else if (plan.postKeys > 0 && postMonths > 0) {
    const monthlyRate = Math.pow(1 + Math.max(0, safe(plan.postKeysAnnualRate)) / 100, 1 / 12) - 1;
    const payment = monthlyRate > 0 ? plan.postKeys * monthlyRate / (1 - Math.pow(1 + monthlyRate, -postMonths)) : plan.postKeys / postMonths;
    for (let index = 1; index <= postMonths; index += 1) events.push({ month: plan.monthsToKeys + index, amount: -payment, category: "pos_chaves" });
  }
  return events.sort((a, b) => a.month - b.month);
}

export function fixedIncomeTaxRate(days: number) {
  if (days <= 180) return .225;
  if (days <= 360) return .20;
  if (days <= 720) return .175;
  return .15;
}

export function benchmarkSameContributions(events: CashEvent[], horizonMonths: number, annualRate: number) {
  return events.filter((event) => event.amount < 0).reduce((result, event) => {
    const principal = -event.amount;
    const heldMonths = Math.max(0, horizonMonths - event.month);
    const gross = principal * Math.pow(1 + annualRate / 100, heldMonths / 12);
    const gain = Math.max(0, gross - principal);
    const tax = gain * fixedIncomeTaxRate(Math.round(heldMonths * 30.4375));
    return { principal: result.principal + principal, gross: result.gross + gross, tax: result.tax + tax, net: result.net + gross - tax };
  }, { principal: 0, gross: 0, tax: 0, net: 0 });
}

export function progressiveCapitalGainsTax(gain: number) {
  let remaining = Math.max(0, gain), tax = 0;
  const bands = [[5_000_000, .15], [5_000_000, .175], [20_000_000, .20], [Infinity, .225]] as const;
  for (const [limit, rate] of bands) {
    const taxable = Math.min(remaining, limit);
    tax += taxable * rate;
    remaining -= taxable;
    if (remaining <= 0) break;
  }
  return tax;
}

export function npv(events: CashEvent[], annualDiscountRate: number) {
  return events.reduce((total, event) => total + event.amount / Math.pow(1 + annualDiscountRate / 100, event.month / 12), 0);
}

export function irr(events: CashEvent[]) {
  const hasNegative = events.some((event) => event.amount < 0), hasPositive = events.some((event) => event.amount > 0);
  if (!hasNegative || !hasPositive) return null;
  let low = -.999, high = 10;
  const value = (rate: number) => events.reduce((total, event) => total + event.amount / Math.pow(1 + rate, event.month / 12), 0);
  if (value(low) * value(high) > 0) return null;
  for (let index = 0; index < 160; index += 1) {
    const middle = (low + high) / 2;
    if (value(low) * value(middle) <= 0) high = middle; else low = middle;
  }
  return ((low + high) / 2) * 100;
}

export function analyzeInvestment(plan: PaymentPlan, assumptions: {
  horizonMonths: number;
  annualAppreciation: number;
  annualDiscountRate: number;
  acquisitionCostPct: number;
  saleCostPct: number;
  monthlyRent: number;
  vacancyPct: number;
  monthlyHoldingCost: number;
  cdiRate: number;
}) {
  const fullSchedule = buildPaymentSchedule(plan);
  const horizon = Math.max(plan.monthsToKeys, assumptions.horizonMonths);
  const schedule = fullSchedule.filter((event) => event.month <= horizon);
  const acquisitionCost = plan.price * safe(assumptions.acquisitionCostPct) / 100;
  if (acquisitionCost) schedule.push({ month: 0, amount: -acquisitionCost, category: "aquisicao" });
  const netMonthlyRent = assumptions.monthlyRent * (1 - assumptions.vacancyPct / 100) - assumptions.monthlyHoldingCost;
  for (let month = plan.monthsToKeys + 1; month <= horizon; month += 1) {
    if (netMonthlyRent) schedule.push({ month, amount: netMonthlyRent, category: "aluguel_liquido" });
  }
  const saleGross = plan.price * Math.pow(1 + assumptions.annualAppreciation / 100, horizon / 12);
  const saleCost = saleGross * assumptions.saleCostPct / 100;
  const taxableGain = Math.max(0, saleGross - saleCost - plan.price - acquisitionCost);
  const gainTax = progressiveCapitalGainsTax(taxableGain);
  const postMonths = Math.max(0, Math.round(safe(plan.postKeysMonths)));
  const postMode = plan.postKeysMode || "parcelas";
  const paidPostMonths = Math.max(0, Math.min(postMonths, horizon - plan.monthsToKeys));
  const monthlyRate = Math.pow(1 + Math.max(0, safe(plan.postKeysAnnualRate)) / 100, 1 / 12) - 1;
  const payment = postMonths > 0 ? (monthlyRate > 0 ? plan.postKeys * monthlyRate / (1 - Math.pow(1 + monthlyRate, -postMonths)) : plan.postKeys / postMonths) : 0;
  const balloonPrincipal = Math.min(plan.postKeys, Math.max(0, safe(plan.postKeysBalloonValue)) * Math.max(1, Math.round(safe(plan.postKeysBalloonCount)) || 1));
  const remainingDebt = postMode === "quitacao" ? 0 : postMode === "baloes"
    ? Math.max(0, plan.postKeys * (1 - paidPostMonths / Math.max(1, postMonths)))
    : postMode === "misto"
      ? Math.max(0, (plan.postKeys - balloonPrincipal) * (1 - paidPostMonths / Math.max(1, postMonths)) + balloonPrincipal * (1 - paidPostMonths / Math.max(1, postMonths)))
    : postMonths <= 0 ? plan.postKeys : monthlyRate > 0
    ? Math.max(0, plan.postKeys * Math.pow(1 + monthlyRate, paidPostMonths) - payment * (Math.pow(1 + monthlyRate, paidPostMonths) - 1) / monthlyRate)
    : Math.max(0, plan.postKeys - payment * paidPostMonths);
  const saleNet = saleGross - saleCost - gainTax - remainingDebt;
  schedule.push({ month: horizon, amount: saleNet, category: "venda_liquida" });
  const contributions = -schedule.filter((event) => event.amount < 0).reduce((sum, event) => sum + event.amount, 0);
  const inflows = schedule.filter((event) => event.amount > 0).reduce((sum, event) => sum + event.amount, 0);
  const profit = inflows - contributions;
  const annualRent = Math.max(0, netMonthlyRent * 12);
  const benchmark = benchmarkSameContributions(schedule.filter((event) => !["aquisicao"].includes(event.category)), horizon, assumptions.cdiRate);
  let cumulative = 0, peakCapital = 0;
  [...schedule].sort((a,b)=>a.month-b.month).forEach((event) => { cumulative += event.amount; peakCapital = Math.max(peakCapital, -cumulative); });
  return {
    schedule, horizon, contributions, inflows, profit,
    roi: contributions ? profit / contributions * 100 : null,
    tir: irr(schedule),
    vpl: npv(schedule, assumptions.annualDiscountRate),
    capRateGross: plan.price ? assumptions.monthlyRent * 12 / plan.price * 100 : null,
    capRateNet: plan.price ? annualRent / (plan.price + acquisitionCost) * 100 : null,
    cashOnCash: contributions ? annualRent / contributions * 100 : null,
    yieldOnCost: plan.price + acquisitionCost ? annualRent / (plan.price + acquisitionCost) * 100 : null,
    peakCapital, saleGross, saleNet, saleCost, gainTax, remainingDebt, benchmark,
    complete: plan.price > 0 && plan.monthsToKeys > 0 && assumptions.horizonMonths >= plan.monthsToKeys,
    comparisonComplete: assumptions.cdiRate > 0 && assumptions.annualAppreciation !== 0,
    rentalComplete: assumptions.monthlyRent > 0 && assumptions.monthlyHoldingCost >= 0,
  };
}
