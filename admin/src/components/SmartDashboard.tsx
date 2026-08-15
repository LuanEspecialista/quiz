import { useEffect, useState } from "react";
import { Search, Users, Building2, Layers, Presentation, Sparkles } from "lucide-react";
import { supabase } from "../lib/supabase";

export type SmartUnitFilters = { entrada: number; balao: number; parcela: number; cidade: string; dormitorios: number; incluirCompactos: boolean; prazoMeses: number };

const field = { width: "100%", boxSizing: "border-box" as const, background: "#0b0b0d", color: "#fff", border: "1px solid #34343a", borderRadius: 7, padding: "10px 11px", marginTop: 6 };
const moneyInput = (raw: string) => {
  const digits = raw.replace(/\D/g, "");
  return digits ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Number(digits) / 100) : "";
};
const numberFromMoney = (raw: string) => Number(raw.replace(/\D/g, "")) / 100 || 0;

export default function SmartDashboard({ metrics, onSearch, onNavigate }: { metrics: { empreendimentos: number; unidades: number; clientes: number; propostasEmAndamento: number }; onSearch: (filters: SmartUnitFilters) => void; onNavigate: (tab: string) => void }) {
  const [cities, setCities] = useState<string[]>([]);
  const [entrada, setEntrada] = useState("");
  const [balao, setBalao] = useState("");
  const [parcela, setParcela] = useState("");
  const [cidade, setCidade] = useState("");
  const [dormitorios, setDormitorios] = useState(0);
  const [incluirCompactos, setIncluirCompactos] = useState(true);
  const [prazoMeses, setPrazoMeses] = useState(0);

  useEffect(() => {
    void supabase.from("empreendimentos").select("cidade").then(({ data }) => setCities(Array.from(new Set((data || []).map((item: any) => String(item.cidade || "").trim()).filter(Boolean))).sort()));
  }, []);

  const search = () => onSearch({ entrada: numberFromMoney(entrada), balao: numberFromMoney(balao), parcela: numberFromMoney(parcela), cidade, dormitorios, incluirCompactos, prazoMeses });

  return <div style={{ display: "grid", gap: 18 }}>
    <header><small style={{ color: "#c5a059", textTransform: "uppercase", letterSpacing: ".12em" }}>Inteligência comercial</small><h1 style={{ margin: "5px 0", fontSize: 24 }}>Encontre a unidade certa para o cliente</h1><p style={{ color: "#8b8b95", margin: 0 }}>Cruze capacidade de pagamento, localização e perfil do imóvel em uma única busca.</p></header>
    <section style={{ background: "linear-gradient(135deg,#15130e,#101012)", border: "1px solid #4a3a21", borderRadius: 10, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}><Sparkles size={17} color="#d7ab63"/><strong>Busca inteligente de oportunidades</strong></div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(155px,1fr))", gap: 11 }}>
        <label style={{ color: "#a1a1aa", fontSize: 12 }}>Entrada máxima<input value={entrada} onChange={(e)=>setEntrada(moneyInput(e.target.value))} placeholder="R$ 40.000,00" style={field}/></label>
        <label style={{ color: "#a1a1aa", fontSize: 12 }}>Balão máximo<input value={balao} onChange={(e)=>setBalao(moneyInput(e.target.value))} placeholder="R$ 50.000,00" style={field}/></label>
        <label style={{ color: "#a1a1aa", fontSize: 12 }}>Parcela máxima<input value={parcela} onChange={(e)=>setParcela(moneyInput(e.target.value))} placeholder="R$ 2.000,00" style={field}/></label>
        <label style={{ color: "#a1a1aa", fontSize: 12 }}>Cidade<select value={cidade} onChange={(e)=>setCidade(e.target.value)} style={field}><option value="">Todas as cidades</option>{cities.map((item)=><option key={item}>{item}</option>)}</select></label>
        <label style={{ color: "#a1a1aa", fontSize: 12 }}>Dormitórios mínimos (Q+S)<select value={dormitorios} onChange={(e)=>{ const value=Number(e.target.value); setDormitorios(value); if(value>0)setIncluirCompactos(false); }} style={field}><option value={0}>Qualquer tipologia</option><option value={1}>1+ dormitório (Q+S)</option><option value={2}>2+ dormitórios (Q+S)</option><option value={3}>3+ dormitórios (ex.: 2Q+1S)</option><option value={4}>4+ dormitórios (Q+S)</option></select></label>
        <label style={{ color: "#a1a1aa", fontSize: 12 }}>Prazo desejado para entrega<select value={prazoMeses} onChange={(e)=>setPrazoMeses(Number(e.target.value))} style={field}><option value={0}>Qualquer prazo</option>{Array.from({ length: 12 }, (_, index) => (index + 1) * 6).map((months)=><option key={months} value={months}>{months} meses</option>)}</select><small style={{ display: "block", marginTop: 5, color: "#71717a" }}>Inclui oportunidades até 6 meses próximas do prazo.</small></label>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 14, alignItems: "center", marginTop: 14, flexWrap: "wrap" }}><label style={{ color: dormitorios > 0 ? "#52525b" : "#a1a1aa", fontSize: 12, display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" disabled={dormitorios > 0} checked={incluirCompactos} onChange={(e)=>setIncluirCompactos(e.target.checked)}/> Sugerir Studio/Loft somente sem exigência de dormitórios</label><button onClick={search} style={{ background: "#d6a94f", color: "#090909", border: 0, borderRadius: 7, padding: "10px 18px", fontWeight: 800, cursor: "pointer", display: "flex", gap: 7, alignItems: "center" }}><Search size={16}/>Pesquisar unidades</button></div>
    </section>
    <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10 }}>
      {[{label:"Clientes",value:metrics.clientes,icon:Users,tab:"clientes"},{label:"Empreendimentos",value:metrics.empreendimentos,icon:Building2,tab:"empreendimentos"},{label:"Unidades mapeadas",value:metrics.unidades,icon:Layers,tab:"unidades"},{label:"Apresentações",value:"Acessar",icon:Presentation,tab:"apresentacoes"}].map((item)=><button key={item.label} onClick={()=>onNavigate(item.tab)} style={{ background: "#121214", border: "1px solid #25252a", borderRadius: 8, padding: 14, color: "#fff", cursor: "pointer", textAlign: "left", display: "flex", justifyContent: "space-between", alignItems: "center" }}><span><small style={{ color: "#8b8b95", display: "block", marginBottom: 5 }}>{item.label}</small><strong style={{ fontSize: 18 }}>{item.value}</strong></span><item.icon size={19} color="#c5a059"/></button>)}
    </section>
  </div>;
}
