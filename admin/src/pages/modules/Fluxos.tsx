import React, { useState, useMemo, useCallback, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Calculator, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Sparkles, 
  Lock, 
  Unlock, 
  Info,
  TrendingUp,
  Building2,
  FileText,
  Filter,
  Check,
  Plus,
  ArrowRight,
  PieChart,
  Layers,
  ArrowUpRight,
  Clock,
  Award
} from "lucide-react";

// ============================================================================
// ENGENHARIA FINANCEIRA & UTILITÁRIOS DE TEMPO
// ============================================================================

export async function fetchOfficialServerTime(): Promise<Date> {
  try {
    const { data, error } = await supabase.rpc("get_server_time");
    if (error || !data) throw error;
    return new Date(data);
  } catch (err) {
    return new Date();
  }
}

export function calcularMesesAteEntrega(dataAtual: Date, dataEntrega: Date): number {
  let meses = (dataEntrega.getFullYear() - dataAtual.getFullYear()) * 12;
  meses -= dataAtual.getMonth();
  meses += dataEntrega.getMonth();
  return meses <= 0 ? 0 : meses;
}

export function calcularValorFuturo(valorAtual: number, taxaAnualPerc: number, meses: number): number {
  const anos = meses / 12;
  const taxaDecimal = taxaAnualPerc / 100;
  return valorAtual * Math.pow(1 + taxaDecimal, anos);
}

export function calcularTIRMensal(fluxos: number[], estimativaInicial = 0.01): number {
  let r = estimativaInicial;
  const maxIteracoes = 100;
  const precisao = 0.00001;

  for (let i = 0; i < maxIteracoes; i++) {
    let fv = 0;
    let dfv = 0;

    for (let t = 0; t < fluxos.length; t++) {
      fv += fluxos[t] / Math.pow(1 + r, t);
      dfv -= (t * fluxos[t]) / Math.pow(1 + r, t + 1);
    }

    if (Math.abs(fv) < precisao) break;
    if (dfv === 0) break;

    const nextR = r - fv / dfv;
    if (isNaN(nextR) || !isFinite(nextR)) return 0;
    r = nextR;
  }

  return r;
}

// ============================================================================
// TIPAGENS & DADOS ESTRATÉGICOS
// ============================================================================

export interface RegrasConstrutora {
  entradaMinimaPct: number;
  qtdMinParcelas: number;
  qtdMaxParcelas: number;
  qtdMaxReforcos: number;
  valorMinReforco: number;
  dataEntregaPrevista: string;
  correcoes: {
    entrada: string;
    parcelas: string;
    reforcos: string;
    chaves: string;
  };
}

export interface UnidadeOption {
  id: string;
  nome: string;
  empreendimento: string;
  valorTabela: number;
  areaPrivativaM2: number;
  valorizacaoAnualAA: number; // Valorização esperada % a.a.
  capRateAnualAM: number; // Cap rate estimado de aluguel % a.m.
  tagEspecial?: "Melhor ROI" | "Melhor Fluxo" | "Maior Valorização";
  regrasConstrutora?: RegrasConstrutora;
}

const REGRAS_PADRAO: RegrasConstrutora = {
  entradaMinimaPct: 10,
  qtdMinParcelas: 12,
  qtdMaxParcelas: 60,
  qtdMaxReforcos: 10,
  valorMinReforco: 5000,
  dataEntregaPrevista: "2028-12-01",
  correcoes: {
    entrada: "Sem correção",
    parcelas: "INCC durante obra / IPCA + 0,80% após",
    reforcos: "CUB - SC",
    chaves: "IPCA + 0,90%"
  }
};

const UNIDADES_CATALOGO: UnidadeOption[] = [
  { 
    id: "1", 
    nome: "Apto 701 A (Torre A)", 
    empreendimento: "Bossa Design", 
    valorTabela: 3209187.68, 
    areaPrivativaM2: 182,
    valorizacaoAnualAA: 14.5,
    capRateAnualAM: 0.65,
    tagEspecial: "Melhor ROI",
    regrasConstrutora: { ...REGRAS_PADRAO, dataEntregaPrevista: "2028-06-01" } 
  },
  { 
    id: "2", 
    nome: "Apto 503 B (Frente Mar)", 
    empreendimento: "Brisa Residences", 
    valorTabela: 2450000.00, 
    areaPrivativaM2: 135,
    valorizacaoAnualAA: 12.0,
    capRateAnualAM: 0.60,
    tagEspecial: "Maior Valorização",
    regrasConstrutora: { ...REGRAS_PADRAO, dataEntregaPrevista: "2029-03-01" } 
  },
  { 
    id: "3", 
    nome: "Studio 902 (Norte)", 
    empreendimento: "Infinity Tower", 
    valorTabela: 1180000.00, 
    areaPrivativaM2: 52,
    valorizacaoAnualAA: 16.0,
    capRateAnualAM: 0.75,
    tagEspecial: "Melhor Fluxo",
    regrasConstrutora: { ...REGRAS_PADRAO, dataEntregaPrevista: "2027-12-01" } 
  },
  { 
    id: "4", 
    nome: "Apto 1201 A (Penthouse)", 
    empreendimento: "Bossa Design", 
    valorTabela: 4200000.00, 
    areaPrivativaM2: 240,
    valorizacaoAnualAA: 11.5,
    capRateAnualAM: 0.55,
    regrasConstrutora: { ...REGRAS_PADRAO, dataEntregaPrevista: "2028-12-01" } 
  }
];

