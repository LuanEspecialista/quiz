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
  Calendar,
  Plus
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import { analyzeFlow, getCommercialFlowProfile, monthsUntilDelivery } from "../../lib/flowCompatibility";
import { parseStandardTypology } from "../../lib/realEstateStandard";
import CurrencyInput from "../../components/CurrencyInput";

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

type TipologiaInfo = { key: string; label: string; quartos: number; suites: number; dormitorios: number; studio: boolean };

const parseTipologia = (unit: any): TipologiaInfo => {
  const fallback = Number(unit.dormitorios ?? unit.quarto_count ?? unit.quartos ?? 0);
  return parseStandardTypology(unit.tipologia_dados?.original || unit.tipologia, Number.isFinite(fallback) ? fallback : 0);
};

type InitialSmartFilters = { entrada: number; balao: number; parcela: number; cidade: string; dormitorios: number; incluirCompactos: boolean; prazoMeses: number };
const initialMoney = (value?: number) => value ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value) : "";
function MoneyRangeFilter({ label, minRaw, maxRaw, onMinChange, onMaxChange }: { label: string; minRaw: string; maxRaw: string; onMinChange: (value: string) => void; onMaxChange: (value: string) => void }) {
  const normalizeInput = (value: string) => value.replace(/\D/g, "") ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(value.replace(/\D/g, "")) / 100) : "";
  const inputStyle: React.CSSProperties = { width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "4px", padding: "0.4rem", color: "#fff", fontSize: "0.75rem", boxSizing: "border-box" };
  return <div style={{ display: "grid", gap: 6 }}>
    <label style={{ fontSize: "0.7rem", color: "#71717a" }}>{label}</label>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
      <input type="text" inputMode="numeric" placeholder="De" value={minRaw} onChange={(event) => onMinChange(normalizeInput(event.target.value))} style={inputStyle} />
      <input type="text" inputMode="numeric" placeholder="Até" value={maxRaw} onChange={(event) => onMaxChange(normalizeInput(event.target.value))} style={inputStyle} />
    </div>
    <small style={{ color: "#52525b", fontSize: "0.62rem" }}>Digite os limites exatos em reais. Deixe vazio quando não quiser limitar.</small>
  </div>;
}

