const ROBOTS = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /painel/
Disallow: /acesso/
Disallow: /call/
Disallow: /calculadora/
Disallow: /projeto/
Disallow: /arvore/
Disallow: /katia/
Sitemap: https://luan-especialista.pro/sitemap.xml
`;

export function onRequest({ request }) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405,
      headers: {
        Allow: "GET, HEAD",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  }

  return new Response(request.method === "HEAD" ? null : ROBOTS, {
    status: 200,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=3600, must-revalidate",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
