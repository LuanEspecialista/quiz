const SITE_ORIGIN = "https://luan-especialista.pro";
const BLOG_SELECT = [
  "id",
  "titulo",
  "slug",
  "resumo",
  "conteudo",
  "categoria",
  "layout",
  "imagem_capa_url",
  "imagens",
  "blocos",
  "publicado_em",
  "atualizado_em",
  "seo_titulo",
  "seo_descricao",
  "palavras_chave",
].join(",");

const baseHeaders = {
  "Content-Type": "text/html; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cache-Control": "public, max-age=0, must-revalidate",
};

const esc = (value = "") =>
  String(value).replace(/[&<>"']/g, (character) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[character],
  );

const safeLink = (value = "") => {
  try {
    const url = new URL(String(value), SITE_ORIGIN);
    return /^https?:$/.test(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
};

const safeImage = (value = "") => {
  try {
    const url = new URL(String(value));
    return url.protocol === "https:" ? url.href : "";
  } catch {
    return "";
  }
};

const inline = (value = "") => {
  const raw = String(value || "");
  const pattern = /\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)\s]+)\)/g;
  let result = "";
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(raw))) {
    result += esc(raw.slice(lastIndex, match.index));
    const href = safeLink(match[2]);
    if (!href) {
      result += esc(match[0]);
    } else {
      const internal = new URL(href).origin === SITE_ORIGIN;
      result += `<a href="${esc(href)}" target="${internal ? "_self" : "_blank"}"${
        internal ? "" : ' rel="noopener noreferrer"'
      }>${esc(match[1])}</a>`;
    }
    lastIndex = pattern.lastIndex;
  }

  return result + esc(raw.slice(lastIndex));
};

