const SOURCE_URL = "https://apisidra.ibge.gov.br/values/t/1737/n1/1/v/63/p/last%201";
const CACHE_KEY = new Request("https://internal.luan-especialista.local/ipca-mensal");
const CACHE_SECONDS = 60 * 60 * 12;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": `public, max-age=${CACHE_SECONDS}` },
  });
}

export async function onRequest(context) {
  const cached = await caches.default.match(CACHE_KEY);
  if (cached) return cached;
  try {
    const response = await fetch(SOURCE_URL, { headers: { accept: "application/json" } });
    if (!response.ok) return json({ error: "Fonte do IPCA indisponível." }, 502);
    const rows = await response.json();
    const row = Array.isArray(rows) ? rows[1] : null;
    const value = Number(String(row?.V || "").replace(",", "."));
    if (!row || !Number.isFinite(value)) return json({ error: "Não foi possível ler o IPCA vigente." }, 502);
    const result = json({ ok: true, index: "IPCA", label: "IPCA mensal", value, competencia: row.D3N || row.D3C || null, source: "https://www.ibge.gov.br/estatisticas/economicas/precos-e-custos/9256-indice-nacional-de-precos-ao-consumidor-amplo.html", updated_at: new Date().toISOString() });
    context.waitUntil(caches.default.put(CACHE_KEY, result.clone()));
    return result;
  } catch {
    return json({ error: "Não foi possível consultar o IPCA vigente." }, 502);
  }
}
