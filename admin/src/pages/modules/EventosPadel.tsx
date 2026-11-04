import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, ExternalLink, RefreshCw, Search, Trophy } from "lucide-react";
import { supabase } from "../../lib/supabase";

type EventLead = {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  created_at: string;
};

const EVENT_SLUG = "liga-brasileira-padel-balneario-camboriu-2026";
const csvCell = (value: string) => `"${String(value ?? "").replace(/"/g, '""')}"`;
const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
}).format(new Date(value));

export default function EventosPadelModule() {
  const [leads, setLeads] = useState<EventLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const { data, error: loadError } = await supabase
      .from("evento_padel_leads")
      .select("id,nome,telefone,email,created_at")
      .eq("evento_slug", EVENT_SLUG)
      .order("created_at", { ascending: false })
      .limit(5000);
    if (loadError) {
      setError(`Não foi possível carregar os cadastros: ${loadError.message}`);
      setLeads([]);
    } else {
      setLeads((data || []) as EventLead[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => {
    const term = query.trim().toLocaleLowerCase("pt-BR");
    if (!term) return leads;
    return leads.filter((lead) => `${lead.nome} ${lead.telefone} ${lead.email}`.toLocaleLowerCase("pt-BR").includes(term));
  }, [leads, query]);

  const exportCsv = () => {
    const rows = [
      ["Nome", "Telefone", "E-mail", "Data do cadastro"],
      ...filtered.map((lead) => [lead.nome, lead.telefone, lead.email, formatDate(lead.created_at)]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(";")).join("\r\n")}`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "leads-liga-brasileira-padel.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return <section style={{ display: "grid", gap: 18, color: "#f4f4f5" }}>
    <header style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <span style={{ display: "grid", placeItems: "center", width: 44, height: 44, borderRadius: 12, background: "#2a2113", color: "#d7ab63" }}><Trophy size={23} /></span>
        <div><p style={{ margin: 0, color: "#d7ab63", fontSize: 11, fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase" }}>Eventos · Pádel</p><h1 style={{ margin: "3px 0 0", fontSize: 25 }}>Liga Brasileira de Pádel</h1><p style={{ margin: "4px 0 0", color: "#a1a1aa", fontSize: 13 }}>Balneário Camboriú · 4 de novembro de 2026</p></div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <a href="/eventos/padel/" target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 7, border: "1px solid #383840", borderRadius: 7, padding: "9px 12px", color: "#e4d4b4", textDecoration: "none" }}><ExternalLink size={15} />Abrir landing page</a>
        <button type="button" onClick={exportCsv} disabled={!filtered.length} style={{ display: "inline-flex", alignItems: "center", gap: 7, border: 0, borderRadius: 7, padding: "9px 12px", background: "#d7ab63", color: "#17130d", fontWeight: 800, cursor: filtered.length ? "pointer" : "not-allowed", opacity: filtered.length ? 1 : .55 }}><Download size={15} />Exportar CSV</button>
      </div>
    </header>

    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10 }}>
      <div style={{ padding: 15, border: "1px solid #29292e", borderRadius: 9, background: "#111114" }}><small style={{ color: "#a1a1aa" }}>Cadastros neste evento</small><strong style={{ display: "block", marginTop: 5, fontSize: 26, color: "#e9d09e" }}>{loading ? "…" : leads.length}</strong></div>
      <div style={{ padding: 15, border: "1px solid #29292e", borderRadius: 9, background: "#111114" }}><small style={{ color: "#a1a1aa" }}>Acesso</small><strong style={{ display: "block", marginTop: 8, fontSize: 14 }}>Lista separada do cadastro de clientes</strong></div>
    </div>

    <div style={{ display: "flex", flexWrap: "wrap", gap: 9, alignItems: "center" }}>
      <label style={{ position: "relative", flex: "1 1 240px", maxWidth: 480 }}><Search size={16} style={{ position: "absolute", left: 11, top: 12, color: "#777" }} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar nome, telefone ou e-mail" style={{ width: "100%", boxSizing: "border-box", padding: "10px 11px 10px 35px", background: "#111114", border: "1px solid #36363d", borderRadius: 7, color: "#fff" }} /></label>
      <button type="button" onClick={() => void load()} disabled={loading} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 12px", background: "#17171b", border: "1px solid #36363d", borderRadius: 7, color: "#ddd", cursor: loading ? "wait" : "pointer" }}><RefreshCw size={15} />{loading ? "Atualizando…" : "Atualizar lista"}</button>
      <span style={{ color: "#92929a", fontSize: 12 }}>{filtered.length} resultado(s)</span>
    </div>

    {error && <p role="alert" style={{ margin: 0, padding: 12, border: "1px solid #7f342e", borderRadius: 7, color: "#ffb4a9", background: "#281513" }}>{error}</p>}
    <div style={{ overflowX: "auto", border: "1px solid #29292e", borderRadius: 9, background: "#101013" }}>
      <table style={{ width: "100%", minWidth: 690, borderCollapse: "collapse", textAlign: "left" }}>
        <thead><tr style={{ color: "#a1a1aa", fontSize: 12, borderBottom: "1px solid #29292e" }}>{["Nome", "Telefone", "E-mail", "Data do cadastro"].map((label) => <th key={label} style={{ padding: "12px 14px", fontWeight: 700 }}>{label}</th>)}</tr></thead>
        <tbody>{loading ? <tr><td colSpan={4} style={{ padding: 22, color: "#a1a1aa" }}>Carregando cadastros…</td></tr> : !filtered.length ? <tr><td colSpan={4} style={{ padding: 22, color: "#a1a1aa" }}>{error ? "Verifique o acesso à base de dados." : "Ainda não há cadastros para este evento."}</td></tr> : filtered.map((lead) => <tr key={lead.id} style={{ borderTop: "1px solid #242428" }}><td style={{ padding: "12px 14px", fontWeight: 700 }}>{lead.nome}</td><td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>{lead.telefone}</td><td style={{ padding: "12px 14px" }}>{lead.email}</td><td style={{ padding: "12px 14px", color: "#a1a1aa", whiteSpace: "nowrap" }}>{formatDate(lead.created_at)}</td></tr>)}</tbody>
      </table>
    </div>
    <small style={{ color: "#71717a" }}>Os dados desta lista são acessíveis apenas a utilizadores administradores autorizados. A exportação inclui os resultados atualmente filtrados.</small>
  </section>;
}
