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
  const { data, error } = await supabase.functions.invoke("atualizar-ptax", { body: {} });
  if (error) throw new Error((data as any)?.error || error.message || "A função de atualização PTAX não respondeu.");
  if ((data as any)?.error) throw new Error((data as any).error);
  const rate = await getExchangeRate();
  if (!rate) throw new Error("A atualização terminou, mas nenhuma cotação válida foi encontrada.");
  return rate;
}