const paragraphs = (value = "") =>
  String(value || "")
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((paragraph) => `<p>${inline(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");

const imageKey = (value = "") => {
  try {
    return decodeURIComponent(new URL(value).pathname)
      .toLowerCase()
      .replace(/\.[a-z0-9]+$/, "")
      .replace(/-[a-f0-9]{8,}$/, "");
  } catch {
    return String(value).toLowerCase();
  }
};

const formatDate = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
};

const isoDate = (value) => {
  if (!value) return "";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
};

function renderSection(section, post, used) {
  const type = section?.tipo || "texto";
  const title = section?.titulo ? `<h2>${esc(section.titulo)}</h2>` : "";
  const images = Array.isArray(post.imagens) ? post.imagens : [];

  if (type === "subtitulo") {
    return `<section class="content-block block-heading"><h2>${esc(
      section.titulo || section.texto,
    )}</h2></section>`;
  }

  if (type === "destaque") {
    return `<blockquote class="content-block">${inline(
      section.texto || section.titulo,
    )}</blockquote>`;
  }

  if (type === "dado") {
    return `<aside class="content-block fact">${title}<p>${inline(
      section.texto,
    )}</p></aside>`;
  }

  if (type === "lista" || type === "comparativo") {
    const items = (Array.isArray(section.itens) ? section.itens : []).filter(
      Boolean,
    );
    if (type === "comparativo") {
      return `<section class="content-block block-compare">${title}<div class="compare-grid">${items
        .map((item) => `<article>${inline(item)}</article>`)
        .join("")}</div></section>`;
    }
    return `<section class="content-block block-list">${title}<ul>${items
      .map((item) => `<li>${inline(item)}</li>`)
      .join("")}</ul></section>`;
  }

  if (type === "imagem" || type === "imagem_texto") {
    const requested = safeImage(section.imagem_url);
    const fallback = images.find(
      (image) => safeImage(image?.url) && !used.has(imageKey(image.url)),
    );
    const url =
      requested && !used.has(imageKey(requested))
        ? requested
        : safeImage(fallback?.url);
    if (!url || used.has(imageKey(url))) {
      return `<section class="content-block block-text">${title}${paragraphs(
        section.texto,
      )}</section>`;
    }

    used.add(imageKey(url));
    const alignment = ["esquerda", "direita", "centro"].includes(
      section.alinhamento,
    )
      ? section.alinhamento
      : "esquerda";
    const size = ["pequena", "media", "ampla"].includes(section.tamanho)
      ? section.tamanho
      : "media";
    const ratio = ["quadrada", "vertical", "paisagem"].includes(
      section.proporcao,
    )
      ? section.proporcao
      : "paisagem";

    return `<section class="content-block media-copy align-${alignment} size-${size}"><figure class="ratio-${ratio}"><img src="${esc(
      url,
    )}" loading="lazy" decoding="async" alt="${esc(
      section.imagem_alt || fallback?.alt || post.titulo,
    )}"><figcaption>${esc(
      section.legenda || fallback?.legenda || "",
    )}</figcaption></figure>${
      type === "imagem_texto"
        ? `<div>${title}${paragraphs(section.texto)}</div>`
        : ""
    }</section>`;
  }

  if (type === "galeria") {
    const pool =
      Array.isArray(section.imagens) && section.imagens.length
        ? section.imagens
        : images;
    const selected = pool.filter(
      (image) => safeImage(image?.url) && !used.has(imageKey(image.url)),
    );
    selected.forEach((image) => used.add(imageKey(image.url)));

    if (!selected.length) {
      const notes = (Array.isArray(section.itens) ? section.itens : []).filter(
        Boolean,
      );
      return notes.length
        ? `<section class="content-block block-list">${title}<ul>${notes
            .map((item) => `<li>${inline(item)}</li>`)
            .join("")}</ul>${paragraphs(section.texto)}</section>`
        : paragraphs(section.texto);
    }

    return `<section class="content-block carousel">${title}<div class="carousel-track">${selected
      .map(
        (image) =>
          `<figure><img src="${esc(safeImage(image.url))}" loading="lazy" decoding="async" alt="${esc(
            image.alt || post.titulo,
          )}"><figcaption>${esc(image.legenda || "")}</figcaption></figure>`,
      )
      .join("")}</div>${
      selected.length > 1
        ? '<button class="prev" aria-label="Anterior">‹</button><button class="next" aria-label="Próxima">›</button>'
        : ""
    }</section>`;
  }

  if (type === "video") {
    const raw = safeLink(section.video_url);
    const label = esc(section.video_titulo || section.titulo || "Vídeo");
    if (/\.(mp4|webm|ogg)(?:\?|$)/i.test(raw)) {
      return `<section class="content-block video">${title}<video controls playsinline preload="metadata" title="${label}"><source src="${esc(
        raw,
      )}"></video></section>`;
    }
    if (!raw) return "";
    const url = new URL(raw);
    let embed = "";
    if (url.hostname.includes("youtu.be")) {
      embed = `https://www.youtube-nocookie.com/embed/${url.pathname.slice(1)}`;
    } else if (url.hostname.includes("youtube.com")) {
      embed = `https://www.youtube-nocookie.com/embed/${
        url.searchParams.get("v") || url.pathname.split("/").pop()
      }`;
    } else if (url.hostname.includes("vimeo.com")) {
      embed = `https://player.vimeo.com/video/${url.pathname
        .split("/")
        .filter(Boolean)
        .pop()}`;
    }
    return embed
      ? `<section class="content-block video">${title}<iframe src="${esc(
          embed,
        )}" title="${label}" loading="lazy" allowfullscreen></iframe></section>`
      : "";
  }

  if (type === "pergunta" || type === "cta") {
    const actionUrl =
      safeLink(section.acao_url) ||
      `https://wa.me/5547992120915?text=${encodeURIComponent(
        `${section.acao_rotulo || "Quero orientação"} — ${post.titulo}`,
      )}`;
    const action = section.acao_rotulo
      ? `<a class="micro-action" href="${esc(
          actionUrl,
        )}" target="_blank" rel="noopener noreferrer">${esc(
          section.acao_rotulo,
        )} →</a>`
      : "";
    return `<aside class="content-block prompt ${
      type === "cta" ? "prompt-cta" : ""
    }">${title}${paragraphs(section.texto)}${action}</aside>`;
  }

  return `<section class="content-block block-text">${title}${paragraphs(
    section.texto,
  )}</section>`;
}

