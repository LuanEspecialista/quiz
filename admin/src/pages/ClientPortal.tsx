import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  ChevronRight,
  Images,
  Landmark,
  Lock,
  LogOut,
  Send,
  UserRound,
  Unlock,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import CurrencyInput from "../components/CurrencyInput";
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
  desconto_valor?: number | null;
  desconto_percentual?: number | null;
};
type Portal = {
  cliente?: { nome?: string; telefone?: string | null; email?: string | null; cpf?: string | null; objetivo?: string };
  oportunidades?: Opportunity[];
};
type CubQuote = { value: number; competencia?: string | null; mes_referencia?: string | null; source?: string; updated_at?: string };
type PostMode = "chaves" | "parcelas_e_baloes" | "somente_parcelas" | "somente_baloes";
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

function commercialSchedule(item: Opportunity) {
  const custom = item.caracteristicas?.fluxo_comercial || {};
  return {
    launch: String(custom.lancamento || item.regras_correcao?.lancamento || ""),
    works: String(custom.inicio_obras || item.cronograma?.inicio_obras || item.regras_correcao?.inicio_obras || ""),
    keys: String(custom.entrega || item.data_entrega_chaves || item.entrega_date || item.previsao_entrega || ""),
    preIndex: String(custom.correcao_ate_chaves || item.regras_correcao?.indice_ate_chaves || "CUB"),
    keysMode: String(custom.nas_chaves || item.regras_correcao?.modalidade_chaves || "Financiamento"),
  };
}

function unitCommercial(item: Opportunity, unit?: PortalUnit | null) {
  const tablePrice = Math.max(0, Number(unit?.valor || item.preco || 0));
  const fixedDiscount = Math.max(0, Number(unit?.desconto_valor || 0));
  const percentage = fixedDiscount > 0
    ? Math.min(100, fixedDiscount / Math.max(tablePrice, 1) * 100)
    : Math.max(0, Number(unit?.desconto_percentual || item.desconto_percentual || 0));
  const discountValue = fixedDiscount > 0
    ? Math.min(tablePrice, fixedDiscount)
    : Math.min(tablePrice, tablePrice * percentage / 100);
  return { tablePrice, discountValue, percentage, finalPrice: Math.max(0, tablePrice - discountValue) };
}

function flowTargets(item: Opportunity, unit: PortalUnit | null, total: number) {
  const flow = unit?.fluxo_dados || {};
  const enterpriseFlow = item.caracteristicas?.fluxo_comercial || {};
  const pre = Number(flow.percentual_ate_chaves ?? flow.percentual_pre_chaves ?? enterpriseFlow.percentual_ate_chaves ?? item.regras_correcao?.percentual_ate_chaves ?? 0);
  const post = Number(flow.percentual_pos_chaves ?? enterpriseFlow.percentual_pos_chaves ?? item.regras_correcao?.percentual_pos_chaves ?? 0);
  const prePct = pre > 0 ? Math.min(100, pre) : post > 0 ? Math.max(0, 100 - post) : 100;
  return { prePct, postPct: Math.max(0, 100 - prePct), preTarget: Number((total * prePct / 100).toFixed(2)), postTarget: Number((total * (100 - prePct) / 100).toFixed(2)) };
}

