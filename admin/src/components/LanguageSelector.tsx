import { useEffect, useState } from "react";
import { getLocale, LOCALES, setLocale, type Locale } from "@/lib/i18n";

const labels: Record<Locale, string> = { "pt-BR": "PT", "en-US": "EN", es: "ES" };
export default function LanguageSelector() {
  const [value, setValue] = useState<Locale>(getLocale());
  useEffect(() => { document.documentElement.lang = value; }, [value]);
  return <select aria-label="Idioma" value={value} onChange={(event) => { const locale = event.target.value as Locale; setValue(locale); setLocale(locale); }} style={{ background: "#111", color: "#d7ab63", border: "1px solid #3f3524", borderRadius: 999, padding: "6px 9px", fontSize: 11 }}>
    {LOCALES.map((locale) => <option key={locale} value={locale}>{labels[locale]}</option>)}
  </select>;
}
