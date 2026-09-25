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

  function categoryLabel(value) {
    var labels = { CONSTRUCAO: "Construção", RENDA_FIXA: "Renda fixa", MOEDA: "Moedas", IMOBILIARIO_M2: "Imobiliário", CRIPTO: "Ativos digitais", INFLACAO: "Inflação" };
    return labels[String(value || "").toUpperCase()] || "Indicador";
  }

  function formatValue(item) {
    var value = Number(item.valor_atual != null ? item.valor_atual : item.valor);
    if (!Number.isFinite(value)) return "—";
    var category = String(item.categoria || "").toUpperCase();
    if (category === "MOEDA" || category === "IMOBILIARIO_M2" || category === "CRIPTO") return money.format(value);
    if (category === "CONSTRUCAO" || category === "RENDA_FIXA" || category === "INFLACAO" || item.unidade === "%") return number.format(value) + "%";
    return number.format(value) + (item.unidade ? " " + esc(item.unidade) : "");
  }

  function updatedDate(item) {
    var raw = item.updated_at || item.data_atualizacao;
    if (!raw) return "";
    var date = new Date(raw);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("pt-BR");
  }

  function injectStyles() {
    if (document.getElementById("luan-public-quotations-style")) return;
    var style = document.createElement("style");
    style.id = "luan-public-quotations-style";
    style.textContent = [
      ":root{--luan-quote-height:42px}",
      "body{padding-top:var(--luan-quote-height)}",
      ".luan-q-ticker{position:fixed;inset:0 0 auto 0;z-index:2147483000;height:var(--luan-quote-height);background:rgba(9,9,10,.97);border-bottom:1px solid rgba(197,160,89,.28);box-shadow:0 5px 20px rgba(0,0,0,.32);display:flex;align-items:center;overflow:hidden;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}",
      ".luan-q-brand{height:100%;display:flex;align-items:center;gap:8px;flex:0 0 auto;padding:0 16px 0 13px;border-right:1px solid #2a2722;background:#0d0d0e;color:#f0d395;text-decoration:none;position:relative;z-index:2}",
      ".luan-q-brand img{width:25px;height:25px;object-fit:contain}.luan-q-brand span{font-size:9px;letter-spacing:.13em;text-transform:uppercase;white-space:nowrap}",
      ".luan-q-viewport{height:100%;overflow:hidden;flex:1;position:relative}.luan-q-track{height:100%;display:flex;align-items:center;width:max-content;animation:luan-q-scroll 58s linear infinite}.luan-q-track:hover{animation-play-state:paused}",
      ".luan-q-set{display:flex;align-items:center;flex:none}.luan-q-item{height:26px;display:flex;align-items:center;gap:9px;padding:0 18px;border-right:1px solid #2c2924;white-space:nowrap;color:#e9e4da;font-size:11px}.luan-q-name{font-weight:700;color:#d3c8b7}.luan-q-cat{color:#8e877d;font-size:9px;text-transform:uppercase;letter-spacing:.08em}.luan-q-value{color:#f0d395;font-weight:700}.luan-q-city{color:#7d776f;font-size:10px}.luan-q-date{color:#67625c;font-size:9px}.luan-q-live{width:6px;height:6px;border-radius:50%;background:#63bb7b;box-shadow:0 0 7px #63bb7b;flex:none}",
      ".luan-q-status{padding:0 18px;color:#8e877d;font-size:11px;white-space:nowrap}",
      "@keyframes luan-q-scroll{from{transform:translateX(0)}to{transform:translateX(-50%)}}",
      "@media(max-width:620px){:root{--luan-quote-height:38px}.luan-q-brand{padding:0 10px}.luan-q-brand img{width:23px;height:23px}.luan-q-brand span{display:none}.luan-q-item{gap:6px;padding:0 12px;font-size:10px}.luan-q-cat{display:none}.luan-q-city,.luan-q-date{font-size:9px}.luan-q-brand{z-index:1}.luan-language{top:48px!important;right:10px!important;z-index:2147483646!important}.luan-language .luan-language-menu{top:calc(100% + 6px)!important}}",
    ].join("");
    document.head.appendChild(style);
  }

  function itemMarkup(item) {
    return '<div class="luan-q-item"><span class="luan-q-live" aria-hidden="true"></span><span class="luan-q-name">' + esc(item.nome || item.sku || "Indicador") + '</span><span class="luan-q-cat">' + esc(categoryLabel(item.categoria)) + '</span><span class="luan-q-value">' + formatValue(item) + '</span>' + (item.cidade ? '<span class="luan-q-city">' + esc(item.cidade) + '</span>' : '') + (updatedDate(item) ? '<span class="luan-q-date">' + esc(updatedDate(item)) + '</span>' : '') + '</div>';
  }

  function createTicker() {
    injectStyles();
    var ticker = document.createElement("aside");
    ticker.className = "luan-q-ticker";
    ticker.setAttribute("aria-label", "Cotações e indicadores");
    ticker.innerHTML = '<a class="luan-q-brand" href="/" aria-label="Luan Especialista - página inicial"><img src="' + logoUrl + '" alt="Luan Especialista"><span>Indicadores</span></a><div class="luan-q-viewport"><div class="luan-q-track"><div class="luan-q-set"><span class="luan-q-status">Carregando cotações…</span></div></div></div>';
    document.body.insertBefore(ticker, document.body.firstChild);
    load(ticker.querySelector(".luan-q-track"));
  }

  function load(track) {
    var select = "id,nome,sku,categoria,cidade,valor,valor_atual,unidade,updated_at,indexador_base";
    var indicatorsEndpoint = supabaseUrl + "/rest/v1/indicadores?select=" + select + "&order=categoria.asc,nome.asc&limit=200";
    var configEndpoint = supabaseUrl + "/rest/v1/indicadores_ticker_config?select=sku,ativo&limit=200";
    var headers = { apikey: anonKey, Authorization: "Bearer " + anonKey };
    Promise.all([fetch(indicatorsEndpoint, { headers: headers }), fetch(configEndpoint, { headers: headers })])
      .then(function (responses) { return Promise.all(responses.map(function (response) { if (!response.ok) throw new Error("Falha ao carregar cotações"); return response.json(); })); })
      .then(function (result) {
        var indicators = Array.isArray(result[0]) ? result[0] : [];
        var preferences = new Map((Array.isArray(result[1]) ? result[1] : []).map(function (item) { return [item.sku, item.ativo]; }));
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