function FlowSchedule({ item, unit, cub }: { item: Opportunity; unit?: PortalUnit | null; cub?: CubQuote | null }) {
  const summary = flowSummary(item, unit, cub);
  const schedule = commercialSchedule(item);
  const preIndex = String(summary.flow.indice_pre_chaves || summary.rules.indice_pre_chaves || "CUB");
  const formattedInterest = summary.postInterest ? ` + ${summary.postInterest.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}% a.m.` : "";
  return <section className="portal-flow-summary">
    <div className="portal-flow-heading"><div><small>CRONOGRAMA E FLUXO NOMINAL</small><strong>{item.nome}</strong></div><span>Atualizado em {new Intl.DateTimeFormat("pt-BR").format(new Date())}</span></div>
    <div className="portal-flow-grid">
      {schedule.launch && <div><small>Lançamento</small><b>{monthLabel(schedule.launch)}</b></div>}
      {schedule.works && <div><small>Início das obras</small><b>{monthLabel(schedule.works)}</b></div>}
      <div><small>Entrega / chaves</small><b>{monthLabel(summary.delivery || schedule.keys)}</b><em>{schedule.keysMode}</em></div>
      <div><small>Até as chaves</small><b>{summary.preCount ? `${summary.remaining} restantes` : "Conforme tabela"}</b><em>{summary.preCount ? `${summary.elapsed} já transcorridas de ${summary.preCount}` : ""}</em></div>
      <div><small>Correção até as chaves</small><b>{schedule.preIndex || preIndex}</b><em>valor nominal ajustado pela competência vigente</em></div>
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

function MoneyScenario({
  label,
  value,
  setValue,
  max,
  locked = false,
  onToggleLock,
}: {
  label: string;
  value: number;
  setValue: (value: number) => void;
  max: number;
  locked?: boolean;
  onToggleLock?: () => void;
}) {
  return (
    <label style={{ fontSize: 12, color: "#d4d4d8" }}>
      <span style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:7}}><span>{label}</span>{onToggleLock && <button type="button" aria-label={locked ? `Destravar ${label}` : `Travar ${label}`} title={locked ? "Destravar valor" : "Travar valor"} onClick={onToggleLock} style={{border:0,background:"transparent",color:locked?"#d7ab63":"#86efac",padding:2,cursor:"pointer"}}>{locked ? <Lock size={15}/> : <Unlock size={15}/>}</button>}</span>
      <div style={{marginTop:6}}><CurrencyInput value={value} onChange={(next) => setValue(Math.max(0, Math.min(max, next)))} disabled={locked} style={{ ...input, margin: 0, opacity: locked ? .72 : 1 }} /></div>
      <input
        type="range"
        min="0"
        max={max}
        step="100"
        value={Math.min(value, max)}
        onChange={(e) => setValue(Number(e.target.value))}
        disabled={locked}
        style={{ width: "100%", accentColor: "#d7ab63", opacity: locked ? .72 : 1 }}
      />
      <b style={{ color: "#f5e0b2", fontSize: 13 }}>{money(value)}</b>
    </label>
  );
}

