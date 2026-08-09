import React, { useState, useEffect } from "react";
import { User, Settings, Zap, ArrowUpRight, ChevronDown } from "lucide-react";
import { supabase } from "../../lib/supabase";

interface HeaderProps {
  userEmail?: string;
  setActiveTab?: (tab: string) => void;
  onTickerSelect?: (ticker: any) => void;
}

export function Header({ userEmail, setActiveTab, onTickerSelect }: HeaderProps) {
  const [indicadores, setIndicadores] = useState<any[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    loadIndicadores();
  }, []);

  const loadIndicadores = async () => {
    try {
      const { data } = await supabase.from("indicadores").select("*");
      if (data) setIndicadores(data);
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

  return (
    <header style={{
      position: "fixed",
      top: 0,
      right: 0,
      left: "260px", // Largura da Sidebar
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
        @keyframes tickerHeader {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
        .header-ticker-track {
          display: flex;
          gap: 1.2rem;
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
          <span>Live:</span>
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
                    padding: "0.15rem 0.5rem",
                    borderRadius: "4px",
                    backgroundColor: "#141414",
                    border: "1px solid #222",
                    fontSize: "0.72rem"
                  }}
                >
                  <span style={{ color: "#a1a1aa" }}>{ind.nome}:</span>
                  <strong style={{ color: "#fff" }}>{formatValor(ind.valor_atual ?? ind.valor, ind.categoria)}</strong>
                  <ArrowUpRight style={{ width: "11px", height: "11px", color: "#22c55e" }} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* USUÁRIO / CONFIGURAÇÕES DISCRETO */}
      <div style={{ position: "relative" }}>
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
          <span style={{ color: "#e4e4e7", fontWeight: "500" }}>{userEmail ? userEmail.split("@")[0] : "Usuário"}</span>
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
            minWidth: "160px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            zIndex: 100
          }}>
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
          </div>
        )}
      </div>
    </header>
  );
}