function renderReadingMap(sections) {
  const items = sections
    .filter((section) => section.titulo && section.tipo !== "cta")
    .slice(0, 4);
  if (!items.length) return "";
  return `<aside class="reading-map"><div><span class="map-kicker">NESTA LEITURA</span><strong>Uma visão organizada para você decidir melhor.</strong></div><ol>${items
    .map(
      (section, index) =>
        `<li><span>${String(index + 1).padStart(2, "0")}</span>${esc(
          section.titulo,
        )}</li>`,
    )
    .join("")}</ol></aside>`;
}

function renderSources(blocks) {
  const sources = (Array.isArray(blocks.fontes) ? blocks.fontes : []).filter(
    (source) => safeLink(source?.url),
  );
  if (!sources.length) return "";
  return `<section class="sources"><details><summary>Fontes consultadas e referências</summary><ol>${sources
    .map(
      (source) =>
        `<li><a href="${esc(safeLink(source.url))}" target="_blank" rel="noopener noreferrer">${esc(
          source.titulo || source.veiculo || source.url,
        )}</a>${
          source.veiculo && source.titulo ? ` · ${esc(source.veiculo)}` : ""
        }${source.data ? ` · ${esc(source.data)}` : ""}</li>`,
    )
    .join("")}</ol></details></section>`;
}

function renderRemainingImages(images, used) {
  const remaining = (Array.isArray(images) ? images : []).filter(
    (image) => safeImage(image?.url) && !used.has(imageKey(image.url)),
  );
  remaining.forEach((image) => used.add(imageKey(image.url)));
  if (!remaining.length) return "";
  return `<section class="content-block carousel editorial-gallery"><h2>Galeria do empreendimento</h2><div class="carousel-track">${remaining
    .map(
      (image) =>
        `<figure><img src="${esc(safeImage(image.url))}" loading="lazy" decoding="async" alt="${esc(
          image.alt || "Imagem do empreendimento",
        )}"><figcaption>${esc(image.legenda || "")}</figcaption></figure>`,
    )
    .join("")}</div>${
    remaining.length > 1
      ? '<button class="prev" aria-label="Anterior">‹</button><button class="next" aria-label="Próxima">›</button>'
      : ""
  }</section>`;
}

function renderArticle(post) {
  const blocks = post.blocos || {};
  const sections = Array.isArray(blocks.secoes) ? blocks.secoes : [];
  const images = Array.isArray(post.imagens) ? post.imagens : [];
  const hero = safeImage(post.imagem_capa_url);
  const used = new Set();
  if (hero && blocks.exibir_hero !== false) used.add(imageKey(hero));
  const body = sections.length
    ? sections.map((section) => renderSection(section, post, used)).join("")
    : paragraphs(post.conteudo || post.resumo);
  const gallery = renderRemainingImages(images, used);
  const hasInlineCta = sections.some((section) => section.tipo === "cta");
  const finalCta =
    !hasInlineCta && blocks.cta
      ? `<section class="article-cta"><div><p class="eyebrow">PRÓXIMO PASSO</p><h2>${esc(
          blocks.cta,
        )}</h2></div><a href="https://wa.me/5547992120915?text=${encodeURIComponent(
          `Olá, equipe Luan Especialista. Li o artigo “${post.titulo}” e gostaria de receber orientação.`,
        )}" target="_blank" rel="noopener noreferrer">Falar com a equipe →</a></section>`
      : "";
  const layout = ["artigo", "guia", "mercado", "comparativo", "case", "imovel"].includes(
    post.layout,
  )
    ? post.layout
    : "artigo";
  const intent = [
    "descoberta",
    "guia",
    "comparacao",
    "decisao",
    "oportunidade",
    "autoridade",
  ].includes(blocks.intencao)
    ? blocks.intencao
    : "descoberta";
  const minutes = Math.max(
    1,
    Number(blocks.leitura_minutos) || Math.max(2, Math.ceil((post.conteudo || "").length / 1000)),
  );
  const heroMarkup =
    hero && blocks.exibir_hero !== false
      ? `<figure class="hero-figure"><img src="${esc(hero)}" fetchpriority="high" decoding="async" alt="${esc(
          images.find((image) => imageKey(image.url) === imageKey(hero))?.alt ||
            post.titulo,
        )}"></figure>`
      : "";

  return `<a class="back" href="/blog/" aria-label="Voltar aos Insights">←&nbsp; Voltar aos Insights</a><header class="article-head"><p class="eyebrow">${esc(
    post.categoria || "Insights",
  )} <span class="meta-dot">·</span> <time datetime="${esc(
    isoDate(post.publicado_em),
  )}">${esc(formatDate(post.publicado_em))}</time> <span class="meta-dot">·</span> ${minutes} min de leitura</p><h1>${esc(
    post.titulo,
  )}</h1><p class="deck">${esc(post.resumo || "")}</p></header>${heroMarkup}<main class="article-flow">${renderReadingMap(
    sections,
  )}${body}${gallery}</main>${renderSources(blocks)}${finalCta}<section class="engagement"><h2>Este conteúdo foi útil?</h2><div class="stars">${[
    1, 2, 3, 4, 5,
  ]
    .map(
      (rating) =>
        `<button data-rate="${rating}" aria-label="${rating} estrelas">★</button>`,
    )
    .join("")}</div><p class="feedback"></p><div class="lead-box"><div class="lead-intro"><h3>Receba conteúdos de acordo com seus objetivos</h3><p>Identifique-se rapidamente. Isso não libera automaticamente a área privada nem cria qualquer compromisso.</p><button type="button" class="google-login" hidden>Continuar com Google</button><form class="magic-login"><input required type="email" name="email" placeholder="Seu melhor e-mail"><button>Continuar por e-mail</button></form></div><div class="lead-profile" hidden><h3>Bem-vindo, <span></span></h3><p>O que você gostaria de realizar?</p><div class="interest-grid"></div><div class="lead-actions"><button type="button" class="save-interests">Salvar interesses</button><a class="team-whatsapp" target="_blank" rel="noopener noreferrer">Falar com a equipe</a></div></div></div><form class="comment"><label>Deixe uma pergunta ou comentário<textarea required minlength="10" maxlength="1200" name="comentario"></textarea></label><label>Seu nome (opcional)<input maxlength="80" name="nome"></label><button>Enviar para moderação</button></form></section><i class="engagement-data" hidden data-id="${esc(
    post.id,
  )}" data-title="${esc(post.titulo)}" data-session=""></i>`;
}

