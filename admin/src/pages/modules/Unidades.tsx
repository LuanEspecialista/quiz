import React, { useState, useEffect } from "react";
import { 
  Search, 
  Filter, 
  Layers, 
  Grid, 
  List, 
  RefreshCw,
  X,
  Car,
  Maximize2,
  Building,
  Calculator,
  ArrowRight,
  Edit2,
  Save,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Calendar
} from "lucide-react";
import { supabase } from "../../lib/supabase";

// ============================================================================
// HIGIENIZAÇÃO DO ANDAR (EVITA ERRO INTEGER NO POSTGRES / SUPABASE)
// ============================================================================
export const sanitizeAndar = (rawAndar: any, codigoUnidade: string): number | null => {
  if (typeof rawAndar === "number" && !isNaN(rawAndar)) return rawAndar;
  
  if (rawAndar !== null && rawAndar !== undefined) {
    const cleaned = String(rawAndar).replace(/\D/g, "");
    if (cleaned.length > 0) return parseInt(cleaned, 10);
  }

  // Regra fallback: Extrai andar pelo código da unidade (ex: 101 -> 1, 1010 -> 10)
  const cod = String(codigoUnidade || "").replace(/\D/g, "");
  if (cod.length === 3) {
    return parseInt(cod.substring(0, 1), 10);
  } else if (cod.length >= 4) {
    return parseInt(cod.substring(0, cod.length - 2), 10);
  }

  return null;
};

