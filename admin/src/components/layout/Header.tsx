import { useState, useEffect } from "react";
import { User, Settings, Zap, ArrowUpRight, ChevronDown, Save, LogOut } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { getExchangeRate } from "../../lib/exchangeRate";
import LanguageSelector from "../LanguageSelector";

interface HeaderProps {
  userName?: string;
  setActiveTab?: (tab: string) => void;
  onTickerSelect?: (ticker: any) => void;
}

export function Header({ userName, setActiveTab, onTickerSelect }: HeaderProps) {
  const [indicadores, setIndicadores] = useState<any[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [displayName, setDisplayName] = useState(userName || "");
  const [savingName, setSavingName] = useState(false);

  useEffect(() => setDisplayName(userName || ""), [userName]);

  useEffect(() => {
    void loadIndicadores();
    const refresh = () => void loadIndicadores();
    const intervalId = window.setInterval(refresh, 5 * 60_000);
    window.addEventListener("luan:cotacao-atualizada", refresh);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("luan:cotacao-atualizada", refresh);
    };
  }, []);

  const loadIndicadores = async () => {
    try {
      const [{ data }, cotacao] = await Promise.all([
        supabase.from("indicadores").select("*"),
        getExchangeRate(),
      ]);
      if (data) {
        const next = [...data];
        const dollarIndex = next.findIndex((item) => String(item.nome || "").toLocaleUpperCase("pt-BR").includes("DÓLAR"));
        if (cotacao?.value && dollarIndex >= 0) next[dollarIndex] = { ...next[dollarIndex], valor_atual: cotacao.value, data_atualizacao: cotacao.date };
        if (cotacao?.value && dollarIndex < 0) next.unshift({ id: "ptax-usd-brl", nome: "Dólar PTAX", categoria: "MOEDA", valor_atual: cotacao.value, data_atualizacao: cotacao.date });
        setIndicadores(next);
      }
    } catch (err) {
      console.error("Erro ao carregar ticker no header:", err);
    }
  };

  const formatValor = (val: number, cat?: string) => {
    if (val === undefined || val === null) return "—";
    const categoria = cat ? cat.toUpperCase() : "";
    if (categoria === "MOEDA" || categoria.includes("DÓLAR")) {
      return `R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    if (categoria === "IMOBILIARIO_M2") {
      return `R$ ${val.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}/m²`;
    }
    return `${val.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}%`;
  };

  const saveDisplayName = async () => {
    const fullName = displayName.trim();
    if (!fullName) return;
    setSavingName(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: fullName } });
    setSavingName(false);
    if (error) alert(`Não foi possível salvar o nome: ${error.message}`);
    else window.location.reload();
  };

  return (
    <header className="app-header" style={{
      position: "fixed",
      top: 0,
      right: 0,
      left: "250px",
      height: "56px",
      backgroundColor: "#0d0d0d",
      borderBottom: "1px solid #1f1f23",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 1.5rem",
      zIndex: 50,
      boxSizing: "border-box"
    }}>
      <style>{`
        @media (max-width: 767px) {
          .app-header { left: 0 !important; padding: 0 .75rem !important; }
          .app-header-user-name, .app-header-market-label { display: none; }
        }
        @keyframes tickerHeader {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .header-ticker-track {
          display: flex;
          gap: 0;
          width: max-content;
          animation: tickerHeader 30s linear infinite;
        }
        .header-ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* TICKER DE COTAÇÕES INTEGRADO NO CABEÇALHO */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", overflow: "hidden", height: "100%", marginRight: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", paddingRight: "0.8rem", color: "#c5a059", fontWeight: "bold", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
          <Zap style={{ width: "13px", height: "13px" }} />
          <span className="app-header-market-label">Mercado</span><span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
        </div>

        <div style={{ overflow: "hidden", width: "100%", height: "100%", display: "flex", alignItems: "center" }}>
          {indicadores.length === 0 ? (
            <span style={{ color: "#52525b", fontSize: "0.72rem" }}>Sem indicadores ao vivo</span>
          ) : (
            <div className="header-ticker-track">
              {[...indicadores, ...indicadores].map((ind, idx) => (
                <div
                  key={`${ind.id}-${idx}`}
                  onClick={() => onTickerSelect && onTickerSelect(ind)}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    padding: "0 1rem",
                    height: "55px",
                    minWidth: "145px",
                    borderRadius: "4px",
                    backgroundColor: "#141414",
                    border: "1px solid #222",
                    fontSize: "0.72rem"
                  }}
                >
                  <span style={{ color: "#8b8b95", textTransform: "uppercase", fontSize: "0.62rem", letterSpacing: "0.5px" }}>{ind.nome}</span>
                  <strong style={{ color: "#fff", fontFamily: "ui-monospace, Consolas, monospace" }}>{formatValor(ind.valor_atual ?? ind.valor, ind.categoria)}</strong>
                  <ArrowUpRight style={{ width: "11px", height: "11px", color: "#22c55e" }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* USUÁRIO / CONFIGURAÇÕES DISCRETO */}
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 8 }}>
        <LanguageSelector />
        <button
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            background: "none",
            border: "none",
            color: "#a1a1aa",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            cursor: "pointer",
            fontSize: "0.8rem",
            padding: "0.3rem 0.5rem",
            borderRadius: "6px"
          }}
        >
          <div style={{ width: "26px", height: "26px", borderRadius: "50%", backgroundColor: "#1e1e24", border: "1px solid #27272a", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <User style={{ width: "14px", height: "14px", color: "#c5a059" }} />
          </div>
          <span className="app-header-user-name" style={{ color: "#d4d4d8", fontWeight: "500", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userName || "Usuário"}</span>
          <ChevronDown style={{ width: "13px", height: "13px", color: "#71717a" }} />
        </button>

        {/* MENU SUSPENSO */}
        {menuOpen && (
          <div style={{
            position: "absolute",
            right: 0,
            top: "110%",
            backgroundColor: "#121212",
            border: "1px solid #27272a",
            borderRadius: "6px",
            padding: "0.4rem",
            minWidth: "230px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            zIndex: 100
          }}>
            <div style={{ padding: ".45rem .5rem .6rem", borderBottom: "1px solid #27272a", marginBottom: 4 }}>
              <label style={{ display: "block", color: "#71717a", fontSize: 10, marginBottom: 5 }}>Nome de exibição</label>
              <div style={{ display: "flex", gap: 5 }}>
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void saveDisplayName(); }} style={{ minWidth: 0, flex: 1, background: "#18181b", border: "1px solid #34343a", color: "#fff", borderRadius: 5, padding: "7px 8px", fontSize: 12 }} />
                <button onClick={() => void saveDisplayName()} disabled={savingName || !displayName.trim()} title="Salvar nome" style={{ border: "1px solid #4a3a20", borderRadius: 5, background: "#211c13", color: "#d7ab63", padding: "0 8px", cursor: "pointer" }}><Save size={13} /></button>
              </div>
            </div>
            <button
              onClick={() => {
                if (setActiveTab) setActiveTab("configuracoes");
                setMenuOpen(false);
              }}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                color: "#e4e4e7",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.5rem",
                fontSize: "0.78rem",
                cursor: "pointer",
                borderRadius: "4px",
                textAlign: "left"
              }}
            >
              <Settings style={{ width: "14px", height: "14px", color: "#c5a059" }} />
              Configurações
            </button>
            <button onClick={() => void supabase.auth.signOut()} style={{ width: "100%", background: "none", border: "none", color: "#a1a1aa", display: "flex", alignItems: "center", gap: ".5rem", padding: ".5rem", fontSize: ".78rem", cursor: "pointer", borderRadius: 4 }}><LogOut size={14} /> Sair</button>
          </div>
        )}
      </div>
    </header>
  );
}
