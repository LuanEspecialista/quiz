import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const ptaxDate = (date: Date) => `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}-${date.getFullYear()}`;

type Cambio = {
  compra: number;
  venda: number;
  data: string;
  fonte: string;
  oficial: boolean;
};

async function buscarPtaxOficial(): Promise<Cambio> {
  // A consulta diária é mais estável que a consulta por período do OData do BCB.
  // Também percorremos dias úteis anteriores: fim de semana e feriado não têm PTAX.
  let lastFailure = "Nenhuma cotação foi publicada nos últimos dias úteis.";
  for (let offset = 0; offset < 12; offset += 1) {
    const date = new Date();
    date.setDate(date.getDate() - offset);
    if (date.getDay() === 0 || date.getDay() === 6) continue;
    const params = new URLSearchParams({ "@dataCotacao": `'${ptaxDate(date)}'`, "$format": "json" });
    const endpoint = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia(dataCotacao=@dataCotacao)?${params}`;
    try {
      const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
      if (!response.ok) { lastFailure = `Banco Central respondeu HTTP ${response.status}.`; continue; }
      const payload = await response.json();
      const last = payload.value?.at(-1);
      if (!last || !Number(last.cotacaoVenda)) { lastFailure = "Banco Central não publicou PTAX para a data consultada."; continue; }
      return {
        compra: Number(last.cotacaoCompra),
        venda: Number(last.cotacaoVenda),
        data: String(last.dataHoraCotacao).slice(0, 10),
        fonte: "Banco Central do Brasil · PTAX",
        oficial: true,
      };
    } catch (error) {
      lastFailure = error instanceof Error ? error.message : String(error);
    }
  }
  throw new Error(lastFailure);
}

async function buscarCambioAlternativo(): Promise<Cambio> {
  const response = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL", { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Fonte alternativa respondeu HTTP ${response.status}.`);
  const quote = (await response.json()).USDBRL;
  if (!quote || !Number(quote.ask)) throw new Error("A fonte alternativa não retornou USD/BRL válido.");
  const timestamp = Number(quote.timestamp) * 1000;
  return {
    compra: Number(quote.bid || quote.ask),
    venda: Number(quote.ask),
    data: Number.isFinite(timestamp) ? new Date(timestamp).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
    fonte: "AwesomeAPI · USD/BRL (fallback, não PTAX)",
    oficial: false,
  };
}

async function buscarCambioReserva(): Promise<Cambio> {
  const response = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=BRL", { headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`Fonte de reserva respondeu HTTP ${response.status}.`);
  const quote = await response.json();
  const venda = Number(quote?.rates?.BRL);
  if (!Number.isFinite(venda) || venda <= 0) throw new Error("A fonte de reserva não retornou USD/BRL válido.");
  return { compra: venda, venda, data: String(quote?.date || new Date().toISOString().slice(0, 10)), fonte: "Frankfurter · USD/BRL (contingência, não PTAX)", oficial: false };
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const authorization = request.headers.get("Authorization") || "";
    const { data: { user } } = await supabase.auth.getUser(authorization.replace("Bearer ", ""));
    if (user) {
      const { data: profile } = await supabase.from("perfis_usuario").select("perfil,ativo").eq("user_id", user.id).maybeSingle();
      if (profile?.perfil !== "admin" || !profile.ativo) return json({ error: "Apenas administradores podem atualizar a PTAX." }, 403);
    } else if (!Deno.env.get("CRON_SECRET") || request.headers.get("x-cron-secret") !== Deno.env.get("CRON_SECRET")) return json({ error: "Sessão inválida ou expirada." }, 401);

    let cambio: Cambio | null = null;
    let erroPtax: string | null = null;
    try {
      cambio = await buscarPtaxOficial();
    } catch (error) {
      erroPtax = error instanceof Error ? error.message : String(error);
      try { cambio = await buscarCambioAlternativo(); }
      catch (fallbackError) {
        const detail = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
        cambio = await buscarCambioReserva();
        erroPtax = `${erroPtax} A primeira contingência também falhou: ${detail}`;
      }
    }
    if (!cambio) throw new Error("Nenhuma fonte de câmbio retornou uma cotação válida.");
    const row = { par: "USD/BRL", cotacao_compra: cambio.compra, cotacao_venda: cambio.venda, data_cotacao: cambio.data, fonte: cambio.fonte, oficial: cambio.oficial };
    const { error } = await supabase.from("cotacoes_cambio").upsert(row, { onConflict: "par,data_cotacao,fonte" });
    if (error) throw error;
    return json({ ...row, atualizado_em: new Date().toISOString(), aviso: erroPtax ? `PTAX indisponível: ${erroPtax}. Foi usada uma fonte alternativa identificada.` : null });
  } catch (error) {
    console.error("Falha ao atualizar PTAX", error);
    return json({ error: error instanceof Error ? error.message : String(error), fallback: "A última cotação válida permanece ativa." }, 502);
  }
});
