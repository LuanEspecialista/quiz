export async function getEuroIndicator() {
  try {
    const from = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
    const response = await fetch(`https://api.frankfurter.dev/v2/rates?base=EUR&quotes=BRL&providers=ECB&from=${from}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const rows = (await response.json()).filter((item: any) => item.base === "EUR" && item.quote === "BRL" && Number(item.rate) > 0).sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)));
    if (!rows.length) return null;
    const current = Number(rows[0].rate);
    const previous = Number(rows[1]?.rate);
    const variation = Number.isFinite(previous) && previous > 0 ? ((current - previous) / previous) * 100 : null;
    return { id: "ecb-eur-brl", sku: "EUR-BRL", nome: "Euro", categoria: "MOEDA", valor: current, valor_atual: current, variacao_periodo: variation, tendencia: variation === null ? 0 : Math.sign(variation), data_atualizacao: rows[0].date, indexador_base: "Banco Central Europeu", automatico: true };
  } catch (error) {
    console.warn("Cotação oficial do euro indisponível.", error);
    return null;
  }
}

export function isEuroIndicator(indicator: { nome?: unknown; sku?: unknown }) {
  const identity = `${indicator.nome || ""} ${indicator.sku || ""}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  return /(^|[^A-Z])(EURO|EUR)([^A-Z]|$)/.test(identity);
}