type GrupoFinanceiro = "entrada" | "obra" | "reforcos" | "chaves";
type PerfilCliente = "investimento" | "renda_passiva" | "segunda_moradia" | "moradia";

const INDICADORES_MERCADO = {
  selic: "10,75%",
  cdi: "10,65%",
  cubSC: "R$ 3.120/m²",
  m2MedioRegiao: "R$ 14.200/m²"
};

export function Fluxos() {
  const [dataServidor, setDataServidor] = useState<Date>(new Date());
  const [loadingTime, setLoadingTime] = useState<boolean>(true);

  const [perfil, setPerfil] = useState<PerfilCliente>("investimento");
  const [nomeCliente, setNomeCliente] = useState<string>("Investidor");

  const [selectedIds, setSelectedIds] = useState<string[]>(["1", "2", "3"]);
  const [activeUnidadeId, setActiveUnidadeId] = useState<string>("1");
  const [viewModo, setViewModo] = useState<"editor" | "comparador">("editor");

  // Sincronização de horário oficial da API
  useEffect(() => {
    fetchOfficialServerTime().then((dt) => {
      setDataServidor(dt);
      setLoadingTime(false);
    });
  }, []);

  const unidadesSelecionadas = useMemo(() => {
    return UNIDADES_CATALOGO.filter((u) => selectedIds.includes(u.id));
  }, [selectedIds]);

  const unidadeAtiva = useMemo(() => {
    return UNIDADES_CATALOGO.find((u) => u.id === activeUnidadeId) || unidadesSelecionadas[0] || UNIDADES_CATALOGO[0];
  }, [activeUnidadeId, unidadesSelecionadas]);

  const regras = unidadeAtiva?.regrasConstrutora || REGRAS_PADRAO;

  const [locks, setLocks] = useState<Record<GrupoFinanceiro, boolean>>({
    entrada: false,
    obra: false,
    reforcos: false,
    chaves: false
  });

  const [pcts, setPcts] = useState<Record<GrupoFinanceiro, number>>({
    entrada: 15,
    obra: 30,
    reforcos: 20,
    chaves: 35
  });

  // Prazo recalculado dinamicamente com base nas datas oficiais
  const prazoObraCalculado = useMemo(() => {
    const dtEntrega = new Date(regras.dataEntregaPrevista);
    const m = calcularMesesAteEntrega(dataServidor, dtEntrega);
    return m > 0 ? m : 36;
  }, [dataServidor, regras.dataEntregaPrevista]);

  const [qtdObra, setQtdObra] = useState<number>(prazoObraCalculado);
  const [qtdReforcos, setQtdReforcos] = useState<number>(3);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  useEffect(() => {
    setQtdObra(prazoObraCalculado);
  }, [prazoObraCalculado, activeUnidadeId]);

  const formatCurrency = useCallback((val: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0
    }).format(isNaN(val) || !isFinite(val) ? 0 : val);
  }, []);

  const toggleSelectUnidade = (id: string) => {
    if (selectedIds.includes(id)) {
      if (selectedIds.length === 1) return;
      const novos = selectedIds.filter((item) => item !== id);
      setSelectedIds(novos);
      if (activeUnidadeId === id) setActiveUnidadeId(novos[0]);
    } else {
      if (selectedIds.length >= 3) {
        setMensagemErro("Você pode comparar no máximo 3 oportunidades por vez.");
        return;
      }
      setMensagemErro(null);
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleLock = (grupo: GrupoFinanceiro) => {
    setLocks((prevLocks) => {
      const novosLocks = { ...prevLocks, [grupo]: !prevLocks[grupo] };
      const travados = Object.values(novosLocks).filter(Boolean).length;

      if (travados >= 4) {
        setMensagemErro("Pelo menos um grupo deve permanecer livre para cálculo automático.");
        return prevLocks;
      }

      setMensagemErro(null);
      return novosLocks;
    });
  };

  // Algoritmo de rebalanceamento com trava de sliders
  const handlePctChange = (grupoAlterado: GrupoFinanceiro, novoValor: number) => {
    setMensagemErro(null);

    if (isNaN(novoValor) || novoValor < 0 || novoValor > 100) {
      setMensagemErro("O valor percentual deve estar entre 0% e 100%.");
      return;
    }

    const novosPcts = { ...pcts, [grupoAlterado]: novoValor };

    const gruposLivres = (Object.keys(locks) as GrupoFinanceiro[]).filter(
      (g) => !locks[g] && g !== grupoAlterado
    );

    if (gruposLivres.length === 0) {
      const outroGrupo = (Object.keys(locks) as GrupoFinanceiro[]).find((g) => g !== grupoAlterado);
      if (outroGrupo) {
        gruposLivres.push(outroGrupo);
      }
    }

    const somaFixos = (Object.keys(novosPcts) as GrupoFinanceiro[])
      .filter((g) => !gruposLivres.includes(g))
      .reduce((acc, curr) => acc + (novosPcts[curr] || 0), 0);

    const restante = 100 - somaFixos;

    if (restante < 0) {
      setMensagemErro("A soma das travas excede 100% da proposta.");
    }

    const valorPorLivre = Math.max(0, restante / gruposLivres.length);
    gruposLivres.forEach((g) => {
      novosPcts[g] = Number(valorPorLivre.toFixed(2));
    });

    setPcts(novosPcts);
  };

  const valorTabela = unidadeAtiva?.valorTabela || 0;

  // CÁLCULOS FINANCEIROS EXECUTIVOS E MATRIZ DE INVESTIMENTO
  const calculosFinanceiros = useMemo(() => {
    const entrada = (valorTabela * (pcts.entrada || 0)) / 100;
    const obraTotal = (valorTabela * (pcts.obra || 0)) / 100;
    const reforcosTotal = (valorTabela * (pcts.reforcos || 0)) / 100;
    const chaves = (valorTabela * (pcts.chaves || 0)) / 100;

    const obraParcela = qtdObra > 0 ? obraTotal / qtdObra : 0;
    const reforcoParcela = qtdReforcos > 0 ? reforcosTotal / qtdReforcos : 0;

    // Total aportado até a entrega do imóvel (Aporte Pré-Chaves)
    const aportePreChaves = entrada + obraTotal + reforcosTotal;

    // Valorização Composta até a Entrega
    const valorEstimadoNasChaves = calcularValorFuturo(valorTabela, unidadeAtiva.valorizacaoAnualAA, qtdObra);
    const lucroBrutoNasChaves = valorEstimadoNasChaves - valorTabela;

    // ROI Executivo sobre Capital Investido
    const roiPorcentagem = aportePreChaves > 0 ? (lucroBrutoNasChaves / aportePreChaves) * 100 : 0;

    // Fluxo de Caixa para Cálculo da TIR
    const fluxosCaixa = [-entrada];
    const valBaloesPorMes = reforcosTotal / (qtdObra || 1);
    for (let i = 1; i <= qtdObra; i++) {
      fluxosCaixa.push(-(obraParcela + valBaloesPorMes));
    }
    fluxosCaixa[fluxosCaixa.length - 1] += valorEstimadoNasChaves;

    const tirMensalDecimal = calcularTIRMensal(fluxosCaixa);
    const tirAnualPerc = (Math.pow(1 + tirMensalDecimal, 12) - 1) * 100;

    // Cap Rate Estimado de Locação Pós-Chaves
    const aluguelMensalEstimado = (valorEstimadoNasChaves * unidadeAtiva.capRateAnualAM) / 100;

    return {
      entrada,
      obraTotal,
      obraParcela,
      reforcosTotal,
      reforcoParcela,
      chaves,
      somaTotal: entrada + obraTotal + reforcosTotal + chaves,
      somaPct: (pcts.entrada || 0) + (pcts.obra || 0) + (pcts.reforcos || 0) + (pcts.chaves || 0),
      aportePreChaves,
      valorEstimadoNasChaves,
      lucroBrutoNasChaves,
      roiPorcentagem,
      tirAnualPerc,
      tirMensalPerc: tirMensalDecimal * 100,
      aluguelMensalEstimado
    };
  }, [valorTabela, pcts, qtdObra, qtdReforcos, unidadeAtiva]);

  const [copiado, setCopiado] = useState(false);
  const handleCopiarProposta = () => {
    const texto = 
      `🏛️ *ESTUDO FINANCEIRO PERSONALIZADO*\n` +
      `👤 *Cliente:* ${nomeCliente}\n` +
      `🎯 *Foco:* ${perfil.toUpperCase().replace("_", " ")}\n\n` +
      `📌 *UNIDADE SELECIONADA:* ${unidadeAtiva.nome} (${unidadeAtiva.empreendimento})\n` +
      `💰 *Valor de Tabela:* ${formatCurrency(valorTabela)}\n` +
      `📐 *Área:* ${unidadeAtiva.areaPrivativaM2}m² | *R$/m²:* ${formatCurrency(valorTabela / unidadeAtiva.areaPrivativaM2)}\n\n` +
      `📈 *MÉTRICAS EXECUTIVAS DE INVESTIMENTO:*\n` +
      `• ROI s/ Capital Aportado: ${calculosFinanceiros.roiPorcentagem.toFixed(1)}%\n` +
      `• TIR (Taxa Interna Retorno): ${calculosFinanceiros.tirAnualPerc.toFixed(2)}% a.a.\n` +
      `• Valor Projetado nas Chaves: ${formatCurrency(calculosFinanceiros.valorEstimadoNasChaves)}\n` +
      `• Lucro Estimado Pré-Chaves: +${formatCurrency(calculosFinanceiros.lucroBrutoNasChaves)}\n` +
      `• Renda Estimada Aluguel: ${formatCurrency(calculosFinanceiros.aluguelMensalEstimado)}/mês\n\n` +
      `--- *FLUXO DE PAGAMENTO ESTIMADO* ---\n` +
      `1️⃣ *Ato/Entrada* (${pcts.entrada}%): ${formatCurrency(calculosFinanceiros.entrada)}\n` +
      `2️⃣ *Obra* (${pcts.obra}%): ${qtdObra}x de ${formatCurrency(calculosFinanceiros.obraParcela)}/mês\n` +
      `3️⃣ *Balões/Reforços* (${pcts.reforcos}%): ${qtdReforcos}x de ${formatCurrency(calculosFinanceiros.reforcoParcela)}\n` +
      `4️⃣ *Entrega/Chaves* (${pcts.chaves}%): ${formatCurrency(calculosFinanceiros.chaves)}\n`;

    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1.25rem", color: "#f4f4f5" }}>
      
      {/* 1. BARRA SUPERIOR E INDICADORES DE TEMPO E MERCADO */}
      <div style={{ backgroundColor: "#0d0d0f", border: "1px solid #1a1a1e", borderRadius: "10px", padding: "1rem 1.25rem", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
        
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
          <div>
            <span style={{ fontSize: "0.7rem", color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.5px" }}>Investidor / Cliente</span>
            <input
              type="text"
              value={nomeCliente}
              onChange={(e) => setNomeCliente(e.target.value)}
              style={{ backgroundColor: "#141417", border: "1px solid #27272a", color: "#c5a059", padding: "0.3rem 0.6rem", borderRadius: "4px", fontSize: "0.85rem", fontWeight: "bold", display: "block" }}
            />
          </div>

          <div style={{ borderLeft: "1px solid #27272a", paddingLeft: "1rem" }}>
            <span style={{ fontSize: "0.7rem", color: "#a1a1aa", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: "3px" }}>Tese do Investimento</span>
            <div style={{ display: "flex", gap: "0.3rem" }}>
              {(["investimento", "renda_passiva", "segunda_moradia"] as PerfilCliente[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPerfil(p)}
                  style={{
                    backgroundColor: perfil === p ? "#c5a059" : "#141417",
                    color: perfil === p ? "#000" : "#a1a1aa",
                    border: "1px solid #27272a",
                    padding: "0.25rem 0.55rem",
                    borderRadius: "4px",
                    fontSize: "0.725rem",
                    fontWeight: perfil === p ? "bold" : "normal",
                    cursor: "pointer",
                    textTransform: "capitalize"
                  }}
                >
                  {p.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Indicadores do Mercado e Servidor */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem", backgroundColor: "#141417", padding: "0.5rem 1rem", borderRadius: "8px", border: "1px solid #222" }}>
          <div style={{ fontSize: "0.725rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Clock size={14} style={{ color: "#c5a059" }} />
            <div>
              <span style={{ color: "#71717a", display: "block" }}>Data API Servidor</span>
              <span style={{ fontWeight: "bold", color: "#fff" }}>{loadingTime ? "..." : dataServidor.toLocaleDateString("pt-BR")}</span>
            </div>
          </div>
          <div style={{ height: "20px", borderLeft: "1px solid #27272a" }} />
          <div style={{ fontSize: "0.725rem" }}>
            <span style={{ color: "#71717a", display: "block" }}>SELIC / CDI</span>
            <span style={{ fontWeight: "bold", color: "#fff" }}>{INDICADORES_MERCADO.selic}</span>
          </div>
          <div style={{ height: "20px", borderLeft: "1px solid #27272a" }} />
          <div style={{ fontSize: "0.725rem" }}>
            <span style={{ color: "#71717a", display: "block" }}>M² Penha</span>
            <span style={{ fontWeight: "bold", color: "#c5a059" }}>{INDICADORES_MERCADO.m2MedioRegiao}</span>
          </div>
        </div>
      </div>

      {/* 2. SELEÇÃO DE OPORTUNIDADES */}
      <div style={{ backgroundColor: "#0d0d0f", border: "1px solid #1a1a1e", borderRadius: "10px", padding: "1rem 1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
          <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#c5a059", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Layers size={15} /> Seleção de Oportunidades (Máx 3 para Comparação)
          </span>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              type="button"
              onClick={() => setViewModo("editor")}
              style={{
                backgroundColor: viewModo === "editor" ? "#c5a059" : "#141417",
                color: viewModo === "editor" ? "#000" : "#a1a1aa",
                border: "none",
                padding: "0.35rem 0.75rem",
                borderRadius: "5px",
                fontSize: "0.75rem",
                fontWeight: "bold",
                cursor: "pointer"
              }}
            >
              Simulador & Fluxo
            </button>
            <button
              type="button"
              onClick={() => setViewModo("comparador")}
              style={{
                backgroundColor: viewModo === "comparador" ? "#c5a059" : "#141417",
                color: viewModo === "comparador" ? "#000" : "#a1a1aa",
                border: "none",
                padding: "0.35rem 0.75rem",
                borderRadius: "5px",
                fontSize: "0.75rem",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.3rem"
              }}
            >
              <PieChart size={14} /> Comparativo Lado a Lado ({unidadesSelecionadas.length})
            </button>
          </div>
        </div>

        {/* Lista de Unidades */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "0.75rem" }}>
          {UNIDADES_CATALOGO.map((u) => {
            const isSelected = selectedIds.includes(u.id);
            const isActive = activeUnidadeId === u.id && viewModo === "editor";

            return (
              <div
                key={u.id}
                onClick={() => {
                  if (!isSelected) toggleSelectUnidade(u.id);
                  setActiveUnidadeId(u.id);
                }}
                style={{
                  backgroundColor: isActive ? "rgba(197, 160, 89, 0.08)" : "#141417",
                  border: isSelected ? (isActive ? "1px solid #c5a059" : "1px solid #3f3f46") : "1px solid #222",
                  borderRadius: "8px",
                  padding: "0.75rem",
                  cursor: "pointer",
                  position: "relative",
                  transition: "all 0.2s"
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: isSelected ? "#fff" : "#a1a1aa" }}>{u.nome}</span>
                    <span style={{ fontSize: "0.725rem", color: "#71717a", display: "block" }}>{u.empreendimento} • {u.areaPrivativaM2}m²</span>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleSelectUnidade(u.id);
                    }}
                    style={{
                      backgroundColor: isSelected ? "#c5a059" : "transparent",
                      border: isSelected ? "none" : "1px solid #3f3f46",
                      color: isSelected ? "#000" : "#a1a1aa",
                      borderRadius: "4px",
                      width: "20px",
                      height: "20px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer"
                    }}
                  >
                    {isSelected ? <Check size={13} /> : <Plus size={13} />}
                  </button>
                </div>

                <div style={{ marginTop: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.9rem", fontWeight: "bold", color: "#22c55e" }}>{formatCurrency(u.valorTabela)}</span>
                  {u.tagEspecial && (
                    <span style={{ backgroundColor: "rgba(197, 160, 89, 0.15)", color: "#c5a059", border: "1px solid rgba(197, 160, 89, 0.3)", padding: "1px 6px", borderRadius: "4px", fontSize: "0.65rem", fontWeight: "bold" }}>
                      🔥 {u.tagEspecial}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. CONTEÚDO PRINCIPAL (MODO EDITOR OU MODO COMPARATIVO) */}
      {viewModo === "comparador" ? (
        <div style={{ backgroundColor: "#0d0d0f", border: "1px solid #1a1a1e", borderRadius: "10px", padding: "1.25rem", overflowX: "auto" }}>
          <h2 style={{ fontSize: "1rem", fontWeight: "bold", color: "#c5a059", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <TrendingUp size={18} /> Matrix de Decisão Imobiliária ({unidadesSelecionadas.length} Opções)
          </h2>

          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.825rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #27272a" }}>
                <th style={{ padding: "0.75rem", color: "#71717a" }}>Indicador / Ativo</th>
                {unidadesSelecionadas.map((u) => (
                  <th key={u.id} style={{ padding: "0.75rem", color: "#c5a059", fontSize: "0.95rem" }}>
                    {u.nome}
                    <span style={{ display: "block", fontSize: "0.725rem", color: "#a1a1aa", fontWeight: "normal" }}>{u.empreendimento}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: "1px solid #1a1a1e" }}>
                <td style={{ padding: "0.75rem", color: "#a1a1aa" }}>Valor de Tabela</td>
                {unidadesSelecionadas.map((u) => <td key={u.id} style={{ padding: "0.75rem", fontWeight: "bold", color: "#fff" }}>{formatCurrency(u.valorTabela)}</td>)}
              </tr>
              <tr style={{ borderBottom: "1px solid #1a1a1e" }}>
                <td style={{ padding: "0.75rem", color: "#a1a1aa" }}>Valor do m²</td>
                {unidadesSelecionadas.map((u) => <td key={u.id} style={{ padding: "0.75rem", color: "#d4d4d8" }}>{formatCurrency(u.valorTabela / u.areaPrivativaM2)}/m²</td>)}
              </tr>
              <tr style={{ borderBottom: "1px solid #1a1a1e", backgroundColor: "rgba(197, 160, 89, 0.03)" }}>
                <td style={{ padding: "0.75rem", color: "#c5a059", fontWeight: "bold" }}>Valorização Estimada</td>
                {unidadesSelecionadas.map((u) => <td key={u.id} style={{ padding: "0.75rem", fontWeight: "bold", color: "#22c55e" }}>+{u.valorizacaoAnualAA}% aa</td>)}
              </tr>
              <tr style={{ borderBottom: "1px solid #1a1a1e" }}>
                <td style={{ padding: "0.75rem", color: "#a1a1aa" }}>Aluguel Estimado (Cap Rate)</td>
                {unidadesSelecionadas.map((u) => <td key={u.id} style={{ padding: "0.75rem", color: "#fff" }}>{u.capRateAnualAM}% a.m.</td>)}
              </tr>
              <tr style={{ borderBottom: "1px solid #1a1a1e" }}>
                <td style={{ padding: "0.75rem", color: "#a1a1aa" }}>Data de Entrega</td>
                {unidadesSelecionadas.map((u) => <td key={u.id} style={{ padding: "0.75rem", color: "#38bdf8", fontWeight: "bold" }}>{u.regrasConstrutora?.dataEntregaPrevista || "2028-12-01"}</td>)}
              </tr>
              <tr>
                <td style={{ padding: "0.75rem", color: "#a1a1aa" }}>Ação Comercial</td>
                {unidadesSelecionadas.map((u) => (
                  <td key={u.id} style={{ padding: "0.75rem" }}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveUnidadeId(u.id);
                        setViewModo("editor");
                      }}
                      style={{ backgroundColor: "#c5a059", color: "#000", border: "none", padding: "0.4rem 0.8rem", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", fontSize: "0.75rem" }}
                    >
                      Ajustar Fluxo
                    </button>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      ) : (
        /* MODO SIMULADOR & EDITOR COMPLETO */
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.25rem" }}>
          
          {/* PAINEL ESQUERDO: CONTROLE DOS SLIDERS */}
          <div style={{ backgroundColor: "#0d0d0f", border: "1px solid #1a1a1e", borderRadius: "10px", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            
            <div style={{ backgroundColor: "#141417", border: "1px solid #222", padding: "0.75rem 1rem", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ fontSize: "0.7rem", color: "#71717a", display: "block" }}>Distribuído</span>
                <span style={{ fontSize: "0.95rem", fontWeight: "bold", color: "#c5a059" }}>
                  {calculosFinanceiros.somaPct.toFixed(0)}% ({formatCurrency(calculosFinanceiros.somaTotal)})
                </span>
              </div>
              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "0.7rem", color: "#71717a", display: "block" }}>Restante</span>
                <span style={{ fontSize: "0.95rem", fontWeight: "bold", color: Math.abs(100 - calculosFinanceiros.somaPct) < 0.1 ? "#22c55e" : "#ef4444" }}>
                  {Math.max(0, 100 - calculosFinanceiros.somaPct).toFixed(0)}%
                </span>
              </div>
            </div>

            {mensagemErro && (
              <div style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#ef4444", padding: "0.5rem 0.75rem", borderRadius: "6px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <AlertCircle size={14} /> {mensagemErro}
              </div>
            )}

            {/* Sliders de Fluxo com Travas Protégidas */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              
              {/* 1. Entrada */}
              <div style={{ backgroundColor: "#141417", padding: "0.75rem", borderRadius: "6px", border: "1px solid #222" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.3rem" }}>
                  <span style={{ fontWeight: "bold", color: "#fff" }}>1. Ato / Entrada</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span style={{ color: "#c5a059", fontWeight: "bold" }}>{pcts.entrada.toFixed(1)}% ({formatCurrency(calculosFinanceiros.entrada)})</span>
                    <button type="button" onClick={() => toggleLock("entrada")} style={{ background: "none", border: "none", color: locks.entrada ? "#c5a059" : "#71717a", cursor: "pointer", padding: 0 }}>
                      {locks.entrada ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                  </div>
                </div>
                <input type="range" min="0" max="100" step="0.5" disabled={locks.entrada} value={pcts.entrada} onChange={(e) => handlePctChange("entrada", parseFloat(e.target.value))} style={{ width: "100%", accentColor: "#c5a059", cursor: locks.entrada ? "not-allowed" : "pointer" }} />
              </div>

              {/* 2. Obra */}
              <div style={{ backgroundColor: "#141417", padding: "0.75rem", borderRadius: "6px", border: "1px solid #222" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.3rem" }}>
                  <span style={{ fontWeight: "bold", color: "#fff" }}>2. Parcelas Obra ({qtdObra}x)</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span style={{ color: "#c5a059", fontWeight: "bold" }}>{pcts.obra.toFixed(1)}% ({formatCurrency(calculosFinanceiros.obraParcela)}/mês)</span>
                    <button type="button" onClick={() => toggleLock("obra")} style={{ background: "none", border: "none", color: locks.obra ? "#c5a059" : "#71717a", cursor: "pointer", padding: 0 }}>
                      {locks.obra ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                  </div>
                </div>
                <input type="range" min="0" max="100" step="0.5" disabled={locks.obra} value={pcts.obra} onChange={(e) => handlePctChange("obra", parseFloat(e.target.value))} style={{ width: "100%", accentColor: "#c5a059", cursor: locks.obra ? "not-allowed" : "pointer" }} />
              </div>

              {/* 3. Reforços */}
              <div style={{ backgroundColor: "#141417", padding: "0.75rem", borderRadius: "6px", border: "1px solid #222" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.3rem" }}>
                  <span style={{ fontWeight: "bold", color: "#fff" }}>3. Balões / Reforços ({qtdReforcos}x)</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span style={{ color: "#c5a059", fontWeight: "bold" }}>{pcts.reforcos.toFixed(1)}% ({formatCurrency(calculosFinanceiros.reforcoParcela)}/balão)</span>
                    <button type="button" onClick={() => toggleLock("reforcos")} style={{ background: "none", border: "none", color: locks.reforcos ? "#c5a059" : "#71717a", cursor: "pointer", padding: 0 }}>
                      {locks.reforcos ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                  </div>
                </div>
                <input type="range" min="0" max="100" step="0.5" disabled={locks.reforcos} value={pcts.reforcos} onChange={(e) => handlePctChange("reforcos", parseFloat(e.target.value))} style={{ width: "100%", accentColor: "#c5a059", cursor: locks.reforcos ? "not-allowed" : "pointer" }} />
              </div>

              {/* 4. Chaves */}
              <div style={{ backgroundColor: "#141417", padding: "0.75rem", borderRadius: "6px", border: "1px solid #222" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: "0.3rem" }}>
                  <span style={{ fontWeight: "bold", color: "#fff" }}>4. Chaves / Financiamento</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <span style={{ color: "#c5a059", fontWeight: "bold" }}>{pcts.chaves.toFixed(1)}% ({formatCurrency(calculosFinanceiros.chaves)})</span>
                    <button type="button" onClick={() => toggleLock("chaves")} style={{ background: "none", border: "none", color: locks.chaves ? "#c5a059" : "#71717a", cursor: "pointer", padding: 0 }}>
                      {locks.chaves ? <Lock size={14} /> : <Unlock size={14} />}
                    </button>
                  </div>
                </div>
                <input type="range" min="0" max="100" step="0.5" disabled={locks.chaves} value={pcts.chaves} onChange={(e) => handlePctChange("chaves", parseFloat(e.target.value))} style={{ width: "100%", accentColor: "#c5a059", cursor: locks.chaves ? "not-allowed" : "pointer" }} />
              </div>

            </div>

            {/* CRONOGRAMA DE DESEMBOLSO */}
            <div style={{ backgroundColor: "#141417", border: "1px solid #222", borderRadius: "8px", padding: "0.75rem" }}>
              <span style={{ fontSize: "0.7rem", color: "#a1a1aa", textTransform: "uppercase", fontWeight: "bold", display: "block", marginBottom: "0.5rem" }}>
                📍 Cronograma Estimado de Desembolso
              </span>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "0.3rem", textAlign: "center", fontSize: "0.7rem" }}>
                <div style={{ backgroundColor: "#0d0d0f", padding: "0.4rem", borderRadius: "4px" }}>
                  <span style={{ color: "#c5a059", display: "block", fontWeight: "bold" }}>Ato</span>
                  <span style={{ color: "#71717a" }}>Imediato</span>
                </div>
                <div style={{ backgroundColor: "#0d0d0f", padding: "0.4rem", borderRadius: "4px" }}>
                  <span style={{ color: "#fff", display: "block", fontWeight: "bold" }}>Obra</span>
                  <span style={{ color: "#71717a" }}>{qtdObra} meses</span>
                </div>
                <div style={{ backgroundColor: "#0d0d0f", padding: "0.4rem", borderRadius: "4px" }}>
                  <span style={{ color: "#fff", display: "block", fontWeight: "bold" }}>Balões</span>
                  <span style={{ color: "#71717a" }}>{qtdReforcos}x</span>
                </div>
                <div style={{ backgroundColor: "#0d0d0f", padding: "0.4rem", borderRadius: "4px" }}>
                  <span style={{ color: "#22c55e", display: "block", fontWeight: "bold" }}>Chaves</span>
                  <span style={{ color: "#71717a" }}>{regras.dataEntregaPrevista}</span>
                </div>
              </div>
            </div>

          </div>

          {/* PAINEL DIREITO: MÉTRICAS EXECUTIVAS DE INVESTIMENTO (TIR, ROI, CAP RATE) */}
          <div style={{ backgroundColor: "#0d0d0f", border: "1px solid #1a1a1e", borderRadius: "10px", padding: "1.25rem", display: "flex", flexDirection: "column", justifyContent: "space-between", gap: "1rem" }}>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              
              <div style={{ borderBottom: "1px solid #222", paddingBottom: "0.75rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <h3 style={{ fontSize: "1.1rem", color: "#fff", fontWeight: "bold", margin: 0 }}>{unidadeAtiva.nome}</h3>
                  <p style={{ fontSize: "0.75rem", color: "#71717a", margin: "2px 0 0 0" }}>{unidadeAtiva.empreendimento} • {unidadeAtiva.areaPrivativaM2}m² privativos</p>
                </div>
                <span style={{ fontSize: "1.2rem", fontWeight: "bold", color: "#22c55e" }}>{formatCurrency(valorTabela)}</span>
              </div>

              {/* CARDS DE MÉTRICAS EXECUTIVAS CALCULADAS */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "0.6rem" }}>
                
                <div style={{ backgroundColor: "#141417", border: "1px solid #27272a", padding: "0.65rem", borderRadius: "6px" }}>
                  <span style={{ fontSize: "0.65rem", color: "#a1a1aa", display: "block" }}>TIR (Taxa Interna Retorno)</span>
                  <span style={{ fontSize: "1.05rem", fontWeight: "bold", color: "#c5a059" }}>
                    {calculosFinanceiros.tirAnualPerc.toFixed(2)}% <span style={{ fontSize: "0.65rem", color: "#71717a" }}>a.a.</span>
                  </span>
                  <span style={{ fontSize: "0.62rem", color: "#71717a", display: "block" }}>({calculosFinanceiros.tirMensalPerc.toFixed(2)}% a.m.)</span>
                </div>

                <div style={{ backgroundColor: "#141417", border: "1px solid #27272a", padding: "0.65rem", borderRadius: "6px" }}>
                  <span style={{ fontSize: "0.65rem", color: "#a1a1aa", display: "block" }}>ROI s/ Capital Aportado</span>
                  <span style={{ fontSize: "1.05rem", fontWeight: "bold", color: "#22c55e" }}>
                    {calculosFinanceiros.roiPorcentagem.toFixed(1)}%
                  </span>
                  <span style={{ fontSize: "0.62rem", color: "#71717a", display: "block" }}>Retorno pré-chaves</span>
                </div>

                <div style={{ backgroundColor: "#141417", border: "1px solid #27272a", padding: "0.65rem", borderRadius: "6px" }}>
                  <span style={{ fontSize: "0.65rem", color: "#a1a1aa", display: "block" }}>Valor Futuro nas Chaves</span>
                  <span style={{ fontSize: "0.95rem", fontWeight: "bold", color: "#fff" }}>
                    {formatCurrency(calculosFinanceiros.valorEstimadoNasChaves)}
                  </span>
                  <span style={{ fontSize: "0.62rem", color: "#22c55e", display: "block" }}>+{formatCurrency(calculosFinanceiros.lucroBrutoNasChaves)} de lucro</span>
                </div>

                <div style={{ backgroundColor: "#141417", border: "1px solid #27272a", padding: "0.65rem", borderRadius: "6px" }}>
                  <span style={{ fontSize: "0.65rem", color: "#a1a1aa", display: "block" }}>Aluguel Estimado (Cap Rate)</span>
                  <span style={{ fontSize: "0.95rem", fontWeight: "bold", color: "#38bdf8" }}>
                    {formatCurrency(calculosFinanceiros.aluguelMensalEstimado)}/mês
                  </span>
                  <span style={{ fontSize: "0.62rem", color: "#71717a", display: "block" }}>({unidadeAtiva.capRateAnualAM}% a.m.)</span>
                </div>

              </div>

              {/* COMPARATIVO COM RENDA FIXA */}
              <div style={{ backgroundColor: "#141417", border: "1px solid #27272a", borderRadius: "8px", padding: "0.85rem" }}>
                <span style={{ fontSize: "0.725rem", fontWeight: "bold", color: "#c5a059", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "0.3rem", marginBottom: "0.5rem" }}>
                  <TrendingUp size={14} /> Ancoragem Patrimonial (Projeção)
                </span>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", fontSize: "0.75rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#a1a1aa" }}>Renda Fixa Tradicional (CDB 100%)</span>
                    <span style={{ color: "#ef4444", fontWeight: "bold" }}>~10.65% a.a.</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ color: "#a1a1aa" }}>Rendimento Imobiliário (TIR Operação)</span>
                    <span style={{ color: "#22c55e", fontWeight: "bold" }}>~{calculosFinanceiros.tirAnualPerc.toFixed(2)}% a.a.</span>
                  </div>
                </div>
              </div>

              {/* RESUMO DO FLUXO SELECIONADO */}
              <div style={{ fontSize: "0.8rem", color: "#d4d4d8", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Ato / Entrada ({pcts.entrada.toFixed(1)}%):</span>
                  <strong>{formatCurrency(calculosFinanceiros.entrada)}</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Mensais Obra ({qtdObra}x):</span>
                  <strong>{formatCurrency(calculosFinanceiros.obraParcela)}/mês</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Reforços ({qtdReforcos}x):</span>
                  <strong>{formatCurrency(calculosFinanceiros.reforcoParcela)}/balão</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span>Aporte Total Pré-Chaves:</span>
                  <strong style={{ color: "#c5a059" }}>{formatCurrency(calculosFinanceiros.aportePreChaves)}</strong>
                </div>
              </div>

            </div>

            {/* BOTAO COPIAR */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={handleCopiarProposta}
                style={{
                  width: "100%",
                  backgroundColor: "#c5a059",
                  color: "#000",
                  fontWeight: "bold",
                  border: "none",
                  padding: "0.75rem",
                  borderRadius: "6px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.4rem",
                  fontSize: "0.85rem"
                }}
              >
                {copiado ? <CheckCircle2 size={16} /> : <Copy size={16} />}
                {copiado ? "Copiado para o WhatsApp!" : "Copiar Proposta Comercial Executiva"}
              </button>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}

export default Fluxos;