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
  const requestedTab = initialParams.get("tab");
  const initialTab = requestedTab || "dashboard";
  const [activeTab, setActiveTab] = useState(role === "afiliado" ? "afiliados" : initialTab);
  const [smartUnitFilters, setSmartUnitFilters] = useState<SmartUnitFilters>();
  const [flowUnitIds, setFlowUnitIds] = useState<string[]>([]);
  const [flowUnits, setFlowUnits] = useState<any[]>([]);
  const [flowClientId, setFlowClientId] = useState<string>();
  const [metrics, setMetrics] = useState({ empreendimentos: 0, unidades: 0, clientes: 0, propostasEmAndamento: 0, cadastrosBlog: 0, solicitacoesContato: 0 });
  const [notificationCounts, setNotificationCounts] = useState({ newClientProposals: 0, pendingAccessRequests: 0 });
  const empreendimentoId = initialParams.get("empreendimento") || undefined;
  const empreendimentoIds = (initialParams.get("empreendimentos") || "").split(",").map((value) => value.trim()).filter(Boolean);
  const disponibilidade = initialParams.get("disponibilidade") || undefined;
  const tipologiaInicial = initialParams.get("tipologia") || undefined;

  useEffect(() => {
    if (activeTab !== "dashboard") return;
    void Promise.all([
      supabase.from("empreendimentos").select("*", { count: "exact", head: true }),
      supabase.from("unidades").select("*", { count: "exact", head: true }),
      supabase.from("clientes").select("*", { count: "exact", head: true }),
      supabase.from("propostas").select("*", { count: "exact", head: true }),
      supabase.from("blog_leads").select("user_id", { count: "exact", head: true }),
      supabase.from("playbook_leads").select("id", { count: "exact", head: true }).eq("origem", "site_oportunidade"),
    ]).then(([empreendimentos, unidades, clientes, propostas, blogLeads, contactLeads]) => setMetrics({ empreendimentos: empreendimentos.count ?? 0, unidades: unidades.count ?? 0, clientes: clientes.count ?? 0, propostasEmAndamento: propostas.count ?? 0, cadastrosBlog: blogLeads.count ?? 0, solicitacoesContato: contactLeads.count ?? 0 })).catch((error) => console.error("Erro ao carregar métricas:", error));
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "dashboard" || role !== "admin") return;
    let disposed = false;
    const refreshNotifications = async () => {
      const [proposals, accessRequests] = await Promise.all([
        supabase.from("cliente_propostas").select("id", { count: "exact", head: true }).eq("status", "nova"),
        supabase.from("solicitacoes_acesso").select("id", { count: "exact", head: true }).eq("status", "pendente"),
      ]);
      if (disposed) return;
      setNotificationCounts((current) => ({
        newClientProposals: proposals.error ? current.newClientProposals : proposals.count ?? 0,
        pendingAccessRequests: accessRequests.error ? current.pendingAccessRequests : accessRequests.count ?? 0,
      }));
    };
    void refreshNotifications();
    const intervalId = window.setInterval(() => void refreshNotifications(), 30_000);
    return () => {
      disposed = true;
      window.clearInterval(intervalId);
    };
  }, [activeTab, role]);

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
        {role === "admin" && activeTab === "dashboard" && (notificationCounts.newClientProposals > 0 || notificationCounts.pendingAccessRequests > 0) && <section aria-label="Notificações pendentes" style={{ marginBottom: 16, padding: 14, border: "1px solid #8a6a2e", borderRadius: 10, background: "linear-gradient(135deg,#1c160b,#111114)" }}><div style={{ color: "#edcf91", fontWeight: 800, marginBottom: 10 }}>Avisos pendentes</div><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 9 }}>{notificationCounts.newClientProposals > 0 && <button type="button" onClick={() => setActiveTab("clientes")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: 12, border: "1px solid #4a3a20", borderRadius: 8, background: "#15120d", color: "#fff", cursor: "pointer", textAlign: "left" }}><span><small style={{ display: "block", color: "#a1a1aa" }}>Propostas de clientes</small><strong>{notificationCounts.newClientProposals} nova(s) para analisar</strong></span><span style={{ color: "#edcf91", whiteSpace: "nowrap" }}>Abrir Clientes →</span></button>}{notificationCounts.pendingAccessRequests > 0 && <button type="button" onClick={() => setActiveTab("usuarios-acessos")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: 12, border: "1px solid #4a3a20", borderRadius: 8, background: "#15120d", color: "#fff", cursor: "pointer", textAlign: "left" }}><span><small style={{ display: "block", color: "#a1a1aa" }}>Pedidos de acesso</small><strong>{notificationCounts.pendingAccessRequests} pendente(s)</strong></span><span style={{ color: "#edcf91", whiteSpace: "nowrap" }}>Abrir Acessos →</span></button>}</div><small style={{ display: "block", color: "#71717a", marginTop: 9 }}>Atualizado automaticamente a cada 30 segundos. Os avisos permanecem até a proposta ou solicitação ser tratada.</small></section>}
        {role !== "afiliado" && activeTab === "dashboard" && <SmartDashboard metrics={metrics} onSearch={searchUnits} onNavigate={setActiveTab} />}
        {role === "admin" && activeTab === "construtoras" && <ConstrutorasModule />}
        {role === "admin" && activeTab === "empreendimentos" && <EmpreendimentosModule />}
        {role !== "afiliado" && activeTab === "unidades" && <UnidadesModule empreendimentoId={empreendimentoId} empreendimentoIds={empreendimentoIds} disponibilidadeInicial={disponibilidade} tipologiaInicial={tipologiaInicial} filtrosIniciais={smartUnitFilters} onSimular={openFlow} />}
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
