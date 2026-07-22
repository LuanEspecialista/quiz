class LinguagemNatural {
    static gerar(historico, config) {
        const totalMesesObra = config.dadosImovel.mesesAteChaves;
        let parcelasPagasPeloCdi = 0;

        historico.slice(0, totalMesesObra).forEach(h => {
            if (h.rendimento >= h.parcela) parcelasPagasPeloCdi++;
        });

        const percCobertura = ((parcelasPagasPeloCdi / totalMesesObra) * 100).toFixed(0);
        const saldoChaves = historico[totalMesesObra].saldoBanco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const patrimonioFinal = historico[historico.length - 1].patrimonio.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        return `Neste cenário estruturado, o rendimento do seu capital fiduciário cobre aproximadamente ${percCobertura}% das parcelas devidas durante a fase de construção ativa. Na data de entrega das chaves, o seu saldo bancário líquido projetado em conta será de ${saldoChaves}, mantendo uma posição de liquidez estável e segura. Ao final do plano cronológico de simulação, o seu patrimônio consolidado atinge a estimativa de ${patrimonioFinal}, validando a eficácia da estratégia de arbitragem patrimonial frente ao mercado tradicional.`;
    }
}