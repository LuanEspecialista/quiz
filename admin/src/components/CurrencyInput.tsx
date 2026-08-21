import type { CSSProperties } from "react";

const formatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

export function formatBRL(value: number | null | undefined) {
  return formatter.format(Number(value) || 0);
}

export function parseBRL(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits) / 100 : 0;
}

export default function CurrencyInput({ value, onChange, placeholder = "R$ 0,00", style, disabled, ariaLabel, fractionDigits = 2 }: { value: number; onChange: (value: number) => void; placeholder?: string; style?: CSSProperties; disabled?: boolean; ariaLabel?: string; fractionDigits?: number }) {
  const safeDigits = Math.max(0, Math.min(6, Math.round(fractionDigits)));
  const localFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: safeDigits, maximumFractionDigits: safeDigits });
  return <input
    type="text"
    inputMode="numeric"
    aria-label={ariaLabel}
    disabled={disabled}
    value={value > 0 ? localFormatter.format(value) : ""}
    placeholder={placeholder}
    onChange={(event) => { const digits = event.target.value.replace(/\D/g, ""); onChange(digits ? Number(digits) / (10 ** safeDigits) : 0); }}
    style={style}
  />;
}
