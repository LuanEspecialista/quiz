import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarDays, Check, Lock, LockOpen, Plus, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { deliveryDate, deliveryLabelPt } from "@/lib/deliveryDate";
import CurrencyInput from "@/components/CurrencyInput";
import { analyzeFlow } from "@/lib/flowCompatibility";
import { analyzeInvestment, buildPaymentSchedule, type PaymentPlan, type CashEvent } from "@/lib/financialEngine";
import { parseStandardTypology, readCommercialFlow } from "@/lib/realEstateStandard";

type Empreendimento = { id: string; nome?: string; cidade?: string; entrega?: string; entrega_date?: string; previsao_entrega?: string; valorizacao_aa?: number | null; diferenciais?: unknown[]; regras_correcao?: Record<string, unknown>; caracteristicas?: Record<string, unknown> };
type Unidade = { id: string; codigo_unidade?: string; numero_unidade?: string; torre?: string; tipologia?: string; tipologia_dados?: Record<string, unknown>; area_privativa?: number; valor_tabela?: number; status?: string; fluxo_dados?: Record<string, unknown>; empreendimentos?: Empreendimento };
type Indicador = { id: string; nome?: string; sku?: string; categoria?: string; valor?: number; valor_atual?: number; tributacao?: { tipo?: "isento" | "regressivo" | "fixo"; aliquota_fixa?: number; faixas?: Array<{ ate_dias?: number | null; aliquota: number }> } };
type Cenario = "conservador" | "base" | "otimista";

const colors = ["#d6a94f", "#38bdf8", "#34d399", "#c084fc", "#fb7185", "#f97316"];
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
const pct = (value: number) => `${Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% a.a.`;
const n = (value: unknown) => Number(value) || 0;
const firstPositive = (...values: unknown[]) => values.map(Number).find((value) => Number.isFinite(value) && value > 0) || 0;

async function officialNow() {
  const { data, error } = await supabase.rpc("get_server_time");
  if (error || !data) return { date: new Date(), official: false };
  return { date: new Date(data as string), official: true };
}

function deliveryLabel(now: Date, raw?: string) {
  if (!raw) return "Entrega não informada";
  const end = deliveryDate(raw);
  if (!end) return "Entrega não informada";
  const days = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / 86400000));
  if (days === 0 && end.getTime() < now.getTime()) return `Entrega prevista para ${deliveryLabelPt(raw)}`;
  if (days < 31) return days === 1 ? "1 dia para entrega" : `${days} dias para entrega`;
  const months = Math.max(1, Math.round(days / 30.4375));
  return `${months} meses para entrega`;
}

function annualRate(base: number, scenario: Cenario) {
  if (scenario === "conservador") return Math.max(0, base - 3);
  if (scenario === "otimista") return base + 3;
  return base;
}

function taxRate(indicator: Indicador | undefined, days: number) {
  const rule = indicator?.tributacao;
  const taxableFixedIncome = /CDI|CDB|RENDA[_ ]FIXA/i.test(`${indicator?.nome || ""} ${indicator?.sku || ""} ${indicator?.categoria || ""}`);
  if (!rule && !taxableFixedIncome) return 0;
  if (rule?.tipo === "isento") return 0;
  if (rule?.tipo === "fixo") return n(rule.aliquota_fixa);
  const ranges = rule?.faixas?.length ? rule.faixas : [{ ate_dias: 180, aliquota: 22.5 }, { ate_dias: 360, aliquota: 20 }, { ate_dias: 720, aliquota: 17.5 }, { ate_dias: null, aliquota: 15 }];
  return n(ranges.find((range) => range.ate_dias == null || days <= range.ate_dias)?.aliquota);
}

type FlowField = "entrada" | "parcela" | "balao" | "chaves" | "posChaves";
type NegotiatedFlow = Record<FlowField, number>;
const flowLabels: Record<FlowField, string> = { entrada: "Entrada", parcela: "Parcela mensal", balao: "Balão", chaves: "Nas chaves", posChaves: "Pós-chaves" };

function FlowTimeline({ plan, capital, annualRateValue, schedule, horizon }: { plan: PaymentPlan; capital: number; annualRateValue: number; schedule: CashEvent[]; horizon: number }) {
  const width = 900, height = 290, pad = 58;
  const byMonth = new Map<number, CashEvent[]>();
  schedule.filter((event) => event.category !== "venda_liquida").forEach((event) => { const values = byMonth.get(event.month) || []; values.push(event); byMonth.set(event.month, values); });
  let debt = plan.price, freeCash = capital, contributed = 0;
  const monthlyRate = Math.pow(1 + Math.max(0, plan.postKeysAnnualRate || 0) / 100, 1 / 12) - 1;
  const rows = Array.from({ length: horizon + 1 }, (_, month) => {
    (byMonth.get(month) || []).forEach((event) => {
      freeCash += event.amount;
      if (event.amount < 0) contributed += -event.amount;
      const payment = Math.max(0, -event.amount);
      if (["entrada", "parcela", "balao", "chaves", "pos_chaves_balao", "pos_chaves_quitacao"].includes(event.category)) debt = Math.max(0, debt - payment);
      if (["pos_chaves", "pos_chaves_parcela"].includes(event.category)) debt = Math.max(0, debt - Math.max(0, payment - debt * monthlyRate));
    });
    const propertyGross = plan.price * Math.pow(1 + annualRateValue / 100, month / 12);
    const propertyEquity = Math.max(0, propertyGross - debt);
    return { month, freeCash, contributed, propertyGross, propertyEquity, netWorth: freeCash + propertyEquity };
  });
  const values = rows.flatMap((row) => [row.freeCash, row.propertyEquity, row.netWorth, row.propertyGross]);
  const min = Math.min(0, ...values), max = Math.max(1, ...values);
  const x = (month: number) => pad + month / Math.max(1, horizon) * (width - pad * 2);
  const y = (value: number) => height - pad - (value - min) / Math.max(1, max - min) * (height - pad * 2);
  const line = (key: "freeCash" | "propertyEquity" | "netWorth" | "propertyGross") => rows.map((row) => `${x(row.month)},${y(row[key])}`).join(" ");
  const balloonMonths = [...byMonth.entries()].filter(([, events]) => events.some((event) => event.category.includes("balao"))).map(([month]) => month);
  return <div style={{ marginTop: 14, minHeight: 320, border:"1px solid #27272a", borderRadius:8, padding:10, background:"#0a0a0c" }}>
    <strong style={{display:"block",fontSize:12,color:"#d6a94f",marginBottom:4}}>Evolução de liquidez e patrimônio líquido</strong>
    <p style={{fontSize:10,color:"#a1a1aa",margin:"0 0 7px"}}>Balões e parcelas reduzem a liquidez. Quando amortizam o imóvel, trocam caixa por patrimônio imobilizado; custos, juros e desvalorização reduzem o patrimônio líquido total.</p>
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: "100%", height: 260, display: "block" }} role="img" aria-label="Fluxo mensal de liquidez, patrimônio líquido, capital imobilizado e valor bruto do imóvel">
      {[0,.25,.5,.75,1].map((step) => { const value=min+(max-min)*step; return <g key={step}><line x1={pad} x2={width-pad} y1={y(value)} y2={y(value)} stroke="#27272a"/><text x="3" y={y(value)+4} fill="#71717a" fontSize="10">{money(value)}</text></g>; })}
      {balloonMonths.map((month) => <line key={month} x1={x(month)} x2={x(month)} y1={pad-8} y2={height-pad} stroke="#f97316" strokeDasharray="3 5" opacity=".55" />)}
      <polyline fill="none" stroke="#f8fafc" strokeWidth="3.2" points={line("netWorth")} /><polyline fill="none" stroke="#38bdf8" strokeWidth="2.5" points={line("freeCash")} /><polyline fill="none" stroke="#d6a94f" strokeWidth="2.5" points={line("propertyEquity")} /><polyline fill="none" stroke="#71717a" strokeWidth="1.5" strokeDasharray="5 4" points={line("propertyGross")} />
      <text x={x(0)} y={height-14} textAnchor="start" fill="#71717a" fontSize="10">Hoje</text><text x={x(plan.monthsToKeys)} y={height-14} textAnchor="middle" fill="#d6a94f" fontSize="10">Chaves · {plan.monthsToKeys} meses</text><text x={x(horizon)} y={height-14} textAnchor="end" fill="#71717a" fontSize="10">Horizonte</text>
    </svg>
    <div style={{ display:"flex", flexWrap:"wrap", gap:14, fontSize:11, color:"#a1a1aa" }}><span><i style={{display:"inline-block",width:9,height:9,background:"#f8fafc",marginRight:5}}/>Patrimônio líquido total</span><span><i style={{display:"inline-block",width:9,height:9,background:"#38bdf8",marginRight:5}}/>Liquidez disponível</span><span><i style={{display:"inline-block",width:9,height:9,background:"#d6a94f",marginRight:5}}/>Capital imobilizado</span><span><i style={{display:"inline-block",width:9,height:2,background:"#71717a",marginRight:5}}/>Valor bruto do imóvel</span><span><i style={{display:"inline-block",width:9,height:2,background:"#f97316",marginRight:5}}/>Mês de balão</span></div>
    {capital > 0 && rows.some((row) => row.freeCash < 0) && <p style={{color:"#f87171",fontSize:11}}>A liquidez fica negativa neste desenho. A proposta não deve ser apresentada sem ajustar caixa, parcelas, balões ou prazo.</p>}
  </div>;
}