function setMeta(name, content, attribute = "name") {
  if (!content) return "";
  return `<meta ${attribute}="${esc(name)}" content="${esc(content)}">`;
}

function renderPage(post) {
  const title = String(post.seo_titulo || post.titulo || "Insights").trim();
  const description = String(post.seo_descricao || post.resumo || "").trim();
  const slug = encodeURIComponent(post.slug);
  const canonical = `${SITE_ORIGIN}/blog/${slug}/`;
  const hero =
    safeImage(post.imagem_capa_url) ||
    safeImage(post.blocos?.imagem_card_url) ||
    safeImage(post.imagens?.[0]?.url);
  const keywords = Array.isArray(post.palavras_chave)
    ? post.palavras_chave.slice(0, 8).join(", ")
    : "";
  const published = isoDate(post.publicado_em);
  const modified = isoDate(post.atualizado_em || post.publicado_em);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Article",
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical },
    headline: post.titulo,
    description,
    image: hero ? [hero] : undefined,
    datePublished: published || undefined,
    dateModified: modified || published || undefined,
    author: { "@type": "Organization", name: "Luan Especialista" },
    publisher: {
      "@type": "Organization",
      name: "Luan Especialista",
      logo: {
        "@type": "ImageObject",
        url: `${SITE_ORIGIN}/imagens/logo.png`,
      },
    },
    inLanguage: "pt-BR",
  };
  const jsonLd = JSON.stringify(structuredData).replace(/</g, "\\u003c");
  const articleHtml = renderArticle(post);
  const preload = hero
    ? `<link rel="preload" as="image" href="${esc(hero)}" fetchpriority="high"><link rel="preconnect" href="https://santerempreendimentos.com.br" crossorigin>`
    : "";
  const meta = [
    setMeta("description", description),
    setMeta("keywords", keywords),
    setMeta("robots", "index,follow"),
    setMeta("og:type", "article", "property"),
    setMeta("og:title", title, "property"),
    setMeta("og:description", description, "property"),
    setMeta("og:url", canonical, "property"),
    setMeta("og:site_name", "Luan Especialista", "property"),
    setMeta("og:image", hero, "property"),
    setMeta("twitter:card", "summary_large_image"),
    setMeta("twitter:title", title),
    setMeta("twitter:description", description),
    setMeta("twitter:image", hero),
    setMeta("article:published_time", published, "property"),
    setMeta("article:modified_time", modified, "property"),
  ].join("");

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${meta}
  <title>${esc(title)}</title>
  <link rel="canonical" href="${esc(canonical)}">
  ${preload}
  <link rel="icon" href="/favicon.ico">
  <link rel="stylesheet" href="/assets/blog.css">
  <link rel="stylesheet" href="/assets/blog-editorial.css?v=20260905-1">
  <link rel="stylesheet" href="/assets/blog-compact.css?v=20261007-13">
  <link rel="stylesheet" href="/assets/blog-brand.css?v=20261005-1">
  <script type="application/ld+json">${jsonLd}</script>
  <script src="/assets/site-config.js"></script>
  <script defer src="/assets/blog.js?v=20261007-4"></script>
  <script defer src="/assets/site-runtime.js?v=20261007-3"></script>
  <script defer src="/assets/public-quotations.js?v=20261007-1"></script>
