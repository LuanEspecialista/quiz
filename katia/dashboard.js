const DashboardUI = {
    renderizar(dashboardData) {
        // Renderização passiva dos indicadores nos cartões HTML
        document.getElementById("tir-card").innerText = dashboardData.cartoesCenarioB.tir;
        document.getElementById("moic-card").innerText = dashboardData.cartoesCenarioB.moic;
        document.getElementById("vpl-card").innerText = dashboardData.cartoesCenarioB.vpl;
        document.getElementById("be-card").innerText = dashboardData.cartoesCenarioB.breakEven;
        
        // Exibição das Premissas e Transparência (Módulo 23)
        document.getElementById("premissa-cdi").innerText = config.premissasMercado.taxaRentabilidadeLiquida * 100 + "% a.m.";
        document.getElementById("premissa-cub").innerText = "R$ 3.121,62 (Fonte: Sinduscon-SC)";[cite: 1]
        
        // Injeta o texto interpretativo gerado pelo motor
        document.getElementById("narrativa-texto").innerText = dashboardData.textoExplicativo;
    }
};