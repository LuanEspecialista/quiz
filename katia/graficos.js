const GraficosUI = {
    renderizarTodos(historico) {
        // Mapeamento direto de vetores sem processamento interno
        const labelsData = historico.map(h => h.competencia);
        const dadosPatrimonio = historico.map(h => h.patrimonio);
        const dadosDevedor = historico.map(h => h.saldoDevedor);
        const dadosBanco = historico.map(h => h.saldoBanco);

        // Exemplo usando uma biblioteca padrão de mercado (Chart.js)
        ChartPatrimonio.data.labels = labelsData;
        ChartPatrimonio.data.datasets[0].data = dadosPatrimonio;
        ChartPatrimonio.update();

        ChartFluxos.data.labels = labelsData;
        ChartFluxos.data.datasets[0].data = dadosDevedor;
        ChartFluxos.data.datasets[1].data = dadosBanco;
        ChartFluxos.update();
    }
};