/** Leitura comercial: mostra a necessidade de caixa, não uma valorização teórica. */
function CashRequirementTimeline({ schedule, capital, monthlyNetCash, horizon }: { schedule: CashEvent[]; capital: number; monthlyNetCash: number; horizon: number }) {
  const width = 900, height = 250, pad = 58;
  const paymentEvents = schedule.filter((event) => event.amount < 0 && event.category !== "aquisicao").sort((a, b) => a.month - b.month);
  let paid = 0;
  const hasCashForecast = capital > 0 || monthlyNetCash !== 0;
  const rows = Array.from({ length: Math.max(1, horizon) + 1 }, (_, month) => {
    paymentEvents.filter((event) => event.month === month).forEach((event) => { paid += -event.amount; });
    return { month, paid, freeCash: capital + monthlyNetCash * month - paid };
  });
  const max = Math.max(1, capital, ...rows.map((row) => row.paid), ...(hasCashForecast ? rows.map((row) => row.freeCash) : []));
  const min = hasCashForecast ? Math.min(0, ...rows.map((row) => row.freeCash)) : 0;
  const x = (month: number) => pad + month / Math.max(1, horizon) * (width - pad * 2);
  const y = (value: number) => height - pad - (value - min) / Math.max(1, max - min) * (height - pad * 2);
  const stepLine = (key: "paid" | "freeCash") => rows.map((row, index) => {
    const previous = rows[Math.max(0, index - 1)];
    return index ? `${x(row.month)},${y(previous[key])} ${x(row.month)},${y(row[key])}` : `${x(row.month)},${y(row[key])}`;
  }).join(" ");
  const materialEvents = paymentEvents.filter((event) => /entrada|balao|chaves/i.test(event.category));
  return <section style={{ marginTop: 14, border: "1px solid #3f3219", borderRadius: 8, padding: 11, background: "#0d0d0d" }}>
    <strong style={{ display: "block", color: "#f5d58b", fontSize: 12 }}>Cronograma de desembolso contratado</strong>
    <p style={{ margin: "4px 0 8px", color: "#a1a1aa", fontSize: 11 }}>{hasCashForecast ? "A linha dourada acumula o valor contratado. A azul é apenas uma projeção de saldo baseada na reserva e na receita líquida mensal informadas abaixo." : "A linha dourada mostra somente o valor contratado por data. Não há projeção de saldo porque reserva e receitas mensais ainda não foram informadas."}</p>
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: "100%", height: 220, display: "block" }} role="img" aria-label="Cronograma de caixa comprometido e caixa livre">
      {[0, .25, .5, .75, 1].map((step) => { const value = min + (max - min) * step; return <g key={step}><line x1={pad} x2={width-pad} y1={y(value)} y2={y(value)} stroke="#27272a"/><text x="3" y={y(value)+4} fill="#71717a" fontSize="10">{money(value)}</text></g>; })}
      {materialEvents.map((event, index) => <g key={`${event.category}-${event.month}-${index}`}><line x1={x(event.month)} x2={x(event.month)} y1={pad - 3} y2={height - pad} stroke="#f97316" strokeDasharray="3 5" opacity=".75"/><title>{`${event.label || event.category} · mês ${event.month} · ${money(-event.amount)}`}</title></g>)}
      {hasCashForecast && <polyline fill="none" stroke="#38bdf8" strokeWidth="3" points={stepLine("freeCash")} />}<polyline fill="none" stroke="#d6a94f" strokeWidth="3" points={stepLine("paid")} />
      <text x={x(0)} y={height-13} textAnchor="start" fill="#71717a" fontSize="10">Hoje</text><text x={x(horizon)} y={height-13} textAnchor="end" fill="#71717a" fontSize="10">Horizonte</text>
    </svg>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 13, color: "#a1a1aa", fontSize: 11 }}>{hasCashForecast && <span><i style={{ display:"inline-block",width:9,height:9,background:"#38bdf8",marginRight:5 }}/>Saldo de caixa projetado</span>}<span><i style={{ display:"inline-block",width:9,height:9,background:"#d6a94f",marginRight:5 }}/>Valor comprometido</span><span><i style={{ display:"inline-block",width:9,height:2,background:"#f97316",marginRight:5 }}/>Ato, balão ou chaves</span></div>
    {materialEvents.length > 0 && <div style={{ marginTop: 9, display:"flex", flexWrap:"wrap", gap:6 }}>{materialEvents.slice(0, 8).map((event, index) => <span key={`${event.month}-${index}`} style={{ border:"1px solid #3f3f46", borderRadius:99, padding:"4px 7px", color:"#d4d4d8", fontSize:10 }}>{event.label || event.category} · mês {event.month} · {money(-event.amount)}</span>)}</div>}
  </section>;
}

