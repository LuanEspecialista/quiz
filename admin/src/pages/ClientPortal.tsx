import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Building2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Pause,
  Play,
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

function curationPositioning(item: Opportunity) {
  const name = String(item.nome || "").toLowerCase();
  if (name.includes("azure"))
    return "Um endereço na Praia da Armação para viver o litoral com estrutura, bem-estar e uma leitura patrimonial cuidadosa.";
  if (name.includes("trianon"))
    return "Arquitetura clássica, vista mar definitiva e uma experiência de permanência a 100 metros do mar.";
  if (name.includes("viverde"))
    return "Um clube residencial completo para aproveitar o litoral com a família e avaliar uma exploração flexível.";
  if (name.includes("verde mar"))
    return "Uma base nova e completa em Penha para unir praticidade, lazer e uma possível estratégia de locação.";
  if (name.includes("praia alegre"))
    return "Mais espaço e privacidade a poucos passos da praia, com perfil para uso próprio e hospedagens especiais.";
  if (name.includes("niki lauda"))
    return "Um apartamento mobiliado, amplo e próximo do mar para começar a aproveitar sem esperar uma nova estrutura.";
  return "Uma oportunidade selecionada para você avaliar com calma, de acordo com o seu momento e objetivo.";
}

function curationPrompt(item: Opportunity) {
  const name = String(item.nome || "").toLowerCase();
  if (name.includes("azure")) return "mar, bem-estar e uso flexível entre viver e investir";
  if (name.includes("trianon")) return "vista, presença arquitetônica e qualidade de permanência";
  if (name.includes("viverde")) return "estrutura de lazer e experiência de clube";
  if (name.includes("verde mar")) return "praticidade, lazer e localização em Penha";
  if (name.includes("praia alegre")) return "proximidade da praia, espaço e privacidade";
  if (name.includes("niki lauda")) return "apartamento mobiliado e proximidade do mar";
  return "o que mais chamou a sua atenção";
}
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
const R2_MEDIA_PREFIX = "r2://";
const R2_MEDIA_BASE = "https://media.luan-especialista.pro/";

function r2MediaUrl(path?: string | null) {
  return path?.startsWith(R2_MEDIA_PREFIX)
    ? `${R2_MEDIA_BASE}${path.slice(R2_MEDIA_PREFIX.length)}`
    : undefined;
}

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

function textItems(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item === "string") return [item];
    if (item && typeof item === "object") {
      const record = item as Record<string, unknown>;
      return [String(record.titulo || record.nome || record.label || "")].filter(Boolean);
    }
    return [];
  });
}

