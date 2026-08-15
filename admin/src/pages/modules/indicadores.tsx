import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { applyExchangeRate, getExchangeRate, refreshExchangeRate, type ExchangeRate } from "@/lib/exchangeRate";
import { 
  TrendingUp, 
  Plus, 
  Search, 
  Edit3, 
  Trash2, 
  X, 
  Calculator, 
  PlusCircle,
  RefreshCw
} from "lucide-react";

// 1. Função de formatação universal por Categoria
const formatarValorPorCategoria = (valor: number | string, cat?: string) => {
  if (valor === "" || valor === null || valor === undefined) return "—";

  // Se já for número, usa direto. Se for string, converte tratando a vírgula do pt-BR
  const num = typeof valor === "number" 
    ? valor 
    : parseFloat(valor.toString().replace(",", "."));
  
  if (isNaN(num)) return valor.toString();

  const categoriaSegura = cat ? cat.toUpperCase() : "";

  // 1. Moedas (Dólar, Euro, etc.)
  if (categoriaSegura === "MOEDA" || categoriaSegura.includes("DÓLAR")) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 4
    }).format(num);
  }

  // 2. Preço por m²
  if (categoriaSegura === "IMOBILIARIO_M2") {
    const formatado = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(num);
    return `${formatado}/m²`;
  }

  // 3. Taxas / Porcentagens (Selic, CUB, Renda Fixa, etc.)
  const formattedNum = num.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  });

  return `${formattedNum}%`;
};

interface SerieHistorica {
  mesAno: string;
  valor: number;
}

