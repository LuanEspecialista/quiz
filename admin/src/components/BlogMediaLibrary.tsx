import { FolderPlus, ImagePlus, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export type LibraryImage = { url: string; alt: string; legenda?: string };
type Collection = { id: string; nome: string };
type MediaItem = { id: string; collection_id: string; url_publica: string; titulo: string; texto_alternativo: string; legenda: string | null };

export default function BlogMediaLibrary({ onUse }: { onUse: (image: LibraryImage) => void }) {
  const [open, setOpen] = useState(false);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [collectionId, setCollectionId] = useState("");
  const [newCollection, setNewCollection] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");

  const load = async () => {
    const [{ data: folders, error: foldersError }, { data: media, error: mediaError }] = await Promise.all([
      supabase.from("blog_media_collections").select("id,nome").order("nome"),
      supabase.from("blog_media_items").select("id,collection_id,url_publica,titulo,texto_alternativo,legenda").order("criado_em", { ascending: false }),
    ]);
    if (foldersError || mediaError) { setNotice("Biblioteca disponível somente para administradores."); return; }
    setCollections((folders || []) as Collection[]);
    setItems((media || []) as MediaItem[]);
  };
  useEffect(() => { if (open) void load(); }, [open]);

  const createCollection = async () => {
    const nome = newCollection.trim();
    if (!nome) return;
    setLoading(true);
    const { data, error } = await supabase.from("blog_media_collections").insert({ nome }).select("id,nome").single();
    setLoading(false);
    if (error) { setNotice(`Não foi possível criar a pasta: ${error.message}`); return; }
    setCollections((current) => [...current, data as Collection].sort((a, b) => a.nome.localeCompare(b.nome)));
    setCollectionId(data.id); setNewCollection(""); setNotice("Pasta criada.");
  };

  const upload = async (files: FileList | null) => {
    if (!collectionId || !files?.length) { setNotice("Escolha uma pasta antes de enviar imagens."); return; }
    const valid = Array.from(files).filter((file) => ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.type) && file.size <= 10 * 1024 * 1024);
    if (!valid.length) { setNotice("Envie JPG, PNG, WebP ou AVIF de até 10 MB."); return; }
    setLoading(true); setNotice("Enviando imagens…");
    try {
      const created = await Promise.all(valid.map(async (file) => {
        const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `biblioteca/${collectionId}/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
        const { error } = await supabase.storage.from("blog-public").upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        const url = supabase.storage.from("blog-public").getPublicUrl(path).data.publicUrl;
        const { data, error: saveError } = await supabase.from("blog_media_items").insert({ collection_id: collectionId, storage_path: path, url_publica: url, titulo: file.name.replace(/\.[^.]+$/, ""), texto_alternativo: file.name.replace(/\.[^.]+$/, "") }).select("id,collection_id,url_publica,titulo,texto_alternativo,legenda").single();
        if (saveError) throw saveError;
        return data as MediaItem;
      }));
      setItems((current) => [...created, ...current]); setNotice(`${created.length} imagem(ns) adicionada(s).`);
    } catch (error: any) { setNotice(error?.message || "Não foi possível enviar as imagens."); }
    finally { setLoading(false); }
  };
  const visible = collectionId ? items.filter((item) => item.collection_id === collectionId) : items;

  return <details open={open} onToggle={(event) => setOpen((event.target as HTMLDetailsElement).open)} style={{ gridColumn: "1/-1", border: "1px solid #3b3425", borderRadius: 8, background: "#13120f", padding: "10px 12px" }}>
    <summary style={{ cursor: "pointer", color: "#e1b45c", fontWeight: 700 }}>Biblioteca de mídia <small style={{ color: "#a1a1aa", fontWeight: 400 }}>— pastas e imagens reutilizáveis</small></summary>
    <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        <select value={collectionId} onChange={(event) => setCollectionId(event.target.value)} style={{ minWidth: 190, background: "#101014", border: "1px solid #35353d", borderRadius: 7, color: "#f4f4f5", padding: "8px" }}><option value="">Todas as pastas</option>{collections.map((folder) => <option key={folder.id} value={folder.id}>{folder.nome}</option>)}</select>
        <input value={newCollection} onChange={(event) => setNewCollection(event.target.value)} placeholder="Nova pasta: Ex. Praias de Penha" style={{ flex: "1 1 220px", background: "#101014", border: "1px solid #35353d", borderRadius: 7, color: "#f4f4f5", padding: "8px" }}/>
        <button type="button" onClick={() => void createCollection()} disabled={loading || !newCollection.trim()} style={{ display: "inline-flex", gap: 5, alignItems: "center" }}><FolderPlus size={14}/>Criar pasta</button>
        <label style={{ display: "inline-flex", gap: 5, alignItems: "center", color: "#e1b45c", cursor: "pointer", border: "1px solid #695124", borderRadius: 6, padding: "8px 10px" }}><ImagePlus size={14}/>Enviar imagens<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" multiple hidden onChange={(event) => { void upload(event.target.files); event.currentTarget.value = ""; }}/></label>
      </div>
      {notice && <small style={{ color: "#d9c395" }}>{notice}</small>}
      {loading && <Loader2 size={16} style={{ animation: "spin 1s linear infinite", color: "#d7ab63" }}/>}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(110px,1fr))", gap: 8 }}>
        {visible.map((image) => <button key={image.id} type="button" onClick={() => onUse({ url: image.url_publica, alt: image.texto_alternativo || image.titulo, legenda: image.legenda || "" })} style={{ padding: 0, overflow: "hidden", textAlign: "left", background: "#111", color: "#eee", border: "1px solid #554526", borderRadius: 6, cursor: "pointer" }}><img src={image.url_publica} alt="" style={{ width: "100%", height: 76, objectFit: "cover", display: "block" }}/><small style={{ display: "block", padding: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{image.titulo}</small></button>)}
      </div>
    </div>
  </details>;
}

