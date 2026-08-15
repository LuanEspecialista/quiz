import { Building2, Calculator, FileText, Home, Users } from "lucide-react";

const steps = [
  { tab: "clientes", label: "Cliente", detail: "Perfil e objetivo", icon: Users },
  { tab: "empreendimentos", label: "Curadoria", detail: "Imóveis compatíveis", icon: Building2 },
  { tab: "apresentacoes", label: "Apresentação", detail: "Experiência comercial", icon: FileText },
  { tab: "unidades", label: "Unidades", detail: "Estoque disponível", icon: Home },
  { tab: "fluxos", label: "Estratégia", detail: "Comparação financeira", icon: Calculator },
] as const;

export default function CommercialJourney({ onNavigate }: { onNavigate: (tab: string) => void }) {
  return <section aria-labelledby="commercial-journey-title" style={{ background: "linear-gradient(135deg,#11110f,#0d0d0f)", border: "1px solid #29251c", borderRadius: 10, padding: 14 }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "end", marginBottom: 11 }}>
      <div><small style={{ color: "#c5a059", textTransform: "uppercase", letterSpacing: ".1em", fontWeight: 700 }}>Jornada comercial</small><h2 id="commercial-journey-title" style={{ margin: "3px 0 0", fontSize: 15, color: "#f4f4f5" }}>Do primeiro contato à melhor decisão imobiliária</h2></div>
      <span style={{ color: "#71717a", fontSize: 11 }}>Fluxo integrado</span>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 7 }}>
      {steps.map(({ tab, label, detail, icon: Icon }, index) => <button key={tab} onClick={() => onNavigate(tab)} style={{ position: "relative", display: "grid", gridTemplateColumns: "30px 1fr", gap: 9, alignItems: "center", textAlign: "left", padding: 10, border: "1px solid #29292e", borderRadius: 8, background: "#141416", color: "#e4e4e7", cursor: "pointer" }}>
        <span style={{ width: 30, height: 30, display: "grid", placeItems: "center", borderRadius: 7, background: "#211c13", color: "#d7ab63" }}><Icon size={15} /></span>
        <span><strong style={{ display: "block", fontSize: 12 }}>{index + 1}. {label}</strong><small style={{ color: "#71717a", fontSize: 10 }}>{detail}</small></span>
      </button>)}
    </div>
  </section>;
}
