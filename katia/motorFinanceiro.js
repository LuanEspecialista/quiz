class MotorFinanceiro {
    static gerarLinhaTempo(config) {
        let historicoCompleto = [];
        let dataAtual = new Date(config.dadosImovel.dataAssinatura);
        let saldoDevedor = config.dadosImovel.valorTabela - config.dadosImovel.fluxoEntrada;[cite: 1]
        let saldoBanco = config.dadosCliente.capitalInicialBanco;
        let parcelaCorrigida = config.dadosImovel.fluxoMensais;[cite: 1]
        let valorImovelAtual = config.dadosImovel.valorTabela;[cite: 1]

        // Loop até o fim do contrato pós-chaves
        for (let mesIdx = 0; mesIdx <= 180; mesIdx++) {
            let competenciaStr = dataAtual.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            let ehPeriodoObra = dataAtual <= new Date(config.dadosImovel.dataEntregaChaves);

            // 1. DISPARO DE EVENTOS DE CORREÇÃO (Módulo 3)
            if (ehPeriodoObra) {
                saldoDevedor = this.eventoCUB(saldoDevedor, config.premissasMercado.indexadorPreChaves);[cite: 1]
                parcelaCorrigida = this.eventoCUB(parcelaCorrigida, config.premissasMercado.indexadorPreChaves);[cite: 1]
                valorImovelAtual = this.eventoValorizacao(valorImovelAtual, config.premissasMercado.valorizacaoImobiliariaAA / 12);
            } else {
                saldoDevedor = this.eventoIPCA(saldoDevedor, config.premissasMercado.indexadorPosChaves, config.premissasMercado.inflacaoPosChaves);[cite: 1]
                parcelaCorrigida = this.calcularParcelaPosChaves(saldoDevedor, mesIdx, config);[cite: 1]
            }

            // 2. DISPARO DE EVENTOS DE CAIXA BANCÁRIO (Módulo 8)
            let rendimentoCdi = this.eventoInvestimento(saldoBanco, config.premissasMercado.taxaRentabilidadeLiquida);
            let entradaAluguel = !ehPeriodoObra ? this.eventoAluguel(config.premissasMercado.aluguelEstimado) : 0;
            
            // Montagem da estrutura de competência unificada (Módulo 2 e 9)
            let itemCompetencia = {
                mes: mesIdx,
                data: dataAtual.toLocaleDateString('pt-BR'),
                competencia: competenciaStr,
                saldoInicial: saldoBanco,
                rendimento: rendimentoCdi,
                aluguel: entradaAluguel,
                parcela: parcelaCorrigida,
                reforco: config.dadosImovel.mesesBaloes.includes(mesIdx) ? this.calcularReforcoCorrigido(config, mesIdx) : 0,[cite: 1]
                saldoDevedor: saldoDevedor,
                saldoFinal: 0 // Calculado após fluxo bancário limpo
            };

            // Cálculo exato do Fluxo Bancário Limpo (Módulo 8)
            saldoBanco = (itemCompetencia.saldoInicial + itemCompetencia.rendimento + itemCompetencia.aluguel) - (itemCompetencia.parcela + itemCompetencia.reforco);
            itemCompetencia.saldoFinal = saldoBanco;

            historicoCompleto.push(itemCompetencia);
            
            // Avança exatamente 1 mês no calendário real
            dataAtual.setMonth(dataAtual.getMonth() + 1);
        }
        return historicoCompleto;
    }

    static eventoCUB(valor, taxa) { return valor * (1 + taxa); }[cite: 1]
    static eventoIPCA(valor, juros, ipca) { return valor * (1 + juros + ipca); }[cite: 1]
    static eventoInvestimento(saldo, taxa) { return saldo > 0 ? saldo * taxa : 0; }
    static eventoAluguel(valor) { return valor > 0 ? valor : 0; }
    static eventoValorizacao(valor, taxaMensal) { return valor * (1 + taxaMensal); }
}