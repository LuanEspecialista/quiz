import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clipboard,
  Clock3,
  Copy,
  Database,
  MapPin,
  MessageCircle,
  PhoneCall,
  Pin,
  PinOff,
  Search,
  Sparkles,
  TimerReset,
  UserRound,
  Video,
  X,
} from "lucide-react";
import { supabase } from "../../lib/supabase";
import type { SmartUnitFilters } from "../../components/SmartDashboard";
import "./ModoLigacao.css";

type Stage = "atenção" | "diagnóstico" | "curadoria" | "microcompromisso" | "videochamada" | "visita" | "proposta";
type Tab = "ao-vivo" | "especialista" | "objeções" | "praças" | "construtoras";
type MobilePane = "descobrir" | "agir" | "consultar";
type ClientResult = { id: string; nome: string; email?: string | null; telefone?: string | null; cidade?: string | null; objetivo?: string | null; origem: "cliente" | "lead" };
type Discovery = {
  finalidade: string;
  faixa: string;
  pagamento: string;
  prazo: string;
  cidade: string;
  perfil: string;
  decisor: string;
  preferencias: string[];
  temperatura: string;
  nota: string;
};

type SearchCard = { id: string; title: string; category: string; quick: string; say: string; tags: string[] };

const stages: Array<[Stage, string]> = [
  ["atenção", "Atenção"],
  ["diagnóstico", "Diagnóstico"],
  ["curadoria", "Curadoria"],
  ["microcompromisso", "Próximo passo"],
  ["videochamada", "Videochamada"],
  ["visita", "Visita"],
  ["proposta", "Proposta"],
];
const finalidades = ["Moradia", "Investimento", "Short stay", "Patrimônio", "Lazer"];
const faixas = ["Até 500 mil", "500 mil a 1 mi", "1 a 2 mi", "2 a 5 mi", "5 a 10 mi", "Acima de 10 mi"];
const pagamentos = ["À vista", "Financiamento", "Consórcio", "FGTS", "Permuta"];
const prazos = ["Imediato", "3 meses", "6 meses", "12 meses ou mais"];
const cities = ["Penha", "Piçarras", "Barra Velha", "Navegantes", "Itajaí", "Outra"];
const profiles = ["Novo", "Antigo", "Indeciso", "Investidor"];
const decisionMakers = ["Só ele", "Casal", "Sócio", "Família"];
const preferenceOptions = ["Quartos", "Vaga", "Vista", "Andar", "Pé na areia"];
const temperatures = ["Frio", "Morno", "Quente"];
const emptyDiscovery: Discovery = { finalidade: "", faixa: "", pagamento: "", prazo: "", cidade: "", perfil: "", decisor: "", preferencias: [], temperatura: "", nota: "" };
const objections = [
  { id: "caro", title: "Está caro", quick: "Descubra qual parte do fluxo pesou.", say: "Entendo. Quando você diz caro, está comparando entrada, parcela, valor total ou localização?", tags: ["preço", "fluxo"] },
  { id: "pensar", title: "Vou pensar", quick: "Transforme o adiamento em uma dúvida concreta.", say: "Claro. O que ainda precisa ficar claro para você pensar com segurança?", tags: ["tempo", "dúvida"] },
  { id: "material", title: "Manda tudo", quick: "Peça um filtro antes de enviar catálogo.", say: "Eu envio, mas para não te mandar material genérico: o foco é morar, investir ou aproveitar?", tags: ["material", "filtro"] },
  { id: "entrada", title: "Não tenho entrada", quick: "Mapeie capacidade sem prometer aprovação.", say: "Obrigado pela clareza. Qual entrada e parcela seriam saudáveis sem apertar sua vida?", tags: ["entrada", "capacidade"] },
  { id: "parceiro", title: "Preciso falar com alguém", quick: "Inclua quem participa da decisão.", say: "Faz sentido. Posso preparar uma comparação curta para vocês verem juntos?", tags: ["decisores", "próximo passo"] },
];
const knowledge: SearchCard[] = [
  { id: "motor", title: "Carros e motores", category: "Especialista", quick: "Carroceria e tecnologia sugerem rotina, nunca patrimônio.", say: "O que nesse carro facilita a sua rotina: espaço, silêncio, economia ou prazer ao dirigir?", tags: ["carros", "contexto"] },
  { id: "cafe", title: "Cafés e gastronomia", category: "Especialista", quick: "Use repertório para falar de hospitalidade e rotina.", say: "Você prefere uma experiência mais intensa, tranquila, gastronômica ou próxima da natureza?", tags: ["café", "lifestyle"] },
  { id: "diamante", title: "Joias e diamantes", category: "Especialista", quick: "Elegância não deve virar suposição de renda.", say: "O que você aprecia mais: design, história, discrição, raridade ou certificação?", tags: ["joias", "elegância"] },
  { id: "geografia", title: "Geografia e viagens", category: "Especialista", quick: "Deslocamento ajuda a validar visita e uso real.", say: "Quando você vem ao litoral, o que precisa estar fácil para a viagem valer a pena?", tags: ["praças", "logística"] },
  ...objections.map((item) => ({ ...item, category: "Objeção" })),
];

