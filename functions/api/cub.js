const SOURCE_URL = "https://sinduscon-fpolis.org.br/servico/cub-mensal/";
const CACHE_KEY = new Request("https://internal.luan-especialista.local/cub-sc-residencial-medio");
const CACHE_SECONDS = 60 * 60 * 12;

function json(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": `public, max-age=${CACHE_SECONDS}`,
      ...extraHeaders,
    },
  });
}

function parseCub(html) {
  const normalized = html.replace(/\s+/g, " ");
  const block = normalized.match(/Residencial Médio[\s\S]{0,2500}?Comercial Médio/i)?.[0] || normalized.slice(normalized.indexOf("Residencial Médio"));
  const valueMatch = block.match(/R\$\s*([0-9.]+,[0-9]{2})/i);
  if (!valueMatch) return null;
  const usedMatch = block.match(/Para ser usado em:[\s\S]{0,180}?([A-Za-zç]+\/\d{4})/i);
  const referenceMatch = block.match(/Mês de Referência:[\s\S]{0,180}?([A-Za-zç]+\/\d{4})/i);
  const value = Number(valueMatch[1].replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(value) || value <= 0) return null;
  return {
    index: "CUB-SC",
    label: "CUB/SC residencial médio",
    value,
    competencia: usedMatch?.[1] || null,
    mes_referencia: referenceMatch?.[1] || null,
    source: SOURCE_URL,
    updated_at: new Date().toISOString(),
  };
}

export async function onRequest(context) {
  const cache = caches.default;
  const cached = await cache.match(CACHE_KEY);
  if (cached) return cached;
  try {
    const response = await fetch(SOURCE_URL, { headers: { accept: "text/html" } });
    if (!response.ok) return json({ error: "Fonte do CUB indisponível." }, 502);
    const quote = parseCub(await response.text());
    if (!quote) return json({ error: "Não foi possível ler o CUB vigente." }, 502);
    const result = json({ ok: true, ...quote });
    context.waitUntil(cache.put(CACHE_KEY, result.clone()));
    return result;
  } catch {
    return json({ error: "Não foi possível consultar o CUB vigente." }, 502);
  }
}
