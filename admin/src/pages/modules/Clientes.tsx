import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  BedDouble,
  Building2,
  Check,
  Copy,
  KeyRound,
  MessageCircle,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { parseStandardTypology } from "@/lib/realEstateStandard";
import CurrencyInput, { formatBRL, parseBRL } from "@/components/CurrencyInput";
import { r2PublicUrl } from "@/lib/r2Media";

type Client = {
  id: string;
  user_id?: string | null;
  acesso_portal?: boolean;
  acesso_expira_em?: string | null;
  nome: string;
  telefone?: string | null;
  email?: string | null;
  profissao?: string | null;
  cidade?: string | null;
  objetivo?: string | null;
  modo_apresentacao?: "moradia" | "investidor" | "renda" | "revenda";
  horizonte_investimento?: string | null;
  perfil_risco?: string | null;
  faixa_investimento?: number | null;
  entrada_disponivel?: number | null;
  capacidade_mensal?: number | null;
  aceita_baloes?: boolean | null;
  balao_maximo?: number | null;
  cidades_preferencia?: string[] | null;
  quartos_desejados?: number | null;
  suites_desejadas?: number | null;
  status?: string | null;
  proximo_contato?: string | null;
  observacoes?: string | null;
  aniversario_dia?: number | null;
  aniversario_mes?: number | null;
};
type Property = {
  id: string;
  nome?: string | null;
  cidade?: string | null;
  bairro?: string | null;
  status?: string | null;
  imagem_url?: string | null;
  descricao?: string | null;
  faixa_preco?: number | null;
  area_minima?: number | null;
  area_maxima?: number | null;
  numero_pavimentos?: number | null;
  caracteristicas?: Record<string, any> | null;
};
type Unit = {
  id: string;
  empreendimento_id: string;
  numero?: string | null;
  numero_unidade?: string | null;
  codigo?: string | null;
  codigo_unidade?: string | null;
  torre?: string | null;
  andar?: number | null;
  tipologia?: string | null;
  tipologia_dados?: Record<string, any> | null;
  valor?: number | null;
  valor_tabela?: number | null;
  area_privativa?: number | null;
  status?: string | null;
  entrada?: number | null;
  parcela?: number | null;
};
type Selection = {
  cliente_id: string;
  empreendimento_id: string;
  ordem: number;
  motivo?: string | null;
  visivel?: boolean;
  exibir_imagens?: boolean;
  exibir_descricao?: boolean;
  exibir_preco?: boolean;
  exibir_especificacoes?: boolean;
  exibir_investimento?: boolean;
  exibir_fluxo?: boolean;
  permitir_proposta?: boolean;
  mensagem_personalizada?: string | null;
  imagem_ids_selecionadas?: string[];
  unidade_ids_selecionadas?: string[];
  desconto_percentual?: number;
  condicoes_unidades?: Record<string, { desconto_valor?: number }>;
  observacao_comercial?: string | null;
  landing_layout?: "automatico" | "editorial" | "imersivo" | "investidor";
  apresentacao_modo?: "preferida" | "pdf" | "link" | "nenhuma";
  unidade_ids?: string[];
};
type CuradoriaMedia = { id:string; empreendimento_id:string; titulo?:string|null; categoria?:string|null; storage_path?:string|null; url?:string|null; preview_url?:string|null };
type PresentationOption = { empreendimento_id:string; titulo?:string|null; ativo:boolean; pdf_url?:string|null; storage_path?:string|null; link_url?:string|null; tipo_preferido?:"pdf"|"link" };
type ProposalPerson = { nome?: string; cpf?: string; telefone?: string; email?: string; profissao?: string; estado_civil?: string };
type ProposalDocument = { tipo: string; nome_original: string; mime_type: string; tamanho_bytes: number; storage_path: string; enviado_em?: string };
type ClientProposal = {
  id: string;
  cliente_id: number;
  empreendimento_id: string;
  entrada: number;
  parcela_mensal: number;
  balao: number;
  quantidade_baloes: number;
  mensagem?: string | null;
  status: string;
  created_at: string;
  cpf?: string | null;
  unidade_id?: string | null;
  valor_original?: number | null;
  valor_final?: number | null;
  fluxo_snapshot?: Record<string, any> | null;
  observacao_comercial?: string | null;
  dados_proponente?: ProposalPerson | null;
  dados_conjuge?: ProposalPerson | null;
  documentos?: ProposalDocument[] | null;
};
type BlogLead = { user_id:string; nome?:string|null; email:string; interesses?:string[]|null; status:string; criado_em:string; consentiu_contato?:boolean|null; consentimento_em?:string|null; consentimento_revogado_em?:string|null; blog_posts?:{ titulo?:string|null }|null };
type SiteOpportunityLead = { id:string; nome:string; telefone?:string|null; email?:string|null; objetivo?:string|null; codigo_oportunidade?:string|null; empreendimento_nome_interno?:string|null; oportunidade_publica_id?:string|null; criado_em:string; etapa?:string|null; notas?:string|null };
type Form = {
  nome: string;
  telefone: string;
  email: string;
  cidade: string;
  objetivo: string;
  modo_apresentacao: "moradia" | "investidor" | "renda" | "revenda";
  horizonte_investimento: string;
  perfil_risco: string;
  faixa_investimento: string;
  entrada_disponivel: string;
  capacidade_mensal: string;
  aceita_baloes: boolean;
  balao_maximo: string;
  cidades_preferencia: string;
  quartos_desejados: string;
  suites_desejadas: string;
  status: string;
  proximo_contato: string;
  observacoes: string;
  aniversario_dia: string;
  aniversario_mes: string;
};
const empty: Form = {
  nome: "",
  telefone: "",
  email: "",
  cidade: "",
  objetivo: "investimento",
  modo_apresentacao: "investidor",
  horizonte_investimento: "",
  perfil_risco: "",
  faixa_investimento: "",
  entrada_disponivel: "",
  capacidade_mensal: "",
  aceita_baloes: true,
  balao_maximo: "",
  cidades_preferencia: "",
  quartos_desejados: "",
  suites_desejadas: "",
  status: "novo",
  proximo_contato: "",
  observacoes: "",
  aniversario_dia: "",
  aniversario_mes: "",
};
const money = (value?: number | null) =>
  value
    ? new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)
    : "Não informado";
const panel = {
  background: "#101012",
  border: "1px solid #27272a",
  borderRadius: 11,
  padding: 16,
} as const;
const input = {
  width: "100%",
  boxSizing: "border-box",
  background: "#09090b",
  border: "1px solid #3f3f46",
  borderRadius: 7,
  padding: 10,
  color: "#fff",
} as const;
const button = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  background: "#c5a059",
  color: "#09090b",
  border: 0,
  borderRadius: 7,
  padding: "10px 13px",
  fontWeight: 800,
  cursor: "pointer",
} as const;
const phoneDigits = (value: string) =>
  value
    .replace(/\D/g, "")
    .replace(/^55(?=\d{10,11}$)/, "")
    .slice(0, 11);
