import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const ptaxDate = (date: Date) => `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}-${date.getFullYear()}`;

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

    const end = new Date();
    const start = new Date(end.getTime() - 15 * 864e5);
    const params = new URLSearchParams({ "@dataInicial": `'${ptaxDate(start)}'`, "@dataFinalCotacao": `'${ptaxDate(end)}'`, "$top": "100", "$orderby": "dataHoraCotacao desc", "$format": "json" });
    const endpoint = `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarPeriodo(dataInicial=@dataInicial,dataFinalCotacao=@dataFinalCotacao)?${params}`;
    const response = await fetch(endpoint, { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(`Banco Central respondeu HTTP ${response.status}.`);
    const payload = await response.json();
    const last = payload.value?.[0];
    if (!last || !Number(last.cotacaoVenda)) throw new Error("O Banco Central não retornou uma cotação válida no período.");
    const row = { par: "USD/BRL", cotacao_compra: Number(last.cotacaoCompra), cotacao_venda: Number(last.cotacaoVenda), data_cotacao: String(last.dataHoraCotacao).slice(0, 10), fonte: "Banco Central do Brasil · PTAX", oficial: true };
    const { error } = await supabase.from("cotacoes_cambio").upsert(row, { onConflict: "par,data_cotacao,fonte" });
    if (error) throw error;
    return json({ ...row, atualizado_em: new Date().toISOString() });
  } catch (error) {
    console.error("Falha ao atualizar PTAX", error);
    return json({ error: error instanceof Error ? error.message : String(error), fallback: "A última cotação válida permanece ativa." }, 502);
  }
});
