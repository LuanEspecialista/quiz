import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ChevronRight,
  Images,
  Landmark,
  Lock,
  LockOpen,
  LogOut,
  Send,
  UserRound,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import MinhaConta from "./modules/MinhaConta";
import { isR2Path, r2PublicUrl } from "../lib/r2Media";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

type PortalMedia = {
  id: string;
  titulo?: string;
  categoria?: string;
  storage_path?: string;
  url?: string;
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
  entrega_date?: string | null;
  previsao_entrega?: string | null;
  data_entrega_chaves?: string | null;
  regras_correcao?: Record<string, any> | null;
  observacoes?: string | null;
  cronograma?: Record<string, any> | null;
  valorizacao_aa?: number | null;
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
  layout?: "editorial" | "imersivo" | "investidor";
  exibir_investimento?: boolean;
  exibir_fluxo?: boolean;
  desconto_percentual?: number;
  observacao_comercial?: string | null;
  apresentacao?: { url?: string | null; tipo?: "pdf" | "link"; storage_path?: string | null } | null;
  unidades?: PortalUnit[];
};
type PortalUnit = {
  id: string;
  codigo?: string;
  numero?: string | null;
  torre?: string | null;
  andar?: number | null;
  tipologia?: string | null;
  area_privativa?: number | null;
  valor?: number | null;
  status?: string | null;
  fluxo_dados?: Record<string, unknown>;
};
type Portal = {
  cliente?: { nome?: string; objetivo?: string; email?: string | null; cpf?: string | null };
  oportunidades?: Opportunity[];
};
type CubQuote = { value: number; competencia?: string | null; mes_referencia?: string | null; source?: string; updated_at?: string };
type FlowField = "entrada" | "parcela" | "balao" | "chaves" | "posChaves";
type ClientFlowValues = Record<FlowField, number>;
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

const numberValue = (...values: unknown[]) => {
  for (const value of values) {
    const parsed = Number(value);
    if (Number.isFinite(parsed) && parsed > 0) return parsed;
  }
  return 0;
};

function monthDistance(start: string, end = new Date()) {
  const base = new Date(`${start.slice(0, 7)}-01T12:00:00`);
  if (Number.isNaN(base.getTime())) return 0;
  return Math.max(0, (end.getFullYear() - base.getFullYear()) * 12 + end.getMonth() - base.getMonth());
}

function monthLabel(value?: string | null) {
  if (!value) return "Não informado";
  const date = new Date(`${value.slice(0, 7)}-01T12:00:00`);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(date);
}

function flowSummary(item: Opportunity, unit?: PortalUnit | null, cub?: CubQuote | null) {
  const flow = unit?.fluxo_dados || {};
  const rules = item.regras_correcao || {};
  const delivery = item.data_entrega_chaves || item.entrega_date || item.previsao_entrega || String(flow.entrega || "");
  const preCount = numberValue(flow.quantidade_parcelas_obra, flow.quantidade_parcelas_ate_chaves, flow.parcelas_antes_chaves);
  const elapsed = preCount ? Math.min(preCount, monthDistance(String(flow.data_tabela || "2026-10"))) : 0;
  const remaining = preCount ? Math.max(0, preCount - elapsed) : 0;
  const baseCub = numberValue(flow.cub_base_valor, rules.cub_base_valor);
  const cubFactor = baseCub && cub?.value ? cub.value / baseCub : 1;
  const nominalInstallment = numberValue(flow.parcela_obra_valor);
  const correctedInstallment = nominalInstallment ? nominalInstallment * cubFactor : 0;
  const postCount = numberValue(flow.quantidade_parcelas_pos_chaves);
  const postIndex = String(flow.indice_pos_chaves || rules.indice_pos_chaves || "IPCA");
  const postInterest = numberValue(flow.juros_pos_chaves_am, rules.juros_pos_chaves_am);
  return { flow, rules, delivery, preCount, elapsed, remaining, postCount, postIndex, postInterest, nominalInstallment, correctedInstallment, baseCub };
}