function FlowNegotiator({ unit, availableCapital, defaultCdiRate, clientId }: { unit: Unidade; availableCapital: number; defaultCdiRate: number; clientId?: string }) {
  const price = n(unit.valor_tabela);
  const analysis = analyzeFlow(unit, { entrada: price, parcela: price, balao: price });
  const raw = unit.fluxo_dados || {};
  const commercial = readCommercialFlow(unit.empreendimentos);
  const [months, setMonths] = useState(Math.max(1, analysis.months || Number(raw.meses_ate_chaves) || 60));
  const [balloonCount, setBalloonCount] = useState(Math.max(0, analysis.balloonCount || Number(raw.quantidade_baloes) || Number(commercial.baloes_por_ano) * Math.max(1,Math.floor((analysis.months||60)/12)) || 0));
  const financingPercent = firstPositive(raw.percentual_financiamento, unit.empreendimentos?.regras_correcao?.percentual_financiamento);
  const preTarget = financingPercent >= 100 ? 0 : analysis.preKeysTarget || price;
  const entryDefault = Math.min(preTarget, firstPositive(raw.ato, raw.entrada, price * .1));
  const installmentDefault = Math.min(Math.max(0,preTarget-entryDefault)/months, firstPositive(raw.parcela_mensal, raw.valor_parcela, raw.parcela) || Math.min(2500, Math.max(0, preTarget-entryDefault) / months));
  const postDefault = Math.max(0, price - preTarget);
  const keysDefault = Math.min(Math.max(0,preTarget-entryDefault-installmentDefault*months),firstPositive(raw.chaves, raw.valor_chaves, raw.parcela_chaves));
  const remainingForBalloons = Math.max(0, price - entryDefault - installmentDefault * months - keysDefault - postDefault);
  const [values, setValues] = useState<NegotiatedFlow>({ entrada: entryDefault, parcela: installmentDefault, balao: balloonCount ? remainingForBalloons / balloonCount : 0, chaves: keysDefault, posChaves: postDefault });
  const [entryActCount, setEntryActCount] = useState(Math.min(12, Math.max(1, Math.round(firstPositive(raw.quantidade_atos, raw.atos_entrada, raw.entrada_parcelada_em) || 1))));
  const [entryActValues, setEntryActValues] = useState<number[]>([]);
  const [showEntrySchedule, setShowEntrySchedule] = useState(false);
  const [locks, setLocks] = useState<Record<FlowField, boolean>>({ entrada:false, parcela:false, balao:false, chaves:false, posChaves:false });
  const [autoField, setAutoField] = useState<FlowField>("posChaves");
  const [monthlyRent, setMonthlyRent] = useState(0);
  const [cashReserve, setCashReserve] = useState(Math.max(0, availableCapital));
  const [recurringIncome, setRecurringIncome] = useState(0);
  const [passiveIncome, setPassiveIncome] = useState(0);
  const [monthlyCommitments, setMonthlyCommitments] = useState(0);
  const [monthlyHoldingCost, setMonthlyHoldingCost] = useState(0);
  const [analysisPurpose, setAnalysisPurpose] = useState<"moradia" | "revenda" | "renda">("moradia");
  const [appreciation, setAppreciation] = useState(n(unit.empreendimentos?.valorizacao_aa));
  const [cdiRate, setCdiRate] = useState(defaultCdiRate);
  const [horizonYears, setHorizonYears] = useState(Math.max(5, Math.ceil(months / 12)));
  const [postKeysMonths, setPostKeysMonths] = useState(Math.round(firstPositive(raw.parcelas_pos_chaves, unit.empreendimentos?.caracteristicas?.fluxo_comercial && (unit.empreendimentos.caracteristicas.fluxo_comercial as Record<string,unknown>).parcelas_pos_chaves)) || 360);
  const [postKeysRate] = useState(firstPositive(raw.juros_pos_chaves_aa, unit.empreendimentos?.regras_correcao?.juros_pos_chaves_aa));
  const [postKeysMode, setPostKeysMode] = useState<"parcelas" | "baloes" | "misto" | "quitacao">("parcelas");
  const [postKeysBalloonCount, setPostKeysBalloonCount] = useState(12);
  const [postKeysBalloonValue, setPostKeysBalloonValue] = useState(0);
  const [savingFlow, setSavingFlow] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  useEffect(()=>{if(cdiRate<=0&&defaultCdiRate>0)setCdiRate(defaultCdiRate)},[cdiRate,defaultCdiRate]);
  useEffect(()=>{if(availableCapital>0)setCashReserve((current)=>current>0?current:availableCapital)},[availableCapital]);
  const fields: FlowField[] = ["entrada","parcela","balao","chaves","posChaves"];
  const factor = (field: FlowField) => field === "parcela" ? months : field === "balao" ? balloonCount : 1;
  const fixedTotal = fields.filter((field) => field !== autoField && factor(field) > 0).reduce((sum, field) => sum + values[field] * factor(field), 0);
  const remainingTotal = Math.max(0, price - fixedTotal);
  const solved = fields.reduce((result, field) => {
    if (locks[field] || factor(field) <= 0) result[field] = factor(field) <= 0 ? 0 : values[field];
    else if (field === autoField) result[field] = remainingTotal / factor(field);
    else result[field] = values[field];
    return result;
  }, {} as NegotiatedFlow);
  const total = fields.reduce((sum, field) => sum + solved[field] * factor(field), 0);
  const entryFixedActs = Array.from({ length: Math.max(0, entryActCount - 1) }, (_, index) => Math.max(0, entryActValues[index] ?? solved.entrada / entryActCount));
  const entryStages = Array.from({ length: entryActCount }, (_, index) => {
    const amount = index === entryActCount - 1 ? Math.max(0, solved.entrada - entryFixedActs.reduce((sum, value) => sum + value, 0)) : entryFixedActs[index];
    return { month: index, amount, label: index === 0 ? "Ato" : `Entrada ${index + 1}` };
  });
  const paidBeforeKeys = solved.entrada + solved.parcela * months + solved.balao * balloonCount + solved.chaves;
  const postKeysInstallment = postKeysMode === "parcelas" && postKeysMonths > 0
    ? (postKeysRate > 0 ? solved.posChaves * (Math.pow(1 + postKeysRate / 100, 1 / 12) - 1) / (1 - Math.pow(1 + (Math.pow(1 + postKeysRate / 100, 1 / 12) - 1), -postKeysMonths)) : solved.posChaves / postKeysMonths)
    : 0;
  const postKeysBalloonTotal = Math.min(solved.posChaves, postKeysBalloonCount * postKeysBalloonValue);
  const postKeysMixedInstallment = postKeysMode === "misto" && postKeysMonths > 0
    ? (postKeysRate > 0 ? (solved.posChaves - postKeysBalloonTotal) * (Math.pow(1 + postKeysRate / 100, 1 / 12) - 1) / (1 - Math.pow(1 + (Math.pow(1 + postKeysRate / 100, 1 / 12) - 1), -postKeysMonths)) : (solved.posChaves - postKeysBalloonTotal) / postKeysMonths)
    : 0;
  const monthlyNetCash = recurringIncome + passiveIncome - monthlyCommitments;
  const shortage = Math.max(0, preTarget - paidBeforeKeys);
  const excess = Math.max(0, fixedTotal - price);
  const valid = !shortage && !excess && Math.abs(total-price) < .02;
  const plan: PaymentPlan = { price, monthsToKeys: months, balloonCount, entry: solved.entrada, entryStages, installment: solved.parcela, balloon: solved.balao, keys: solved.chaves, postKeys: solved.posChaves, postKeysMonths, postKeysAnnualRate:postKeysRate, postKeysMode, postKeysBalloonCount, postKeysBalloonValue };
  const contractedSchedule = buildPaymentSchedule(plan);
  const contractedCashTotal = -contractedSchedule.reduce((sum, event) => sum + Math.min(0, event.amount), 0);
  const distributionDifference = total - price;
  const metrics = analyzeInvestment(plan, { horizonMonths: horizonYears*12, annualAppreciation: appreciation, annualDiscountRate: cdiRate, acquisitionCostPct: 4, saleCostPct: 6, monthlyRent, vacancyPct: 8, monthlyHoldingCost, cdiRate });
  async function saveSimulation() {
    setSavingFlow(true); setSaveMessage("");
    const payload = { unidade_id: unit.id, cliente_id:clientId||null, nome: `${unit.empreendimentos?.nome || "Unidade"} · ${unit.codigo_unidade || unit.numero_unidade || "simulação"}`, cenario: "base", valores: { ...solved, entrada_atos: entryStages }, travas: locks, premissas: { analysisPurpose, monthlyRent, monthlyHoldingCost, appreciation, cdiRate, horizonYears, postKeysMonths, postKeysRate, postKeysMode, postKeysBalloonCount, postKeysBalloonValue, cashReserve, recurringIncome, passiveIncome, monthlyCommitments }, metricas: { tir:metrics.tir, roi:metrics.roi, vpl:metrics.vpl, cap_rate_bruto:metrics.capRateGross, cap_rate_liquido:metrics.capRateNet, cash_on_cash:metrics.cashOnCash, yield_on_cost:metrics.yieldOnCost, pico_capital:metrics.peakCapital }, cronograma: metrics.schedule, status: valid ? "valido" : shortage ? "proposta_construtora" : "incompleto", updated_at:new Date().toISOString() };
    const { error } = await supabase.from("fluxo_simulacoes").insert(payload);
    setSavingFlow(false);
    setSaveMessage(error ? `Não foi possível salvar: ${error.message}` : "Simulação salva e disponível para vincular ao cliente.");
  }
  const toggleLock = (field: FlowField) => {
    if (factor(field) <= 0) {
      setSaveMessage(field === "balao" ? "Defina primeiro a quantidade de balões para negociar este campo." : "Este campo não participa do fluxo atual.");
      return;
    }
    if (field === autoField) {
      const nextAuto = fields.find((candidate) => candidate !== field && factor(candidate) > 0 && !locks[candidate]);
      if (!nextAuto) {
        setSaveMessage("Para travar este campo, deixe ao menos outro campo livre para recalcular o saldo.");
        return;
      }
      setValues((current) => ({ ...current, [field]: solved[field] }));
      setLocks((current) => ({ ...current, [field]: true }));
      setAutoField(nextAuto);
      setSaveMessage(`${flowLabels[field]} travado. ${flowLabels[nextAuto]} passa a fechar o saldo.`);
      return;
    }
    setSaveMessage("");
    setValues((current) => ({ ...current, [field]: solved[field] }));
    setLocks((current) => ({ ...current, [field]: !current[field] }));
  };
  const setManualValue = (field: FlowField, value: number) => {
    if (factor(field) <= 0) {
      setSaveMessage(field === "balao" ? "Defina primeiro a quantidade de balões para negociar este campo." : "Este campo não participa do fluxo atual.");
      return;
    }
    if (locks[field]) {
      setSaveMessage("Este valor está travado. Clique no cadeado para liberar a edição.");
      return;
    }
    if (field === autoField) {
      setSaveMessage("Este campo está calculando o saldo. Escolha outro campo automático para editá-lo.");
      return;
    }
    const committedElsewhere = fields.filter((item)=>item !== field && item !== autoField).reduce((sum,item)=>sum + values[item] * factor(item),0);
    const safeValue = Math.max(0,Math.min(value,(price-committedElsewhere)/Math.max(1,factor(field))));
    setValues((current) => ({ ...current, [field]: safeValue }));
    setSaveMessage("");
  };
  const inputStyle: React.CSSProperties = { width:"100%", boxSizing:"border-box", background:"#09090b", border:"1px solid #3f3f46", color:"#fff", borderRadius:6, padding:8 };
  const executiveMetrics = [["TIR líquida",metrics.tir==null?"Dados insuficientes":`${metrics.tir.toLocaleString("pt-BR",{maximumFractionDigits:2})}% a.a.`],["VPL",metrics.comparisonComplete?money(metrics.vpl):"Informe CDI e valorização"],["ROI líquido",metrics.roi==null?"Dados insuficientes":`${metrics.roi.toLocaleString("pt-BR",{maximumFractionDigits:2})}%`],["Cap rate líquido",metrics.rentalComplete&&metrics.capRateNet!=null?`${metrics.capRateNet.toLocaleString("pt-BR",{maximumFractionDigits:2})}% a.a.`:"Informe aluguel e custos"],["Cash-on-cash",metrics.rentalComplete&&metrics.cashOnCash!=null?`${metrics.cashOnCash.toLocaleString("pt-BR",{maximumFractionDigits:2})}% a.a.`:"Informe aluguel e custos"],["Pico de capital",money(metrics.peakCapital)],["Dívida na saída",money(metrics.remainingDebt)],["CDI líquido equivalente",metrics.comparisonComplete?money(metrics.benchmark.net):"Informe a taxa CDI"],["Venda líquida projetada",money(metrics.saleNet)]];
  const executiveHeadlines = executiveMetrics.filter(([label]) => ["TIR líquida", "VPL", "ROI líquido", "Pico de capital"].includes(String(label)));
  const executiveDetails = executiveMetrics.filter(([label]) => !["TIR líquida", "VPL", "ROI líquido", "Pico de capital"].includes(String(label)));
  return <section className="flow-negotiator" style={{ background:"#0b0b0d", border:"1px solid #29292e", borderRadius:9, padding:10, marginTop:10 }}>
    <style>{`.flow-top-grid{display:grid;grid-template-columns:1fr;gap:8px;margin-top:9px}.flow-executive-rail{position:static;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))}.flow-negotiation-body{min-width:0}.flow-negotiator .flow-payment-card{display:grid;grid-template-columns:minmax(0,.72fr) minmax(0,1.28fr);gap:4px 7px;align-items:center;padding:7px!important}.flow-negotiator .flow-payment-card>div:first-child,.flow-negotiator .flow-payment-card>small{grid-column:1 / -1}.flow-negotiator .flow-payment-card input:not([type=range]){width:100%!important;min-width:0;padding:6px!important;margin-top:0!important}.flow-negotiator .flow-payment-card input[type=range]{width:100%!important;min-width:0;margin-top:0!important;height:13px}.flow-negotiator .flow-payment-card small{line-height:1.1}.flow-negotiator .flow-compact-block{padding:7px!important;margin-top:7px!important}.flow-negotiator .flow-compact-gap{margin-top:9px!important;margin-bottom:5px!important}@media(max-width:980px){.flow-executive-rail{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:620px){.flow-executive-rail{grid-template-columns:1fr}.flow-negotiator .flow-payment-card{grid-template-columns:1fr}.flow-negotiator .flow-payment-card input[type=range]{grid-row:3}}`}</style>
    <div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><h3 style={{fontSize:15,margin:0}}>Simulador inteligente · {unit.empreendimentos?.nome}</h3><p style={{fontSize:12,color:"#a1a1aa",margin:"5px 0 7px"}}>Valor da unidade: {money(price)}</p><div style={{display:"flex",gap:8,flexWrap:"wrap"}}><label style={{fontSize:10,color:"#a1a1aa"}}>Meses até as chaves <input type="number" min="1" max="360" value={months} onChange={(event)=>setMonths(Math.max(1,Math.round(n(event.target.value))))} style={{...inputStyle,width:70,padding:5,marginLeft:4}}/></label><label style={{fontSize:10,color:"#a1a1aa"}}>Quantidade de balões <input type="number" min="0" max="60" value={balloonCount} onChange={(event)=>setBalloonCount(Math.max(0,Math.round(n(event.target.value))))} style={{...inputStyle,width:65,padding:5,marginLeft:4}}/></label></div></div><span style={{alignSelf:"start",padding:"5px 9px",borderRadius:99,border:`1px solid ${valid?"#166534":shortage?"#854d0e":"#7f1d1d"}`,color:valid?"#4ade80":shortage?"#fbbf24":"#f87171",fontSize:11}}>{valid?"Fluxo fecha":shortage?`Abaixo do mínimo em ${money(shortage)}`:`Ajuste os campos livres`}</span></div>
    <div className="flow-top-grid"><aside className="flow-executive-rail" style={{gap:7,background:"#101012",border:"1px solid #29292e",borderRadius:9,padding:9}}><strong style={{fontSize:12,color:"#d6a94f",gridColumn:"1 / -1"}}>Resultado executivo</strong>{executiveHeadlines.map(([label,value])=><div key={String(label)} style={{padding:8,border:"1px solid #27272a",borderRadius:7,background:"#0b0b0d"}}><small style={{color:"#71717a"}}>{label}</small><strong style={{display:"block",marginTop:3,fontSize:12}}>{value}</strong></div>)}<details style={{gridColumn:"1 / -1",fontSize:11,color:"#a1a1aa",paddingTop:2}}><summary style={{cursor:"pointer",color:"#d4d4d8"}}>Ver indicadores complementares</summary><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:7,marginTop:8}}>{executiveDetails.map(([label,value])=><div key={String(label)} style={{padding:8,border:"1px solid #27272a",borderRadius:7,background:"#0b0b0d"}}><small style={{color:"#71717a"}}>{label}</small><strong style={{display:"block",marginTop:3,fontSize:12,color:"#f4f4f5"}}>{value}</strong></div>)}</div></details></aside><div className="flow-negotiation-body">
    <p className="flow-compact-gap" style={{fontSize:12,color:"#d4d4d8"}}><b>1. Durante a obra</b> — entrada primeiro; depois parcelas mensais e balões até as chaves.</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:7}}>{fields.filter((field)=>["entrada","parcela","balao"].includes(field)).map((field) => { const count=factor(field); const inactive=count<=0; const auto=field===autoField; const disabled=inactive||locks[field]||auto; return <div className="flow-payment-card" key={field} style={{border:`1px solid ${auto?"#d6a94f":"#27272a"}`,borderRadius:8,background:auto?"#2a211333":"#121214"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><label style={{fontSize:11,color:"#a1a1aa"}}>{flowLabels[field]}</label><button type="button" disabled={inactive} onClick={()=>toggleLock(field)} title={inactive?"Campo indisponível neste fluxo":locks[field]?"Destravar este valor":"Travar este valor"} style={{background:"transparent",border:0,color:locks[field]?"#d6a94f":"#71717a",cursor:inactive?"not-allowed":"pointer",padding:2,opacity:inactive?.45:1}}>{locks[field]?<Lock size={14}/>:<LockOpen size={14}/>}</button></div><CurrencyInput value={solved[field]} disabled={disabled} onChange={(value)=>setManualValue(field,value)} ariaLabel={flowLabels[field]} style={{...inputStyle,marginTop:5,color:auto?"#f5d58b":"#fff",opacity:disabled?.7:1}}/><input type="range" min="0" max={Math.max(price,1)} step={1000} disabled={disabled} value={Math.min(price,solved[field])} onChange={(event)=>setManualValue(field,Number(event.target.value))} style={{width:"100%",marginTop:4,accentColor:"#d6a94f",opacity:disabled?.55:1}}/><small style={{display:"block",color:"#d6a94f",fontSize:10}}>{inactive?"Defina a quantidade de balões acima":locks[field]?"TRAVADO · clique no cadeado para liberar":auto?"AUTO · fecha o saldo":"LIVRE · digite ou use o slider"}{!auto&&count>1?` · ${count} × ${money(solved[field])} = ${money(solved[field]*count)}`:""}</small></div>; })}</div>
    <div className="flow-compact-block" style={{border:"1px solid #27272a",borderRadius:8,background:"#101012"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}><strong style={{fontSize:11,color:"#d4d4d8"}}>Dividir a entrada em atos</strong><div style={{display:"flex",alignItems:"center",gap:7}}><label style={{fontSize:11,color:"#a1a1aa"}}>Quantidade <input type="number" min="1" max="12" value={entryActCount} onChange={(event)=>{const next=Math.max(1,Math.min(12,Math.round(n(event.target.value))));setEntryActCount(next);setEntryActValues([]);}} style={{...inputStyle,width:55,padding:5,marginLeft:4}}/></label><button type="button" onClick={()=>setShowEntrySchedule((current)=>!current)} style={{...inputStyle,width:"auto",padding:"5px 7px",cursor:"pointer",color:"#f5d58b"}}>{showEntrySchedule?"Ocultar atos":"Detalhar atos"}</button></div></div>{showEntrySchedule&&<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:7,marginTop:7}}>{entryStages.map((stage,index)=>{const automatic=index===entryStages.length-1;return <label key={stage.label} style={{fontSize:11,color:"#a1a1aa"}}>{stage.label} · mês {stage.month}<CurrencyInput value={stage.amount} disabled={automatic} onChange={(value)=>setEntryActValues((old)=>{const next=[...old];const maximum=Math.max(0,solved.entrada-entryFixedActs.reduce((sum,item,itemIndex)=>sum+(itemIndex===index?0:item),0));next[index]=Math.min(Math.max(0,value),maximum);return next;})} style={{...inputStyle,marginTop:4,opacity:automatic?.65:1}}/><small style={{color:automatic?"#d6a94f":"#a1a1aa"}}>{automatic?"AUTO · fecha a entrada":"LIVRE · valor neste ato"}</small></label>;})}</div>}</div>
    <p className="flow-compact-gap" style={{fontSize:12,color:"#d4d4d8"}}><b>2. Chaves e pós-obra</b> — defina o valor nas chaves e, abaixo, como o saldo será cobrado: parcelas, balões, ambos ou quitação.</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:7}}>{fields.filter((field)=>["chaves","posChaves"].includes(field)).map((field) => { const auto=field===autoField; const disabled=locks[field]||auto; return <div className="flow-payment-card" key={field} style={{border:`1px solid ${auto?"#d6a94f":"#27272a"}`,borderRadius:8,background:auto?"#2a211333":"#121214"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><label style={{fontSize:11,color:"#a1a1aa"}}>{field === "posChaves" ? "Saldo pós-chaves" : flowLabels[field]}</label><button type="button" onClick={()=>toggleLock(field)} title={auto?"Travar e passar o cálculo a outro campo":locks[field]?"Destravar este valor":"Travar este valor"} style={{background:"transparent",border:0,color:locks[field]?"#d6a94f":"#71717a",cursor:"pointer",padding:2}}>{locks[field]?<Lock size={14}/>:<LockOpen size={14}/>}</button></div><CurrencyInput value={solved[field]} disabled={disabled} onChange={(value)=>setManualValue(field,value)} ariaLabel={flowLabels[field]} style={{...inputStyle,marginTop:5,color:auto?"#f5d58b":"#fff",opacity:disabled?.7:1}}/><input type="range" min="0" max={Math.max(price,1)} step={1000} disabled={disabled} value={Math.min(price,solved[field])} onChange={(event)=>setManualValue(field,Number(event.target.value))} style={{width:"100%",marginTop:4,accentColor:"#d6a94f",opacity:disabled?.55:1}}/><small style={{display:"block",color:"#d6a94f",fontSize:10}}>{locks[field]?"TRAVADO · clique no cadeado para liberar":auto?"AUTO · clique no cadeado para travar":"LIVRE · digite ou use o slider"}</small></div>; })}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:9,marginTop:9,padding:10,border:"1px solid #27272a",borderRadius:8,background:"#101012"}}><label style={{fontSize:11,color:"#a1a1aa"}}>Como cobrar o pós-chaves<select value={postKeysMode} onChange={(event)=>setPostKeysMode(event.target.value as "parcelas"|"baloes"|"misto"|"quitacao")} style={{...inputStyle,marginTop:5}}><option value="parcelas">Parcelas mensais</option><option value="baloes">Balões pós-chaves</option><option value="misto">Parcelas + balões pós-chaves</option><option value="quitacao">Quitação na entrega</option></select></label>{postKeysMode === "parcelas" && <><label style={{fontSize:11,color:"#a1a1aa"}}>Prazo pós-chaves (meses)<input type="number" min="1" max="480" value={postKeysMonths} onChange={(event)=>setPostKeysMonths(Math.max(1,Math.round(n(event.target.value))))} style={{...inputStyle,marginTop:5}}/></label><div style={{fontSize:11,color:"#a1a1aa",paddingTop:4}}>Parcela estimada<strong style={{display:"block",color:"#fff",fontSize:16,marginTop:5}}>{money(postKeysInstallment)}</strong>{postKeysRate>0&&<small>com juros de {pct(postKeysRate)}</small>}</div></>}{postKeysMode === "baloes" && <><label style={{fontSize:11,color:"#a1a1aa"}}>Quantidade de balões pós-chaves<input type="number" min="1" max="60" value={postKeysBalloonCount} onChange={(event)=>setPostKeysBalloonCount(Math.max(1,Math.round(n(event.target.value))))} style={{...inputStyle,marginTop:5}}/></label><label style={{fontSize:11,color:"#a1a1aa"}}>Prazo pós-chaves (meses)<input type="number" min="1" max="480" value={postKeysMonths} onChange={(event)=>setPostKeysMonths(Math.max(1,Math.round(n(event.target.value))))} style={{...inputStyle,marginTop:5}}/></label><div style={{fontSize:11,color:"#a1a1aa",paddingTop:4}}>Cada balão<strong style={{display:"block",color:"#fff",fontSize:16,marginTop:5}}>{money(solved.posChaves/Math.max(1,postKeysBalloonCount))}</strong></div></>}{postKeysMode === "misto" && <><label style={{fontSize:11,color:"#a1a1aa"}}>Quantidade de balões pós-chaves<input type="number" min="1" max="60" value={postKeysBalloonCount} onChange={(event)=>setPostKeysBalloonCount(Math.max(1,Math.round(n(event.target.value))))} style={{...inputStyle,marginTop:5}}/></label><label style={{fontSize:11,color:"#a1a1aa"}}>Valor de cada balão<CurrencyInput value={postKeysBalloonValue} onChange={(value)=>setPostKeysBalloonValue(Math.min(value,solved.posChaves/Math.max(1,postKeysBalloonCount)))} style={{...inputStyle,marginTop:5}}/><input type="range" min="0" max={Math.max(1,solved.posChaves/Math.max(1,postKeysBalloonCount))} step="100" value={Math.min(postKeysBalloonValue,solved.posChaves/Math.max(1,postKeysBalloonCount))} onChange={(event)=>setPostKeysBalloonValue(Number(event.target.value))} style={{width:"100%",marginTop:7,accentColor:"#d6a94f"}}/></label><label style={{fontSize:11,color:"#a1a1aa"}}>Parcela mensal pós-chaves<CurrencyInput value={postKeysMixedInstallment} onChange={(value)=>setPostKeysBalloonValue(Math.max(0,Math.min(solved.posChaves/Math.max(1,postKeysBalloonCount),(solved.posChaves-value*postKeysMonths)/Math.max(1,postKeysBalloonCount))))} style={{...inputStyle,marginTop:5}}/><input type="range" min="0" max={Math.max(1,solved.posChaves/Math.max(1,postKeysMonths))} step="100" value={Math.min(postKeysMixedInstallment,solved.posChaves/Math.max(1,postKeysMonths))} onChange={(event)=>setPostKeysBalloonValue(Math.max(0,(solved.posChaves-Number(event.target.value)*postKeysMonths)/Math.max(1,postKeysBalloonCount)))} style={{width:"100%",marginTop:7,accentColor:"#d6a94f"}}/></label><label style={{fontSize:11,color:"#a1a1aa"}}>Prazo pós-chaves (meses)<input type="number" min="1" max="480" value={postKeysMonths} onChange={(event)=>setPostKeysMonths(Math.max(1,Math.round(n(event.target.value))))} style={{...inputStyle,marginTop:5}}/></label><div style={{fontSize:11,color:"#a1a1aa",paddingTop:4}}>Balões no total<strong style={{display:"block",color:"#fff",fontSize:16,marginTop:5}}>{money(postKeysBalloonTotal)}</strong></div></>}{postKeysMode === "quitacao" && <div style={{fontSize:11,color:"#a1a1aa",paddingTop:4}}>Saldo será quitado na entrega.<strong style={{display:"block",color:"#fff",fontSize:16,marginTop:5}}>{money(solved.posChaves)}</strong></div>}</div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:8,marginTop:12}}>{[["Pago até as chaves",paidBeforeKeys],["Saldo pós-chaves",solved.posChaves],["Valor da unidade distribuído",total],["Conferência",Math.abs(distributionDifference)<.02?"Fecha exatamente":`Diferença de ${money(Math.abs(distributionDifference))}`]].map(([label,value])=><div key={String(label)} style={{padding:10,border:`1px solid ${label==="Conferência"&&Math.abs(distributionDifference)>=.02?"#7f1d1d":"#27272a"}`,borderRadius:7}}><small style={{color:"#71717a"}}>{label}</small><strong style={{display:"block",marginTop:4,color:label==="Conferência"&&Math.abs(distributionDifference)>=.02?"#f87171":"#fff"}}>{typeof value === "number" ? money(value) : value}</strong></div>)}</div>
    {Math.abs(contractedCashTotal - price) >= .02 && <p style={{fontSize:11,color:"#a1a1aa",margin:"8px 0 0"}}>Desembolso contratual previsto: {money(contractedCashTotal)}. A diferença em relação ao valor de tabela é composta por juros do pós-chaves, quando informados — não é valor oculto.</p>}
    <details style={{marginTop:10,border:"1px solid #27272a",borderRadius:8,padding:"8px 10px",background:"#101012"}}><summary style={{cursor:"pointer",fontSize:12,fontWeight:700,color:"#d4d4d8"}}>Capacidade financeira mensal <span style={{fontWeight:400,color:"#71717a"}}>(opcional)</span></summary><p style={{fontSize:11,color:"#a1a1aa",margin:"7px 0"}}>Preencha somente quando o cliente autorizar a análise. Pode representar casal, empresa ou outra composição de receitas — não pressupõe que ele tenha o valor integral hoje.</p><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(165px,1fr))",gap:8}}><label style={{fontSize:11,color:"#a1a1aa"}}>Reserva disponível hoje<CurrencyInput value={cashReserve} onChange={setCashReserve} style={{...inputStyle,marginTop:5}}/></label><label style={{fontSize:11,color:"#a1a1aa"}}>Receita mensal recorrente<CurrencyInput value={recurringIncome} onChange={setRecurringIncome} style={{...inputStyle,marginTop:5}}/></label><label style={{fontSize:11,color:"#a1a1aa"}}>Renda passiva / outras entradas<CurrencyInput value={passiveIncome} onChange={setPassiveIncome} style={{...inputStyle,marginTop:5}}/></label><label style={{fontSize:11,color:"#a1a1aa"}}>Obrigações mensais atuais<CurrencyInput value={monthlyCommitments} onChange={setMonthlyCommitments} style={{...inputStyle,marginTop:5}}/></label></div><small style={{display:"block",color:monthlyNetCash<0?"#f87171":"#a1a1aa",marginTop:7}}>Disponibilidade mensal considerada: {money(monthlyNetCash)} {monthlyNetCash<0?"· negativa; o saldo projetado não deve ser usado para aprovar a operação.":""}</small></details>
    <CashRequirementTimeline schedule={metrics.schedule} capital={cashReserve} monthlyNetCash={monthlyNetCash} horizon={metrics.horizon} />
    <details style={{marginTop:10,border:"1px solid #27272a",borderRadius:8,padding:"9px 10px",background:"#0d0d0f"}}><summary style={{cursor:"pointer",fontSize:12,fontWeight:700,color:"#d4d4d8"}}>Ver análise técnica: patrimônio, dívida e liquidez</summary><p style={{fontSize:11,color:"#a1a1aa",margin:"7px 0 0"}}>Esta projeção usa valorização de {pct(appreciation)}. Não é usada para prometer retorno: ela deixa explícito o efeito dos pagamentos, do saldo devedor e da premissa de valorização.</p><FlowTimeline plan={plan} capital={availableCapital} annualRateValue={appreciation} schedule={metrics.schedule} horizon={metrics.horizon} /></details></div></div>
    <details style={{marginTop:14,borderTop:"1px solid #27272a",paddingTop:12}}><summary style={{cursor:"pointer",fontWeight:700,fontSize:13}}>Análise de investimento (opcional)</summary><p style={{fontSize:11,color:"#a1a1aa",margin:"8px 0"}}>O fluxo acima já está completo. Preencha abaixo somente se quiser comparar estratégia de moradia, revenda ou renda.</p><div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{([['moradia','Moradia'],['revenda','Revenda'],['renda','Renda com aluguel']] as const).map(([value,label])=><button key={value} type="button" onClick={()=>setAnalysisPurpose(value)} style={{...inputStyle,width:"auto",padding:"7px 10px",cursor:"pointer",borderColor:analysisPurpose===value?"#d6a94f":"#3f3f46",color:analysisPurpose===value?"#f5d58b":"#d4d4d8"}}>{label}</button>)}</div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:9,marginTop:12}}>{analysisPurpose==='renda'&&<><label style={{fontSize:11,color:"#a1a1aa"}}>Aluguel mensal estimado<CurrencyInput value={monthlyRent} onChange={setMonthlyRent} style={{...inputStyle,marginTop:5}}/></label><label style={{fontSize:11,color:"#a1a1aa"}}>Custos mensais estimados<CurrencyInput value={monthlyHoldingCost} onChange={setMonthlyHoldingCost} style={{...inputStyle,marginTop:5}}/></label></>}<label style={{fontSize:11,color:"#a1a1aa"}}>Valorização anual esperada (%)<input type="number" min="-100" step="0.1" value={appreciation||""} onChange={(event)=>setAppreciation(n(event.target.value))} style={{...inputStyle,marginTop:5}}/></label><label style={{fontSize:11,color:"#a1a1aa"}}>Quando pretende sair? (anos)<input type="number" min={Math.ceil(months/12)} max="30" value={horizonYears} onChange={(event)=>setHorizonYears(Math.max(Math.ceil(months/12),n(event.target.value)))} style={{...inputStyle,marginTop:5}}/></label>{analysisPurpose!=="moradia"&&<label style={{fontSize:11,color:"#a1a1aa"}}>Comparar com CDI (% a.a.)<input type="number" min="0" step="0.1" value={cdiRate||""} onChange={(event)=>setCdiRate(n(event.target.value))} style={{...inputStyle,marginTop:5}}/></label>}</div>{analysisPurpose==='moradia'&&<p style={{fontSize:11,color:"#a1a1aa"}}>Para moradia, use o fluxo e o pico de capital. Aluguel, cap rate e comparação com CDI não são necessários.</p>}{analysisPurpose==='renda'&&!metrics.rentalComplete&&<p style={{fontSize:11,color:"#fbbf24"}}>Informe aluguel e custos para calcular cap rate e cash-on-cash.</p>}<div style={{display:"flex",justifyContent:"flex-end",alignItems:"center",gap:10,marginTop:12}}>{saveMessage&&<span style={{fontSize:11,color:saveMessage.startsWith("Não")?"#f87171":"#4ade80"}}>{saveMessage}</span>}<button type="button" disabled={savingFlow} onClick={()=>void saveSimulation()} style={{background:"#d6a94f",color:"#09090b",border:0,borderRadius:7,padding:"9px 12px",fontWeight:700,cursor:"pointer"}}>{savingFlow?"Salvando...":"Salvar simulação"}</button></div></details>
    <p style={{fontSize:11,color:shortage?"#fbbf24":"#71717a",marginBottom:0}}>{shortage?"Este desenho não atende o percentual mínimo cadastrado. Pode ser salvo apenas como proposta sujeita à aprovação da construtora.":"Os valores da unidade sempre são distribuídos entre até as chaves e pós-chaves. Cadeados preservam apenas os valores que você decidir travar."}</p>
  </section>;
}

