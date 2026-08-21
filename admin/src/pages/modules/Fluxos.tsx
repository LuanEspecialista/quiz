import { useEffect, useMemo, useState } from "react";
import { BarChart3, CalendarDays, Check, Lock, LockOpen, Plus, RefreshCw, SlidersHorizontal, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { deliveryDate, deliveryLabelPt } from "@/lib/deliveryDate";

type Empreendimento = { id: string; nome?: string; cidade?: string; entrega?: string; entrega_date?: string; previsao_entrega?: string; valorizacao_aa?: number | null; diferenciais?: unknown[] };
type Unidade = { id: string; codigo_unidade?: string; numero_unidade?: string; torre?: string; tipologia?: string; tipologia_dados?: Record<string, unknown>; area_privativa?: number; valor_tabela?: number; status?: string; fluxo_dados?: Record<string, unknown>; empreendimentos?: Empreendimento };
type Indicador = { id: string; nome?: string; sku?: string; categoria?: string; valor?: number; valor_atual?: number; tributacao?: { tipo?: "isento" | "regressivo" | "fixo"; aliquota_fixa?: number; faixas?: Array<{ ate_dias?: number | null; aliquota: number }> } };
type Cenario = "conservador" | "base" | "otimista";

const colors = ["#d6a94f", "#38bdf8", "#34d399", "#c084fc", "#fb7185", "#f97316"];
const money = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
const pct = (value: number) => `${Number(value || 0).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% a.a.`;
const n = (value: unknown) => Number(value) || 0;

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
  const points = series.map((item) => ({ ...item, values: Array.from({ length: years + 1 }, (_, year) => {
    if (item.kind === "imovel") {
      const initial = item.capital * (1 + n(item.acquisitionCost) / 100);
      if (year === 0) return initial;
      const gross = item.capital * Math.pow(1 + item.rate / 100, year);
      const saleExpense = gross * n(item.saleCost) / 100;
      const gain = Math.max(0, gross - item.capital - saleExpense - item.capital * n(item.acquisitionCost) / 100);
      const capitalGains = gain * n(item.capitalGainsTax) / 100;
      const rent = gross * n(item.rentYield) / 100 * 12 * year;
      const holding = gross * n(item.holdingCost) / 100 * year;
      // Valor líquido se a venda acontecesse naquele ano: custos e imposto não ficam escondidos.
      return gross - saleExpense - capitalGains + rent - holding;
    }
    const gross = item.capital * Math.pow(1 + item.rate / 100, year);
    const gain = gross - item.capital;
    // Para renda fixa, mostra o resgate líquido em cada data (IR no saque, não mensalmente).
    return item.capital + gain * (1 - taxRate(item.indicator, year * 365) / 100);
  }) }));
  const min = Math.min(...points.flatMap((item) => item.values), 0);
  const max = Math.max(...points.flatMap((item) => item.values), 1);
  const x = (year: number) => pad + (year / Math.max(1, years)) * (width - pad * 2);
  const y = (value: number) => height - pad - ((value - min) / Math.max(1, max - min)) * (height - pad * 2);
  return <div style={{ width: "100%", overflowX: "hidden" }}>
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", maxWidth: 980, height: "auto", display: "block" }} role="img" aria-label="Comparação de crescimento com capital inicial igual">
      {[0, .25, .5, .75, 1].map((step) => { const value = min + (max - min) * step; return <g key={step}><line x1={pad} x2={width-pad} y1={y(value)} y2={y(value)} stroke="#27272a" /><text x={4} y={y(value)+4} fill="#71717a" fontSize="11">{money(value)}</text></g>; })}
      {points.map((item, index) => <polyline key={item.name} fill="none" stroke={colors[index % colors.length]} strokeWidth="3" points={item.values.map((value, year) => `${x(year)},${y(value)}`).join(" ")} />)}
      {Array.from({ length: years + 1 }, (_, year) => <text key={year} x={x(year)} y={height-14} textAnchor="middle" fill="#71717a" fontSize="11">{year === 0 ? "Hoje" : `${year}a`}</text>)}
    </svg>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>{points.map((item, index) => { const final = item.values[item.values.length-1]; return <span key={item.name} style={{ color: "#d4d4d8", fontSize: 12 }}><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 9, background: colors[index % colors.length], marginRight: 6 }} />{item.name}: patrimônio {money(final)} · ganho {money(final-item.capital)}{item.indicator ? " líquido" : " projetado"}</span>; })}</div>
  </div>;
}

