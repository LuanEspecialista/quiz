import { useSyncExternalStore } from "react";

export const LOCALES = ["pt-BR", "en-US", "es"] as const;
export type Locale = (typeof LOCALES)[number];

const STORAGE_KEY = "luan.locale";
const LOCALE_EVENT = "luan:locale";

export const localeMeta: Record<Locale, { short: string; flag: string; label: string; currency: "BRL" | "USD" }> = {
  "pt-BR": { short: "PT", flag: "🇧🇷", label: "Português (Brasil)", currency: "BRL" },
  "en-US": { short: "EN", flag: "🇺🇸", label: "English (USA)", currency: "USD" },
  es: { short: "ES", flag: "🇪🇸", label: "Español", currency: "USD" },
};

const dictionary = {
  "pt-BR": { market: "Mercado", settings: "Configurações", signOut: "Sair", displayName: "Nome de exibição", liveIndicators: "Sem indicadores ao vivo", sourceNotProvided: "Fonte não informada", updatedAt: "Atualizado em", noUpdateDate: "Sem data de atualização", increase: "Alta", decrease: "Baixa", noComparableHistory: "Sem histórico comparável", dashboard: "Dashboard", developers: "Construtoras", developments: "Empreendimentos", presentations: "Apresentações", units: "Unidades", importAI: "Importar IA", prompts: "Prompts", financialFlows: "Fluxos Financeiros", clients: "Clientes", affiliates: "Afiliados", indicators: "Indicadores", temporaryLinks: "Links Temporários", catalog: "Meu catálogo", collapseMenu: "Recolher menu", expandMenu: "Expandir menu" },
  "en-US": { market: "Market", settings: "Settings", signOut: "Sign out", displayName: "Display name", liveIndicators: "No live indicators", sourceNotProvided: "Source not provided", updatedAt: "Updated on", noUpdateDate: "No update date", increase: "Up", decrease: "Down", noComparableHistory: "No comparable history", dashboard: "Dashboard", developers: "Developers", developments: "Developments", presentations: "Presentations", units: "Units", importAI: "Import AI", prompts: "Prompts", financialFlows: "Financial flows", clients: "Clients", affiliates: "Affiliates", indicators: "Indicators", temporaryLinks: "Temporary links", catalog: "My catalogue", collapseMenu: "Collapse menu", expandMenu: "Expand menu" },
  es: { market: "Mercado", settings: "Configuración", signOut: "Salir", displayName: "Nombre para mostrar", liveIndicators: "Sin indicadores en vivo", sourceNotProvided: "Fuente no informada", updatedAt: "Actualizado el", noUpdateDate: "Sin fecha de actualización", increase: "Subida", decrease: "Bajada", noComparableHistory: "Sin historial comparable", dashboard: "Panel", developers: "Constructoras", developments: "Emprendimientos", presentations: "Presentaciones", units: "Unidades", importAI: "Importar IA", prompts: "Prompts", financialFlows: "Flujos financieros", clients: "Clientes", affiliates: "Afiliados", indicators: "Indicadores", temporaryLinks: "Enlaces temporales", catalog: "Mi catálogo", collapseMenu: "Contraer menú", expandMenu: "Expandir menú" },
} as const;

export type TranslationKey = keyof (typeof dictionary)["pt-BR"];

export function getLocale(): Locale {
  const saved = localStorage.getItem(STORAGE_KEY);
  return LOCALES.includes(saved as Locale) ? (saved as Locale) : "pt-BR";
}

export function setLocale(locale: Locale) {
  localStorage.setItem(STORAGE_KEY, locale);
  document.documentElement.lang = locale;
  window.dispatchEvent(new CustomEvent(LOCALE_EVENT, { detail: locale }));
}

function subscribe(callback: () => void) {
  window.addEventListener(LOCALE_EVENT, callback);
  return () => window.removeEventListener(LOCALE_EVENT, callback);
}

export function useLocale(): Locale {
  return useSyncExternalStore(subscribe, getLocale, () => "pt-BR");
}

export function t(key: TranslationKey, locale = getLocale()) {
  return dictionary[locale][key] || dictionary["pt-BR"][key];
}

export function useTranslation() {
  const locale = useLocale();
  return { locale, t: (key: TranslationKey) => t(key, locale) };
}

export function currencyFor(locale: Locale) { return localeMeta[locale].currency; }

export function formatCurrency(value: number, locale = getLocale(), usdBrl = 1) {
  const currency = currencyFor(locale);
  const converted = currency === "USD" && usdBrl > 0 ? value / usdBrl : value;
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(converted);
}

export function formatDate(value: string | Date, locale = getLocale()) { return new Intl.DateTimeFormat(locale).format(new Date(value)); }