function FinancialReading({ unit, indicator, years, propertyRate, indicatorRate, capital, acquisitionCost, saleCost, rentYield }: { unit: Unidade; indicator?: Indicador; years: number; propertyRate: number; indicatorRate: number; capital: number; acquisitionCost: number; saleCost: number; rentYield: number }) {
  const price=n(unit.valor_tabela), initialCapital=capital||price, propertyGross=price*Math.pow(1+propertyRate/100,years);
  const acquisition=price*acquisitionCost/100, saleExpense=propertyGross*saleCost/100, rent=propertyGross*rentYield/100*12;
  const propertyNet=propertyGross-saleExpense, propertyGain=propertyNet-price-acquisition+rent;
  const fixedGross=initialCapital*Math.pow(1+indicatorRate/100,years), fixedGrossGain=fixedGross-initialCapital;
  const irRate=taxRate(indicator,years*365), ir=fixedGrossGain*irRate/100, fixedNet=fixedGross-ir;
  const propertyCagr=price+acquisition>0?(Math.pow((propertyNet+rent)/(price+acquisition),1/years)-1)*100:0;
  const cards=[
    ["Capital integral para renda fixa",money(initialCapital),"Disponível desde o primeiro dia"],
    ["Custo estimado do imóvel",money(price+acquisition),`${money(acquisition)} em aquisição/documentação`],
    ["Imóvel líquido no horizonte",money(propertyNet+rent),`${money(saleExpense)} de custo de saída · TIR simplificada ${propertyCagr.toLocaleString("pt-BR",{maximumFractionDigits:2})}% a.a.`],
    [`${indicator?.nome||"Renda fixa"} líquido`,money(fixedNet),`${money(ir)} de IR (${irRate.toLocaleString("pt-BR")}% sobre o rendimento)`],
  ];
  return <div style={{marginTop:16}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:9}}>{cards.map(([label,value,detail])=><article key={label} style={{background:"#0b0b0d",border:"1px solid #29292e",borderRadius:8,padding:12}}><small style={{color:"#8b8b95"}}>{label}</small><strong style={{display:"block",fontSize:18,color:"#fff",margin:"5px 0"}}>{value}</strong><span style={{color:"#71717a",fontSize:11}}>{detail}</span></article>)}</div><p style={{fontSize:11,color:"#71717a",lineHeight:1.55,margin:"10px 0 0"}}>Leitura indicativa: valorização, aluguel, custos e tributação são premissas editáveis. A TIR completa dependerá das datas e valores reais de entrada, parcelas, reforços, chaves, financiamento e venda. Ganho imobiliário estimado após custos: {money(propertyGain)}.</p></div>;
}