export function Fluxos({ initialUnitIds = [] }: { initialUnitIds?: string[] }) {
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
  const [availableCapital,setAvailableCapital]=useState(500000);
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
  const [now, setNow] = useState(new Date());
  const [official, setOfficial] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true); setError("");
    const [unitResult, indicatorResult, time] = await Promise.all([
      supabase.from("unidades").select("id,codigo_unidade,numero_unidade,torre,tipologia,tipologia_dados,area_privativa,valor_tabela,status,fluxo_dados,empreendimentos(id,nome,cidade,entrega,entrega_date,previsao_entrega,valorizacao_aa,diferenciais)").order("created_at", { ascending: false }),
      supabase.from("indicadores").select("id,nome,sku,categoria,valor,valor_atual,tributacao").order("nome"),
      officialNow(),
    ]);
    if (unitResult.error) setError("Não foi possível carregar as unidades. Confira se as atualizações do banco foram aplicadas."); else setUnits((unitResult.data || []) as unknown as Unidade[]);
    if (indicatorResult.error) setError((current) => current || "Os indicadores financeiros estão temporariamente indisponíveis."); else setIndicators((indicatorResult.data || []) as Indicador[]);
    setNow(time.date); setOfficial(time.official); setLoading(false);
  }
  useEffect(() => { void load(); const timer = window.setInterval(() => void officialNow().then((value) => { setNow(value.date); setOfficial(value.official); }), 3600000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    const ids = initialUnitIds.slice(0, 4);
    if (ids.length) {
      setSelectedUnits(ids);
      setShowAllUnits(false);
    }
  }, [initialUnitIds]);

  const visibleUnits = useMemo(() => units.filter((unit) => {
    const hasSearch = query.trim().length >= 2 || budget > 0 || initialUnitIds.length > 0;
    if (!hasSearch) return false;
    if (!showAllUnits && initialUnitIds.length && !initialUnitIds.includes(unit.id)) return false;
    const matchesText = `${unit.empreendimentos?.nome} ${unit.codigo_unidade} ${unit.torre} ${unit.tipologia}`.toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR"));
    const status = String(unit.status || "").toLocaleLowerCase("pt-BR");
    const available = !status || status.includes("dispon");
    if (!budget) return matchesText && available;
    const price = n(unit.valor_tabela);
    const variation = rangePct / 100;
    return matchesText && available && price >= budget * (1 - variation) && price <= budget * (1 + variation);
  }).sort((a, b) => budget ? Math.abs(n(a.valor_tabela) - budget) - Math.abs(n(b.valor_tabela) - budget) : 0).slice(0, 30), [units, query, budget, rangePct, showAllUnits, initialUnitIds]);
  const chosenUnits = selectedUnits.map((id) => units.find((unit) => unit.id === id)).filter(Boolean) as Unidade[];
  const chosenIndicators = selectedIndicators.map((id) => indicators.find((item) => item.id === id)).filter(Boolean) as Indicador[];
  const series = [
    ...chosenUnits.map((unit) => { const base = n(unit.empreendimentos?.valorizacao_aa); const key=`u:${unit.id}`; return { name: `${unit.empreendimentos?.nome || "Empreendimento"} · ${unit.codigo_unidade || unit.numero_unidade}`, rate: scenarioValues[scenario][key] ?? annualRate(base, scenario), capital: n(unit.valor_tabela), kind: "imovel" as const, acquisitionCost, saleCost, holdingCost, capitalGainsTax, rentYield }; }),
    ...chosenIndicators.map((item) => { const base = n(item.valor_atual ?? item.valor); const key=`i:${item.id}`; return { name: item.nome || item.sku || "Indicador", rate: scenarioValues[scenario][key] ?? annualRate(base, scenario), capital: budget || n(chosenUnits[0]?.valor_tabela) || 100000, indicator: item }; }),
  ];
  const toggleUnit = (id: string) => setSelectedUnits((old) => old.includes(id) ? old.filter((value) => value !== id) : old.length < 4 ? [...old, id] : old);
  const toggleIndicator = (id: string) => setSelectedIndicators((old) => old.includes(id) ? old.filter((value) => value !== id) : [...old, id]);
  const card: React.CSSProperties = { background: "#101012", border: "1px solid #27272a", borderRadius: 10, padding: 16 };
  const button: React.CSSProperties = { background: "#18181b", border: "1px solid #3f3f46", color: "#e4e4e7", borderRadius: 7, padding: "9px 12px", cursor: "pointer" };

  return <div style={{ color: "#f4f4f5" }}>
    <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, marginBottom: 18 }}><div><h1 style={{ margin: 0, fontSize: 24 }}>Fluxos e recomendações</h1><p style={{ color: "#a1a1aa", margin: "5px 0 0" }}>Encontre unidades compatíveis com o investimento e compare somente o que deseja apresentar.</p></div><div style={{ display: "flex", alignItems: "center", gap: 10 }}><span style={{ color: "#71717a", fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}><CalendarDays size={14} />{now.toLocaleDateString("pt-BR")} · {official ? "dados atualizados" : "horário local"}</span><button style={button} onClick={() => void load()}><RefreshCw size={15} /> Atualizar</button></div></header>
    {error && <div style={{ ...card, borderColor: "#7f1d1d", color: "#fca5a5", marginBottom: 16 }}>{error}</div>}
    <section style={card}><div style={{ display: "grid", gridTemplateColumns: "minmax(220px,1fr) minmax(300px,2fr)", gap: 14, alignItems: "end" }}><label style={{ color: "#a1a1aa", fontSize: 12 }}>Quanto você planeja investir?<input type="number" min="0" step="10000" value={budget || ""} onChange={(event) => setBudget(Math.max(0, n(event.target.value)))} placeholder="Ex.: 450000" style={{ width: "100%", boxSizing: "border-box", marginTop: 6, background: "#09090b", color: "#fff", border: "1px solid #3f3f46", borderRadius: 7, padding: 11 }} /></label><div><span style={{ color: "#a1a1aa", fontSize: 12 }}>Amplitude da busca</span><div style={{ display: "flex", gap: 7, marginTop: 6 }}>{[10, 15, 20].map((value) => <button key={value} onClick={() => setRangePct(value)} style={{ ...button, borderColor: rangePct === value ? "#d6a94f" : "#3f3f46", color: rangePct === value ? "#f5d58b" : "#a1a1aa" }}>± {value}%</button>)}</div></div></div>{budget > 0 && <p style={{ color: "#a1a1aa", fontSize: 12, margin: "12px 0 0" }}>Buscando opções entre {money(budget * (1-rangePct/100))} e {money(budget * (1+rangePct/100))}. A compatibilidade final também dependerá da entrada, parcelas e reforços.</p>}</section>
    <section style={{ ...card, marginTop: 12 }}><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",marginBottom:10}}><h2 style={{ fontSize: 15, margin: 0 }}>1. {showAllUnits ? "Unidades disponíveis" : "Unidades trazidas da seleção"} {budget > 0 ? `· ${visibleUnits.length} encontradas` : "· escolha até 4"}</h2>{initialUnitIds.length>0&&<button onClick={()=>setShowAllUnits((value)=>!value)} style={{...button,padding:"7px 9px",fontSize:11}}>{showAllUnits?"Voltar às selecionadas":"Adicionar outra unidade"}</button>}</div><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar empreendimento, unidade ou tipologia" style={{ width: "100%", boxSizing: "border-box", background: "#09090b", color: "#fff", border: "1px solid #3f3f46", borderRadius: 7, padding: 11, marginBottom: 12 }} />
      {loading ? <p>Carregando...</p> : visibleUnits.length ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 10 }}>{visibleUnits.map((unit) => { const selected = selectedUnits.includes(unit.id); const distance = budget ? Math.abs(n(unit.valor_tabela)-budget)/budget*100 : 0; return <button key={unit.id} onClick={() => toggleUnit(unit.id)} style={{ ...button, textAlign: "left", borderColor: selected ? "#d6a94f" : "#27272a", background: selected ? "#2a2113" : "#141416" }}><span style={{ float: "right" }}>{selected ? <Check size={16} /> : <Plus size={16} />}</span><strong>{unit.empreendimentos?.nome || "Sem empreendimento"}</strong><small style={{ display: "block", color: "#a1a1aa", marginTop: 5 }}>Un. {unit.codigo_unidade || unit.numero_unidade || "—"} · {unit.tipologia || String(unit.tipologia_dados?.nome_original || "Tipologia não informada")}</small><b style={{ display: "block", color: "#34d399", marginTop: 8 }}>{money(n(unit.valor_tabela))}</b>{budget > 0 && <small style={{ display: "block", marginTop: 4, color: distance <= 10 ? "#34d399" : "#d6a94f" }}>{distance <= 10 ? "Muito próxima da preferência" : "Alternativa na faixa ampliada"}</small>}</button>; })}</div> : <div style={{ color: "#a1a1aa", padding: 18, textAlign: "center" }}>Nenhuma unidade disponível nesta faixa. Amplie a busca ou ajuste o investimento.</div>}
    </section>
    {chosenUnits.length === 0 ? <section style={{ ...card, marginTop: 16, minHeight: 210, display: "grid", placeItems: "center", textAlign: "center", color: "#71717a" }}><div><BarChart3 size={42} style={{ margin: "0 auto 12px" }} /><strong style={{ color: "#d4d4d8" }}>Tela pronta para uma nova apresentação</strong><p>Escolha uma ou mais unidades acima para abrir fluxo, diferenças e gráficos.</p></div></section> : <>
      <section style={{ ...card, marginTop: 16 }}><h2 style={{ fontSize: 15, marginTop: 0 }}>2. Compare diferenciais e prazo</h2><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 10 }}>{chosenUnits.map((unit) => <article key={unit.id} style={{ border: "1px solid #27272a", borderRadius: 8, padding: 13 }}><button title="Remover" onClick={() => toggleUnit(unit.id)} style={{ ...button, float: "right", padding: 5 }}><X size={14} /></button><strong>{unit.empreendimentos?.nome}</strong><p style={{ color: "#a1a1aa", fontSize: 13 }}>{unit.tipologia || "Tipologia não informada"} · {unit.area_privativa || "—"} m² · {unit.torre || "Torre não informada"}</p><p style={{ color: "#d6a94f", fontSize: 13 }}>{deliveryLabel(now, unit.empreendimentos?.entrega_date || unit.empreendimentos?.entrega || unit.empreendimentos?.previsao_entrega)}</p><p style={{ fontSize: 12, color: "#a1a1aa" }}>{Array.isArray(unit.empreendimentos?.diferenciais) && unit.empreendimentos!.diferenciais!.length ? unit.empreendimentos!.diferenciais!.slice(0, 4).map((value) => typeof value === "string" ? value : JSON.stringify(value)).join(" · ") : "Diferenciais ainda não cadastrados"}</p></article>)}</div></section>
      <section style={{ ...card, marginTop: 16 }}><h2 style={{ fontSize: 15, marginTop: 0 }}>3. Adicione referências financeiras</h2><p style={{ color: "#a1a1aa", fontSize: 12 }}>Os valores-base vêm de Indicadores. Alterações abaixo valem apenas nesta apresentação e não são salvas.</p><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{indicators.map((item) => <button key={item.id} onClick={() => toggleIndicator(item.id)} style={{ ...button, borderColor: selectedIndicators.includes(item.id) ? "#d6a94f" : "#3f3f46" }}>{selectedIndicators.includes(item.id) ? <Check size={13} /> : <Plus size={13} />} {item.nome || item.sku} · {pct(n(item.valor_atual ?? item.valor))}</button>)}</div></section>
      <section style={{ ...card, marginTop: 16 }}><div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}><div><h2 style={{ fontSize: 15, margin: 0 }}>4. Patrimônio projetado</h2><p style={{ color: "#a1a1aa", fontSize: 12 }}>Imóveis mostram o valor líquido caso a venda ocorra em cada ano: custos de compra, manutenção, saída e imposto ficam explícitos. Renda fixa mostra o valor líquido de resgate.</p></div><div style={{ display: "flex", gap: 7 }}>{(["conservador","base","otimista"] as Cenario[]).map((value) => <button key={value} onClick={() => setScenario(value)} style={{ ...button, borderColor: scenario === value ? "#d6a94f" : "#3f3f46", textTransform: "capitalize" }}>{value}</button>)}</div></div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 10, margin: "12px 0" }}>{series.map((item, index) => { const key = index < chosenUnits.length ? `u:${chosenUnits[index].id}` : `i:${chosenIndicators[index-chosenUnits.length].id}`; const locked=Boolean(lockedRates[scenario][key]); return <label key={key} style={{ fontSize: 12, color: "#a1a1aa" }}>{item.name}<span style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 5 }}><SlidersHorizontal size={14} /><input type="number" step="0.1" value={item.rate} disabled={locked} onChange={(event) => setScenarioValues((old) => ({ ...old, [scenario]: { ...old[scenario], [key]: n(event.target.value) } }))} style={{ width: 90, background: "#09090b", border: "1px solid #3f3f46", color: locked ? "#71717a" : "#fff", borderRadius: 6, padding: 7 }} /> % a.a.<button type="button" title={locked ? "Destravar taxa neste cenário" : "Travar taxa neste cenário"} onClick={() => setLockedRates((old) => ({ ...old, [scenario]: { ...old[scenario], [key]: !locked } }))} style={{ ...button, padding: 7, color: locked ? "#d6a94f" : "#71717a" }}>{locked ? <Lock size={13}/> : <LockOpen size={13}/>}</button></span></label>; })}</div>
        <label style={{ color: "#a1a1aa", fontSize: 12 }}>Horizonte: <select value={years} onChange={(event) => setYears(Number(event.target.value))} style={{ ...button, marginLeft: 7 }}>{[1,2,3,5,10].map((value) => <option key={value} value={value}>{value} {value === 1 ? "ano" : "anos"}</option>)}</select></label>
        <ProjectionChart series={series} years={years} />
        <div style={{marginTop:16,paddingTop:14,borderTop:"1px solid #27272a"}}><h3 style={{fontSize:14,margin:"0 0 5px"}}>Premissas para uma comparação honesta</h3><p style={{color:"#8b8b95",fontSize:12,margin:"0 0 11px"}}>O gráfico não assume retorno perfeito: revise os custos reais da operação. O imposto sobre ganho de capital pode mudar por isenções e regras específicas; confirme com contador antes da apresentação final.</p><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:9}}>{[["Capital disponível",availableCapital,setAvailableCapital,10000],["Aquisição/documentação (%)",acquisitionCost,setAcquisitionCost,.1],["Venda/corretagem (%)",saleCost,setSaleCost,.1],["Custo anual (condomínio/IPTU/vacância) (%)",holdingCost,setHoldingCost,.01],["IR sobre ganho de capital (%)",capitalGainsTax,setCapitalGainsTax,.1],["Renda líquida mensal (%)",rentYield,setRentYield,.01]] .map(([label,value,setter,step])=><label key={String(label)} style={{fontSize:11,color:"#a1a1aa"}}>{String(label)}<input type="number" min="0" step={Number(step)} value={Number(value)||""} onChange={(event)=>(setter as React.Dispatch<React.SetStateAction<number>>)(Math.max(0,n(event.target.value)))} style={{width:"100%",boxSizing:"border-box",marginTop:5,background:"#09090b",border:"1px solid #3f3f46",color:"#fff",borderRadius:6,padding:8}}/></label>)}</div></div>
        {chosenUnits[0]&&<FinancialReading unit={chosenUnits[0]} indicator={chosenIndicators[0]} years={years} propertyRate={series[0]?.rate||0} indicatorRate={series[chosenUnits.length]?.rate||0} capital={availableCapital} acquisitionCost={acquisitionCost} saleCost={saleCost} rentYield={rentYield}/>}
      </section>
      <section style={{...card,marginTop:16}}><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><div><h2 style={{fontSize:15,margin:0}}>5. Consórcio com imóvel próprio em garantia</h2><p style={{fontSize:12,color:"#a1a1aa",margin:"5px 0 0"}}>Modele uma carta contemplada sem tratar 100% da avaliação como garantia disponível.</p></div><span style={{fontSize:11,color:"#fbbf24",border:"1px solid #854d0e",borderRadius:99,padding:"5px 9px"}}>Sujeito à administradora</span></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(205px,1fr))",gap:9,marginTop:13}}>{[
        ["Imóvel próprio avaliado",guaranteeValue,setGuaranteeValue,10000],
        ["Percentual aceito (%)",guaranteePct,setGuaranteePct,.1],
        ["Dívida atual do imóvel",guaranteeDebt,setGuaranteeDebt,1000],
        ["Saldo devedor do consórcio",consortiumBalance,setConsortiumBalance,1000],
        ["Carta contemplada",consortiumCredit,setConsortiumCredit,1000],
        ["Custos e taxas da operação",consortiumFees,setConsortiumFees,100],
      ].map(([label,value,setter,step])=><label key={String(label)} style={{fontSize:11,color:"#a1a1aa"}}>{String(label)}<input type="number" min="0" step={Number(step)} value={Number(value)||""} onChange={(event)=>(setter as React.Dispatch<React.SetStateAction<number>>)(Math.max(0,n(event.target.value)))} style={{width:"100%",boxSizing:"border-box",marginTop:5,background:"#09090b",border:"1px solid #3f3f46",color:"#fff",borderRadius:6,padding:8}}/></label>)}<label style={{fontSize:11,color:"#a1a1aa"}}>Administradora<select value={consortiumAdministrator} onChange={(event)=>setConsortiumAdministrator(event.target.value)} style={{...button,width:"100%",marginTop:5}}><option>Embracon</option><option>Outra administradora</option></select></label><label style={{fontSize:11,color:"#a1a1aa"}}>Estágio do imóvel pretendido<select value={propertyStage} onChange={(event)=>setPropertyStage(event.target.value)} style={{...button,width:"100%",marginTop:5}}><option>Na planta / sem Habite-se</option><option>Em construção com garantia aceita</option><option>Pronto / com matrícula individual</option></select></label><label style={{fontSize:11,color:"#a1a1aa"}}>Origem do percentual<input value={ruleSource} onChange={(event)=>setRuleSource(event.target.value)} placeholder="Contrato, proposta ou aprovação de crédito" style={{width:"100%",boxSizing:"border-box",marginTop:5,background:"#09090b",border:"1px solid #3f3f46",color:"#fff",borderRadius:6,padding:8}}/></label></div><ConsortiumGuarantee propertyValue={guaranteeValue} acceptedPct={guaranteePct} existingDebt={guaranteeDebt} consortiumBalance={consortiumBalance} creditValue={consortiumCredit} fees={consortiumFees} stage={propertyStage}/><p style={{fontSize:11,color:ruleSource?"#71717a":"#fbbf24",margin:"9px 0 0"}}>{ruleSource?`${consortiumAdministrator} · premissa documentada como: ${ruleSource}.`:`${consortiumAdministrator}: o regulamento público exige imóvel de valor compatível com a liquidez definida pela administradora, mas não publica um percentual único. Confirme o percentual na análise da operação antes de apresentar ao cliente.`}</p></section>
    </>}
  </div>;
}

export default Fluxos;
