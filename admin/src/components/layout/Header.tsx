import { useState, useEffect } from "react";
import { User, Settings, Zap, ArrowUpRight, ArrowDownRight, Minus, ChevronDown, Save, LogOut } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { applyExchangeRate, getExchangeRate, isUsdBrlIndicator } from "../../lib/exchangeRate";
import { getCryptoIndicators } from "../../lib/cryptoRates";
import { getEuroIndicator, isEuroIndicator } from "../../lib/fiatRates";
import LanguageSelector from "../LanguageSelector";
import { formatCurrency, useTranslation } from "../../lib/i18n";

interface HeaderProps {
  userName?: string;
  role?: "admin" | "equipe" | "afiliado";
  setActiveTab?: (tab: string) => void;
  onTickerSelect?: (ticker: any) => void;
}

export function Header({ userName, role = "admin", setActiveTab, onTickerSelect }: HeaderProps) {
  const { locale, t } = useTranslation();
  const [indicadores, setIndicadores] = useState<any[]>([]);
  const [menuOpen, setMenuOpen] = useState(false);
  const [displayName, setDisplayName] = useState(userName || "");
  const [savingName, setSavingName] = useState(false);
  const firstName = String(userName || "").trim().split(/\s+/)[0];

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
      const [{ data }, { data: historico }, cotacao, crypto, euro, { data: tickerConfig }] = await Promise.all([
        supabase.from("indicadores").select("*"),
        supabase.from("indicadores_historico").select("indicador_id, valor, data_referencia").order("data_referencia", { ascending: false }),
        getExchangeRate(),
        getCryptoIndicators(),
        getEuroIndicator(),
        supabase.from("indicadores_ticker_config").select("sku, ativo"),
      ]);
      if (data) {
        const historyByIndicator = (historico || []).reduce((map: Record<string, any[]>, item: any) => {
          (map[item.indicador_id] ||= []).push(item);
          return map;
        }, {});
        const withTrend = data.map((item: any) => {
          const current = Number(item.valor_atual ?? item.valor);
          const previous = (historyByIndicator[item.id] || []).find((entry: any) => Number(entry.valor) !== current);
          return { ...item, tendencia: previous ? Math.sign(current - Number(previous.valor)) : 0 };
        });
        const next = applyExchangeRate(withTrend.filter((item: any) => !isEuroIndicator(item)), cotacao);
        if (cotacao?.value && !next.some(isUsdBrlIndicator)) next.unshift({ id: "ptax-usd-brl", sku: "USD-BRL", nome: "Dólar PTAX", categoria: "MOEDA", valor_atual: cotacao.value, data_atualizacao: cotacao.date, tendencia: cotacao.trend ?? 0, variacao_periodo: cotacao.variation ?? null, indexador_base: "Banco Central do Brasil" });
        const preferencias = new Map((tickerConfig || []).map((item: any) => [item.sku, item.ativo]));
        setIndicadores([...next, ...(euro ? [euro] : []), ...crypto].filter((item: any) => {
          const valor = Number(item.valor_atual ?? item.valor);
          return Number.isFinite(valor) && valor > 0 && preferencias.get(item.sku) !== false;
        }));
      }
    } catch (err) {
      console.error("Erro ao carregar ticker no header:", err);
    }
  };

  const formatValor = (val: number, cat?: string) => {
    if (val === undefined || val === null) return "—";
    const categoria = cat ? cat.toUpperCase() : "";
    if (categoria === "MOEDA" || categoria.includes("DÓLAR")) {
      return formatCurrency(val, locale);
    }
    if (categoria === "IMOBILIARIO_M2") {
      if (val <= 0) return "A definir";
      return `${formatCurrency(val, locale)}/m²`;
    }
    if (categoria === "CRIPTO") return formatCurrency(val, locale);
    return `${val.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;
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
      left: "var(--sidebar-width, 250px)",
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
          animation: tickerHeader 75s linear infinite;
        }
        .header-ticker-track:hover {
          animation-play-state: paused;
        }
      `}</style>

      {/* TICKER DE COTAÇÕES INTEGRADO NO CABEÇALHO */}
      <div className="app-header-ticker" style={{ flex: 1, display: "flex", alignItems: "center", overflow: "hidden", height: "100%", marginRight: "1.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.3rem", paddingRight: "0.8rem", color: "#c5a059", fontWeight: "bold", fontSize: "0.7rem", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>
          <Zap style={{ width: "13px", height: "13px" }} />
          <span className="app-header-market-label">{t("market")}</span><span title="Indicadores com fontes e datas diferentes" style={{ width: 6, height: 6, borderRadius: "50%", background: "#c5a059", boxShadow: "0 0 8px #c5a059" }} />
        </div>

        <div style={{ overflow: "hidden", width: "100%", height: "100%", display: "flex", alignItems: "center" }}>
          {indicadores.length === 0 ? (
            <span style={{ color: "#52525b", fontSize: "0.72rem" }}>{t("liveIndicators")}</span>
          ) : (
            <div className="header-ticker-track">
              {[...indicadores, ...indicadores].map((ind, idx) => (
                <div
                  key={`${ind.id}-${idx}`}
                  onClick={() => onTickerSelect && onTickerSelect(ind)}
                  title={`${ind.indexador_base || t("sourceNotProvided")}${ind.data_atualizacao ? ` · ${t("updatedAt")} ${ind.data_atualizacao}` : ` · ${t("noUpdateDate")}`}`}
                  style={{
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.3rem",
                    padding: "0 1rem",
                    height: "55px",
                    minWidth: "max-content",
                    borderRadius: "4px",
                    backgroundColor: "#141414",
                    border: "1px solid #222",
                    fontSize: "0.72rem"
                  }}
                >
                  <span style={{ color: "#8b8b95", textTransform: "uppercase", fontSize: "0.62rem", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{ind.nome}</span>
                  <strong style={{ color: "#fff", fontFamily: "ui-monospace, Consolas, monospace", whiteSpace: "nowrap" }}>{formatValor(ind.valor_atual ?? ind.valor, ind.categoria)}</strong>
                  {ind.tendencia > 0 ? <ArrowUpRight aria-label={t("increase")} style={{ width: "11px", height: "11px", color: "#22c55e" }} /> : ind.tendencia < 0 ? <ArrowDownRight aria-label={t("decrease")} style={{ width: "11px", height: "11px", color: "#ef4444" }} /> : <Minus aria-label={t("noComparableHistory")} style={{ width: "11px", height: "11px", color: "#71717a" }} />}
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
          {firstName && <span className="app-header-user-name" style={{ color: "#d4d4d8", fontWeight: "500", maxWidth: 90, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{firstName}</span>}
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
              <label style={{ display: "block", color: "#71717a", fontSize: 10, marginBottom: 5 }}>{t("displayName")}</label>
              <div style={{ display: "flex", gap: 5 }}>
                <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void saveDisplayName(); }} style={{ minWidth: 0, flex: 1, background: "#18181b", border: "1px solid #34343a", color: "#fff", borderRadius: 5, padding: "7px 8px", fontSize: 12 }} />
                <button onClick={() => void saveDisplayName()} disabled={savingName || !displayName.trim()} title="Salvar nome" style={{ border: "1px solid #4a3a20", borderRadius: 5, background: "#211c13", color: "#d7ab63", padding: "0 8px", cursor: "pointer" }}><Save size={13} /></button>
              </div>
            </div>
            {role !== "afiliado" && <button
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
              {t("settings")}
            </button>}
            <button onClick={() => void supabase.auth.signOut()} style={{ width: "100%", background: "none", border: "none", color: "#a1a1aa", display: "flex", alignItems: "center", gap: ".5rem", padding: ".5rem", fontSize: ".78rem", cursor: "pointer", borderRadius: 4 }}><LogOut size={14} /> {t("signOut")}</button>
          </div>
        )}
      </div>
    </header>
  );
}
