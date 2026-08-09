class Timeline {
    static construir(historico) {
        let marcos = [];
        let primeiroReforco = true;

        historico.forEach(comp => {
            if (comp.mes === 0) marcos.push({ data: comp.competencia, desc: "Assinatura do Contrato e Entrada" });[cite: 1]
            if (comp.reforco > 0 && primeiroReforco) {
                marcos.push({ data: comp.competencia, desc: "Início dos Reforços Anuais Cobertos pelo Fundo" });
                primeiroReforco = false;
            }
            if (comp.mes === 18) marcos.push({ data: comp.competencia, desc: "Início Físico das Obras no Canteiro" });[cite: 1]
            if (comp.ehPeriodoObra === false && historico[comp.mes - 1]?.ehPeriodoObra === true) {
                marcos.push({ data: comp.competencia, desc: "Entrega das Chaves: Transição para IPCA + 0,9% e Início dos Aluguéis" });[cite: 1]
            }
            if (comp.saldoDevedor === 0 && historico[comp.mes - 1]?.saldoDevedor > 0) {
                marcos.push({ data: comp.competencia, desc: "Quitação Total do Ativo Imobiliário" });
            }
        });
        return marcos;
    }
}