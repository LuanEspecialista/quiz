import { useEffect, useState } from "react";
import {
  Building2,
  CalendarDays,
  ChevronRight,
  Images,
  Landmark,
  LogOut,
  SlidersHorizontal,
  Send,
  UserRound,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import MinhaConta from "./modules/MinhaConta";

type PortalMedia = {
  id: string;
  titulo?: string;
  categoria?: string;
  storage_path?: string;
  url?: string;
};
type PortalUnit = {
  id: string;
  numero?: string | null;
  tipologia?: string | null;
  tipologia_dados?: Record<string, any> | null;
  fluxo_dados?: Record<string, any> | null;
  valor_tabela?: number | null;
  area_privativa?: number | null;
  status?: string | null;
  entrada_sugerida?: number | null;
};
type LandingBlock = {
  tipo?: "hero" | "texto" | "destaque" | "galeria" | "plantas" | "cidade";
  titulo?: string;
  texto?: string;
  imagem_storage_path?: string;
  imagem_url?: string;
};
type Opportunity = {
  id: string;
  nome?: string;
  imagem_url?: string | null;
  imagem_storage_path?: string | null;
  cidade?: string;
  bairro?: string;
  endereco?: string;
  status?: string;
  descricao?: string;
  preco?: number | null;
  area_minima?: number | null;
  area_maxima?: number | null;
  mensagem?: string | null;
  permitir_proposta?: boolean;
  entrega?: string;
  diferenciais?: unknown[];
  lazer?: unknown[];
  caracteristicas?: Record<string, any>;
  imagens?: PortalMedia[];
  plantas?: PortalMedia[];
  unidades?: PortalUnit[];
  layout?: "editorial" | "imersivo" | "investidor";
  exibir_investimento?: boolean;
  exibir_fluxo?: boolean;
};
type Portal = {
  cliente?: { nome?: string; objetivo?: string };
  oportunidades?: Opportunity[];
};
const money = (value?: number | null) =>
  value == null
    ? "Sob consulta"
    : new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
      }).format(value);
const input = {
  width: "100%",
  boxSizing: "border-box" as const,
  background: "#09090b",
  border: "1px solid #3f3f46",
  borderRadius: 7,
  color: "#fff",
  padding: "10px 11px",
  fontSize: 14,
};

const COVER_STORAGE_PREFIX = "storage://empreendimentos/";

function coverStoragePath(item: Opportunity) {
  if (item.imagem_storage_path) return item.imagem_storage_path;
  return item.imagem_url?.startsWith(COVER_STORAGE_PREFIX)
    ? item.imagem_url.slice(COVER_STORAGE_PREFIX.length)
    : null;
}

function MoneyScenario({
  label,
  value,
  setValue,
  max,
}: {
  label: string;
  value: number;
  setValue: (value: number) => void;
  max: number;
}) {
  return (
    <label style={{ fontSize: 12, color: "#d4d4d8" }}>
      {label}
      <input
        type="number"
        min="0"
        step="500"
        value={value || ""}
        onChange={(e) => setValue(Math.max(0, Number(e.target.value) || 0))}
        style={{ ...input, marginTop: 6 }}
      />
      <input
        type="range"
        min="0"
        max={max}
        step="500"
        value={Math.min(value, max)}
        onChange={(e) => setValue(Number(e.target.value))}
        style={{ width: "100%", accentColor: "#d7ab63" }}
      />
      <b style={{ color: "#f5e0b2", fontSize: 13 }}>{money(value)}</b>
    </label>
  );
}