</head>
<body>
  <header class="site-header">
    <a class="brand" href="/" aria-label="Página inicial Luan Especialista"><img src="/imagens/logo.png" alt="Luan Especialista"></a>
    <nav><a href="/">Início</a><a href="/imoveis/">Oportunidades</a><a href="/estrategias-patrimoniais/">Estratégias</a><a class="active" href="/blog/">Insights</a></nav>
    <a class="contact" href="https://api.whatsapp.com/send?phone=5547992120915">Falar com especialista</a>
  </header>
  <main>
    <section class="intro" id="intro" hidden><p class="eyebrow">CONHECIMENTO PARA DECIDIR MELHOR</p><h1>Insights</h1></section>
    <div id="filters" hidden></div>
    <section id="posts" class="article article-${esc(
      post.layout || "artigo",
    )} intent-${esc(post.blocos?.intencao || "descoberta")}" aria-live="polite">${articleHtml}</section>
    <section class="newsletter" aria-labelledby="newsletter-title">
      <div><p class="eyebrow">RECEBA APENAS O QUE IMPORTA</p><h2 id="newsletter-title">Oportunidades e leituras,<br>com discrição.</h2><p>Seleção periódica. Sem excesso de mensagens e com descadastro simples.</p></div>
      <form id="newsletter-form" novalidate><label for="newsletter-name">Nome <span>opcional</span></label><input id="newsletter-name" name="name" autocomplete="name" maxlength="120" placeholder="Como podemos chamar você?"><label for="newsletter-email">Seu melhor e-mail</label><input id="newsletter-email" name="email" type="email" autocomplete="email" required maxlength="254" placeholder="voce@exemplo.com"><input class="honeypot" name="company" tabindex="-1" autocomplete="off" aria-hidden="true"><label class="consent"><input id="newsletter-consent" type="checkbox" required><span>Autorizo o uso do meu e-mail para receber conteúdos e oportunidades, conforme a <a href="/privacidade/">Política de Privacidade</a>.</span></label><button type="submit">Quero receber insights</button><p class="form-status" id="newsletter-status" role="status"></p></form>
    </section>
  </main>
  <footer><div><strong>Luan Especialista</strong><span>Estratégia patrimonial, imóveis e decisões com contexto.</span></div><div><a href="/quem-somos/">Quem somos</a><a href="/faq/">Perguntas frequentes</a><a href="/privacidade/">Privacidade</a><a href="/termos/">Termos de uso</a></div><div><a href="https://api.whatsapp.com/send?phone=5547992120915">WhatsApp: +55 47 99212-0915</a><a href="mailto:contato@luan-especialista.pro">contato@luan-especialista.pro</a><span>© 2026 Luan Especialista</span></div></footer>