export function UnidadesModule({ onSimular, empreendimentoId, disponibilidadeInicial }: { onSimular?: (unidades: any[]) => void; empreendimentoId?: string; disponibilidadeInicial?: string }) {
  const [unidades, setUnidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Estado temporário para edição rápida
  const [editForm, setEditForm] = useState<any>({});

  // Seleção para Simulação Múltipla
  const [selectedUnits, setSelectedUnits] = useState<any[]>([]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [disponibilidade, setDisponibilidade] = useState(disponibilidadeInicial || "TODAS");
  const [tipologia, setTipologia] = useState("TODAS");
  const [vagasFiltro, setVagasFiltro] = useState("TODAS");
  
  // Valores monetários formatados
  const [entradaMaxRaw, setEntradaMaxRaw] = useState<string>("");
  const [valorTabelaMaxRaw, setValorTabelaMaxRaw] = useState<string>("");

  const [visibleCount, setVisibleCount] = useState(12);
  const empreendimentoNome = unidades[0]?.empreendimentos?.nome || null;

  useEffect(() => {
    fetchUnidades();
  }, [empreendimentoId]);

  // Atalho para fechar/cancelar edição ao pressionar a tecla ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && editingId !== null) {
        setEditingId(null);
        setEditForm({});
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingId]);

  const fetchUnidades = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("unidades")
        .select("*, empreendimentos(*, construtoras(nome))")
        .order("created_at", { ascending: false });

      if (empreendimentoId) {
        query = query.eq("empreendimento_id", empreendimentoId);
      }

      const { data, error } = await query;

      if (error) throw error;
      if (data) setUnidades(data);
    } catch (err) {
      console.error("Erro ao buscar unidades:", err);
    } finally {
      setLoading(false);
    }
  };

  // Helper para extração inteligente do andar para exibição em tela
  const getAndarExibicao = (u: any): string => {
    if (u.andar !== null && u.andar !== undefined && u.andar !== "") return String(u.andar);
    if (u.pavimento !== null && u.pavimento !== undefined && u.pavimento !== "") return String(u.pavimento);
    if (u.piso !== null && u.piso !== undefined && u.piso !== "") return String(u.piso);

    const cod = String(u.codigo_unidade || u.numero_unidade || u.unit_number || u.unidade || "").trim();
    if (!cod) return "—";

    const codNumerico = cod.replace(/\D/g, "");
    if (codNumerico.length === 3) return codNumerico.substring(0, 1);
    if (codNumerico.length >= 4) return codNumerico.substring(0, codNumerico.length - 2);

    return "—";
  };

  // Helper para buscar a Data de Entrega (com suporte a fallback de campos)
  const getDataEntregaExibicao = (u: any): string | null => {
    const emp = u.empreendimentos || {};
    return emp.data_entrega || emp.previsao_entrega || u.data_entrega || null;
  };

  // Alternador rápido de Status
  const toggleUnitStatus = async (unit: any, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const statusAtual = String(unit.status || "").toLowerCase();
    const isDisponivel = statusAtual === "disponivel" || statusAtual === "disponível" || unit.disponivel === true;
    const novoStatus = isDisponivel ? "Indisponivel" : "Disponivel";

    setUpdatingId(unit.id);

    try {
      const { error } = await supabase
        .from("unidades")
        .update({ status: novoStatus })
        .eq("id", unit.id);

      if (error) throw error;

      setUnidades((prev) =>
        prev.map((u) => (u.id === unit.id ? { ...u, status: novoStatus } : u))
      );
    } catch (err) {
      console.error("Erro ao alterar status da unidade:", err);
      alert("Não foi possível alterar o status da unidade.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Iniciar modo de edição
  const handleStartEdit = (unit: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(unit.id);

    const codigoUnidade = unit.codigo_unidade || unit.numero_unidade || unit.unidade || "";
    const andarCalculado = sanitizeAndar(unit.andar, codigoUnidade);

    setEditForm({
      codigo_unidade: codigoUnidade,
      vagas: unit.vagas ?? 1,
      area_privativa: unit.area_privativa || unit.area || "",
      valor_tabela: unit.valor_tabela || unit.preco || 0,
      entrada_sugerida: unit.entrada_sugerida || unit.entrada || 0,
      andar: andarCalculado !== null ? String(andarCalculado) : "",
      observacoes: unit.observacoes || unit.observacao || ""
    });
  };

  // Cancelar Edição Rápida
  const handleCancelEdit = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingId(null);
    setEditForm({});
  };

  // Salvar Edição Rápida
  const handleSaveEdit = async (unitId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setUpdatingId(unitId);

    try {
      // Higienização completa do andar via sanitizador
      const andarLimpo = sanitizeAndar(editForm.andar, editForm.codigo_unidade);

      const payload: any = {
        vagas: Number(editForm.vagas) || 0,
        area_privativa: Number(editForm.area_privativa) || 0,
        valor_tabela: Number(editForm.valor_tabela) || 0,
        entrada_sugerida: Number(editForm.entrada_sugerida) || 0,
        andar: andarLimpo,
        observacoes: editForm.observacoes || null
      };

      const { error } = await supabase
        .from("unidades")
        .update(payload)
        .eq("id", unitId);

      if (error) throw error;

      setUnidades((prev) =>
        prev.map((u) => (u.id === unitId ? { ...u, ...payload } : u))
      );
      setEditingId(null);
    } catch (err: any) {
      console.error("Erro ao salvar edições da unidade:", err);
      alert("Erro ao salvar alterações: " + (err.message || err));
    } finally {
      setUpdatingId(null);
    }
  };

  const formatCurrencyInput = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (!digits) return "";
    const number = parseFloat(digits) / 100;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(number);
  };

  const parseCurrencyValue = (formatted: string): number => {
    const digits = formatted.replace(/\D/g, "");
    if (!digits) return 0;
    return parseFloat(digits) / 100;
  };

  const getEntradaValor = (u: any): number => {
    return Number(u.entrada_sugerida || u.entrada || u.fluxo_dados?.ato || 0);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);
  };

  const toggleSelectUnit = (unit: any, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedUnits((prev) => {
      const exists = prev.find((u) => u.id === unit.id);
      if (exists) {
        return prev.filter((u) => u.id !== unit.id);
      } else {
        return [...prev, unit];
      }
    });
  };

  const handleSimularClick = (unidade?: any) => {
    const unidadesParaSimular = unidade ? [unidade] : selectedUnits;
    if (onSimular) {
      onSimular(unidadesParaSimular);
    } else {
      alert(`Iniciando simulação para ${unidadesParaSimular.length} unidade(s)!`);
    }
  };

  const filteredUnidades = unidades.filter((u) => {
    const empNome = u.empreendimentos?.nome || "";
    const constNome = u.empreendimentos?.construtoras?.nome || "";
    const cidadeNome = u.empreendimentos?.cidade || "";
    const codigo = String(u.codigo_unidade || u.numero_unidade || u.unit_number || u.unidade || u.sku || "");

    const matchesSearch = 
      codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      empNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      constNome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cidadeNome.toLowerCase().includes(searchTerm.toLowerCase());

    const statusClean = String(u.status || "").toLowerCase();
    const isDisp = statusClean === "disponivel" || statusClean === "disponível" || u.disponivel === true;
    const isIndisp = statusClean === "indisponivel" || statusClean === "indisponível" || statusClean === "reservada" || statusClean === "vendida" || statusClean === "bloqueada";

    let matchesDisp = true;
    if (disponibilidade === "DISPONIVEL") {
      matchesDisp = isDisp;
    } else if (disponibilidade === "RESERVADA") {
      matchesDisp = isIndisp;
    }

    const tipoStr = String(u.tipologia || "").toLowerCase();
    const qts = u.quarto_count !== null && u.quarto_count !== undefined ? Number(u.quarto_count) : null;

    let matchesTipo = false;
    if (tipologia === "TODAS") {
      matchesTipo = true;
    } else if (tipologia === "STUDIO") {
      matchesTipo = tipoStr.includes("studio") || tipoStr.includes("loft") || tipoStr.includes("integrada") || qts === 0;
    } else if (tipologia === "4+") {
      matchesTipo = (qts !== null && qts >= 4) || tipoStr.includes("4 quarto") || tipoStr.includes("cobertura");
    } else {
      matchesTipo = qts === Number(tipologia) || tipoStr.includes(`${tipologia} quarto`) || tipoStr.includes(`${tipologia} dormitório`);
    }

    const numVagas = u.vagas !== null && u.vagas !== undefined ? Number(u.vagas) : 1;
    let matchesVagas = true;
    if (vagasFiltro === "1") {
      matchesVagas = numVagas === 1;
    } else if (vagasFiltro === "2") {
      matchesVagas = numVagas === 2;
    } else if (vagasFiltro === "3+") {
      matchesVagas = numVagas >= 3;
    }

    const valEntrada = getEntradaValor(u);
    const maxEnt = parseCurrencyValue(entradaMaxRaw);
    const matchesEntrada = maxEnt === 0 || valEntrada <= maxEnt;

    const valTabela = Number(u.valor_tabela || u.preco || 0);
    const maxTab = parseCurrencyValue(valorTabelaMaxRaw);
    const matchesTabela = maxTab === 0 || valTabela <= maxTab;

    return matchesSearch && matchesDisp && matchesTipo && matchesVagas && matchesEntrada && matchesTabela;
  });

  const clearFilters = () => {
    setSearchTerm("");
    setDisponibilidade("TODAS");
    setTipologia("TODAS");
    setVagasFiltro("TODAS");
    setEntradaMaxRaw("");
    setValorTabelaMaxRaw("");
    setVisibleCount(12);
  };

  const visibleUnidades = filteredUnidades.slice(0, visibleCount);

  return (
    <div style={{ color: "#e4e4e7", fontFamily: "sans-serif", fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "1.25rem", position: "relative", paddingBottom: "5rem" }}>
      
      {/* HEADER DA SEÇÃO */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "1.3rem", fontWeight: "bold", color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Layers style={{ width: "20px", height: "20px", color: "#c5a059" }} /> {empreendimentoId ? `Unidades disponíveis${empreendimentoNome ? ` — ${empreendimentoNome}` : ""}` : "Gestão & Comparador de Unidades"}
          </h1>
          <p style={{ color: "#71717a", fontSize: "0.75rem", margin: "0.2rem 0 0 0" }}>
            Exibindo {visibleUnidades.length} de {filteredUnidades.length} unidades encontradas ({unidades.length} totais).
          </p>
          {empreendimentoId && <a href="/painel/?tab=unidades" style={{ color: "#c5a059", fontSize: "0.72rem", textDecoration: "none", display: "inline-block", marginTop: 5 }}>Ver unidades de todos os empreendimentos</a>}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <div style={{ backgroundColor: "#121212", border: "1px solid #27272a", borderRadius: "6px", display: "flex", padding: "0.2rem" }}>
            <button 
              onClick={() => setViewMode("list")}
              style={{ background: viewMode === "list" ? "#1f1f23" : "none", border: "none", color: viewMode === "list" ? "#c5a059" : "#71717a", padding: "0.3rem 0.5rem", borderRadius: "4px", cursor: "pointer" }}
            >
              <List style={{ width: "16px", height: "16px" }} />
            </button>
            <button 
              onClick={() => setViewMode("grid")}
              style={{ background: viewMode === "grid" ? "#1f1f23" : "none", border: "none", color: viewMode === "grid" ? "#c5a059" : "#71717a", padding: "0.3rem 0.5rem", borderRadius: "4px", cursor: "pointer" }}
            >
              <Grid style={{ width: "16px", height: "16px" }} />
            </button>
          </div>

          <button 
            onClick={fetchUnidades} 
            style={{ backgroundColor: "#18181b", border: "1px solid #27272a", color: "#a1a1aa", padding: "0.45rem 0.6rem", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}
          >
            <RefreshCw style={{ width: "14px", height: "14px" }} /> Atualizar
          </button>
        </div>
      </div>

      {/* PAINEL DE FILTROS */}
      <div style={{ backgroundColor: "#121212", border: "1px solid #1f1f23", borderRadius: "8px", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "0.7rem", fontWeight: "bold", color: "#c5a059", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <Filter style={{ width: "12px", height: "12px" }} /> Filtros Dinâmicos
          </span>
          
          {(searchTerm || disponibilidade !== "TODAS" || tipologia !== "TODAS" || vagasFiltro !== "TODAS" || entradaMaxRaw || valorTabelaMaxRaw) && (
            <button 
              onClick={clearFilters} 
              style={{ background: "none", border: "none", color: "#ef4444", fontSize: "0.7rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.2rem" }}
            >
              <X style={{ width: "12px", height: "12px" }} /> Limpar Filtros
            </button>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "0.75rem" }}>
          <div>
            <label style={{ fontSize: "0.7rem", color: "#71717a", display: "block", marginBottom: "0.25rem" }}>Empreendimento / Cidade / Código</label>
            <div style={{ position: "relative" }}>
              <Search style={{ width: "13px", height: "13px", position: "absolute", left: "0.6rem", top: "50%", transform: "translateY(-50%)", color: "#71717a" }} />
              <input 
                type="text" 
                placeholder="Ex: Zuri, Penha, 101..." 
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setVisibleCount(12); }}
                style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "4px", padding: "0.4rem 0.5rem 0.4rem 1.8rem", color: "#fff", fontSize: "0.75rem", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "0.7rem", color: "#71717a", display: "block", marginBottom: "0.25rem" }}>Disponibilidade</label>
            <select 
              value={disponibilidade} 
              onChange={(e) => { setDisponibilidade(e.target.value); setVisibleCount(12); }}
              style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "4px", padding: "0.4rem", color: "#fff", fontSize: "0.75rem" }}
            >
              <option value="TODAS">Todas as Unidades</option>
              <option value="DISPONIVEL">Apenas Disponíveis</option>
              <option value="RESERVADA">Indisponíveis / Reservadas</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "0.7rem", color: "#71717a", display: "block", marginBottom: "0.25rem" }}>Tipologia</label>
            <select 
              value={tipologia} 
              onChange={(e) => { setTipologia(e.target.value); setVisibleCount(12); }}
              style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "4px", padding: "0.4rem", color: "#fff", fontSize: "0.75rem" }}
            >
              <option value="TODAS">Todas as Tipologias</option>
              <option value="STUDIO">Studio / Loft</option>
              <option value="1">1 Quarto</option>
              <option value="2">2 Quartos</option>
              <option value="3">3 Quartos</option>
              <option value="4+">4+ Quartos / Cobertura</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "0.7rem", color: "#71717a", display: "block", marginBottom: "0.25rem" }}>Vagas de Garagem</label>
            <select 
              value={vagasFiltro} 
              onChange={(e) => { setVagasFiltro(e.target.value); setVisibleCount(12); }}
              style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "4px", padding: "0.4rem", color: "#fff", fontSize: "0.75rem" }}
            >
              <option value="TODAS">Qualquer Qtd Vagas</option>
              <option value="1">1 Vaga</option>
              <option value="2">2 Vagas</option>
              <option value="3+">3+ Vagas</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "0.7rem", color: "#71717a", display: "block", marginBottom: "0.25rem" }}>Entrada Até</label>
            <input 
              type="text" 
              placeholder="R$ 0,00" 
              value={entradaMaxRaw}
              onChange={(e) => {
                setEntradaMaxRaw(formatCurrencyInput(e.target.value));
                setVisibleCount(12);
              }}
              style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "4px", padding: "0.4rem", color: "#fff", fontSize: "0.75rem", boxSizing: "border-box" }}
            />
          </div>

          <div>
            <label style={{ fontSize: "0.7rem", color: "#71717a", display: "block", marginBottom: "0.25rem" }}>Valor Tabela Até</label>
            <input 
              type="text" 
              placeholder="R$ 0,00" 
              value={valorTabelaMaxRaw}
              onChange={(e) => {
                setValorTabelaMaxRaw(formatCurrencyInput(e.target.value));
                setVisibleCount(12);
              }}
              style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "4px", padding: "0.4rem", color: "#fff", fontSize: "0.75rem", boxSizing: "border-box" }}
            />
          </div>
        </div>
      </div>

      {/* LISTAGEM DE UNIDADES */}
      {loading ? (
        <div style={{ backgroundColor: "#121212", padding: "3rem", textAlign: "center", color: "#71717a" }}>Carregando unidades...</div>
      ) : filteredUnidades.length === 0 ? (
        <div style={{ backgroundColor: "#121212", padding: "3rem", textAlign: "center" }}>
          <p style={{ color: "#a1a1aa" }}>Nenhuma unidade encontrada com os filtros atuais.</p>
          <button onClick={clearFilters} style={{ background: "#18181b", border: "1px solid #27272a", color: "#c5a059", padding: "0.4rem 0.8rem", borderRadius: "4px", cursor: "pointer", marginTop: "0.5rem" }}>Limpar Filtros</button>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: viewMode === "grid" ? "repeat(auto-fill, minmax(280px, 1fr))" : "1fr", gap: "1rem" }}>
            {visibleUnidades.map((u) => {
              const isSelected = selectedUnits.some((s) => s.id === u.id);
              const isEditing = editingId === u.id;
              const isExpanded = expandedId === u.id;

              const entradaVal = getEntradaValor(u);
              const tabelaVal = Number(u.valor_tabela || u.preco || 0);
              const numUnidade = u.codigo_unidade || u.numero_unidade || u.unit_number || u.unidade || "S/N";
              const tipoExibicao = u.tipologia || (u.quarto_count === 0 ? "Studio" : `${u.quarto_count || "—"} Quartos`);
              
              const statusClean = String(u.status || "").toLowerCase();
              const isDisponivel = statusClean === "disponivel" || statusClean === "disponível" || u.disponivel === true;

              const emp = u.empreendimentos || {};
              const regrasCorrecao = emp.regras_correcao || u.regras_correcao || {};
              const fluxo = u.fluxo_dados || {};
              const dataEntrega = getDataEntregaExibicao(u);

              return (
                <div 
                  key={u.id} 
                  onClick={() => !isEditing && toggleSelectUnit(u)}
                  style={{ 
                    backgroundColor: "#121212", 
                    border: isSelected ? "2px solid #c5a059" : "1px solid #1f1f23", 
                    borderRadius: "8px", 
                    padding: "1rem", 
                    display: "flex", 
                    flexDirection: "column", 
                    justifyContent: "space-between",
                    cursor: isEditing ? "default" : "pointer",
                    position: "relative",
                    transition: "all 0.2s",
                    opacity: isDisponivel ? 1 : 0.65
                  }}
                >
                  {/* Topo do Card com Ações */}
                  <div style={{ position: "absolute", top: "0.75rem", right: "0.75rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    
                    {!isEditing ? (
                      <button
                        onClick={(e) => handleStartEdit(u, e)}
                        title="Editar rapidamente esta unidade"
                        style={{ background: "#18181b", border: "1px solid #27272a", color: "#a1a1aa", borderRadius: "4px", padding: "0.25rem 0.4rem", cursor: "pointer", display: "flex", alignItems: "center" }}
                      >
                        <Edit2 style={{ width: "12px", height: "12px" }} />
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: "0.3rem" }}>
                        <button
                          onClick={(e) => handleCancelEdit(e)}
                          title="Cancelar edição (ou aperte Esc)"
                          style={{ background: "#27272a", border: "none", color: "#a1a1aa", borderRadius: "4px", padding: "0.25rem 0.4rem", cursor: "pointer", fontSize: "0.68rem" }}
                        >
                          <X style={{ width: "12px", height: "12px" }} />
                        </button>
                        <button
                          onClick={(e) => handleSaveEdit(u.id, e)}
                          title="Salvar alterações"
                          style={{ background: "#c5a059", border: "none", color: "#000", borderRadius: "4px", padding: "0.25rem 0.5rem", cursor: "pointer", fontWeight: "bold", display: "flex", alignItems: "center", gap: "0.2rem", fontSize: "0.68rem" }}
                        >
                          <Save style={{ width: "12px", height: "12px" }} /> Salvar
                        </button>
                      </div>
                    )}

                    <div 
                      onClick={(e) => toggleUnitStatus(u, e)}
                      title={isDisponivel ? "Status: Disponível" : "Status: Indisponível"}
                      style={{
                        width: "32px",
                        height: "18px",
                        backgroundColor: isDisponivel ? "#22c55e" : "#ef4444",
                        borderRadius: "10px",
                        padding: "2px",
                        cursor: updatingId === u.id ? "wait" : "pointer",
                        display: "flex",
                        alignItems: "center"
                      }}
                    >
                      <div style={{
                        width: "14px",
                        height: "14px",
                        backgroundColor: "#fff",
                        borderRadius: "50%",
                        transform: isDisponivel ? "translateX(14px)" : "translateX(0px)",
                        transition: "transform 0.2s ease"
                      }} />
                    </div>

                    <input 
                      type="checkbox" 
                      checked={isSelected}
                      onChange={(e) => toggleSelectUnit(u, e as any)}
                      style={{ accentColor: "#c5a059", cursor: "pointer", width: "16px", height: "16px" }}
                    />
                  </div>

                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem", paddingRight: "5rem" }}>
                      <span style={{ fontSize: "0.7rem", color: "#c5a059", fontWeight: "bold" }}>
                        {emp.construtoras?.nome || "Construtora"}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <strong style={{ color: "#fff", fontSize: "1.05rem" }}>
                        Unidade {numUnidade}
                      </strong>
                      <span style={{ 
                        fontSize: "0.65rem", 
                        padding: "0.1rem 0.4rem", 
                        borderRadius: "4px", 
                        backgroundColor: isDisponivel ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                        color: isDisponivel ? "#22c55e" : "#ef4444",
                        border: `1px solid ${isDisponivel ? "rgba(34, 197, 94, 0.3)" : "rgba(239, 68, 68, 0.3)"}`
                      }}>
                        {isDisponivel ? "Disponível" : "Indisponível"}
                      </span>
                    </div>

                    {/* DADOS DO EMPREENDIMENTO COM DATA DE ENTREGA DISCRETA */}
                    <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.3rem", color: "#a1a1aa", fontSize: "0.78rem", marginBottom: "0.75rem", marginTop: "0.2rem" }}>
                      <span>{emp.nome || "Empreendimento sem nome"} {u.torre ? `• ${u.torre}` : ""} {emp.cidade ? `(${emp.cidade})` : ""}</span>
                      
                      {/* Exibição da Data de Entrega do Empreendimento */}
                      {dataEntrega && (
                        <span style={{ fontSize: "0.7rem", color: "#a1a1aa", backgroundColor: "#18181b", border: "1px solid #27272a", padding: "0.05rem 0.35rem", borderRadius: "3px", display: "inline-flex", alignItems: "center", gap: "0.2rem", marginLeft: "0.2rem" }}>
                          <Calendar style={{ width: "10px", height: "10px", color: "#c5a059" }} />
                          {dataEntrega}
                        </span>
                      )}
                    </div>

                    {/* MODO DE EDIÇÃO RÁPIDA */}
                    {isEditing ? (
                      <div style={{ backgroundColor: "#18181b", padding: "0.6rem", borderRadius: "6px", display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem", border: "1px dashed #c5a059" }}>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
                          <div>
                            <label style={{ fontSize: "0.62rem", color: "#a1a1aa" }}>Vagas:</label>
                            <input 
                              type="number" 
                              value={editForm.vagas} 
                              onChange={(e) => setEditForm({ ...editForm, vagas: e.target.value })}
                              style={{ width: "100%", backgroundColor: "#121212", border: "1px solid #27272a", color: "#fff", padding: "0.2rem 0.4rem", borderRadius: "4px", fontSize: "0.72rem" }} 
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: "0.62rem", color: "#a1a1aa" }}>Área Priv. (m²):</label>
                            <input 
                              type="number" 
                              value={editForm.area_privativa} 
                              onChange={(e) => setEditForm({ ...editForm, area_privativa: e.target.value })}
                              style={{ width: "100%", backgroundColor: "#121212", border: "1px solid #27272a", color: "#fff", padding: "0.2rem 0.4rem", borderRadius: "4px", fontSize: "0.72rem" }} 
                            />
                          </div>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.4rem" }}>
                          <div>
                            <label style={{ fontSize: "0.62rem", color: "#a1a1aa" }}>Andar (Número):</label>
                            <input 
                              type="number" 
                              placeholder="Ex: 6"
                              value={editForm.andar} 
                              onChange={(e) => setEditForm({ ...editForm, andar: e.target.value })}
                              style={{ width: "100%", backgroundColor: "#121212", border: "1px solid #27272a", color: "#fff", padding: "0.2rem 0.4rem", borderRadius: "4px", fontSize: "0.72rem" }} 
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: "0.62rem", color: "#a1a1aa" }}>Valor Tabela:</label>
                            <input 
                              type="number" 
                              value={editForm.valor_tabela} 
                              onChange={(e) => setEditForm({ ...editForm, valor_tabela: e.target.value })}
                              style={{ width: "100%", backgroundColor: "#121212", border: "1px solid #27272a", color: "#fff", padding: "0.2rem 0.4rem", borderRadius: "4px", fontSize: "0.72rem" }} 
                            />
                          </div>
                        </div>

                        <div>
                          <label style={{ fontSize: "0.62rem", color: "#a1a1aa" }}>Anotações / Diferenciais:</label>
                          <input 
                            type="text" 
                            placeholder="Ex: Vagas cobertas, Lazer no rooftop..." 
                            value={editForm.observacoes} 
                            onChange={(e) => setEditForm({ ...editForm, observacoes: e.target.value })}
                            style={{ width: "100%", backgroundColor: "#121212", border: "1px solid #27272a", color: "#fff", padding: "0.2rem 0.4rem", borderRadius: "4px", fontSize: "0.72rem" }} 
                          />
                        </div>
                      </div>
                    ) : (
                      /* EXIBIÇÃO PADRÃO */
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", backgroundColor: "#18181b", padding: "0.6rem", borderRadius: "6px", fontSize: "0.72rem", color: "#a1a1aa", marginBottom: "0.75rem" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <Maximize2 style={{ width: "12px", height: "12px", color: "#c5a059" }} />
                          <span>Área: <strong style={{ color: "#fff" }}>{u.area_privativa || u.area || "—"} m²</strong></span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <Building style={{ width: "12px", height: "12px", color: "#c5a059" }} />
                          <span>Tipo: <strong style={{ color: "#fff" }}>{tipoExibicao}</strong></span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                          <Car style={{ width: "12px", height: "12px", color: "#c5a059" }} />
                          <span>Vagas: <strong style={{ color: "#fff" }}>{u.vagas ?? 1} privativa(s)</strong></span>
                        </div>
                        <div>
                          <span>Andar: <strong style={{ color: "#fff" }}>{getAndarExibicao(u)}</strong></span>
                        </div>
                      </div>
                    )}

                    {/* BADGES DE CORREÇÃO MONETÁRIA */}
                    {(regrasCorrecao.indice_pre_chaves || regrasCorrecao.indice_pos_chaves) && !isEditing && (
                      <div style={{ backgroundColor: "rgba(39, 39, 42, 0.6)", border: "1px solid #27272a", borderRadius: "4px", padding: "0.4rem", fontSize: "0.68rem", color: "#d4d4d8", marginBottom: "0.75rem", display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "center" }}>
                        <ShieldAlert style={{ width: "12px", height: "12px", color: "#c5a059" }} />
                        {regrasCorrecao.indice_pre_chaves && (
                          <span>Pré: <strong style={{ color: "#fff" }}>{regrasCorrecao.indice_pre_chaves}</strong></span>
                        )}
                        {regrasCorrecao.indice_pos_chaves && (
                          <span>• Pós: <strong style={{ color: "#fff" }}>{regrasCorrecao.indice_pos_chaves}</strong> {regrasCorrecao.juros_pos_chaves_am ? `+ ${regrasCorrecao.juros_pos_chaves_am}% a.m.` : ""}</span>
                        )}
                      </div>
                    )}

                    <div style={{ borderTop: "1px dashed #27272a", paddingTop: "0.5rem", display: "flex", justifyContent: "space-between", fontSize: "0.75rem" }}>
                      <div>
                        <span style={{ color: "#71717a", display: "block", fontSize: "0.65rem" }}>Entrada (Ato):</span>
                        <strong style={{ color: "#c5a059", fontSize: "0.85rem" }}>{formatCurrency(entradaVal)}</strong>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ color: "#71717a", display: "block", fontSize: "0.65rem" }}>Valor Tabela:</span>
                        <strong style={{ color: "#fff", fontSize: "0.85rem" }}>{formatCurrency(tabelaVal)}</strong>
                      </div>
                    </div>

                    {/* EXPANSÃO COM FLUXO DETALHADO */}
                    {isExpanded && (
                      <div style={{ marginTop: "0.75rem", borderTop: "1px solid #27272a", paddingTop: "0.5rem", fontSize: "0.7rem", color: "#a1a1aa", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                        {emp.cidade && <div><strong>Cidade / Localização:</strong> {emp.cidade} {emp.bairro ? `- ${emp.bairro}` : ""}</div>}
                        <div><strong>Lazer / Infraestrutura:</strong> {emp.lazer || emp.descricao || "Área de lazer completa."}</div>
                        
                        {regrasCorrecao.descricao_reajuste_extenso && (
                          <div style={{ color: "#c5a059", fontSize: "0.68rem", backgroundColor: "rgba(197, 160, 89, 0.05)", padding: "0.3rem", borderRadius: "4px" }}>
                            <strong>Regra de Reajuste:</strong> {regrasCorrecao.descricao_reajuste_extenso}
                          </div>
                        )}

                        {fluxo && Object.keys(fluxo).length > 0 && (
                          <div style={{ backgroundColor: "#18181b", padding: "0.5rem", borderRadius: "4px", fontSize: "0.68rem" }}>
                            <strong style={{ color: "#fff", display: "block", marginBottom: "0.2rem" }}>Detalhamento do Fluxo:</strong>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.2rem", color: "#a1a1aa" }}>
                              {fluxo.mensais_obra_qtd > 0 && <span>• {fluxo.mensais_obra_qtd}x Mensais Obra: <strong style={{ color: "#fff" }}>{formatCurrency(fluxo.mensais_obra_val)}</strong></span>}
                              {fluxo.baloes_obra_qtd > 0 && <span>• {fluxo.baloes_obra_qtd}x Balões Obra: <strong style={{ color: "#fff" }}>{formatCurrency(fluxo.baloes_obra_val)}</strong></span>}
                              {fluxo.chaves > 0 && <span>• Chaves / Financiamento: <strong style={{ color: "#fff" }}>{formatCurrency(fluxo.chaves)}</strong></span>}
                              {fluxo.mensais_pos_qtd > 0 && <span>• {fluxo.mensais_pos_qtd}x Mensais Pós: <strong style={{ color: "#fff" }}>{formatCurrency(fluxo.mensais_pos_val)}</strong></span>}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginTop: "0.85rem" }}>
                    <button 
                      onClick={(e) => { e.stopPropagation(); setExpandedId(isExpanded ? null : u.id); }}
                      style={{ background: "none", border: "none", color: "#71717a", fontSize: "0.68rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.2rem" }}
                    >
                      {isExpanded ? <ChevronUp style={{ width: "12px", height: "12px" }} /> : <ChevronDown style={{ width: "12px", height: "12px" }} />}
                      {isExpanded ? "Ocultar Detalhes" : "Ver + Detalhes & Fluxo"}
                    </button>

                    <button 
                      onClick={(e) => { e.stopPropagation(); handleSimularClick(u); }}
                      style={{ backgroundColor: "#18181b", border: "1px solid #27272a", color: "#e4e4e7", padding: "0.5rem", borderRadius: "4px", fontSize: "0.72rem", cursor: "pointer", width: "100%", fontWeight: "bold" }}
                    >
                      Simular esta Unidade
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {visibleCount < filteredUnidades.length && (
            <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
              <button 
                onClick={() => setVisibleCount((prev) => prev + 12)} 
                style={{ backgroundColor: "#18181b", border: "1px solid #27272a", color: "#c5a059", padding: "0.6rem 1.2rem", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}
              >
                Carregar Mais Unidades ({filteredUnidades.length - visibleCount} restantes)
              </button>
            </div>
          )}
        </>
      )}

      {/* FAB FLUTUANTE DE SIMULAÇÃO */}
      {selectedUnits.length > 0 && (
        <div style={{
          position: "fixed",
          bottom: "2rem",
          right: "2rem",
          backgroundColor: "#c5a059",
          color: "#000",
          borderRadius: "30px",
          padding: "0.8rem 1.5rem",
          boxShadow: "0 10px 25px rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          zIndex: 9999
        }}>
          <div style={{ fontSize: "0.85rem", fontWeight: "bold" }}>
            {selectedUnits.length} unidade(s) selecionada(s)
          </div>

          <button 
            onClick={() => handleSimularClick()}
            style={{
              backgroundColor: "#000",
              color: "#fff",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: "20px",
              fontWeight: "bold",
              fontSize: "0.8rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem"
            }}
          >
            <Calculator style={{ width: "16px", height: "16px" }} />
            Ir para Fluxo Financeiro
            <ArrowRight style={{ width: "14px", height: "14px" }} />
          </button>
        </div>
      )}

    </div>
  );
}