const storageKey = "luan.playbook.modo-ligacao.rascunho";
const moneyFilter = (range: string): number => ({ "Até 500 mil": 500000, "500 mil a 1 mi": 1000000, "1 a 2 mi": 2000000, "2 a 5 mi": 5000000, "5 a 10 mi": 10000000 }[range] || 0);
const prazoFilter = (value: string): number => ({ "3 meses": 3, "6 meses": 6, "12 meses ou mais": 12 }[value] || 0);
const normalize = (value: unknown) => String(value || "").toLocaleLowerCase("pt-BR");

export default function ModoLigacao({ onOpenUnits }: { onOpenUnits: (filters: SmartUnitFilters) => void }) {
  const [tab, setTab] = useState<Tab>("ao-vivo");
  const [pane, setPane] = useState<MobilePane>("descobrir");
  const [stage, setStage] = useState<Stage>("atenção");
  const [discovery, setDiscovery] = useState<Discovery>(() => {
    try { return { ...emptyDiscovery, ...(JSON.parse(localStorage.getItem(storageKey) || "{}") as Partial<Discovery>) }; } catch { return emptyDiscovery; }
  });
  const [clients, setClients] = useState<ClientResult[]>([]);
  const [clientQuery, setClientQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<ClientResult | null>(null);
  const [quickCall, setQuickCall] = useState(false);
  const [timerOn, setTimerOn] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [consultQuery, setConsultQuery] = useState("");
  const [pinned, setPinned] = useState<string[]>([]);
  const [objectionSheet, setObjectionSheet] = useState(false);
  const [finishOpen, setFinishOpen] = useState(false);
  const [nextAction, setNextAction] = useState("Videochamada de 15 minutos");
  const [nextContact, setNextContact] = useState("");
  const [saveState, setSaveState] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => localStorage.setItem(storageKey, JSON.stringify(discovery)), 450);
    return () => window.clearTimeout(timeout);
  }, [discovery]);

  useEffect(() => {
    if (!timerOn) { setStartedAt(null); setElapsed(0); return; }
    const started = startedAt || Date.now();
    if (!startedAt) setStartedAt(started);
    const interval = window.setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(interval);
  }, [timerOn, startedAt]);

  useEffect(() => {
    let active = true;
    void Promise.all([
      supabase.from("clientes").select("id,nome,email,telefone,cidade,objetivo").order("nome").limit(500),
      supabase.from("playbook_leads").select("id,nome,email,telefone,regiao,objetivo").order("criado_em", { ascending: false }).limit(200),
    ]).then(([clientResult, leadResult]) => {
      if (!active) return;
      const clientItems: ClientResult[] = (clientResult.data || []).map((item: any) => ({ id: String(item.id), nome: item.nome, email: item.email, telefone: item.telefone, cidade: item.cidade, objetivo: item.objetivo, origem: "cliente" }));
      const leadItems: ClientResult[] = (leadResult.data || []).map((item: any) => ({ id: `lead:${item.id}`, nome: item.nome, email: item.email, telefone: item.telefone, cidade: item.regiao, objetivo: item.objetivo, origem: "lead" }));
      setClients([...clientItems, ...leadItems]);
    });
    return () => { active = false; };
  }, []);

  const clientResults = useMemo(() => {
    const query = normalize(clientQuery.trim());
    if (!query) return clients.slice(0, 8);
    return clients.filter((item) => [item.nome, item.email, item.telefone, item.cidade].some((field) => normalize(field).includes(query))).slice(0, 8);
  }, [clientQuery, clients]);
  const currentStageIndex = stages.findIndex(([id]) => id === stage);
  const missing = useMemo(() => {
    const required: Array<[keyof Discovery, string]> = [["finalidade", "finalidade"], ["cidade", "cidade de interesse"], ["faixa", "faixa de valor"], ["decisor", "quem decide"]];
    return required.filter(([key]) => !discovery[key]).map(([, label]) => label);
  }, [discovery]);
  const suggestedQuestion = useMemo(() => {
    if (!discovery.finalidade) return "Antes de falar de produto: o foco hoje é morar, investir, lazer ou patrimônio?";
    if (!discovery.cidade) return "Qual praça faz mais sentido para a rotina ou estratégia que você imagina?";
    if (!discovery.faixa) return "Para eu filtrar sem te fazer perder tempo, qual faixa de valor você considera confortável?";
    if (!discovery.pagamento) return "Você imagina organizar esse movimento à vista, com financiamento ou combinando outras fontes?";
    if (!discovery.prazo) return "Qual é o horizonte realista para decidir: agora, em alguns meses ou mais adiante?";
    if (!discovery.decisor) return "Quem mais participa dessa decisão e precisa se sentir seguro para avançar?";
    if (!discovery.preferencias.length) return "Entre quartos, vaga, vista, andar e pé na areia, o que realmente muda a decisão?";
    if (stage === "atenção" || stage === "diagnóstico") return "O que precisaria estar claro para esta conversa valer o próximo passo?";
    return "Faz sentido compararmos duas alternativas com os pontos de atenção mais importantes para você?";
  }, [discovery, stage]);
  const consultResults = useMemo(() => {
    const q = normalize(consultQuery.trim());
    if (!q) return knowledge.slice(0, 6);
    return knowledge.filter((card) => [card.title, card.category, card.quick, card.say, ...card.tags].some((value) => normalize(value).includes(q))).slice(0, 8);
  }, [consultQuery]);
  const timeLabel = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const updateField = (key: keyof Discovery, value: string) => setDiscovery((current) => ({ ...current, [key]: value }));
  const togglePreference = (value: string) => setDiscovery((current) => ({ ...current, preferencias: current.preferencias.includes(value) ? current.preferencias.filter((item) => item !== value) : [...current.preferencias, value] }));
  const selectClient = (item: ClientResult) => { setSelectedClient(item); setClientQuery(item.nome); setQuickCall(false); };
  const callUnits = () => onOpenUnits({ entrada: moneyFilter(discovery.faixa), balao: 0, parcela: 0, cidade: discovery.cidade === "Outra" ? "" : discovery.cidade, dormitorios: discovery.preferencias.includes("Quartos") ? 1 : 0, incluirCompactos: false, prazoMeses: prazoFilter(discovery.prazo) });
  const summary = `RESUMO DA LIGAÇÃO\nCliente: ${selectedClient?.nome || "Ligação rápida sem cadastro"}\nEtapa: ${stages[currentStageIndex]?.[1] || stage}\nFinalidade: ${discovery.finalidade || "Não informada"}\nFaixa: ${discovery.faixa || "Não informada"}\nPagamento: ${discovery.pagamento || "Não informado"}\nPrazo: ${discovery.prazo || "Não informado"}\nCidade: ${discovery.cidade || "Não informada"}\nPerfil: ${discovery.perfil || "Não informado"}\nDecisor: ${discovery.decisor || "Não informado"}\nPreferências: ${discovery.preferencias.join(", ") || "Nenhuma marcada"}\nTemperatura: ${discovery.temperatura || "Não informada"}\nNota: ${discovery.nota || "Sem nota"}\nPróxima ação: ${nextAction}\nPróximo contato: ${nextContact || "A combinar"}`;

  const finishCall = async () => {
    setSaveState("Salvando ligação…");
    const leadPayload: Record<string, any> = {
      cliente_id: selectedClient?.origem === "cliente" ? selectedClient.id : null,
      nome: selectedClient?.nome || "Ligação rápida sem cadastro",
      telefone: selectedClient?.telefone || null,
      email: selectedClient?.email || null,
      origem: "playbook_ligacao",
      regiao: discovery.cidade || null,
      perfil: discovery.perfil.toLocaleLowerCase("pt-BR") || "a_qualificar",
      etapa: stage,
      objetivo: discovery.finalidade || null,
      proxima_acao: nextAction,
      proximo_contato: nextContact ? new Date(nextContact).toISOString() : null,
      consentimento_contato: Boolean(selectedClient),
      notas: discovery.nota || summary,
      descoberta: discovery,
      encerrada_em: new Date().toISOString(),
    };
    const leadResult = await supabase.from("playbook_leads").insert(leadPayload).select("id").single();
    if (leadResult.error) {
      localStorage.setItem(storageKey, JSON.stringify(discovery));
      setSaveState(`Rascunho salvo neste aparelho. Para gravar no banco, revise/aplique a migration do campo descoberta: ${leadResult.error.message}`);
      return;
    }
    const leadId = leadResult.data?.id;
    const interaction = await supabase.from("playbook_interacoes").insert({ lead_id: leadId, cliente_id: selectedClient?.origem === "cliente" ? Number(selectedClient.id) : null, canal: "ligacao", resumo: summary, proxima_acao: nextAction });
    if (selectedClient?.origem === "cliente") {
      await supabase.from("clientes").update({ objetivo: discovery.finalidade || null, cidades_preferencia: discovery.cidade ? [discovery.cidade] : null, status: discovery.temperatura.toLocaleLowerCase("pt-BR") || "novo", proximo_contato: nextContact ? new Date(nextContact).toISOString() : null, observacoes: summary }).eq("id", selectedClient.id);
    }
    setSaveState(interaction.error ? `Lead salvo; interação pendente: ${interaction.error.message}` : "Ligação encerrada e salva na base.");
    localStorage.removeItem(storageKey);
    setFinishOpen(false);
  };
  const copySummary = async () => { await navigator.clipboard?.writeText(summary); setCopied(true); window.setTimeout(() => setCopied(false), 1600); };

  return <div className="call-playbook">
    <header className="call-playbook-header">
      <div><small className="call-eyebrow">NÚCLEO COMERCIAL · MODO LIGAÇÃO</small><h1>Conduza a conversa com clareza</h1><p>Registre sinais por toque, escolha o próximo avanço e mantenha a conversa humana.</p></div>
      <div className="call-header-status"><span className="call-live-dot" /> Rascunho salvo automaticamente</div>
    </header>
    <nav className="call-tabs" aria-label="Áreas do Playbook">{([['ao-vivo', 'Ao vivo'], ['especialista', 'Especialista'], ['objeções', 'Objeções'], ['praças', 'Praças'], ['construtoras', 'Construtoras']] as Array<[Tab, string]>).map(([id, label]) => <button type="button" key={id} className={tab === id ? "is-active" : ""} onClick={() => setTab(id)}>{label}{id !== "ao-vivo" && <span>Em breve</span>}</button>)}</nav>
    {tab !== "ao-vivo" ? <PlaceholderTab tab={tab as Exclude<Tab, "ao-vivo">} /> : <>
      <section className="call-toolbar">
        <div className="client-picker"><UserRound size={16} color="#c5a059" /><input aria-label="Buscar cliente" value={clientQuery} onChange={(event) => { setClientQuery(event.target.value); setSelectedClient(null); }} placeholder="Buscar cliente ou lead…" />{selectedClient && <button type="button" className="icon-button" onClick={() => { setSelectedClient(null); setClientQuery(""); }} aria-label="Limpar cliente"><X size={15} /></button>}<div className="client-results">{!selectedClient && clientResults.map((item) => <button type="button" key={`${item.origem}-${item.id}`} onClick={() => selectClient(item)}><strong>{item.nome}</strong><small>{item.origem === "lead" ? "Lead do Playbook" : "Cliente"}{item.cidade ? ` · ${item.cidade}` : ""}</small></button>)}</div></div>
        <button type="button" className={quickCall ? "call-button is-selected" : "call-button"} onClick={() => { setQuickCall(true); setSelectedClient(null); setClientQuery(""); }}><PhoneCall size={16} /> Ligação rápida <small>sem cadastro</small></button>
        <div className="timer-control"><button type="button" className={timerOn ? "timer-button is-on" : "timer-button"} onClick={() => setTimerOn((current) => !current)}><Clock3 size={15} /> {timerOn ? timeLabel : "Cronômetro"}</button>{timerOn && <button type="button" className="icon-button" onClick={() => { setStartedAt(Date.now()); setElapsed(0); }} aria-label="Reiniciar cronômetro"><TimerReset size={15} /></button>}</div>
      </section>
      <section className="call-stepper" aria-label="Etapa do funil">{stages.map(([id, label], index) => <button type="button" key={id} className={stage === id ? "is-active" : index < currentStageIndex ? "is-passed" : ""} onClick={() => setStage(id)}><span>{index + 1}</span>{label}</button>)}</section>
      <div className="mobile-pane-tabs">{([['descobrir', 'Descobrir'], ['agir', 'Agir'], ['consultar', 'Consultar']] as Array<[MobilePane, string]>).map(([id, label]) => <button type="button" key={id} className={pane === id ? "is-active" : ""} onClick={() => setPane(id)}>{label}</button>)}</div>
      <main className="call-columns">
        <section className={`call-column discover-column ${pane === "descobrir" ? "mobile-visible" : ""}`}><ColumnHeading eyebrow="01 · DESCOBRIR" title="O que importa nesta decisão?" detail="Toque nos sinais que aparecerem durante a conversa." />
          <ChipGroup label="Finalidade" values={finalidades} value={discovery.finalidade} onChange={(value) => updateField("finalidade", value)} /><ChipGroup label="Faixa de valor" values={faixas} value={discovery.faixa} onChange={(value) => updateField("faixa", value)} /><ChipGroup label="Pagamento" values={pagamentos} value={discovery.pagamento} onChange={(value) => updateField("pagamento", value)} /><ChipGroup label="Prazo" values={prazos} value={discovery.prazo} onChange={(value) => updateField("prazo", value)} /><ChipGroup label="Cidade de interesse" values={cities} value={discovery.cidade} onChange={(value) => updateField("cidade", value)} /><ChipGroup label="Perfil" values={profiles} value={discovery.perfil} onChange={(value) => updateField("perfil", value)} /><ChipGroup label="Quem decide" values={decisionMakers} value={discovery.decisor} onChange={(value) => updateField("decisor", value)} /><ChipGroup label="Temperatura" values={temperatures} value={discovery.temperatura} onChange={(value) => updateField("temperatura", value)} /><ChipGroup label="Preferências" values={preferenceOptions} value={discovery.preferencias} onChange={togglePreference} multiple />
          <label className="short-note">Nota rápida<textarea value={discovery.nota} onChange={(event) => updateField("nota", event.target.value.slice(0, 280))} placeholder="Uma frase para não perder o contexto…" rows={3} /></label>
        </section>
        <section className={`call-column action-column ${pane === "agir" ? "mobile-visible" : ""}`}><ColumnHeading eyebrow="02 · AGIR" title="O próximo avanço" detail="Regras objetivas para não deixar a conversa cair no automático." />
          <div className="suggestion-card"><div className="suggestion-label"><Sparkles size={15} /> PRÓXIMA PERGUNTA SUGERIDA</div><p>{suggestedQuestion}</p><button type="button" className="secondary-action" onClick={() => setDiscovery((current) => ({ ...current, nota: current.nota ? `${current.nota} · Perguntar: ${suggestedQuestion}` : `Perguntar: ${suggestedQuestion}` }))}><Clipboard size={14} /> Registrar na nota</button></div>
          <div className="missing-card"><div><strong>Falta perguntar</strong><small>{missing.length ? "Antes de fechar, complete o essencial." : "O essencial já foi mapeado."}</small></div><div className="missing-list">{missing.length ? missing.map((item) => <span key={item}>{item}</span>) : <span className="complete"><Check size={13} /> descoberta consistente</span>}</div></div>
          <div className="commitments"><div className="section-kicker">DOIS MICROCOMPROMISSOS POSSÍVEIS</div><Commitment icon={<Video size={16} />} title="Videochamada de 15 minutos" onClick={() => setNextAction("Videochamada de 15 minutos")} selected={nextAction === "Videochamada de 15 minutos"} /><Commitment icon={<MapPin size={16} />} title="Visita com roteiro de comparação" onClick={() => setNextAction("Visita com roteiro de comparação")} selected={nextAction === "Visita com roteiro de comparação"} /><Commitment icon={<ArrowRight size={16} />} title="Simulação de fluxo" onClick={() => setNextAction("Simulação de fluxo")} selected={nextAction === "Simulação de fluxo"} /></div>
          {selectedClient && <button type="button" className="units-link" onClick={callUnits}><Database size={15} /> Ver unidades compatíveis <ChevronRight size={15} /></button>}
        </section>
        <section className={`call-column consult-column ${pane === "consultar" ? "mobile-visible" : ""}`}><ColumnHeading eyebrow="03 · CONSULTAR" title="Fale com naturalidade" detail="Busque uma ficha curta sem sair da ligação." /><div className="consult-search"><Search size={15} /><input value={consultQuery} onChange={(event) => setConsultQuery(event.target.value)} placeholder="Buscar ficha ou objeção…" /></div><div className="consult-results">{pinned.length > 0 && <div className="pinned-heading"><Pin size={13} /> Fixados durante a ligação</div>}{consultResults.filter((card) => pinned.includes(card.id)).map((card) => <ConsultCard key={`pinned-${card.id}`} card={card} pinned onToggle={() => setPinned((current) => current.filter((id) => id !== card.id))} />)}{consultResults.filter((card) => !pinned.includes(card.id)).map((card) => <ConsultCard key={card.id} card={card} pinned={false} onToggle={() => setPinned((current) => [...current, card.id])} />)}</div></section>
      </main>
      <button type="button" className="objection-fab" onClick={() => setObjectionSheet(true)}><MessageCircle size={17} /> Objeção!</button>
      {saveState && <div className={saveState.startsWith("Ligação") ? "call-status success" : "call-status"}>{saveState}</div>}
      <footer className="call-footer"><div><small className="call-eyebrow">QUANDO A CONVERSA AVANÇAR</small><strong>Encerre com contexto, não com promessa.</strong></div><button type="button" className="primary-action" onClick={() => setFinishOpen(true)}><PhoneCall size={15} /> Encerrar ligação</button></footer>
    </>}
    {objectionSheet && <div className="sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setObjectionSheet(false); }}><section className="objection-sheet" role="dialog" aria-modal="true"><div className="sheet-heading"><div><small className="call-eyebrow">RESPOSTAS DE BOLSO</small><h2>Qual objeção apareceu?</h2></div><button type="button" className="icon-button" onClick={() => setObjectionSheet(false)} aria-label="Fechar"><X size={18} /></button></div><div className="objection-chips">{objections.map((item) => <button type="button" key={item.id} onClick={() => { setConsultQuery(item.title); setObjectionSheet(false); setPane("consultar"); }}>{item.title}<ChevronRight size={15} /></button>)}</div></section></div>}
    {finishOpen && <div className="sheet-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setFinishOpen(false); }}><section className="finish-sheet" role="dialog" aria-modal="true"><div className="sheet-heading"><div><small className="call-eyebrow">ENCERRAMENTO</small><h2>Salvar o próximo passo</h2></div><button type="button" className="icon-button" onClick={() => setFinishOpen(false)} aria-label="Fechar"><X size={18} /></button></div><pre className="summary-preview">{summary}</pre><label className="finish-field">Próxima ação<select value={nextAction} onChange={(event) => setNextAction(event.target.value)}><option>Videochamada de 15 minutos</option><option>Visita com roteiro de comparação</option><option>Simulação de fluxo</option><option>Retorno de acompanhamento</option></select></label><label className="finish-field">Data do próximo contato<input type="datetime-local" value={nextContact} onChange={(event) => setNextContact(event.target.value)} /></label><div className="finish-actions"><button type="button" className="secondary-action" onClick={() => void copySummary()}><Copy size={14} /> {copied ? "Copiado" : "Copiar resumo"}</button><button type="button" className="primary-action" onClick={() => void finishCall()}><Check size={15} /> Salvar encerramento</button></div><small className="migration-note">O salvamento estruturado usa a migration `20261102160000_playbook_modo_ligacao.sql`, que está aguardando sua revisão e não foi aplicada.</small></section></div>}
  </div>;
}

function ColumnHeading({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) { return <div className="column-heading"><small className="call-eyebrow">{eyebrow}</small><h2>{title}</h2><p>{detail}</p></div>; }
function ChipGroup({ label, values, value, onChange, multiple = false }: { label: string; values: string[]; value: string | string[]; onChange: (value: string) => void; multiple?: boolean }) { return <div className="chip-group"><span>{label}</span><div>{values.map((item) => { const active = multiple ? (value as string[]).includes(item) : value === item; return <button type="button" key={item} className={active ? "is-selected" : ""} onClick={() => onChange(item)}>{active && <Check size={12} />}{item}</button>; })}</div></div>; }
function Commitment({ icon, title, selected, onClick }: { icon: ReactNode; title: string; selected: boolean; onClick: () => void }) { return <button type="button" className={selected ? "commitment is-selected" : "commitment"} onClick={onClick}><span>{icon}</span><strong>{title}</strong><ChevronRight size={15} /></button>; }
function ConsultCard({ card, pinned, onToggle }: { card: SearchCard; pinned: boolean; onToggle: () => void }) { return <article className={pinned ? "consult-card is-pinned" : "consult-card"}><div className="consult-card-top"><span className="card-category">{card.category}</span><button type="button" className="pin-button" onClick={onToggle} title={pinned ? "Desfixar" : "Fixar durante a ligação"}>{pinned ? <PinOff size={14} /> : <Pin size={14} />}</button></div><h3>{card.title}</h3><div><small>EM 30S</small><p>{card.quick}</p></div><div><small>COMO FALAR</small><p>{card.say}</p></div></article>; }
function PlaceholderTab({ tab }: { tab: Exclude<Tab, "ao-vivo"> }) { const labels: Record<Exclude<Tab, "ao-vivo">, [string, string]> = { especialista: ["Especialista", "As fichas de repertório entrarão aqui na próxima etapa."], objeções: ["Objeções", "A biblioteca de objeções será ampliada na Tarefa 3."], praças: ["Praças", "Guias de Penha, Piçarras, Barra Velha e demais cidades entrarão aqui."], construtoras: ["Construtoras", "Referências por construtora serão organizadas aqui, com dados oficiais."] }; const [title, description] = labels[tab]; return <section className="placeholder-tab"><Sparkles size={24} color="#c5a059" /><small className="call-eyebrow">EM PREPARAÇÃO</small><h2>{title}</h2><p>{description}</p><button type="button" className="secondary-action" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>Voltar para Ao vivo</button></section>; }