const formatPhone = (value: string) => {
  const digits = phoneDigits(value);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 2)} ${digits.slice(2)}`;
  return `${digits.slice(0, 2)} ${digits.slice(2, 7)}-${digits.slice(7)}`;
};
const normalizePhone = (value: string) => `55${phoneDigits(value)}`;
const emailDomains = ["gmail.com", "hotmail.com", "outlook.com", "icloud.com"];
const monetaryFields = new Set<keyof Form>([
  "faixa_investimento",
  "entrada_disponivel",
  "capacidade_mensal",
  "balao_maximo",
]);
const privateCoverPrefix = "storage://empreendimentos/";
async function resolvePrivateCover(property: Property): Promise<Property> {
  if (property.imagem_url?.startsWith("r2://")) return { ...property, imagem_url: r2PublicUrl(property.imagem_url) };
  if (!property.imagem_url?.startsWith(privateCoverPrefix)) return property;
  const { data, error } = await supabase.storage
    .from("empreendimentos")
    .createSignedUrl(
      property.imagem_url.slice(privateCoverPrefix.length),
      3600,
    );
  return error || !data?.signedUrl
    ? { ...property, imagem_url: null }
    : { ...property, imagem_url: data.signedUrl };
}

export default function Clientes({
  onOpenFlow,
}: {
  onOpenFlow?: (unitIds: string[], clientId?: string) => void;
}) {
  const [items, setItems] = useState<Client[]>([]),
    [properties, setProperties] = useState<Property[]>([]),
    [selections, setSelections] = useState<Selection[]>([]),
    [units, setUnits] = useState<Unit[]>([]);
  const [proposals, setProposals] = useState<ClientProposal[]>([]);
  const [proposalView, setProposalView] = useState<ClientProposal | null>(null);
  const [lastProposalCount, setLastProposalCount] = useState<number | null>(null);
  const [documentDownloadBusy, setDocumentDownloadBusy] = useState<string | null>(null);
  const [blogLeads, setBlogLeads] = useState<BlogLead[]>([]);
  const [siteOpportunityLeads, setSiteOpportunityLeads] = useState<SiteOpportunityLead[]>([]);
  const [curadoriaMidias, setCuradoriaMidias] = useState<CuradoriaMedia[]>([]);
  const [presentationOptions, setPresentationOptions] = useState<Record<string, PresentationOption>>({});
  const [flowSelection, setFlowSelection] = useState<string[]>([]);
  const [form, setForm] = useState<Form>(empty),
    [query, setQuery] = useState(""),
    [open, setOpen] = useState(false),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState("");
  const [accessBusy, setAccessBusy] = useState<string | null>(null);
  const [unitQueries, setUnitQueries] = useState<Record<string, string>>({});
  const [credentials, setCredentials] = useState<{ nome: string; email: string; usuario: string; senha: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null),
    [curating, setCurating] = useState<Client | null>(null),
    [comparing, setComparing] = useState<Client | null>(null);

  useEffect(() => {
    if (!open && !curating && !comparing) return;
    const dismiss = () => {
      if (comparing) setComparing(null);
      else if (curating) setCurating(null);
      else setOpen(false);
    };
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismiss();
    };
    const outside = (event: MouseEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.style.position === "fixed" &&
        target.style.inset === "0px"
      )
        dismiss();
    };
    window.addEventListener("keydown", close);
    window.addEventListener("mousedown", outside);
    return () => {
      window.removeEventListener("keydown", close);
      window.removeEventListener("mousedown", outside);
    };
  }, [open, curating, comparing]);

  async function load() {
    const [c, p, s, u, cp, media, leads, opportunityLeads, presentationResult] = await Promise.all([
      supabase
        .from("clientes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("empreendimentos")
        .select(
          "id,nome,cidade,bairro,status,imagem_url,descricao,faixa_preco,area_minima,area_maxima,numero_pavimentos,caracteristicas,ativo",
        )
        .eq("ativo", true)
        .order("nome"),
      supabase.from("cliente_empreendimentos").select("*").order("ordem").limit(2000),
      supabase.from("unidades").select("*").limit(5000),
      supabase
        .from("cliente_propostas")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase.from("empreendimento_imagens").select("id,empreendimento_id,titulo,categoria,storage_path,url,ordem").order("ordem").limit(5000),
      supabase.from("blog_leads").select("user_id,nome,email,interesses,status,criado_em,consentiu_contato,consentimento_em,consentimento_revogado_em,blog_posts(titulo)").order("criado_em", { ascending:false }).limit(500),
      supabase.from("playbook_leads").select("id,nome,telefone,email,objetivo,codigo_oportunidade,empreendimento_nome_interno,oportunidade_publica_id,criado_em,etapa,notas").eq("origem", "site_oportunidade").order("criado_em", { ascending:false }).limit(40),
      supabase.from("apresentacoes").select("empreendimento_id,titulo,ativo,pdf_url,storage_path,link_url,tipo_preferido").limit(500),
    ]);
    if (c.error) {
      setMessage(`Não foi possível carregar os clientes: ${c.error.message}`);
    } else {
      setItems((c.data || []) as Client[]);
    }
    if (!p.error)
      setProperties(
        await Promise.all(
          ((p.data || []) as Property[]).map(resolvePrivateCover),
        ),
      );
    if (!s.error) setSelections((s.data || []) as Selection[]);
    if (!u.error) setUnits((u.data || []) as Unit[]);
    if (!presentationResult.error) {
      const byEnterprise: Record<string, PresentationOption> = {};
      ((presentationResult.data || []) as PresentationOption[]).forEach((presentation) => {
        if (presentation.empreendimento_id) byEnterprise[presentation.empreendimento_id] = presentation;
      });
      setPresentationOptions(byEnterprise);
    }
    if (!cp.error) {
      const nextProposals = (cp.data || []) as ClientProposal[];
      const nextNewCount = nextProposals.filter((item) => item.status === "nova").length;
      if (lastProposalCount !== null && nextNewCount > lastProposalCount && typeof Notification !== "undefined" && Notification.permission === "granted") {
        new Notification("Nova proposta recebida", { body: "Um cliente enviou uma nova simulação para análise." });
      }
      setLastProposalCount(nextNewCount);
      setProposals(nextProposals);
    }
    if (!leads.error) setBlogLeads((leads.data || []) as unknown as BlogLead[]);
    if (!opportunityLeads.error) setSiteOpportunityLeads((opportunityLeads.data || []) as SiteOpportunityLead[]);
    if (!media.error) {
      const signed = await Promise.all(((media.data || []) as CuradoriaMedia[]).map(async item => {
        if (!item.storage_path) return { ...item, preview_url:item.url };
        if (item.storage_path.startsWith("r2://")) return { ...item, preview_url:r2PublicUrl(item.storage_path) };
        const { data } = await supabase.storage.from("empreendimentos").createSignedUrl(item.storage_path,3600);
        return { ...item, preview_url:data?.signedUrl || undefined };
      }));
      setCuradoriaMidias(signed);
    }
  }
  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") void Notification.requestPermission().catch(() => undefined);
    void load();
    const timer = window.setInterval(() => void load(), 30000);
    return () => window.clearInterval(timer);
  }, []);
  const visible = useMemo(
    () =>
      items.filter((item) =>
        `${item.nome} ${item.telefone} ${item.email} ${item.cidade}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [items, query],
  );
  const selectedFor = (clientId: string) =>
    selections
      .filter((item) => item.cliente_id === clientId)
      .sort((a, b) => a.ordem - b.ordem);
  const propertiesFor = (clientId: string) =>
    selectedFor(clientId)
      .map((selection) =>
        properties.find((item) => item.id === selection.empreendimento_id),
      )
      .filter(Boolean) as Property[];
  const update = (key: keyof Form, value: string | boolean) =>
    setForm((old) => ({ ...old, [key]: value }));
  const edit = (item: Client) => {
    setMessage("");
    setEditingId(item.id);
    setForm({
      nome: item.nome,
      telefone: formatPhone(item.telefone || ""),
      email: item.email || "",
      cidade: item.cidade || "",
      objetivo: item.objetivo || "investimento",
      modo_apresentacao: item.modo_apresentacao || "investidor",
      horizonte_investimento: item.horizonte_investimento || "",
      perfil_risco: item.perfil_risco || "",
      faixa_investimento: item.faixa_investimento
        ? formatBRL(item.faixa_investimento)
        : "",
      entrada_disponivel: item.entrada_disponivel
        ? formatBRL(item.entrada_disponivel)
        : "",
      capacidade_mensal: item.capacidade_mensal
        ? formatBRL(item.capacidade_mensal)
        : "",
      aceita_baloes: Boolean(item.aceita_baloes || item.balao_maximo),
      balao_maximo: item.balao_maximo ? formatBRL(item.balao_maximo) : "",
      cidades_preferencia: (item.cidades_preferencia || []).join(", "),
      quartos_desejados: String(item.quartos_desejados || ""),
      suites_desejadas: String(item.suites_desejadas || ""),
      status: item.status || "novo",
      proximo_contato: item.proximo_contato || "",
      observacoes: item.observacoes || "",
      aniversario_dia: item.aniversario_dia ? String(item.aniversario_dia) : "",
      aniversario_mes: item.aniversario_mes ? String(item.aniversario_mes) : "",
    });
    setOpen(true);
  };
  const remove = async (item: Client) => {
    if (!confirm(`Excluir o cliente ${item.nome}?`)) return;
    const { error } = await supabase
      .from("clientes")
      .delete()
      .eq("id", item.id);
    setMessage(error?.message || "Cliente excluído.");
    if (!error) void load();
  };
  async function generateClientAccess(item: Client) {
    if (!item.email) return setMessage("Cadastre um e-mail para gerar o acesso.");
    setAccessBusy(String(item.id));
    setCredentials(null);
    setMessage("");
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Sessão expirada. Entre novamente no painel.");
      const { data, error } = await supabase.functions.invoke("gerenciar-acesso", {
        headers: { Authorization: `Bearer ${sessionData.session.access_token}` },
        body: {
          nome: item.nome,
          email: item.email,
          tipo: "cliente",
          usuario: "",
          aniversario_dia: item.aniversario_dia || 1,
          aniversario_mes: item.aniversario_mes || 1,
        },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || "Não foi possível gerar o acesso.");
      setCredentials({ nome: item.nome, email: data.email || item.email, usuario: data.usuario || "", senha: data.temporary_password || "" });
      setMessage(item.user_id ? "Nova senha temporária gerada. Copie e envie agora; ela não ficará armazenada no painel." : "Acesso criado e vinculado à cliente. Copie e envie as credenciais agora.");
      void load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível gerar o acesso.");
    } finally {
      setAccessBusy(null);
    }
  }
  async function copyCredentials() {
    if (!credentials) return;
    await navigator.clipboard.writeText(`Acesso à plataforma Luan Especialista\nE-mail: ${credentials.email}\nUsuário: ${credentials.usuario}\nSenha temporária: ${credentials.senha}\nAcesse: ${window.location.origin}/painel/`);
    setMessage("Credenciais copiadas. Envie-as à cliente e recomende a troca da senha após o primeiro acesso.");
  }

  const setAccess = async (item: Client, active: boolean) => {
    const client = await supabase
      .from("clientes")
      .update({ acesso_portal: active })
      .eq("id", item.id);
    if (!client.error && item.user_id)
      await supabase
        .from("perfis_usuario")
        .update({ ativo: active, perfil: "cliente" })
        .eq("user_id", item.user_id);
    setMessage(
      client.error?.message || `Acesso ${active ? "ativado" : "bloqueado"}.`,
    );
    void load();
  };
  async function updateAccessExpiry(item: Client, value: string) {
    const expiration = value ? new Date(value).toISOString() : null;
    if (expiration && new Date(expiration) <= new Date()) return setMessage("A expiração precisa estar no futuro.");
    const { error } = await supabase.from("clientes").update({ acesso_expira_em: expiration }).eq("id", item.id);
    if (error) setMessage(`Não foi possível salvar a expiração: ${error.message}`);
    else { setMessage(expiration ? "Expiração salva." : "Expiração removida; o acesso não tem prazo."); void load(); }
  }
  const localDateTimeValue = (value?: string | null) => {
    if (!value) return "";
    const date = new Date(value);
    const pad = (part: number) => String(part).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  async function save() {
    if (!form.nome.trim()) return setMessage("Informe o nome do cliente.");
    const birthdayDay=Number(form.aniversario_dia),birthdayMonth=Number(form.aniversario_mes);
    if(birthdayMonth<1||birthdayMonth>12||birthdayDay<1||birthdayDay>new Date(2000,birthdayMonth,0).getDate())return setMessage("Informe o dia e o mês de aniversário do cliente.");
    if (form.telefone && phoneDigits(form.telefone).length < 10)
      return setMessage(
        "Informe o WhatsApp com DDD, por exemplo: 47 99999-9999.",
      );
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return setMessage("Informe um e-mail válido.");
    setSaving(true);
    const balloonValue = parseBRL(form.balao_maximo) || null;
    const payload = {
      nome: form.nome.trim(),
      telefone: formatPhone(form.telefone) || null,
      email: form.email.trim().toLowerCase() || null,
      cidade: form.cidade.trim() || null,
      objetivo: form.objetivo,
      modo_apresentacao: form.modo_apresentacao,
      horizonte_investimento: form.horizonte_investimento || null,
      perfil_risco: form.perfil_risco || null,
      faixa_investimento: parseBRL(form.faixa_investimento) || null,
      entrada_disponivel: parseBRL(form.entrada_disponivel) || null,
      capacidade_mensal: parseBRL(form.capacidade_mensal) || null,
      aceita_baloes: form.aceita_baloes || Boolean(balloonValue),
      balao_maximo: balloonValue,
      quartos_desejados: Number(form.quartos_desejados) || null,
      suites_desejadas: Number(form.suites_desejadas) || null,
      status: form.status,
      proximo_contato: form.proximo_contato || null,
      observacoes: form.observacoes.trim() || null,
      aniversario_dia: Number(form.aniversario_dia) || null,
      aniversario_mes: Number(form.aniversario_mes) || null,
    };
    const preferences = form.cidades_preferencia
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
    const completePayload = { ...payload, cidades_preferencia: preferences };
    const result = editingId
      ? await supabase
          .from("clientes")
          .update(completePayload)
          .eq("id", editingId)
      : await supabase.from("clientes").insert(completePayload);
    setSaving(false);
    if (result.error)
      setMessage(`Não foi possível salvar: ${result.error.message}`);
    else {
      setEditingId(null);
      setForm(empty);
      setOpen(false);
      setMessage("Cliente salvo com sucesso.");
      void load();
    }
  }
  const selectEmailDomain = (domain: string) => {
    const local = form.email.split("@")[0].trim();
    update("email", local ? `${local}@${domain}` : `@${domain}`);
  };
  async function toggleProperty(client: Client, property: Property) {
    const current = selectedFor(client.id),
      existing = current.find((item) => item.empreendimento_id === property.id);
    if (existing) {
      const { error } = await supabase
        .from("cliente_empreendimentos")
        .delete()
        .eq("cliente_id", client.id)
        .eq("empreendimento_id", property.id);
      if (error) return setMessage(error.message);
    } else {
      if (current.length >= 4)
        return setMessage(
          "A comparação aceita no máximo quatro empreendimentos.",
        );
      const used = new Set(current.map((item) => item.ordem));
      const nextOrder = [1, 2, 3, 4].find((value) => !used.has(value)) || 4;
      const { error } = await supabase
        .from("cliente_empreendimentos")
        .insert({
          cliente_id: client.id,
          empreendimento_id: property.id,
          ordem: nextOrder,
          motivo: "Selecionado para a curadoria do cliente",
          exibir_imagens: false,
          exibir_descricao: false,
          exibir_preco: false,
          exibir_especificacoes: false,
          exibir_investimento: false,
          exibir_fluxo: false,
          permitir_proposta: false,
          imagem_ids_selecionadas: [],
          landing_layout: "automatico",
        });
      if (error) return setMessage(error.message);
    }
    setMessage("");
    void load();
  }
  async function updateSelection(
    clientId: string,
    propertyId: string,
    patch: Partial<Selection>,
  ) {
    const selectionPatch: Partial<Selection> = { ...patch };
    const selectedUnitIds = Array.isArray(patch.unidade_ids_selecionadas)
      ? patch.unidade_ids_selecionadas
      : Array.isArray(patch.unidade_ids)
        ? patch.unidade_ids
        : null;
    if (selectedUnitIds !== null) {
      const synchronizedUnitIds = [...new Set(selectedUnitIds)];
      selectionPatch.unidade_ids = synchronizedUnitIds;
      selectionPatch.unidade_ids_selecionadas = synchronizedUnitIds;
    }
    const { error } = await supabase
      .from("cliente_empreendimentos")
      .update({ ...selectionPatch, updated_at: new Date().toISOString() })
      .eq("cliente_id", clientId)
      .eq("empreendimento_id", propertyId);
    if (error)
      setMessage(`Não foi possível salvar a liberação: ${error.message}`);
    else {
      setSelections((current) =>
        current.map((item) =>
          item.cliente_id === clientId && item.empreendimento_id === propertyId
            ? { ...item, ...selectionPatch }
            : item,
        ),
      );
      setMessage("Conteúdo autorizado atualizado.");
    }
  }
  async function updateProposal(id: string, status: string) {
    const { error } = await supabase
      .from("cliente_propostas")
      .update({ status, updated_at: new Date().toISOString() })
      .eq("id", id);
    setMessage(error?.message || "Situação da proposta atualizada.");
    if (!error) void load();
  }
  async function downloadProposalDocument(file: ProposalDocument) {
    setDocumentDownloadBusy(file.storage_path);
    try {
      const { data, error } = await supabase.storage
        .from("cliente-propostas")
        .createSignedUrl(file.storage_path, 300, { download: file.nome_original || true });
      if (error || !data?.signedUrl) {
        setMessage(`Não foi possível preparar o download: ${error?.message || "arquivo indisponível"}`);
        return;
      }
      const link = document.createElement("a");
      link.href = data.signedUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.download = file.nome_original || "documento-proposta";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch {
      setMessage("Não foi possível preparar o download. Atualize a tela e tente novamente.");
    } finally {
      setDocumentDownloadBusy(null);
    }
  }

  return (
    <div style={{ color: "#f4f4f5", display: "grid", gap: 14 }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "end",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 24 }}>Clientes & Curadoria</h1>
          <p style={{ color: "#8b8b95", margin: "5px 0 0", fontSize: 12 }}>
            Perfil financeiro, preferências e até quatro empreendimentos
            comparáveis.
          </p>
        </div>
        <button
          style={button}
          onClick={() => {
            setEditingId(null);
            setForm(empty);
            setOpen(true);
          }}
        >
          <Plus size={16} />
          Novo cliente
        </button>
      </header>
      {message && (
        <div style={{ ...panel, borderColor: "#854d0e", color: "#fbbf24" }}>
          {message}
        </div>
      )}
      {credentials && (
        <section style={{ ...panel, borderColor: "#166534", background: "#0d1b12" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div><strong style={{ color: "#bbf7d0" }}>Credenciais de {credentials.nome}</strong><small style={{ display: "block", color: "#86efac", marginTop: 4 }}>A senha é exibida somente agora. Copie antes de fechar ou atualizar a tela.</small></div>
            <button style={{ ...button, background: "#86efac", color: "#052e16" }} onClick={() => void copyCredentials()}><Copy size={15} /> Copiar mensagem completa</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 8, marginTop: 12 }}>
            <input readOnly value={credentials.email} style={input} aria-label="E-mail de acesso" />
            <input readOnly value={credentials.usuario} style={input} aria-label="Usuário de acesso" />
            <input readOnly value={credentials.senha} style={{ ...input, fontFamily: "monospace" }} aria-label="Senha temporária" />
          </div>
        </section>
      )}
      {proposals.some((item) => item.status === "nova") && <section style={{ ...panel, borderColor: "#c5a059", background: "#1c160b", color: "#f5e0b2" }}><strong>Nova proposta recebida</strong><span style={{ display: "block", marginTop: 4, fontSize: 12, color: "#d4d4d8" }}>A cliente enviou uma simulação. Abra a proposta para consultar os valores e imprimir a ficha formal.</span></section>}
      {siteOpportunityLeads.length > 0 && <details style={{...panel,borderColor:"#8a6a2e"}} open><summary style={{cursor:"pointer",fontWeight:800,color:"#edcf91"}}>Solicitações de conversa ({siteOpportunityLeads.length})</summary><div style={{display:"grid",gap:9,marginTop:12}}>{siteOpportunityLeads.map((lead)=><article key={lead.id} style={{border:"1px solid #4a3a20",borderRadius:8,padding:11,background:"#15120d"}}><div style={{display:"flex",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}><strong>Solicitação de {lead.nome}</strong><span style={{color:"#edcf91",fontSize:12}}>{lead.empreendimento_nome_interno || "Oportunidade selecionada"}</span></div><small style={{display:"block",color:"#a1a1aa",marginTop:4}}>{lead.telefone || "Sem telefone"}{lead.email ? ` · ${lead.email}` : ""} · {new Date(lead.criado_em).toLocaleString("pt-BR")}</small>{lead.objetivo && <p style={{fontSize:12,color:"#d4d4d8",margin:"8px 0 0"}}>Objetivo: {lead.objetivo}</p>}<small style={{display:"block",color:"#888",marginTop:7}}>A oportunidade clicada foi vinculada internamente ao cadastro.</small></article>)}</div></details>}
      {blogLeads.length > 0 && <details style={panel} open><summary style={{cursor:"pointer",fontWeight:800,color:"#edcf91"}}>Leads identificados pelo Blog ({blogLeads.length})</summary><div style={{display:"grid",gap:9,marginTop:12}}>{blogLeads.map((lead)=><article key={lead.user_id} style={{border:"1px solid #303036",borderRadius:8,padding:11}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,flexWrap:"wrap"}}><strong>{lead.nome || "Leitor identificado"}</strong><span style={{color:lead.consentiu_contato?"#9bd4ac":"#a1a1aa",fontSize:11}}>{lead.consentiu_contato?"Autorizou contato":"Sem autorização para contato"}</span></div><small style={{display:"block",color:"#a1a1aa",marginTop:4}}>{lead.email}{lead.blog_posts?.titulo ? ` · Origem: ${lead.blog_posts.titulo}` : ""}</small>{lead.interesses?.length ? <p style={{fontSize:12,color:"#d4d4d8",marginBottom:0}}>Interesses: {lead.interesses.join(" · ")}</p> : <small style={{color:"#71717a"}}>Ainda não informou interesses.</small>}</article>)}</div></details>}
      {proposals.length > 0 && (
        <details style={panel} open>
          <summary
            style={{ cursor: "pointer", fontWeight: 800, color: "#edcf91" }}
          >
            Propostas enviadas pelos clientes (
            {proposals.filter((item) => item.status === "nova").length} nova(s))
          </summary>
          <div style={{ display: "grid", gap: 9, marginTop: 12 }}>
            {proposals.slice(0, 12).map((proposal) => {
              const client = items.find(
                (item) => Number(item.id) === proposal.cliente_id,
              );
              const property = properties.find(
                (item) => item.id === proposal.empreendimento_id,
              );
              return (
                <article
                  key={proposal.id}
                  style={{
                    border: `1px solid ${proposal.status === "nova" ? "#c5a059" : "#303036"}`,
                    borderRadius: 8,
                    padding: 11,
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 10,
                  }}
                >
                  <div>
                    <strong>
                      {client?.nome || "Cliente"} ·{" "}
                      {property?.nome || proposal.empreendimento_id}
                    </strong>
                    <small
                      style={{
                        display: "block",
                        color: "#a1a1aa",
                        marginTop: 4,
                      }}
                    >
                      Entrada {money(proposal.entrada)} · Mensais{" "}
                      {money(proposal.parcela_mensal)}
                      {proposal.quantidade_baloes
                        ? ` · ${proposal.quantidade_baloes} balão(ões) de ${money(proposal.balao)}`
                        : ""}
                    </small>
                    {proposal.mensagem && (
                      <p style={{ fontSize: 12, color: "#d4d4d8" }}>
                        {proposal.mensagem}
                      </p>
                    )}
                    <button type="button" onClick={() => setProposalView(proposal)} style={{ ...button, marginTop: 8, fontSize: 11, background: "#c5a059", color: "#09090b" }}>Ver proposta formal</button>
                    <small style={{ display: "block", color: "#a1a1aa", marginTop: 5 }}>{proposal.documentos?.length || 0} documento(s) anexado(s)</small>
                  </div>
                  <select
                    value={proposal.status}
                    onChange={(event) =>
                      void updateProposal(proposal.id, event.target.value)
                    }
                    style={{ ...input, width: 150 }}
                  >
                    <option value="nova">Nova</option>
                    <option value="em_analise">Em análise</option>
                    <option value="contraproposta">Contraproposta</option>
                    <option value="aceita">Aceita</option>
                    <option value="recusada">Recusada</option>
                  </select>
                </article>
              );
            })}
          </div>
        </details>
      )}
      {proposalView && (() => {
        const client = items.find((item) => Number(item.id) === proposalView.cliente_id);
        const property = properties.find((item) => item.id === proposalView.empreendimento_id);
        const unit = units.find((item) => item.id === proposalView.unidade_id);
        const applicant = proposalView.dados_proponente || {};
        const spouse = proposalView.dados_conjuge;
        const snapshot = proposalView.fluxo_snapshot || {};
        const values = snapshot.valores || {};
        const files = proposalView.documentos || [];
        const tablePrice = Number(snapshot.valor_tabela ?? proposalView.valor_original ?? 0);
        const finalPrice = Number(proposalView.valor_final ?? snapshot.total ?? 0);
        const discountValue = Number(snapshot.desconto_negociado ?? Math.max(0, tablePrice - finalPrice));
        const civilLabels: Record<string, string> = { solteiro: "Solteiro(a)", casado_civil: "Casado(a) no civil", uniao_estavel: "União estável", divorciado: "Divorciado(a)", viuvo: "Viúvo(a)" };
        const documentLabels: Record<string, string> = { identificacao: "Identidade do proponente", comprovante_residencia: "Comprovante de residência", certidao_casamento: "Certidão de casamento", identificacao_conjuge: "Identidade do cônjuge" };
        return <div className="client-proposal-overlay" style={{ position: "fixed", inset: 0, zIndex: 7000, background: "rgba(0,0,0,.82)", padding: 14, overflow: "auto" }}>
          <section className="client-proposal-no-print" style={{ ...panel, maxWidth: 820, margin: "20px auto", background: "#111113", color: "#fff", padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}><div><strong>Documentos recebidos ({files.length})</strong><small style={{ display: "block", color: "#a1a1aa", marginTop: 4 }}>Os arquivos estão em bucket privado. Os links de download expiram após 5 minutos.</small></div><button type="button" onClick={() => setProposalView(null)} style={{ background: "#27272a", color: "#fff", border: 0, padding: 9, cursor: "pointer", borderRadius: 6 }}>Fechar</button></div>
            {files.length ? <div style={{ display: "grid", gap: 8, marginTop: 12 }}>{files.map((file) => <div key={file.storage_path} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap", padding: 10, border: "1px solid #303036", borderRadius: 7 }}><span><strong style={{ display: "block", fontSize: 12 }}>{documentLabels[file.tipo] || "Documento"}</strong><small style={{ color: "#a1a1aa" }}>{file.nome_original} · {(file.tamanho_bytes / 1024 / 1024).toFixed(1)} MB</small></span><button type="button" disabled={documentDownloadBusy === file.storage_path} onClick={() => void downloadProposalDocument(file)} style={{ ...button, background: "#d7ab63", color: "#09090b", opacity: documentDownloadBusy === file.storage_path ? .65 : 1 }}>{documentDownloadBusy === file.storage_path ? "Preparando…" : "Baixar documento"}</button></div>)}</div> : <p style={{ color: "#a1a1aa", fontSize: 13 }}>Nenhum documento foi anexado a esta proposta.</p>}
          </section>
          <section className="client-proposal-print" style={{ ...panel, maxWidth: 820, margin: "20px auto", background: "#fff", color: "#161616", padding: 32 }}>
            <div className="client-proposal-no-print" style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginBottom: 14 }}><button type="button" onClick={() => window.print()} style={{ ...button, background: "#161616", color: "#fff" }}>Imprimir / salvar proposta em PDF</button></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start" }}><div><small style={{ letterSpacing: ".14em", color: "#8a6a2e", fontWeight: 800 }}>LUAN ESPECIALISTA</small><h1 style={{ margin: "8px 0 4px", fontSize: 25 }}>Resumo da proposta comercial</h1><p style={{ margin: 0, color: "#555" }}>Manifestação de interesse enviada pelo cliente para análise.</p></div><span style={{ fontSize: 11, color: "#666", textAlign: "right" }}>Proposta {proposalView.id.slice(0, 8).toUpperCase()}<br />{new Date(proposalView.created_at).toLocaleDateString("pt-BR")}</span></div>
            <p style={{ margin: "18px 0 0", padding: 10, border: "1px solid #e6d7b8", background: "#fbf7ee", fontSize: 11, lineHeight: 1.5 }}>Documento informativo gerado a partir da simulação do cliente. Não constitui contrato, reserva, aprovação de crédito ou garantia de preço e disponibilidade. Condições sujeitas à validação do especialista e da construtora.</p>
            <hr style={{ margin: "20px 0", border: 0, borderTop: "1px solid #ddd" }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 16, fontSize: 13 }}><div><b>Proponente</b><div>{applicant.nome || client?.nome || "Não informado"}</div><div>CPF: {applicant.cpf || proposalView.cpf || "Não informado"}</div><div>{applicant.telefone || client?.telefone || "—"} · {applicant.email || client?.email || "—"}</div><div>Profissão: {applicant.profissao || client?.profissao || "Não informada"}</div><div>Estado civil: {civilLabels[applicant.estado_civil || ""] || "Não informado"}</div></div><div><b>Empreendimento</b><div>{property?.nome || proposalView.empreendimento_id}</div><div>Unidade: {unit ? `${unit.codigo_unidade || unit.numero_unidade || unit.numero || unit.id}${unit.torre ? ` · Torre ${unit.torre}` : ""}` : "Não informada"}</div><div>Status da análise: {proposalView.status}</div><div>Valor de tabela: {money(tablePrice)}</div><div>Desconto negociado: {money(discountValue)}</div><strong>Valor final simulado: {money(finalPrice)}</strong></div></div>
            {spouse && <section style={{ marginTop: 18, padding: 12, background: "#f7f7f7", fontSize: 13 }}><b>Dados do cônjuge</b><div>{spouse.nome}</div><div>CPF: {spouse.cpf || "—"}</div><div>{spouse.telefone || "—"} · {spouse.email || "—"}</div><div>Profissão: {spouse.profissao || "Não informada"}</div></section>}
            <h3 style={{ margin: "22px 0 10px" }}>Condições e cronograma propostos</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 9, fontSize: 13 }}>
              <div style={{ padding: 11, background: "#f5f5f5" }}>Entrada<strong style={{ display: "block", marginTop: 4 }}>{money(proposalView.entrada)}</strong></div>
              <div style={{ padding: 11, background: "#f5f5f5" }}>Parcelas até as chaves<strong style={{ display: "block", marginTop: 4 }}>{Number(values.parcelas_ate_chaves || 0)} × {money(Number(values.parcela ?? proposalView.parcela_mensal))}</strong></div>
              <div style={{ padding: 11, background: "#f5f5f5" }}>Balões até as chaves<strong style={{ display: "block", marginTop: 4 }}>{Number(values.baloes_ate_chaves || proposalView.quantidade_baloes || 0)} × {money(Number(values.balao ?? proposalView.balao))}</strong></div>
              <div style={{ padding: 11, background: "#f5f5f5" }}>Valor nas chaves<strong style={{ display: "block", marginTop: 4 }}>{money(Number(values.nas_chaves || 0))}</strong></div>
              {Number(values.parcelas_pos_chaves || 0) > 0 && <div style={{ padding: 11, background: "#f5f5f5" }}>Pós-chaves — parcelas<strong style={{ display: "block", marginTop: 4 }}>{Number(values.parcelas_pos_chaves)} × {money(Number(values.parcela_pos_chaves || 0))}</strong></div>}
              {Number(values.baloes_pos_chaves || 0) > 0 && <div style={{ padding: 11, background: "#f5f5f5" }}>Pós-chaves — balões<strong style={{ display: "block", marginTop: 4 }}>{Number(values.baloes_pos_chaves)} × {money(Number(values.balao_pos_chaves || 0))}</strong></div>}
              <div style={{ padding: 11, background: "#efe7d7" }}>Total da simulação<strong style={{ display: "block", marginTop: 4 }}>{money(Number(snapshot.total || finalPrice))}</strong></div>
            </div>
            <p style={{ marginTop: 20, color: "#444", minHeight: 34 }}><b>Observações do cliente:</b> {proposalView.mensagem || "Sem observações adicionais."}</p>
            {proposalView.observacao_comercial && <p style={{ color: "#444", fontSize: 12 }}><b>Observação comercial interna:</b> {proposalView.observacao_comercial}</p>}
            <div style={{ display: "grid", gridTemplateColumns: spouse ? "repeat(3,minmax(0,1fr))" : "repeat(2,minmax(0,1fr))", gap: 28, marginTop: 42, fontSize: 11, textAlign: "center" }}><div style={{ borderTop: "1px solid #333", paddingTop: 7 }}>Luan Especialista<br /><small>Responsável pela análise</small></div><div style={{ borderTop: "1px solid #333", paddingTop: 7 }}>{applicant.nome || client?.nome || "Proponente"}<br /><small>Proponente · CPF {applicant.cpf || proposalView.cpf || "—"}</small></div>{spouse && <div style={{ borderTop: "1px solid #333", paddingTop: 7 }}>{spouse.nome}<br /><small>Cônjuge · CPF {spouse.cpf || "—"}</small></div>}</div>
          </section>
        </div>;
      })()}
      <section style={panel}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Search size={16} color="#71717a" />
          <input
            type="search"
            name="clientes-search"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome, telefone, e-mail ou cidade"
            style={input}
          />
        </div>
      </section>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))",
          gap: 12,
        }}
      >
        {visible.map((item) => {
          const count = selectedFor(item.id).length;
          return (
            <article key={item.id} style={panel}>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <UserRound size={19} color="#c5a059" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <strong>{item.nome}</strong>
                  <small
                    style={{ display: "block", color: "#8b8b95", marginTop: 3 }}
                  >
                    {item.cidade || "Cidade não informada"}
                  </small>
                </div>
                <button onClick={() => edit(item)} title="Editar">
                  <Pencil size={14} />
                </button>
                <button onClick={() => void remove(item)} title="Excluir">
                  <Trash2 size={14} />
                </button>
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 7,
                  marginTop: 11,
                  flexWrap: "wrap",
                }}
              >
                {item.telefone && (
                  <a
                    href={`https://wa.me/${normalizePhone(item.telefone)}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      ...button,
                      padding: "7px 9px",
                      fontSize: 11,
                      textDecoration: "none",
                      background: "#14532d",
                      color: "#dcfce7",
                    }}
                  >
                    <MessageCircle size={14} />
                    WhatsApp
                  </a>
                )}
                {item.email && (
                  <a
                    href={`mailto:${item.email}`}
                    style={{
                      color: "#c5a059",
                      fontSize: 11,
                      alignSelf: "center",
                    }}
                  >
                    {item.email}
                  </a>
                )}
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 9,
                  marginTop: 14,
                  fontSize: 12,
                }}
              >
                <span style={{ color: "#8b8b95" }}>
                  Imóvel desejado
                  <strong
                    style={{ display: "block", color: "#fff", marginTop: 3 }}
                  >
                    {money(item.faixa_investimento)}
                  </strong>
                </span>
                <span style={{ color: "#8b8b95" }}>
                  Entrada
                  <strong
                    style={{ display: "block", color: "#fff", marginTop: 3 }}
                  >
                    {money(item.entrada_disponivel)}
                  </strong>
                </span>
                <span style={{ color: "#8b8b95" }}>
                  Parcela
                  <strong
                    style={{ display: "block", color: "#fff", marginTop: 3 }}
                  >
                    {money(item.capacidade_mensal)}
                  </strong>
                </span>
                <span style={{ color: "#8b8b95" }}>
                  Balão
                  <strong
                    style={{ display: "block", color: "#fff", marginTop: 3 }}
                  >
                    {item.aceita_baloes
                      ? money(item.balao_maximo)
                      : "Não informado"}
                  </strong>
                </span>
              </div>
              <div
                style={{
                  marginTop: 12,
                  paddingTop: 12,
                  borderTop: "1px solid #27272a",
                  display: "flex",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <button
                  onClick={() => void generateClientAccess(item)}
                  disabled={accessBusy === String(item.id) || !item.email}
                  style={{ ...button, background: "#c5a059", color: "#09090b", fontSize: 11, opacity: accessBusy === String(item.id) || !item.email ? 0.55 : 1 }}
                  title={!item.email ? "Cadastre um e-mail primeiro" : "Gerar credenciais de acesso"}
                >
                  <KeyRound size={14} /> {accessBusy === String(item.id) ? "Gerando..." : item.user_id ? "Nova senha" : "Gerar acesso"}
                </button>
                {item.user_id && (
                  <button
                    onClick={() => void setAccess(item, !item.acesso_portal)}
                    style={{
                      ...button,
                      background: item.acesso_portal ? "#14532d" : "#3f1d22",
                      color: item.acesso_portal ? "#dcfce7" : "#fecaca",
                      fontSize: 11,
                    }}
                  >
                    {item.acesso_portal ? "Acesso ativo" : "Acesso bloqueado"}
                  </button>
                )}
                {item.user_id && (
                  <label style={{ display: "grid", gap: 4, minWidth: 220, color: "#a1a1aa", fontSize: 11 }}>
                    Expiração do acesso (data e hora)
                    <input type="datetime-local" value={localDateTimeValue(item.acesso_expira_em)} onChange={(event) => void updateAccessExpiry(item, event.target.value)} style={{ ...input, padding: "7px 8px", fontSize: 11 }} title="Deixe vazio para acesso sem prazo" />
                    <small style={{ color: item.acesso_expira_em && new Date(item.acesso_expira_em) <= new Date() ? "#fca5a5" : "#86efac" }}>
                      {item.acesso_expira_em ? `Expira em ${new Date(item.acesso_expira_em).toLocaleString("pt-BR")}` : "Sem expiração definida"}
                    </small>
                  </label>
                )}
                <button
                  onClick={() => setCurating(item)}
                  style={{
                    ...button,
                    background: "#27272a",
                    color: "#fff",
                    fontSize: 11,
                  }}
                >
                  <Plus size={14} />
                  Selecionar imóveis ({count}/4)
                </button>
                {count > 0 && (
                  <button
                    onClick={() => setComparing(item)}
                    style={{ ...button, fontSize: 11 }}
                  >
                    <BarChart3 size={14} />
                    Comparar
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {open && (
        <div
          onKeyDown={(event) => {
            if (event.key === "Escape") setOpen(false);
          }}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 5000,
            background: "rgba(0,0,0,.78)",
            display: "grid",
            placeItems: "center",
            padding: 12,
          }}
        >
          <section
            style={{
              ...panel,
              width: "min(800px,100%)",
              maxHeight: "92dvh",
              overflow: "auto",
            }}
          >
            <style>{`@media(max-width:600px){.client-form-grid{grid-template-columns:1fr !important}.client-email-presets{grid-column:auto !important}}`}</style>
            <header
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 14,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 18 }}>
                {editingId ? "Editar cliente" : "Novo cliente"}
              </h2>
              <button
                onClick={() => setOpen(false)}
                style={{ background: "none", border: 0, color: "#aaa" }}
              >
                <X />
              </button>
            </header>
            <div
              className="client-form-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2,minmax(0,1fr))",
                gap: 11,
              }}
            >
              {(
                [
                  ["nome", "Nome *", "text"],
                  ["telefone", "Telefone / WhatsApp", "tel"],
                  ["email", "E-mail", "email"],
                  ["aniversario_dia", "Dia do aniversário", "number"],
                  ["aniversario_mes", "Mês do aniversário", "number"],
                  ["cidade", "Cidade onde mora", "text"],
                  ["quartos_desejados", "Dormitórios desejados", "number"],
                  ["suites_desejadas", "Suítes desejadas", "number"],
                  ["faixa_investimento", "Valor do imóvel desejado", "text"],
                  ["entrada_disponivel", "Entrada disponível", "text"],
                  ["capacidade_mensal", "Parcela mensal confortável", "text"],
                  ["balao_maximo", "Balão máximo", "text"],
                  ["proximo_contato", "Próximo contato", "date"],
                ] as Array<[keyof Form, string, string]>
              ).map(([key, label, type]) => (
                <label key={key} style={{ color: "#a1a1aa", fontSize: 12 }}>
                  {label}
                  <input
                    type={type}
                    inputMode={
                      monetaryFields.has(key)
                        ? "numeric"
                        : key === "telefone"
                          ? "tel"
                          : undefined
                    }
                    placeholder={
                      monetaryFields.has(key)
                        ? "R$ 0,00"
                        : key === "telefone"
                          ? "47 99999-9999"
                          : key === "email"
                            ? "nome@provedor.com"
                            : undefined
                    }
                    disabled={key === "balao_maximo" && !form.aceita_baloes}
                    value={String(form[key])}
                    onChange={(e) =>
                      update(
                        key,
                        monetaryFields.has(key)
                          ? e.target.value.replace(/\D/g, "")
                            ? formatBRL(parseBRL(e.target.value))
                            : ""
                          : key === "telefone"
                            ? formatPhone(e.target.value)
                            : e.target.value,
                      )
                    }
                    style={{ ...input, marginTop: 5 }}
                  />
                </label>
              ))}
              <div
                className="client-email-presets"
                style={{
                  gridColumn: "1/-1",
                  display: "flex",
                  gap: 6,
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <small style={{ color: "#71717a" }}>Completar e-mail:</small>
                {emailDomains.map((domain) => (
                  <button
                    key={domain}
                    type="button"
                    onClick={() => selectEmailDomain(domain)}
                    style={{
                      background: "#18181b",
                      border: "1px solid #34343a",
                      color: "#d4d4d8",
                      borderRadius: 6,
                      padding: "6px 8px",
                      cursor: "pointer",
                    }}
                  >
                    @{domain}
                  </button>
                ))}
              </div>
              <label style={{ color: "#a1a1aa", fontSize: 12 }}>
                Cidades de preferência (separe por vírgula)
                <input
                  value={form.cidades_preferencia}
                  onChange={(e) =>
                    update("cidades_preferencia", e.target.value)
                  }
                  style={{ ...input, marginTop: 5 }}
                />
              </label>
              <label style={{ color: "#a1a1aa", fontSize: 12 }}>
                Objetivo
                <select
                  value={form.objetivo}
                  onChange={(e) => update("objetivo", e.target.value)}
                  style={{ ...input, marginTop: 5 }}
                >
                  <option value="investimento">Investimento</option>
                  <option value="moradia">Moradia</option>
                  <option value="renda">Renda</option>
                  <option value="revenda">Revenda</option>
                </select>
              </label>
              <label style={{ color: "#a1a1aa", fontSize: 12 }}>
                Como apresentar a curadoria
                <select
                  value={form.modo_apresentacao}
                  onChange={(e) =>
                    update(
                      "modo_apresentacao",
                      e.target.value as Form["modo_apresentacao"],
                    )
                  }
                  style={{ ...input, marginTop: 5 }}
                >
                  <option value="moradia">
                    Moradia — localização, conforto e pagamento
                  </option>
                  <option value="investidor">
                    Investidor — patrimônio, retorno e fluxo
                  </option>
                  <option value="renda">
                    Renda — aluguel, cap rate e liquidez
                  </option>
                  <option value="revenda">
                    Revenda — prazo, saída e valorização
                  </option>
                </select>
              </label>
              <label style={{ color: "#a1a1aa", fontSize: 12 }}>
                Horizonte desejado
                <select
                  value={form.horizonte_investimento}
                  onChange={(e) =>
                    update("horizonte_investimento", e.target.value)
                  }
                  style={{ ...input, marginTop: 5 }}
                >
                  <option value="">Não informado</option>
                  <option value="curto">Curto prazo</option>
                  <option value="medio">Médio prazo</option>
                  <option value="longo">Longo prazo</option>
                </select>
              </label>
              <label style={{ color: "#a1a1aa", fontSize: 12 }}>
                Perfil de risco
                <select
                  value={form.perfil_risco}
                  onChange={(e) => update("perfil_risco", e.target.value)}
                  style={{ ...input, marginTop: 5 }}
                >
                  <option value="">Não informado</option>
                  <option value="conservador">Conservador</option>
                  <option value="moderado">Moderado</option>
                  <option value="arrojado">Arrojado</option>
                </select>
              </label>
              <label style={{ color: "#a1a1aa", fontSize: 12 }}>
                Etapa
                <select
                  value={form.status}
                  onChange={(e) => update("status", e.target.value)}
                  style={{ ...input, marginTop: 5 }}
                >
                  <option value="novo">Novo</option>
                  <option value="qualificado">Qualificado</option>
                  <option value="curadoria">Curadoria</option>
                  <option value="apresentacao">Apresentação</option>
                  <option value="proposta">Proposta</option>
                  <option value="negociacao">Negociação</option>
                </select>
              </label>
              <label
                style={{
                  color: "#a1a1aa",
                  fontSize: 12,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <input
                  type="checkbox"
                  checked={form.aceita_baloes}
                  onChange={(e) => update("aceita_baloes", e.target.checked)}
                />
                Cliente aceita balões
              </label>
              <label
                style={{ color: "#a1a1aa", fontSize: 12, gridColumn: "1/-1" }}
              >
                Observações
                <textarea
                  value={form.observacoes}
                  onChange={(e) => update("observacoes", e.target.value)}
                  rows={4}
                  style={{ ...input, marginTop: 5 }}
                />
              </label>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                marginTop: 15,
              }}
            >
              <button
                style={button}
                onClick={() => void save()}
                disabled={saving}
              >
                <Save size={16} />
                {saving ? "Salvando..." : "Salvar cliente"}
              </button>
            </div>
          </section>
        </div>
      )}

      {curating && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 5000,
            background: "rgba(0,0,0,.82)",
            padding: 24,
            overflow: "auto",
          }}
        >
          <section style={{ maxWidth: 1180, margin: "0 auto" }}>
            <header
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>Curadoria para {curating.nome}</h2>
                <p style={{ color: "#8b8b95" }}>
                  Selecione até quatro imóveis e libere somente o conteúdo que
                  este cliente poderá acessar.
                </p>
              </div>
              <button aria-label="Fechar curadoria" onClick={() => setCurating(null)} style={{width:38,height:38,display:"grid",placeItems:"center",flex:"0 0 auto",border:"1px solid #3f3f46",borderRadius:8,background:"#18181b",color:"#d4d4d8",padding:0}}>
                <X size={19} />
              </button>
            </header>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))",
                gap: 12,
              }}
            >
              {properties.map((property) => {
                const selection = selectedFor(curating.id).find(
                  (item) => item.empreendimento_id === property.id,
                );
                const checked = Boolean(selection);
                const presentationOption = presentationOptions[property.id];
                const hasPdf = Boolean(presentationOption?.ativo && (presentationOption.pdf_url || presentationOption.storage_path));
                const hasLink = Boolean(presentationOption?.ativo && presentationOption.link_url);
                return (
                  <article
                    key={property.id}
                    style={{
                      ...panel,
                      borderColor: checked ? "#c5a059" : "#27272a",
                      padding: 0,
                      overflow: "hidden",
                    }}
                  >
                    {property.imagem_url ? (
                      <img
                        src={property.imagem_url}
                        alt=""
                        style={{
                          width: "100%",
                          height: 145,
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div style={{ height: 145, background: "#18181b" }} />
                    )}
                    <div style={{ padding: 14 }}>
                      <small style={{ color: "#c5a059" }}>
                        {property.status}
                      </small>
                      <h3>{property.nome}</h3>
                      <p style={{ color: "#8b8b95", fontSize: 12 }}>
                        {property.cidade} · {money(property.faixa_preco)}
                      </p>
                      <button
                        onClick={() => void toggleProperty(curating, property)}
                        style={{
                          ...button,
                          width: "100%",
                          background: checked ? "#14532d" : "#c5a059",
                          color: checked ? "#dcfce7" : "#09090b",
                        }}
                      >
                        {checked ? <Check size={15} /> : <Plus size={15} />}{" "}
                        {checked ? "Selecionado" : "Adicionar à comparação"}
                      </button>
                      {selection && (
                        <div
                          style={{
                            display: "grid",
                            gap: 8,
                            marginTop: 12,
                            paddingTop: 12,
                            borderTop: "1px solid #27272a",
                          }}
                        >
                          <strong style={{ fontSize: 11 }}>
                            Conteúdo liberado no portal
                          </strong>
                          <div
                            style={{
                              display: "flex",
                              flexWrap: "wrap",
                              gap: 9,
                            }}
                          >
                            {(
                              [
                                ["exibir_imagens", "Imagens"],
                                ["exibir_descricao", "Descrição"],
                                ["exibir_preco", "Preço"],
                                ["exibir_especificacoes", "Especificações"],
                                ["exibir_investimento", "Investimento"],
                                ["exibir_fluxo", "Fluxo"],
                              ] as const
                            ).map(([key, label]) => (
                              <label
                                key={key}
                                style={{
                                  fontSize: 11,
                                  color: selection[key] ? "#86efac" : "#a1a1aa",
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={Boolean(selection[key])}
                                  onChange={(event) =>
                                    void updateSelection(
                                      curating.id,
                                      property.id,
                                      { [key]: event.target.checked },
                                    )
                                  }
                                />{" "}
                                {label}
                              </label>
                            ))}
                          </div>
                          <label style={{fontSize:11,color:"#d4d4d8"}}>Layout desta apresentação
                            <select value={selection.landing_layout || "automatico"} onChange={(event)=>void updateSelection(curating.id,property.id,{landing_layout:event.target.value as Selection["landing_layout"]})} style={{...input,marginTop:5}}>
                              <option value="automatico">Automático — alterna conforme a ordem</option>
                              <option value="editorial">Editorial — narrativa equilibrada</option>
                              <option value="imersivo">Imersivo — imagens maiores</option>
                              <option value="investidor">Investidor — conteúdo e números</option>
                            </select>
                          </label>
                          <label style={{ fontSize: 11, color: "#d4d4d8" }}>Apresentação exibida para este cliente
                            <select value={selection.apresentacao_modo || "preferida"} onChange={(event) => void updateSelection(curating.id, property.id, { apresentacao_modo: event.target.value as Selection["apresentacao_modo"] })} style={{ ...input, marginTop: 5 }}>
                              <option value="preferida">Principal configurada no empreendimento</option>
                              <option value="pdf" disabled={!hasPdf}>Somente PDF da construtora</option>
                              <option value="link" disabled={!hasLink}>Somente link online (blog/site)</option>
                              <option value="nenhuma">Não exibir apresentação</option>
                            </select>
                          </label>
                          <small style={{ color: presentationOption?.ativo && (hasPdf || hasLink) ? "#86efac" : "#a1a1aa", fontSize: 10 }}>
                            {presentationOption?.ativo && (hasPdf || hasLink)
                              ? `Disponíveis: ${[hasLink ? "link" : "", hasPdf ? "PDF" : ""].filter(Boolean).join(" + ")}.`
                              : "Cadastre e ative um link e/ou PDF no módulo Apresentações para liberar estes itens."}
                          </small>
                          {hasLink && <small style={{ color: "#a1a1aa", fontSize: 10 }}>Posts do blog no domínio do site abrem em modo apresentação, sem o cabeçalho e o rodapé do blog.</small>}
                          {selection.exibir_fluxo && <div style={{display:"grid",gap:7,padding:"9px 0",borderTop:"1px solid #27272a"}}>
                            <strong style={{fontSize:11}}>Unidades liberadas para o Fluxo ({selection.unidade_ids?.length || 0})</strong>
                            <small style={{color:"#71717a"}}>Selecione somente as unidades que {curating.nome} poderá simular no portal.</small>
                            <div style={{display:"grid",gap:5,maxHeight:220,overflow:"auto"}}>
                              {units.filter(u=>u.empreendimento_id===property.id && !["vendida","bloqueada","fora de tabela"].includes(String(u.status||"").toLowerCase())).map(u=>{const ids=selection.unidade_ids || []; const checked=ids.includes(u.id); return <label key={u.id} style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",padding:"7px 8px",border:"1px solid "+(checked?"#c5a059":"#303036"),borderRadius:6,fontSize:11}}><span><input type="checkbox" checked={checked} onChange={()=>{const next=checked?ids.filter(id=>id!==u.id):[...ids,u.id];void updateSelection(curating.id,property.id,{unidade_ids:next,unidade_ids_selecionadas:next,exibir_fluxo:true,permitir_proposta:true});}}/> Unidade {u.numero || u.id.slice(0,8)}{u.tipologia ? ` · ${u.tipologia}` : ""}</span><b>{money(u.valor_tabela || u.valor)}</b></label>})}
                            </div>
                          </div>}
                          {selection.exibir_imagens && <div style={{display:"grid",gap:7}}>
                            <strong style={{fontSize:11}}>Imagens desta landing ({selection.imagem_ids_selecionadas?.length || 0}/10)</strong>
                            <small style={{color:"#71717a"}}>Toque na ordem desejada. Somente estas imagens serão entregues a este cliente.</small>
                            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(105px,1fr))",gap:7}}>
                              {curadoriaMidias.filter(media=>media.empreendimento_id===property.id).map(media=>{const selected=selection.imagem_ids_selecionadas || [];const position=selected.indexOf(media.id);return <button type="button" key={media.id} onClick={()=>{const next=position>=0?selected.filter(id=>id!==media.id):selected.length<10?[...selected,media.id]:selected;if(position<0&&selected.length>=10)return setMessage("Selecione no máximo 10 imagens por landing.");void updateSelection(curating.id,property.id,{imagem_ids_selecionadas:next});}} style={{position:"relative",padding:0,border:`2px solid ${position>=0?"#c5a059":"#303036"}`,borderRadius:7,overflow:"hidden",background:"#18181b",color:"#fff",cursor:"pointer"}}>
                                {media.preview_url?<img src={media.preview_url} alt={media.titulo || "Imagem"} style={{width:"100%",height:76,objectFit:"cover",display:"block"}}/>:<span style={{height:76,display:"grid",placeItems:"center"}}>Sem prévia</span>}
                                {position>=0&&<b style={{position:"absolute",top:4,left:4,width:23,height:23,borderRadius:20,display:"grid",placeItems:"center",background:"#c5a059",color:"#09090b"}}>{position+1}</b>}
                                <small style={{display:"block",padding:5,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{media.categoria || media.titulo || "Imagem"}</small>
                              </button>})}
                            </div>
                          </div>}
                          <div style={{display:"grid",gap:7}}>
                            <strong style={{fontSize:11,color:"#d4d4d8"}}>Unidades liberadas para este cliente ({selection.unidade_ids_selecionadas?.length || 0})</strong>
                            <small style={{color:"#71717a"}}>Pesquise por torre, código, número ou tipologia. A cliente verá somente as unidades marcadas.</small>
                            <input value={unitQueries[property.id] || ""} onChange={(event)=>setUnitQueries(current=>({...current,[property.id]:event.target.value}))} placeholder="Pesquisar: Torre A, 304, 807, Studio..." style={{...input,marginTop:2}} />
                            <div style={{display:"grid",gap:5,maxHeight:260,overflow:"auto"}}>
                              {units.filter(unit=>{
                                if(unit.empreendimento_id!==property.id || ["vendida","bloqueada","fora de tabela"].includes(String(unit.status||"").toLowerCase())) return false;
                                const term=(unitQueries[property.id]||"").trim().toLocaleLowerCase("pt-BR");
                                if(!term) return true;
                                return [unit.torre,unit.codigo,unit.codigo_unidade,unit.numero,unit.numero_unidade,unit.tipologia,unit.andar].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR").includes(term);
                              }).sort((a,b)=>String(a.torre||"").localeCompare(String(b.torre||""),"pt-BR",{numeric:true}) || String(a.numero||a.numero_unidade||a.codigo||a.codigo_unidade||"").localeCompare(String(b.numero||b.numero_unidade||b.codigo||b.codigo_unidade||""),"pt-BR",{numeric:true})).map(unit=>{const selected=selection.unidade_ids_selecionadas || [];const checked=selected.includes(unit.id);const tower=unit.torre || "Torre não informada";const code=unit.codigo || unit.codigo_unidade || unit.numero || unit.numero_unidade || unit.id.slice(0,8);const negotiated=Number(selection.condicoes_unidades?.[unit.id]?.desconto_valor || 0);return <label key={unit.id} style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center",padding:"8px 9px",border:"1px solid "+(checked?"#c5a059":"#303036"),borderRadius:6,fontSize:11}}><span style={{minWidth:0}}><input type="checkbox" checked={checked} onChange={()=>{const next=checked?selected.filter(id=>id!==unit.id):[...selected,unit.id];void updateSelection(curating.id,property.id,{unidade_ids_selecionadas:next,exibir_fluxo:true,permitir_proposta:true});}}/> <b>{tower}</b> · Unidade {code}{unit.andar ? ` · ${unit.andar}º andar` : ""}{unit.tipologia ? ` · ${unit.tipologia}` : ""}<small style={{display:"block",color:"#8b8b95",marginTop:3}}>Tabela: {money(unit.valor_tabela || unit.valor)}</small></span><span style={{display:"grid",gap:3,minWidth:125}}><small style={{color:"#8b8b95"}}>Desconto negociado</small><CurrencyInput value={negotiated} onChange={(value)=>{const next={...(selection.condicoes_unidades || {})};if(value>0) next[unit.id]={desconto_valor:value};else delete next[unit.id];void updateSelection(curating.id,property.id,{condicoes_unidades:next});}} style={{...input,padding:"6px 7px",fontSize:11}} /></span></label>})}
                              {units.filter(unit=>unit.empreendimento_id===property.id).length===0 && <small style={{color:"#fbbf24"}}>Nenhuma unidade cadastrada para este empreendimento.</small>}
                            </div>
                          </div>
                          <label style={{fontSize:11,color:"#d4d4d8"}}>Desconto/condição especial (%)
                            <input type="number" min="0" max="100" step="0.1" value={selection.desconto_percentual ?? 0} onChange={(event)=>setSelections(current=>current.map(item=>item===selection?{...item,desconto_percentual:Math.max(0,Math.min(100,Number(event.target.value)||0))}:item))} onBlur={(event)=>void updateSelection(curating.id,property.id,{desconto_percentual:Math.max(0,Math.min(100,Number(event.target.value)||0))})} style={{...input,marginTop:5}} />
                          </label>
                          <label style={{fontSize:11,color:"#d4d4d8"}}>Observação comercial visível para a cliente
                            <textarea rows={2} value={selection.observacao_comercial || ""} onChange={(event)=>setSelections(current=>current.map(item=>item===selection?{...item,observacao_comercial:event.target.value}:item))} onBlur={(event)=>void updateSelection(curating.id,property.id,{observacao_comercial:event.target.value})} placeholder="Ex.: condição especial obtida nesta negociação." style={{...input,marginTop:5}} />
                          </label>
                          <textarea
                            rows={2}
                            value={selection.mensagem_personalizada || ""}
                            onChange={(event) =>
                              setSelections((current) =>
                                current.map((item) =>
                                  item === selection
                                    ? {
                                        ...item,
                                        mensagem_personalizada:
                                          event.target.value,
                                      }
                                    : item,
                                ),
                              )
                            }
                            onBlur={(event) =>
                              void updateSelection(curating.id, property.id, {
                                mensagem_personalizada: event.target.value,
                              })
                            }
                            placeholder="Mensagem personalizada para o cliente"
                            style={input}
                          />
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      )}

      {comparing && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 5000,
            background: "#09090bf8",
            padding: 18,
            overflow: "auto",
          }}
        >
          <section
            style={{
              maxWidth: 1280,
              margin: "0 auto",
              display: "grid",
              gap: 14,
            }}
          >
            <header
              style={{
                ...panel,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>Comparativo para {comparing.nome}</h2>
                <p style={{ color: "#8b8b95", margin: "5px 0 0" }}>
                  Necessidade:{" "}
                  {comparing.quartos_desejados
                    ? `${comparing.quartos_desejados} dormitórios`
                    : "dormitórios não informados"}{" "}
                  · orçamento {money(comparing.faixa_investimento)} · entrada{" "}
                  {money(comparing.entrada_disponivel)}
                </p>
              </div>
              <button onClick={() => setComparing(null)}>
                <X />
              </button>
            </header>
            <div
              className="client-compare-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))",
                gap: 12,
              }}
            >
              {propertiesFor(comparing.id).map((property) => {
                const all = units.filter(
                  (u) =>
                    u.empreendimento_id === property.id &&
                    !["vendida", "bloqueada", "fora de tabela"].includes(
                      String(u.status || "").toLowerCase(),
                    ),
                );
                const matching = all.filter(
                  (u) =>
                    !comparing.quartos_desejados ||
                    parseStandardTypology(
                      u.tipologia ||
                        u.tipologia_dados?.produto?.tipologia_padrao,
                      u.tipologia_dados?.produto?.dormitorios || 0,
                    ).dormitorios === comparing.quartos_desejados,
                );
                const prices = matching
                  .map((u) => Number(u.valor_tabela || u.valor))
                  .filter((v) => v > 0);
                const areas = matching
                  .map((u) => Number(u.area_privativa))
                  .filter((v) => v > 0);
                return (
                  <article
                    key={property.id}
                    style={{
                      ...panel,
                      padding: 0,
                      overflow: "hidden",
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    {property.imagem_url ? (
                      <img
                        src={property.imagem_url}
                        alt=""
                        style={{
                          width: "100%",
                          height: 155,
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div style={{ height: 155, background: "#18181b" }} />
                    )}
                    <div
                      style={{ padding: 15, display: "grid", gap: 11, flex: 1 }}
                    >
                      <div>
                        <small style={{ color: "#c5a059" }}>
                          {property.status}
                        </small>
                        <h3 style={{ margin: "5px 0" }}>{property.nome}</h3>
                        <span style={{ color: "#8b8b95", fontSize: 12 }}>
                          {property.bairro} · {property.cidade}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 8,
                        }}
                      >
                        <span
                          style={{
                            background: "#18181b",
                            padding: 9,
                            borderRadius: 8,
                            fontSize: 11,
                          }}
                        >
                          <BedDouble size={14} color="#c5a059" />{" "}
                          <strong style={{ display: "block", fontSize: 16 }}>
                            {matching.length}
                          </strong>
                          unidades compatíveis
                        </span>
                        <span
                          style={{
                            background: "#18181b",
                            padding: 9,
                            borderRadius: 8,
                            fontSize: 11,
                          }}
                        >
                          <Building2 size={14} color="#c5a059" />
                          <strong style={{ display: "block", fontSize: 16 }}>
                            {property.numero_pavimentos || "—"}
                          </strong>
                          pavimentos
                        </span>
                      </div>
                      <dl
                        style={{
                          display: "grid",
                          gap: 7,
                          fontSize: 12,
                          margin: 0,
                        }}
                      >
                        <div>
                          <dt style={{ color: "#71717a" }}>Preço compatível</dt>
                          <dd style={{ margin: 2, fontWeight: 800 }}>
                            {prices.length
                              ? `${money(Math.min(...prices))} a ${money(Math.max(...prices))}`
                              : "Sem preço real"}
                          </dd>
                        </div>
                        <div>
                          <dt style={{ color: "#71717a" }}>
                            Área das unidades
                          </dt>
                          <dd style={{ margin: 2 }}>
                            {areas.length
                              ? `${Math.min(...areas)}–${Math.max(...areas)} m²`
                              : "Não informada"}
                          </dd>
                        </div>
                        <div>
                          <dt style={{ color: "#71717a" }}>
                            Tipologias encontradas
                          </dt>
                          <dd style={{ margin: 2 }}>
                            {[
                              ...new Set(
                                matching.map(
                                  (u) =>
                                    parseStandardTypology(
                                      u.tipologia ||
                                        u.tipologia_dados?.produto
                                          ?.tipologia_padrao,
                                    ).label,
                                ),
                              ),
                            ].join(" · ") || "Nenhuma compatível"}
                          </dd>
                        </div>
                      </dl>
                      <div style={{ display: "grid", gap: 6 }}>
                        {matching.slice(0, 4).map((u) => (
                          <label
                            key={u.id}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              gap: 7,
                              padding: 8,
                              border: "1px solid #303036",
                              borderRadius: 7,
                              fontSize: 11,
                            }}
                          >
                            <span>
                              <input
                                type="checkbox"
                                checked={flowSelection.includes(u.id)}
                                onChange={(e) =>
                                  setFlowSelection((s) =>
                                    e.target.checked
                                      ? [...new Set([...s, u.id])]
                                      : s.filter((id) => id !== u.id),
                                  )
                                }
                              />{" "}
                              Unidade {u.numero || u.id}
                            </span>
                            <b>{money(u.valor_tabela || u.valor)}</b>
                          </label>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
            <footer
              style={{
                ...panel,
                position: "sticky",
                bottom: 10,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span>
                {flowSelection.length} unidade(s) escolhida(s) para análise
                financeira
              </span>
              <button
                disabled={!flowSelection.length}
                style={{ ...button, opacity: flowSelection.length ? 1 : 0.45 }}
                onClick={() => {
                  onOpenFlow?.(flowSelection, comparing.id);
                  setComparing(null);
                }}
              >
                <WalletCards size={16} />
                Abrir no Fluxo Financeiro
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