function ConsortiumGuarantee({ propertyValue, acceptedPct, existingDebt, consortiumBalance, creditValue, fees, stage }: { propertyValue:number; acceptedPct:number; existingDebt:number; consortiumBalance:number; creditValue:number; fees:number; stage:string }) {
  const accepted=propertyValue*acceptedPct/100, available=Math.max(0,accepted-existingDebt), obligation=consortiumBalance+fees;
  const coverage=obligation>0?available/obligation*100:0, margin=available-obligation;
  const status=!propertyValue||!acceptedPct||!consortiumBalance?"pendente":coverage>=120?"confortavel":coverage>=100?"atencao":"insuficiente";
  const style=status==="confortavel"?{color:"#34d399",border:"#14532d",bg:"#052e162b"}:status==="atencao"?{color:"#fbbf24",border:"#854d0e",bg:"#451a032b"}:status==="insuficiente"?{color:"#f87171",border:"#7f1d1d",bg:"#450a0a33"}:{color:"#a1a1aa",border:"#3f3f46",bg:"#18181b"};
  const label=status==="confortavel"?"Margem de garantia confortável":status==="atencao"?"Garantia no limite informado":status==="insuficiente"?"Garantia insuficiente nesta premissa":"Informe os dados da operação";
  return <div style={{marginTop:12}}><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:8}}>{[["Garantia considerada",accepted],["Garantia líquida",available],["Obrigação coberta",obligation],["Carta de crédito",creditValue]].map(([label,value])=><article key={String(label)} style={{background:"#0b0b0d",border:"1px solid #29292e",borderRadius:8,padding:11}}><small style={{color:"#8b8b95"}}>{label}</small><strong style={{display:"block",fontSize:17,color:"#fff",marginTop:4}}>{money(Number(value))}</strong></article>)}</div><div style={{marginTop:9,padding:12,border:`1px solid ${style.border}`,background:style.bg,borderRadius:8}}><strong style={{color:style.color}}>{label}</strong><span style={{display:"block",fontSize:12,color:"#d4d4d8",marginTop:4}}>Cobertura: {coverage.toLocaleString("pt-BR",{maximumFractionDigits:1})}% · Margem: {money(margin)}</span><small style={{display:"block",color:"#8b8b95",marginTop:6}}>Imóvel pretendido: {stage}. Para imóvel na planta, confirme a garantia substituta, o cronograma de liberação e as regras contratuais da administradora.</small></div></div>;
}

