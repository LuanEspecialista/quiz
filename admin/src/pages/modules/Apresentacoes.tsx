import { useEffect, useMemo, useState } from "react";
import { Edit3, FileText, Loader2, Play, RefreshCw, Search, Upload, X } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Empreendimento = { id: string; nome?: string | null; cidade?: string | null; imagem_url?: string | null };
type Apresentacao = {
  empreendimento_id: string;
  ativo: boolean;
  pdf_url?: string | null;
  storage_path?: string | null;
  updated_at?: string | null;
};

const BUCKET = "pdfs";
const MAX_PDF_MB = 250;
const MAX_PDF_BYTES = MAX_PDF_MB * 1024 * 1024;
const UPLOAD_TIMEOUT_MS = 10 * 60_000;
const presentationPath = (id: string) => `apresentacoes/${id}/apresentacao.pdf`;

function errorMessage(error: unknown, fallback: string) {
  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return error.message;
  }
  return fallback;
}

export default function Apresentacoes() {
  const [empreendimentos, setEmpreendimentos] = useState<Empreendimento[]>([]);
  const [apresentacoes, setApresentacoes] = useState<Record<string, Apresentacao>>({});
  const [editing, setEditing] = useState<Empreendimento | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [search, setSearch] = useState("");
  const [cityFilter, setCityFilter] = useState("Todas");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ error?: string; success?: string } | null>(null);

  async function load() {
    setLoading(true);
    setMessage(null);
    try {
      const [empResult, presentationResult] = await Promise.all([
        supabase.from("empreendimentos").select("id, nome, cidade, imagem_url").order("nome"),
        supabase.from("apresentacoes").select("empreendimento_id, ativo, pdf_url, storage_path, updated_at"),
      ]);
      if (empResult.error) throw empResult.error;
      if (presentationResult.error) throw presentationResult.error;
      setEmpreendimentos((empResult.data || []) as Empreendimento[]);
      setApresentacoes(Object.fromEntries(((presentationResult.data || []) as Apresentacao[]).map((item) => [item.empreendimento_id, item])));
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

  const cities = useMemo(() => [
    "Todas",
    ...Array.from(new Set(empreendimentos.map((item) => item.cidade?.trim()).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, "pt-BR")),
  ], [empreendimentos]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("pt-BR");
    return empreendimentos.filter((item) =>
      (!term || `${item.nome || ""} ${item.cidade || ""}`.toLocaleLowerCase("pt-BR").includes(term)) &&
      (cityFilter === "Todas" || item.cidade?.trim() === cityFilter),
    );
  }, [empreendimentos, search, cityFilter]);

  async function toggleActive(item: Empreendimento) {
    const previous = apresentacoes[item.id];
    const ativo = !(previous?.ativo ?? false);
    setApresentacoes((state) => ({ ...state, [item.id]: { ...previous, empreendimento_id: item.id, ativo } }));
    const { data, error } = await supabase.from("apresentacoes")
      .upsert({ empreendimento_id: item.id, ativo }, { onConflict: "empreendimento_id" })
      .select("empreendimento_id, ativo, pdf_url, storage_path, updated_at").single();
    if (error) {
      setApresentacoes((state) => {
        const next = { ...state };
        if (previous) next[item.id] = previous; else delete next[item.id];
        return next;
      });
      setMessage({ error: error.message || "Não foi possível atualizar o status." });
    } else {
      setApresentacoes((state) => ({ ...state, [item.id]: data as Apresentacao }));
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
    const path = presentationPath(editing.id);
    try {
      const upload = await Promise.race([
        supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: "application/pdf", cacheControl: "0" }),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => reject(new Error("O upload excedeu o tempo limite de 10 minutos. Tente novamente.")), UPLOAD_TIMEOUT_MS);
        }),
      ]);
      if (upload.error) throw upload.error;
      const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const current = apresentacoes[editing.id];
      const payload = { empreendimento_id: editing.id, ativo: current?.ativo ?? true, pdf_url: urlData.publicUrl, storage_path: path, updated_at: new Date().toISOString() };
      const { data, error } = await supabase.from("apresentacoes").upsert(payload, { onConflict: "empreendimento_id" })
        .select("empreendimento_id, ativo, pdf_url, storage_path, updated_at").single();
      if (error) throw error;
      setApresentacoes((state) => ({ ...state, [editing.id]: data as Apresentacao }));
      setFile(null);
      setMessage({ success: "PDF atualizado. A apresentação anterior foi substituída." });
    } catch (error: unknown) {
      setMessage({ error: errorMessage(error, "Não foi possível salvar o PDF.") });
    } finally {
      setSaving(false);
    }
  }

  function present(item: Empreendimento) {
    const presentation = apresentacoes[item.id];
    if (!presentation?.ativo || !presentation.pdf_url) return;
    const configuredOrigin = String(import.meta.env.VITE_PUBLIC_SITE_URL || "").trim();
    const isLocalPanel = ["localhost", "127.0.0.1"].includes(window.location.hostname) && window.location.port !== "5500";
    const publicOrigin = configuredOrigin || (isLocalPanel
      ? `${window.location.protocol}//${window.location.hostname}:5500`
      : window.location.origin);
    const viewerUrl = new URL("/apresentacao/", publicOrigin);
    viewerUrl.searchParams.set("empreendimento", item.id);
    if (isLocalPanel) {
      viewerUrl.searchParams.set("pdf", presentation.pdf_url || "");
      viewerUrl.searchParams.set("nome", item.nome || "Apresentação");
      viewerUrl.searchParams.set("painel", window.location.origin);
    }
    window.open(viewerUrl.toString(), "_blank", "noopener,noreferrer");
  }

  return <section style={{ maxWidth: 1240, margin: "0 auto", color: "#e4e4e7" }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 18, marginBottom: 20 }}>
      <div><h1 style={{ color: "#fff", fontSize: 23, margin: 0 }}>Apresentações</h1><p style={{ margin: "6px 0 0", color: "#a1a1aa", fontSize: 13 }}>Uma apresentação por empreendimento cadastrado.</p></div>
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
          const hasPdf = Boolean(presentation?.pdf_url);
          const active = Boolean(presentation?.ativo);
          const canPresent = active && hasPdf;
          return <article key={item.id} style={cardStyle}>
            <div style={{ height: 142, background: "#1a1a1f", position: "relative" }}>
              {item.imagem_url ? <img src={item.imagem_url} alt={item.nome || "Empreendimento"} style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ height: "100%", display: "grid", placeItems: "center", color: "#71717a" }}><FileText size={30} /></div>}
              <span style={{ ...badgeStyle, background: active ? "#14532d" : "#4c1d1d", color: active ? "#bbf7d0" : "#fecaca" }}>{active ? "Ativa" : "Desativada"}</span>
            </div>
            <div style={{ padding: 15, display: "flex", flexDirection: "column", flex: 1 }}>
              <h2 style={{ color: "#fff", fontSize: 15, margin: 0 }}>{item.nome || "Sem nome"}</h2>
              <p style={{ color: "#a1a1aa", fontSize: 12, margin: "5px 0" }}>{item.cidade || "Cidade não informada"}</p>
              <p style={{ color: hasPdf ? "#c5a059" : "#fbbf24", fontSize: 12, margin: "0 0 16px" }}>{hasPdf ? "PDF cadastrado" : "Apresentação ainda não cadastrada"}</p>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 16 }}>
                <button onClick={() => void toggleActive(item)} aria-label={active ? "Desativar apresentação" : "Ativar apresentação"} aria-pressed={active} style={{ ...switchStyle, background: active ? "#16a34a" : "#b91c1c" }}><span style={{ ...knobStyle, transform: active ? "translateX(19px)" : "translateX(0)" }} /></button>
                <button onClick={() => { setEditing(item); setFile(null); setMessage(null); }} style={secondaryButtonStyle}><Edit3 size={14} /> Editar</button>
              </div>
              <button disabled={!canPresent} onClick={() => present(item)} title={!hasPdf ? "Cadastre um PDF primeiro" : !active ? "Ative a apresentação primeiro" : undefined} style={{ ...primaryButtonStyle, marginTop: "auto", alignSelf: "center", opacity: canPresent ? 1 : .45, cursor: canPresent ? "pointer" : "not-allowed" }}><Play size={14} /> Apresentar</button>
            </div>
          </article>;
        })}
      </div>
    </>}

    {editing && <div role="dialog" aria-modal="true" aria-labelledby="presentation-modal-title" style={overlayStyle} onMouseDown={(event) => { if (event.target === event.currentTarget) setEditing(null); }}>
      <div style={modalStyle}>
        <button onClick={() => setEditing(null)} aria-label="Fechar" style={closeStyle}><X size={18} /></button>
        <h2 id="presentation-modal-title" style={{ margin: "0 36px 4px 0", color: "#fff", fontSize: 18 }}>Editar apresentação</h2>
        <p style={{ color: "#c5a059", fontWeight: 700, margin: "0 0 18px" }}>{editing.nome || "Empreendimento sem nome"}</p>
        <div style={{ padding: 12, border: "1px solid #27272a", borderRadius: 8, background: "#18181b", marginBottom: 16 }}><span style={{ display: "block", color: "#a1a1aa", fontSize: 11 }}>Apresentação atual</span><strong style={{ color: apresentacoes[editing.id]?.pdf_url ? "#4ade80" : "#fbbf24", fontSize: 13 }}>{apresentacoes[editing.id]?.pdf_url ? "PDF cadastrado" : "Nenhum PDF cadastrado"}</strong></div>
        <label style={labelStyle}>Novo PDF (até 250 MB)<input type="file" accept="application/pdf,.pdf" onChange={(event) => setFile(event.target.files?.[0] || null)} style={{ color: "#d4d4d8", padding: "10px 0" }} /></label>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}><button onClick={() => setEditing(null)} style={secondaryButtonStyle}>Cancelar</button><button disabled={!file || saving} onClick={() => void uploadPdf()} style={{ ...primaryButtonStyle, opacity: !file || saving ? .5 : 1 }}>{saving ? <Loader2 size={16} /> : <Upload size={16} />}{saving ? "Enviando..." : "Salvar PDF"}</button></div>
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
const closeStyle = { position: "absolute", top: 14, right: 14, border: 0, background: "transparent", color: "#a1a1aa", cursor: "pointer", padding: 4 } as const;