</body>
</html>`;
}

async function loadPosts(context) {
  const supabaseUrl = String(context.env?.SUPABASE_URL || "").replace(/\/+$/, "");
  const anonKey = context.env?.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) throw new Error("missing-public-database-config");

  const endpoint = new URL(`${supabaseUrl}/rest/v1/blog_posts`);
  endpoint.searchParams.set("select", BLOG_SELECT);
  endpoint.searchParams.set("status", "eq.publicado");
  endpoint.searchParams.set("order", "publicado_em.desc");
  endpoint.searchParams.set("limit", "1000");
  const response = await fetch(endpoint, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) throw new Error("public-post-list-fetch-failed");
  const rows = await response.json();
  return Array.isArray(rows) ? rows : [];
}

function renderBlogCard(post, index) {
  const blocks = post.blocos || {};
  const images = Array.isArray(post.imagens) ? post.imagens : [];
  const cover =
    safeImage(blocks.imagem_card_url) ||
    safeImage(post.imagem_capa_url) ||
    safeImage(images[0]?.url);
  const minutes = Math.max(
    1,
    Number(blocks.leitura_minutos) ||
      Math.max(2, Math.ceil((post.conteudo || "").length / 1000)),
  );
  const intent = blocks.intencao || "descoberta";
  const intentLabel =
    intent === "decisao"
      ? "PARA DECIDIR"
      : intent === "guia"
        ? "GUIA PRÁTICO"
        : "PARA DESCOBRIR";
  const coverMarkup = cover
    ? `<img class="post-image" src="${esc(cover)}" loading="lazy" decoding="async" alt="${esc(
        blocks.imagem_card_alt || post.titulo,
      )}">`
    : "";

  return `<article class="post ${index === 0 ? "post-featured" : ""}">${coverMarkup}<div class="post-copy"><div class="post-meta"><span>${esc(
    post.categoria || "Insights",
  )}</span><span>${minutes} min</span></div><div class="post-intent">${intentLabel}</div><h2>${esc(
    post.titulo,
  )}</h2><p>${esc(post.resumo || "")}</p><a class="post-read" href="/blog/${encodeURIComponent(
    post.slug,
  )}/">Ler a análise <span>→</span></a></div></article>`;
}

