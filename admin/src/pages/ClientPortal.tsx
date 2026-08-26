import { useEffect, useState } from "react";
import { Building2, CalendarDays, Landmark, LogOut, MapPin, Send, WalletCards, X } from "lucide-react";
import { supabase } from "../lib/supabase";

type Opportunity = { id: string; nome?: string; cidade?: string; bairro?: string; status?: string; descricao?: string; imagem_url?: string; imagem_storage_path?: string; preco?: number | null; area_minima?: number | null; area_maxima?: number | null; mensagem?: string | null; permitir_proposta?: boolean };
type Portal = { cliente?: { nome?: string; objetivo?: string }; oportunidades?: Opportunity[] };
const money = (value?: number | null) => value == null ? "Sob consulta" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const input = { width: "100%", boxSizing: "border-box" as const, background: "#09090b", border: "1px solid #3f3f46", borderRadius: 7, color: "#fff", padding: "10px 11px", fontSize: 14 };

function MoneyScenario({ label, value, setValue, max }: { label: string; value: number; setValue: (value: number) => void; max: number }) {
  return <label style={{ fontSize: 12, color: "#d4d4d8" }}>
    {label}
    <input type="number" min="0" step="500" value={value || ""} onChange={(e) => setValue(Math.max(0, Number(e.target.value) || 0))} style={{ ...input, marginTop: 6 }} />
    <input type="range" min="0" max={max} step="500" value={Math.min(value, max)} onChange={(e) => setValue(Number(e.target.value))} style={{ width: "100%", accentColor: "#d7ab63" }} />
    <b style={{ color: "#f5e0b2", fontSize: 13 }}>{money(value)}</b>
  </label>;
}

