export function cityKey(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s*[-/]?\s*(sc|santa catarina)\s*$/i, "")
    .replace(/^bal\.?\s+/i, "balneario ")
    .replace(/^picarras$/i, "balneario picarras")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function sameCity(first: unknown, second: unknown) {
  const a = cityKey(first);
  const b = cityKey(second);
  return Boolean(a && b && a === b);
}