export function UnidadesModule({ onSimular, empreendimentoId, disponibilidadeInicial, tipologiaInicial, filtrosIniciais }: { onSimular?: (unidades: any[]) => void; empreendimentoId?: string; disponibilidadeInicial?: string; tipologiaInicial?: string; filtrosIniciais?: InitialSmartFilters }) {
  const [unidades, setUnidades] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [ordenacao, setOrdenacao] = useState<"compatibilidade" | "recente" | "preco_crescente" | "preco_decrescente" | "area_decrescente" | "nome">("compatibilidade");
  const [filtrosAvancados, setFiltrosAvancados] = useState(false);
  const [fluxosSelecionados, setFluxosSelecionados] = useState<string[]>([]);
  const [newUnitOpen, setNewUnitOpen] = useState(false);
  const [newUnitSaving, setNewUnitSaving] = useState(false);
  const [newUnitError, setNewUnitError] = useState("");
  const [enterpriseOptions, setEnterpriseOptions] = useState<Array<{ id: string; nome: string }>>([]);
  const [newUnitForm, setNewUnitForm] = useState<any>({ empreendimento_id: empreendimentoId || "", numero: "", torre: "", andar: "", tipologia: "", dormitorios: 0, suites: 0, vagas: 0, area_privativa: "", valor_tabela: 0, entrada_sugerida: 0, status: "disponivel", vista: "", observacoes: "" });

  // Estado temporário para edição rápida
  const [editForm, setEditForm] = useState<any>({});

  // Seleção para Simulação Múltipla
  const [selectedUnits, setSelectedUnits] = useState<any[]>([]);

  // Filtros
  const [searchTerm, setSearchTerm] = useState(filtrosIniciais?.cidade || "");
  // O padrão comercial é ver disponibilidade; ele não abre o estoque até haver pesquisa.
  const [disponibilidade, setDisponibilidade] = useState(disponibilidadeInicial || "DISPONIVEL");
  const [tipologia, setTipologia] = useState(tipologiaInicial || (filtrosIniciais?.dormitorios ? `DORM:${filtrosIniciais.dormitorios}` : "TODAS"));
  const [suitesMinimas, setSuitesMinimas] = useState("0");
  const [composicaoExata, setComposicaoExata] = useState(false);
  const [vagasFiltro, setVagasFiltro] = useState("TODAS");
  const [incluirCompactos, setIncluirCompactos] = useState(Boolean(filtrosIniciais?.incluirCompactos));
  
  // Valores monetários formatados
  const [entradaMinRaw, setEntradaMinRaw] = useState<string>("");
  const [entradaMaxRaw, setEntradaMaxRaw] = useState<string>(initialMoney(filtrosIniciais?.entrada));
  const [balaoMinRaw, setBalaoMinRaw] = useState<string>("");
  const [balaoMaxRaw, setBalaoMaxRaw] = useState<string>(initialMoney(filtrosIniciais?.balao));
  const [parcelaMinRaw, setParcelaMinRaw] = useState<string>("");
  const [parcelaMaxRaw, setParcelaMaxRaw] = useState<string>(initialMoney(filtrosIniciais?.parcela));
  const [valorTabelaMinRaw, setValorTabelaMinRaw] = useState<string>("");
  const [valorTabelaMaxRaw, setValorTabelaMaxRaw] = useState<string>("");
  const [prazoMeses, setPrazoMeses] = useState<number>(filtrosIniciais?.prazoMeses || 0);

  const [visibleCount, setVisibleCount] = useState(12);
  const empreendimentoNome = unidades[0]?.empreendimentos?.nome || null;

  useEffect(() => {
    fetchUnidades();
  }, [empreendimentoId]);

  // ESC cancela a edição; fora dela, encerra a seleção e limpa a busca.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (newUnitOpen) {
        setNewUnitOpen(false);
        return;
      }
      if (editingId !== null) {
        setEditingId(null);
        setEditForm({});
        return;
      }
      setSearchTerm("");
      setDisponibilidade(disponibilidadeInicial || "DISPONIVEL");
      setTipologia("TODAS");
      setSuitesMinimas("0");
      setComposicaoExata(false);
      setIncluirCompactos(false);
      setVagasFiltro("TODAS");
      setFluxosSelecionados([]);
      setEntradaMinRaw(""); setEntradaMaxRaw("");
      setParcelaMinRaw(""); setParcelaMaxRaw("");
      setBalaoMinRaw(""); setBalaoMaxRaw("");
      setValorTabelaMinRaw("");
      setValorTabelaMaxRaw("");
      setPrazoMeses(0);
      setSelectedUnits([]);
      setExpandedId(null);
      setVisibleCount(12);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editingId, newUnitOpen, disponibilidadeInicial]);

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

      const [{ data, error }, enterprises] = await Promise.all([
        query,
        supabase.from("empreendimentos").select("id,nome").order("nome"),
      ]);

      if (error) throw error;
      if (data) setUnidades(data);
      if (!enterprises.error) setEnterpriseOptions((enterprises.data || []) as Array<{ id: string; nome: string }>);
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

  const openNewUnit = () => {
    setNewUnitError("");
    setNewUnitForm({ empreendimento_id: empreendimentoId || enterpriseOptions[0]?.id || "", numero: "", torre: "", andar: "", tipologia: "", dormitorios: 0, suites: 0, vagas: 0, area_privativa: "", valor_tabela: 0, entrada_sugerida: 0, status: "disponivel", vista: "", observacoes: "" });
    setNewUnitOpen(true);
  };

  const saveNewUnit = async () => {
    const numero = String(newUnitForm.numero || "").trim();
    const empreendimento = String(newUnitForm.empreendimento_id || "").trim();
    const valor = Number(newUnitForm.valor_tabela || 0);
    if (!empreendimento || !numero || valor <= 0) {
      setNewUnitError("Informe empreendimento, identificação da unidade e valor de tabela maior que zero.");
      return;
    }
    const duplicate = unidades.some((item) => String(item.empreendimento_id || "") === empreendimento && String(item.numero || item.numero_unidade || item.codigo_unidade || "").trim().toLowerCase() === numero.toLowerCase());
    if (duplicate) {
      setNewUnitError("Já existe uma unidade com esta identificação neste empreendimento. Edite a existente para evitar duplicidade.");
      return;
    }
    setNewUnitSaving(true); setNewUnitError("");
    const payload = {
      empreendimento_id: empreendimento,
      numero,
      numero_unidade: numero,
      codigo_unidade: numero,
      torre: String(newUnitForm.torre || "").trim() || null,
      andar: sanitizeAndar(newUnitForm.andar, numero),
      tipologia: String(newUnitForm.tipologia || "").trim() || null,
      dormitorios: Math.max(0, Number(newUnitForm.dormitorios) || 0),
      quartos: Math.max(0, Number(newUnitForm.dormitorios) || 0),
      suites: Math.max(0, Number(newUnitForm.suites) || 0),
      vagas: Math.max(0, Number(newUnitForm.vagas) || 0),
      area_privativa: Number(newUnitForm.area_privativa) || null,
      valor_tabela: valor,
      entrada_sugerida: Number(newUnitForm.entrada_sugerida) || 0,
      status: newUnitForm.status || "disponivel",
      vista: String(newUnitForm.vista || "").trim() || null,
      observacoes: String(newUnitForm.observacoes || "").trim() || null,
      tipologia_dados: { origem: "manual", dormitorios: Math.max(0, Number(newUnitForm.dormitorios) || 0), suites: Math.max(0, Number(newUnitForm.suites) || 0), nome_original: String(newUnitForm.tipologia || "").trim() || null },
      fluxo_dados: { ato: Number(newUnitForm.entrada_sugerida) || 0, origem: "cadastro_manual" },
    };
    const { error } = await supabase.from("unidades").insert(payload);
    setNewUnitSaving(false);
    if (error) { setNewUnitError(error.message); return; }
    setNewUnitOpen(false);
    await fetchUnidades();
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

  const filtrarUnidades = (aceitarCompactos: boolean) => unidades.filter((u) => {
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

    const tipoInfo = parseTipologia(u);

    let matchesTipo = false;
    if (tipologia === "TODAS") {
      matchesTipo = true;
    } else if (tipologia === "STUDIO") {
      matchesTipo = tipoInfo.studio;
    } else if (tipologia.startsWith("DORM:")) {
      const dormitoriosDesejados = Number(tipologia.split(":")[1]);
      matchesTipo = composicaoExata ? tipoInfo.dormitorios === dormitoriosDesejados : tipoInfo.dormitorios >= dormitoriosDesejados;
    } else {
      matchesTipo = true;
    }
    if (!matchesTipo && aceitarCompactos && tipoInfo.studio) matchesTipo = true;
    const suitesDesejadas = Number(suitesMinimas);
    matchesTipo = matchesTipo && (suitesDesejadas === 0 || (composicaoExata ? tipoInfo.suites === suitesDesejadas : tipoInfo.suites >= suitesDesejadas));

    const numVagas = u.vagas !== null && u.vagas !== undefined ? Number(u.vagas) : 1;
    let matchesVagas = true;
    if (vagasFiltro === "1") {
      matchesVagas = numVagas === 1;
    } else if (vagasFiltro === "2") {
      matchesVagas = numVagas === 2;
    } else if (vagasFiltro === "3+") {
      matchesVagas = numVagas >= 3;
    }

    const limits = { entrada: parseCurrencyValue(entradaMaxRaw), parcela: parseCurrencyValue(parcelaMaxRaw), balao: parseCurrencyValue(balaoMaxRaw) };
    const hasFinancialLimits = limits.entrada > 0 || limits.parcela > 0 || limits.balao > 0;
    // Com limites financeiros informados, o estoque normal só pode mostrar o que
    // realmente fecha. Uma proposta a validar não é compatibilidade e nunca pode
    // aparecer misturada ao resultado que será apresentado ao cliente.
    const flowResult = hasFinancialLimits ? analyzeFlow(u, limits) : null;
    const matchesFinancial = !flowResult || flowResult.status === "compativel";
    const flowProfile = getCommercialFlowProfile(u)?.label || null;
    const matchesFlowProfile = fluxosSelecionados.length === 0 || (flowProfile !== null && fluxosSelecionados.includes(flowProfile));

    const emp = u.empreendimentos || {};
    const mesesAteEntrega = monthsUntilDelivery(emp.entrega || emp.previsao_entrega || emp.data_entrega || u.data_entrega || u.data_entrega_unidade);
    const matchesPrazo = prazoMeses === 0 || (mesesAteEntrega > 0 && mesesAteEntrega <= prazoMeses);

    const valTabela = Number(u.valor_tabela || u.preco || 0);
    const minTab = parseCurrencyValue(valorTabelaMinRaw);
    const maxTab = parseCurrencyValue(valorTabelaMaxRaw);
    const matchesTabela = 
      (minTab === 0 || valTabela >= minTab) && 
      (maxTab === 0 || valTabela <= maxTab);

    return matchesSearch && matchesDisp && matchesTipo && matchesVagas && matchesFinancial && matchesFlowProfile && matchesTabela && matchesPrazo;
  });

  const unidadesCompativeis = filtrarUnidades(false);
  const usandoCompactosComoAlternativa = unidadesCompativeis.length === 0 && incluirCompactos && tipologia === "TODAS";
  const filteredUnidades = [...(usandoCompactosComoAlternativa ? filtrarUnidades(true) : unidadesCompativeis)].sort((a, b) => {
    const limits={entrada:parseCurrencyValue(entradaMaxRaw),parcela:parseCurrencyValue(parcelaMaxRaw),balao:parseCurrencyValue(balaoMaxRaw)};
    const hasCapacity=limits.entrada>0||limits.parcela>0||limits.balao>0;
    const financialRank=(unit:any)=>{if(!hasCapacity)return 0;const result=analyzeFlow(unit,limits);return result.status==="compativel"?0:result.status==="proposta"?1:2};
    const priceOf=(unit:any)=>Number(unit.valor_tabela||unit.preco||0);
    const areaOf=(unit:any)=>Number(unit.area_privativa||unit.area||0);
    const tableDateOf=(unit:any)=>new Date(unit.tabela_atualizada_em||unit.updated_at||unit.created_at||0).getTime()||0;
    if(ordenacao==="preco_crescente")return priceOf(a)-priceOf(b);
    if(ordenacao==="preco_decrescente")return priceOf(b)-priceOf(a);
    if(ordenacao==="area_decrescente")return areaOf(b)-areaOf(a) || priceOf(a)-priceOf(b);
    if(ordenacao==="recente")return tableDateOf(b)-tableDateOf(a);
    if(ordenacao==="nome")return `${a.empreendimentos?.nome||""} ${a.codigo_unidade||a.numero_unidade||""}`.localeCompare(`${b.empreendimentos?.nome||""} ${b.codigo_unidade||b.numero_unidade||""}`,"pt-BR");
    const rankDifference=financialRank(a)-financialRank(b);
    if(rankDifference)return rankDifference;
    if (!prazoMeses) return Number(a.valor_tabela||a.preco||0)-Number(b.valor_tabela||b.preco||0);
    const monthsFor = (unit: any) => {
      const enterprise = unit.empreendimentos || {};
      return monthsUntilDelivery(enterprise.entrega || enterprise.previsao_entrega || enterprise.data_entrega || unit.data_entrega || unit.data_entrega_unidade);
    };
    const aMonths = monthsFor(a);
    const bMonths = monthsFor(b);
    const aNearby = aMonths > prazoMeses ? 1 : 0;
    const bNearby = bMonths > prazoMeses ? 1 : 0;
    return aNearby - bNearby || aMonths - bMonths;
  });
  // O estoque não é uma vitrine aberta: só aparece quando a pessoa informa ao
  // menos um critério de busca. Isso reduz ruído e protege a informação comercial.
  const hasActiveSearch = Boolean(
    searchTerm.trim() ||
    tipologia !== "TODAS" ||
    suitesMinimas !== "0" ||
    composicaoExata ||
    incluirCompactos ||
    vagasFiltro !== "TODAS" ||
    fluxosSelecionados.length > 0 ||
    entradaMinRaw || entradaMaxRaw || parcelaMinRaw || parcelaMaxRaw ||
    balaoMinRaw || balaoMaxRaw || valorTabelaMinRaw || valorTabelaMaxRaw ||
    prazoMeses > 0
  );

  const clearFilters = () => {
    setSearchTerm("");
    setDisponibilidade(disponibilidadeInicial || "DISPONIVEL");
    setTipologia("TODAS");
    setSuitesMinimas("0");
    setComposicaoExata(false);
    setIncluirCompactos(false);
    setVagasFiltro("TODAS");
    setFluxosSelecionados([]);
    setEntradaMinRaw(""); setEntradaMaxRaw("");
    setParcelaMinRaw(""); setParcelaMaxRaw("");
    setBalaoMinRaw(""); setBalaoMaxRaw("");
    setValorTabelaMinRaw("");
    setValorTabelaMaxRaw("");
    setPrazoMeses(0);
    setSelectedUnits([]);
    setExpandedId(null);
    setVisibleCount(12);
  };

  const visibleUnidades = filteredUnidades.slice(0, visibleCount);
  const flowProfilesDisponiveis = Array.from(new Set(unidades.map((unit) => getCommercialFlowProfile(unit)?.label).filter(Boolean) as string[]))
    .sort((a, b) => Number(a.split("/")[0]) - Number(b.split("/")[0]));
  return (
    <div style={{ color: "#e4e4e7", fontFamily: "sans-serif", fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "1.25rem", position: "relative", paddingBottom: "5rem" }}>
      
      {/* HEADER DA SEÇÃO */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: "1.3rem", fontWeight: "bold", color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Layers style={{ width: "20px", height: "20px", color: "#c5a059" }} /> {empreendimentoId ? `Unidades disponíveis${empreendimentoNome ? ` — ${empreendimentoNome}` : ""}` : "Gestão & Comparador de Unidades"}
          </h1>
          <p style={{ color: "#71717a", fontSize: "0.75rem", margin: "0.2rem 0 0 0" }}>
            {hasActiveSearch
              ? `Exibindo ${visibleUnidades.length} de ${filteredUnidades.length} unidades encontradas.`
              : "Informe ao menos um critério para consultar o estoque disponível."}
          </p>
          {usandoCompactosComoAlternativa && <p style={{ color: "#d7ab63", fontSize: "0.72rem", margin: "0.3rem 0 0" }}>Nenhuma unidade atendeu à composição solicitada. Exibindo Studio/Loft como alternativa.</p>}
          {empreendimentoId && <a href="/painel/?tab=unidades" style={{ color: "#c5a059", fontSize: "0.72rem", textDecoration: "none", display: "inline-block", marginTop: 5 }}>Ver unidades de todos os empreendimentos</a>}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button onClick={openNewUnit} style={{ background: "#c5a059", border: "1px solid #e0bb73", color: "#111", padding: "0.45rem 0.65rem", borderRadius: "6px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontWeight: 700 }}><Plus size={14} /> Nova unidade</button>
          <label style={{ display: "flex", alignItems: "center", gap: 6, color: "#a1a1aa", fontSize: "0.72rem" }}>
            Ordenar
            <select
              value={ordenacao}
              onChange={(event) => { setOrdenacao(event.target.value as typeof ordenacao); setVisibleCount(12); }}
              aria-label="Ordenar unidades"
              style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 6, color: "#e4e4e7", padding: "0.42rem 0.55rem", fontSize: "0.72rem", cursor: "pointer" }}
            >
              <option value="compatibilidade">Mais compatíveis</option>
              <option value="recente">Tabela mais recente</option>
              <option value="preco_crescente">Menor valor</option>
              <option value="preco_decrescente">Maior valor</option>
              <option value="area_decrescente">Maior área</option>
              <option value="nome">Nome (A-Z)</option>
            </select>
          </label>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <span style={{ fontSize: "0.7rem", fontWeight: "bold", color: "#c5a059", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "0.3rem" }}>
            <Filter style={{ width: "12px", height: "12px" }} /> Filtros Dinâmicos
          </span>
          
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ color: "#22c55e", fontSize: "0.68rem" }}>Busca automática</span>
          <button type="button" onClick={() => setFiltrosAvancados((value) => !value)} style={{ background: "#18181b", border: "1px solid #3f3f46", color: "#d4d4d8", borderRadius: 5, padding: "0.3rem 0.5rem", cursor: "pointer", fontSize: "0.68rem", display: "inline-flex", alignItems: "center", gap: 4 }}>
            {filtrosAvancados ? <ChevronUp size={13} /> : <ChevronDown size={13} />} {filtrosAvancados ? "Ocultar avançados" : "Mais filtros"}
          </button>
          {hasActiveSearch && (
            <button 
              onClick={clearFilters} 
              style={{ background: "none", border: "none", color: "#ef4444", fontSize: "0.7rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.2rem" }}
            >
              <X style={{ width: "12px", height: "12px" }} /> Limpar Filtros
            </button>
          )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: "0.65rem", alignItems: "end" }}>
          {/* Busca curta: o campo também encontra empreendimento e cidade. */}
          <div>
            <label style={{ fontSize: "0.7rem", color: "#71717a", display: "block", marginBottom: "0.25rem" }}>Código</label>
            <div style={{ position: "relative" }}>
              <Search style={{ width: "13px", height: "13px", position: "absolute", left: "0.6rem", top: "50%", transform: "translateY(-50%)", color: "#71717a" }} />
              <input 
                type="text" 
                placeholder="Ex.: 101"
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
            <label style={{ fontSize: "0.7rem", color: "#71717a", display: "block", marginBottom: "0.25rem" }}>Dormitórios</label>
            <select 
              value={tipologia} 
              onChange={(e) => { const value = e.target.value; setTipologia(value); if (value !== "TODAS") setIncluirCompactos(false); if (!value.startsWith("DORM:")) setComposicaoExata(false); setVisibleCount(12); }}
              style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "4px", padding: "0.4rem", color: "#fff", fontSize: "0.75rem" }}
            >
              <option value="TODAS">Qualquer quantidade</option>
              <option value="STUDIO">Studio / Loft</option>
              <option value="DORM:1">1+</option>
              <option value="DORM:2">2+</option>
              <option value="DORM:3">3+</option>
              <option value="DORM:4">4+</option>
              <option value="DORM:5">5+</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "0.7rem", color: "#71717a", display: "block", marginBottom: "0.25rem" }}>Suítes</label>
            <select value={suitesMinimas} onChange={(e) => { setSuitesMinimas(e.target.value); setVisibleCount(12); }} style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "4px", padding: "0.4rem", color: "#fff", fontSize: "0.75rem" }}>
              <option value="0">Qualquer quantidade</option>
              <option value="1">1+</option>
              <option value="2">2+</option>
              <option value="3">3+</option>
              <option value="4">4+</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: "0.7rem", color: "#71717a", display: "block", marginBottom: "0.25rem" }}>Vagas</label>
            <select value={vagasFiltro} onChange={(e) => { setVagasFiltro(e.target.value); setVisibleCount(12); }} style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "4px", padding: "0.4rem", color: "#fff", fontSize: "0.75rem" }}>
              <option value="TODAS">Qualquer quantidade</option><option value="1">1 Vaga</option><option value="2">2 Vagas</option><option value="3+">3+ Vagas</option>
            </select>
          </div>

          {filtrosAvancados && <div style={{ gridColumn: "1 / -1", paddingTop: "0.65rem", marginTop: "0.1rem", borderTop: "1px solid #27272a", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: "0.75rem", alignItems: "end" }}>
          <label style={{ fontSize: "0.7rem", color: tipologia === "TODAS" || tipologia === "STUDIO" ? "#52525b" : "#a1a1aa", display: "flex", alignItems: "center", gap: 7, alignSelf: "end", minHeight: 31 }} title="Exemplo: 3 dormitórios e 2 suítes mostra apenas essa composição."><input type="checkbox" disabled={tipologia === "TODAS" || tipologia === "STUDIO"} checked={composicaoExata} onChange={(e) => { setComposicaoExata(e.target.checked); setVisibleCount(12); }} /> Composição exata</label>

          <div>
            <label style={{ fontSize: "0.7rem", color: "#71717a", display: "block", marginBottom: 6 }}>Fluxo contratado</label>
            <select value={fluxosSelecionados[0] || ""} onChange={(event) => { setFluxosSelecionados(event.target.value ? [event.target.value] : []); setVisibleCount(12); }} style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "4px", padding: "0.4rem", color: "#fff", fontSize: "0.75rem" }}>
              <option value="">Todos os fluxos</option>
              {flowProfilesDisponiveis.map((profile) => <option key={profile} value={profile}>{profile}</option>)}
            </select>
          </div>

          <MoneyRangeFilter label="Entrada no fluxo" minRaw={entradaMinRaw} maxRaw={entradaMaxRaw} onMinChange={(value) => { setEntradaMinRaw(value); setVisibleCount(12); }} onMaxChange={(value) => { setEntradaMaxRaw(value); setVisibleCount(12); }} />

          <MoneyRangeFilter label="Parcela no fluxo" minRaw={parcelaMinRaw} maxRaw={parcelaMaxRaw} onMinChange={(value) => { setParcelaMinRaw(value); setVisibleCount(12); }} onMaxChange={(value) => { setParcelaMaxRaw(value); setVisibleCount(12); }} />

          <MoneyRangeFilter label="Balão no fluxo" minRaw={balaoMinRaw} maxRaw={balaoMaxRaw} onMinChange={(value) => { setBalaoMinRaw(value); setVisibleCount(12); }} onMaxChange={(value) => { setBalaoMaxRaw(value); setVisibleCount(12); }} />

          <label style={{ fontSize: "0.7rem", color: tipologia === "TODAS" ? "#a1a1aa" : "#52525b", display: "flex", alignItems: "center", gap: 7, alignSelf: "end", minHeight: 31 }}><input type="checkbox" disabled={tipologia !== "TODAS"} checked={incluirCompactos} onChange={(e) => { setIncluirCompactos(e.target.checked); setVisibleCount(12); }} /> Studio/Loft</label>

          {/* FAIXA DE VALOR DE TABELA (DE / ATÉ) - ORGANIZADOS LADO A LADO */}
          <div style={{ gridColumn: "span 2", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
            <div>
              <label style={{ fontSize: "0.7rem", color: "#71717a", display: "block", marginBottom: "0.25rem" }}>Valor Tabela De</label>
              <input 
                type="text" 
                placeholder="R$ 0,00" 
                value={valorTabelaMinRaw}
                onChange={(e) => {
                  setValorTabelaMinRaw(formatCurrencyInput(e.target.value));
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

          <div>
            <label style={{ fontSize: "0.7rem", color: "#71717a", display: "block", marginBottom: "0.25rem" }}>Entrega em até</label>
            <select value={prazoMeses} onChange={(e) => { setPrazoMeses(Number(e.target.value)); setVisibleCount(12); }} style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "4px", padding: "0.4rem", color: "#fff", fontSize: "0.75rem", boxSizing: "border-box" }}>
              <option value={0}>Qualquer data</option>
              {Array.from({ length: 25 }, (_, index) => (index + 1) * 6).map((months) => <option key={months} value={months}>Até {months} meses</option>)}
            </select>
          </div>

          {/* BOTÃO DE BUSCA MANUAL */}
          </div>}

          <div style={{ gridColumn: "1 / -1", marginTop: filtrosAvancados ? "0.1rem" : "0.35rem", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={() => setVisibleCount(12)}
              style={{
                width: "min(360px, 100%)",
                backgroundColor: "#c5a059",
                color: "#000",
                border: "none",
                borderRadius: "4px",
                padding: "0.5rem",
                fontSize: "0.75rem",
                fontWeight: "bold",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.4rem"
              }}
            >
              <Search style={{ width: "13px", height: "13px" }} />
              Buscar Unidades
            </button>
          </div>
        </div>
      </div>

      {/* LISTAGEM DE UNIDADES */}
      {loading ? (
        <div style={{ backgroundColor: "#121212", padding: "3rem", textAlign: "center", color: "#71717a" }}>Carregando unidades...</div>
      ) : !hasActiveSearch ? (
        <div style={{ backgroundColor: "#121212", padding: "3rem", textAlign: "center", border: "1px solid #27272a", borderRadius: "8px" }}>
          <Search style={{ width: "28px", height: "28px", color: "#c5a059", marginBottom: "0.75rem" }} />
          <p style={{ color: "#e4e4e7", margin: 0, fontWeight: 600 }}>Comece pelos filtros acima</p>
          <p style={{ color: "#71717a", margin: "0.45rem 0 0", fontSize: "0.8rem" }}>Você pode buscar por código, empreendimento, cidade, tipologia, valores ou prazo.</p>
        </div>
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
              const tipoExibicao = parseTipologia(u).label;
              const capacidadeInformada = parseCurrencyValue(entradaMaxRaw) > 0 || parseCurrencyValue(parcelaMaxRaw) > 0 || parseCurrencyValue(balaoMaxRaw) > 0;
              const analiseFluxo = analyzeFlow(u, { entrada: parseCurrencyValue(entradaMaxRaw), parcela: parseCurrencyValue(parcelaMaxRaw), balao: parseCurrencyValue(balaoMaxRaw) });
              
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
                            <CurrencyInput
                              value={Number(editForm.valor_tabela) || 0}
                              onChange={(value) => setEditForm({ ...editForm, valor_tabela: value })}
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

                    {capacidadeInformada && analiseFluxo.status === "compativel" && <div style={{ marginTop: 10, padding: 9, borderRadius: 6, border: "1px solid #14532d", background: "#052e162b", fontSize: 11, lineHeight: 1.55 }}><strong style={{ color: "#34d399", display: "block", marginBottom: 3 }}>Fluxo compatível · {analiseFluxo.preKeysPercent.toLocaleString("pt-BR")}% até as chaves</strong><span style={{ color: "#d4d4d8" }}>{formatCurrency(analiseFluxo.suggestedEntry)} de entrada · {analiseFluxo.months}x {formatCurrency(analiseFluxo.suggestedInstallment)}{analiseFluxo.balloonCount > 0 ? ` · ${analiseFluxo.balloonCount} balões de ${formatCurrency(analiseFluxo.suggestedBalloon)}` : ""}</span><span style={{ color: "#8b8b95", display: "block" }}>Total até as chaves: {formatCurrency(analiseFluxo.preKeysTarget)} · saldo nas chaves: {formatCurrency(analiseFluxo.balanceAtKeys)}</span></div>}
                    {capacidadeInformada && analiseFluxo.status === "proposta" && <div style={{marginTop:10,padding:9,borderRadius:6,border:"1px solid #854d0e",background:"#2a16082b",fontSize:11,lineHeight:1.5}}><strong style={{color:"#fbbf24",display:"block"}}>Proposta a validar · {(analiseFluxo.coverage*100).toLocaleString("pt-BR",{maximumFractionDigits:0})}% do mínimo até as chaves</strong><span style={{color:"#d4d4d8"}}>{analiseFluxo.reason} A unidade não fecha pela regra atual; ela aparece apenas como possibilidade de proposta, sujeita à aprovação da construtora.</span></div>}

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

      {newUnitOpen && <div role="dialog" aria-modal="true" aria-label="Cadastrar nova unidade" onMouseDown={(event)=>{ if(event.target===event.currentTarget) setNewUnitOpen(false); }} style={{position:"fixed",inset:0,zIndex:10000,background:"#000b",display:"grid",placeItems:"center",padding:16}}><div style={{width:"min(760px,100%)",maxHeight:"90vh",overflowY:"auto",background:"#121212",border:"1px solid #3f3f46",borderRadius:10,padding:16}}><div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}><div><h2 style={{margin:0,color:"#fff",fontSize:18}}>Nova unidade</h2><p style={{margin:"4px 0 0",color:"#a1a1aa",fontSize:12}}>Cadastro manual com campos que alimentam busca, comparativo e fluxo.</p></div><button onClick={()=>setNewUnitOpen(false)} aria-label="Fechar" style={{background:"transparent",border:0,color:"#a1a1aa",cursor:"pointer"}}><X size={18}/></button></div><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(170px,1fr))",gap:10,marginTop:15}}><label style={{gridColumn:"1 / -1",fontSize:11,color:"#a1a1aa"}}>Empreendimento<select value={newUnitForm.empreendimento_id} onChange={(event)=>setNewUnitForm({...newUnitForm,empreendimento_id:event.target.value})} style={{width:"100%",boxSizing:"border-box",marginTop:5,background:"#09090b",color:"#fff",border:"1px solid #3f3f46",borderRadius:6,padding:9}}><option value="">Selecione</option>{enterpriseOptions.map((enterprise)=><option key={enterprise.id} value={enterprise.id}>{enterprise.nome}</option>)}</select></label>{[["numero","Unidade", "text"],["torre","Torre", "text"],["andar","Andar", "number"],["tipologia","Tipologia", "text"],["dormitorios","Dormitórios", "number"],["suites","Suítes", "number"],["vagas","Vagas", "number"],["area_privativa","Área privativa (m²)", "number"],["vista","Vista / posição", "text"]].map(([field,label,type])=><label key={field} style={{fontSize:11,color:"#a1a1aa"}}>{label}<input type={type} value={newUnitForm[field] ?? ""} onChange={(event)=>setNewUnitForm({...newUnitForm,[field]:event.target.value})} style={{width:"100%",boxSizing:"border-box",marginTop:5,background:"#09090b",color:"#fff",border:"1px solid #3f3f46",borderRadius:6,padding:9}}/></label>)}<label style={{fontSize:11,color:"#a1a1aa"}}>Valor de tabela<CurrencyInput value={Number(newUnitForm.valor_tabela)||0} onChange={(value)=>setNewUnitForm({...newUnitForm,valor_tabela:value})} style={{width:"100%",boxSizing:"border-box",marginTop:5,background:"#09090b",color:"#fff",border:"1px solid #3f3f46",borderRadius:6,padding:9}}/></label><label style={{fontSize:11,color:"#a1a1aa"}}>Entrada sugerida<CurrencyInput value={Number(newUnitForm.entrada_sugerida)||0} onChange={(value)=>setNewUnitForm({...newUnitForm,entrada_sugerida:value})} style={{width:"100%",boxSizing:"border-box",marginTop:5,background:"#09090b",color:"#fff",border:"1px solid #3f3f46",borderRadius:6,padding:9}}/></label><label style={{fontSize:11,color:"#a1a1aa"}}>Status<select value={newUnitForm.status} onChange={(event)=>setNewUnitForm({...newUnitForm,status:event.target.value})} style={{width:"100%",boxSizing:"border-box",marginTop:5,background:"#09090b",color:"#fff",border:"1px solid #3f3f46",borderRadius:6,padding:9}}><option value="disponivel">Disponível</option><option value="reservada">Reservada</option><option value="indisponivel">Indisponível</option></select></label><label style={{gridColumn:"1 / -1",fontSize:11,color:"#a1a1aa"}}>Observações<textarea value={newUnitForm.observacoes} onChange={(event)=>setNewUnitForm({...newUnitForm,observacoes:event.target.value})} style={{width:"100%",boxSizing:"border-box",minHeight:70,marginTop:5,background:"#09090b",color:"#fff",border:"1px solid #3f3f46",borderRadius:6,padding:9}}/></label></div>{newUnitError&&<p role="alert" style={{color:"#f87171",fontSize:12}}>{newUnitError}</p>}<div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:15}}><button onClick={()=>setNewUnitOpen(false)} style={{background:"#18181b",border:"1px solid #3f3f46",color:"#e4e4e7",borderRadius:6,padding:"8px 11px",cursor:"pointer"}}>Cancelar</button><button disabled={newUnitSaving} onClick={()=>void saveNewUnit()} style={{background:"#c5a059",border:0,color:"#111",fontWeight:700,borderRadius:6,padding:"8px 11px",cursor:"pointer"}}>{newUnitSaving?"Salvando...":"Cadastrar unidade"}</button></div></div></div>}

    </div>
  );
}
