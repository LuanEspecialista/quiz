const config = {
    dadosImovel: {
        valorTabela: 693011.47,[cite: 1]
        fluxoEntrada: 69301.15,[cite: 1]
        fluxoMensais: 2772.05,[cite: 1]
        fluxoBaloes: 43313.16,[cite: 1]
        dataAssinatura: "2026-07-11",[cite: 1]
        dataInicioObra: "2028-01-01",[cite: 1]
        dataEntregaChaves: "2031-12-01",[cite: 1]
        mesesFinanciamentoPos: 60,
        mesesBaloes: [11, 23, 35, 47, 59, 71, 83, 95] // 8 balões reais calculados por competência[cite: 1]
    },
    dadosCliente: {
        temCapitalInicial: true,
        capitalInicialBanco: 475000.00,
        aporteMensalBolso: 3000.00,
        valorCasaAtual: 450000.00,
        aportesExtras: [] // { data: "2027-06-10", valor: 15000 }
    },
    premissasMercado: {
        indexadorPreChaves: 0.0040, // CUB mensal
        indexadorPosChaves: 0.0090, // +0,9% a.m.[cite: 1]
        inflacaoPosChaves: 0.0035,  // IPCA mensal
        taxaRentabilidadeLiquida: 0.0080, // CDI Líquido fixado
        modoValorizacao: "TAXA", // "TAXA" ou "VALOR_FUTURO"
        valorizacaoImobiliariaAA: 0.15,
        valorFuturoEstimado: 1200000.00,
        modoAluguel: "PIÇARRAS", // "SÃO_BENTO" ou "PIÇARRAS"
        aluguelEstimado: 5000.00
    }
};