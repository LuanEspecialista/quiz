(async function () {
  const config = window.LUAN_SITE_CONFIG || {};
  const supported = ["pt-BR", "en-US", "es"];
  const savedLocale = localStorage.getItem("luan.locale");
  const locale = supported.includes(savedLocale) ? savedLocale : "pt-BR";
  document.documentElement.lang = locale;

  const copy = {
    "pt-BR": { language: "Idioma", blocked: "Página indisponível", restrictedAccess: "Acesso restrito", talkSpecialist: "Falar com especialista", heroSubtitle: "Estratégias patrimoniais inteligentes", heroDescription: "Brasil e exterior conectados através de oportunidades estratégicas.", strategyTitle: "Estratégias Patrimoniais", strategyDescription: "Soluções para construir, proteger e multiplicar patrimônio no Brasil.", strategyCta: "Conhecer estratégia →", mobilityTitle: "Mobilidade & Experiências", mobilityDescription: "Frotas, lazer e operações comerciais transformadas em possibilidades reais.", mobilityCta: "Explorar possibilidades →", propertiesTitle: "Imóveis", propertiesDescription: "Oportunidades selecionadas no litoral de Santa Catarina para morar e investir.", propertiesCta: "Ver oportunidades →", miniStrategy: "Estratégia", miniPlanning: "Planejamento", miniWealth: "Patrimônio", miniOpportunities: "Oportunidades", copyright: "© 2026 Luan Especialista. Todos os direitos reservados.", rate: "Fonte: Banco Central do Brasil (PTAX)" },
    "en-US": { language: "Language", blocked: "Page unavailable", restrictedAccess: "Restricted access", talkSpecialist: "Talk to a specialist", heroSubtitle: "Intelligent wealth strategies", heroDescription: "Brazil and international markets connected through strategic opportunities.", strategyTitle: "Wealth Strategies", strategyDescription: "Solutions to build, protect and grow wealth in Brazil.", strategyCta: "Explore strategies →", mobilityTitle: "Mobility & Experiences", mobilityDescription: "Fleets, leisure and commercial operations transformed into real possibilities.", mobilityCta: "Explore possibilities →", propertiesTitle: "Properties", propertiesDescription: "Selected opportunities on the Santa Catarina coast for living and investing.", propertiesCta: "View opportunities →", miniStrategy: "Strategy", miniPlanning: "Planning", miniWealth: "Wealth", miniOpportunities: "Opportunities", copyright: "© 2026 Luan Especialista. All rights reserved.", rate: "Source: Central Bank of Brazil (PTAX)" },
    es: { language: "Idioma", blocked: "Página no disponible", restrictedAccess: "Acceso restringido", talkSpecialist: "Hablar con un especialista", heroSubtitle: "Estrategias patrimoniales inteligentes", heroDescription: "Brasil y mercados internacionales conectados mediante oportunidades estratégicas.", strategyTitle: "Estrategias Patrimoniales", strategyDescription: "Soluciones para construir, proteger y multiplicar el patrimonio en Brasil.", strategyCta: "Conocer estrategias →", mobilityTitle: "Movilidad y Experiencias", mobilityDescription: "Flotas, ocio y operaciones comerciales transformadas en posibilidades reales.", mobilityCta: "Explorar posibilidades →", propertiesTitle: "Inmuebles", propertiesDescription: "Oportunidades seleccionadas en la costa de Santa Catarina para vivir e invertir.", propertiesCta: "Ver oportunidades →", miniStrategy: "Estrategia", miniPlanning: "Planificación", miniWealth: "Patrimonio", miniOpportunities: "Oportunidades", copyright: "© 2026 Luan Especialista. Todos los derechos reservados.", rate: "Fuente: Banco Central de Brasil (PTAX)" }
  };
  const text = copy[locale];
  const css = document.createElement("style");
  css.textContent = ".luan-language{position:fixed;right:14px;top:14px;z-index:2147483646;display:flex;gap:2px;padding:3px;background:rgba(10,10,10,.82);border:1px solid rgba(197,160,89,.28);border-radius:999px;backdrop-filter:blur(8px)}.luan-language button{min-width:30px;padding:5px 7px;border:0;border-radius:999px;background:transparent;color:#a1a1aa;font:600 10px/1 Inter,Arial,sans-serif;cursor:pointer}.luan-language button[aria-pressed=true]{background:#c5a059;color:#090909}.luan-rate-note{font:10px/1.35 Inter,Arial,sans-serif;color:rgba(255,255,255,.48);text-align:center;margin:10px auto;max-width:720px}.luan-blocked{min-height:100vh;display:grid;place-items:center;background:#070707;color:#eee}";
  document.head.appendChild(css);

  const selector = document.createElement("nav");
  selector.className = "luan-language";
  selector.setAttribute("aria-label", text.language);
  selector.innerHTML = supported.map((value) => `<button type="button" data-locale="${value}" aria-pressed="${value === locale}">${value === "pt-BR" ? "PT" : value === "en-US" ? "EN" : "ES"}</button>`).join("");
  selector.addEventListener("click", (event) => {
    const button = event.target.closest("[data-locale]");
    if (!button || button.dataset.locale === locale) return;
    localStorage.setItem("luan.locale", button.dataset.locale);
    location.reload();
  });
  document.body.appendChild(selector);

  // A tradução visual não depende da rede: deve acontecer imediatamente.
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = text[element.dataset.i18n];
    if (value) element.textContent = value;
  });

  let client = null;
  let page = null;
  let siteSettings = null;
  let rate = null;
  const withTimeout = (promise, timeoutMs, message) => Promise.race([
    promise,
    new Promise((_, reject) => window.setTimeout(() => reject(new Error(message)), timeoutMs)),
  ]);
  if (config.supabaseUrl && config.supabaseAnonKey) {
    try {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
      document.head.appendChild(script);
      await withTimeout(new Promise((resolve, reject) => { script.onload = resolve; script.onerror = reject; }), 8000, "Tempo limite ao carregar o cliente remoto.");
      client = window.supabase.createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
      const path = (location.pathname.replace(/\/index\.html$/, "") || "/").replace(/\/?$/, "/");
      const results = await withTimeout(Promise.all([
        client.from("site_paginas").select("*").eq("caminho", path).maybeSingle(),
        client.from("site_configuracoes").select("idiomas_ativos, idioma_padrao, cambio_automatico, cotacao_manual, margem_cambio_percentual").eq("id", 1).maybeSingle(),
        client.from("cotacao_usd_brl_atual").select("cotacao, data_cotacao, manual").maybeSingle()
      ]), 8000, "Tempo limite ao consultar configurações e câmbio.");
      page = results[0].data;
      siteSettings = results[1].data;
      rate = results[2].data;
    } catch (error) {
      console.warn("Serviços remotos temporariamente indisponíveis; usando preferências locais.", error);
    }
  }

  if (page && !page.ativa) {
    document.body.innerHTML = `<main class="luan-blocked"><h1>${text.blocked}</h1></main>`;
    return;
  }
  if (Array.isArray(siteSettings?.idiomas_ativos)) {
    selector.querySelectorAll("[data-locale]").forEach((button) => { button.hidden = !siteSettings.idiomas_ativos.includes(button.dataset.locale); });
  }

  const remoteValue = Number(siteSettings?.cotacao_manual || rate?.cotacao);
  const cachedValue = Number(localStorage.getItem("luan.usdBrl"));
  const baseRate = Number.isFinite(remoteValue) && remoteValue > 0 ? remoteValue : cachedValue;
  const margin = Number(siteSettings?.margem_cambio_percentual || 0);
  const usdBrl = baseRate > 0 ? baseRate * (1 + margin / 100) : null;
  const rateDate = rate?.data_cotacao || localStorage.getItem("luan.usdBrlDate");
  if (usdBrl) {
    localStorage.setItem("luan.usdBrl", String(usdBrl));
    if (rateDate) localStorage.setItem("luan.usdBrlDate", rateDate);
  }

  const currency = locale === "pt-BR" ? "BRL" : "USD";
  const formatCurrency = (value) => new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 }).format(currency === "USD" && usdBrl ? value / usdBrl : value);
  if (locale !== "pt-BR" && usdBrl) {
    const moneyPattern = /R\$\s*([\d.]+(?:,\d{1,2})?)/g;
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) {
      const parent = walker.currentNode.parentElement;
      if (parent && !["SCRIPT", "STYLE", "NOSCRIPT"].includes(parent.tagName) && moneyPattern.test(walker.currentNode.nodeValue)) nodes.push(walker.currentNode);
      moneyPattern.lastIndex = 0;
    }
    nodes.forEach((node) => { node.nodeValue = node.nodeValue.replace(moneyPattern, (_, raw) => formatCurrency(Number(raw.replace(/\./g, "").replace(",", ".")))); });
  }

  if (usdBrl && document.body.textContent.match(/R\$|US\$/)) {
    const note = document.createElement("p");
    note.className = "luan-rate-note";
    note.textContent = `${text.rate}${rateDate ? ` · ${rateDate}` : ""}`;
    (document.querySelector("main") || document.body).appendChild(note);
  }
  window.LuanLocale = { locale, currency, usdBrl, rateDate, formatCurrency };
  window.dispatchEvent(new CustomEvent("luan:locale-ready", { detail: window.LuanLocale }));
})();
