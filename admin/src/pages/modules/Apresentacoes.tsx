import { useEffect, useMemo, useState } from "react";
import { Edit3, ExternalLink, FileText, Link2, Loader2, Play, RefreshCw, Save, Search, Upload, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { cityKey, sameCity } from "@/lib/cities";
import { isR2Path, r2PublicUrl, uploadR2Media } from "@/lib/r2Media";

type Empreendimento = { id: string; nome?: string | null; cidade?: string | null; imagem_url?: string | null; caracteristicas?: Record<string, unknown> | null };
type EmpreendimentoImagem = { empreendimento_id: string; url?: string | null; storage_path?: string | null; ordem?: number | null };
type Apresentacao = {
  empreendimento_id: string;
  ativo: boolean;
  pdf_url?: string | null;
  storage_path?: string | null;
  link_url?: string | null;
  tipo_preferido?: "pdf" | "link";
  imagem_capa?: string | null;
  cliente_ativo?: boolean;
  cliente_tipo?: "pdf" | "link" | "post" | null;
  cliente_pdf_path?: string | null;
  cliente_link_url?: string | null;
  cliente_blog_post_id?: string | null;
  updated_at?: string | null;
};
type BlogPostOption = { id: string; titulo: string; slug: string; empreendimento_id?: string | null; publicado_em?: string | null };
type ViewerState = { url: string; title: string };

const BUCKET = "pdfs";
const CLIENT_PRESENTATION_BUCKET = "cliente-apresentacoes";
const ENTERPRISE_IMAGES_BUCKET = "empreendimentos";
const STORAGE_REFERENCE_PREFIX = "storage://empreendimentos/";
const MAX_PDF_MB = 250;
const MAX_PDF_BYTES = MAX_PDF_MB * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 10 * 60_000;

function errorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

async function resolveEnterpriseCover(item: Empreendimento, fallbackCover?: string | null): Promise<Empreendimento> {
  const reference = item.imagem_url || "";
  if (reference.startsWith("r2://")) return { ...item, imagem_url: r2PublicUrl(reference) };
  if (!reference.startsWith(STORAGE_REFERENCE_PREFIX)) return { ...item, imagem_url: reference || fallbackCover || null };
  const path = reference.slice(STORAGE_REFERENCE_PREFIX.length);
  const { data, error } = await supabase.storage.from(ENTERPRISE_IMAGES_BUCKET).createSignedUrl(path, 3600);
  return error || !data?.signedUrl ? { ...item, imagem_url: fallbackCover || null } : { ...item, imagem_url: data.signedUrl };
}

async function resolvePresentationCover(item: Apresentacao): Promise<Apresentacao> {
  const reference = item.imagem_capa || "";
  if (reference.startsWith("r2://")) return { ...item, imagem_capa: r2PublicUrl(reference) };
  if (!reference.startsWith(STORAGE_REFERENCE_PREFIX)) return item;
  const path = reference.slice(STORAGE_REFERENCE_PREFIX.length);
  const { data, error } = await supabase.storage.from(ENTERPRISE_IMAGES_BUCKET).createSignedUrl(path, 3600);
  return error || !data?.signedUrl ? { ...item, imagem_capa: null } : { ...item, imagem_capa: data.signedUrl };
}

export default function Apresentacoes() {
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [apresentacoes, setApresentacoes] = useState<Record<string, Apresentacao>>({});
  const [galleryCovers, setGalleryCovers] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Empreendimento | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [linkUrl, setLinkUrl] = useState("");
  const [preferredType, setPreferredType] = useState<"pdf" | "link">("pdf");
  const [clientType, setClientType] = useState<"" | "pdf" | "link" | "post">("");
  const [clientPdfFile, setClientPdfFile] = useState<File | null>(null);
  const [clientLinkUrl, setClientLinkUrl] = useState("");
  const [clientPostId, setClientPostId] = useState("");
  const [clientPosts, setClientPosts] = useState<BlogPostOption[]>([]);
  const [clientActive, setClientActive] = useState(false);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("Todas");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [supportsLinks, setSupportsLinks] = useState(true);
  const [message, setMessage] = useState<{ error?: string; success?: string } | null>(null);
  const [viewer, setViewer] = useState<ViewerState | null>(null);

  async function load() {
    setLoading(true);
    setMessage(null);
    try {
      const empPromise = supabase.from("empreendimentos").select("id, nome, cidade, imagem_url, caracteristicas").order("nome");
      const imagePromise = supabase.from("empreendimento_imagens").select("empreendimento_id, url, storage_path, ordem").order("ordem", { ascending: true });
      let presentationResult = await supabase.from("apresentacoes").select("empreendimento_id, ativo, pdf_url, storage_path, link_url, tipo_preferido, imagem_capa, cliente_ativo, cliente_tipo, cliente_pdf_path, cliente_link_url, cliente_blog_post_id, updated_at");
      const missingLinkColumns = Boolean(presentationResult.error && /link_url|tipo_preferido/i.test(presentationResult.error.message || ""));
      if (missingLinkColumns) presentationResult = await supabase.from("apresentacoes").select("empreendimento_id, ativo, pdf_url, storage_path, updated_at");
      const postPromise = supabase.from("blog_posts").select("id,titulo,slug,empreendimento_id,publicado_em").eq("status", "publicado").lte("publicado_em", new Date().toISOString()).order("titulo").limit(500);
      const [empResult, imageResult, postResult] = await Promise.all([empPromise, imagePromise, postPromise]);
      setSupportsLinks(!missingLinkColumns);
      if (empResult.error) throw empResult.error;
      if (imageResult.error) throw imageResult.error;
      if (presentationResult.error) throw presentationResult.error;
      if (!postResult.error) setClientPosts((postResult.data || []) as BlogPostOption[]);
      const firstImageByEnterprise = new Map<string, EmpreendimentoImagem>();
      ((imageResult.data || []) as EmpreendimentoImagem[]).forEach((image) => {
        if (image.empreendimento_id && !firstImageByEnterprise.has(image.empreendimento_id)) firstImageByEnterprise.set(image.empreendimento_id, image);
      });
      const signedFallbacks = await Promise.all(Array.from(firstImageByEnterprise.entries()).map(async ([enterpriseId, image]) => {
        if (!image.storage_path) return [enterpriseId, image.url || ""] as const;
        if (isR2Path(image.storage_path)) return [enterpriseId, r2PublicUrl(image.storage_path)] as const;
        const { data } = await supabase.storage.from(ENTERPRISE_IMAGES_BUCKET).createSignedUrl(image.storage_path, 3600);
        return [enterpriseId, data?.signedUrl || image.url || ""] as const;
      }));
      const covers = Object.fromEntries(signedFallbacks.filter(([, url]) => Boolean(url)));
      setGalleryCovers(covers);
      const loadedEnterprises = await Promise.all(((empResult.data || []) as Empreendimento[]).map((item) => resolveEnterpriseCover(item, covers[item.id])));
      setEmpreendimentos(loadedEnterprises);
      const signed=await Promise.all(((presentationResult.data || []) as Apresentacao[]).map(async(item)=>{const resolved=await resolvePresentationCover(item);if(!resolved.storage_path)return resolved;if(isR2Path(resolved.storage_path))return {...resolved,pdf_url:r2PublicUrl(resolved.storage_path)};const{data,error}=await supabase.storage.from(BUCKET).createSignedUrl(resolved.storage_path,3600);return {...resolved,pdf_url:error?null:(data?.signedUrl||null)}}));
      const byEnterprise=Object.fromEntries(signed.map((item) => [item.empreendimento_id, item])) as Record<string,Apresentacao>;
      loadedEnterprises.forEach((enterprise)=>{const fallback=enterprise.caracteristicas?.apresentacao as {link_url?:string;tipo_preferido?:"pdf"|"link"}|undefined;if(fallback?.link_url)byEnterprise[enterprise.id]={...byEnterprise[enterprise.id],empreendimento_id:enterprise.id,ativo:byEnterprise[enterprise.id]?.ativo??true,link_url:fallback.link_url,tipo_preferido:fallback.tipo_preferido||"link"}});
      setApresentacoes(byEnterprise);
    } catch (error: unknown) {
      setMessage({ error: errorMessage(error, "Não foi possível carregar as apresentações.") });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    if (!editing) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setEditing(null); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [editing]);

  function openEditor(item: Empreendimento) {
    const current = apresentacoes[item.id];
    setEditing(item);
    setFile(null);
    setLinkUrl(current?.link_url || "");
    setPreferredType(current?.tipo_preferido || (current?.link_url && !current?.pdf_url ? "link" : "pdf"));
    setClientType(current?.cliente_tipo || "");
    setClientPdfFile(null);
    setClientLinkUrl(current?.cliente_link_url || "");
    setClientPostId(current?.cliente_blog_post_id || "");
    setClientActive(Boolean(current?.cliente_ativo));
    setMessage(null);
  }

  const cities = useMemo(() => [
    "Todas",
    ...Array.from(new Map(empreendimentos.filter((item)=>item.cidade).map((item)=>[cityKey(item.cidade),item.cidade!.replace(/\s*[-/]?\s*SC\s*$/i,"").trim()])).values()).sort((a, b) => a.localeCompare(b, "pt-BR")),
  ], [empreendimentos]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return empreendimentos.filter((item) =>
      (!term || `${item.nome || ""} ${item.cidade || ""}`.toLocaleLowerCase("pt-BR").includes(term)) &&
      (cityFilter === "Todas" || sameCity(item.cidade, cityFilter)),
    );
  }, [empreendimentos, search, cityFilter]);

  async function toggleActive(item: Empreendimento) {
    const previous = apresentacoes[item.id];
    const ativo = !(previous?.ativo ?? false);
    setApresentacoes((state) => ({ ...state, [item.id]: { ...previous, empreendimento_id: item.id, ativo } }));
    const query = supabase.from("apresentacoes").upsert({ empreendimento_id: item.id, ativo }, { onConflict: "empreendimento_id" });
    const { data, error } = await query.select(supportsLinks ? "empreendimento_id, ativo, pdf_url, storage_path, link_url, tipo_preferido, cliente_ativo, cliente_tipo, cliente_pdf_path, cliente_link_url, cliente_blog_post_id, updated_at" : "empreendimento_id, ativo, pdf_url, storage_path, updated_at").single();
    if (error) {
      setApresentacoes((state) => {
        const next = { ...state };
        if (previous) next[item.id] = previous; else delete next[item.id];
        return next;
      });
      setMessage({ error: error.message || "Não foi possível atualizar o status." });
    } else {
      setApresentacoes((state) => ({ ...state, [item.id]: data as unknown as Apresentacao }));
    }
  }

  async function toggleClientActive(item: Empreendimento) {
    const current = apresentacoes[item.id];
    if (!current?.cliente_tipo || (current.cliente_tipo === "pdf" && !current.cliente_pdf_path) || (current.cliente_tipo === "link" && !current.cliente_link_url) || (current.cliente_tipo === "post" && !current.cliente_blog_post_id)) {
      setMessage({ error: "Configure primeiro o PDF, link ou post destinado ao cliente." });
      return;
    }
    const cliente_ativo = !current.cliente_ativo;
    const { data, error } = await supabase.from("apresentacoes").upsert({ empreendimento_id: item.id, cliente_ativo, updated_at: new Date().toISOString() }, { onConflict: "empreendimento_id" })
      .select("empreendimento_id, ativo, pdf_url, storage_path, link_url, tipo_preferido, cliente_ativo, cliente_tipo, cliente_pdf_path, cliente_link_url, cliente_blog_post_id, updated_at").single();
    if (error) setMessage({ error: error.message || "Não foi possível atualizar o acesso do cliente." });
    else setApresentacoes((state) => ({ ...state, [item.id]: { ...current, ...(data as unknown as Apresentacao) } }));
  }

  async function saveClientPresentation() {
    if (!editing) return;
    const current = apresentacoes[editing.id];
    const normalizedLink = clientLinkUrl.trim();
    if (clientType === "link") {
      try {
        const parsed = new URL(normalizedLink);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
      } catch {
        setMessage({ error: "Informe um link completo e seguro, começando com https://." });
        return;
      }
    }
    const selectedPost = clientPosts.find((post) => post.id === clientPostId);
    if (clientType === "post" && !selectedPost) {
      setMessage({ error: "Selecione um post publicado para vincular a este empreendimento." });
      return;
    }
    if (clientType === "pdf" && !clientPdfFile && !current?.cliente_pdf_path) {
      setMessage({ error: "Envie um PDF para clientes antes de salvar esta opção." });
      return;
    }
    if (clientPdfFile && (clientPdfFile.type !== "application/pdf" && !clientPdfFile.name.toLowerCase().endsWith(".pdf"))) {
      setMessage({ error: "Selecione um arquivo PDF válido." });
      return;
    }
    if (clientPdfFile && clientPdfFile.size > MAX_PDF_BYTES) {
      setMessage({ error: `O PDF para clientes deve ter no máximo ${MAX_PDF_MB} MB.` });
      return;
    }

    setSaving(true);
    setMessage(null);
    let uploadedPath: string | null = null;
    try {
      if (!clientType) {
        const { data, error } = await supabase.from("apresentacoes").upsert({
          empreendimento_id: editing.id,
          cliente_ativo: false,
          cliente_tipo: null,
          cliente_pdf_path: null,
          cliente_link_url: null,
          cliente_blog_post_id: null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "empreendimento_id" })
          .select("empreendimento_id, ativo, pdf_url, storage_path, link_url, tipo_preferido, cliente_ativo, cliente_tipo, cliente_pdf_path, cliente_link_url, cliente_blog_post_id, updated_at").single();
        if (error) throw error;
        setApresentacoes((state) => ({ ...state, [editing.id]: { ...current, ...(data as unknown as Apresentacao) } }));
        setClientPdfFile(null);
        setClientActive(false);
        if (current?.cliente_pdf_path) await supabase.storage.from(CLIENT_PRESENTATION_BUCKET).remove([current.cliente_pdf_path]);
        setMessage({ success: "Material destinado a clientes removido. A apresentação ao vivo permanece intacta." });
        return;
      }

      let pdfPath = current?.cliente_pdf_path || null;
      if (clientType === "pdf" && clientPdfFile) {
        pdfPath = `${editing.id}/${crypto.randomUUID()}.pdf`;
        const uploadPromise = supabase.storage.from(CLIENT_PRESENTATION_BUCKET).upload(pdfPath, clientPdfFile, { contentType: "application/pdf", cacheControl: "60", upsert: false });
        const { error: uploadError } = await Promise.race([
          uploadPromise,
          new Promise<never>((_, reject) => { window.setTimeout(() => reject(new Error("O upload excedeu o limite de 10 minutos. Tente novamente.")), UPLOAD_TIMEOUT_MS); }),
        ]);
        if (uploadError) throw uploadError;
        uploadedPath = pdfPath;
      }

      const payload = {
        empreendimento_id: editing.id,
        cliente_ativo: true,
        cliente_tipo: clientType,
        cliente_pdf_path: clientType === "pdf" ? pdfPath : null,
        cliente_link_url: clientType === "link" ? normalizedLink : null,
        cliente_blog_post_id: clientType === "post" ? selectedPost?.id : null,
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase.from("apresentacoes").upsert(payload, { onConflict: "empreendimento_id" })
        .select("empreendimento_id, ativo, pdf_url, storage_path, link_url, tipo_preferido, cliente_ativo, cliente_tipo, cliente_pdf_path, cliente_link_url, cliente_blog_post_id, updated_at").single();
      if (error) throw error;
      setApresentacoes((state) => ({ ...state, [editing.id]: { ...current, ...(data as unknown as Apresentacao) } }));
      setClientPdfFile(null);
      setClientActive(true);
      setMessage({ success: "Material de clientes salvo e ativado. A apresentação ao vivo não foi alterada." });
      if (current?.cliente_pdf_path && current.cliente_pdf_path !== payload.cliente_pdf_path) {
        await supabase.storage.from(CLIENT_PRESENTATION_BUCKET).remove([current.cliente_pdf_path]);
      }
    } catch (error: unknown) {
      if (uploadedPath) await supabase.storage.from(CLIENT_PRESENTATION_BUCKET).remove([uploadedPath]);
      setMessage({ error: errorMessage(error, "Não foi possível salvar o material para clientes.") });
    } finally {
      setSaving(false);
    }
  }

  async function uploadPdf() {
    if (!editing || !file) return;
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
      setMessage({ error: "Selecione um arquivo PDF válido." });
      return;
    }
    if (file.size > MAX_PDF_BYTES) {
      setMessage({ error: `O PDF deve ter no máximo ${MAX_PDF_MB} MB.` });
      return;
    }
    setSaving(true);
    setMessage(null);
      try {
      const upload = await Promise.race([
        uploadR2Media(file, { kind: "presentation", enterpriseId: editing.id, enterpriseName: editing.nome || "Empreendimento" }),
        new Promise<never>((_, reject) => { window.setTimeout(() => reject(new Error("O upload excedeu o tempo limite de 10 minutos. Tente novamente.")), UPLOAD_TIMEOUT_MS); }),
      ]);
      const current = apresentacoes[editing.id];
      const payload = { empreendimento_id: editing.id, ativo: current?.ativo ?? true, pdf_url: upload.url, storage_path: upload.path, ...(supportsLinks ? { link_url: current?.link_url || linkUrl.trim() || null, tipo_preferido: current?.tipo_preferido || preferredType } : {}), updated_at: new Date().toISOString() };
      const { data, error } = await supabase.from("apresentacoes").upsert(payload, { onConflict: "empreendimento_id" })
        .select(supportsLinks ? "empreendimento_id, ativo, pdf_url, storage_path, link_url, tipo_preferido, updated_at" : "empreendimento_id, ativo, pdf_url, storage_path, updated_at").single();
      if (error) throw error;
      setApresentacoes((state) => ({ ...state, [editing.id]: { ...current, ...(data as unknown as Apresentacao) } }));
      setFile(null);
      setMessage({ success: "PDF atualizado. A apresentação anterior foi substituída." });
    } catch (error: unknown) {
      setMessage({ error: errorMessage(error, "Não foi possível salvar o PDF.") });
    } finally {
      setSaving(false);
    }
  }

  async function saveSettings() {
    if (!editing) return;
    const normalizedLink = linkUrl.trim();
    if (normalizedLink) {
      try {
        const parsed = new URL(normalizedLink);
        if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error();
      } catch {
        setMessage({ error: "Informe um link completo e seguro, começando com https://." });
        return;
      }
    }
    const current = apresentacoes[editing.id];
    if (preferredType === "link" && !normalizedLink) {
      setMessage({ error: "Cadastre um link antes de escolhê-lo como apresentação principal." });
      return;
    }
    if (preferredType === "pdf" && !current?.storage_path && !current?.pdf_url) {
      setMessage({ error: "Envie um PDF antes de escolhê-lo como apresentação principal." });
      return;
    }
    setSaving(true); setMessage(null);
    if(!supportsLinks){
      const characteristics={...(editing.caracteristicas||{}),apresentacao:{link_url:normalizedLink||null,tipo_preferido:preferredType}};
      const{error}=await supabase.from("empreendimentos").update({caracteristicas:characteristics}).eq("id",editing.id);
      setSaving(false);
      if(error)setMessage({error:error.message});else{setEmpreendimentos(items=>items.map(item=>item.id===editing.id?{...item,caracteristicas:characteristics}:item));setEditing({...editing,caracteristicas:characteristics});setApresentacoes(state=>({...state,[editing.id]:{...current,empreendimento_id:editing.id,ativo:current?.ativo??true,link_url:normalizedLink||null,tipo_preferido:preferredType}}));setMessage({success:"Link e preferência salvos no empreendimento. PDF preservado."})}
      return;
    }
    const payload = { empreendimento_id: editing.id, ativo: current?.ativo ?? true, link_url: normalizedLink || null, tipo_preferido: preferredType, updated_at: new Date().toISOString() };
    const { data, error } = await supabase.from("apresentacoes").upsert(payload, { onConflict: "empreendimento_id" }).select("empreendimento_id, ativo, pdf_url, storage_path, link_url, tipo_preferido, updated_at").single();
    setSaving(false);
    if (error) setMessage({ error: error.message });
    else {
      setApresentacoes((state) => ({ ...state, [editing.id]: { ...current, ...(data as Apresentacao) } }));
      setMessage({ success: "Apresentação salva. PDF e link permanecem disponíveis." });
    }
  }

  function present(item: Empreendimento) {
    const presentation = apresentacoes[item.id];
    if (!presentation?.ativo) return;
    const useLink = presentation.tipo_preferido === "link" && presentation.link_url;
    const sourceType = useLink || (!presentation.pdf_url && presentation.link_url) ? "link" : "pdf";
    const sourceUrl = sourceType === "link" ? presentation.link_url : presentation.pdf_url;
    if (!sourceUrl) return;
    const configuredOrigin = String(import.meta.env.VITE_PUBLIC_SITE_URL || "").trim();
    const isLocalPanel = ["localhost", "127.0.0.1"].includes(window.location.hostname) && window.location.port !== "5500";
    const publicOrigin = configuredOrigin || (isLocalPanel
      ? `${window.location.protocol}//${window.location.hostname}:5500`
      : window.location.origin);
    const viewerUrl = new URL("/apresentacao/", publicOrigin);
    viewerUrl.searchParams.set("empreendimento", item.id);
    viewerUrl.searchParams.set(sourceType, sourceUrl);
    viewerUrl.searchParams.set("nome", item.nome || "Apresentação");
    if (isLocalPanel) {
      viewerUrl.searchParams.set("painel", window.location.origin);
    }
    setViewer({ url: viewerUrl.toString(), title: item.nome || "Apresentação" });
  }

  return <section style={{ maxWidth: 1240, margin: "0 auto", color: "#e4e4e7" }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 18, marginBottom: 20 }}>
      <div><h1 style={{ color: "#fff", fontSize: 23, margin: 0 }}>Apresentações</h1><p style={{ margin: "6px 0 0", color: "#a1a1aa", fontSize: 13 }}>Configure separadamente sua apresentação ao vivo e o material enxuto liberado aos clientes.</p></div>
      <button onClick={() => void load()} style={secondaryButtonStyle}><RefreshCw size={15} /> Atualizar</button>
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "minmax(240px, 2fr) minmax(180px, 1fr)", gap: 10, padding: 14, background: "#121212", border: "1px solid #27272a", borderRadius: 10, marginBottom: 16 }}>
      <label style={labelStyle}>Buscar<div style={inputWrapStyle}><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome ou cidade" style={inputStyle} /></div></label>
      <label style={labelStyle}>Cidade<select value={cityFilter} onChange={(event) => setCityFilter(event.target.value)} style={selectStyle}>{cities.map((city) => <option key={city}>{city}</option>)}</select></label>
    </div>

    {message?.error && <p role="alert" style={{ color: "#f87171", fontSize: 13 }}>{message.error}</p>}
    {message?.success && <p role="status" style={{ color: "#4ade80", fontSize: 13 }}>{message.success}</p>}
    {loading ? <div style={{ textAlign: "center", padding: 40, color: "#a1a1aa" }}><Loader2 size={22} /> Carregando...</div> : <>
      <p style={{ color: "#71717a", fontSize: 12 }}>{filtered.length} empreendimento(s) encontrado(s)</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))", gap: 15 }}>
        {filtered.map((item) => {
          const presentation = apresentacoes[item.id];
          const hasPdf = Boolean(presentation?.storage_path && presentation?.pdf_url);
          const hasLink = Boolean(presentation?.link_url);
          const active = Boolean(presentation?.ativo);
          const canPresent = active && (hasPdf || hasLink);
          const hasClientMaterial = Boolean(presentation?.cliente_tipo && (presentation.cliente_tipo === "pdf" ? presentation.cliente_pdf_path : presentation.cliente_tipo === "link" ? presentation.cliente_link_url : presentation.cliente_blog_post_id));
          const clientTypeLabel = presentation?.cliente_tipo === "pdf" ? "PDF privado" : presentation?.cliente_tipo === "link" ? "link" : presentation?.cliente_tipo === "post" ? "post do blog" : "não configurado";
          return <article key={item.id} style={cardStyle}>
            <div style={{ height: 142, background: "#1a1a1f", position: "relative" }}>
              {presentation?.imagem_capa || item.imagem_url || galleryCovers[item.id] ? <img src={presentation?.imagem_capa || item.imagem_url || galleryCovers[item.id]} onError={(event) => { const fallback = galleryCovers[item.id]; if (fallback && event.currentTarget.src !== fallback) event.currentTarget.src = fallback; else event.currentTarget.style.display = "none"; }} alt={item.nome || "Empreendimento"} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "grid", placeItems: "center", color: "#f5d58b", background: "linear-gradient(135deg,#21190d,#111827)" }}><div style={{ textAlign: "center" }}><FileText size={30} style={{ marginBottom: 7 }} /><strong style={{ display: "block", fontSize: 12, color: "#f4f4f5" }}>{item.nome || "Apresentação"}</strong><small style={{ color: "#a1a1aa" }}>Capa pendente</small></div></div>}
              <span style={{ ...badgeStyle, background: active ? "#14532d" : "#4c1d1d", color: active ? "#bbf7d0" : "#fecaca" }}>{active ? "Ativa" : "Desativada"}</span>
            </div>
            <div style={{ padding: 15, display: "flex", flexDirection: "column", flex: 1 }}>
              <h2 style={{ color: "#fff", fontSize: 15, margin: 0 }}>{item.nome || "Sem nome"}</h2>
              <p style={{ color: "#a1a1aa", fontSize: 12, margin: "5px 0" }}>{item.cidade || "Cidade não informada"}</p>
              <p style={{ color: hasPdf || hasLink ? "#c5a059" : "#fbbf24", fontSize: 12, margin: "0 0 16px" }}>{hasPdf && hasLink ? `PDF + link · principal: ${presentation?.tipo_preferido === "link" ? "link" : "PDF"}` : hasPdf ? "PDF cadastrado" : hasLink ? "Link cadastrado" : "Apresentação ainda não cadastrada"}</p>
              <div style={{ display: "grid", gap: 6, margin: "0 0 12px", padding: 9, border: "1px solid #332d22", borderRadius: 7, background: "#0c0c0e" }}><small style={{ color: "#a1a1aa" }}>Apresentação ao vivo: <strong style={{ color: active ? "#86efac" : "#fbbf24" }}>{active ? "ativa" : "desativada"}</strong></small><small style={{ color: "#a1a1aa" }}>Material do cliente: <strong style={{ color: hasClientMaterial && presentation?.cliente_ativo ? "#86efac" : "#d4d4d8" }}>{clientTypeLabel}{hasClientMaterial ? presentation?.cliente_ativo ? " · ativo" : " · pausado" : ""}</strong></small></div>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 16 }}>
                <button onClick={() => void toggleActive(item)} aria-label={active ? "Desativar apresentação" : "Ativar apresentação"} aria-pressed={active} style={{ ...switchStyle, background: active ? "#16a34a" : "#b91c1c" }}><span style={{ ...knobStyle, transform: active ? "translateX(19px)" : "translateX(0)" }} /></button>
                <button disabled={!hasClientMaterial} onClick={() => void toggleClientActive(item)} title={!hasClientMaterial ? "Configure o material de cliente primeiro" : undefined} style={{ ...secondaryButtonStyle, opacity: hasClientMaterial ? 1 : .45, cursor: hasClientMaterial ? "pointer" : "not-allowed" }}>{presentation?.cliente_ativo ? "Pausar para clientes" : "Ativar para clientes"}</button>
                <button onClick={() => openEditor(item)} style={secondaryButtonStyle}><Edit3 size={14} /> Editar</button>
              </div>
              <button disabled={!canPresent} onClick={() => present(item)} title={!hasPdf && !hasLink ? "Cadastre um PDF ou link primeiro" : !active ? "Ative a apresentação primeiro" : undefined} style={{ ...primaryButtonStyle, marginTop: "auto", alignSelf: "center", opacity: canPresent ? 1 : .45, cursor: canPresent ? "pointer" : "not-allowed" }}><Play size={14} /> Apresentar</button>
            </div>
          </article>;
        })}
      </div>
    </>}

    {viewer && <div role="dialog" aria-modal="true" aria-labelledby="presentation-viewer-title" style={viewerOverlayStyle} onMouseDown={(event) => { if (event.target === event.currentTarget) setViewer(null); }}>
      <div style={viewerModalStyle}>
        <div style={viewerHeaderStyle}><div><p style={{ margin: 0, color: "#c5a059", fontSize: 10, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase" }}>Apresentação interna</p><h2 id="presentation-viewer-title" style={{ margin: "4px 0 0", color: "#fff", fontSize: 18 }}>{viewer.title}</h2></div><button onClick={() => setViewer(null)} aria-label="Fechar apresentação" style={closeStyle}><X size={18} /></button></div>
        <iframe title={viewer.title} src={viewer.url} style={viewerFrameStyle} allow="fullscreen; clipboard-read; clipboard-write" />
      </div>
    </div>}

    {editing && <div role="dialog" aria-modal="true" aria-labelledby="presentation-modal-title" style={overlayStyle} onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}>
      <div style={{ ...modalStyle, width: "min(760px, 100%)", maxHeight: "calc(100dvh - 40px)", overflowY: "auto" }}>
        <button onClick={() => setEditing(null)} aria-label="Fechar" style={closeStyle}><X size={18} /></button>
        <h2 id="presentation-modal-title" style={{ margin: "0 36px 4px 0", color: "#fff", fontSize: 18 }}>Editar apresentações do empreendimento</h2>
        <p style={{ color: "#c5a059", fontWeight: 700, margin: "0 0 18px" }}>{editing.nome || "Empreendimento sem nome"}</p>
        <div style={{ padding: 12, border: "1px solid #27272a", borderRadius: 8, background: "#18181b", marginBottom: 16 }}><span style={{ display: "block", color: "#a1a1aa", fontSize: 11 }}>Fontes disponíveis</span><strong style={{ color: apresentacoes[editing.id]?.pdf_url || apresentacoes[editing.id]?.link_url ? "#4ade80" : "#fbbf24", fontSize: 13 }}>{apresentacoes[editing.id]?.pdf_url ? "PDF" : "Sem PDF"} · {supportsLinks ? (apresentacoes[editing.id]?.link_url ? "Link" : "Sem link") : "Link aguardando atualização do banco"}</strong></div>
        <label style={labelStyle}>Fonte de apresentação incorporada<div style={inputWrapStyle}><Link2 size={15} /><input type="url" value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://..." style={inputStyle} /></div></label>
        {!supportsLinks&&<p style={{color:"#a1a1aa",fontSize:11,margin:"7px 0 0"}}>Compatibilidade ativa: o link será salvo com segurança no cadastro do empreendimento e migrado depois para a coluna definitiva.</p>}
        <>
        <label style={{ ...labelStyle, marginTop: 14 }}>Abrir por padrão<select value={preferredType} onChange={(event) => setPreferredType(event.target.value as "pdf" | "link")} style={selectStyle}><option value="pdf">PDF privado</option><option value="link">Fonte incorporada</option></select></label>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}><button disabled={saving} onClick={() => void saveSettings()} style={{ ...secondaryButtonStyle, opacity: saving ? .5 : 1 }}>{preferredType === "link" ? <ExternalLink size={15} /> : <Save size={15} />} Salvar link e preferência</button></div></>
        <hr style={{ border: 0, borderTop: "1px solid #27272a", margin: "18px 0" }} />
        <label style={labelStyle}>Novo PDF (até 250 MB)<input type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} style={{ color: "#d4d4d8", padding: "10px 0" }} /></label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}><button onClick={() => setEditing(null)} style={secondaryButtonStyle}>Cancelar</button><button disabled={!file || saving} onClick={() => void uploadPdf()} style={{ ...primaryButtonStyle, opacity: !file || saving ? .5 : 1 }}>{saving ? <Loader2 size={16} /> : <Upload size={16} />}{saving ? "Enviando..." : "Salvar PDF"}</button></div>
        <section style={{ display: "grid", gap: 11, marginTop: 22, padding: 15, border: "1px solid #65502a", borderRadius: 10, background: "linear-gradient(145deg,#1b1710,#111113)" }}>
          <div><small style={{ color: "#c5a059", fontWeight: 800, letterSpacing: ".1em" }}>MATERIAL SEPARADO PARA CLIENTES</small><h3 style={{ color: "#fff", margin: "5px 0" }}>Acesso pelo portal com prazo de validade</h3><p style={{ color: "#a1a1aa", fontSize: 12, margin: 0, lineHeight: 1.5 }}>Este material é independente da apresentação ao vivo acima. O portal só o mostra para clientes com curadoria e acesso válidos.</p></div>
          <label style={labelStyle}>Formato para o cliente<select value={clientType} onChange={(event) => setClientType(event.target.value as "" | "pdf" | "link" | "post")} style={selectStyle}><option value="">Sem material para cliente</option><option value="pdf">PDF privado</option><option value="link">Link externo / blog</option><option value="post">Post publicado do blog (modo limpo)</option></select></label>
          {clientType === "pdf" && <div style={{ display: "grid", gap: 5 }}><label style={labelStyle}>PDF enxuto do cliente (até {MAX_PDF_MB} MB)<input type="file" accept="application/pdf,.pdf" onChange={(event) => setClientPdfFile(event.target.files?.[0] || null)} style={{ color: "#d4d4d8", padding: "8px 0" }} /></label><small style={{ color: "#a1a1aa" }}>{clientPdfFile ? `${clientPdfFile.name} · ${(clientPdfFile.size / 1024 / 1024).toFixed(1)} MB` : apresentacoes[editing.id]?.cliente_pdf_path ? "Já existe um PDF privado; deixe o campo vazio para mantê-lo." : "O arquivo é privado e não substitui o PDF da apresentação ao vivo."}</small></div>}
          {clientType === "link" && <label style={labelStyle}>Link que o cliente poderá abrir<div style={inputWrapStyle}><Link2 size={15} /><input type="url" value={clientLinkUrl} onChange={(event) => setClientLinkUrl(event.target.value)} placeholder="https://..." style={inputStyle} /></div></label>}
          {clientType === "post" && <label style={labelStyle}>Post publicado vinculado a {editing.nome || "este empreendimento"}<select value={clientPostId} onChange={(event) => setClientPostId(event.target.value)} style={selectStyle}><option value="">Selecione um post</option>{clientPosts.filter((post) => !post.empreendimento_id || post.empreendimento_id === editing.id).map((post) => <option key={post.id} value={post.id}>{post.titulo} · /blog/{post.slug}/</option>)}</select><small style={{ color: "#a1a1aa" }}>{clientPosts.filter((post) => !post.empreendimento_id || post.empreendimento_id === editing.id).length ? "O cliente abrirá o conteúdo limpo, sem navegação, rodapé ou newsletter; o mapa de hospedagem do artigo será mantido." : "Não há posts publicados disponíveis para vincular. Publique o artigo primeiro."}</small></label>}
          {clientType && <small style={{ color: clientActive ? "#86efac" : "#fbbf24" }}>{clientActive ? "Este material está ativo para curadorias de clientes." : "Salvar o material o ativa; a visibilidade individual continua controlada pela curadoria e pelo prazo do cliente."}</small>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}><button disabled={saving} onClick={() => void saveClientPresentation()} style={{ ...primaryButtonStyle, opacity: saving ? .5 : 1 }}>{saving ? <Loader2 size={16} /> : <Save size={15} />}{clientType ? "Salvar material do cliente" : "Remover material do cliente"}</button></div>
        </section>
      </div>
    </div>}
  </section>;
}

