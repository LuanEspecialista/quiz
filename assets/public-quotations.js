(function () {
  "use strict";

  if (window.__luanPublicQuotationsLoaded) return;
  window.__luanPublicQuotationsLoaded = true;

  var config = window.LUAN_SITE_CONFIG || {};
  var supabaseUrl = String(config.supabaseUrl || "").replace(/\/$/, "");
  var anonKey = String(config.supabaseAnonKey || "");
  if (!supabaseUrl || !anonKey || !document.body) return;

  var logoUrl = "/imagens/logo.png";
  var number = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  var money = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>\"']/g, function (char) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '\"': "&quot;", "'": "&#39;" })[char];
    });
  }

  function formatValue(item) {
    var value = Number(item.valor_atual != null ? item.valor_atual : item.valor);
    if (!Number.isFinite(value)) return "—";
    var category = String(item.categoria || "").toUpperCase();
    if (category === "MOEDA" || category === "CRIPTO") return money.format(value);
    if (category === "IMOBILIARIO_M2") return money.format(value) + "/m²";
    if (category === "CONSTRUCAO" || category === "RENDA_FIXA" || category === "INFLACAO" || item.unidade === "%") return number.format(value) + "%";
    return number.format(value) + (item.unidade ? " " + esc(item.unidade) : "");
  }

  function injectStyles() {
    if (document.getElementById("luan-public-quotations-style")) return;
    var style = document.createElement("style");
    style.id = "luan-public-quotations-style";
    style.textContent = [
      ":root{--luan-quote-height:42px}",
      "body{padding-top:var(--luan-quote-height)}",
      "header:not(.luan-q-ticker),.site-header,.main-header,.playbook-header{top:var(--luan-quote-height)!important}",
      ".luan-q-ticker{position:fixed;inset:0 0 auto 0;z-index:2147483000;height:var(--luan-quote-height);background:rgba(9,9,10,.97);border-bottom:1px solid rgba(197,160,89,.28);box-shadow:0 5px 20px rgba(0,0,0,.32);display:flex;align-items:center;overflow:hidden;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}",
      ".luan-q-brand{height:100%;display:flex;align-items:center;flex:0 0 auto;padding:0 16px;border-right:1px solid #2a2722;background:#0d0d0e;color:#f0d395;font-size:9px;letter-spacing:.13em;text-transform:uppercase;white-space:nowrap;position:relative;z-index:2}",
      ".luan-q-viewport{height:100%;overflow:hidden;flex:1;position:relative}.luan-q-track{height:100%;display:flex;align-items:center;width:max-content;animation:luan-q-scroll 58s linear infinite}.luan-q-track:hover{animation-play-state:paused}",
      ".luan-q-set{display:flex;align-items:center;flex:none}.luan-q-item{height:26px;display:flex;align-items:center;gap:8px;padding:0 18px;border-right:1px solid #2c2924;white-space:nowrap;color:#e9e4da;font-size:11px}.luan-q-name{font-weight:700;color:#d3c8b7}.luan-q-value{color:#f0d395;font-weight:700}.luan-q-trend{display:inline-flex;align-items:center;justify-content:center;min-width:15px;height:15px;border-radius:4px;font-size:11px;font-weight:900;line-height:1}.luan-q-trend.up{color:#5ee58b;background:rgba(34,197,94,.14)}.luan-q-trend.down{color:#ff7777;background:rgba(239,68,68,.14)}.luan-q-trend.flat{color:#8e877d;background:rgba(148,163,184,.12)}",
      ".luan-q-status{padding:0 18px;color:#8e877d;font-size:11px;white-space:nowrap}",
      "@keyframes luan-q-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}",
      "@media(max-width:620px){:root{--luan-quote-height:38px}.luan-q-brand{padding:0 10px}.luan-q-item{gap:6px;padding:0 12px;font-size:10px}.luan-q-brand{z-index:1}.luan-language{top:48px!important;right:10px!important;z-index:2147483646!important}.luan-language .luan-language-menu{top:calc(100% + 6px)!important}}",
    ].join("");
    document.head.appendChild(style);
  }

  function itemMarkup(item) {
    var trend = Number(item.tendencia || 0);
    var trendClass = trend > 0 ? "up" : trend < 0 ? "down" : "flat";
    var trendSymbol = trend > 0 ? "▲" : trend < 0 ? "▼" : "•";
    return '<div class="luan-q-item"><span class="luan-q-name">' + esc(item.nome || item.sku || "Indicador") + '</span><span class="luan-q-value">' + formatValue(item) + '</span><span class="luan-q-trend ' + trendClass + '" aria-label="' + (trend > 0 ? "Em alta" : trend < 0 ? "Em baixa" : "Sem variação") + '">' + trendSymbol + '</span></div>';
  }

  function createTicker() {
    injectStyles();
    var ticker = document.createElement("aside");
    ticker.className = "luan-q-ticker";
    ticker.setAttribute("aria-label", "Cotações e indicadores");
    ticker.innerHTML = '<span class="luan-q-brand">Mercado</span><div class="luan-q-viewport"><div class="luan-q-track"><div class="luan-q-set"><span class="luan-q-status">Carregando cotações…</span></div></div></div>';
    document.body.insertBefore(ticker, document.body.firstChild);
    load(ticker.querySelector(".luan-q-track"));
  }

  function load(track) {
    var select = "id,nome,sku,categoria,cidade,valor,valor_atual,unidade,updated_at,indexador_base";
    var indicatorsEndpoint = supabaseUrl + "/rest/v1/indicadores?select=" + select + "&order=categoria.asc,nome.asc&limit=200";
    var configEndpoint = supabaseUrl + "/rest/v1/indicadores_ticker_config?select=sku,ativo&limit=200";
    var historyEndpoint = supabaseUrl + "/rest/v1/indicadores_historico?select=indicador_id,valor,data_referencia&order=data_referencia.desc&limit=1000";
    var headers = { apikey: anonKey, Authorization: "Bearer " + anonKey };
    Promise.all([
      fetch(indicatorsEndpoint, { headers: headers }),
      fetch(configEndpoint, { headers: headers }),
      fetch(historyEndpoint, { headers: headers }).then(function (response) { return response.ok ? response.json() : []; }).catch(function () { return []; })
    ])
      .then(function (responses) { return Promise.all([responses[0], responses[1]].map(function (response) { if (!response.ok) throw new Error("Falha ao carregar cotações"); return response.json(); }).concat([responses[2]])); })
      .then(function (result) {
        var indicators = Array.isArray(result[0]) ? result[0] : [];
        var preferences = new Map((Array.isArray(result[1]) ? result[1] : []).map(function (item) { return [item.sku, item.ativo]; }));
        var history = Array.isArray(result[2]) ? result[2] : [];
        var previousByIndicator = new Map();
        history.forEach(function (entry) { var list = previousByIndicator.get(entry.indicador_id) || []; list.push(Number(entry.valor)); previousByIndicator.set(entry.indicador_id, list); });
        indicators = indicators.map(function (item) { var current = Number(item.valor_atual != null ? item.valor_atual : item.valor); var values = previousByIndicator.get(item.id) || []; var previous = values.find(function (value) { return Number.isFinite(value) && value !== current; }); return Object.assign({}, item, { tendencia: Number.isFinite(previous) && Number.isFinite(current) ? Math.sign(current - previous) : 0 }); });
        var active = indicators.filter(function (item) { return preferences.get(item.sku) !== false; });
        if (!active.length) { track.innerHTML = '<div class="luan-q-set"><span class="luan-q-status">Nenhuma cotação publicada no momento.</span></div>'; return; }
        var html = active.map(itemMarkup).join("");
        track.innerHTML = '<div class="luan-q-set">' + html + '</div><div class="luan-q-set" aria-hidden="true">' + html + '</div>';
      })
      .catch(function () { track.innerHTML = '<div class="luan-q-set"><span class="luan-q-status">Cotações temporariamente indisponíveis.</span></div>'; });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", createTicker, { once: true });
  else createTicker();
})();
