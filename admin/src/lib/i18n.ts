export const LOCALES = ["pt-BR", "en-US", "es"] as const;
export type Locale = (typeof LOCALES)[number];

const STORAGE_KEY = "luan.locale";

export function getLocale(): Locale {
  const saved = localStorage.getItem(STORAGE_KEY);
  return LOCALES.includes(saved as Locale) ? (saved as Locale) : "pt-BR";
}

export function setLocale(locale: Locale) {
  localStorage.setItem(STORAGE_KEY, locale);
  document.documentElement.lang = locale;
  window.dispatchEvent(new CustomEvent("luan:locale", { detail: locale }));
}

export function currencyFor(locale: Locale) {
  return locale === "pt-BR" ? "BRL" : "USD";
}

export function formatCurrency(value: number, locale = getLocale(), usdBrl = 1) {
  const currency = currencyFor(locale);
  const converted = currency === "USD" && usdBrl > 0 ? value / usdBrl : value;
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(converted);
}

export function formatDate(value: string | Date, locale = getLocale()) {
  return new Intl.DateTimeFormat(locale).format(new Date(value));
}