function CountScenario({ label, value, setValue, max = 360 }: { label: string; value: number; setValue: (value: number) => void; max?: number }) {
  const adjust = (delta: number) => setValue(Math.max(0, Math.min(max, value + delta)));
  return <label style={{fontSize:12,color:"#d4d4d8"}}>{label}<div style={{display:"grid",gridTemplateColumns:"38px minmax(0,1fr) 38px",gap:5,alignItems:"center",marginTop:6}}><button type="button" aria-label={`Diminuir ${label}`} onClick={()=>adjust(-1)} style={{...input,padding:"8px 0",fontWeight:900,cursor:"pointer"}}>−</button><input type="number" min="0" max={max} value={value || ""} onChange={(e)=>setValue(Math.max(0,Math.min(max,Number(e.target.value)||0)))} style={{...input,margin:0}}/><button type="button" aria-label={`Aumentar ${label}`} onClick={()=>adjust(1)} style={{...input,padding:"8px 0",fontWeight:900,cursor:"pointer"}}>+</button></div><input type="range" min="0" max={max} step="1" value={value} onChange={(e)=>setValue(Number(e.target.value))} style={{width:"100%",accentColor:"#d7ab63"}}/><b style={{color:"#f5e0b2",fontSize:13}}>{value}</b></label>;
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
        {!!item.unidades?.length && <div style={{display:"grid",gap:8,padding:14,border:"1px solid #3a3327",borderRadius:10,background:"#14120f"}}><strong style={{color:"#edcf91"}}>Unidades liberadas para análise</strong><small style={{color:"#a1a1aa"}}>Escolha uma unidade para abrir o fluxo. A simulação usa a condição liberada pelo especialista e não altera a tabela oficial.</small>{item.unidades.map((unit) => { const commercial=unitCommercial(item,unit); return <div key={unit.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap",padding:"9px 0",borderTop:"1px solid #29251f"}}><span style={{minWidth:0}}><b>{unit.codigo || unit.numero || "Unidade"}</b>{unit.torre ? ` · Torre ${unit.torre}` : ""}{unit.tipologia ? ` · ${unit.tipologia}` : ""}<small style={{display:"block",color:commercial.discountValue>0?"#d9c28e":"#a1a1aa"}}>{commercial.discountValue>0 ? <>{money(commercial.tablePrice)} · desconto negociado de {money(commercial.discountValue)} · <strong>{money(commercial.finalPrice)}</strong></> : money(commercial.tablePrice)}</small></span><button type="button" onClick={() => onProposal(item, unit)} style={{border:0,background:"#d7ab63",color:"#09090b",borderRadius:7,padding:"9px 11px",fontWeight:800,cursor:"pointer",maxWidth:"100%"}}>Ver fluxo</button></div>})}</div>}
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
  const [entry, setEntry] = useState(0);
  const [monthly, setMonthly] = useState(2500);
  const [balloon, setBalloon] = useState(0);
  const [balloonCount, setBalloonCount] = useState(0);
  const [preMonths, setPreMonths] = useState(0);
  const [postMonthly, setPostMonthly] = useState(0);
  const [postMonths, setPostMonths] = useState(0);
  const [postBalloon, setPostBalloon] = useState(0);
  const [postBalloonCount, setPostBalloonCount] = useState(0);
  const [postMode, setPostMode] = useState<PostMode>("parcelas_e_baloes");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState("");
  const [cub, setCub] = useState<CubQuote | null>(null);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientCpf, setClientCpf] = useState("");
  const [lockedEntry, setLockedEntry] = useState(true);
  const [lockedMonthly, setLockedMonthly] = useState(true);
  const [lockedBalloon, setLockedBalloon] = useState(true);
  const [lockedPostMonthly, setLockedPostMonthly] = useState(true);
  const [lockedPostBalloon, setLockedPostBalloon] = useState(true);

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
        setPortal({ ...result, oportunidades: opportunities });
        setClientName(result.cliente?.nome || "");
        setClientPhone(result.cliente?.telefone || "");
        setClientEmail(result.cliente?.email || "");
        setClientCpf(result.cliente?.cpf || "");
      });
  }, []);

  const client = portal?.cliente;
  const opportunities = portal?.oportunidades || [];
  const firstName =
    (client?.nome || userName || "").trim().split(/\s+/)[0] || "";
  const openProposal = (item: Opportunity, unit?: PortalUnit) => {
    const summary = flowSummary(item, unit || null, cub);
    const commercial = unitCommercial(item, unit);
    const initialEntry = Number((commercial.finalPrice * 0.1).toFixed(2));
    const initialPreMonths = Math.max(0, summary.remaining);
    const initialPostMonths = Math.max(0, summary.postCount);
    const initialPostBalloon = Number(summary.flow.reforco_pos_chaves_valor || 0);
    const initialPostBalloonCount = Number(summary.flow.quantidade_reforcos_pos_chaves || 0);
    const initialPostMode: PostMode = /financiamento/i.test(commercialSchedule(item).keysMode) ? "chaves" : "parcelas_e_baloes";
    const initialTargets = flowTargets(item, unit || null, commercial.finalPrice);
    const initialMonthly = initialPreMonths > 0
      ? Math.max(0, Number(((initialTargets.preTarget - initialEntry) / initialPreMonths).toFixed(2)))
      : Math.round(summary.correctedInstallment || 2500);
    const initialPostMonthly = initialPostMonths > 0
      ? Math.max(0, Number(((initialTargets.postTarget - initialPostBalloon * initialPostBalloonCount) / initialPostMonths).toFixed(2)))
      : 0;
    setProposal(item);
    setProposalUnit(unit || null);
    setPostMode(initialPostMode);
    setLockedEntry(true);
    setLockedMonthly(true);
    setLockedBalloon(true);
    setLockedPostMonthly(true);
    setLockedPostBalloon(true);
    setEntry(initialEntry);
    setMonthly(initialMonthly);
    setBalloon(0);
    setBalloonCount(0);
    setPreMonths(initialPreMonths);
    setPostMonthly(initialPostMonthly);
    setPostMonths(initialPostMonths);
    setPostBalloon(initialPostBalloon);
    setPostBalloonCount(initialPostBalloonCount);
    setNote("");
    setSent("");
  };
  const openPresentation = (item: Opportunity) => {
    if (item.apresentacao?.url) setPresentation({ url: item.apresentacao.url, title: item.nome || "Apresentação" });
  };
  const commercial = proposal ? unitCommercial(proposal, proposalUnit) : null;
  const targets = proposal && commercial ? flowTargets(proposal, proposalUnit, commercial.finalPrice) : { prePct: 100, postPct: 0, preTarget: 0, postTarget: 0 };
  const financingAtKeys = postMode === "chaves";
  const preTotal = Number((entry + monthly * preMonths + balloon * balloonCount).toFixed(2));
  const postTotal = Number((postMonthly * postMonths + postBalloon * postBalloonCount).toFixed(2));
  const remainingAfterPre = commercial ? Math.max(0, Number((commercial.finalPrice - preTotal).toFixed(2))) : 0;
  const financingTotal = financingAtKeys ? remainingAfterPre : 0;
  const flowTotal = Number((preTotal + postTotal + financingTotal).toFixed(2));
  const flowDifference = commercial ? Number((commercial.finalPrice - flowTotal).toFixed(2)) : 0;
  const preShare = commercial?.finalPrice ? preTotal / commercial.finalPrice * 100 : 0;
  const shareDeviation = Math.abs(preShare - targets.prePct);
  const acceptance = Math.abs(flowDifference) > 0.02 ? { label: "Não fecha", color: "#f87171", detail: "Há saldo ou excesso no cálculo." } : shareDeviation <= 2 ? { label: "Excelente aderência", color: "#86efac", detail: "Distribuição alinhada ao fluxo da construtora." } : shareDeviation <= 10 ? { label: "Aceitável para negociação", color: "#fbbf24", detail: "O total fecha, mas a distribuição foge parcialmente do padrão." } : { label: "Difícil aceitação", color: "#f87171", detail: "O total fecha, porém a distribuição está distante do fluxo oficial." };
  const changePostMonths = (next: number) => {
    setPostMonths(next);
    if (postMode === "somente_parcelas") { setPostMonthly(next > 0 ? Number((remainingAfterPre / next).toFixed(2)) : 0); return; }
    if (postMode === "parcelas_e_baloes" && lockedPostMonthly && postBalloonCount > 0) setPostBalloon(Number(Math.max(0, (remainingAfterPre - postMonthly * next) / postBalloonCount).toFixed(2)));
  };
  const changePostBalloonCount = (next: number) => {
    setPostBalloonCount(next);
    if (postMode === "somente_baloes") { setPostBalloon(next > 0 ? Number((remainingAfterPre / next).toFixed(2)) : 0); return; }
    if (postMode === "parcelas_e_baloes" && lockedPostBalloon && postMonths > 0) setPostMonthly(Number(Math.max(0, (remainingAfterPre - postBalloon * next) / postMonths).toFixed(2)));
  };
  const changePostMonthly = (next: number) => {
    setPostMonthly(next);
    if (postMode === "parcelas_e_baloes" && postBalloonCount > 0) setPostBalloon(Number(Math.max(0, (remainingAfterPre - next * postMonths) / postBalloonCount).toFixed(2)));
  };
  const changePostBalloon = (next: number) => {
    setPostBalloon(next);
    if (postMode === "parcelas_e_baloes" && postMonths > 0) setPostMonthly(Number(Math.max(0, (remainingAfterPre - next * postBalloonCount) / postMonths).toFixed(2)));
  };
  const changePostMode = (next: PostMode) => {
    setPostMode(next);
    if (next === "chaves") { setPostMonthly(0); setPostBalloon(0); setPostMonths(0); setPostBalloonCount(0); }
    if (next === "somente_parcelas") { setPostBalloon(0); setPostBalloonCount(0); }
    if (next === "somente_baloes") { setPostMonthly(0); setPostMonths(0); }
  };
  const redistributeFlow = () => {
    if (!commercial) return;
    const nextMonthly = preMonths > 0 ? Math.max(0, Number(((targets.preTarget - entry - balloon * balloonCount) / preMonths).toFixed(2))) : 0;
    setMonthly(nextMonthly);
    const remaining = Math.max(0, Number((commercial.finalPrice - (entry + nextMonthly * preMonths + balloon * balloonCount)).toFixed(2)));
    if (postMode === "chaves") { setPostMonthly(0); setPostBalloon(0); setPostBalloonCount(0); setPostMonths(0); return; }
    if (postMode === "somente_parcelas") { setPostBalloon(0); setPostBalloonCount(0); setPostMonthly(postMonths > 0 ? Number((remaining / postMonths).toFixed(2)) : 0); return; }
    if (postMode === "somente_baloes") { setPostMonthly(0); setPostMonths(0); setPostBalloon(postBalloonCount > 0 ? Number((remaining / postBalloonCount).toFixed(2)) : 0); return; }
    if (lockedPostMonthly && postBalloonCount > 0) setPostBalloon(Number(Math.max(0, (remaining - postMonthly * postMonths) / postBalloonCount).toFixed(2)));
    else setPostMonthly(postMonths > 0 ? Number(Math.max(0, (remaining - postBalloon * postBalloonCount) / postMonths).toFixed(2)) : 0);
  };
  const sendProposal = async () => {
    if (!proposal) return;
    if (!proposalUnit || !commercial || Math.abs(flowTotal - commercial.finalPrice) > 0.02) {
      setSent(`O fluxo ainda não fecha. Total atual: ${money(flowTotal)} · Valor final: ${money(commercial?.finalPrice)}. Distribua o saldo entre até as chaves e pós-chaves antes de enviar.`);
      return;
    }
    if (!clientName.trim() || !clientPhone.trim() || !clientCpf.replace(/\D/g, "").length || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmail.trim())) {
      setSent("Preencha nome, telefone, CPF e e-mail para enviar a proposta.");
      return;
    }
    setSending(true);
    setSent("");
    const { error: rpcError } = await supabase.rpc("enviar_proposta_cliente", {
      p_empreendimento_id: proposal.id,
      p_entrada: entry,
      p_parcela_mensal: monthly,
      p_balao: balloon,
      p_quantidade_baloes: balloonCount,
      p_objetivo: client?.objetivo || null,
      p_mensagem: note || null,
      p_unidade_id: proposalUnit?.id || null,
      p_desconto_percentual: Number(commercial.percentage || 0),
      p_fluxo_snapshot: { total: flowTotal, valor_tabela: commercial.tablePrice, desconto_negociado: commercial.discountValue, distribuicao: { percentual_ate_chaves: targets.prePct, percentual_pos_chaves: targets.postPct, modalidade_pos_chaves: financingAtKeys ? "financiamento_nas_chaves" : "direto_construtora", total_ate_chaves: preTotal, total_pos_chaves: postTotal, financiamento_nas_chaves: financingTotal, meta_ate_chaves: targets.preTarget, meta_pos_chaves: targets.postTarget, saldo: flowDifference }, valores: { entrada: entry, parcela: monthly, parcelas_ate_chaves: preMonths, balao: balloon, baloes_ate_chaves: balloonCount, parcela_pos_chaves: postMonthly, parcelas_pos_chaves: postMonths, balao_pos_chaves: postBalloon, baloes_pos_chaves: postBalloonCount } },
      p_cpf: clientCpf,
      p_email: clientEmail.trim().toLowerCase(),
      p_nome: clientName.trim(),
      p_telefone: clientPhone.trim(),
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
        {comparisonOpen && <div role="dialog" aria-modal="true" style={{position:"fixed",inset:0,zIndex:1050,background:"#000d",padding:12,overflowX:"hidden",overflowY:"auto"}}><section style={{maxWidth:980,width:"100%",maxHeight:"calc(100dvh - 24px)",overflowY:"auto",boxSizing:"border-box",margin:"12px auto",background:"#111113",border:"1px solid #514124",borderRadius:14,padding:"clamp(18px,3vw,30px)"}}><header style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12}}><div style={{minWidth:0}}><small style={{color:"#d7ab63",fontWeight:800,letterSpacing:".1em"}}>COMPARATIVO GERAL</small><h2 style={{margin:"6px 0"}}>Escolha a melhor unidade e ajuste o fluxo</h2><p style={{margin:0,color:"#a1a1aa",fontSize:13}}>Estas são somente as unidades liberadas pelo seu especialista. A simulação não altera a tabela oficial.</p></div><button type="button" onClick={() => setComparisonOpen(false)}><X size={17}/></button></header>{(() => {const rows=opportunities.flatMap((op)=> (op.unidades||[]).map((unit)=>({op,unit})));const max=Math.max(...rows.map(({op,unit})=>unitCommercial(op,unit).finalPrice),1);return rows.length ? <div style={{display:"grid",gap:10,marginTop:20}}>{rows.map(({op,unit})=>{const commercial=unitCommercial(op,unit);return <div key={`${op.id}-${unit.id}`} style={{display:"grid",gridTemplateColumns:"minmax(0,1fr)",alignItems:"start",gap:8,padding:"12px 0",borderTop:"1px solid #29251f",minWidth:0}}><span style={{minWidth:0,overflowWrap:"anywhere"}}><b>{op.nome}</b><small style={{display:"block",color:"#d7ab63"}}>{unit.codigo||unit.numero||"Unidade"}{unit.torre?` · Torre ${unit.torre}`:""}{unit.tipologia?` · ${unit.tipologia}`:""}</small></span><span style={{minWidth:0,width:"100%"}}><div style={{height:10,borderRadius:10,background:"#27272a",overflow:"hidden"}}><div style={{height:"100%",width:`${Math.max(5,commercial.finalPrice/max*100)}%`,background:"linear-gradient(90deg,#d7ab63,#f5e0b2)"}}/></div><small style={{color:"#a1a1aa"}}>{commercial.discountValue>0 ? `${money(commercial.finalPrice)} · desconto ${money(commercial.discountValue)}` : money(commercial.finalPrice)}</small></span><button type="button" onClick={() => {setComparisonOpen(false);openProposal(op,unit);}} style={{border:0,background:"#d7ab63",color:"#09090b",borderRadius:7,padding:"9px 11px",fontWeight:800,cursor:"pointer",justifySelf:"start",maxWidth:"100%"}}>Ajustar fluxo</button></div>})}</div> : <p style={{marginTop:20,color:"#fbbf24"}}>Nenhuma unidade foi liberada para esta cliente.</p>})()}<p style={{margin:"20px 0 0",color:"#a1a1aa",fontSize:12}}>Depois de ajustar entrada, parcela e balões, use “Enviar cenário para análise”. A proposta será recebida no seu painel.</p></section></div>}
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
              {proposal.unidades?.length ? <div style={{marginTop:22,padding:12,border:"1px solid #514124",borderRadius:9,background:"#17140e"}}><strong style={{display:"block",color:"#edcf91",fontSize:12,marginBottom:8}}>Escolha a unidade para simular</strong><div style={{display:"grid",gap:7}}>{proposal.unidades.map((unit)=>{const active=proposalUnit?.id===unit.id;const unitPrice=unitCommercial(proposal,unit);return <button type="button" key={unit.id} onClick={()=>openProposal(proposal,unit)} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,textAlign:"left",border:`1px solid ${active?"#d7ab63":"#3f3f46"}`,background:active?"#2a2112":"#111113",color:"#f5e0b2",borderRadius:7,padding:"9px 10px",cursor:"pointer",minWidth:0}}><span style={{minWidth:0,overflowWrap:"anywhere"}}><b>{unit.codigo||unit.numero||"Unidade"}</b>{unit.torre?` · Torre ${unit.torre}`:""}{unit.tipologia?` · ${unit.tipologia}`:""}</span><span style={{whiteSpace:"nowrap"}}>{money(unitPrice.finalPrice)}</span></button>})}</div></div> : null}
              {proposal && <FlowSchedule item={proposal} unit={proposalUnit} cub={cub} />}
              <section style={{display:"grid",gap:10,marginTop:18,padding:13,border:"1px solid #3a3327",borderRadius:9,background:"#17140e"}}>
                <strong style={{color:"#edcf91",fontSize:12}}>Dados para emissão da proposta</strong>
                <small style={{color:"#a1a1aa"}}>Os dados já cadastrados foram preenchidos automaticamente. Corrija ou complete apenas o que estiver faltando.</small>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:9}}>
                  <label style={{fontSize:12,color:"#d4d4d8"}}>Nome<input value={clientName} onChange={(e)=>setClientName(e.target.value)} style={{...input,marginTop:5}} /></label>
                  <label style={{fontSize:12,color:"#d4d4d8"}}>Telefone<input value={clientPhone} onChange={(e)=>setClientPhone(e.target.value)} inputMode="tel" style={{...input,marginTop:5}} /></label>
                  <label style={{fontSize:12,color:"#d4d4d8"}}>CPF<input value={clientCpf} onChange={(e)=>setClientCpf(e.target.value)} inputMode="numeric" style={{...input,marginTop:5}} /></label>
                  <label style={{fontSize:12,color:"#d4d4d8"}}>E-mail<input value={clientEmail} onChange={(e)=>setClientEmail(e.target.value)} type="email" style={{...input,marginTop:5}} /></label>
                </div>
              </section>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))",
                  gap: 13,
                  marginTop: 22,
                }}
              >
                {proposalUnit && <div style={{gridColumn:"1/-1",padding:12,borderRadius:8,background:"#17140e",color:"#ead5aa",fontSize:12}}>Valor da unidade: <strong>{money(proposalUnit.valor)}</strong>{proposal.desconto_percentual ? ` · condição especial de ${Number(proposal.desconto_percentual).toLocaleString("pt-BR")} % · valor de referência após condição: ${money(Number(proposalUnit.valor||0)*(1-Number(proposal.desconto_percentual)/100))}` : ""}</div>}
                <MoneyScenario
                  label="Entrada"
                  value={entry}
                  setValue={setEntry}
                  max={proposal.preco || 500000}
                  locked={lockedEntry}
                  onToggleLock={() => setLockedEntry((value) => !value)}
                />
                <MoneyScenario
                  label="Parcela mensal"
                  value={monthly}
                  setValue={setMonthly}
                  max={Math.max(20000, (proposal.preco || 500000) * 0.08)}
                  locked={lockedMonthly}
                  onToggleLock={() => setLockedMonthly((value) => !value)}
                />
                <CountScenario label="Parcelas até as chaves" value={preMonths} setValue={setPreMonths} />
                <MoneyScenario
                  label="Balão"
                  value={balloon}
                  setValue={setBalloon}
                  max={proposal.preco || 500000}
                  locked={lockedBalloon}
                  onToggleLock={() => setLockedBalloon((value) => !value)}
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "180px 1fr",
                  gap: 13,
                  marginTop: 13,
                }}
              >
                <CountScenario label="Quantidade de balões" value={balloonCount} setValue={setBalloonCount} max={120} />
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
              <section style={{display:"grid",gap:10,marginTop:13,padding:13,border:"1px solid #3a3327",borderRadius:9,background:"#17140e"}}>
                <strong style={{fontSize:12,color:"#edcf91"}}>O que fazer com o saldo após as chaves?</strong>
                <select value={postMode} onChange={(e)=>changePostMode(e.target.value as PostMode)} style={{...input,marginTop:2}}><option value="chaves">Quitar/financiar o saldo nas chaves</option><option value="parcelas_e_baloes">Pós-chaves: parcelas e balões</option><option value="somente_parcelas">Pós-chaves: somente parcelas</option><option value="somente_baloes">Pós-chaves: somente balões</option></select>
                {financingAtKeys ? <span style={{fontSize:12,color:"#d4d4d8"}}>O saldo restante será quitado ou financiado nas chaves: <strong>{money(financingTotal)}</strong>.</span> : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(150px,1fr))",gap:9}}>
                  {(postMode === "parcelas_e_baloes" || postMode === "somente_parcelas") && <><MoneyScenario label="Parcela pós-chaves" value={postMonthly} setValue={changePostMonthly} max={Math.max(20000,(commercial?.finalPrice || 500000)*0.08)} locked={lockedPostMonthly} onToggleLock={() => setLockedPostMonthly((value) => !value)} /><CountScenario label="Quantidade de parcelas pós" value={postMonths} setValue={changePostMonths} /></>}
                  {(postMode === "parcelas_e_baloes" || postMode === "somente_baloes") && <><MoneyScenario label="Balão pós-chaves" value={postBalloon} setValue={changePostBalloon} max={commercial?.finalPrice || 500000} locked={lockedPostBalloon} onToggleLock={() => setLockedPostBalloon((value) => !value)} /><CountScenario label="Quantidade de balões pós" value={postBalloonCount} setValue={changePostBalloonCount} max={120} /></>}
                </div>}
              </section>
              <div style={{display:"grid",gap:5,marginTop:13,padding:12,border:`1px solid ${acceptance.color}`,borderRadius:9,background:"#17140e",color:"#d4d4d8",fontSize:12}}><strong style={{color:acceptance.color}}>Aderência: {acceptance.label}</strong><span>{acceptance.detail}</span><span>Meta até as chaves: {targets.prePct}% ({money(targets.preTarget)}) · meta pós-chaves: {targets.postPct}% ({money(targets.postTarget)}).</span><span>Até as chaves: {money(preTotal)} · {financingAtKeys ? `financiamento nas chaves: ${money(financingTotal)}` : `pós-chaves: ${money(postTotal)}`} · saldo: <strong style={{color:acceptance.color}}>{money(flowDifference)}</strong></span><button type="button" onClick={redistributeFlow} style={{border:"1px solid #8f7138",borderRadius:7,padding:9,background:"#211a0f",color:"#edcf91",fontWeight:800,cursor:"pointer"}}>Redistribuir respeitando o fluxo e fechar o valor</button></div>
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
                Total do fluxo: <strong>{money(flowTotal)}</strong> de {money(commercial?.finalPrice)}. O especialista receberá: entrada {money(entry)}, parcela mensal{" "}
                {money(monthly)}
                {balloonCount
                  ? `, ${balloonCount} balão(ões) de ${money(balloon)}`
                  : ""}
                {postMonths ? `, pós-chaves ${postMonths}x de ${money(postMonthly)}` : ""}. A construtora valida condições e disponibilidade.
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
        {presentation && <PresentationSlides url={presentation.url} title={presentation.title} onClose={() => setPresentation(null)} />}
      </div>
    </main>
  );
}
