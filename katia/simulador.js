const simularTudo = () => {
    const cenarioA = MotorFinanceiro.gerarLinhaTempo(obterConfigCenarioA());
    const cenarioB = MotorFinanceiro.gerarLinhaTempo(obterConfigCenarioB());
    const cenarioC = MotorFinanceiro.gerarLinhaTempo(obterConfigCenarioC());

    return {
        cenarioA,
        cenarioB,
        cenarioC,
        dashboard: {
            cartoesCenarioA: Indicadores.processar(cenarioA),
            cartoesCenarioB: Indicadores.processar(cenarioB),
            cartoesCenarioC: Indicadores.processar(cenarioC),
            timelineVisual: Timeline.construir(cenarioB),
            textoExplicativo: LinguagemNatural.gerar(cenarioB)
        }
    };
};