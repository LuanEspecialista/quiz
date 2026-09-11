import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, CheckCircle2, ClipboardPaste, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { newEditorialSection, parseEditorialPackage, sectionLabels, type EditorialSection, type EditorialSectionType, type ParsedEditorialPackage, type StructuredEditorialBlocks } from "../lib/blogEditorial";

type ComposerImage = { url: string; alt: string; legenda?: string };
type EditablePost = {
  [key: string]: unknown;
  titulo: string; slug: string; resumo: string | null; categoria: string; layout: string;
  cidade: string | null; seo_titulo: string | null; seo_descricao: string | null;
  palavras_chave: string[]; conteudo: string | null; imagens: ComposerImage[];
  blocos: StructuredEditorialBlocks;
};
type Props = { editing: EditablePost; setEditing: (value: EditablePost) => void; field: React.CSSProperties; setMessage: (value: string) => void };

export default function BlogComposer({ editing, setEditing, field, setMessage }: Props) {
  const [packageText, setPackageText] = useState("");
  const [candidate, setCandidate] = useState<ParsedEditorialPackage | null>(null);
  const sections = editing.blocos?.secoes || [];
  const sources = editing.blocos?.fontes || [];
  const updateBlocks = (patch: Partial<StructuredEditorialBlocks>) => setEditing({ ...editing, blocos: { ...(editing.blocos || {}), versao: 2, ...patch } });
  const updateSection = (index: number, patch: Partial<EditorialSection>) => updateBlocks({ secoes: sections.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item) });
  const move = (index: number, direction: -1 | 1) => { const next = [...sections]; const target = index + direction; if (target < 0 || target >= next.length) return; [next[index], next[target]] = [next[target], next[index]]; updateBlocks({ secoes: next }); };
  const validatePackage = () => {
    try {
      const parsed = parseEditorialPackage(packageText);
      if (!parsed.blocos.secoes?.length) throw new Error("O pacote não contém blocos editoriais para visualizar.");
      setCandidate(parsed);
      setMessage(parsed.repaired ? "JSON corrigido automaticamente. Confira a prévia antes de aplicar." : "JSON válido. Confira a prévia antes de aplicar.");
    } catch (error) { setCandidate(null); setMessage(error instanceof Error ? `JSON inválido: ${error.message}` : "Não foi possível validar o pacote."); }
  };
  const applyPackage = () => {
    if (!candidate) return;
    const { source, blocos } = candidate;
      const allowedLayouts = ["artigo", "guia", "mercado", "comparativo", "case", "imovel"];
      setEditing({ ...editing, titulo: String(source.titulo || editing.titulo || ""), slug: String(source.slug || editing.slug || ""), resumo: String(source.resumo || editing.resumo || ""), categoria: String(source.categoria || editing.categoria), layout: allowedLayouts.includes(String(source.layout)) ? String(source.layout) : editing.layout, cidade: String(source.cidade || editing.cidade || ""), seo_titulo: String(source.seo_titulo || editing.seo_titulo || ""), seo_descricao: String(source.seo_descricao || editing.seo_descricao || ""), palavras_chave: Array.isArray(source.palavras_chave) ? source.palavras_chave.map(String) : editing.palavras_chave, conteudo: "", blocos: { ...(editing.blocos || {}), ...blocos } });
      setPackageText("");
      setCandidate(null);
      setMessage("Conteúdo aplicado ao editor. Agora escolha as imagens e só depois salve ou publique.");
  };
  return <section style={{ gridColumn: "1/-1", display: "grid", gap: 12, padding: 13, border: "1px solid #4c4028", borderRadius: 9, background: "#12110f" }}>
    <div><strong style={{ color: "#d7ab63" }}>Compositor editorial</strong><small style={{ display: "block", color: "#a1a1aa", marginTop: 4 }}>1. Cole e valide o JSON · 2. Confira a prévia · 3. Aplique e escolha as imagens · 4. Salve ou publique.</small></div>
    {!candidate && <><textarea value={packageText} onChange={(event) => { setPackageText(event.target.value); setCandidate(null); }} rows={7} placeholder="Cole aqui o pacote JSON entregue pela IA" style={field} />
    <button type="button" disabled={!packageText.trim()} onClick={validatePackage} style={{ justifySelf: "start", display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 11px", border: "1px solid #795d2d", borderRadius: 7, background: "#d6a94f", color: "#15100a", fontWeight: 800, cursor: "pointer", opacity: packageText.trim() ? 1 : .45 }}><ClipboardPaste size={15}/>Validar e pré-visualizar</button></>}
    {candidate && <div style={{ display: "grid", gap: 12 }}>
      <div style={{ display: "flex", gap: 7, alignItems: "center", color: "#72d6a0", fontSize: 12 }}><CheckCircle2 size={16}/>{candidate.repaired ? "JSON reparado e pronto para revisão" : "JSON validado e pronto para revisão"}</div>
      <article style={{ border: "1px solid #3d3424", borderRadius: 10, overflow: "hidden", background: "#f7f3eb", color: "#25221d" }}>
        <header style={{ padding: "clamp(22px,5vw,48px)", background: "linear-gradient(135deg,#16130e,#45351d)", color: "#fff" }}><small style={{ color: "#dfbd73", textTransform: "uppercase", letterSpacing: ".09em" }}>{String(candidate.source.categoria || "Artigo")}</small><h2 style={{ margin: "9px 0", fontSize: "clamp(24px,5vw,42px)", lineHeight: 1.08 }}>{String(candidate.source.titulo || "Título do artigo")}</h2><p style={{ maxWidth: 680, color: "#ddd2bc", lineHeight: 1.65 }}>{String(candidate.source.resumo || "")}</p></header>
        <div style={{ maxWidth: 720, margin: "0 auto", padding: "clamp(18px,5vw,42px)", display: "grid", gap: 22 }}>{candidate.blocos.secoes?.map((section, index) => <section key={section.id} style={section.tipo === "destaque" || section.tipo === "dado" ? { padding: 18, borderLeft: "4px solid #b48636", background: "#eee4d1" } : undefined}>
          {section.tipo === "imagem" || section.tipo === "galeria" ? <div style={{ minHeight: 150, border: "1px dashed #a99c87", borderRadius: 8, background: "#e9e3d8", display: "grid", placeItems: "center", padding: 18, textAlign: "center", color: "#776b59" }}><span><ImageIcon size={25}/><br/>{section.sugestao_imagem || "Imagem a selecionar na próxima etapa"}</span></div> : <><small style={{ color: "#9a762f", fontWeight: 800 }}>BLOCO {index + 1}</small>{section.titulo && <h3 style={{ fontSize: 23, margin: "5px 0 9px" }}>{section.titulo}</h3>}{section.texto && <p style={{ whiteSpace: "pre-line", lineHeight: 1.75, margin: 0 }}>{section.texto}</p>}{section.itens?.length ? <ul style={{ lineHeight: 1.7 }}>{section.itens.map((item, itemIndex) => <li key={itemIndex}>{item}</li>)}</ul> : null}</>}
        </section>)}{candidate.blocos.cta && <div style={{ padding: 19, borderRadius: 8, background: "#1d1912", color: "#f5e7c9", textAlign: "center", fontWeight: 700 }}>{candidate.blocos.cta}</div>}</div>
      </article>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}><button type="button" onClick={() => setCandidate(null)} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><ArrowLeft size={14}/>Corrigir JSON</button><button type="button" onClick={applyPackage} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 11px", border: 0, borderRadius: 7, background: "#d6a94f", color: "#15100a", fontWeight: 800 }}><ArrowRight size={14}/>Aplicar ao editor e escolher imagens</button></div>
    </div>}
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 8, borderTop: "1px solid #302a20" }}>{(Object.keys(sectionLabels) as EditorialSectionType[]).map((type) => <button key={type} type="button" onClick={() => updateBlocks({ secoes: [...sections, newEditorialSection(type)] })} style={{ padding: "7px 9px", border: "1px solid #454049", borderRadius: 6, background: "#19191c", color: "#ddd", cursor: "pointer", fontSize: 11 }}><Plus size={12}/> {sectionLabels[type]}</button>)}</div>
    {!sections.length && <div style={{ padding: 18, textAlign: "center", color: "#85858f", border: "1px dashed #3d3d43", borderRadius: 8 }}>Nenhum bloco estruturado. Importe o JSON ou adicione somente os blocos necessários.</div>}
    {sections.map((section, index) => <article key={section.id} style={{ padding: 11, border: "1px solid #383840", borderRadius: 8, background: "#151518", display: "grid", gap: 8 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}><strong style={{ fontSize: 12, color: "#e6c47c" }}>{index + 1}. {sectionLabels[section.tipo]}</strong><span><button type="button" aria-label="Mover para cima" onClick={() => move(index, -1)} disabled={!index}><ArrowUp size={14}/></button><button type="button" aria-label="Mover para baixo" onClick={() => move(index, 1)} disabled={index === sections.length - 1}><ArrowDown size={14}/></button><button type="button" aria-label="Remover bloco" onClick={() => updateBlocks({ secoes: sections.filter((_, itemIndex) => itemIndex !== index) })}><Trash2 size={14}/></button></span></header>
      {!(["destaque", "imagem", "galeria"] as EditorialSectionType[]).includes(section.tipo) && <input value={section.titulo || ""} onChange={(event) => updateSection(index, { titulo: event.target.value })} placeholder="Título do bloco (opcional)" style={field}/>}
      {!["imagem", "galeria", "lista", "comparativo", "subtitulo"].includes(section.tipo) && <textarea value={section.texto || ""} onChange={(event) => updateSection(index, { texto: event.target.value })} rows={section.tipo === "texto" ? 5 : 2} placeholder={section.tipo === "dado" ? "Número, contexto e significado" : "Texto curto e objetivo"} style={field}/>}
      {(section.tipo === "lista" || section.tipo === "comparativo") && <textarea value={(section.itens || []).join("\n")} onChange={(event) => updateSection(index, { itens: event.target.value.split("\n") })} rows={4} placeholder="Um item por linha" style={field}/>}
      {(section.tipo === "imagem" || section.tipo === "galeria") && <><input value={section.sugestao_imagem || ""} onChange={(event) => updateSection(index, { sugestao_imagem: event.target.value })} placeholder="Orientação e termos para localizar a imagem" style={field}/>{section.tipo === "imagem" && <><select value={section.imagem_url || ""} onChange={(event) => { const image = editing.imagens.find((item) => item.url === event.target.value); updateSection(index, { imagem_url: event.target.value, imagem_alt: image?.alt || section.imagem_alt || "", legenda: image?.legenda || section.legenda || "" }); }} style={field}><option value="">Selecionar imagem enviada</option>{editing.imagens.map((image) => <option key={image.url} value={image.url}>{image.alt || "Imagem sem descrição"}</option>)}</select><input value={section.legenda || ""} onChange={(event) => updateSection(index, { legenda: event.target.value })} placeholder="Legenda opcional" style={field}/></>}{section.tipo === "galeria" && <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{editing.imagens.map((image) => { const selected = (section.imagens || []).some((item) => item.url === image.url); return <label key={image.url} style={{ display: "flex", alignItems: "center", gap: 6, padding: 7, border: `1px solid ${selected ? "#8b692b" : "#393940"}`, borderRadius: 6, fontSize: 11 }}><input type="checkbox" checked={selected} onChange={(event) => updateSection(index, { imagens: event.target.checked ? [...(section.imagens || []), image] : (section.imagens || []).filter((item) => item.url !== image.url) })}/>{image.alt || "Imagem sem descrição"}</label> })}</div>}</>}
    </article>)}
    <div style={{ display: "grid", gap: 8, paddingTop: 9, borderTop: "1px solid #302a20" }}><strong style={{ fontSize: 12 }}>Fontes e referências</strong>{sources.map((source, index) => <div key={`${source.titulo}-${index}`} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 7 }}><input value={source.titulo} onChange={(event) => updateBlocks({ fontes: sources.map((item, itemIndex) => itemIndex === index ? { ...item, titulo: event.target.value } : item) })} placeholder="Título / órgão" style={field}/><input value={source.url || ""} onChange={(event) => updateBlocks({ fontes: sources.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item) })} placeholder="Link oficial" style={field}/><button type="button" onClick={() => updateBlocks({ fontes: sources.filter((_, itemIndex) => itemIndex !== index) })} style={{ justifySelf: "start" }}><Trash2 size={14}/> Remover fonte</button></div>)}<button type="button" onClick={() => updateBlocks({ fontes: [...sources, { titulo: "", url: "", veiculo: "", data: "" }] })} style={{ justifySelf: "start" }}><Plus size={13}/> Adicionar fonte</button></div>
    <label>Próximo passo / CTA<textarea value={editing.blocos?.cta || ""} onChange={(event) => updateBlocks({ cta: event.target.value })} rows={2} placeholder="Convite consultivo ligado ao assunto" style={field}/></label>
  </section>;
}
