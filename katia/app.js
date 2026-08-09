/* ======================================================================
   APP.JS — Orquestração geral da página
   ====================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const { CONFIG, gerarTimeline, comparativoCaminhos, formatarMoeda } = window.KatiaFinanceiro;

  // ---- Patrimônio atual ----
  const patrimonioTotal = CONFIG.patrimonio.capitalDisponivel + CONFIG.patrimonio.apartamentoSaoBentoValor;
  setText("stat-capital", formatarMoeda(CONFIG.patrimonio.capitalDisponivel));
  setText("stat-apartamento", formatarMoeda(CONFIG.patrimonio.apartamentoSaoBentoValor));
  setText("stat-total", formatarMoeda(patrimonioTotal));

  // ---- Timeline base (caminho 1) ----
  const timelineBase = gerarTimeline({ caminho: 1 });
  const ultimoMes = timelineBase[timelineBase.length - 1];
  setText("stat-patrimonio-final", formatarMoeda(ultimoMes.patrimonioLiquido));

  // ---- Gráficos ----
  if (window.KatiaGraficos) {
    window.KatiaGraficos.renderGraficoSaldo(timelineBase);
    window.KatiaGraficos.renderGraficoPatrimonio(timelineBase);
    window.KatiaGraficos.renderGraficoComparativo(comparativoCaminhos());
  }

  // ---- Timeline visual ----
  if (window.KatiaTimeline) window.KatiaTimeline.renderTimeline(timelineBase);

  // ---- Simulador ----
  if (window.KatiaSimulador) window.KatiaSimulador.inicializarSimulador();

  // ---- Reveal on scroll ----
  const reveals = document.querySelectorAll(".reveal");
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );
  reveals.forEach((el) => observer.observe(el));

  // ---- Linha de trajetória no hero (SVG sutil) ----
  renderHeroLinha();
});

function setText(id, valor) {
  const el = document.getElementById(id);
  if (el) el.textContent = valor;
}

function renderHeroLinha() {
  const container = document.getElementById("hero-linha");
  if (!container) return;
  const svg = `
    <svg viewBox="0 0 1200 700" preserveAspectRatio="none" style="width:100%;height:100%;">
      <path d="M -50 550 C 250 500, 450 300, 700 260 S 1100 80, 1300 60"
            fill="none" stroke="#c8a04d" stroke-width="1" opacity="0.35" />
      <circle cx="700" cy="260" r="3" fill="#e6c876" opacity="0.7" />
    </svg>
  `;
  container.innerHTML = svg;
}