function renderBlogIndex(posts) {
  const items = Array.isArray(posts) ? posts : [];
  const title = "Insights sobre Imóveis e Patrimônio | Luan Especialista";
  const description =
    "Análises sobre imóveis, patrimônio e mercado no litoral de Santa Catarina — conteúdo claro para decisões patrimoniais com mais contexto.";
  const keywords = [
    "imóveis no litoral de Santa Catarina",
    "mercado imobiliário",
    "estratégia patrimonial",
    "investimentos imobiliários",
    "imóveis em Penha SC",
    "patrimônio",
  ].join(", ");
  const canonical = `${SITE_ORIGIN}/blog/`;
  const socialImage =
    safeImage(items[0]?.imagem_capa_url) ||
    safeImage(items[0]?.blocos?.imagem_card_url) ||
    `${SITE_ORIGIN}/imagens/logo.png`;
  const categories = [
    "Todos",
    ...new Set(items.map((post) => post.categoria).filter(Boolean)),
  ];
  const categoryButtons = categories
    .map(
      (category, index) =>
        `<button class="filter ${index === 0 ? "active" : ""}" data-category="${esc(
          category,
        )}">${esc(category)}</button>`,
    )
    .join("");
  const cards = items.length
    ? items.map(renderBlogCard).join("")
    : '<div class="empty"><strong>Estamos preparando as próximas leituras.</strong><span>Enquanto isso, conheça as oportunidades selecionadas ou fale com a equipe para organizar sua próxima decisão.</span><div><a href="/imoveis/">Ver oportunidades →</a><a href="https://wa.me/5547992120915?text=Ol%C3%A1%2C%20quero%20receber%20as%20pr%C3%B3ximas%20leituras%20da%20Luan%20Especialista." target="_blank" rel="noopener">Falar com a equipe →</a></div></div>';
  const itemList = items.slice(0, 20).map((post, index) => ({
    "@type": "ListItem",
    position: index + 1,
    url: `${SITE_ORIGIN}/blog/${encodeURIComponent(post.slug)}/`,
    name: post.titulo,
  }));
  const jsonLd = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url: canonical,
    mainEntity: { "@type": "ItemList", itemListElement: itemList },
    inLanguage: "pt-BR",
  }).replace(/</g, "\\u003c");
  const meta = [
    setMeta("description", description),
    setMeta("keywords", keywords),
    setMeta("robots", "index,follow"),
    setMeta("og:type", "website", "property"),
    setMeta("og:title", title, "property"),
    setMeta("og:description", description, "property"),
    setMeta("og:url", canonical, "property"),
    setMeta("og:site_name", "Luan Especialista", "property"),
    setMeta("og:image", socialImage, "property"),
    setMeta("twitter:card", "summary_large_image"),
    setMeta("twitter:title", title),
    setMeta("twitter:description", description),
    setMeta("twitter:image", socialImage),
  ].join("");

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  ${meta}
  <title>${esc(title)}</title>
  <link rel="canonical" href="${esc(canonical)}">
  <link rel="preload" as="image" href="${esc(socialImage)}" fetchpriority="high">
  <link rel="preconnect" href="https://santerempreendimentos.com.br" crossorigin>
  <link rel="icon" href="/favicon.ico">
  <link rel="stylesheet" href="/assets/blog.css">
  <link rel="stylesheet" href="/assets/blog-editorial.css?v=20260905-1">
  <link rel="stylesheet" href="/assets/blog-compact.css?v=20261007-13">
  <link rel="stylesheet" href="/assets/blog-brand.css?v=20261005-1">
  <script type="application/ld+json">${jsonLd}</script>
  <script src="/assets/site-config.js"></script>
  <script defer src="/assets/blog.js?v=20261007-4"></script>
  <script defer src="/assets/site-runtime.js?v=20261007-3"></script>
  <script defer src="/assets/public-quotations.js?v=20261007-1"></script>
</head>
<body>
  <header class="site-header">
    <a class="brand" href="/" aria-label="Página inicial Luan Especialista"><img src="/imagens/logo.png" alt="Luan Especialista"></a>
    <nav><a href="/">Início</a><a href="/imoveis/">Oportunidades</a><a href="/estrategias-patrimoniais/">Estratégias</a><a class="active" href="/blog/">Insights</a></nav>
    <a class="contact" href="https://api.whatsapp.com/send?phone=5547992120915">Falar com especialista</a>
  </header>
  <main>
    <section class="intro" id="intro"><p class="eyebrow">CONHECIMENTO PARA DECIDIR MELHOR</p><h1>Insights que transformam<br><em>informação em direção.</em></h1><p class="lead">Leituras objetivas sobre imóveis, patrimônio, mercado e o litoral de Santa Catarina.</p><div class="filters" id="filters" aria-label="Filtrar artigos">${categoryButtons}</div></section>
    <section class="posts" id="posts" aria-live="polite">${cards}</section>
    <section class="newsletter" aria-labelledby="newsletter-title">
      <div><p class="eyebrow">RECEBA APENAS O QUE IMPORTA</p><h2 id="newsletter-title">Oportunidades e leituras,<br>com discrição.</h2><p>Seleção periódica. Sem excesso de mensagens e com descadastro simples.</p></div>
      <form id="newsletter-form" novalidate><label for="newsletter-name">Nome <span>opcional</span></label><input id="newsletter-name" name="name" autocomplete="name" maxlength="120" placeholder="Como podemos chamar você?"><label for="newsletter-email">Seu melhor e-mail</label><input id="newsletter-email" name="email" type="email" autocomplete="email" required maxlength="254" placeholder="voce@exemplo.com"><input class="honeypot" name="company" tabindex="-1" autocomplete="off" aria-hidden="true"><label class="consent"><input id="newsletter-consent" type="checkbox" required><span>Autorizo o uso do meu e-mail para receber conteúdos e oportunidades, conforme a <a href="/privacidade/">Política de Privacidade</a>.</span></label><button type="submit">Quero receber insights</button><p class="form-status" id="newsletter-status" role="status"></p></form>
    </section>
  </main>
  <footer><div><strong>Luan Especialista</strong><span>Estratégia patrimonial, imóveis e decisões com contexto.</span></div><div><a href="/quem-somos/">Quem somos</a><a href="/faq/">Perguntas frequentes</a><a href="/privacidade/">Privacidade</a><a href="/termos/">Termos de uso</a></div><div><a href="https://api.whatsapp.com/send?phone=5547992120915">WhatsApp: +55 47 99212-0915</a><a href="mailto:contato@luan-especialista.pro">contato@luan-especialista.pro</a><span>© 2026 Luan Especialista</span></div></footer>