const labelStyle = { display: "grid", gap: 6, color: "#a1a1aa", fontSize: 11 } as const;
const inputWrapStyle = { display: "flex", alignItems: "center", gap: 7, background: "#18181b", border: "1px solid #3f3f46", borderRadius: 6, padding: "0 9px", color: "#a1a1aa" } as const;
const inputStyle = { minWidth: 0, width: "100%", border: 0, outline: 0, background: "transparent", color: "#fff", padding: "10px 0" } as const;
const selectStyle = { background: "#18181b", border: "1px solid #3f3f46", borderRadius: 6, color: "#fff", padding: 10, minWidth: 0 } as const;
const primaryButtonStyle = { background: "#c5a059", color: "#09090b", border: 0, borderRadius: 6, padding: "9px 11px", fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, whiteSpace: "nowrap" } as const;
const secondaryButtonStyle = { background: "#242429", color: "#e4e4e7", border: "1px solid #3f3f46", borderRadius: 6, padding: "8px 10px", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap" } as const;
const cardStyle = { background: "#121212", border: "1px solid #29292e", borderRadius: 10, overflow: "hidden", display: "flex", flexDirection: "column" } as const;
const badgeStyle = { position: "absolute", top: 10, right: 10, borderRadius: 99, padding: "4px 8px", fontSize: 11 } as const;
const switchStyle = { width: 42, height: 23, borderRadius: 20, border: 0, padding: 2, cursor: "pointer" } as const;
const knobStyle = { display: "block", width: 19, height: 19, borderRadius: "50%", background: "#fff", transition: "transform .2s" } as const;
const overlayStyle = { position: "fixed", inset: 0, zIndex: 5000, display: "grid", placeItems: "center", padding: 20, background: "rgba(0,0,0,.78)" } as const;
const modalStyle = { width: "min(520px, 100%)", position: "relative", background: "#121212", border: "1px solid #3f3f46", borderRadius: 12, padding: 22, boxShadow: "0 24px 80px rgba(0,0,0,.55)" } as const;
const viewerOverlayStyle = { position: "fixed", inset: 0, zIndex: 5100, padding: 18, background: "rgba(0,0,0,.88)" } as const;
const viewerModalStyle = { width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#0d0d0f", border: "1px solid #3f3f46", borderRadius: 14, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,.65)" } as const;
const viewerHeaderStyle = { minHeight: 62, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, padding: "10px 18px", borderBottom: "1px solid #29292e", background: "#121212" } as const;
const viewerFrameStyle = { flex: 1, width: "100%", border: 0, background: "#080808" } as const;
const closeStyle = { position: "absolute", top: 14, right: 14, border: 0, background: "transparent", color: "#a1a1aa", cursor: "pointer", padding: 4 } as const;