export default function Indicadores() {
  const [indicadores, setIndicadores] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategoria, setSelectedCategoria] = useState("TODAS");
  const [exchangeRate, setExchangeRate] = useState<ExchangeRate | null>(null);
  const [refreshingRate, setRefreshingRate] = useState(false);

  // Estado do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Campos Básicos
  const [nome, setNome] = useState("");
  const [sku, setSku] = useState("");
  const [unlockSku, setUnlockSku] = useState(false);
  const [categoria, setCategoria] = useState("CONSTRUCAO");
  const [cidade, setCidade] = useState("");
  const [, setTipoValor] = useState<"PORCENTAGEM" | "VALOR_NOMINAL" | "VALOR_M2">("PORCENTAGEM");
  // Campos de Configuração Direta
  const [valorAtual, setValorAtual] = useState<string>(""); 
  const [indexadorBase, setIndexadorBase] = useState("100% CDI");
  const [tributacaoTipo, setTributacaoTipo] = useState<"isento" | "regressivo" | "fixo">("isento");
  const [aliquotaFixa, setAliquotaFixa] = useState(15);

  // Lançamento Dinâmico de Série de Histórico
  const [historicoEntradas, setHistoricoEntradas] = useState<SerieHistorica[]>([
    { mesAno: "2026-01", valor: 0 },
    { mesAno: "2026-02", valor: 0 },
    { mesAno: "2026-03", valor: 0 }
  ]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [{ data, error }, rate] = await Promise.all([
        supabase.from("indicadores").select(),
        getExchangeRate(),
      ]);
      setExchangeRate(rate);

      if (error) {
        console.error("Erro no Supabase ao buscar:", error);
      } else if (data) {
        setIndicadores(applyExchangeRate(data, rate));
      }
    } catch (err) {
      console.error("Erro inesperado:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateDollar = async () => {
    setRefreshingRate(true);
    try {
      const rate = await refreshExchangeRate();
      setExchangeRate(rate);
      setIndicadores((current) => applyExchangeRate(current, rate));
      window.dispatchEvent(new Event("luan:cotacao-atualizada"));
    } catch (error) {
      console.error("Erro ao atualizar cotação:", error);
      alert("Não foi possível atualizar a cotação agora. A última cotação válida continuará em uso.");
    } finally {
      setRefreshingRate(false);
    }
  };

  const generateSku = (str: string) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9-]/g, "")
      .toUpperCase()
      .substring(0, 14);
  };

  const handleNomeChange = (val: string) => {
    setNome(val);
    if (!editingId && !unlockSku) {
      setSku(generateSku(val));
    }
  };

  const calcularMedia12Meses = () => {
    const valoresValidos = historicoEntradas.map((h) => Number(h.valor) || 0).filter((v) => v > 0);
    if (valoresValidos.length === 0) return 0;
    const soma = valoresValidos.reduce((acc, curr) => acc + curr, 0);
    return soma / valoresValidos.length;
  };

  const calcularVariacaoTotal = () => {
    const valoresValidos = historicoEntradas.map((h) => Number(h.valor) || 0).filter((v) => v > 0);
    if (valoresValidos.length < 2) return 0;
    const primeiro = valoresValidos[0];
    const ultimo = valoresValidos[valoresValidos.length - 1];
    return ((ultimo - primeiro) / primeiro) * 100;
  };

  const handleAddLinhaHistorico = () => {
    setHistoricoEntradas([...historicoEntradas, { mesAno: "", valor: 0 }]);
  };

  const handleRemoveLinhaHistorico = (index: number) => {
    setHistoricoEntradas(historicoEntradas.filter((_, i) => i !== index));
  };

  const handleHistoricoChange = (index: number, field: "mesAno" | "valor", value: any) => {
    const newHist = [...historicoEntradas];
    newHist[index] = { ...newHist[index], [field]: value };
    setHistoricoEntradas(newHist);
  };

  const handleOpenModal = async (item?: any) => {
    if (item) {
      setEditingId(item.id);
      setNome(item.nome || "");
      setSku(item.sku || "");
      setUnlockSku(false);
      setCategoria(item.categoria || "CONSTRUCAO");
      setCidade(item.cidade || "");
      setTipoValor(item.tipo_valor || "PORCENTAGEM");
      setValorAtual(item.valor_atual !== undefined && item.valor_atual !== null ? item.valor_atual.toString() : (item.valor?.toString() || ""));
      setIndexadorBase(item.indexador_base || "");
      setTributacaoTipo(item.tributacao?.tipo || "isento");
      setAliquotaFixa(Number(item.tributacao?.aliquota_fixa) || 15);

      try {
        const { data: histData } = await supabase
          .from("indicadores_historico")
          .select()
          .eq("indicador_id", item.id);

        if (histData && histData.length > 0) {
          setHistoricoEntradas(
            histData.map((h: any) => ({
              mesAno: h.data_referencia || "",
              valor: h.valor || 0
            }))
          );
        } else {
          setHistoricoEntradas([]);
        }
      } catch {
        setHistoricoEntradas([]);
      }
    } else {
      setEditingId(null);
      setNome("");
      setSku("");
      setUnlockSku(false);
      setCategoria("CONSTRUCAO");
      setCidade("");
      setTipoValor("PORCENTAGEM");
      setValorAtual("");
      setIndexadorBase("");
      setTributacaoTipo("isento");
      setAliquotaFixa(15);
      setHistoricoEntradas([
        { mesAno: "2026-01", valor: 0 },
        { mesAno: "2026-02", valor: 0 },
        { mesAno: "2026-03", valor: 0 }
      ]);
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!nome.trim() || !sku.trim()) {
      alert("Informe o nome e o SKU do indicador.");
      return;
    }

    // Tratamento estrito para salvar números decimais exatos no Supabase (ex: "5,12" -> 5.12)
    let valorTratado = 0;
    if (valorAtual !== "") {
      const valorLimpo = valorAtual.toString().replace(/\s/g, "").replace(",", ".");
      valorTratado = parseFloat(valorLimpo);
    } else {
      valorTratado = calcularMedia12Meses();
    }

    if (isNaN(valorTratado)) {
      alert("Por favor, insira um valor numérico válido.");
      return;
    }

    const payloadIndicador: any = {
      sku: sku.trim().toUpperCase(),
      nome: nome.trim(),
      categoria,
      valor: valorTratado,
      valor_atual: valorTratado
    };

    payloadIndicador.tributacao = tributacaoTipo === "regressivo" ? {
      tipo: "regressivo",
      faixas: [{ ate_dias: 180, aliquota: 22.5 }, { ate_dias: 360, aliquota: 20 }, { ate_dias: 720, aliquota: 17.5 }, { ate_dias: null, aliquota: 15 }]
    } : tributacaoTipo === "fixo" ? { tipo: "fixo", aliquota_fixa: aliquotaFixa } : { tipo: "isento" };

    if (cidade.trim()) payloadIndicador.cidade = cidade.trim();
    if (indexadorBase.trim()) payloadIndicador.indexador_base = indexadorBase.trim();

    setLoading(true);

    try {
      let targetId = editingId;

      if (editingId) {
        const { error } = await supabase.from("indicadores").update(payloadIndicador).eq("id", editingId);
        if (error) throw error;
      } else {
        const { data: inserted, error } = await supabase
          .from("indicadores")
          .insert([payloadIndicador])
          .select();

        if (error) throw error;
        if (inserted && inserted.length > 0) {
          targetId = inserted[0].id;
        }
      }

      if (targetId && historicoEntradas.length > 0) {
        const histPayload = historicoEntradas
          .filter((h) => h.mesAno && h.valor !== undefined)
          .map((h) => ({
            indicador_id: targetId,
            data_referencia: h.mesAno,
            valor: Number(h.valor)
          }));

        if (histPayload.length > 0) {
          try {
            await supabase.from("indicadores_historico").delete().eq("indicador_id", targetId);
            await supabase.from("indicadores_historico").insert(histPayload);
          } catch {
            // Ignora erro caso a tabela de histórico não exista no banco
          }
        }
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (err: any) {
      alert("Erro ao salvar indicador: " + (err.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, itemNome: string) => {
    if (confirm(`Deseja remover o indicador "${itemNome}"?`)) {
      await supabase.from("indicadores").delete().eq("id", id);
      await fetchData();
    }
  };

  const filtered = indicadores.filter((item) => {
    const matchSearch =
      (item.nome && item.nome.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.sku && item.sku.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.cidade && item.cidade.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchCat = selectedCategoria === "TODAS" || item.categoria === selectedCategoria;
    return matchSearch && matchCat;
  });

  return (
    <div style={{ color: "#e4e4e7", fontFamily: "sans-serif", fontSize: "0.85rem", padding: "1rem" }}>
      {/* CABEÇALHO */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid #222", paddingBottom: "0.75rem" }}>
        <div>
          <h1 style={{ fontSize: "1.1rem", fontWeight: "600", color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <TrendingUp style={{ width: "18px", height: "18px", color: "#c5a059" }} /> Central Autônoma de Indicadores
          </h1>
          <p style={{ color: "#71717a", fontSize: "0.75rem", margin: "0.2rem 0 0 0" }}>
            Cadastre taxas manuais, séries do CUB por cidade, Dólar e Renda Fixa para usar em comparações imobiliárias.
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          style={{ backgroundColor: "#c5a059", color: "#000", fontWeight: "bold", padding: "0.45rem 0.9rem", borderRadius: "4px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem" }}
        >
          <Plus style={{ width: "14px", height: "14px" }} /> Cadastrar Indicador Dinâmico
        </button>
      </div>

      <section style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "0.9rem 1rem", marginBottom: "0.9rem", background: "linear-gradient(135deg,#15130e,#101012)", border: "1px solid #3f3524", borderRadius: 8 }}>
        <div>
          <small style={{ color: "#8b8b93", textTransform: "uppercase", letterSpacing: ".08em" }}>Dólar PTAX em uso</small>
          <strong style={{ display: "block", color: "#d7ab63", fontSize: "1.45rem", marginTop: 3 }}>{exchangeRate ? `R$ ${exchangeRate.value.toLocaleString("pt-BR", { minimumFractionDigits: 4, maximumFractionDigits: 4 })}` : "Indisponível"}</strong>
          <small style={{ color: "#71717a" }}>{exchangeRate?.manual ? "Cotação manual" : "Banco Central do Brasil"} · {exchangeRate?.date || "última cotação válida não encontrada"}{exchangeRate?.source === "cache" ? " · cache local" : ""}</small>
        </div>
        <button onClick={() => void updateDollar()} disabled={refreshingRate} style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "#1c1a15", color: "#d7ab63", border: "1px solid #5b4828", borderRadius: 6, padding: "8px 11px", cursor: refreshingRate ? "wait" : "pointer" }}><RefreshCw size={14} /> {refreshingRate ? "Atualizando..." : "Atualizar agora"}</button>
      </section>

      {/* FILTROS E BUSCA */}
      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.85rem", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 2, minWidth: "200px" }}>
          <Search style={{ position: "absolute", left: "0.6rem", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: "#71717a" }} />
          <input
            type="text"
            placeholder="Buscar por nome, SKU, cidade..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", backgroundColor: "#121212", border: "1px solid #27272a", color: "#fff", padding: "0.4rem 0.6rem 0.4rem 2rem", borderRadius: "4px", fontSize: "0.8rem", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ display: "flex", gap: "0.3rem" }}>
          {[
            { id: "TODAS", label: "Todos" },
            { id: "TAXAS", label: "Selic / Taxas" },
            { id: "CONSTRUCAO", label: "CUB / Construção" },
            { id: "RENDA_FIXA", label: "LCI / LCA / CDB / CDI" },
            { id: "IMOBILIARIO_M2", label: "Preço m²" },
            { id: "MOEDA", label: "Dólar / Moedas" }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoria(cat.id)}
              style={{
                backgroundColor: selectedCategoria === cat.id ? "#c5a059" : "#121212",
                color: selectedCategoria === cat.id ? "#000" : "#a1a1aa",
                border: "1px solid #27272a",
                padding: "0.35rem 0.6rem",
                borderRadius: "4px",
                fontSize: "0.75rem",
                cursor: "pointer",
                fontWeight: selectedCategoria === cat.id ? "bold" : "normal"
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* LISTAGEM PRINCIPAL */}
      <div style={{ backgroundColor: "#121212", border: "1px solid #222", borderRadius: "6px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.8rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#18181b", borderBottom: "1px solid #27272a", color: "#71717a", textTransform: "uppercase", fontSize: "0.7rem" }}>
              <th style={{ padding: "0.55rem 0.8rem" }}>SKU</th>
              <th style={{ padding: "0.55rem 0.8rem" }}>Nome / Cidade</th>
              <th style={{ padding: "0.55rem 0.8rem" }}>Categoria</th>
              <th style={{ padding: "0.55rem 0.8rem" }}>Valor / Taxa Atual</th>
              <th style={{ padding: "0.55rem 0.8rem", textAlign: "right" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: "1.5rem", textAlign: "center", color: "#52525b", fontStyle: "italic" }}>
                  Nenhum indicador cadastrado ainda.
                </td>
              </tr>
            ) : (
              filtered.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid #1a1a1e" }}>
                  <td style={{ padding: "0.5rem 0.8rem" }}>
                    <span style={{ fontFamily: "monospace", fontSize: "0.7rem", backgroundColor: "#1c1c20", color: "#c5a059", padding: "0.1rem 0.35rem", borderRadius: "3px", border: "1px solid #27272a" }}>
                      {item.sku}
                    </span>
                  </td>
                  <td style={{ padding: "0.5rem 0.8rem", fontWeight: "600", color: "#fff" }}>
                    {item.nome}
                    {item.cidade && <span style={{ fontSize: "0.7rem", color: "#71717a", marginLeft: "0.3rem" }}>({item.cidade})</span>}
                  </td>
                  <td style={{ padding: "0.5rem 0.8rem", color: "#a1a1aa", fontSize: "0.75rem" }}>{item.categoria || "—"}</td>
                  <td style={{ padding: "0.5rem 0.8rem", color: "#c5a059", fontWeight: "bold" }}>
                    {formatarValorPorCategoria(item.valor_atual ?? item.valor, item.categoria)}
                    {item.indexador_base && <span style={{ fontSize: "0.68rem", color: "#71717a", marginLeft: "0.3rem" }}>({item.indexador_base})</span>}
                  </td>
                  <td style={{ padding: "0.5rem 0.8rem", textAlign: "right" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.4rem" }}>
                      <button onClick={() => handleOpenModal(item)} style={{ background: "none", border: "none", color: "#a1a1aa", cursor: "pointer" }}>
                        <Edit3 style={{ width: "14px", height: "14px" }} />
                      </button>
                      <button onClick={() => handleDelete(item.id, item.nome)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}>
                        <Trash2 style={{ width: "14px", height: "14px" }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999 }}>
          <div style={{ backgroundColor: "#121212", border: "1px solid #27272a", borderRadius: "8px", width: "100%", maxWidth: "620px", maxHeight: "90vh", overflowY: "auto", padding: "1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid #222", paddingBottom: "0.5rem" }}>
              <h3 style={{ margin: 0, color: "#fff", fontSize: "1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Calculator style={{ width: "18px", height: "18px", color: "#c5a059" }} />
                {editingId ? "Editar Indicador Dinâmico" : "Novo Indicador Autônomo"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", color: "#a1a1aa", cursor: "pointer" }}>
                <X style={{ width: "16px", height: "16px" }} />
              </button>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
              <div style={{ gridColumn: "span 2" }}>
                <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.7rem", marginBottom: "0.2rem" }}>Nome do Indicador *</label>
                <input
                  type="text"
                  placeholder="Ex: CUB Penha 2026 ou LCI Itaú 90% CDI"
                  value={nome}
                  onChange={(e) => handleNomeChange(e.target.value)}
                  style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", color: "#fff", padding: "0.45rem", borderRadius: "4px", fontSize: "0.8rem", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                  <label style={{ color: "#a1a1aa", fontSize: "0.7rem" }}>SKU Identificador</label>
                  <button
                    type="button"
                    onClick={() => setUnlockSku(!unlockSku)}
                    style={{ background: "none", border: "none", color: "#c5a059", fontSize: "0.65rem", cursor: "pointer" }}
                  >
                    {unlockSku ? "Bloquear" : "Editar"}
                  </button>
                </div>
                <input
                  type="text"
                  value={sku}
                  readOnly={!unlockSku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                  style={{ width: "100%", backgroundColor: unlockSku ? "#18181b" : "#09090b", border: "1px solid #27272a", color: "#c5a059", padding: "0.45rem", borderRadius: "4px", fontSize: "0.8rem", fontFamily: "monospace", fontWeight: "bold", boxSizing: "border-box" }}
                />
              </div>

              <div>
                <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.7rem", marginBottom: "0.2rem" }}>Categoria</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", color: "#fff", padding: "0.45rem", borderRadius: "4px", fontSize: "0.8rem" }}
                >
                  <option value="TAXAS">Selic / Taxas de Juros</option>
                  <option value="CONSTRUCAO">CUB / Construção Civil</option>
                  <option value="RENDA_FIXA">Renda Fixa (LCI / LCA / CDB / CDI)</option>
                  <option value="IMOBILIARIO_M2">Preço por m² Regional</option>
                  <option value="MOEDA">Moedas (Dólar, Euro)</option>
                </select>
              </div>

              {(categoria === "CONSTRUCAO" || categoria === "IMOBILIARIO_M2") && (
                <div>
                  <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.7rem", marginBottom: "0.2rem" }}>Cidade / Região</label>
                  <input
                    type="text"
                    placeholder="Ex: Penha, Balneário Camboriú"
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", color: "#fff", padding: "0.45rem", borderRadius: "4px", fontSize: "0.8rem", boxSizing: "border-box" }}
                  />
                </div>
              )}

              <div>
                <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.7rem", marginBottom: "0.2rem" }}>
                  {categoria === "MOEDA" ? "Valor em Reais (R$)" : categoria === "IMOBILIARIO_M2" ? "Preço por m² (R$)" : "Taxa / Porcentagem (%)"}
                </label>
                <input
                  type="text"
                  placeholder={categoria === "MOEDA" ? "Ex: 5,12" : "Ex: 15,00"}
                  value={valorAtual}
                  onChange={(e) => setValorAtual(e.target.value)}
                  style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", color: "#fff", padding: "0.45rem", borderRadius: "4px", fontSize: "0.8rem", boxSizing: "border-box" }}
                />
              </div>

              {categoria === "RENDA_FIXA" && (
                <div style={{ gridColumn: "span 2", display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".75rem" }}>
                  <div style={{ gridColumn: "span 2" }}>
                  <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.7rem", marginBottom: "0.2rem" }}>Regra de Rendimento / Indexador</label>
                  <input
                    type="text"
                    placeholder="Ex: 90% do CDI, 110% do CDI + IPCA"
                    value={indexadorBase}
                    onChange={(e) => setIndexadorBase(e.target.value)}
                    style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", color: "#fff", padding: "0.45rem", borderRadius: "4px", fontSize: "0.8rem", boxSizing: "border-box" }}
                  />
                  </div>
                  <div><label style={{ display: "block", color: "#a1a1aa", fontSize: "0.7rem", marginBottom: "0.2rem" }}>Tributação sobre o rendimento</label><select value={tributacaoTipo} onChange={(e) => setTributacaoTipo(e.target.value as typeof tributacaoTipo)} style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", color: "#fff", padding: "0.45rem", borderRadius: "4px" }}><option value="isento">Isento</option><option value="regressivo">IR regressivo de renda fixa</option><option value="fixo">Alíquota fixa</option></select></div>
                  {tributacaoTipo === "fixo" && <div><label style={{ display: "block", color: "#a1a1aa", fontSize: "0.7rem", marginBottom: "0.2rem" }}>Alíquota fixa (%)</label><input type="number" min="0" max="100" step="0.1" value={aliquotaFixa} onChange={(e) => setAliquotaFixa(Number(e.target.value))} style={{ width: "100%", boxSizing: "border-box", backgroundColor: "#18181b", border: "1px solid #27272a", color: "#fff", padding: "0.45rem", borderRadius: "4px" }}/></div>}
                  {tributacaoTipo === "regressivo" && <p style={{ gridColumn: "span 2", color: "#71717a", fontSize: ".68rem", margin: 0 }}>Padrão: 22,5% até 180 dias; 20% até 360; 17,5% até 720; 15% acima de 720. Incide somente sobre o rendimento.</p>}
                </div>
              )}
            </div>

            {/* SEÇÃO DA SÉRIE HISTÓRICA DE DATAS */}
            <div style={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "6px", padding: "0.85rem", marginBottom: "1rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                <div>
                  <h4 style={{ margin: 0, color: "#fff", fontSize: "0.85rem" }}>Série Histórica (Mês a Mês)</h4>
                  <p style={{ margin: 0, color: "#71717a", fontSize: "0.68rem" }}>Insira os valores dos meses desejados.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddLinhaHistorico}
                  style={{ backgroundColor: "#27272a", color: "#c5a059", border: "1px solid #3f3f46", padding: "0.25rem 0.5rem", borderRadius: "3px", cursor: "pointer", fontSize: "0.7rem", display: "flex", alignItems: "center", gap: "0.2rem" }}
                >
                  <PlusCircle style={{ width: "12px", height: "12px" }} /> Adicionar Mês
                </button>
              </div>

              {historicoEntradas.map((item, idx) => (
                <div key={idx} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "0.4rem", marginBottom: "0.4rem" }}>
                  <input
                    type="text"
                    placeholder="Ex: 2026-01 ou Jan/26"
                    value={item.mesAno}
                    onChange={(e) => handleHistoricoChange(idx, "mesAno", e.target.value)}
                    style={{ backgroundColor: "#121212", border: "1px solid #27272a", color: "#fff", padding: "0.35rem", borderRadius: "3px", fontSize: "0.75rem" }}
                  />
                  <input
                    type="number"
                    step="0.0001"
                    placeholder="Valor (R$ ou %)"
                    value={item.valor}
                    onChange={(e) => handleHistoricoChange(idx, "valor", parseFloat(e.target.value) || 0)}
                    style={{ backgroundColor: "#121212", border: "1px solid #27272a", color: "#fff", padding: "0.35rem", borderRadius: "3px", fontSize: "0.75rem" }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveLinhaHistorico(idx)}
                    style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer" }}
                  >
                    <X style={{ width: "14px", height: "14px" }} />
                  </button>
                </div>
              ))}

              <div style={{ marginTop: "0.75rem", backgroundColor: "#09090b", border: "1px solid #27272a", borderRadius: "4px", padding: "0.6rem", display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                <div>
                  <span style={{ color: "#71717a" }}>Média Calculada: </span>
                  <strong style={{ color: "#c5a059" }}>{calcularMedia12Meses().toFixed(2)}</strong>
                </div>
                <div>
                  <span style={{ color: "#71717a" }}>Variação Período: </span>
                  <strong style={{ color: calcularVariacaoTotal() > 0 ? "#22c55e" : "#a1a1aa" }}>{calcularVariacaoTotal().toFixed(2)}%</strong>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem" }}>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                style={{ backgroundColor: "transparent", border: "1px solid #27272a", color: "#a1a1aa", padding: "0.45rem 0.9rem", borderRadius: "4px", cursor: "pointer", fontSize: "0.8rem" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={loading}
                style={{ backgroundColor: "#c5a059", color: "#000", fontWeight: "bold", border: "none", padding: "0.45rem 1rem", borderRadius: "4px", cursor: "pointer", fontSize: "0.8rem" }}
              >
                Salvar Indicador
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