export default function ClientPortal({ userName }: { userName?: string }) {
  const [portal, setPortal] = useState<Portal | null>(null);
  const [error, setError] = useState("");
  const [proposal, setProposal] = useState<Opportunity | null>(null);
  const [entry, setEntry] = useState(0); const [monthly, setMonthly] = useState(2500); const [balloon, setBalloon] = useState(0); const [balloonCount, setBalloonCount] = useState(0); const [note, setNote] = useState(""); const [sending, setSending] = useState(false); const [sent, setSent] = useState("");

  useEffect(() => { void supabase.rpc("portal_cliente").then(async ({ data, error: requestError }) => {
    if (requestError) { setError("Sua curadoria ainda não foi liberada. Fale com seu especialista."); return; }
    const result = (data || {}) as Portal;
    const opportunities = await Promise.all((result.oportunidades || []).map(async (item) => {
      if (!item.imagem_storage_path) return item;
      const { data: signed } = await supabase.storage.from("empreendimentos").createSignedUrl(item.imagem_storage_path, 1800);
      return signed?.signedUrl ? { ...item, imagem_url: signed.signedUrl } : item;
    }));
    setPortal({ ...result, oportunidades: opportunities });
  }); }, []);

  const client = portal?.cliente; const opportunities = portal?.oportunidades || []; const firstName = (client?.nome || userName || "").trim().split(/\s+/)[0] || "";
  const openProposal = (item: Opportunity) => { setProposal(item); setEntry(Math.round((Number(item.preco) || 0) * .1)); setMonthly(2500); setBalloon(0); setBalloonCount(0); setNote(""); setSent(""); };
  const sendProposal = async () => { if (!proposal) return; setSending(true); setSent(""); const { error: rpcError } = await supabase.rpc("enviar_proposta_cliente", { p_empreendimento_id: proposal.id, p_entrada: entry, p_parcela_mensal: monthly, p_balao: balloon, p_quantidade_baloes: balloonCount, p_objetivo: client?.objetivo || null, p_mensagem: note || null }); setSending(false); setSent(rpcError ? "Não foi possível enviar agora. Revise os valores ou fale com seu especialista." : "Interesse registrado. Seu especialista receberá este cenário para análise com a construtora."); };

  return <main style={{ minHeight: "100vh", background: "#09090b", color: "#f4f4f5", padding: "clamp(20px,4vw,56px)" }}><div style={{ maxWidth: 1180, margin: "0 auto" }}>
    <header style={{ display: "flex", justifyContent: "space-between", gap: 18, flexWrap: "wrap", marginBottom: 32 }}><div><a href="/" style={{ color: "#d7ab63", textDecoration: "none", fontWeight: 800, fontSize: 12, letterSpacing: ".12em" }}>LUAN ESPECIALISTA</a><h1 style={{ fontSize: "clamp(28px,5vw,48px)", margin: "10px 0 8px" }}>Bem-vindo{firstName ? `, ${firstName}` : ""}.</h1><p style={{ color: "#a1a1aa", margin: 0 }}>Uma curadoria pessoal de oportunidades selecionadas para você.</p></div><button onClick={() => void supabase.auth.signOut()} style={{ border: "1px solid #3f3f46", background: "#18181b", color: "#d4d4d8", borderRadius: 8, padding: "10px 13px", cursor: "pointer" }}><LogOut size={16} /> Sair</button></header>
    {error && <section style={{ border: "1px solid #854d0e", background: "#25170b", color: "#fed7aa", borderRadius: 10, padding: 16 }}>{error}</section>}
    {!error && !portal && <p style={{ color: "#a1a1aa" }}>Preparando sua curadoria…</p>}
    {!error && portal && !opportunities.length && <section style={{ border: "1px solid #27272a", background: "#101012", borderRadius: 12, padding: 28, textAlign: "center", color: "#a1a1aa" }}>Seu especialista ainda não liberou oportunidades para esta curadoria.</section>}
    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: 16 }}>{opportunities.map((item) => <article key={item.id} style={{ border: "1px solid #29292e", background: "#101012", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
      {item.imagem_url && <img src={item.imagem_url} alt={item.nome || "Oportunidade"} style={{ width: "100%", height: 190, objectFit: "cover" }} />}
      <div style={{ padding: 18, display: "grid", gap: 12, flex: 1 }}><div><small style={{ color: "#d7ab63", fontWeight: 700 }}>{item.status || "Oportunidade selecionada"}</small><h2 style={{ margin: "5px 0", fontSize: 21 }}>{item.nome}</h2>{(item.bairro || item.cidade) && <p style={{ margin: 0, color: "#a1a1aa", fontSize: 13 }}><MapPin size={14} style={{ verticalAlign: "middle" }} /> {[item.bairro, item.cidade].filter(Boolean).join(" · ")}</p>}</div>
        {item.mensagem && <p style={{ background: "#17140e", borderLeft: "3px solid #d7ab63", padding: "10px 12px", margin: 0, fontSize: 13 }}>{item.mensagem}</p>}{item.descricao && <p style={{ margin: 0, color: "#d4d4d8", fontSize: 13, lineHeight: 1.55 }}>{item.descricao}</p>}
        {(item.preco != null || item.area_minima != null) && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, fontSize: 12 }}><span style={{ color: "#8b8b95" }}><WalletCards size={14} /> A partir de<strong style={{ display: "block", color: "#fff", marginTop: 4, fontSize: 15 }}>{money(item.preco)}</strong></span>{item.area_minima != null && <span style={{ color: "#8b8b95" }}><Building2 size={14} /> Área<strong style={{ display: "block", color: "#fff", marginTop: 4, fontSize: 15 }}>{item.area_minima}{item.area_maxima && item.area_maxima !== item.area_minima ? `–${item.area_maxima}` : ""} m²</strong></span>}</div>}
        <div style={{ display: "grid", gap: 8, marginTop: "auto" }}>{item.permitir_proposta && <button onClick={() => openProposal(item)} style={{ border: 0, background: "#d7ab63", color: "#09090b", borderRadius: 7, padding: 11, fontWeight: 800, cursor: "pointer" }}><Landmark size={15} /> Montar proposta</button>}<a href="https://wa.me/5547992120915" target="_blank" rel="noreferrer" style={{ textAlign: "center", border: "1px solid #54452c", color: "#ead5aa", textDecoration: "none", borderRadius: 7, padding: 10, fontWeight: 700, fontSize: 12 }}><CalendarDays size={15} /> Falar com especialista</a></div>
      </div></article>)}</section>
    {proposal && <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#000b", padding: 20, overflow: "auto", display: "grid", placeItems: "center" }} onMouseDown={(e) => e.target === e.currentTarget && setProposal(null)}><section style={{ width: "min(700px,100%)", background: "#111113", border: "1px solid #514124", borderRadius: 13, padding: "clamp(18px,3vw,28px)" }}><header style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><div><p style={{ margin: 0, color: "#d7ab63", fontSize: 11, fontWeight: 800 }}>CENÁRIO PERSONALIZADO</p><h2 style={{ margin: "6px 0" }}>Proposta para {proposal.nome}</h2><p style={{ margin: 0, color: "#a1a1aa", fontSize: 13 }}>Defina o que é confortável para você. O envio inicia uma análise, não confirma condições.</p></div><button onClick={() => setProposal(null)}><X size={16} /></button></header>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 13, marginTop: 22 }}><MoneyScenario label="Entrada" value={entry} setValue={setEntry} max={proposal.preco || 500000} /><MoneyScenario label="Parcela mensal" value={monthly} setValue={setMonthly} max={Math.max(20000, (proposal.preco || 500000) * .08)} /><MoneyScenario label="Balão" value={balloon} setValue={setBalloon} max={proposal.preco || 500000} /></div>
      <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 13, marginTop: 13 }}><label style={{ fontSize: 12, color: "#d4d4d8" }}>Quantidade de balões<input type="number" min="0" max="120" value={balloonCount || ""} onChange={(e) => setBalloonCount(Math.max(0, Math.min(120, Number(e.target.value) || 0)))} style={{ ...input, marginTop: 6 }} /></label><label style={{ fontSize: 12, color: "#d4d4d8" }}>Observação<textarea value={note} maxLength={1500} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Ex.: consigo ajustar a entrada em dois atos." style={{ ...input, marginTop: 6, resize: "vertical" }} /></label></div>
      <div style={{ marginTop: 18, padding: 12, borderRadius: 8, background: "#17140e", color: "#d4d4d8", fontSize: 12 }}>O especialista receberá: entrada {money(entry)}, parcela mensal {money(monthly)}{balloonCount ? `, ${balloonCount} balão(ões) de ${money(balloon)}` : ""}. A construtora valida condições e disponibilidade.</div>{sent && <p style={{ color: sent.startsWith("Interesse") ? "#86efac" : "#fbbf24", fontSize: 13 }}>{sent}</p>}<button disabled={sending} onClick={() => void sendProposal()} style={{ marginTop: 16, width: "100%", border: 0, borderRadius: 7, padding: 12, background: "#d7ab63", color: "#09090b", fontWeight: 800, cursor: "pointer" }}><Send size={15} /> {sending ? "Enviando…" : "Enviar cenário para análise"}</button>
    </section></div>}
  </div></main>;
}
