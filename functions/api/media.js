const BUCKET_PREFIX = "empreendimentos/";
const PUBLIC_MEDIA_ORIGIN = "https://media.luan-especialista.pro";
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 250 * 1024 * 1024;

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function safeName(value) {
  const name = String(value || "arquivo").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const ext = name.includes(".") ? `.${name.split(".").pop().toLowerCase().replace(/[^a-z0-9]/g, "")}` : "";
  const base = name.slice(0, ext ? -ext.length : undefined).replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90) || "arquivo";
  return `${base}${ext}`;
}

function publicUrl(key) {
  return `${PUBLIC_MEDIA_ORIGIN}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

async function authorize(request, env) {
  const authorization = request.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ") || !env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  const headers = { apikey: env.SUPABASE_ANON_KEY, authorization };
  const userResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers });
  if (!userResponse.ok) return null;
  const user = await userResponse.json();
  if (!user?.id) return null;
  const profileResponse = await fetch(`${env.SUPABASE_URL}/rest/v1/perfis_usuario?select=perfil,ativo&user_id=eq.${encodeURIComponent(user.id)}&limit=1`, { headers });
  if (!profileResponse.ok) return null;
  const profiles = await profileResponse.json();
  const profile = profiles?.[0];
  return profile?.ativo && profile.perfil === "admin" ? user : null;
}

async function resolveEnterpriseFolder(bucket, enterpriseName) {
  const listing = await bucket.list({ prefix: BUCKET_PREFIX, delimiter: "/", limit: 1000 });
  const prefixes = (listing?.delimitedPrefixes || [])
    .map((prefix) => prefix.slice(BUCKET_PREFIX.length).replace(/\/$/, ""))
    .filter(Boolean);
  const wanted = normalize(enterpriseName);
  const matching = prefixes
    .filter((folder) => {
      const candidate = normalize(folder);
      return candidate === wanted || wanted.includes(candidate) || candidate.includes(wanted);
    })
    .sort((a, b) => normalize(b).length - normalize(a).length);
  return matching[0] || safeName(enterpriseName || "empreendimento");
}

function categoryFolder(kind) {
  switch (kind) {
    case "cover": return "capa";
    case "gallery": return "galeria";
    case "typology": return "tipologias";
    case "plant": return "plantas";
    case "presentation": return "apresentacoes";
    case "blog": return "blog";
    default: return "outros";
  }
}

export async function onRequest(context) {
  const { request, env } = context;
  if (!env.MEDIA) return json({ error: "O binding MEDIA do Cloudflare R2 ainda não está configurado no Pages." }, 503);
  const user = await authorize(request, env);
  if (!user) return json({ error: "Apenas administradores autenticados podem enviar mídias." }, 403);

  if (request.method === "GET") {
    const key = new URL(request.url).searchParams.get("key") || "";
    if (!key.startsWith(BUCKET_PREFIX)) return json({ error: "Caminho R2 inválido." }, 400);
    const object = await env.MEDIA.get(key);
    if (!object) return json({ error: "Arquivo não encontrado." }, 404);
    return new Response(object.body, { headers: { "content-type": object.httpMetadata?.contentType || "application/octet-stream", "cache-control": "public, max-age=3600" } });
  }

  if (request.method === "DELETE") {
    const body = await request.json().catch(() => ({}));
    const key = String(body.key || "");
    if (!key.startsWith(BUCKET_PREFIX)) return json({ error: "Caminho R2 inválido." }, 400);
    await env.MEDIA.delete(key);
    return json({ ok: true, key });
  }

  if (request.method !== "POST") return json({ error: "Método não suportado." }, 405);
  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "Nenhum arquivo foi enviado." }, 400);
  const kind = String(form.get("kind") || "gallery");
  const enterpriseName = String(form.get("enterpriseName") || "");
  if (!enterpriseName) return json({ error: "Informe o empreendimento." }, 400);
  const maxBytes = kind === "presentation" ? MAX_DOCUMENT_BYTES : MAX_IMAGE_BYTES;
  if (file.size <= 0 || file.size > maxBytes) return json({ error: `O arquivo excede o limite de ${Math.round(maxBytes / 1024 / 1024)} MB.` }, 413);
  if (kind !== "presentation" && !file.type.startsWith("image/")) return json({ error: "Envie uma imagem válida." }, 415);

  const folder = await resolveEnterpriseFolder(env.MEDIA, enterpriseName);
  const enterpriseId = safeName(form.get("enterpriseId") || "sem-id");
  const typologyId = safeName(form.get("typologyId") || "geral");
  const root = `${BUCKET_PREFIX}${folder}/${categoryFolder(kind)}`;
  const key = kind === "typology"
    ? `${root}/${typologyId}/${Date.now()}-${crypto.randomUUID()}-${safeName(file.name)}`
    : `${root}/${enterpriseId}/${Date.now()}-${crypto.randomUUID()}-${safeName(file.name)}`;
  await env.MEDIA.put(key, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" }, customMetadata: { uploadedBy: user.id, enterpriseName, kind } });
  return json({ ok: true, key, path: `r2://${key}`, url: publicUrl(key), folder, kind });
}
