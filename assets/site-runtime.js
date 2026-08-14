(async function () {
  const cfg = window.LUAN_SITE_CONFIG || {};
  const translations = {
    "pt-BR": {
      language: "Idioma", logout: "Sair", blocked: "Página indisponível",
      restrictedAccess: "Acesso restrito", talkSpecialist: "Falar com especialista",
      heroSubtitle: "Estratégias patrimoniais inteligentes",
      heroDescription: "Brasil e exterior conectados através de oportunidades estratégicas.",
      strategyTitle: "Estratégias Patrimoniais", strategyDescription: "Soluções para construir, proteger e multiplicar patrimônio no Brasil.", strategyCta: "Conhecer estratégia →",
      mobilityTitle: "Mobilidade & Experiências", mobilityDescription: "Frotas, lazer e operações comerciais transformadas em possibilidades reais.", mobilityCta: "Explorar possibilidades →",
      propertiesTitle: "Imóveis", propertiesDescription: "Oportunidades selecionadas no litoral de Santa Catarina para morar e investir.", propertiesCta: "Ver oportunidades →",
      copyright: "© 2026 Luan Especialista. Todos os direitos reservados."
    },
    "en-US": {
      language: "Language", logout: "Sign out", blocked: "Page unavailable",
      restrictedAccess: "Restricted access", talkSpecialist: "Talk to a specialist",
      heroSubtitle: "Intelligent wealth strategies",
      heroDescription: "Brazil and international markets connected through strategic opportunities.",
      strategyTitle: "Wealth Strategies", strategyDescription: "Solutions to build, protect and grow wealth in Brazil.", strategyCta: "Explore strategies →",
      mobilityTitle: "Mobility & Experiences", mobilityDescription: "Fleets, leisure and commercial operations transformed into real possibilities.", mobilityCta: "Explore possibilities →",
      propertiesTitle: "Properties", propertiesDescription: "Selected opportunities on the Santa Catarina coast for living and investing.", propertiesCta: "View opportunities →",
      copyright: "© 2026 Luan Especialista. All rights reserved."
    },
    es: {
      language: "Idioma", logout: "Salir", blocked: "Página no disponible",
      restrictedAccess: "Acceso restringido", talkSpecialist: "Hablar con un especialista",
      heroSubtitle: "Estrategias patrimoniales inteligentes",
      heroDescription: "Brasil y mercados internacionales conectados mediante oportunidades estratégicas.",
      strategyTitle: "Estrategias Patrimoniales", strategyDescription: "Soluciones para construir, proteger y multiplicar el patrimonio en Brasil.", strategyCta: "Conocer estrategias →",
      mobilityTitle: "Movilidad y Experiencias", mobilityDescription: "Flotas, ocio y operaciones comerciales transformadas en posibilidades reales.", mobilityCta: "Explorar posibilidades →",
      propertiesTitle: "Inmuebles", propertiesDescription: "Oportunidades seleccionadas en la costa de Santa Catarina para vivir e invertir.", propertiesCta: "Ver oportunidades →",
      copyright: "© 2026 Luan Especialista. Todos los derechos reservados."
    }
  };
  const locales = ["pt-BR", "en-US", "es"];
  const saved = localStorage.getItem("luan.locale");
  const locale = locales.includes(saved) ? saved : "pt-BR";
  const text = translations[locale];
  document.documentElement.lang = locale;

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    const value = text[element.dataset.i18n];
    if (value) element.textContent = value;
  });

  const css = document.createElement("style");
  css.textContent = ".luan-tools{position:fixed;right:14px;top:14px;z-index:2147483646}.luan-tools select{background:#101010;color:#e7be73;border:1px solid #5b4828;border-radius:999px;padding:8px 11px}";
  document.head.appendChild(css);
  const tools = document.createElement("div");
  tools.className = "luan-tools";
  tools.innerHTML = `<select aria-label="${text.language}"><option value="pt-BR">Português</option><option value="en-US">English</option><option value="es">Español</option></select>`;
  tools.querySelector("select").value = locale;
  tools.querySelector("select").onchange = (event) => {
    localStorage.setItem("luan.locale", event.target.value);
    location.reload();
  };
  document.body.appendChild(tools);

  if (!cfg.supabaseUrl || !cfg.supabaseAnonKey) return;
  const script = document.createElement("script");
  script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
  document.head.appendChild(script);
  await new Promise((resolve, reject) => { script.onload = resolve; script.onerror = reject; });
  const client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } });
  const path = (location.pathname.replace(/\/index\.html$/, "") || "/").replace(/\/?$/, "/");
  const { data: page } = await client.from("site_paginas").select("*").eq("caminho", path).maybeSingle();
  if (page && !page.ativa) document.body.innerHTML = `<main style="min-height:100vh;display:grid;place-items:center;background:#070707;color:#eee"><h1>${text.blocked}</h1></main>`;
})();
