(function () {
  "use strict";

  if (window.__luanPublicQuotationsLoaded) return;
  window.__luanPublicQuotationsLoaded = true;

  var config = window.LUAN_SITE_CONFIG || {};
  var supabaseUrl = String(config.supabaseUrl || "").replace(/\/$/, "");
  var anonKey = String(config.supabaseAnonKey || "");
  if (!supabaseUrl || !anonKey || !document.body) return;

  var logoUrl = "/imagens/logo.png";
  var formatters = {
    pct: new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    money: new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    decimal: new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 4 })
  };

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>\"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;", "'": "&#39;" })[char];
    });
  }

  function categoryLabel(value) {
    var labels = {
      CONSTRUCAO: "Construção",
      RENDA_FIXA: "Renda fixa",
      MOEDA: "Moedas",
      IMOBILIARIO_M2: "Imobiliário",
      CRIPTO: "Ativos digitais",
      INFLACAO: "Inflação"
    };
    return labels[String(value || "").toUpperCase()] || "Indicador";
  }

  function formatValue(item) {
    var value = Number(item.valor_atual != null ? item.valor_atual : item.valor);
    if (!Number.isFinite(value)) return "—";
    var category = String(item.categoria || "").toUpperCase();
    if (category === "MOEDA" || category === "IMOBILIARIO_M2" || category === "CRIPTO") return formatters.money.format(value);
    if (category === "CONSTRUCAO" || category === "RENDA_FIXA" || category === "INFLACAO" || item.unidade === "%") return formatters.pct.format(value) + "%";
    return formatters.decimal.format(value) + (item.unidade ? " " + esc(item.unidade) : "");
  }

  function getDate(item) {
    var raw = item.updated_at || item.data_atualizacao;
    if (!raw) return "Atualização não informada";
    var date = new Date(raw);
    if (Number.isNaN(date.getTime())) return "Atualização não informada";
    return "Atualizado em " + date.toLocaleDateString("pt-BR");
  }

  function injectStyles() {
    if (document.getElementById("luan-public-quotations-style")) return;
    var style = document.createElement("style");
    style.id = "luan-public-quotations-style";
    style.textContent = [
      ".luan-q-trigger{position:fixed;right:18px;bottom:18px;z-index:2147483000;width:54px;height:54px;border:1px solid #c5a059;border-radius:50%;background:#0b0b0c;box-shadow:0 10px 30px #0009;display:grid;place-items:center;cursor:pointer;transition:transform .2s ease,box-shadow .2s ease}",
      ".luan-q-trigger:hover{transform:translateY(-2px);box-shadow:0 14px 34px #000b}",
      ".luan-q-trigger img{width:31px;height:31px;object-fit:contain}",
      ".luan-q-overlay{position:fixed;inset:0;z-index:2147483001;background:#050505d9;display:grid;place-items:center;padding:18px;opacity:0;pointer-events:none;transition:opacity .2s ease}",
      ".luan-q-overlay.is-open{opacity:1;pointer-events:auto}",
      ".luan-q-panel{width:min(960px,100%);max-height:min(760px,92vh);overflow:auto;background:#111113;color:#f7f3eb;border:1px solid #4c3b21;border-radius:18px;box-shadow:0 24px 80px #000b;padding:clamp(20px,4vw,42px);font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}",
      ".luan-q-head{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;border-bottom:1px solid #2c2924;padding-bottom:22px;margin-bottom:24px}",
      ".luan-q-brand{display:flex;align-items:center;gap:13px}.luan-q-brand img{width:48px;height:48px;object-fit:contain}.luan-q-eyebrow{margin:0 0 7px;color:#c5a059;font-size:11px;letter-spacing:.18em;text-transform:uppercase}.luan-q-title{margin:0;font-size:clamp(22px,4vw,34px);font-weight:500;letter-spacing:-.03em}.luan-q-close{border:1px solid #3b3730;background:transparent;color:#ddd5c7;border-radius:9px;width:38px;height:38px;font-size:22px;line-height:1;cursor:pointer}.luan-q-close:hover{background:#26221b}",
      ".luan-q-intro{color:#a9a29a;font-size:14px;line-height:1.6;margin:-10px 0 22px;max-width:680px}",
      ".luan-q-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:12px}.luan-q-card{background:linear-gradient(145deg,#1a1815,#121214);border:1px solid #302d28;border-radius:13px;padding:17px;min-height:126px}.luan-q-card:hover{border-color:#745a2b}.luan-q-category{color:#c5a059;font-size:10px;letter-spacing:.1em;text-transform:uppercase}.luan-q-name{font-size:16px;font-weight:600;margin:9px 0 5px;line-height:1.25}.luan-q-meta{color:#807a73;font-size:11px;min-height:16px}.luan-q-value{color:#f0d395;font-size:22px;font-weight:600;margin-top:16px;letter-spacing:-.02em}.luan-q-date{color:#706b64;font-size:10px;margin-top:8px}.luan-q-status{color:#a9a29a;font-size:13px;padding:18px 0}.luan-q-foot{border-top:1px solid #2c2924;margin-top:24px;padding-top:17px;color:#706b64;font-size:11px;line-height:1.5}.luan-q-foot a{color:#d9b56c}",
      ".luan-q-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}",
      "@media(max-width:520px){.luan-q-trigger{right:13px;bottom:13px;width:50px;height:50px}.luan-q-panel{padding:20px 15px;border-radius:14px;max-height:94vh}.luan-q-head{gap:10px;padding-bottom:17px;margin-bottom:20px}.luan-q-brand img{width:40px;height:40px}.luan-q-title{font-size:23px}.luan-q-grid{grid-template-columns:1fr 1fr;gap:9px}.luan-q-card{padding:13px;min-height:112px}.luan-q-name{font-size:14px}.luan-q-value{font-size:18px;margin-top:12px}.luan-q-meta{font-size:10px}.luan-q-close{flex:none}}",
    ].join("");
    document.head.appendChild(style);
  }

  function createUi() {
    injectStyles();
    var trigger = document.createElement("button");
    trigger.className = "luan-q-trigger";
    trigger.type = "button";
    trigger.setAttribute("aria-label", "Abrir cotações e indicadores");
    trigger.innerHTML = '<img src="' + logoUrl + '" alt=""><span class="luan-q-sr">Cotações</span>';

    var overlay = document.createElement("div");
    overlay.className = "luan-q-overlay";
    overlay.setAttribute("aria-hidden", "true");
    overlay.innerHTML = '<section class="luan-q-panel" role="dialog" aria-modal="true" aria-labelledby="luan-q-title"><header class="luan-q-head"><div class="luan-q-brand"><img src="' + logoUrl + '" alt="Luan Especialista"><div><p class="luan-q-eyebrow">Luan Especialista</p><h2 class="luan-q-title" id="luan-q-title">Cotações e indicadores</h2></div></div><button class="luan-q-close" type="button" aria-label="Fechar">×</button></header><p class="luan-q-intro">Uma leitura objetiva dos principais indicadores que ajudam a contextualizar decisões patrimoniais e imobiliárias.</p><div class="luan-q-content"><p class="luan-q-status">Carregando indicadores…</p></div><footer class="luan-q-foot">Dados apresentados como referência informativa. As condições podem mudar e não constituem recomendação financeira.</footer></section>';
    document.body.appendChild(trigger);
    document.body.appendChild(overlay);

    var content = overlay.querySelector(".luan-q-content");
    var close = function () { overlay.classList.remove("is-open"); overlay.setAttribute("aria-hidden", "true"); document.body.style.removeProperty("overflow"); };
    var open = function () { overlay.classList.add("is-open"); overlay.setAttribute("aria-hidden", "false"); document.body.style.overflow = "hidden"; if (!content.dataset.loaded) load(content); };
    trigger.addEventListener("click", open);
    overlay.querySelector(".luan-q-close").addEventListener("click", close);
    overlay.addEventListener("click", function (event) { if (event.target === overlay) close(); });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape" && overlay.classList.contains("is-open")) close(); });
  }

  function load(content) {
    var endpoint = supabaseUrl + "/rest/v1/indicadores?select=id,nome,sku,categoria,cidade,valor,valor_atual,unidade,updated_at,indexador_base&order=categoria.asc,nome.asc&limit=200";
    fetch(endpoint, { headers: { apikey: anonKey, Authorization: "Bearer " + anonKey } })
      .then(function (response) { if (!response.ok) throw new Error("Falha ao carregar"); return response.json(); })
      .then(function (items) {
        if (!Array.isArray(items) || !items.length) { content.innerHTML = '<p class="luan-q-status">Nenhum indicador publicado no momento.</p>'; content.dataset.loaded = "true"; return; }
        content.innerHTML = '<div class="luan-q-grid">' + items.map(function (item) {
          var location = item.cidade ? esc(item.cidade) : (item.indexador_base ? esc(item.indexador_base) : "");
          return '<article class="luan-q-card"><div class="luan-q-category">' + esc(categoryLabel(item.categoria)) + '</div><div class="luan-q-name">' + esc(item.nome || item.sku || "Indicador") + '</div><div class="luan-q-meta">' + location + '</div><div class="luan-q-value">' + formatValue(item) + '</div><div class="luan-q-date">' + esc(getDate(item)) + '</div></article>';
        }).join("") + '</div>';
        content.dataset.loaded = "true";
      })
      .catch(function () { content.innerHTML = '<p class="luan-q-status">Não foi possível carregar as cotações agora. Tente novamente em instantes.</p>'; });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", createUi, { once: true });
  else createUi();
})();