function ProjectionChart({ series, years }: { series: Array<{ name: string; rate: number; capital: number; indicator?: Indicador; kind?: "imovel" | "indicador"; acquisitionCost?: number; saleCost?: number; holdingCost?: number; capitalGainsTax?: number; rentYield?: number }>; years: number }) {
  const width = 900, height = 330, pad = 58;
  const totalMonths = Math.max(12, years * 12);
  const points = series.map((item) => ({ ...item, values: Array.from({ length: totalMonths + 1 }, (_, month) => {
    const elapsedYears = month / 12;
    if (item.kind === "imovel") {
      const initial = item.capital * (1 + n(item.acquisitionCost) / 100);
      if (month === 0) return initial;
      const gross = item.capital * Math.pow(1 + item.rate / 100, elapsedYears);
      const saleExpense = gross * n(item.saleCost) / 100;
      const gain = Math.max(0, gross - item.capital - saleExpense - item.capital * n(item.acquisitionCost) / 100);
      const capitalGains = gain * n(item.capitalGainsTax) / 100;
      const rent = gross * n(item.rentYield) / 100 * month;
      const holding = gross * n(item.holdingCost) / 100 * elapsedYears;
      // Valor líquido de liquidação em cada mês: a curva muda quando custos,
      // renda e tributação passam a produzir efeito, sem ruído artificial.
      return gross - saleExpense - capitalGains + rent - holding;
    }
    const gross = item.capital * Math.pow(1 + item.rate / 100, elapsedYears);
    const gain = gross - item.capital;
    // Para renda fixa, mostra o resgate líquido em cada data (IR no saque, não mensalmente).
    return item.capital + gain * (1 - taxRate(item.indicator, Math.round(month * 30.4375)) / 100);
  }) }));
  const min = Math.min(...points.flatMap((item) => item.values), 0);
  const max = Math.max(...points.flatMap((item) => item.values), 1);
  const x = (month: number) => pad + (month / totalMonths) * (width - pad * 2);
  const y = (value: number) => height - pad - ((value - min) / Math.max(1, max - min)) * (height - pad * 2);
  return <div style={{ width: "100%", overflowX: "hidden" }}>
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", maxWidth: 980, height: "auto", display: "block" }} role="img" aria-label="Evolução mensal do patrimônio líquido projetado">
      {[0, .25, .5, .75, 1].map((step) => { const value = min + (max - min) * step; return <g key={step}><line x1={pad} x2={width-pad} y1={y(value)} y2={y(value)} stroke="#27272a" /><text x={4} y={y(value)+4} fill="#71717a" fontSize="11">{money(value)}</text></g>; })}
      {points.map((item, index) => <polyline key={item.name} fill="none" stroke={colors[index % colors.length]} strokeWidth="3" points={item.values.map((value, month) => `${x(month)},${y(value)}`).join(" ")} />)}
      {Array.from({ length: years + 1 }, (_, year) => <text key={year} x={x(year * 12)} y={height-14} textAnchor="middle" fill="#71717a" fontSize="11">{year === 0 ? "Hoje" : `${year}a`}</text>)}
    </svg>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>{points.map((item, index) => { const final = item.values[item.values.length-1]; return <span key={item.name} style={{ color: "#d4d4d8", fontSize: 12 }}><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 9, background: colors[index % colors.length], marginRight: 6 }} />{item.name}: patrimônio {money(final)} · ganho {money(final-item.capital)}{item.indicator ? " líquido" : " projetado"}</span>; })}</div>
  </div>;
}

