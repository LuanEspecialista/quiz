import { useEffect, useState } from "react";
import { Sidebar } from "../components/layout/Sidebar";
import { Header } from "../components/layout/Header";
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
import AfiliadosModule from "./modules/Afiliados";
import SmartDashboard, { type SmartUnitFilters } from "../components/SmartDashboard";
import PromptsModule from "./modules/Prompts";
import ModuleErrorBoundary from "../components/ModuleErrorBoundary";
import LinksTemporariosModule from "./modules/LinksTemporarios";

interface DashboardProps { userName?: string; role?: "admin" | "equipe" | "afiliado" }

export default function Dashboard({ userName, role = "admin" }: DashboardProps) {
  const initialParams = new URLSearchParams(window.location.search);
  const [activeTab, setActiveTab] = useState(role === "afiliado" ? "afiliados" : initialParams.get("tab") || "dashboard");
  const [smartUnitFilters, setSmartUnitFilters] = useState<SmartUnitFilters>();
  const [flowUnitIds, setFlowUnitIds] = useState<string[]>([]);
  const [metrics, setMetrics] = useState({ empreendimentos: 0, unidades: 0, clientes: 0, propostasEmAndamento: 0 });
  const empreendimentoId = initialParams.get("empreendimento") || undefined;
  const disponibilidade = initialParams.get("disponibilidade") || undefined;
  const tipologiaInicial = initialParams.get("tipologia") || undefined;

  useEffect(() => {
    if (activeTab !== "dashboard") return;
    void Promise.all([
      supabase.from("empreendimentos").select("*", { count: "exact", head: true }),
      supabase.from("unidades").select("*", { count: "exact", head: true }),
      supabase.from("clientes").select("*", { count: "exact", head: true }),
      supabase.from("propostas").select("*", { count: "exact", head: true }),
    ]).then(([empreendimentos, unidades, clientes, propostas]) => setMetrics({ empreendimentos: empreendimentos.count ?? 0, unidades: unidades.count ?? 0, clientes: clientes.count ?? 0, propostasEmAndamento: propostas.count ?? 0 })).catch((error) => console.error("Erro ao carregar métricas:", error));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "fluxos") return;
    const leaveSimulation = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setFlowUnitIds([]);
      setActiveTab("unidades");
    };
    window.addEventListener("keydown", leaveSimulation);
    return () => window.removeEventListener("keydown", leaveSimulation);
  }, [activeTab]);

  const searchUnits = (filters: SmartUnitFilters) => { setSmartUnitFilters(filters); setActiveTab("unidades"); };
  const openFlow = (units: any[]) => { setFlowUnitIds(units.map((unit) => unit.id)); setActiveTab("fluxos"); };

  useEffect(() => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", activeTab);
    window.history.replaceState(null, "", url);
  }, [activeTab]);

  return <div style={{ minHeight: "100vh", width: "100%", background: "#0a0a0a", color: "#fff", display: "flex", overflowX: "hidden" }}>
    <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} role={role} />
    <div style={{ flex: 1, minWidth: 0, width: "100%" }}>
      <Header userName={userName} role={role} setActiveTab={setActiveTab} onTickerSelect={() => setActiveTab("indicadores")} />
      <main className="app-main" style={{ marginTop: 56, padding: "1.5rem 2rem", width: "100%", boxSizing: "border-box" }}>
        {role !== "afiliado" && activeTab === "dashboard" && <SmartDashboard metrics={metrics} onSearch={searchUnits} onNavigate={setActiveTab} />}
        {role !== "afiliado" && activeTab === "construtoras" && <ConstrutorasModule />}
        {role !== "afiliado" && activeTab === "empreendimentos" && <EmpreendimentosModule />}
        {role !== "afiliado" && activeTab === "unidades" && <UnidadesModule empreendimentoId={empreendimentoId} disponibilidadeInicial={disponibilidade} tipologiaInicial={tipologiaInicial} filtrosIniciais={smartUnitFilters} onSimular={openFlow} />}
        {role !== "afiliado" && activeTab === "apresentacoes" && <ApresentacoesModule />}
        {role !== "afiliado" && activeTab === "importar-ia" && <ImportarIAModule />}
        {role !== "afiliado" && activeTab === "prompts" && <PromptsModule />}
        {role !== "afiliado" && activeTab === "fluxos" && <FluxosModule initialUnitIds={flowUnitIds} />}
        {role !== "afiliado" && activeTab === "clientes" && <ClientesModule onOpenFlow={(ids) => { setFlowUnitIds(ids); setActiveTab("fluxos"); }} />}
        {activeTab === "afiliados" && <AfiliadosModule role={role} />}
        {role !== "afiliado" && activeTab === "indicadores" && <ModuleErrorBoundary moduleName="Indicadores"><IndicadoresModule /></ModuleErrorBoundary>}
        {role !== "afiliado" && activeTab === "configuracoes" && <ConfiguracoesModule />}
        {role !== "afiliado" && activeTab === "links" && <LinksTemporariosModule />}
      </main>
    </div>
  </div>;
}