function buildClientFlow(item: Opportunity, unit?: PortalUnit | null, cub?: CubQuote | null) {
  const summary = flowSummary(item, unit, cub);
  const raw = summary.flow;
  const discount = Math.max(0, Number(item.desconto_percentual || 0));
  const price = Math.max(0, Number(unit?.valor || item.preco || 0) * (1 - discount / 100));
  const months = Math.max(1, Math.round(numberValue(raw.quantidade_parcelas_obra, raw.quantidade_parcelas_ate_chaves, raw.parcelas_antes_chaves) || 1));
  const balloonCount = Math.max(0, Math.round(numberValue(raw.quantidade_reforcos_obra, raw.quantidade_baloes, raw.numero_baloes)));
  const preTarget = Math.min(price, price * (numberValue(raw.percentual_ate_chaves, Number(raw.percentual_parcelas_obra || 0) + Number(raw.percentual_reforcos_obra || 0) + Number(raw.percentual_chaves || 0)) || 100) / 100);
  const entry = Math.min(preTarget, numberValue(raw.ato, raw.entrada, price * .1));
  const monthly = Math.min(Math.max(0, preTarget - entry) / months, numberValue(raw.parcela_obra_valor, raw.parcela_mensal) || Math.max(0, preTarget - entry) / months);
  const balloon = balloonCount ? numberValue(raw.reforco_obra_valor, raw.valor_balao) : 0;
  const keys = Math.min(Math.max(0, preTarget - entry - monthly * months - balloon * balloonCount), numberValue(raw.chaves_valor, raw.chaves));
  return { ...summary, price, months, balloonCount, preTarget, defaults: { entrada: entry, parcela: monthly, balao: balloon, chaves: keys, posChaves: Math.max(0, price - entry - monthly * months - balloon * balloonCount - keys) } as ClientFlowValues, officialPostMonths: Math.max(1, Math.round(numberValue(raw.quantidade_parcelas_pos_chaves))), officialPostBalloonCount: Math.max(0, Math.round(numberValue(raw.quantidade_reforcos_pos_chaves))), officialPostBalloonValue: numberValue(raw.reforco_pos_chaves_valor), appreciation: Number(item.valorizacao_aa || 0) };
}

function FlowSchedule({ item, unit, cub }: { item: Opportunity; unit?: PortalUnit | null; cub?: CubQuote | null }) {
  const summary = flowSummary(item, unit, cub);
  const preIndex = String(summary.flow.indice_pre_chaves || summary.rules.indice_pre_chaves || "CUB");
  const formattedInterest = summary.postInterest ? ` + ${summary.postInterest.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}% a.m.` : "";
  return <section className="portal-flow-summary">
    <div className="portal-flow-heading"><div><small>CRONOGRAMA E FLUXO NOMINAL</small><strong>{item.nome}</strong></div><span>Atualizado em {new Intl.DateTimeFormat("pt-BR").format(new Date())}</span></div>
    <div className="portal-flow-grid">
      <div><small>Início das obras</small><b>{monthLabel(item.cronograma?.inicio_obras || item.caracteristicas?.fluxo_comercial?.inicio_obras)}</b></div>
      <div><small>Entrega prevista</small><b>{monthLabel(summary.delivery)}</b></div>
      <div><small>Até as chaves</small><b>{summary.preCount ? `${summary.remaining} restantes` : "Conforme tabela"}</b><em>{summary.preCount ? `${summary.elapsed} já transcorridas de ${summary.preCount}` : ""}</em></div>
      <div><small>Correção até as chaves</small><b>{preIndex}</b><em>valor nominal ajustado pela competência vigente</em></div>
      <div><small>Pós-chaves</small><b>{summary.postCount ? `${summary.postCount} parcelas` : "Conforme contrato"}</b><em>{summary.postIndex}{formattedInterest}</em></div>
    </div>
    {summary.nominalInstallment > 0 && <p className="portal-flow-note">Parcela nominal da tabela: <strong>{money(summary.nominalInstallment)}</strong>{cub && summary.baseCub ? <> · estimativa com CUB vigente ({money(cub.value)}/m²): <strong>{money(summary.correctedInstallment)}</strong></> : ""}. O sistema recalcula a quantidade restante pelo mês atual e não projeta IPCA futuro.</p>}
    {cub && <small className="portal-flow-source">CUB/SC residencial médio · competência para uso em {cub.competencia || "vigente"} · fonte oficial do Sinduscon.</small>}
  </section>;
}

