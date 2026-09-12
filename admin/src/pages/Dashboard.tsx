import { lazy, Suspense, useEffect, useState } from "react";
import { Sidebar } from "../components/layout/Sidebar";
import { Header } from "../components/layout/Header";
import { supabase } from "../lib/supabase";
import SmartDashboard, { type SmartUnitFilters } from "../components/SmartDashboard";
import ModuleErrorBoundary from "../components/ModuleErrorBoundary";

const ConstrutorasModule = lazy(() => import("./modules/Construtoras").then((module) => ({ default: module.ConstrutorasModule })));
const EmpreendimentosModule = lazy(() => import("./modules/Empreendimentos"));
const UnidadesModule = lazy(() => import("./modules/Unidades").then((module) => ({ default: module.UnidadesModule })));
const FluxosModule = lazy(() => import("./modules/Fluxos"));
const ImportarIAModule = lazy(() => import("./modules/ImportarIA").then((module) => ({ default: module.ImportarIAModule })));
const IndicadoresModule = lazy(() => import("./modules/indicadores"));
const ConfiguracoesModule = lazy(() => import("./modules/Configuracoes"));
const ApresentacoesModule = lazy(() => import("./modules/Apresentacoes"));
const ClientesModule = lazy(() => import("./modules/Clientes"));
const AfiliadosModule = lazy(() => import("./modules/Afiliados"));
const PromptsModule = lazy(() => import("./modules/Prompts"));
const LinksTemporariosModule = lazy(() => import("./modules/LinksTemporarios"));
const BlogModule = lazy(() => import("./modules/Blog"));
const PlaybookModule = lazy(() => import("./modules/Playbook"));
const TipologiasModule = lazy(() => import("./modules/Tipologias"));
const MinhaContaModule = lazy(() => import("./modules/MinhaConta"));
const UsuariosAcessosModule = lazy(() => import("./modules/UsuariosAcessos"));

interface DashboardProps { userName?: string; role?: "admin" | "equipe" | "afiliado" }

export default function Dashboard({ userName, role = "admin" }: DashboardProps) {
  const initialParams = new URLSearchParams(window.location.search);
  const [activeTab, setActiveTab] = useState(role === "afiliado" ? "afiliados" : initialParams.get("tab") || "dashboard");
  const [smartUnitFilters, setSmartUnitFilters] = useState<SmartUnitFilters>();
  const [flowUnitIds, setFlowUnitIds] = useState<string[]>([]);
  const [flowUnits, setFlowUnits] = useState<any[]>([]);
  const [flowClientId, setFlowClientId] = useState<string>();
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
      setFlowClientId(undefined);
      setActiveTab("unidades");
    };
    window.addEventListener("keydown", leaveSimulation);
    return () => window.removeEventListener("keydown", leaveSimulation);
  }, [activeTab]);

  const searchUnits = (filters: SmartUnitFilters) => { setSmartUnitFilters(filters); setActiveTab("unidades"); };
  const openFlow = (units: any[]) => {
    const selected = units.filter((unit) => unit?.id).slice(0, 4);
    if (!selected.length) return;
    setFlowClientId(undefined);
    setFlowUnits(selected);
    setFlowUnitIds(selected.map((unit) => unit.id));
    const url = new URL(window.location.href);
    url.searchParams.delete("empreendimento");
    url.searchParams.delete("disponibilidade");
    url.searchParams.delete("tipologia");
    url.searchParams.set("tab", "fluxos");
    window.history.replaceState(null, "", url);
    setActiveTab("fluxos");
  };

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
        <Suspense fallback={<div style={{ minHeight: 240, display: "grid", placeItems: "center", color: "#c5a059" }}>Carregando módulo…</div>}>
        {role !== "afiliado" && activeTab === "dashboard" && <SmartDashboard metrics={metrics} onSearch={searchUnits} onNavigate={setActiveTab} />}
        {role !== "afiliado" && activeTab === "construtoras" && <ConstrutorasModule />}
        {role !== "afiliado" && activeTab === "empreendimentos" && <EmpreendimentosModule />}
        {role !== "afiliado" && activeTab === "unidades" && <UnidadesModule empreendimentoId={empreendimentoId} disponibilidadeInicial={disponibilidade} tipologiaInicial={tipologiaInicial} filtrosIniciais={smartUnitFilters} onSimular={openFlow} />}
        {role !== "afiliado" && activeTab === "apresentacoes" && <ApresentacoesModule />}
        {role !== "afiliado" && activeTab === "blog" && <BlogModule />}
        {role !== "afiliado" && activeTab === "tipologias" && <TipologiasModule />}
        {role !== "afiliado" && activeTab === "importar-ia" && <ImportarIAModule />}
        {role !== "afiliado" && activeTab === "prompts" && <PromptsModule />}
        {role !== "afiliado" && activeTab === "fluxos" && <FluxosModule initialUnitIds={flowUnitIds} initialUnits={flowUnits} initialClientId={flowClientId} />}
        {role !== "afiliado" && activeTab === "clientes" && <><ClientesModule onOpenFlow={(ids,clientId) => { setFlowClientId(clientId); setFlowUnits([]); setFlowUnitIds(ids); setActiveTab("fluxos"); }} /><details style={{marginTop:18,border:"1px solid #29292e",borderRadius:10,padding:14}}><summary style={{cursor:"pointer",color:"#d7ab63",fontWeight:800}}>Criar ou administrar acesso temporário de cliente</summary><div style={{marginTop:14}}><LinksTemporariosModule defaultPublic="cliente" embedded /></div></details></>}
        {role === "admin" && activeTab === "usuarios-acessos" && <UsuariosAcessosModule />}
        {role !== "afiliado" && activeTab === "playbook" && <PlaybookModule />}
        {activeTab === "afiliados" && <><AfiliadosModule role={role} />{role!=="afiliado"&&<details style={{marginTop:18,border:"1px solid #29292e",borderRadius:10,padding:14}}><summary style={{cursor:"pointer",color:"#d7ab63",fontWeight:800}}>Criar ou administrar acesso temporário de indicador</summary><div style={{marginTop:14}}><LinksTemporariosModule defaultPublic="afiliado" embedded /></div></details>}</>}
        {role !== "afiliado" && activeTab === "indicadores" && <ModuleErrorBoundary moduleName="Indicadores"><IndicadoresModule /></ModuleErrorBoundary>}
        {role !== "afiliado" && activeTab === "configuracoes" && <ConfiguracoesModule />}
        {activeTab === "minha-conta" && <MinhaContaModule />}
        </Suspense>
      </main>
    </div>
  </div>;
}