function OpportunityLanding({
  item,
  onProposal,
}: {
  item: Opportunity;
  onProposal: (item: Opportunity) => void;
}) {
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  const [brokenMediaIds, setBrokenMediaIds] = useState<string[]>([]);
  const [heroBroken, setHeroBroken] = useState(false);
  const blocks = (item.caracteristicas?.landing_blocos || []) as LandingBlock[];
  const images = (item.imagens || []).filter((media) => media.url && !brokenMediaIds.includes(media.id));
  const plants = (item.plantas || []).filter((media) => media.url);
  const gallery = images.filter((media) => !media.titulo?.toLowerCase().includes("capa"));
  const heroImage = images[0]?.url;
  const currentImage = gallery[galleryIndex % Math.max(gallery.length, 1)]?.url || heroImage;
  const currentMedia = gallery[galleryIndex % Math.max(gallery.length, 1)];
  const markBroken = (id?: string) => { if (id) setBrokenMediaIds((current) => current.includes(id) ? current : [...current, id]); };
  useEffect(() => {
    if (!autoplay || gallery.length < 2) return;
    const timer = window.setInterval(() => setGalleryIndex((current) => (current + 1) % gallery.length), 6000);
    return () => window.clearInterval(timer);
  }, [autoplay, gallery.length]);
  const story = blocks.length ? blocks : [{ tipo: "texto" as const, titulo: item.nome, texto: item.descricao }];
  const heroBlock = story.find((block) => block.tipo === "hero");
  const amenities = textItems(item.lazer);
  const differentiators = textItems(item.diferenciais);
  const azure = String(item.nome || "").toLowerCase().includes("azure");
  const facts = [
    item.preco != null ? `A partir de ${money(item.preco)}` : null,
    item.area_minima != null ? `${item.area_minima}${item.area_maxima && item.area_maxima !== item.area_minima ? `–${item.area_maxima}` : ""} m²` : null,
    [item.bairro, item.cidade].filter(Boolean).join(" · ") || null,
  ].filter(Boolean) as string[];

  return (
    <article style={{ background: "#0c0c0f", border: "1px solid #3a3021", borderRadius: 18, overflow: "hidden", boxShadow: "0 24px 80px #0008" }}>
      <section style={{ minHeight: "min(680px,76vh)", position: "relative", display: "grid", alignItems: "end", background: "linear-gradient(135deg,#1a160e,#0d0d10)" }}>
        {heroImage && !heroBroken && <img src={heroImage} alt="" onError={() => setHeroBroken(true)} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:.72}}/>}
        <div style={{position:"absolute",inset:0,background:"linear-gradient(0deg,#09090b 2%,#09090b66 52%,#09090b2b 100%)"}} />
        <div style={{ padding: "clamp(28px,6vw,78px)", maxWidth: 850, position:"relative", zIndex:1 }}>
          <small style={{ color: "#e4bb70", fontWeight: 800, letterSpacing: ".16em", textTransform: "uppercase" }}>
            {[item.bairro, item.cidade].filter(Boolean).join(" · ")}
          </small>
          <h2 style={{ fontSize: "clamp(42px,8vw,88px)", lineHeight: .94, margin: "14px 0 18px", maxWidth: 800 }}>
            {azure ? "Quando o azul vira destino." : heroBlock?.titulo || item.nome}
          </h2>
          <p style={{ fontSize: "clamp(17px,2vw,22px)", lineHeight: 1.55, color: "#eee", maxWidth: 720, margin: 0 }}>
            {azure ? "Um endereço na Praia da Armação para transformar a proximidade do mar em parte da sua vida — com estrutura para morar, veranear e avaliar como patrimônio." : heroBlock?.texto || item.descricao}
          </p>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap", marginTop: 24 }}>
            {facts.map((fact) => <span key={fact} style={{ padding: "9px 13px", border: "1px solid #d7ab6380", background: "#0b0b0dcc", borderRadius: 999, color: "#f5dca5", fontSize: 13 }}>{fact}</span>)}
          </div>
        </div>
      </section>

      <section style={{ padding: "clamp(24px,5vw,58px)", display: "grid", gap: 22 }}>
        {story.map((block, index) => block.tipo !== "hero" && block.tipo !== "galeria" && block.tipo !== "plantas" ? (
          <div key={index} style={{ maxWidth: 820, padding: index === 0 ? 0 : "22px 0", borderTop: index === 0 ? 0 : "1px solid #2c261d" }}>
            <small style={{ color: "#d7ab63", fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase" }}>{index === 0 ? "A leitura deste imóvel" : block.tipo || "Oportunidade"}</small>
            <h3 style={{ fontSize: "clamp(25px,4vw,42px)", lineHeight: 1.05, margin: "9px 0 12px" }}>{block.titulo || item.nome}</h3>
            {block.texto && <p style={{ color: "#c9c9ce", lineHeight: 1.8, fontSize: 16, margin: 0 }}>{block.texto}</p>}
          </div>
        ) : null)}

        {gallery.length > 0 && <section style={{ paddingTop: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12, marginBottom: 12 }}>
            <div><small style={{ color: "#d7ab63", fontWeight: 800, letterSpacing: ".12em" }}>A EXPERIÊNCIA</small><h3 style={{ margin: "7px 0 0", fontSize: "clamp(24px,4vw,38px)" }}>Veja o que existe por trás do endereço.</h3></div>
            <span style={{ color: "#92929b", fontSize: 13 }}>{(galleryIndex % gallery.length) + 1} / {gallery.length}</span>
          </div>
          <div style={{ position: "relative", borderRadius: 14, overflow: "hidden", background: "#050505" }}>
            {currentImage && <img src={currentImage} alt={currentMedia?.titulo || item.nome} onError={() => markBroken(currentMedia?.id)} style={{ width: "100%", height: "min(58vw,520px)", minHeight: 260, objectFit: "cover", display: "block" }} />}
            <div style={{ position: "absolute", inset: "auto 14px 14px", display: "flex", justifyContent: "space-between", alignItems: "end", gap: 12 }}>
              <div style={{padding:"10px 13px",borderRadius:10,background:"#050505c9",backdropFilter:"blur(8px)",maxWidth:"62%"}}><strong style={{display:"block",fontSize:14}}>{currentMedia?.titulo || "Experiência do empreendimento"}</strong><small style={{color:"#d7ab63"}}>{currentMedia?.categoria || "Curadoria visual"}</small></div>
              <div style={{display:"flex",gap:7}}><button type="button" aria-label="Imagem anterior" onClick={() => setGalleryIndex((galleryIndex - 1 + gallery.length) % gallery.length)} style={{border:"1px solid #fff6",background:"#000b",color:"#fff",borderRadius:999,width:40,height:40,display:"grid",placeItems:"center",cursor:"pointer"}}><ChevronLeft size={18}/></button><button type="button" aria-label={autoplay ? "Pausar apresentação" : "Reproduzir apresentação"} onClick={() => setAutoplay((current) => !current)} style={{border:"1px solid #d7ab63",background:"#d7ab63",color:"#09090b",borderRadius:999,width:40,height:40,display:"grid",placeItems:"center",cursor:"pointer"}}>{autoplay ? <Pause size={16}/> : <Play size={16}/>}</button><button type="button" aria-label="Próxima imagem" onClick={() => setGalleryIndex((galleryIndex + 1) % gallery.length)} style={{border:"1px solid #fff6",background:"#000b",color:"#fff",borderRadius:999,width:40,height:40,display:"grid",placeItems:"center",cursor:"pointer"}}><ChevronRight size={18}/></button></div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingTop: 10 }}>
            {gallery.map((image, index) => <button type="button" key={image.id} onClick={() => { setGalleryIndex(index); setAutoplay(false); }} style={{ border: index === galleryIndex % gallery.length ? "2px solid #d7ab63" : "1px solid #333", background: "none", padding: 0, borderRadius: 8, overflow: "hidden", flex: "0 0 110px", cursor: "pointer", textAlign:"left" }}><img src={image.url} alt={image.titulo || ""} onError={() => markBroken(image.id)} style={{ width: 110, height: 68, objectFit: "cover", display: "block" }} /><small style={{display:"block",padding:"5px 6px",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",color:"#c9c9ce",fontSize:10}}>{image.titulo || "Imagem"}</small></button>)}
          </div>
        </section>}

        {(amenities.length > 0 || differentiators.length > 0) && <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))", gap: 28, paddingTop: 20 }}>
          {amenities.length > 0 && <div><small style={{ color: "#d7ab63", fontWeight: 800, letterSpacing: ".12em" }}>MOMENTOS POSSÍVEIS</small><h3 style={{ margin: "8px 0 15px", fontSize: 28 }}>Uma estrutura que acompanha diferentes momentos.</h3><div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{amenities.map((value) => <span key={value} style={{ padding: "9px 11px", borderRadius: 8, background: "#171513", border: "1px solid #403522", color: "#ded5c5", fontSize: 13 }}>{value}</span>)}</div></div>}
          {differentiators.length > 0 && <div><small style={{ color: "#d7ab63", fontWeight: 800, letterSpacing: ".12em" }}>DETALHES QUE DECIDEM</small><h3 style={{ margin: "8px 0 15px", fontSize: 28 }}>Conforto pensado para o uso real.</h3><ul style={{ margin: 0, paddingLeft: 18, color: "#c9c9ce", lineHeight: 1.9 }}>{differentiators.map((value) => <li key={value}>{value}</li>)}</ul></div>}
        </section>}

        {plants.length > 0 && <section style={{ paddingTop: 20, borderTop: "1px solid #2c261d" }}><small style={{ color: "#d7ab63", fontWeight: 800, letterSpacing: ".12em" }}>A PLANTA PRECISA COMBINAR COM A SUA VIDA</small><h3 style={{ margin: "8px 0 16px", fontSize: 30 }}>Escolha o formato que faz sentido para você.</h3><div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(190px,1fr))", gap: 10 }}>{plants.map((plant) => <figure key={plant.id} style={{ margin: 0, background: "#141416", borderRadius: 10, overflow: "hidden" }}><img src={plant.url} alt={plant.titulo || "Planta"} onError={(event) => { event.currentTarget.style.display = "none"; }} style={{ width: "100%", height: 210, objectFit: "contain", background: "#fff", display: "block" }} /><figcaption style={{ padding: 10, color: "#bdbdc4", fontSize: 12 }}>{plant.titulo || "Planta do empreendimento"}</figcaption></figure>)}</div></section>}

        <section style={{ marginTop: 12, padding: "24px", borderRadius: 13, background: "linear-gradient(135deg,#1d180f,#131313)", border: "1px solid #5b4728", display: "grid", gap: 13 }}>
          <small style={{ color: "#e4bb70", fontWeight: 800, letterSpacing: ".12em" }}>A DECISÃO É SUA — A LEITURA É NOSSA</small>
          <h3 style={{ margin: 0, fontSize: "clamp(24px,4vw,38px)" }}>{azure ? "O Azure combina com a forma como você quer viver o litoral?" : "Este imóvel combina com o momento que você está vivendo?"}</h3>
          <p style={{ color: "#c9c9ce", lineHeight: 1.65, margin: 0 }}>O próximo passo não precisa ser uma decisão apressada. Fale comigo sobre uso próprio, locação, prazo e condições para entender o cenário com clareza.</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}><button type="button" onClick={() => onProposal(item)} style={{ border: 0, background: "#d7ab63", color: "#09090b", borderRadius: 8, padding: "13px 17px", fontWeight: 800, cursor: "pointer" }}>Quero conversar sobre este imóvel</button><a href="https://wa.me/5547992120915" target="_blank" rel="noreferrer" style={{ border: "1px solid #80683c", color: "#f0d59c", textDecoration: "none", borderRadius: 8, padding: "12px 16px", fontWeight: 700 }}>Falar no WhatsApp</a></div>
        </section>
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
  const [accountOpen, setAccountOpen] = useState(false);
  const [entry, setEntry] = useState(0);
  const [monthly, setMonthly] = useState(2500);
  const [balloon, setBalloon] = useState(0);
  const [balloonCount, setBalloonCount] = useState(0);
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState("");
  const [curationMessage, setCurationMessage] = useState("");
  const [curationSent, setCurationSent] = useState("");

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
              const r2Url = r2MediaUrl(media.storage_path);
              if (r2Url) return { ...media, url: r2Url };
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
            let coverUrl = r2MediaUrl(item.imagem_url) || (
              item.imagem_url && !item.imagem_url.startsWith(COVER_STORAGE_PREFIX) && !item.imagem_url.startsWith(R2_MEDIA_PREFIX)
                ? item.imagem_url
                : undefined
            );
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
  const openProposal = (item: Opportunity) => {
    setProposal(item);
    setEntry(Math.round((Number(item.preco) || 0) * 0.1));
    setMonthly(2500);
    setBalloon(0);
    setBalloonCount(0);
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
      p_mensagem: note || null,
    });
    setSending(false);
    setSent(
      rpcError
        ? "Não foi possível enviar agora. Revise os valores ou fale com seu especialista."
        : "Interesse registrado. Seu especialista receberá este cenário para análise com a construtora.",
    );
  };
  const sendCurationMessage = () => {
    const text = curationMessage.trim();
    if (!text) {
      setCurationSent("Escreva uma preferência para eu entender melhor a sua busca.");
      return;
    }
    const context = firstName ? `Cliente: ${firstName}. ` : "";
    const message = `${context}Estou analisando a curadoria de imóveis do litoral. O que procuro é: ${text}`;
    window.open(`https://wa.me/5547992120915?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
    setCurationSent("Mensagem preparada no WhatsApp. A conversa continua por lá.");
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
            <a href="/" style={{ display: "inline-flex", alignItems: "center", gap: 12, color: "#fff", textDecoration: "none" }}>
              <img src="/imagens/logo.png" alt="Luan Especialista" style={{ width: 48, height: 48, objectFit: "contain" }} />
              <span>
                <strong style={{ display: "block", color: "#f5f5f5", fontSize: 15, letterSpacing: ".08em" }}>LUAN <span style={{ color: "#d7ab63" }}>ESPECIALISTA</span></strong>
                <small style={{ display: "block", marginTop: 4, color: "#a1a1aa", fontSize: 9, letterSpacing: ".18em" }}>ESTRATÉGIAS PATRIMONIAIS</small>
              </span>
            </a>
            <h1
              style={{ fontSize: "clamp(28px,5vw,48px)", margin: "10px 0 8px" }}
            >
              Bem-vindo{firstName ? `, ${firstName}` : ""}.
            </h1>
            <p style={{ color: "#a1a1aa", margin: 0 }}>
              {opportunities.length
                ? `Selecionei ${opportunities.length} oportunidade${opportunities.length === 1 ? "" : "s"} para você conhecer com calma.`
                : "Uma curadoria pessoal de oportunidades selecionadas para você."}
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
              const cover = item.imagens?.[0]?.url;
              return (
                <button
                  key={item.id}
                  onClick={() => {
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
                    <p
                      style={{
                        color: "#d4d4d8",
                        fontSize: 13,
                        lineHeight: 1.55,
                        margin: "2px 0 0",
                      }}
                    >
                      {curationPositioning(item)}
                    </p>
                    <small style={{ color: "#8f8f98", lineHeight: 1.45 }}>
                      Destaque: {curationPrompt(item)}.
                    </small>
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
        {!activeOpportunity && opportunities.length > 0 && (
          <section
            style={{
              marginTop: 24,
              padding: "clamp(20px,4vw,30px)",
              border: "1px solid #332d22",
              borderRadius: 13,
              background: "linear-gradient(135deg,#17130d,#101012)",
              display: "grid",
              gap: 10,
            }}
          >
            <small style={{ color: "#d7ab63", fontWeight: 800, letterSpacing: ".08em" }}>
              A CURADORIA COMEÇA COM VOCÊ
            </small>
            <h2 style={{ margin: 0, fontSize: "clamp(21px,3vw,30px)" }}>
              O que precisa fazer sentido para a sua decisão?
            </h2>
            <p style={{ margin: 0, color: "#b4b4bb", lineHeight: 1.65, maxWidth: 760 }}>
              Estas são algumas possibilidades selecionadas para você. Se a sua busca tiver outro caminho, descreva o que é importante — localização, espaço, uso, prazo ou estilo — e eu ajusto a conversa ao que realmente procura.
            </p>
            <textarea
              value={curationMessage}
              onChange={(event) => {
                setCurationMessage(event.target.value);
                setCurationSent("");
              }}
              rows={3}
              maxLength={1000}
              placeholder="Ex.: procuro um imóvel próximo da praia, para usar com a família e alugar em alguns períodos."
              style={{ ...input, resize: "vertical", marginTop: 4 }}
            />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <button
                type="button"
                onClick={sendCurationMessage}
                style={{
                  border: 0,
                  background: "#d7ab63",
                  color: "#09090b",
                  borderRadius: 8,
                  padding: "12px 16px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Enviar o que estou buscando
              </button>
              {curationSent && <span style={{ color: "#d4d4d8", fontSize: 13 }}>{curationSent}</span>}
            </div>
          </section>
        )}
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
            />
          </section>
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
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "180px 1fr",
                  gap: 13,
                  marginTop: 13,
                }}
              >
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
                . A construtora valida condições e disponibilidade.
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
        <footer
          style={{
            marginTop: 48,
            paddingTop: 22,
            borderTop: "1px solid #27272a",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
            color: "#71717a",
            fontSize: 12,
          }}
        >
          <span>LUAN ESPECIALISTA · ESTRATÉGIAS PATRIMONIAIS</span>
          <span>
            <a href="mailto:contato@luan-especialista.pro" style={{ color: "#a1a1aa", textDecoration: "none" }}>
              contato@luan-especialista.pro
            </a>{" "}·{" "}
            <a href="https://wa.me/5547992120915" target="_blank" rel="noreferrer" style={{ color: "#d7ab63", textDecoration: "none" }}>
              WhatsApp
            </a>
          </span>
        </footer>
      </div>
    </main>
  );
}
