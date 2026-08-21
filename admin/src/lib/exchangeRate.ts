import { supabase } from "./supabase";

export type ExchangeRate = {
  value: number;
  date: string | null;
  manual: boolean;
  source: "supabase" | "cache";
  trend?: number;
  variation?: number | null;
};

export function isUsdBrlIndicator(indicator: { nome?: unknown; sku?: unknown }): boolean {
  const identity = `${indicator.nome || ""} ${indicator.sku || ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase();
  return /(^|[^A-Z])(DOLAR|USD|PTAX)([^A-Z]|$)/.test(identity);
}

export function applyExchangeRate<T extends { nome?: unknown; sku?: unknown; valor_atual?: unknown; data_atualizacao?: unknown }>(
  indicators: T[],
  rate: ExchangeRate | null,
): T[] {
  if (!rate?.value) return indicators;
  return indicators.map((indicator) => isUsdBrlIndicator(indicator)
    ? { ...indicator, valor_atual: rate.value, data_atualizacao: rate.date, tendencia: rate.trend ?? 0, variacao_periodo: rate.variation ?? null }
    : indicator);
}

const VALUE_KEY = "luan.usdBrl";
const DATE_KEY = "luan.usdBrlDate";

function cachedRate(): ExchangeRate | null {
  const value = Number(localStorage.getItem(VALUE_KEY));
  if (!Number.isFinite(value) || value <= 0) return null;
  return { value, date: localStorage.getItem(DATE_KEY), manual: false, source: "cache" };
}

function remember(rate: ExchangeRate) {
  localStorage.setItem(VALUE_KEY, String(rate.value));
  if (rate.date) localStorage.setItem(DATE_KEY, rate.date);
}

export async function getExchangeRate(): Promise<ExchangeRate | null> {
  try {
    const [{ data, error }, { data: historico }] = await Promise.all([
      supabase.from("cotacao_usd_brl_atual").select("cotacao, data_cotacao, manual").maybeSingle(),
      supabase.from("cotacoes_cambio").select("cotacao_venda, data_cotacao").eq("par", "USD/BRL").order("data_cotacao", { ascending: false }).limit(2),
    ]);
    if (error) throw error;
    const value = Number(data?.cotacao);
    if (Number.isFinite(value) && value > 0) {
      const previous = Number(historico?.[1]?.cotacao_venda);
      const variation = Number.isFinite(previous) && previous > 0 ? ((value - previous) / previous) * 100 : null;
      const rate = { value, date: data?.data_cotacao || null, manual: Boolean(data?.manual), source: "supabase" as const, variation, trend: variation === null ? 0 : Math.sign(variation) };
      remember(rate);
      return rate;
    }
  } catch (error) {
    console.warn("Cotação online indisponível; usando a última cotação válida.", error);
  }
  return cachedRate();
}

export async function refreshExchangeRate(): Promise<ExchangeRate | null> {
  const edge = await supabase.functions.invoke("atualizar-ptax", { body: {} });
  if (!edge.error && !(edge.data as any)?.error) {
    const rate = await getExchangeRate();
    if (rate) return rate;
  }
  // Contingência: a cotação continua disponível quando a Edge Function está
  // indisponível, retornando 5xx ou ainda não foi publicada.
  try {
    const end = new Date(); const start = new Date(end.getTime() - 15 * 864e5);
    const format = (date: Date) => `${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}-${date.getFullYear()}`;
    const params = new URLSearchParams({ "@dataInicial": `'${format(start)}'`, "@dataFinalCotacao": `'${format(end)}'`, "$top":"1", "$orderby":"dataHoraCotacao desc", "$format":"json" });
    const response = await fetch(`https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?${params}`, { headers:{Accept:"application/json"} });
    if (!response.ok) throw new Error(`Banco Central respondeu HTTP ${response.status}.`);
    const payload = await response.json(); const item = payload.value?.[0]; const value = Number(item?.cotacaoVenda);
    if (!Number.isFinite(value) || value <= 0) throw new Error("Banco Central não retornou uma cotação válida.");
    const rate: ExchangeRate = { value, date:String(item.dataHoraCotacao||"").slice(0,10)||null, manual:false, source:"cache" };
    remember(rate);
    // A persistência é tentada, mas uma política do banco não impede o uso local da última PTAX oficial.
    await supabase.from("cotacoes_cambio").upsert({par:"USD/BRL",cotacao_compra:Number(item.cotacaoCompra)||value,cotacao_venda:value,data_cotacao:rate.date,fonte:"Banco Central do Brasil · PTAX",oficial:true},{onConflict:"par,data_cotacao,fonte"});
    return rate;
  } catch (fallbackError) {
    const edgeMessage=(edge.data as any)?.error || edge.error?.message || "Edge Function indisponível";
    throw new Error(`Não foi possível atualizar a PTAX. Edge: ${edgeMessage}. Contingência Banco Central: ${fallbackError instanceof Error ? fallbackError.message : String(fallbackError)}.`);
  }
}