export function Fluxos({ initialUnitIds = [], initialClientId }: { initialUnitIds?: string[]; initialClientId?: string }) {
  const [units, setUnits] = useState<Unidade[]>([]);
  const [indicators, setIndicators] = useState<Indicador[]>([]);
  const [selectedUnits, setSelectedUnits] = useState<string[]>(initialUnitIds.slice(0, 4));
  const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]);
  const [scenarioValues, setScenarioValues] = useState<Record<Cenario, Record<string, number>>>({ conservador: {}, base: {}, otimista: {} });
  const [lockedRates, setLockedRates] = useState<Record<Cenario, Record<string, boolean>>>({ conservador: {}, base: {}, otimista: {} });
  const [scenario, setScenario] = useState<Cenario>("base");
  const [years, setYears] = useState(5);
  const [query, setQuery] = useState("");
  const [budget, setBudget] = useState(0);
  const [searchEntry, setSearchEntry] = useState(0);
  const [searchInstallment, setSearchInstallment] = useState(0);
  const [searchBalloon, setSearchBalloon] = useState(0);
  // Não presumimos reserva disponível: só usamos um valor informado no perfil do cliente.
  const [availableCapital,setAvailableCapital]=useState(0);
  const [acquisitionCost,setAcquisitionCost]=useState(4);
  const [saleCost,setSaleCost]=useState(6);
  const [rentYield,setRentYield]=useState(0);
  const [holdingCost,setHoldingCost]=useState(0);
  const [capitalGainsTax,setCapitalGainsTax]=useState(15);
  const [showAllUnits,setShowAllUnits]=useState(false);
  const [guaranteeValue,setGuaranteeValue]=useState(0);
  const [guaranteePct,setGuaranteePct]=useState(0);
  const [guaranteeDebt,setGuaranteeDebt]=useState(0);
  const [consortiumBalance,setConsortiumBalance]=useState(0);
  const [consortiumCredit,setConsortiumCredit]=useState(0);
  const [consortiumFees,setConsortiumFees]=useState(0);
  const [propertyStage,setPropertyStage]=useState("Na planta / sem Habite-se");
  const [consortiumAdministrator,setConsortiumAdministrator]=useState("Embracon");
  const [ruleSource,setRuleSource]=useState("");
  const [rangePct, setRangePct] = useState(20);
  const [bedroomsFilter,setBedroomsFilter]=useState(0);
  const [suitesFilter,setSuitesFilter]=useState(0);
  const [now, setNow] = useState(new Date());
  const [official, setOfficial] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clientContext,setClientContext]=useState("");

  async function load() {
    setLoading(true); setError("");
    const [initialUnitResult, indicatorResult, time] = await Promise.all([
      supabase.from("unidades").select("id,codigo_unidade,numero_unidade,torre,tipologia,tipologia_dados,area_privativa,valor_tabela,status,fluxo_dados,empreendimentos(id,nome,cidade,entrega,entrega_date,previsao_entrega,valorizacao_aa,diferenciais,regras_correcao,caracteristicas)").order("created_at", { ascending: false }),
      supabase.from("indicadores").select("id,nome,sku,categoria,valor,valor_atual,tributacao").order("nome"),
      officialNow(),
    ]);
    // Compatibilidade durante a implantação: uma coluna nova não pode derrubar
    // toda a busca enquanto a migração ainda não chegou ao banco remoto.
    let unitResult: { data: unknown; error: { message: string } | null } = initialUnitResult;
    if (initialUnitResult.error && /entrega_date|schema cache|column/i.test(initialUnitResult.error.message || "")) {
      unitResult = await supabase.from("unidades").select("id,codigo_unidade,numero_unidade,torre,tipologia,tipologia_dados,area_privativa,valor_tabela,status,fluxo_dados,empreendimentos(id,nome,cidade,entrega,previsao_entrega,valorizacao_aa,diferenciais,regras_correcao,caracteristicas)").order("created_at", { ascending: false });
    }
    if (unitResult.error) setError("Não foi possível carregar as unidades. Confira se as atualizações do banco foram aplicadas."); else setUnits((unitResult.data || []) as unknown as Unidade[]);
    if (indicatorResult.error) setError((current) => current || "Os indicadores financeiros estão temporariamente indisponíveis."); else setIndicators((indicatorResult.data || []) as Indicador[]);
    setNow(time.date); setOfficial(time.official); setLoading(false);
  }
  useEffect(() => { void load(); const timer = window.setInterval(() => void officialNow().then((value) => { setNow(value.date); setOfficial(value.official); }), 3600000); return () => window.clearInterval(timer); }, []);
  useEffect(()=>{if(!initialClientId)return;void supabase.from("clientes").select("nome,faixa_investimento,entrada_disponivel").eq("id",initialClientId).maybeSingle().then(({data})=>{if(!data)return;setClientContext(String(data.nome||""));if(n(data.faixa_investimento)>0)setBudget(n(data.faixa_investimento));if(n(data.entrada_disponivel)>0)setAvailableCapital(n(data.entrada_disponivel))})},[initialClientId]);
  useEffect(() => {
    const ids = initialUnitIds.slice(0, 4);
    if (ids.length) {
      setSelectedUnits(ids);
      setShowAllUnits(false);
    }
  }, [initialUnitIds]);

  const visibleUnits = useMemo(() => units.filter((unit) => {
    const hasCapacitySearch = searchEntry > 0 || searchInstallment > 0 || searchBalloon > 0;
    const hasSearch = query.trim().length >= 2 || budget > 0 || hasCapacitySearch || initialUnitIds.length > 0;
    if (!hasSearch) return false;
    if (!showAllUnits && initialUnitIds.length && !initialUnitIds.includes(unit.id)) return false;
    const matchesText = `${unit.empreendimentos?.nome} ${unit.codigo_unidade} ${unit.torre} ${unit.tipologia}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"));
    const productTypology=unit.tipologia_dados?.produto as Record<string,unknown>|undefined;
    const typology=parseStandardTypology(unit.tipologia||productTypology?.tipologia_padrao,Number(productTypology?.dormitorios)||0);
    const matchesTypology=(!bedroomsFilter||typology.dormitorios>=bedroomsFilter)&&(!suitesFilter||typology.suites>=suitesFilter);
    const status = String(unit.status || "").toLocaleLowerCase("pt-BR");
    const available = !status || status.includes("dispon");
    if (!budget && !hasCapacitySearch) return matchesText && available && matchesTypology;
    if (hasCapacitySearch) {
      const compatibility = analyzeFlow(unit, { entrada: searchEntry, parcela: searchInstallment, balao: searchBalloon });
      const fitsBudget = !budget || (n(unit.valor_tabela) >= budget * (1 - rangePct / 100) && n(unit.valor_tabela) <= budget * (1 + rangePct / 100));
      return matchesText && available && matchesTypology && fitsBudget && compatibility.status === "compativel";
    }
    const price = n(unit.valor_tabela);
    const variation = rangePct / 100;
    return matchesText && available && matchesTypology && price >= budget * (1 - variation) && price <= budget * (1 + variation);
  }).sort((a, b) => {
    if (searchEntry > 0 || searchInstallment > 0 || searchBalloon > 0) {
      const aFlow = analyzeFlow(a, { entrada: searchEntry, parcela: searchInstallment, balao: searchBalloon });
      const bFlow = analyzeFlow(b, { entrada: searchEntry, parcela: searchInstallment, balao: searchBalloon });
      return (aFlow.capacity - aFlow.preKeysTarget) - (bFlow.capacity - bFlow.preKeysTarget);
    }
    return budget ? Math.abs(n(a.valor_tabela) - budget) - Math.abs(n(b.valor_tabela) - budget) : 0;
  }).slice(0, 30), [units, query, budget, rangePct, bedroomsFilter, suitesFilter, showAllUnits, initialUnitIds, searchEntry, searchInstallment, searchBalloon]);
  const chosenUnits = selectedUnits.map((id) => units.find((unit) => unit.id === id)).filter(Boolean) as Unidade[];
  const chosenIndicators = selectedIndicators.map((id) => indicators.find((item) => item.id === id)).filter(Boolean) as Indicador[];
  const currentCdiRate = n(indicators.find((item)=>/CDI/i.test(`${item.nome||""} ${item.sku||""}`))?.valor_atual ?? indicators.find((item)=>/CDI/i.test(`${item.nome||""} ${item.sku||""}`))?.valor);
  const series = [
    ...chosenUnits.map((unit) => { const base = n(unit.empreendimentos?.valorizacao_aa); const key=`u:${unit.id}`; return { name: `${unit.empreendimentos?.nome || "Empreendimento"} · ${unit.codigo_unidade || unit.numero_unidade}`, rate: scenarioValues[scenario][key] ?? annualRate(base, scenario), capital: n(unit.valor_tabela), kind: "imovel" as const, acquisitionCost, saleCost, holdingCost, capitalGainsTax, rentYield }; }),
    ...chosenIndicators.map((item) => { const base = n(item.valor_atual ?? item.valor); const key=`i:${item.id}`; return { name: item.nome || item.sku || "Indicador", rate: scenarioValues[scenario][key] ?? annualRate(base, scenario), capital: budget || n(chosenUnits[0]?.valor_tabela) || 100000, indicator: item }; }),
  ];
  const toggleUnit = (id: string) => setSelectedUnits((old) => old.includes(id) ? old.filter((value) => value !== id) : old.length < 4 ? [...old, id] : old);
  const toggleIndicator = (id: string) => setSelectedIndicators((old) => old.includes(id) ? old.filter((value) => value !== id) : [...old, id]);
  const card: React.CSSProperties = { background: "#101012", border: "1px solid #27272a", borderRadius: 10, padding: 16 };
  const button: React.CSSProperties = { background: "#18181b", border: "1px solid #3f3f46", color: "#e4e4e7", borderRadius: 7, padding: "9px 12px", cursor: "pointer" };

  return <div style={{ color: "#f4f4f5" }}>
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 18 }}><div><h1 style={{ margin: 0, fontSize: 24 }}>Fluxos e recomendações{clientContext?` · ${clientContext}`:""}</h1><p style={{ color: "#a1a1aa", margin: "5px 0 0" }}>{clientContext?"Orçamento e capital foram carregados do perfil do cliente.":"Encontre unidades compatíveis com o investimento e compare somente o que deseja apresentar."}</p></div><div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ color: "#71717a", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}><CalendarDays size={14} />{now.toLocaleDateString("pt-BR")} · {official ? "dados atualizados" : "horário local"}</span><button style={button} onClick={() => void load()}><RefreshCw size={15} /> Atualizar</button></div></header>
    {error && <div style={{ ...card, borderColor: "#7f1d1d", color: "#fca5a5", marginBottom: 16 }}>{error}</div>}
    <section style={card}><div style={{ display: "grid", gridTemplateColumns: "minmax(220px,1fr) minmax(300px,2fr)", gap: 14, alignItems: "end" }}><label style={{ color: "#a1a1aa", fontSize: 12 }}>Quanto você planeja investir?<CurrencyInput value={budget} onChange={setBudget} style={{ width: "100%", boxSizing: "border-box", marginTop: 6, background: "#09090b", color: "#fff", border: "1px solid #3f3f46", borderRadius: 7, padding: 11 }} /></label><div><span style={{ color: "#a1a1aa", fontSize: 12 }}>Amplitude da busca</span><div style={{ display: "flex", gap: 7, marginTop: 6 }}>{[10, 15, 20].map((value) => <button key={value} onClick={() => setRangePct(value)} style={{ ...button, borderColor: rangePct === value ? "#d6a94f" : "#3f3f46", color: rangePct === value ? "#f5d58b" : "#a1a1aa" }}>± {value}%</button>)}</div></div></div>{budget > 0 && <p style={{ color: "#a1a1aa", fontSize: 12, margin: "12px 0 0" }}>Buscando opções entre {money(budget * (1-rangePct/100))} e {money(budget * (1+rangePct/100))}. A compatibilidade final também dependerá da entrada, parcelas e reforços.</p>}</section>
    <details style={{ ...card, marginTop: 12 }}><summary style={{ cursor:"pointer", color:"#f5d58b", fontWeight:700, fontSize:12 }}>Buscar pela capacidade de pagamento</summary><p style={{color:"#a1a1aa",fontSize:11,margin:"8px 0"}}>Use quando o cliente definiu caixa, parcela e balão. O motor encontra unidades cujo percentual exigido até as chaves pode ser distribuído nesses limites — não precisa coincidir com o fluxo publicado.</p><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:9}}><label style={{fontSize:11,color:"#a1a1aa"}}>Entrada máxima<CurrencyInput value={searchEntry} onChange={setSearchEntry} style={{width:"100%",boxSizing:"border-box",marginTop:5,background:"#09090b",color:"#fff",border:"1px solid #3f3f46",borderRadius:7,padding:9}}/></label><label style={{fontSize:11,color:"#a1a1aa"}}>Parcela mensal máxima<CurrencyInput value={searchInstallment} onChange={setSearchInstallment} style={{width:"100%",boxSizing:"border-box",marginTop:5,background:"#09090b",color:"#fff",border:"1px solid #3f3f46",borderRadius:7,padding:9}}/></label><label style={{fontSize:11,color:"#a1a1aa"}}>Balão máximo<CurrencyInput value={searchBalloon} onChange={setSearchBalloon} style={{width:"100%",boxSizing:"border-box",marginTop:5,background:"#09090b",color:"#fff",border:"1px solid #3f3f46",borderRadius:7,padding:9}}/></label></div></details>
    <section style={{ ...card, marginTop: 12 }}><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",marginBottom:10}}><h2 style={{ fontSize: 15, margin: 0 }}>1. {showAllUnits ? "Unidades disponíveis" : "Unidades trazidas da seleção"} {budget > 0 || searchEntry > 0 || searchInstallment > 0 || searchBalloon > 0 ? `· ${visibleUnits.length} encontradas` : "· escolha até 4"}</h2>{initialUnitIds.length>0&&<button onClick={()=>setShowAllUnits((value)=>!value)} style={{...button,padding:"7px 9px",fontSize:11}}>{showAllUnits?"Voltar às selecionadas":"Adicionar outra unidade"}</button>}</div><div style={{display:"grid",gridTemplateColumns:"minmax(240px,1fr) 150px 150px",gap:8,marginBottom:12}}><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar empreendimento, unidade ou tipologia" style={{ width: "100%", boxSizing: "border-box", background: "#09090b", color: "#fff", border: "1px solid #3f3f46", borderRadius: 7, padding: 11 }} /><select value={bedroomsFilter} onChange={e=>setBedroomsFilter(Number(e.target.value))} style={button}><option value={0}>Quartos: todos</option>{[1,2,3,4,5].map(value=><option key={value} value={value}>{value}+ quartos</option>)}</select><select value={suitesFilter} onChange={e=>setSuitesFilter(Number(e.target.value))} style={button}><option value={0}>Suítes: todas</option>{[1,2,3,4].map(value=><option key={value} value={value}>{value}+ suítes</option>)}</select></div>
      {loading ? <p>Carregando...</p> : visibleUnits.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 10 }}>{visibleUnits.map((unit) => { const selected = selectedUnits.includes(unit.id); const distance = budget ? Math.abs(n(unit.valor_tabela)-budget)/budget*100 : 0; return <button key={unit.id} onClick={() => toggleUnit(unit.id)} style={{ ...button, textAlign: "left", borderColor: selected ? "#d6a94f" : "#27272a", background: selected ? "#2a2113" : "#141416" }}><span style={{ float: "right" }}>{selected ? <Check size={16} /> : <Plus size={16} />}</span><strong>{unit.empreendimentos?.nome || "Sem empreendimento"}</strong><small style={{ display: "block", color: "#a1a1aa", marginTop: 5 }}>Un. {unit.codigo_unidade || unit.numero_unidade || "—"} · {unit.tipologia || String(unit.tipologia_dados?.nome_original || "Tipologia não informada")}</small><b style={{ display: "block", color: "#34d399", marginTop: 8 }}>{money(n(unit.valor_tabela))}</b>{budget > 0 && <small style={{ display: "block", marginTop: 4, color: distance <= 10 ? "#34d399" : "#d6a94f" }}>{distance <= 10 ? "Muito próxima da preferência" : "Alternativa na faixa ampliada"}</small>}</button>; })}</div> : <div style={{ color: "#a1a1aa", padding: 18, textAlign: "center" }}>Nenhuma unidade disponível nesta faixa. Amplie a busca ou ajuste o investimento.</div>}
    </section>
    {chosenUnits.length === 0 ? <section style={{ ...card, marginTop: 16, minHeight: 210, display: "grid", placeItems: "center", textAlign: "center", color: "#71717a" }}><div><BarChart3 size={42} style={{ margin: "0 auto 12px" }} /><strong style={{ color: "#d4d4d8" }}>Tela pronta para uma nova apresentação</strong><p>Escolha uma ou mais unidades acima para abrir fluxo, diferenças e gráficos.</p></div></section> : <>
      <section style={{ ...card, marginTop: 16 }}><h2 style={{ fontSize: 15, marginTop: 0 }}>2. Compare diferenciais e prazo</h2><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>{chosenUnits.map((unit) => <article key={unit.id} style={{ border: "1px solid #27272a", borderRadius: 8, padding: 13 }}><button title="Remover" onClick={() => toggleUnit(unit.id)} style={{ ...button, float: "right", padding: 5 }}><X size={14} /></button><strong>{unit.empreendimentos?.nome}</strong><p style={{ color: "#a1a1aa", fontSize: 13 }}>{unit.tipologia || "Tipologia não informada"} · {unit.area_privativa || "—"} m² · {unit.torre || "Torre não informada"}</p><p style={{ color: "#d6a94f", fontSize: 13 }}>{deliveryLabel(now, unit.empreendimentos?.entrega_date || unit.empreendimentos?.entrega || unit.empreendimentos?.previsao_entrega)}</p><p style={{ fontSize: 12, color: "#a1a1aa" }}>{Array.isArray(unit.empreendimentos?.diferenciais) && unit.empreendimentos!.diferenciais!.length ? unit.empreendimentos!.diferenciais!.slice(0, 4).map((value) => typeof value === "string" ? value : JSON.stringify(value)).join(" · ") : "Diferenciais ainda não cadastrados"}</p></article>)}</div></section>
      <section style={{ ...card, marginTop: 16 }}><h2 style={{ fontSize: 15, marginTop: 0 }}>3. Adicione referências financeiras</h2><p style={{ color: "#a1a1aa", fontSize: 12 }}>Os valores-base vêm de Indicadores. Alterações abaixo valem apenas nesta apresentação e não são salvas.</p><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{indicators.map((item) => <button key={item.id} onClick={() => toggleIndicator(item.id)} style={{ ...button, borderColor: selectedIndicators.includes(item.id) ? "#d6a94f" : "#3f3f46" }}>{selectedIndicators.includes(item.id) ? <Check size={13} /> : <Plus size={13} />} {item.nome || item.sku} · {pct(n(item.valor_atual ?? item.valor))}</button>)}</div></section>
      <section style={{ ...card, marginTop: 16 }}><h2 style={{ fontSize: 15, marginTop: 0 }}>4. Negocie o fluxo por unidade</h2><p style={{ color: "#a1a1aa", fontSize: 12 }}>Caixas e sliders atuam juntos. Cadeados preservam as decisões do cliente e o campo destravado fecha o saldo automaticamente.</p>{chosenUnits.map((unit)=><FlowNegotiator key={unit.id} unit={unit} availableCapital={availableCapital} defaultCdiRate={currentCdiRate} clientId={initialClientId}/>)}</section>
      <details style={{ ...card, marginTop: 16 }}><summary style={{cursor:"pointer",fontWeight:700}}>Análise avançada e cenários</summary><section style={{marginTop:14}}><div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}><div><h2 style={{ fontSize: 15, margin: 0 }}>Patrimônio projetado</h2><p style={{ color: "#a1a1aa", fontSize: 12 }}>Imóveis mostram o valor líquido caso a venda ocorra em cada ano: custos de compra, manutenção, saída e imposto ficam explícitos. Renda fixa mostra o valor líquido de resgate.</p></div><div style={{ display: "flex", gap: 7 }}>{(["conservador","base","otimista"] as Cenario[]).map((value) => <button key={value} onClick={() => setScenario(value)} style={{ ...button, borderColor: scenario === value ? "#d6a94f" : "#3f3f46", textTransform: "capitalize" }}>{value}</button>)}</div></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 10, margin: "12px 0" }}>{series.map((item, index) => { const key = index < chosenUnits.length ? `u:${chosenUnits[index].id}` : `i:${chosenIndicators[index-chosenUnits.length].id}`; const locked=Boolean(lockedRates[scenario][key]); return <label key={key} style={{ fontSize: 12, color: "#a1a1aa" }}>{item.name}<span style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 5 }}><SlidersHorizontal size={14} /><input type="number" step="0.1" value={item.rate} disabled={locked} onChange={(event) => setScenarioValues((old) => ({ ...old, [scenario]: { ...old[scenario], [key]: n(event.target.value) } }))} style={{ width: 90, background: "#09090b", border: "1px solid #3f3f46", color: locked ? "#71717a" : "#fff", borderRadius: 6, padding: 7 }} /> % a.a.<button type="button" title={locked ? "Destravar taxa neste cenário" : "Travar taxa neste cenário"} onClick={() => setLockedRates((old) => ({ ...old, [scenario]: { ...old[scenario], [key]: !locked } }))} style={{ ...button, padding: 7, color: locked ? "#d6a94f" : "#71717a" }}>{locked ? <Lock size={13}/> : <LockOpen size={13}/>}</button></span></label>; })}</div>
        <label style={{ color: "#a1a1aa", fontSize: 12 }}>Horizonte: <select value={years} onChange={(event) => setYears(Number(event.target.value))} style={{ ...button, marginLeft: 7 }}>{[1,2,3,5,10].map((value) => <option key={value} value={value}>{value} {value === 1 ? "ano" : "anos"}</option>)}</select></label>
        <ProjectionChart series={series} years={years} />
        <div style={{marginTop:16,paddingTop:14,borderTop:"1px solid #27272a"}}><h3 style={{fontSize:14,margin:"0 0 5px"}}>Premissas para uma comparação honesta</h3><p style={{color:"#8b8b95",fontSize:12,margin:"0 0 11px"}}>O gráfico não assume retorno perfeito: revise os custos reais da operação. O imposto sobre ganho de capital pode mudar por isenções e regras específicas; confirme com contador antes da apresentação final.</p><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:9}}>{[["Capital disponível",availableCapital,setAvailableCapital,10000],["Aquisição/documentação (%)",acquisitionCost,setAcquisitionCost,.1],["Venda/corretagem (%)",saleCost,setSaleCost,.1],["Custo anual (condomínio/IPTU/vacância) (%)",holdingCost,setHoldingCost,.01],["IR sobre ganho de capital (%)",capitalGainsTax,setCapitalGainsTax,.1],["Renda líquida mensal (%)",rentYield,setRentYield,.01]] .map(([label,value,setter,step])=><label key={String(label)} style={{fontSize:11,color:"#a1a1aa"}}>{String(label)}{String(label)==="Capital disponível"?<CurrencyInput value={Number(value)} onChange={(next)=>(setter as React.Dispatch<React.SetStateAction<number>>)(next)} style={{width:"100%",boxSizing:"border-box",marginTop:5,background:"#09090b",border:"1px solid #3f3f46",color:"#fff",borderRadius:6,padding:8}}/>:<input type="number" min="0" step={Number(step)} value={Number(value)||""} onChange={(event)=>(setter as React.Dispatch<React.SetStateAction<number>>)(Math.max(0,n(event.target.value)))} style={{width:"100%",boxSizing:"border-box",marginTop:5,background:"#09090b",border:"1px solid #3f3f46",color:"#fff",borderRadius:6,padding:8}}/>}</label>)}</div></div>
        {chosenUnits[0]&&<FinancialReading unit={chosenUnits[0]} indicator={chosenIndicators[0]} years={years} propertyRate={series[0]?.rate||0} indicatorRate={series[chosenUnits.length]?.rate||0} capital={availableCapital} acquisitionCost={acquisitionCost} saleCost={saleCost} rentYield={rentYield}/>}
      </section></details>
      <details style={{...card,marginTop:16}}><summary style={{cursor:"pointer",fontWeight:700}}>Consórcio e garantia (opcional)</summary><section style={{marginTop:14}}><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><h2 style={{fontSize:15,margin:0}}>Consórcio com imóvel próprio em garantia</h2><p style={{fontSize:12,color:"#a1a1aa",margin:"5px 0 0"}}>Modele uma carta contemplada sem tratar 100% da avaliação como garantia disponível.</p></div><span style={{fontSize:11,color:"#fbbf24",border:"1px solid #854d0e",borderRadius:99,padding:"5px 9px"}}>Sujeito à administradora</span></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(205px,1fr))",gap:9,marginTop:13}}>{[
        ["Imóvel próprio avaliado",guaranteeValue,setGuaranteeValue,10000],
        ["Percentual aceito (%)",guaranteePct,setGuaranteePct,.1],
        ["Dívida atual do imóvel",guaranteeDebt,setGuaranteeDebt,1000],
        ["Saldo devedor do consórcio",consortiumBalance,setConsortiumBalance,1000],
        ["Carta contemplada",consortiumCredit,setConsortiumCredit,1000],
        ["Custos e taxas da operação",consortiumFees,setConsortiumFees,100],
      ].map(([label,value,setter,step])=><label key={String(label)} style={{fontSize:11,color:"#a1a1aa"}}>{String(label)}{String(label).includes("(%)")?<input type="number" min="0" step={Number(step)} value={Number(value)||""} onChange={(event)=>(setter as React.Dispatch<React.SetStateAction<number>>)(Math.max(0,n(event.target.value)))} style={{width:"100%",boxSizing:"border-box",marginTop:5,background:"#09090b",border:"1px solid #3f3f46",color:"#fff",borderRadius:6,padding:8}}/>:<CurrencyInput value={Number(value)} onChange={(next)=>(setter as React.Dispatch<React.SetStateAction<number>>)(next)} style={{width:"100%",boxSizing:"border-box",marginTop:5,background:"#09090b",border:"1px solid #3f3f46",color:"#fff",borderRadius:6,padding:8}}/>}</label>)}<label style={{fontSize:11,color:"#a1a1aa"}}>Administradora<select value={consortiumAdministrator} onChange={(event)=>setConsortiumAdministrator(event.target.value)} style={{...button,width:"100%",marginTop:5}}><option>Embracon</option><option>Outra administradora</option></select></label><label style={{fontSize:11,color:"#a1a1aa"}}>Estágio do imóvel pretendido<select value={propertyStage} onChange={(event)=>setPropertyStage(event.target.value)} style={{...button,width:"100%",marginTop:5}}><option>Na planta / sem Habite-se</option><option>Em construção com garantia aceita</option><option>Pronto / com matrícula individual</option></select></label><label style={{fontSize:11,color:"#a1a1aa"}}>Origem do percentual<input value={ruleSource} onChange={(event)=>setRuleSource(event.target.value)} placeholder="Contrato, proposta ou aprovação de crédito" style={{width:"100%",boxSizing:"border-box",marginTop:5,background:"#09090b",border:"1px solid #3f3f46",color:"#fff",borderRadius:6,padding:8}}/></label></div><ConsortiumGuarantee propertyValue={guaranteeValue} acceptedPct={guaranteePct} existingDebt={guaranteeDebt} consortiumBalance={consortiumBalance} creditValue={consortiumCredit} fees={consortiumFees} stage={propertyStage}/><p style={{fontSize:11,color:ruleSource?"#71717a":"#fbbf24",margin:"9px 0 0"}}>{ruleSource?`${consortiumAdministrator} · premissa documentada como: ${ruleSource}.`:`${consortiumAdministrator}: o regulamento público exige imóvel de valor compatível com a liquidez definida pela administradora, mas não publica um percentual único. Confirme o percentual na análise da operação antes de apresentar ao cliente.`}</p></section></details>
    </>}
  </div>;
}

export default Fluxos;
