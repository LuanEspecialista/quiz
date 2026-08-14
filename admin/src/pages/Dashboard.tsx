import { useState, useEffect } from "react";
import { Sidebar } from "../components/layout/Sidebar";
import { Header } from "../components/layout/Header";
import { 
  Target, 
  Zap, 
  Sparkles, 
  ArrowRight, 
  Plus, 
  Building2, 
  X
} from "lucide-react";

import { supabase } from "../lib/supabase";

import { ConstrutorasModule } from "./modules/Construtoras";
import EmpreendimentosModule from "./modules/Empreendimentos";
import { UnidadesModule } from "./modules/Unidades";
import FluxosModule from "./modules/Fluxos";
import { ImportarIAModule } from "./modules/ImportarIA";
import IndicadoresModule from "./modules/indicadores";
import ConfiguracoesModule from "./modules/Configuracoes";
import ApresentacoesModule from "./modules/Apresentacoes";
import ClientesModule from "./modules/Clientes";

interface DashboardProps {
  userEmail?: string;
}

export default function Dashboard({ userEmail }: DashboardProps) {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedTicker, setSelectedTicker] = useState<any | null>(null);
  const [selectedEmpreendimentoId] = useState<string | undefined>();

  const [metrics, setMetrics] = useState({
    empreendimentos: 0,
    unidades: 0,
    clientes: 0,
    propostasEmAndamento: 0
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedTicker(null);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (activeTab === "dashboard") {
      loadRealMetrics();
    }
  }, [activeTab]);

  const loadRealMetrics = async () => {
    try {
      const [emp, uni, cli, prop] = await Promise.all([
        supabase.from("empreendimentos").select("*", { count: "exact", head: true }),
        supabase.from("unidades").select("*", { count: "exact", head: true }),
        supabase.from("clientes").select("*", { count: "exact", head: true }),
        supabase.from("propostas").select("*", { count: "exact", head: true })
      ]);

      setMetrics({
        empreendimentos: emp.count ?? 0,
        unidades: uni.count ?? 0,
        clientes: cli.count ?? 0,
        propostasEmAndamento: prop.count ?? 0
      });
    } catch (err) {
      console.error("Erro ao carregar métricas reais:", err);
    }
  };

  const handleSelectTickerFromHeader = (ticker: any) => {
    if (selectedTicker && selectedTicker.id === ticker.id) {
      setSelectedTicker(null);
    } else {
      setSelectedTicker(ticker);
    }
  };

  return (
    <div style={{ minHeight: "100vh", width: "100%", backgroundColor: "#0a0a0a", color: "#fff", display: "flex", overflowX: "hidden" }}>
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, width: "100%" }}>
        <Header 
          userEmail={userEmail} 
          setActiveTab={setActiveTab} 
          onTickerSelect={handleSelectTickerFromHeader} 
        />

        <main style={{ marginTop: "56px", padding: "1.5rem 2rem", width: "100%", boxSizing: "border-box", flex: 1 }}>
          {activeTab === "dashboard" && (
            <div style={{ color: "#e4e4e7", fontFamily: "sans-serif", fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              
              {/* CABEÇALHO COM ATALHOS RÁPIDOS DE OPERAÇÃO */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #1f1f23", paddingBottom: "1rem" }}>
                <div>
                  <h1 style={{ fontSize: "1.3rem", fontWeight: "bold", color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Zap style={{ width: "20px", height: "20px", color: "#c5a059" }} /> Painel de Negócios & Alavancagem
                  </h1>
                  <p style={{ color: "#71717a", fontSize: "0.75rem", margin: "0.25rem 0 0 0" }}>
                    Visão estratégica para estruturação de crédito, simulações e conversão.
                  </p>
                </div>

                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button 
                    onClick={() => setActiveTab("importar-ia")}
                    style={{ backgroundColor: "#18181b", border: "1px solid #27272a", color: "#fff", padding: "0.45rem 0.8rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "600", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    <Sparkles style={{ width: "14px", height: "14px", color: "#c5a059" }} /> Importar Tabela (IA)
                  </button>
                  <button 
                    onClick={() => setActiveTab("fluxos")}
                    style={{ backgroundColor: "#c5a059", border: "none", color: "#000", padding: "0.45rem 0.8rem", borderRadius: "6px", fontSize: "0.75rem", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem" }}
                  >
                    <Plus style={{ width: "14px", height: "14px" }} /> Nova Simulação
                  </button>
                </div>
              </div>

              {/* DETALHES DO TICKER CLICADO NO CABEÇALHO */}
              {selectedTicker && (
                <div style={{ backgroundColor: "#121212", border: "1px solid #c5a059", borderRadius: "6px", padding: "0.85rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ color: "#c5a059", fontSize: "0.68rem", textTransform: "uppercase", fontWeight: "bold" }}>Indicador Selecionado</span>
                    <h4 style={{ margin: "0.2rem 0 0 0", color: "#fff" }}>{selectedTicker.nome}</h4>
                    <p style={{ margin: "0.2rem 0 0 0", color: "#71717a", fontSize: "0.72rem" }}>
                      Categoria: {selectedTicker.categoria || "Geral"} | Atualizado recentemente
                    </p>
                  </div>
                  <button 
                    onClick={() => setSelectedTicker(null)} 
                    style={{ background: "#18181b", border: "1px solid #27272a", color: "#a1a1aa", borderRadius: "4px", padding: "0.35rem 0.6rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}
                  >
                    <X style={{ width: "13px", height: "13px" }} /> <span style={{ fontSize: "0.7rem" }}>ESC</span>
                  </button>
                </div>
              )}

              {/* RADAR DE INSIGHTS E OPORTUNIDADES DO DIA (IA / PRÁTICO) */}
              <div style={{ backgroundColor: "#121212", border: "1px solid #1f1f23", borderRadius: "8px", padding: "1.25rem" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <Sparkles style={{ width: "18px", height: "18px", color: "#c5a059" }} />
                    <h3 style={{ margin: 0, color: "#fff", fontSize: "0.95rem" }}>Insights Estratégicos & Oportunidades de Crédito</h3>
                  </div>
                  <span style={{ fontSize: "0.7rem", color: "#71717a" }}>Atualizado automaticamente</span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.85rem" }}>
                  
                  {/* INSIGHT 1 */}
                  <div style={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "6px", padding: "0.85rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.4rem", marginBottom: "0.4rem" }}>
                        <span style={{ backgroundColor: "rgba(34, 197, 94, 0.1)", color: "#22c55e", padding: "0.15rem 0.4rem", borderRadius: "4px", fontSize: "0.65rem", fontWeight: "bold" }}>Alavancagem Crédito</span>
                      </div>
                      <strong style={{ color: "#fff", fontSize: "0.85rem", display: "block" }}>Arbitragem: Carta de Crédito vs. Rentabilidade</strong>
                      <p style={{ color: "#a1a1aa", fontSize: "0.72rem", margin: "0.4rem 0 0 0", lineHeight: "1.3" }}>
                        O custo médio de parcelas de consórcio/crédito inteligente está abaixo do rendimento das oportunidades cadastradas.
                      </p>
                    </div>
                    <button 
                      onClick={() => setActiveTab("fluxos")} 
                      style={{ background: "none", border: "none", color: "#c5a059", padding: 0, marginTop: "0.75rem", fontSize: "0.72rem", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}
                    >
                      Simular Alavancagem <ArrowRight style={{ width: "12px", height: "12px" }} />
                    </button>
                  </div>

                  {/* INSIGHT 2 */}
                  <div style={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "6px", padding: "0.85rem", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.4rem" }}>
                        <span style={{ backgroundColor: "rgba(197, 160, 89, 0.1)", color: "#c5a059", padding: "0.15rem 0.4rem", borderRadius: "4px", fontSize: "0.65rem", fontWeight: "bold" }}>Inteligência de Vendas</span>
                      </div>
                      <strong style={{ color: "#fff", fontSize: "0.85rem", display: "block" }}>Proposta de Rendimento com Rendimento Financeiro</strong>
                      <p style={{ color: "#a1a1aa", fontSize: "0.72rem", margin: "0.4rem 0 0 0", lineHeight: "1.3" }}>
                        Pague as parcelas utilizando os rendimentos das cotas ou o cashflow de ativos sob construção.
                      </p>
                    </div>
                    <button 
                      onClick={() => setActiveTab("unidades")} 
                      style={{ background: "none", border: "none", color: "#c5a059", padding: 0, marginTop: "0.75rem", fontSize: "0.72rem", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}
                    >
                      Ver Unidades Disponíveis <ArrowRight style={{ width: "12px", height: "12px" }} />
                    </button>
                  </div>

                </div>
              </div>

              {/* FUNIL RÁPIDO E RESUMO DE ATIVOS */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                
                {/* FUNIL / PIPELINE DE ATENDIMENTO */}
                <div style={{ backgroundColor: "#121212", border: "1px solid #1f1f23", borderRadius: "8px", padding: "1rem" }}>
                  <h3 style={{ margin: "0 0 0.8rem 0", color: "#fff", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Target style={{ width: "16px", height: "16px", color: "#c5a059" }} /> Funil de Clientes & Propostas
                  </h3>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.75rem", backgroundColor: "#18181b", borderRadius: "6px", border: "1px solid #27272a" }}>
                      <span style={{ color: "#a1a1aa", fontSize: "0.75rem" }}>Clientes Cadastrados</span>
                      <strong style={{ color: "#fff", fontSize: "0.9rem" }}>{metrics.clientes}</strong>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.75rem", backgroundColor: "#18181b", borderRadius: "6px", border: "1px solid #27272a" }}>
                      <span style={{ color: "#a1a1aa", fontSize: "0.75rem" }}>Propostas / Estudo de Crédito</span>
                      <strong style={{ color: "#c5a059", fontSize: "0.9rem" }}>{metrics.propostasEmAndamento}</strong>
                    </div>
                  </div>
                </div>

                {/* INVENTÁRIO SINCRONIZADO */}
                <div style={{ backgroundColor: "#121212", border: "1px solid #1f1f23", borderRadius: "8px", padding: "1rem" }}>
                  <h3 style={{ margin: "0 0 0.8rem 0", color: "#fff", fontSize: "0.9rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                    <Building2 style={{ width: "16px", height: "16px", color: "#c5a059" }} /> Base de Imóveis Sincronizada
                  </h3>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.75rem", backgroundColor: "#18181b", borderRadius: "6px", border: "1px solid #27272a" }}>
                      <span style={{ color: "#a1a1aa", fontSize: "0.75rem" }}>Empreendimentos Ativos</span>
                      <strong style={{ color: "#fff", fontSize: "0.9rem" }}>{metrics.empreendimentos}</strong>
                    </div>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.75rem", backgroundColor: "#18181b", borderRadius: "6px", border: "1px solid #27272a" }}>
                      <span style={{ color: "#a1a1aa", fontSize: "0.75rem" }}>Unidades Mapeadas</span>
                      <strong style={{ color: "#22c55e", fontSize: "0.9rem" }}>{metrics.unidades}</strong>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}

          {activeTab === "construtoras" && ConstrutorasModule && <ConstrutorasModule />}
          {activeTab === "empreendimentos" && EmpreendimentosModule && <EmpreendimentosModule />}
          {activeTab === "unidades" && UnidadesModule && <UnidadesModule empreendimentoId={selectedEmpreendimentoId} />}
          {activeTab === "apresentacoes" && <ApresentacoesModule />}
          {activeTab === "importar-ia" && ImportarIAModule && <ImportarIAModule />}
          {activeTab === "fluxos" && FluxosModule && <FluxosModule />}
          {activeTab === "clientes" && <ClientesModule />}
          {activeTab === "indicadores" && IndicadoresModule && <IndicadoresModule />}
          {activeTab === "configuracoes" && ConfiguracoesModule && <ConfiguracoesModule />}

          {["afiliados", "links"].includes(activeTab) && (
            <div style={{ backgroundColor: "#121212", border: "1px solid #222", borderRadius: "8px", padding: "2rem", textAlign: "center" }}>
              <h2 style={{ color: "#c5a059", textTransform: "capitalize" }}>Módulo {activeTab}</h2>
              <p style={{ color: "#71717a" }}>Em breve este módulo estará ativo.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
