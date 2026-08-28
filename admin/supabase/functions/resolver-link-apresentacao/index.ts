const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
});

function isCanvaShortLink(url: URL) {
  const host = url.hostname.toLowerCase();
  return url.protocol === "https:" && (host === "canva.link" || host.endsWith(".canva.link"));
}

function isOfficialCanvaDestination(url: URL) {
  const host = url.hostname.toLowerCase();
  return url.protocol === "https:" && (host === "canva.com" || host.endsWith(".canva.com")) && url.pathname.includes("/design/");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Método não permitido." }, 405);

  try {
    const payload = await request.json();
    const source = new URL(String(payload?.url || ""));
    if (!isCanvaShortLink(source)) return json({ error: "Somente links curtos oficiais do Canva podem ser resolvidos." }, 400);

    const response = await fetch(source, {
      method: "HEAD",
      redirect: "follow",
      headers: { "User-Agent": "LuanEspecialista-PresentationResolver/1.0" },
    });
    if (!response.ok) return json({ error: `O Canva respondeu HTTP ${response.status}.` }, 502);

    const destination = new URL(response.url);
    if (!isOfficialCanvaDestination(destination)) return json({ error: "O link não terminou em uma apresentação oficial do Canva." }, 400);
    destination.searchParams.set("embed", "");
    return json({ url: destination.toString() });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Não foi possível resolver o link." }, 400);
  }
});