</body>
</html>`;
}

function errorPage(status, heading, message) {
  const body = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(
    heading,
  )} | Luan Especialista</title><link rel="stylesheet" href="/assets/blog.css"><link rel="stylesheet" href="/assets/blog-compact.css?v=20261007-13"><link rel="stylesheet" href="/assets/blog-brand.css?v=20261005-1"></head><body><main><section class="empty"><strong>${esc(
    heading,
  )}</strong><span>${esc(message)}</span><a href="/blog/">Voltar aos Insights →</a></section></main></body></html>`;
  return new Response(body, {
    status,
    headers: { ...baseHeaders, "X-Robots-Tag": "noindex, nofollow" },
  });
}

async function loadPost(context, slug) {
  const supabaseUrl = String(context.env?.SUPABASE_URL || "").replace(/\/+$/, "");
  const anonKey = context.env?.SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) throw new Error("missing-public-database-config");

  const endpoint = new URL(`${supabaseUrl}/rest/v1/blog_posts`);
  endpoint.searchParams.set("select", BLOG_SELECT);
  endpoint.searchParams.set("slug", `eq.${slug}`);
  endpoint.searchParams.set("status", "eq.publicado");
  endpoint.searchParams.set("limit", "1");

  const response = await fetch(endpoint, {
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) throw new Error("public-post-fetch-failed");
  const rows = await response.json();
  return Array.isArray(rows) ? rows[0] || null : null;
}

function responseForMethod(body, method, status, headers = baseHeaders) {
  return new Response(method === "HEAD" ? null : body, { status, headers });
}

export async function onRequest(context) {
  const request = context.request;
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    return new Response("Method not allowed", {
      status: 405,
      headers: { Allow: "GET, HEAD", "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const url = new URL(request.url);
  if (url.searchParams.get("preview") === "1") {
    const response = await context.next();
    const headers = new Headers(response.headers);
    headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");
    headers.set("Cache-Control", "no-store");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  const pathSegments = url.pathname
    .split("/")
    .filter(Boolean)
    .slice(1);
  const querySlug = url.searchParams.get("post");
  if (!querySlug && !pathSegments.length) {
    try {
      const posts = await loadPosts(context);
      const html = renderBlogIndex(posts);
      return responseForMethod(html, method, 200, {
        ...baseHeaders,
        "X-Robots-Tag": "index, follow",
      });
    } catch {
      return context.next();
    }
  }
  if (!querySlug && pathSegments[0] === "index.html") {
    return context.next();
  }
  if (pathSegments.length > 1) {
    return errorPage(404, "Conteúdo não encontrado", "Confira o endereço ou volte aos Insights.");
  }

  const slug = String(querySlug || pathSegments[0] || "").trim();
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(slug) || slug.length > 160) {
    return errorPage(404, "Conteúdo não encontrado", "Confira o endereço ou volte aos Insights.");
  }

  try {
    const post = await loadPost(context, slug);
    if (!post) {
      return errorPage(404, "Conteúdo não encontrado", "Este artigo não está disponível ou foi retirado do ar.");
    }
    const html = renderPage(post);
    const headers = {
      ...baseHeaders,
      "X-Robots-Tag": "index, follow",
    };
    return responseForMethod(html, method, 200, headers);
  } catch {
    return errorPage(
      503,
      "Não foi possível carregar este artigo agora",
      "Tente novamente em instantes ou volte aos Insights.",
    );
  }
}
