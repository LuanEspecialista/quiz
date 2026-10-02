(function () {
  "use strict";
  if (window.__luanGlobalShellLoaded || !document.body) return;
  window.__luanGlobalShellLoaded = true;

  var path = location.pathname.replace(/\/+$/, "") || "/";
  var excluded = ["/apresentacao", "/call", "/projeto", "/acesso", "/katia", "/assinatura-sol"];
  if (excluded.some(function (prefix) { return path === prefix || path.indexOf(prefix + "/") === 0; })) return;

  var isOpportunity = path === "/imoveis";
  var isStrategy = path.indexOf("estrategias-patrimoniais") >= 0 || path === "/patrimonio";
  var isInternational = ["brasil", "portugal", "espanha", "eua", "canada", "australia", "irlanda"].some(function (name) { return path === "/" + name; });
  var faqSets = {
    opportunity: [
      ["Como vocês selecionam uma oportunidade?", "A seleção considera contexto, localização, condição de entrada, prazo, liquidez e o objetivo de quem está analisando. Não é uma lista genérica de imóveis."],
      ["O valor de entrada é definitivo?", "Não. Valores, disponibilidade e condições podem mudar. A equipe confirma os dados atualizados antes de qualquer decisão."],
      ["Posso analisar para morar ou investir?", "Sim. A conversa pode partir de moradia, renda, revenda, diversificação ou construção patrimonial."],
      ["Existe promessa de rentabilidade?", "Não. Cada operação depende de premissas, mercado, prazo, custos e perfil. O objetivo é analisar com clareza, não prometer retorno."]
    ],
    strategy: [
      ["O que é uma estratégia patrimonial?", "É uma forma organizada de conectar objetivo, prazo, risco, capacidade financeira e ativos antes de tomar uma decisão."],
      ["Vocês trabalham apenas com imóveis?", "Não. Imóveis podem fazer parte da estratégia, mas a análise considera o contexto patrimonial completo e as alternativas disponíveis."],
      ["A análise é personalizada?", "Sim. O ponto de partida é entender o momento e o objetivo da pessoa, em vez de oferecer a mesma solução para todos."],
      ["Vocês prometem rentabilidade?", "Não. Trabalhamos com critérios, cenários e pontos de atenção. Decisões devem considerar riscos e confirmação dos dados."]
    ],
    international: [
      ["Para quem essa possibilidade pode fazer sentido?", "Para pessoas que avaliam moradia, diversificação, renda, expansão ou uma conexão estratégica com esse mercado."],
      ["A conversa começa com uma indicação pronta?", "Não necessariamente. Primeiro entendemos objetivo, prazo, capacidade e contexto para avaliar se a região realmente faz sentido."],
      ["Quais custos e riscos precisam ser analisados?", "Documentação, impostos, câmbio, manutenção, liquidez, regras locais e condições da operação devem ser avaliados antes de avançar."],
      ["Como funciona o atendimento?", "Você deixa um breve contexto e a equipe retorna para organizar os próximos passos, sem obrigação de compra."]
    ]
  };
  var questions = isOpportunity ? faqSets.opportunity : isInternational ? faqSets.international : faqSets.strategy;
  var faqTitle = isOpportunity ? "Antes de analisar uma oportunidade" : isInternational ? "Antes de olhar para uma nova região" : "Antes de tomar uma decisão patrimonial";
  var ctaTitle = isOpportunity ? "Quer entender se alguma seleção faz sentido para você?" : isInternational ? "O próximo passo começa com contexto, não com pressa." : "Patrimônio se constrói com decisões bem orientadas.";
  var ctaText = isOpportunity ? "Conte seu objetivo e receba uma conversa direcionada sobre as possibilidades disponíveis." : "Fale com a equipe para organizar seu momento, seus objetivos e os caminhos que merecem ser analisados.";
  var primaryHref = isOpportunity ? "#imoveis" : "/imoveis/";
  var primaryLabel = isOpportunity ? "Ver oportunidades" : "Conhecer oportunidades";

  var style = document.createElement("style");
  style.id = "luan-global-shell-style";
  style.textContent = ".luan-global-conversion{width:min(1180px,calc(100% - 48px));margin:72px auto 0;padding:34px 38px;display:flex;align-items:center;justify-content:space-between;gap:28px;border:1px solid rgba(197,160,89,.42);border-radius:16px;background:linear-gradient(115deg,rgba(45,31,13,.78),rgba(18,16,13,.9));box-shadow:0 18px 50px rgba(0,0,0,.18)}.luan-global-conversion h2{margin:0 0 9px;color:#f4ead8;font:clamp(25px,3vw,38px)/1.08 Georgia,serif;letter-spacing:-.025em}.luan-global-conversion p{max-width:650px;margin:0;color:#b8afa1;font:14px/1.6 Inter,Arial,sans-serif}.luan-global-actions{display:flex;flex-wrap:wrap;gap:10px;flex:0 0 auto}.luan-global-actions a{display:inline-flex;align-items:center;justify-content:center;min-height:43px;padding:0 17px;border-radius:7px;text-decoration:none;font:800 11px/1 Inter,Arial,sans-serif}.luan-global-primary{background:#d6a64e;color:#17120a}.luan-global-secondary{border:1px solid rgba(216,167,79,.6);color:#e4bf77}.luan-global-faq{width:min(980px,calc(100% - 48px));margin:76px auto 0}.luan-global-faq .eyebrow{margin:0 0 10px;color:#d6a64e;font:800 10px/1 Inter,Arial,sans-serif;letter-spacing:.2em;text-transform:uppercase}.luan-global-faq h2{margin:0 0 24px;color:#f2eadf;font:clamp(27px,4vw,44px)/1.05 Georgia,serif;letter-spacing:-.03em}.luan-global-faq details{border-top:1px solid rgba(255,255,255,.12);padding:17px 0}.luan-global-faq details:last-child{border-bottom:1px solid rgba(255,255,255,.12)}.luan-global-faq summary{cursor:pointer;list-style:none;color:#e9dfce;font:600 15px/1.4 Inter,Arial,sans-serif}.luan-global-faq summary::-webkit-details-marker{display:none}.luan-global-faq summary:after{content:'+';float:right;color:#d6a64e;font-size:20px;font-weight:400}.luan-global-faq details[open] summary:after{content:'−'}.luan-global-faq details p{max-width:760px;margin:11px 25px 0 0;color:#9d978d;font:13px/1.65 Inter,Arial,sans-serif}.luan-global-footer{margin-top:86px;padding:42px max(24px,calc((100% - 1180px)/2)) 28px;background:#080808;border-top:1px solid rgba(197,160,89,.25);color:#a9a197;font:12px/1.6 Inter,Arial,sans-serif}.luan-global-footer-grid{display:grid;grid-template-columns:1.5fr 1fr 1fr;gap:34px}.luan-global-footer strong{display:block;margin-bottom:7px;color:#f2dfb8;font:22px/1 Georgia,serif}.luan-global-footer strong span{color:#d6a64e}.luan-global-footer p{max-width:360px;margin:0;color:#8f897f}.luan-global-footer h3{margin:0 0 10px;color:#d7c7aa;font-size:11px;letter-spacing:.16em;text-transform:uppercase}.luan-global-footer a{display:block;margin:4px 0;color:#b7aa95;text-decoration:none}.luan-global-footer a:hover{color:#f0c873}.luan-global-footer-bottom{display:flex;justify-content:space-between;gap:18px;margin-top:30px;padding-top:16px;border-top:1px solid rgba(255,255,255,.09);color:#706b63;font-size:11px}.luan-global-legacy-footer{display:none!important}@media(max-width:720px){.luan-global-conversion,.luan-global-faq{width:calc(100% - 32px)}.luan-global-conversion{display:block;margin-top:52px;padding:26px 22px}.luan-global-actions{margin-top:20px}.luan-global-actions a{width:100%}.luan-global-faq{margin-top:54px}.luan-global-footer{padding:34px 20px 22px}.luan-global-footer-grid{grid-template-columns:1fr;gap:24px}.luan-global-footer-bottom{display:grid;gap:6px}}";
  document.head.appendChild(style);

  var oldFooter = document.querySelector("footer");
  if (oldFooter) oldFooter.classList.add("luan-global-legacy-footer");
  var anchor = oldFooter || document.body.lastElementChild;
  var conversion = document.createElement("section");
  conversion.className = "luan-global-conversion";
  conversion.innerHTML = "<div><h2>" + ctaTitle + "</h2><p>" + ctaText + "</p></div><div class=\"luan-global-actions\"><a class=\"luan-global-primary\" href=\"" + primaryHref + "\">" + primaryLabel + "</a><a class=\"luan-global-secondary\" href=\"https://wa.me/5547992120915?text=Olá%2C%20gostaria%20de%20entender%20melhor%20as%20possibilidades.\" target=\"_blank\" rel=\"noopener\">Falar com especialista</a></div>";
  var faq = document.createElement("section");
  faq.className = "luan-global-faq";
  faq.innerHTML = "<p class=\"eyebrow\">Clareza antes da decisão</p><h2>" + faqTitle + "</h2>" + questions.map(function (item) { return "<details><summary>" + item[0] + "</summary><p>" + item[1] + "</p></details>"; }).join("");
  var globalFooter = document.createElement("footer");
  globalFooter.className = "luan-global-footer";
  globalFooter.innerHTML = "<div class=\"luan-global-footer-grid\"><div><strong>LUAN <span>ESPECIALISTA</span></strong><p>Estratégias patrimoniais para decisões mais conscientes, conectando contexto, oportunidades e próximos passos.</p></div><div><h3>Navegação</h3><a href=\"/\">Início</a><a href=\"/estrategias-patrimoniais/\">Estratégias Patrimoniais</a><a href=\"/imoveis/\">Oportunidades</a><a href=\"/mobilidade-experiencias/\">Mobilidade &amp; Experiências</a></div><div><h3>Segurança e contato</h3><a href=\"mailto:contato@luan-especialista.pro\">contato@luan-especialista.pro</a><a href=\"https://wa.me/5547992120915\" target=\"_blank\" rel=\"noopener\">WhatsApp da equipe</a><a href=\"/privacidade/\">Privacidade</a><a href=\"/termos/\">Termos de uso</a></div></div><div class=\"luan-global-footer-bottom\"><span>© 2026 Luan Especialista. Todos os direitos reservados.</span><span>Informações, valores e condições podem mudar e devem ser confirmados antes de qualquer decisão.</span></div>";
  if (anchor && anchor.parentNode) {
    anchor.parentNode.insertBefore(conversion, anchor);
    anchor.parentNode.insertBefore(faq, anchor);
    anchor.parentNode.insertBefore(globalFooter, anchor);
  }
}());