function PresentationSlides({ url, title, onClose }: { url: string; title: string; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pdf, setPdf] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let disposed = false;
    setLoading(true); setMessage(""); setPage(1);
    pdfjsLib.getDocument({ url, withCredentials: false, disableAutoFetch: false, disableStream: false, rangeChunkSize: 1024 * 1024 }).promise.then((document) => {
      if (disposed) return;
      setPdf(document);
    }).catch(() => { if (!disposed) setMessage("Não foi possível carregar esta apresentação."); setLoading(false); });
    return () => { disposed = true; };
  }, [url]);
  useEffect(() => {
    let disposed = false;
    if (!pdf || !canvasRef.current) return;
    setLoading(true);
    pdf.getPage(page).then((pdfPage) => {
      if (disposed || !canvasRef.current) return;
      const base = pdfPage.getViewport({ scale: 1 });
      const maxWidth = Math.min(window.innerWidth - 48, 1100);
      const scale = Math.max(0.65, Math.min(2.2, maxWidth / base.width));
      const viewport = pdfPage.getViewport({ scale });
      const canvas = canvasRef.current;
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(viewport.width * ratio); canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${viewport.width}px`; canvas.style.height = `${viewport.height}px`;
      const context = canvas.getContext("2d");
      if (!context) return;
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      void pdfPage.render({ canvas, canvasContext: context, viewport }).promise.finally(() => { if (!disposed) setLoading(false); });
    }).catch(() => { if (!disposed) { setMessage("Não foi possível renderizar esta página."); setLoading(false); } });
    return () => { disposed = true; };
  }, [pdf, page]);
  return <div role="dialog" aria-modal="true" style={{position:"fixed",inset:0,zIndex:1200,background:"#09090bf7",display:"grid",gridTemplateRows:"auto 1fr auto",padding:12}}>
    <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,maxWidth:1180,width:"100%",margin:"0 auto",color:"#fff"}}><strong>{title}</strong><button type="button" onClick={onClose} style={{border:"1px solid #5a4828",background:"#18140e",color:"#edcf91",borderRadius:8,padding:"9px 12px",cursor:"pointer"}}>Fechar</button></header>
    <main style={{display:"grid",placeItems:"center",overflow:"auto",padding:12}}>{message ? <p style={{color:"#fca5a5"}}>{message}</p> : <div style={{position:"relative",minHeight:160,display:"grid",placeItems:"center"}}><canvas ref={canvasRef} style={{maxWidth:"100%",height:"auto",background:"#fff",boxShadow:"0 16px 60px #000"}} />{loading && <span style={{position:"absolute",color:"#edcf91",background:"#111113dd",padding:"10px 14px",borderRadius:8}}>Carregando slide…</span>}</div>}</main>
    <footer style={{display:"flex",justifyContent:"center",alignItems:"center",gap:12,padding:"10px 0",color:"#d4d4d8"}}><button type="button" disabled={!pdf || page<=1} onClick={()=>setPage((value)=>Math.max(1,value-1))} style={{border:"1px solid #54452c",background:"#17140e",color:"#ead5aa",borderRadius:7,padding:"9px 14px",cursor:"pointer"}}>‹ Anterior</button><span>{pdf ? `Slide ${page} de ${pdf.numPages}` : ""}</span><button type="button" disabled={!pdf || page >= (pdf?.numPages || 1)} onClick={()=>setPage((value)=>Math.min(pdf?.numPages || value,value+1))} style={{border:0,background:"#d7ab63",color:"#09090b",borderRadius:7,padding:"9px 14px",fontWeight:800,cursor:"pointer"}}>Próximo ›</button></footer>
  </div>;
}

const COVER_STORAGE_PREFIX = "storage://empreendimentos/";

function coverStoragePath(item: Opportunity) {
  if (item.imagem_storage_path) return item.imagem_storage_path;
  return item.imagem_url?.startsWith(COVER_STORAGE_PREFIX)
    ? item.imagem_url.slice(COVER_STORAGE_PREFIX.length)
    : null;
}

function OpportunityLanding({
  item,
  onProposal,
  cub,
}: {
  item: Opportunity;
  onProposal: (item: Opportunity, unit?: PortalUnit) => void;
  cub?: CubQuote | null;
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
        {item.exibir_fluxo && <FlowSchedule item={item} cub={cub} />}
        {!!item.unidades?.length && <div style={{display:"grid",gap:8,padding:14,border:"1px solid #3a3327",borderRadius:10,background:"#14120f"}}><strong style={{color:"#edcf91"}}>Unidades liberadas para análise</strong><small style={{color:"#a1a1aa"}}>Escolha uma unidade para abrir o fluxo. A simulação é individual e não altera a condição oficial.</small>{item.unidades.map((unit) => { const original=Number(unit.valor||0); const discount=Math.max(0,Number(item.desconto_percentual||0)); const final=original*(1-discount/100); return <div key={unit.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",padding:"9px 0",borderTop:"1px solid #29251f"}}><span><b>{unit.codigo || unit.numero || "Unidade"}</b>{unit.torre ? ` · Torre ${unit.torre}` : ""}{unit.tipologia ? ` · ${unit.tipologia}` : ""}<small style={{display:"block",color:"#a1a1aa"}}>{money(original)}{discount ? ` · ${discount}% de condição especial · ${money(final)}` : ""}</small></span><button type="button" onClick={() => onProposal(item, unit)} style={{border:0,background:"#d7ab63",color:"#09090b",borderRadius:7,padding:"9px 11px",fontWeight:800,cursor:"pointer"}}>Ver fluxo</button></div>})}</div>}
        {item.observacao_comercial && <p style={{margin:0,padding:"10px 12px",borderLeft:"3px solid #d7ab63",color:"#ead5aa",background:"#17140e",fontSize:12,lineHeight:1.55}}>{item.observacao_comercial}</p>}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))",
            gap: 9,
          }}
        >
          {(item.permitir_proposta || item.exibir_fluxo) && !item.unidades?.length && (
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
              <Landmark size={15} /> Abrir editor de fluxo e proposta
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
  const [proposalUnit, setProposalUnit] = useState<PortalUnit | null>(null);
  const [presentation, setPresentation] = useState<{ url: string; title: string } | null>(null);
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [activeOpportunity, setActiveOpportunity] =
    useState<Opportunity | null>(null);
  const [accountOpen, setAccountOpen] = useState(false);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState("");
  const [cub, setCub] = useState<CubQuote | null>(null);
  const [flowValues, setFlowValues] = useState<ClientFlowValues>({ entrada: 0, parcela: 0, balao: 0, chaves: 0, posChaves: 0 });
  const [flowLocks, setFlowLocks] = useState<Record<FlowField, boolean>>({ entrada: false, parcela: false, balao: false, chaves: false, posChaves: false });
  const [autoField, setAutoField] = useState<FlowField>("posChaves");
  const [postMode, setPostMode] = useState<"parcelas" | "misto" | "baloes">("parcelas");
  const [postMonths, setPostMonths] = useState(0);
  const [postBalloonCount, setPostBalloonCount] = useState(0);
  const [postBalloonValue, setPostBalloonValue] = useState(0);
  const [appreciation, setAppreciation] = useState(0);
  const [clientCpf, setClientCpf] = useState("");
  const [clientEmail, setClientEmail] = useState("");

  useEffect(() => {
    void fetch("/api/cub", { headers: { accept: "application/json" } })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (data?.value) setCub(data as CubQuote); })
      .catch(() => undefined);
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
              if (isR2Path(media.storage_path)) return { ...media, url: r2PublicUrl(media.storage_path) };
              const { data: signed } = await supabase.storage
                .from("empreendimentos")
                .createSignedUrl(media.storage_path, 1800);
              return signed?.signedUrl
                ? { ...media, url: signed.signedUrl }
                : media;
            };
            const images = await Promise.all((item.imagens || []).map(sign));
            const plants = await Promise.all((item.plantas || []).map(sign));
            let presentation = item.apresentacao;
            if (presentation?.storage_path && !isR2Path(presentation.storage_path) && presentation.tipo !== "link") {
              const { data: signedPdf } = await supabase.storage.from("pdfs").createSignedUrl(presentation.storage_path, 3600);
              if (signedPdf?.signedUrl) presentation = { ...presentation, url: signedPdf.signedUrl };
            }
            const storedCoverPath = coverStoragePath(item);
            let coverUrl: string | undefined =
              item.imagem_url &&
              !item.imagem_url.startsWith(COVER_STORAGE_PREFIX) &&
              !isR2Path(item.imagem_url)
                ? item.imagem_url
                : undefined;
            if (item.imagem_url && isR2Path(item.imagem_url)) coverUrl = r2PublicUrl(item.imagem_url);
            if (storedCoverPath) {
              const existingCover = images.find(
                (media) => media.storage_path === storedCoverPath,
              );
              if (existingCover?.url) coverUrl = existingCover.url;
              else if (isR2Path(storedCoverPath)) coverUrl = r2PublicUrl(storedCoverPath);
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
              apresentacao: presentation,
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
        setClientEmail(result.cliente?.email || "");
        setClientCpf(result.cliente?.cpf || "");
        setPortal({ ...result, oportunidades: opportunities });
      });
  }, []);

  const client = portal?.cliente;
  const opportunities = portal?.oportunidades || [];
  const firstName =
    (client?.nome || userName || "").trim().split(/\s+/)[0] || "";
  const openProposal = (item: Opportunity, unit?: PortalUnit) => {
    const model = buildClientFlow(item, unit || null, cub);
    setProposal(item);
    setProposalUnit(unit || null);
    setFlowValues(model.defaults);
    setFlowLocks({ entrada: false, parcela: false, balao: false, chaves: false, posChaves: false });
    setAutoField("posChaves");
    setPostMode(model.officialPostBalloonCount ? "misto" : "parcelas");
    setPostMonths(model.officialPostMonths);
    setPostBalloonCount(model.officialPostBalloonCount);
    setPostBalloonValue(model.officialPostBalloonValue);
    setAppreciation(model.appreciation);
    setNote("");
    setSent("");
  };
  const activeFlow = useMemo(() => proposal ? buildClientFlow(proposal, proposalUnit, cub) : null, [proposal, proposalUnit, cub]);
  const flowFactors: Record<FlowField, number> = { entrada: 1, parcela: activeFlow?.months || 1, balao: activeFlow?.balloonCount || 0, chaves: 1, posChaves: 1 };
  const solvedFlow = useMemo(() => {
    if (!activeFlow) return flowValues;
    const fields: FlowField[] = ["entrada", "parcela", "balao", "chaves", "posChaves"];
    const fixedTotal = fields.filter((field) => field !== autoField).reduce((sum, field) => sum + Math.max(0, flowValues[field]) * flowFactors[field], 0);
    const remaining = Math.max(0, activeFlow.price - fixedTotal);
    return fields.reduce((next, field) => { next[field] = field === autoField && !flowLocks[field] ? remaining / Math.max(1, flowFactors[field]) : Math.max(0, flowValues[field]); return next; }, {} as ClientFlowValues);
  }, [activeFlow, flowValues, flowLocks, autoField, flowFactors]);
  const flowTotal = activeFlow ? (Object.keys(flowFactors) as FlowField[]).reduce((sum, field) => sum + solvedFlow[field] * flowFactors[field], 0) : 0;
  const setFlowManual = (field: FlowField, value: number) => {
    if (!activeFlow || flowLocks[field] || field === autoField) return;
    const otherTotal = (Object.keys(flowFactors) as FlowField[]).filter((candidate) => candidate !== field && candidate !== autoField).reduce((sum, candidate) => sum + Math.max(0, flowValues[candidate]) * flowFactors[candidate], 0);
    const safe = Math.max(0, Math.min(Number(value) || 0, Math.max(0, activeFlow.price - otherTotal) / Math.max(1, flowFactors[field])));
    setFlowValues((current) => ({ ...current, [field]: safe }));
  };
  const toggleFlowLock = (field: FlowField) => {
    if (field === autoField && !flowLocks[field]) {
      const nextAuto = (Object.keys(flowFactors) as FlowField[]).find((candidate) => candidate !== field && flowFactors[candidate] > 0 && !flowLocks[candidate]);
      if (!nextAuto) return;
      setFlowValues((current) => ({ ...current, [field]: solvedFlow[field] }));
      setFlowLocks((current) => ({ ...current, [field]: true }));
      setAutoField(nextAuto);
      return;
    }
    setFlowValues((current) => ({ ...current, [field]: solvedFlow[field] }));
    setFlowLocks((current) => ({ ...current, [field]: !current[field] }));
  };
  const openPresentation = (item: Opportunity) => {
    if (item.apresentacao?.url) setPresentation({ url: item.apresentacao.url, title: item.nome || "Apresentação" });
  };
  const sendProposal = async () => {
    if (!proposal) return;
    if (!proposalUnit || !activeFlow || Math.abs(flowTotal - activeFlow.price) > 0.02) {
      setSent("Escolha uma unidade e ajuste o campo destravado até o fluxo fechar no valor do imóvel.");
      return;
    }
    if (clientCpf.replace(/\D/g, "").length !== 11 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail.trim())) {
      setSent("Informe um CPF válido e um e-mail válido antes de enviar a proposta.");
      return;
    }
    setSending(true);
    setSent("");
    const { error: rpcError } = await supabase.rpc("enviar_proposta_cliente", {
      p_empreendimento_id: proposal.id,
      p_entrada: solvedFlow.entrada,
      p_parcela_mensal: solvedFlow.parcela,
      p_balao: solvedFlow.balao,
      p_quantidade_baloes: activeFlow.balloonCount,
      p_objetivo: client?.objetivo || null,
      p_mensagem: note || null,
      p_unidade_id: proposalUnit?.id || null,
      p_desconto_percentual: Number(proposal.desconto_percentual || 0),
      p_cpf: clientCpf,
      p_email: clientEmail.trim().toLowerCase(),
      p_fluxo_snapshot: {
        total: Number(flowTotal.toFixed(2)),
        valor_unidade: activeFlow.price,
        valores: solvedFlow,
        fatores: flowFactors,
        travas: flowLocks,
        campo_automatico: autoField,
        meses_ate_chaves: activeFlow.months,
        quantidade_baloes: activeFlow.balloonCount,
        pos_chaves: { modo: postMode, parcelas: postMonths, quantidade_baloes: postBalloonCount, valor_balao: postBalloonValue },
        valorizacao_anual: appreciation,
        valor_projetado: activeFlow.price * Math.pow(1 + Math.max(0, appreciation) / 100, Math.max(1, activeFlow.months) / 12),
        atualizado_em: new Date().toISOString(),
      },
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
            <a
              href="/"
              style={{
                color: "#d7ab63",
                textDecoration: "none",
                fontWeight: 800,
                fontSize: 12,
                letterSpacing: ".12em",
              }}
            >
              LUAN ESPECIALISTA
            </a>
            <h1
              style={{ fontSize: "clamp(28px,5vw,48px)", margin: "10px 0 8px" }}
            >
              Bem-vindo{firstName ? `, ${firstName}` : ""}.
            </h1>
            <p style={{ color: "#a1a1aa", margin: 0 }}>
              Uma curadoria pessoal de oportunidades selecionadas para você.
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
          <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(290px,1fr))",gap:16}}>
            {opportunities.map((item) => {
              const cover = item.imagens?.[0]?.url;
              return (
                <article key={item.id} style={{border:"1px solid #332d22",background:"#101012",color:"#fff",borderRadius:13,overflow:"hidden"}}>
                  <button type="button" onClick={() => openPresentation(item)} style={{display:"block",width:"100%",padding:0,textAlign:"left",border:0,background:"transparent",color:"inherit",cursor:item.apresentacao?.url?"pointer":"default"}}>
                    {cover ? <img src={cover} alt={item.nome || "Empreendimento"} style={{width:"100%",height:190,objectFit:"cover",display:"block"}} /> : <div style={{height:110,display:"grid",placeItems:"center",background:"linear-gradient(135deg,#18140e,#111113)",color:"#806a43"}}><Building2 size={34} /></div>}
                    <div style={{padding:"17px 17px 12px",display:"grid",gap:8}}>
                      <small style={{color:"#d7ab63",fontWeight:800}}>{[item.bairro,item.cidade].filter(Boolean).join(" · ") || item.status}</small>
                      <span style={{fontSize:22,fontWeight:800}}>{item.nome}</span>
                      <span style={{color:"#a1a1aa",fontSize:13}}>{item.preco != null ? `A partir de ${money(item.preco)}` : "Consulte os detalhes liberados"}</span>
                      {item.apresentacao?.url && <span style={{display:"flex",alignItems:"center",gap:6,color:"#edcf91",fontWeight:800,marginTop:5}}>Abrir apresentação <ChevronRight size={18} /></span>}
                    </div>
                  </button>
                  <div style={{padding:"0 17px 17px",display:"grid",gap:9}}>
                    {(item.permitir_proposta || item.exibir_fluxo) && !item.unidades?.length && <button type="button" onClick={() => openProposal(item)} style={{border:0,background:"#d7ab63",color:"#09090b",borderRadius:8,padding:12,fontWeight:800,cursor:"pointer"}}><Landmark size={15} /> Abrir editor de fluxo e proposta</button>}
                    {!item.unidades?.length && !(item.permitir_proposta || item.exibir_fluxo) && <small style={{color:"#71717a"}}>Apresentação disponível. Consulte o especialista para condições e unidades.</small>}
                  </div>
                </article>
              );
            })}
          </section>
        )}
        {!activeOpportunity && opportunities.length > 0 && <button type="button" onClick={() => setComparisonOpen(true)} style={{display:"block",width:"min(680px,100%)",margin:"22px auto 0",border:0,background:"#d7ab63",color:"#09090b",borderRadius:9,padding:"14px 18px",fontWeight:900,fontSize:15,cursor:"pointer"}}><Landmark size={17} /> Comparar fluxos e fazer proposta</button>}
        {activeOpportunity && (
          <section style={{ display: "grid", gap: 12 }}>
            <button
              onClick={() => setActiveOpportunity(null)}
              style={{
                justifySelf: "start",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
                border: "1px solid #3f3524",
                background: "#17140e",
                color: "#edcf91",
                borderRadius: 8,
                padding: "10px 13px",
                cursor: "pointer",
                fontWeight: 800,
              }}
            >
              <ArrowLeft size={16} />
              Voltar aos empreendimentos
            </button>
            <OpportunityLanding
              item={activeOpportunity}
              onProposal={openProposal}
              cub={cub}
            />
          </section>
        )}
        {comparisonOpen && <div role="dialog" aria-modal="true" style={{position:"fixed",inset:0,zIndex:1050,background:"#000d",padding:18,overflow:"auto"}}><section style={{maxWidth:980,margin:"20px auto",background:"#111113",border:"1px solid #514124",borderRadius:14,padding:"clamp(18px,3vw,30px)"}}><header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}><div><small style={{color:"#d7ab63",fontWeight:800,letterSpacing:".1em"}}>COMPARATIVO GERAL</small><h2 style={{margin:"6px 0"}}>Escolha a melhor unidade e ajuste o fluxo</h2><p style={{margin:0,color:"#a1a1aa",fontSize:13}}>Estas são somente as unidades liberadas pelo seu especialista. A simulação não altera a tabela oficial.</p></div><button type="button" onClick={() => setComparisonOpen(false)}><X size={17}/></button></header>{(() => {const rows=opportunities.flatMap((op)=> (op.unidades||[]).map((unit)=>({op,unit})));const max=Math.max(...rows.map(({unit})=>Number(unit.valor||0)),1);return rows.length ? <div style={{display:"grid",gap:10,marginTop:20}}>{rows.map(({op,unit})=>{const value=Number(unit.valor||0);return <div key={`${op.id}-${unit.id}`} style={{display:"grid",gridTemplateColumns:"minmax(180px,1fr) minmax(120px,1fr) auto",alignItems:"center",gap:12,padding:"12px 0",borderTop:"1px solid #29251f"}}><span><b>{op.nome}</b><small style={{display:"block",color:"#d7ab63"}}>{unit.codigo||unit.numero||"Unidade"}{unit.torre?` · Torre ${unit.torre}`:""}{unit.tipologia?` · ${unit.tipologia}`:""}</small></span><span><div style={{height:10,borderRadius:10,background:"#27272a",overflow:"hidden"}}><div style={{height:"100%",width:`${Math.max(5,value/max*100)}%`,background:"linear-gradient(90deg,#d7ab63,#f5e0b2)"}}/></div><small style={{color:"#a1a1aa"}}>{money(value)}</small></span><button type="button" onClick={() => {setComparisonOpen(false);openProposal(op,unit);}} style={{border:0,background:"#d7ab63",color:"#09090b",borderRadius:7,padding:"9px 11px",fontWeight:800,cursor:"pointer"}}>Ajustar fluxo</button></div>})}</div> : <p style={{marginTop:20,color:"#fbbf24"}}>Nenhuma unidade foi liberada para esta cliente.</p>})()}<p style={{margin:"20px 0 0",color:"#a1a1aa",fontSize:12}}>Depois de ajustar entrada, parcela e balões, use “Enviar cenário para análise”. A proposta será recebida no seu painel.</p></section></div>}
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
                    Proposta para {proposal.nome}{proposalUnit ? ` · Unidade ${proposalUnit.codigo || proposalUnit.numero || "selecionada"}` : ""}
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
              {proposal.unidades?.length ? <div style={{marginTop:22,padding:12,border:"1px solid #514124",borderRadius:9,background:"#17140e"}}><strong style={{display:"block",color:"#edcf91",fontSize:12,marginBottom:8}}>Escolha a unidade para simular</strong><div style={{display:"grid",gap:7}}>{proposal.unidades.map((unit)=>{const active=proposalUnit?.id===unit.id;return <button type="button" key={unit.id} onClick={()=>openProposal(proposal,unit)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,textAlign:"left",border:`1px solid ${active?"#d7ab63":"#3f3f46"}`,background:active?"#2a2112":"#111113",color:"#f5e0b2",borderRadius:7,padding:"9px 10px",cursor:"pointer"}}><span><b>{unit.codigo||unit.numero||"Unidade"}</b>{unit.torre?` · Torre ${unit.torre}`:""}{unit.tipologia?` · ${unit.tipologia}`:""}</span><span>{money(unit.valor)}</span></button>})}</div></div> : null}
              {proposal && <FlowSchedule item={proposal} unit={proposalUnit} cub={cub} />}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                  gap: 13,
                  marginTop: 22,
                }}
              >
                {proposalUnit && <div style={{gridColumn:"1/-1",padding:12,borderRadius:8,background:"#17140e",color:"#ead5aa",fontSize:12}}>Valor da unidade: <strong>{money(proposalUnit.valor)}</strong>{proposal.desconto_percentual ? ` · condição especial de ${Number(proposal.desconto_percentual).toLocaleString("pt-BR")} % · valor de referência após condição: ${money(Number(proposalUnit.valor||0)*(1-Number(proposal.desconto_percentual)/100))}` : ""}</div>}
                {([['entrada','Entrada'],['parcela','Parcela mensal'],['balao','Balão'],['chaves','Nas chaves'],['posChaves','Pós-chaves']] as const).map(([field,label]) => {
                  const disabled = flowLocks[field] || field === autoField;
                  const max = Math.max(1, activeFlow?.price || 500000);
                  return <label key={field} style={{ fontSize: 12, color: "#d4d4d8" }}><span style={{ display:"flex", justifyContent:"space-between", alignItems:"center", gap:6 }}>{label}<button type="button" title={disabled ? "Destravar campo" : "Travar campo"} onClick={() => toggleFlowLock(field)} style={{ border:0, background:"transparent", color:disabled?"#d7ab63":"#71717a", cursor:"pointer", padding:2 }}>{disabled ? <Lock size={14}/> : <LockOpen size={14}/>}</button></span><input type="number" min="0" step="100" disabled={disabled} value={Math.round(solvedFlow[field] || 0)} onChange={(event) => setFlowManual(field, Number(event.target.value))} style={{ ...input, marginTop: 6, opacity: disabled ? .65 : 1 }} /><input type="range" min="0" max={max} step="100" disabled={disabled} value={Math.min(max, solvedFlow[field] || 0)} onChange={(event) => setFlowManual(field, Number(event.target.value))} style={{ width:"100%", accentColor:"#d7ab63", opacity: disabled ? .65 : 1 }} /><b style={{ color: "#f5e0b2", fontSize: 13 }}>{money(solvedFlow[field])}{field === autoField ? " · fecha saldo" : ""}</b></label>;
                })}
              </div>
              <div className="portal-proposal-grid">
                <label style={{ fontSize: 12, color: "#d4d4d8" }}>Balões até as chaves — quantidade oficial<input type="number" readOnly value={activeFlow?.balloonCount || 0} style={{ ...input, marginTop: 6, opacity: .7 }} /><small style={{ display:"block", color:"#8e8b83", marginTop:5 }}>A quantidade segue a tabela da unidade.</small></label>
                <label style={{ fontSize: 12, color: "#d4d4d8" }}>Observação<textarea value={note} maxLength={1500} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Ex.: consigo ajustar a entrada em dois atos." style={{ ...input, marginTop: 6, resize: "vertical" }} /></label>
              </div>
              <section className="portal-postkeys-box"><strong>Pós-chaves</strong><p>Escolha como deseja visualizar o saldo depois das chaves. Essa escolha não aumenta o valor da unidade.</p><div className="portal-postkeys-controls"><label>Forma<select value={postMode} onChange={(event) => setPostMode(event.target.value as typeof postMode)} style={{ ...input, marginTop: 5 }}><option value="parcelas">Parcelas mensais</option><option value="misto">Parcelas + balões</option><option value="baloes">Somente balões</option></select></label><label>Quantidade de parcelas<input type="number" min="1" max="480" value={postMonths || ""} onChange={(event) => setPostMonths(Math.max(1, Math.min(480, Number(event.target.value) || 1)))} style={{ ...input, marginTop: 5 }} /></label>{postMode !== "parcelas" && <><label>Quantidade de balões<input type="number" min="0" max="120" value={postBalloonCount || ""} onChange={(event) => setPostBalloonCount(Math.max(0, Math.min(120, Number(event.target.value) || 0)))} style={{ ...input, marginTop: 5 }} /></label><label>Valor de cada balão<input type="number" min="0" value={postBalloonValue || ""} onChange={(event) => setPostBalloonValue(Math.max(0, Number(event.target.value) || 0))} style={{ ...input, marginTop: 5 }} /></label></>}</div><small>{activeFlow?.postIndex || "IPCA"}{activeFlow?.postInterest ? ` + ${activeFlow.postInterest.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}% a.m.` : ""} · saldo nominal: {money(solvedFlow.posChaves)}</small></section>
              <section className="portal-appreciation-box"><strong>Valorização estimada do imóvel</strong><p>Esta é uma premissa informativa, não uma garantia de rentabilidade.</p><label>Valorização anual (%)<input type="number" min="0" max="100" step="0.1" value={appreciation || ""} onChange={(event) => setAppreciation(Math.max(0, Math.min(100, Number(event.target.value) || 0)))} style={{ ...input, marginTop: 5 }} /></label>{activeFlow && <div className="portal-appreciation-result">Valor estimado na entrega: <strong>{money(activeFlow.price * Math.pow(1 + Math.max(0, appreciation) / 100, Math.max(1, activeFlow.months) / 12))}</strong> · valorização estimada: <strong>{money(activeFlow.price * (Math.pow(1 + Math.max(0, appreciation) / 100, Math.max(1, activeFlow.months) / 12) - 1))}</strong></div>}</section>
              <section className="portal-identity-box"><strong>Dados para formalizar a proposta</strong><div className="portal-proposal-grid"><label>CPF<input inputMode="numeric" value={clientCpf} onChange={(event) => setClientCpf(event.target.value)} placeholder="000.000.000-00" style={{ ...input, marginTop: 5 }} /></label><label>E-mail<input type="email" value={clientEmail} onChange={(event) => setClientEmail(event.target.value)} placeholder="voce@email.com" style={{ ...input, marginTop: 5 }} /></label></div><small>Esses dados serão enviados apenas junto com a proposta para análise da construtora.</small></section>
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
                Fluxo fechado: entrada {money(solvedFlow.entrada)}, parcela mensal {money(solvedFlow.parcela)}, {activeFlow?.balloonCount ? `${activeFlow.balloonCount} balão(ões) de ${money(solvedFlow.balao)}, ` : ""}pós-chaves {money(solvedFlow.posChaves)}. Total do fluxo: <strong>{money(flowTotal)}</strong> de <strong>{money(activeFlow?.price)}</strong>. O especialista receberá este cenário para análise.
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
                disabled={sending || !proposalUnit || !activeFlow || Math.abs(flowTotal - activeFlow.price) > 0.02}
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
        {presentation && <PresentationSlides url={presentation.url} title={presentation.title} onClose={() => setPresentation(null)} />}
      </div>
    </main>
  );
}
