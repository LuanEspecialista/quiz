import { supabase } from "./supabase";

export type ExchangeRate = {
  value: number;
  date: string | null;
  manual: boolean;
  source: "supabase" | "cache";
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
    ? { ...indicator, valor_atual: rate.value, data_atualizacao: rate.date }
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
    const { data, error } = await supabase
      .from("cotacao_usd_brl_atual")
      .select("cotacao, data_cotacao, manual")
      .maybeSingle();
    if (error) throw error;
    const value = Number(data?.cotacao);
    if (Number.isFinite(value) && value > 0) {
      const rate = { value, date: data?.data_cotacao || null, manual: Boolean(data?.manual), source: "supabase" as const };
      remember(rate);
      return rate;
    }
  } catch (error) {
    console.warn("Cotação online indisponível; usando a última cotação válida.", error);
  }
  return cachedRate();
}

export async function refreshExchangeRate(): Promise<ExchangeRate | null> {
  const { error } = await supabase.functions.invoke("atualizar-ptax");
  if (error) throw error;
  return getExchangeRate();
}
