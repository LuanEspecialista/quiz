(function () {
  "use strict";
  if (window.__luanGlobalShellLoaded || !document.body) return;
  window.__luanGlobalShellLoaded = true;

  var path = location.pathname.replace(/\/+$/, "") || "/";
  // Regra permanente da home: manter somente os cards, os dados e o rodapé original.
  if (path === "/" || path === "/index.html") return;
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
  style.textContent += ".luan-global-footer{margin-top:68px!important;padding:48px max(28px,calc((100% - 1180px)/2)) 26px!important}.luan-global-footer-grid{grid-template-columns:1.6fr 1fr 1fr 1fr!important;gap:42px!important;align-items:start}.luan-global-footer-grid>div{min-width:0}.luan-global-footer strong{font-size:24px!important;letter-spacing:.02em}.luan-global-footer p{max-width:330px;line-height:1.7!important}.luan-global-footer h3{margin-bottom:14px!important}.luan-global-footer a{margin:7px 0!important;line-height:1.45}.luan-global-footer-bottom{margin-top:36px!important;padding-top:18px!important}.luan-float-actions{position:fixed;right:20px;bottom:20px;z-index:2147483000;display:flex;flex-direction:column;align-items:center;gap:9px}.luan-float-whatsapp,.luan-float-top{display:grid;place-items:center;width:38px;height:38px;border:1px solid rgba(215,171,99,.52);border-radius:50%;background:rgba(12,13,13,.92);color:#d7ab63;text-decoration:none;box-shadow:0 8px 22px rgba(0,0,0,.3);backdrop-filter:blur(8px);transition:opacity .2s,transform .2s,background .2s}.luan-float-whatsapp{font:700 16px/1 Arial,sans-serif}.luan-float-whatsapp svg{width:17px;height:17px;fill:currentColor}.luan-float-top{font:18px/1 Arial,sans-serif;opacity:0;pointer-events:none;transform:translateY(6px)}.luan-float-top.is-visible{opacity:1;pointer-events:auto;transform:translateY(0)}.luan-float-whatsapp:hover,.luan-float-top:hover{background:#d7ab63;color:#111;border-color:#d7ab63}@media(max-width:760px){.luan-global-footer{padding:38px 20px 22px!important}.luan-global-footer-grid{grid-template-columns:1fr 1fr!important;gap:28px 22px!important}.luan-global-footer-grid>div:first-child{grid-column:1/-1}.luan-global-footer-bottom{display:grid!important;gap:8px!important}.luan-float-actions{right:14px;bottom:14px}.luan-float-whatsapp,.luan-float-top{width:36px;height:36px}}";
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
  globalFooter.innerHTML = "<div class=\"luan-global-footer-grid\"><div><strong>LUAN <span>ESPECIALISTA</span></strong><p>Estratégias patrimoniais para decisões mais conscientes, conectando contexto, oportunidades e próximos passos.</p></div><div><h3>Navegação</h3><a href=\"/\">Início</a><a href=\"/estrategias-patrimoniais/\">Estratégias Patrimoniais</a><a href=\"/imoveis/\">Oportunidades</a><a href=\"/mobilidade-experiencias/\">Mobilidade &amp; Experiências</a></div><div><h3>Atendimento</h3><a href=\"https://wa.me/5547992120915\" target=\"_blank\" rel=\"noopener\">Falar pelo WhatsApp</a><a href=\"mailto:contato@luan-especialista.pro\">Enviar e-mail</a><a href=\"/faq/\">Perguntas frequentes</a></div><div><h3>Informações</h3><a href=\"/quem-somos/\">Quem somos</a><a href=\"/privacidade/\">Privacidade</a><a href=\"/termos/\">Termos de uso</a><a href=\"#\" data-luan-install hidden>Instalar como aplicativo</a></div></div><div class=\"luan-global-footer-bottom\"><span>© 2026 Luan Especialista. Todos os direitos reservados.</span><span>Informações, valores e condições podem mudar e devem ser confirmados antes de qualquer decisão.</span></div>";
  if (anchor && anchor.parentNode) {
    anchor.parentNode.insertBefore(conversion, anchor);
    anchor.parentNode.insertBefore(faq, anchor);
    anchor.parentNode.insertBefore(globalFooter, anchor);
  }
  var floatActions = document.createElement("div");
  floatActions.className = "luan-float-actions";
  floatActions.innerHTML = '<a class="luan-float-whatsapp" href="https://wa.me/5547992120915?text=Olá%2C%20gostaria%20de%20falar%20com%20um%20especialista." target="_blank" rel="noopener" aria-label="Falar com especialista pelo WhatsApp" title="Falar com especialista"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.1 3.9A11.9 11.9 0 0 0 3.2 20.4L2 24l3.7-1.2A11.9 11.9 0 1 0 20.1 3.9Zm-8.2 17a9.8 9.8 0 0 1-5-1.4l-.4-.2-2.2.7.7-2.1-.3-.4a9.8 9.8 0 1 1 7.2 3.4Zm5.4-7.3c-.3-.2-1.7-.8-2-.9-.3-.1-.5-.2-.7.2-.2.3-.8.9-.9 1.1-.2.2-.3.2-.6.1-1.5-.7-2.5-1.2-3.5-2.8-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5l-.9-2.1c-.2-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.4s1 2.8 1.1 3c.1.2 2 3.1 4.8 4.2 2.8 1.1 2.8.7 3.3.7.5 0 1.7-.7 1.9-1.3.2-.6.2-1.2.1-1.3-.1-.2-.3-.3-.6-.4Z"/></svg></a><button class="luan-float-top" type="button" aria-label="Voltar ao topo" title="Voltar ao topo">↑</button>';
  document.body.appendChild(floatActions);
  var topButton = floatActions.querySelector(".luan-float-top");
  var updateTopButton = function () { topButton.classList.toggle("is-visible", window.scrollY > 420); };
  window.addEventListener("scroll", updateTopButton, { passive: true });
  topButton.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
  updateTopButton();

  var installLink = globalFooter.querySelector("[data-luan-install]");
  var showInstall = function () { if (window.__luanInstallPrompt && installLink) installLink.hidden = false; };
  window.addEventListener("luan:install-available", showInstall);
  showInstall();
  if (installLink) installLink.addEventListener("click", function (event) {
    event.preventDefault();
    if (!window.__luanInstallPrompt) return;
    window.__luanInstallPrompt.prompt();
    window.__luanInstallPrompt.userChoice.finally(function () { window.__luanInstallPrompt = null; installLink.hidden = true; });
  });
}());
