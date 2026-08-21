import { useEffect, useState } from "react";
import { BarChart3, Building2, CalendarDays, LogOut, MapPin, WalletCards } from "lucide-react";
import { supabase } from "../lib/supabase";

type Opportunity = {
  id: string; nome?: string; cidade?: string; bairro?: string; status?: string; descricao?: string;
  imagem_url?: string; imagem_storage_path?: string; preco?: number | null; area_minima?: number | null; area_maxima?: number | null;
  caracteristicas?: Record<string, unknown> | null; mensagem?: string | null; exibir_investimento?: boolean; exibir_fluxo?: boolean;
};
type Portal = { cliente?: { nome?: string; objetivo?: string; modo?: "moradia" | "investidor" | "renda" | "revenda"; horizonte?: string; cidade?: string }; oportunidades?: Opportunity[] };

const money = (value?: number | null) => value == null ? "Sob consulta" : new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
const goalLabel = (goal?: string) => ({ moradia: "para morar", investidor: "para investir", renda: "para gerar renda", revenda: "para revenda" })[goal || ""] || "selecionadas para você";

export default function ClientPortal({ userName }: { userName?: string }) {
  const [portal, setPortal] = useState<Portal | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    void supabase.rpc("portal_cliente").then(async ({ data, error: requestError }) => {
      if (requestError) setError("Sua curadoria ainda não foi liberada. Fale com seu especialista.");
      else {
        const result=(data||{}) as Portal;
        const oportunidades=await Promise.all((result.oportunidades||[]).map(async(item)=>{if(!item.imagem_storage_path)return item;const{data:signed}=await supabase.storage.from("empreendimentos").createSignedUrl(item.imagem_storage_path,1800);return signed?.signedUrl?{...item,imagem_url:signed.signedUrl}:item}));
        setPortal({...result,oportunidades});
      }
    });
  }, []);

  const client = portal?.cliente;
  const opportunities = portal?.oportunidades || [];
  const firstName = (client?.nome || userName || "").trim().split(/\s+/)[0] || "";
  return <main style={{ minHeight: "100vh", background: "#09090b", color: "#f4f4f5", padding: "clamp(20px,4vw,56px)" }}>
    <div style={{ maxWidth: 1180, margin: "0 auto" }}>
      <header style={{ display: "flex", gap: 18, justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", marginBottom: 36 }}>
        <div><a href="/" style={{ color: "#d7ab63", textDecoration: "none", fontWeight: 800, fontSize: 12, letterSpacing: ".12em" }}>LUAN ESPECIALISTA</a><h1 style={{ fontSize: "clamp(28px,5vw,48px)", margin: "10px 0 8px" }}>Bem-vindo{firstName ? `, ${firstName}` : ""}.</h1><p style={{ color: "#a1a1aa", margin: 0, fontSize: 16 }}>Estas são as opções {goalLabel(client?.modo || client?.objetivo)} que foram selecionadas para você.</p></div>
        <button onClick={() => void supabase.auth.signOut()} style={{ border: "1px solid #3f3f46", background: "#18181b", color: "#d4d4d8", borderRadius: 8, padding: "10px 13px", display: "inline-flex", gap: 7, alignItems: "center", cursor: "pointer" }}><LogOut size={16} />Sair</button>
      </header>

      {client?.modo === "investidor" && <div style={{ border: "1px solid #4a3a20", background: "#1c1710", borderRadius: 10, padding: 14, marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}><BarChart3 size={20} color="#d7ab63" /><div><strong>Curadoria para investidor</strong><p style={{ margin: "3px 0 0", color: "#d4d4d8", fontSize: 13 }}>As informações de retorno aparecem somente quando forem liberadas pelo seu especialista. Projeções são premissas, não garantias.</p></div></div>}
      {error && <section style={{ border: "1px solid #854d0e", background: "#25170b", color: "#fed7aa", borderRadius: 10, padding: 16 }}>{error}</section>}
      {!error && !portal && <p style={{ color: "#a1a1aa" }}>Preparando sua curadoria…</p>}
      {!error && portal && opportunities.length === 0 && <section style={{ border: "1px solid #27272a", background: "#101012", borderRadius: 12, padding: 28, textAlign: "center", color: "#a1a1aa" }}>Seu especialista ainda não liberou oportunidades para esta curadoria.</section>}
      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 16 }}>
        {opportunities.map((item) => <article key={item.id} style={{ border: "1px solid #29292e", background: "#101012", borderRadius: 12, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {item.imagem_url && <img src={item.imagem_url} alt={item.nome || "Oportunidade"} style={{ width: "100%", height: 190, objectFit: "cover" }} />}
          <div style={{ padding: 18, display: "grid", gap: 12, flex: 1 }}>
            <div><small style={{ color: "#d7ab63", fontWeight: 700 }}>{item.status || "Oportunidade selecionada"}</small><h2 style={{ margin: "5px 0", fontSize: 21 }}>{item.nome}</h2>{(item.bairro || item.cidade) && <p style={{ margin: 0, color: "#a1a1aa", fontSize: 13, display: "flex", gap: 5, alignItems: "center" }}><MapPin size={14} />{[item.bairro, item.cidade].filter(Boolean).join(" · ")}</p>}</div>
            {item.mensagem && <p style={{ background: "#17140e", borderLeft: "3px solid #d7ab63", padding: "10px 12px", margin: 0, fontSize: 13, lineHeight: 1.5 }}>{item.mensagem}</p>}
            {item.descricao && <p style={{ margin: 0, color: "#d4d4d8", fontSize: 13, lineHeight: 1.55 }}>{item.descricao}</p>}
            {(item.preco != null || item.area_minima != null) && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9, fontSize: 12 }}><span style={{ color: "#8b8b95" }}><WalletCards size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />A partir de<strong style={{ display: "block", color: "#fff", marginTop: 4, fontSize: 15 }}>{money(item.preco)}</strong></span>{item.area_minima != null && <span style={{ color: "#8b8b95" }}><Building2 size={14} style={{ verticalAlign: "middle", marginRight: 4 }} />Área<strong style={{ display: "block", color: "#fff", marginTop: 4, fontSize: 15 }}>{item.area_minima}{item.area_maxima && item.area_maxima !== item.area_minima ? `–${item.area_maxima}` : ""} m²</strong></span>}</div>}
            {(item.exibir_investimento || item.exibir_fluxo) && <div style={{ borderTop: "1px solid #29292e", paddingTop: 11, color: "#d4d4d8", fontSize: 12, display: "grid", gap: 5 }}>{item.exibir_investimento && <span>✓ Indicadores de investimento liberados</span>}{item.exibir_fluxo && <span>✓ Fluxo de pagamento disponível na apresentação</span>}</div>}
            <a href="https://wa.me/5547992120915" target="_blank" rel="noreferrer" style={{ marginTop: "auto", display: "inline-flex", justifyContent: "center", alignItems: "center", gap: 6, background: "#d7ab63", color: "#09090b", textDecoration: "none", borderRadius: 7, padding: 11, fontWeight: 800, fontSize: 13 }}><CalendarDays size={15} />Conversar com especialista</a>
          </div>
        </article>)}
      </section>
    </div>
  </main>;
}