function OpportunityLanding({
  item,
  onProposal,
  onSelectUnit,
  selectedUnitId,
}: {
  item: Opportunity;
  onProposal: (item: Opportunity) => void;
  onSelectUnit?: (id: string) => void;
  selectedUnitId?: string | null;
}) {
  const blocks = (item.caracteristicas?.landing_blocos || []) as LandingBlock[];
  const layout = String(item.layout || item.caracteristicas?.landing_layout || "editorial");
  const images = item.imagens || [];
  const plants = item.plantas || [];
  const fallback: LandingBlock[] = [
    {
      tipo: "hero",
      titulo: item.nome,
      texto: item.descricao,
      imagem_url: images[0]?.url,
    },
    ...(images.length > 1
      ? [{ tipo: "galeria" as const, titulo: "Conheça o empreendimento" }]
      : []),
    ...(plants.length
      ? [{ tipo: "plantas" as const, titulo: "Plantas disponíveis" }]
      : []),
  ];
  const story = blocks.length ? blocks : fallback;
  const renderMedia = (media: PortalMedia[], height = 230) => (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(auto-fit,minmax(${layout === "imersivo" ? "240px" : "180px"},1fr))`,
        gap: 9,
      }}
    >
      {media.map((image) => (
        <figure key={image.id} style={{ margin: 0 }}>
          {image.url && (
            <img
              src={image.url}
              alt={image.titulo || item.nome || "Imagem do empreendimento"}
              style={{
                width: "100%",
                height,
                objectFit: "cover",
                borderRadius: 10,
              }}
            />
          )}
          {image.titulo && (
            <figcaption
              style={{ fontSize: 11, color: "#a1a1aa", marginTop: 5 }}
            >
              {image.titulo}
            </figcaption>
          )}
        </figure>
      ))}
    </div>
  );
  return (
    <article
      style={{
        border: "1px solid #332d22",
        background: "#101012",
        borderRadius: 15,
        overflow: "hidden",
      }}
    >
      {story.map((block, index) => {
        const hero = block.tipo === "hero";
        if (block.tipo === "galeria")
          return images.length ? (
            <section key={index} style={{ padding: "clamp(18px,4vw,34px)" }}>
              <h3>
                <Images size={18} /> {block.titulo || "Galeria"}
              </h3>
              {block.texto && (
                <p style={{ color: "#b4b4bb", lineHeight: 1.65 }}>
                  {block.texto}
                </p>
              )}
              {renderMedia(images, layout === "imersivo" ? 290 : 210)}
            </section>
          ) : null;
        if (block.tipo === "plantas")
          return plants.length ? (
            <section
              key={index}
              style={{ padding: "clamp(18px,4vw,34px)", background: "#0c0c0f" }}
            >
              <h3>
                <Building2 size={18} /> {block.titulo || "Plantas"}
              </h3>
              {block.texto && <p style={{ color: "#b4b4bb" }}>{block.texto}</p>}
              {renderMedia(plants, 260)}
            </section>
          ) : null;
        const image = block.imagem_url || (hero ? images[0]?.url : undefined);
        return (
          <section
            key={index}
            style={{
              minHeight: hero && image ? 330 : undefined,
              padding: hero && !image ? "24px" : "clamp(22px,5vw,52px)",
              position: "relative",
              display: "grid",
              alignContent: "center",
              background: image
                ? `linear-gradient(90deg,rgba(7,7,9,.94),rgba(7,7,9,.38)),url(${image}) center/cover`
                : block.tipo === "destaque"
                  ? "#19150f"
                  : "transparent",
            }}
          >
            <div style={{ maxWidth: hero ? 720 : 850 }}>
              {hero && (
                <small
                  style={{
                    color: "#e0b965",
                    fontWeight: 800,
                    letterSpacing: ".12em",
                  }}
                >
                  {[item.bairro, item.cidade].filter(Boolean).join(" · ")}
                </small>
              )}
              <h2
                style={{
                  fontSize: hero
                    ? "clamp(30px,6vw,58px)"
                    : "clamp(22px,4vw,34px)",
                  margin: "8px 0",
                  lineHeight: 1.05,
                }}
              >
                {block.titulo || item.nome}
              </h2>
              {block.texto && (
                <p
                  style={{
                    fontSize: hero ? 17 : 15,
                    color: "#d4d4d8",
                    lineHeight: 1.7,
                    whiteSpace: "pre-line",
                  }}
                >
                  {block.texto}
                </p>
              )}
            </div>
          </section>
        );
      })}
      {item.exibir_fluxo && (item.unidades?.length || 0) > 0 && <section style={{padding:"clamp(20px,4vw,36px)",borderTop:"1px solid #2f291e",background:"#0c0c0f",display:"grid",gap:12}}>
        <div><h3 style={{margin:"0 0 6px",color:"#f5e0b2"}}>Unidades liberadas para análise</h3><p style={{margin:0,color:"#a1a1aa",fontSize:13}}>Escolha uma unidade para visualizar as condições e montar seu fluxo personalizado.</p></div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:8}}>{item.unidades!.map(unit=><button key={unit.id} onClick={()=>{onSelectUnit?.(unit.id);onProposal(item)}} style={{textAlign:"left",padding:12,border:"1px solid #3f3524",borderRadius:9,background:selectedUnitId===unit.id?"#241c0d":"#18181b",color:"#fff",cursor:"pointer"}}><strong>Unidade {unit.numero || unit.id.slice(0,8)}</strong><small style={{display:"block",color:"#a1a1aa",marginTop:5}}>{unit.tipologia || "Tipologia a confirmar"}{unit.area_privativa ? ` · ${unit.area_privativa} m²` : ""}</small><b style={{display:"block",color:"#edcf91",marginTop:6}}>{money(unit.valor_tabela)}</b><span style={{display:"block",color:"#d7ab63",fontSize:11,marginTop:8}}>Abrir fluxo desta unidade →</span></button>)}</div>
      </section>}
      <section
        style={{
          padding: "clamp(20px,4vw,36px)",
          borderTop: "1px solid #2f291e",
          display: "grid",
          gap: 16,
        }}
      >
        {item.mensagem && (
          <p
            style={{
              margin: 0,
              padding: "12px 14px",
              borderLeft: "3px solid #d7ab63",
              background: "#17140e",
              lineHeight: 1.6,
            }}
          >
            {item.mensagem}
          </p>
        )}
        {(item.preco != null || item.area_minima != null) && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))",
              gap: 10,
            }}
          >
            {item.preco != null && (
              <span
                style={{
                  padding: 13,
                  background: "#18181b",
                  borderRadius: 9,
                  color: "#aaa",
                }}
              >
                A partir de
                <strong
                  style={{ display: "block", color: "#fff", fontSize: 18 }}
                >
                  {money(item.preco)}
                </strong>
              </span>
            )}
            {item.area_minima != null && (
              <span
                style={{
                  padding: 13,
                  background: "#18181b",
                  borderRadius: 9,
                  color: "#aaa",
                }}
              >
                Área
                <strong
                  style={{ display: "block", color: "#fff", fontSize: 18 }}
                >
                  {item.area_minima}
                  {item.area_maxima && item.area_maxima !== item.area_minima
                    ? `–${item.area_maxima}`
                    : ""}{" "}
                  m²
                </strong>
              </span>
            )}
          </div>
        )}
        {(item.exibir_investimento || item.exibir_fluxo) && <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10}}>
          {item.exibir_investimento && <div style={{padding:15,borderRadius:10,background:layout==="investidor"?"#172016":"#18181b",border:"1px solid #2f3f2e"}}><strong style={{color:"#b9d89c"}}>Visão de investimento</strong><p style={{color:"#b4b4bb",fontSize:13,lineHeight:1.6,marginBottom:0}}>Consulte os argumentos, diferenciais e premissas cadastrados para esta oportunidade. Projeções não representam garantia de rentabilidade.</p></div>}
          {item.exibir_fluxo && <div style={{padding:15,borderRadius:10,background:"#18181b",border:"1px solid #3a3327"}}><strong style={{color:"#edcf91"}}>Condições comerciais</strong><p style={{color:"#b4b4bb",fontSize:13,lineHeight:1.6,marginBottom:0}}>O fluxo será estruturado conforme sua entrada, capacidade mensal e reforços, sujeito à tabela vigente e aprovação da construtora.</p></div>}
        </div>}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
            gap: 9,
          }}
        >
          {item.permitir_proposta && (
            <button
              onClick={() => onProposal(item)}
              style={{
                border: 0,
                background: "#d7ab63",
                color: "#09090b",
                borderRadius: 8,
                padding: 13,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              <Landmark size={15} /> Montar e enviar proposta
            </button>
          )}
          <a
            href="https://wa.me/5547992120915"
            target="_blank"
            rel="noreferrer"
            style={{
              textAlign: "center",
              border: "1px solid #54452c",
              color: "#ead5aa",
              textDecoration: "none",
              borderRadius: 8,
              padding: 12,
              fontWeight: 700,
            }}
          >
            <CalendarDays size={15} /> Falar com o especialista
          </a>
        </div>
      </section>
    </article>
  );
}

export default function ClientPortal({ userName }: { userName?: string }) {
  const [portal, setPortal] = useState<Portal | null>(null);
  const [error, setError] = useState("");
  const [proposal, setProposal] = useState<Opportunity | null>(null);
  const [activeOpportunity, setActiveOpportunity] =
    useState<Opportunity | null>(null);
  const [flowChooserOpen, setFlowChooserOpen] = useState(false);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [entry, setEntry] = useState(0);
  const [monthly, setMonthly] = useState(2500);
  const [balloon, setBalloon] = useState(0);
  const [balloonCount, setBalloonCount] = useState(0);
  const [postMode, setPostMode] = useState<"financiamento" | "quitacao" | "parcelas" | "baloes" | "misto">("financiamento");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState("");

  useEffect(() => {
    void supabase
      .rpc("portal_cliente")
      .then(async ({ data, error: requestError }) => {
        if (requestError) {
          setError(
            "Sua curadoria ainda não foi liberada. Fale com seu especialista.",
          );
          return;
        }
        const result = (data || {}) as Portal;
        const opportunities = await Promise.all(
          (result.oportunidades || []).map(async (item) => {
            const sign = async (media: PortalMedia) => {
              if (!media.storage_path) return media;
              const { data: signed } = await supabase.storage
                .from("empreendimentos")
                .createSignedUrl(media.storage_path, 1800);
              return signed?.signedUrl
                ? { ...media, url: signed.signedUrl }
                : media;
            };
            const images = await Promise.all((item.imagens || []).map(sign));
            const plants = await Promise.all((item.plantas || []).map(sign));
            const storedCoverPath = coverStoragePath(item);
            let coverUrl =
              item.imagem_url &&
              !item.imagem_url.startsWith(COVER_STORAGE_PREFIX)
                ? item.imagem_url
                : undefined;
            if (storedCoverPath) {
              const existingCover = images.find(
                (media) => media.storage_path === storedCoverPath,
              );
              if (existingCover?.url) coverUrl = existingCover.url;
              else {
                const { data: signedCover } = await supabase.storage
                  .from("empreendimentos")
                  .createSignedUrl(storedCoverPath, 1800);
                coverUrl = signedCover?.signedUrl;
              }
            }
            const cardCover =
              coverUrl ||
              images.find((media) => media.url)?.url ||
              plants.find((media) => media.url)?.url;
            const displayImages = cardCover
              ? [
                  {
                    id: `capa-${item.id}`,
                    titulo: "Imagem de capa",
                    url: cardCover,
                  },
                  ...images.filter((media) => media.url !== cardCover),
                ]
              : images;
            const blocks = (
              Array.isArray(item.caracteristicas?.landing_blocos)
                ? item.caracteristicas.landing_blocos
                : []
            ) as LandingBlock[];
            return {
              ...item,
              imagem_url: cardCover,
              imagens: displayImages,
              plantas: plants,
              caracteristicas: {
                ...item.caracteristicas,
                landing_blocos: blocks.map((block) => ({
                  ...block,
                  imagem_url: images.find(
                    (media) => media.storage_path === block.imagem_storage_path,
                  )?.url,
                })),
              },
            };
          }),
        );
        setPortal({ ...result, oportunidades: opportunities });
      });
  }, []);

  const client = portal?.cliente;
  const opportunities = portal?.oportunidades || [];
  const firstName =
    (client?.nome || userName || "").trim().split(/\s+/)[0] || "";
  const selectedUnit = proposal?.unidades?.find((unit) => unit.id === selectedUnitId);
  const selectedPrice = Number(selectedUnit?.valor_tabela || proposal?.preco || 0);
  const preKeysPercent = Number(selectedUnit?.fluxo_dados?.percentual_ate_chaves) || Math.max(0, 100 - Number(selectedUnit?.fluxo_dados?.percentual_financiamento || 0)) || 100;
  const preKeysTarget = selectedPrice * preKeysPercent / 100;
  const monthsToKeys = Math.max(1, Number(selectedUnit?.fluxo_dados?.meses_ate_chaves || selectedUnit?.fluxo_dados?.parcelas_antes_chaves || 47));
  const keysBalance = Math.max(0, preKeysTarget - entry - monthly * monthsToKeys - balloon * balloonCount);
  const openProposal = (item: Opportunity) => {
    setProposal(item);
    setSelectedUnitId((current) => current || item.unidades?.[0]?.id || null);
    setEntry(Math.round((Number(item.preco) || 0) * 0.1));
    setMonthly(2500);
    setBalloon(0);
    setBalloonCount(0);
    setPostMode("financiamento");
    setNote("");
    setSent("");
  };
  const sendProposal = async () => {
    if (!proposal) return;
    setSending(true);
    setSent("");
    const { error: rpcError } = await supabase.rpc("enviar_proposta_cliente", {
      p_empreendimento_id: proposal.id,
      p_entrada: entry,
      p_parcela_mensal: monthly,
      p_balao: balloon,
      p_quantidade_baloes: balloonCount,
      p_objetivo: client?.objetivo || null,
      p_mensagem: [selectedUnitId ? `Unidade selecionada: ${selectedUnit?.numero || selectedUnitId}` : "", `Saldo calculado nas chaves: ${money(keysBalance)} (${preKeysPercent.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% até as chaves, ${monthsToKeys} meses)`, `Pós-chaves: ${postMode}`, note].filter(Boolean).join("\n") || null,
    });
    setSending(false);
    setSent(
      rpcError
        ? "Não foi possível enviar agora. Revise os valores ou fale com seu especialista."
        : "Interesse registrado. Seu especialista receberá este cenário para análise com a construtora.",
    );
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#09090b",
        color: "#f4f4f5",
        padding: "clamp(20px,4vw,56px)",
      }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 18,
            flexWrap: "wrap",
            marginBottom: 32,
          }}
        >
          <div>
            <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, color: "#edcf91", textDecoration: "none", fontWeight: 800, fontSize: 12, letterSpacing: ".12em" }}>
              <img src="/imagens/logo.png" alt="Luan Especialista" style={{ width: 42, height: 42, objectFit: "contain" }} />
              <span>LUAN ESPECIALISTA</span>
            </a>
            <h1 style={{ fontSize: "clamp(28px,5vw,48px)", margin: "24px 0 10px", lineHeight: 1.05 }}>
              Bem-vindo{firstName ? `, ${firstName}` : ""}.
            </h1>
            <p style={{ color: "#a1a1aa", margin: 0, maxWidth: 620, lineHeight: 1.65 }}>
              Uma curadoria pessoal de oportunidades selecionadas especialmente para você.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => setAccountOpen(true)}
              style={{
                border: "1px solid #5a4828",
                background: "#18140e",
                color: "#edcf91",
                borderRadius: 8,
                padding: "10px 13px",
                cursor: "pointer",
              }}
            >
              <UserRound size={16} /> Minha conta
            </button>
            <button
              onClick={() => void supabase.auth.signOut()}
              style={{
                border: "1px solid #3f3f46",
                background: "#18181b",
                color: "#d4d4d8",
                borderRadius: 8,
                padding: "10px 13px",
                cursor: "pointer",
              }}
            >
              <LogOut size={16} /> Sair
            </button>
          </div>
        </header>
        {error && (
          <section
            style={{
              border: "1px solid #854d0e",
              background: "#25170b",
              color: "#fed7aa",
              borderRadius: 10,
              padding: 16,
            }}
          >
            {error}
          </section>
        )}
        {!error && !portal && (
          <p style={{ color: "#a1a1aa" }}>Preparando sua curadoria…</p>
        )}
        {!error && portal && !opportunities.length && (
          <section
            style={{
              border: "1px solid #27272a",
              background: "#101012",
              borderRadius: 12,
              padding: 28,
              textAlign: "center",
              color: "#a1a1aa",
            }}
          >
            Seu especialista ainda não liberou oportunidades para esta
            curadoria.
          </section>
        )}
        {!activeOpportunity && opportunities.length > 0 && (
          <section
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))",
              gap: 16,
            }}
          >
            {opportunities.map((item) => {
              const cover = item.imagem_url || item.imagens?.find((media) => media.url)?.url;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedUnitId(null);
                    setActiveOpportunity(item);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  style={{
                    padding: 0,
                    textAlign: "left",
                    border: "1px solid #332d22",
                    background: "#101012",
                    color: "#fff",
                    borderRadius: 13,
                    overflow: "hidden",
                    cursor: "pointer",
                  }}
                >
                  {cover ? (
                    <img
                      src={cover}
                      alt={item.nome || "Empreendimento"}
                      style={{
                        width: "100%",
                        height: 190,
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        height: 110,
                        display: "grid",
                        placeItems: "center",
                        background: "linear-gradient(135deg,#18140e,#111113)",
                        color: "#806a43",
                      }}
                    >
                      <Building2 size={34} />
                    </div>
                  )}
                  <div style={{ padding: 17, display: "grid", gap: 8 }}>
                    <small style={{ color: "#d7ab63", fontWeight: 800 }}>
                      {[item.bairro, item.cidade].filter(Boolean).join(" · ") ||
                        item.status}
                    </small>
                    <span style={{ fontSize: 22, fontWeight: 800 }}>
                      {item.nome}
                    </span>
                    <span style={{ color: "#a1a1aa", fontSize: 13 }}>
                      {item.preco != null
                        ? `A partir de ${money(item.preco)}`
                        : "Consulte os detalhes liberados"}
                    </span>
                    <span
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        color: "#edcf91",
                        fontWeight: 800,
                        marginTop: 5,
                      }}
                    >
                      Ver apresentação <ChevronRight size={18} />
                    </span>
                  </div>
                </button>
              );
            })}
          </section>
        )}
        {opportunities.some((item) => (item.unidades?.length || 0) > 0) && !activeOpportunity && (
          <section style={{ marginTop: 22, padding: "20px 22px", border: "1px solid #5a4828", borderRadius: 14, background: "linear-gradient(135deg,#17130d,#101012 65%)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <div><strong style={{ color: "#f5e0b2", fontSize: 17 }}>Quer visualizar as condições?</strong><p style={{ margin: "6px 0 0", color: "#a1a1aa", fontSize: 13, lineHeight: 1.55 }}>Veja as unidades que foram separadas para você e simule entrada, parcelas e reforços.</p></div>
            <button onClick={() => setFlowChooserOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 8, border: 0, borderRadius: 8, padding: "12px 16px", background: "#d7ab63", color: "#09090b", fontWeight: 800, cursor: "pointer" }}><SlidersHorizontal size={16} /> Ver fluxo</button>
          </section>
        )}
        {activeOpportunity && (
          <div role="dialog" aria-modal="true" style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,.88)",padding:"clamp(10px,3vw,34px)",overflow:"auto"}}>
            <section style={{width:"min(1100px,100%)",minHeight:"min(760px,92vh)",margin:"0 auto",background:"#09090b",border:"1px solid #3f3524",borderRadius:16,boxShadow:"0 22px 90px #000",overflow:"hidden"}}>
              <header style={{position:"sticky",top:0,zIndex:2,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,padding:"12px 16px",background:"#111113",borderBottom:"1px solid #2f291e"}}>
                <strong style={{color:"#edcf91"}}>{activeOpportunity.nome}</strong>
                <button aria-label="Fechar empreendimento" onClick={()=>setActiveOpportunity(null)} style={{display:"inline-flex",alignItems:"center",gap:6,border:"1px solid #3f3524",background:"#17140e",color:"#edcf91",borderRadius:8,padding:"9px 12px",cursor:"pointer",fontWeight:800}}><X size={16}/> Fechar</button>
              </header>
              <div style={{padding:12}}><OpportunityLanding item={activeOpportunity} onProposal={openProposal} onSelectUnit={setSelectedUnitId} selectedUnitId={selectedUnitId}/></div>
            </section>
          </div>
        )}
        {flowChooserOpen && (
          <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 1050, background: "#000d", padding: 18, overflow: "auto" }} onMouseDown={(event) => { if (event.target === event.currentTarget) setFlowChooserOpen(false); }}>
            <section style={{ width: "min(760px,100%)", margin: "40px auto", background: "#111113", border: "1px solid #514124", borderRadius: 14, padding: "clamp(18px,3vw,28px)" }}>
              <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}><div><small style={{ color: "#d7ab63", fontWeight: 800, letterSpacing: ".1em" }}>SIMULAÇÃO PERSONALIZADA</small><h2 style={{ margin: "7px 0" }}>Escolha o empreendimento</h2><p style={{ margin: 0, color: "#a1a1aa", fontSize: 13 }}>O fluxo mostrará apenas as unidades liberadas pelo seu especialista.</p></div><button onClick={() => setFlowChooserOpen(false)} aria-label="Fechar"><X size={17} /></button></header>
              <div style={{ display: "grid", gap: 9, marginTop: 20 }}>{opportunities.filter((item) => (item.unidades?.length || 0) > 0).map((item) => <button key={item.id} onClick={() => { setFlowChooserOpen(false); setSelectedUnitId(item.unidades?.[0]?.id || null); setActiveOpportunity(item); window.scrollTo({ top: 0, behavior: "smooth" }); }} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, textAlign: "left", border: "1px solid #3f3524", background: "#18181b", color: "#fff", borderRadius: 9, padding: 14, cursor: "pointer" }}><span><strong>{item.nome}</strong><small style={{ display: "block", color: "#a1a1aa", marginTop: 5 }}>{item.unidades?.length} unidade(s) liberada(s) para simulação</small></span><ChevronRight size={18} color="#edcf91" /></button>)}</div>
            </section>
          </div>
        )}
        {accountOpen && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1100,
              background: "#000d",
              padding: 18,
              overflow: "auto",
            }}
          >
            <div style={{ maxWidth: 950, margin: "20px auto" }}>
              <button
                onClick={() => setAccountOpen(false)}
                style={{ float: "right", position: "relative", zIndex: 2 }}
              >
                <X size={18} />
              </button>
              <MinhaConta compact />
            </div>
          </div>
        )}
        {proposal && (
          <div
            role="dialog"
            aria-modal="true"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 1000,
              background: "#000b",
              padding: 20,
              overflow: "auto",
              display: "grid",
              placeItems: "center",
            }}
            onMouseDown={(e) =>
              e.target === e.currentTarget && setProposal(null)
            }
          >
            <section
              style={{
                width: "min(700px,100%)",
                background: "#111113",
                border: "1px solid #514124",
                borderRadius: 13,
                padding: "clamp(18px,3vw,28px)",
              }}
            >
              <header
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <div>
                  <p
                    style={{
                      margin: 0,
                      color: "#d7ab63",
                      fontSize: 11,
                      fontWeight: 800,
                    }}
                  >
                    CENÁRIO PERSONALIZADO
                  </p>
                  <h2 style={{ margin: "6px 0" }}>
                    Proposta para {proposal.nome}
                  </h2>
                  <p style={{ margin: 0, color: "#a1a1aa", fontSize: 13 }}>
                    Defina o que é confortável para você. O envio inicia uma
                    análise, não confirma condições.
                  </p>
                </div>
                <button onClick={() => setProposal(null)}>
                  <X size={16} />
                </button>
              </header>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                  gap: 13,
                  marginTop: 22,
                }}
              >
                <MoneyScenario
                  label="Entrada"
                  value={entry}
                  setValue={setEntry}
                  max={proposal.preco || 500000}
                />
                <MoneyScenario
                  label="Parcela mensal"
                  value={monthly}
                  setValue={setMonthly}
                  max={Math.max(20000, (proposal.preco || 500000) * 0.08)}
                />
                <MoneyScenario
                  label="Balão"
                  value={balloon}
                  setValue={setBalloon}
                  max={proposal.preco || 500000}
                />
              </div>
              <div style={{ marginTop: 13, padding: 12, border: "1px solid #5a4828", borderRadius: 9, background: "#17130d" }}>
                <small style={{ color: "#d7ab63", fontWeight: 800 }}>CÁLCULO AUTOMÁTICO DO FLUXO</small>
                <strong style={{ display: "block", marginTop: 5, color: "#fff", fontSize: 17 }}>Nas chaves: {money(keysBalance)}</strong>
                <span style={{ display: "block", marginTop: 4, color: "#a1a1aa", fontSize: 12, lineHeight: 1.5 }}>
                  Considerando {preKeysPercent.toLocaleString("pt-BR", { maximumFractionDigits: 2 })}% até as chaves, {monthsToKeys} meses, entrada, parcelas e balões informados. Sem balão, o saldo restante não desaparece: ele fica reservado para as chaves.
                </span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(180px,260px) 1fr",
                  gap: 13,
                  marginTop: 13,
                }}
              >
                <label style={{ fontSize: 12, color: "#d4d4d8" }}>
                  Destino do saldo pós-chaves
                  <select value={postMode} onChange={(e) => setPostMode(e.target.value as typeof postMode)} style={{ ...input, marginTop: 6 }}>
                    <option value="financiamento">Financiamento bancário</option>
                    <option value="quitacao">Quitação nas chaves</option>
                    <option value="parcelas">Parcelas pós-chaves</option>
                    <option value="baloes">Balões pós-chaves</option>
                    <option value="misto">Parcelas + balões</option>
                  </select>
                </label>
                <label style={{ fontSize: 12, color: "#d4d4d8" }}>
                  Quantidade de balões
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={balloonCount || ""}
                    onChange={(e) =>
                      setBalloonCount(
                        Math.max(0, Math.min(120, Number(e.target.value) || 0)),
                      )
                    }
                    style={{ ...input, marginTop: 6 }}
                  />
                </label>
                <label style={{ fontSize: 12, color: "#d4d4d8" }}>
                  Observação
                  <textarea
                    value={note}
                    maxLength={1500}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder="Ex.: consigo ajustar a entrada em dois atos."
                    style={{ ...input, marginTop: 6, resize: "vertical" }}
                  />
                </label>
              </div>
              <div
                style={{
                  marginTop: 18,
                  padding: 12,
                  borderRadius: 8,
                  background: "#17140e",
                  color: "#d4d4d8",
                  fontSize: 12,
                }}
              >
                O especialista receberá: entrada {money(entry)}, parcela mensal{" "}
                {money(monthly)}
                {balloonCount
                  ? `, ${balloonCount} balão(ões) de ${money(balloon)}`
                  : ""}
                . Nas chaves: {money(keysBalance)}. Pós-chaves: {postMode}. A construtora valida condições e disponibilidade.
              </div>
              {sent && (
                <p
                  style={{
                    color: sent.startsWith("Interesse") ? "#86efac" : "#fbbf24",
                    fontSize: 13,
                  }}
                >
                  {sent}
                </p>
              )}
              <button
                disabled={sending}
                onClick={() => void sendProposal()}
                style={{
                  marginTop: 16,
                  width: "100%",
                  border: 0,
                  borderRadius: 7,
                  padding: 12,
                  background: "#d7ab63",
                  color: "#09090b",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                <Send size={15} />{" "}
                {sending ? "Enviando…" : "Enviar cenário para análise"}
              </button>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
