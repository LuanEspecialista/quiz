const SITE_ORIGIN = "https://luan-especialista.pro";
const STATIC_ROUTES = [
  "/",
  "/quem-somos/",
  "/estrategias-patrimoniais/",
  "/alavancagem/",
  "/patrimonio/",
  "/imoveis/",
  "/blog/",
  "/mobilidade-experiencias/",
  "/brasil/",
  "/eua/",
  "/portugal/",
  "/espanha/",
  "/irlanda/",
  "/canada/",
  "/australia/",
  "/faq/",
  "/privacidade/",
  "/termos/",
];

const xmlEscape = (value) =>
  String(value).replace(/[&<>"']/g, (character) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[
      character
    ],
  );

const dateOnly = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
};

async function publishedPosts(env) {
  const base = String(env?.SUPABASE_URL || "").replace(/\/+$/, "");
  const key = env?.SUPABASE_ANON_KEY;
  if (!base || !key) return [];

  const endpoint = new URL(`${base}/rest/v1/blog_posts`);
  endpoint.searchParams.set("select", "slug,publicado_em,atualizado_em");
  endpoint.searchParams.set("status", "eq.publicado");
  endpoint.searchParams.set("order", "publicado_em.desc");
  endpoint.searchParams.set("limit", "1000");

  const response = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) return [];
  const result = await response.json();
  return Array.isArray(result) ? result : [];
}

export async function onRequest({ request, env }) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405,
      headers: {
        Allow: "GET, HEAD",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  const entries = new Map();
  for (const route of STATIC_ROUTES) {
    const loc = `${SITE_ORIGIN}${route}`;
    entries.set(loc, { loc, lastmod: "" });
  }

  try {
    const posts = await publishedPosts(env);
    for (const post of posts) {
      const slug = String(post?.slug || "");
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug) || slug.length > 160) {
        continue;
      }
      const loc = `${SITE_ORIGIN}/blog/${encodeURIComponent(slug)}/`;
      entries.set(loc, {
        loc,
        lastmod: dateOnly(post.atualizado_em || post.publicado_em),
      });
    }
  } catch {
    // Preserve a valid sitemap of known public static routes if the CMS is temporarily unavailable.
  }

  const urls = [...entries.values()]
    .map(
      ({ loc, lastmod }) =>
        `<url><loc>${xmlEscape(loc)}</loc>${
          lastmod ? `<lastmod>${xmlEscape(lastmod)}</lastmod>` : ""
        }</url>`,
    )
    .join("");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`;

  return new Response(request.method === "HEAD" ? null : xml, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=900, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
