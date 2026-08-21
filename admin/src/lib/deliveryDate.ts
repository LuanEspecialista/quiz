const months: Record<string, number> = {
  jan: 1, janeiro: 1, fev: 2, fevereiro: 2, mar: 3, marco: 3, março: 3,
  abr: 4, abril: 4, mai: 5, maio: 5, jun: 6, junho: 6, jul: 7, julho: 7,
  ago: 8, agosto: 8, set: 9, setembro: 9, out: 10, outubro: 10,
  nov: 11, novembro: 11, dez: 12, dezembro: 12,
};

export function normalizeDeliveryMonth(raw: unknown): string | null {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return null;
  const iso = value.match(/^(\d{4})-(\d{1,2})(?:-\d{1,2})?$/);
  if (iso) return `${iso[1]}-${String(Math.min(12, Number(iso[2]))).padStart(2, "0")}`;
  const numeric = value.match(/^(\d{1,2})[\/.-](\d{2}|\d{4})$/);
  if (numeric) {
    const year = numeric[2].length === 2 ? 2000 + Number(numeric[2]) : Number(numeric[2]);
    const month = Number(numeric[1]);
    return month >= 1 && month <= 12 ? `${year}-${String(month).padStart(2, "0")}` : null;
  }
  const named = value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").match(/^([a-z]+)[\s/.-]*(\d{2}|\d{4})$/);
  if (named) {
    const month = months[named[1]] || months[named[1].slice(0, 3)];
    const year = named[2].length === 2 ? 2000 + Number(named[2]) : Number(named[2]);
    if (month) return `${year}-${String(month).padStart(2, "0")}`;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function deliveryDate(raw: unknown): Date | null {
  const month = normalizeDeliveryMonth(raw);
  if (!month) return null;
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(year, monthNumber, 0, 12, 0, 0);
}

export function deliveryDateIso(raw: unknown): string | null {
  const date = deliveryDate(raw);
  if (!date) return null;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function deliveryLabelPt(raw: unknown) {
  const date = deliveryDate(raw);
  return date ? new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date) : "Entrega não informada";
}
