import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const failure = () => new Response(JSON.stringify({ error: "Credenciais inválidas." }), { status: 401, headers: corsHeaders });

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return new Response(JSON.stringify({ error: "Método não permitido." }), { status: 405, headers: corsHeaders });

  try {
    const { usuario, senha } = await request.json();
    const normalized = String(usuario || "").trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{2,23}$/.test(normalized) || typeof senha !== "string" || !senha) return failure();

    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profile } = await admin.from("perfis_usuario").select("user_id,ativo").eq("usuario", normalized).maybeSingle();
    if (!profile?.ativo) return failure();

    const { data: userResult, error: userError } = await admin.auth.admin.getUserById(profile.user_id);
    const email = userResult.user?.email;
    if (userError || !email) return failure();

    const authClient = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await authClient.auth.signInWithPassword({ email, password: senha });
    if (error || !data.session) return failure();

    return new Response(JSON.stringify({ access_token: data.session.access_token, refresh_token: data.session.refresh_token }), { status: 200, headers: corsHeaders });
  } catch {
    return failure();
  }
});
