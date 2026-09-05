import { useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  FilePlus2,
  Search,
  Send,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { supabase } from "../../lib/supabase";

type Status = "rascunho" | "revisao" | "publicado" | "arquivado";
type BlogImage = { url: string; alt: string; legenda?: string };
type EditorialBlocks = {
  destaque?: string;
  prova?: string;
  curiosidade?: string;
  cta?: string;
};
type Post = {
  id: string;
  titulo: string;
  slug: string;
  resumo: string | null;
  conteudo: string | null;
  categoria: string;
  layout: string;
  imagem_capa_url: string | null;
  imagens: BlogImage[];
  blocos: EditorialBlocks;
  cidade: string | null;
  empreendimento_id: string | null;
  seo_titulo: string | null;
  seo_descricao: string | null;
  palavras_chave: string[];
  status: Status;
  publicado_em: string | null;
  atualizado_em: string;
};

const layouts = [
  [
    "artigo",
    "Artigo de autoridade",
    "Texto, imagem de capa e leitura objetiva.",
  ],
  ["guia", "Guia prático", "Passo a passo para orientar uma decisão."],
  ["mercado", "Radar de mercado", "Dados, cenário, fonte e conclusão."],
  ["comparativo", "Comparativo", "Alternativas lado a lado com recomendação."],
  ["case", "Estudo de caso", "Estratégia, números e resultado real."],
  ["imovel", "Imóvel em foco", "Produto, perfil ideal e chamada para ação."],
] as const;

const field = {
  width: "100%",
  boxSizing: "border-box" as const,
  background: "#101014",
  border: "1px solid #35353d",
  borderRadius: 7,
  color: "#f4f4f5",
  padding: "10px 11px",
};
const statusLabel: Record<Status, string> = {
  rascunho: "Rascunho",
  revisao: "Em revisão",
  publicado: "Publicado",
  arquivado: "Arquivado",
};
const slugify = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
const empty = (): Omit<Post, "id" | "atualizado_em"> => ({
  titulo: "",
  slug: "",
  resumo: "",
  conteudo: "",
  categoria: "Mercado imobiliário",
  layout: "artigo",
  imagem_capa_url: "",
  imagens: [],
  blocos: {},
  cidade: "",
  empreendimento_id: null,
  seo_titulo: "",
  seo_descricao: "",
  palavras_chave: [],
  status: "rascunho",
  publicado_em: null,
});

export default function BlogModule() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<
    (Omit<Post, "id" | "atualizado_em"> & { id?: string }) | null
  >(null);
  const [message, setMessage] = useState("");
  const [empreendimentos, setEmpreendimentos] = useState<
    Array<{ id: string; nome: string; imagem_url: string | null }>
  >([]);
  const [libraryImages, setLibraryImages] = useState<
    Array<{
      id: string;
      url: string;
      titulo: string | null;
      categoria: string | null;
    }>
  >([]);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("blog_posts")
      .select(
        "id,titulo,slug,resumo,conteudo,categoria,layout,imagem_capa_url,imagens,blocos,cidade,empreendimento_id,seo_titulo,seo_descricao,palavras_chave,status,publicado_em,atualizado_em",
      )
      .order("atualizado_em", { ascending: false });
    setPosts(((data || []) as Post[]).map((post) => ({ ...post, blocos: post.blocos || {} })));
    setMessage(
      error
        ? "Não foi possível carregar o Blog. Aplique a migração editorial no Supabase."
        : "",
    );
    setLoading(false);
  };
  useEffect(() => {
    void load();
    void supabase
      .from("empreendimentos")
      .select("id,nome,imagem_url")
      .order("nome")
      .limit(500)
      .then(({ data }) =>
        setEmpreendimentos(
          (data || []) as Array<{
            id: string;
            nome: string;
            imagem_url: string | null;
          }>,
        ),
      );
  }, []);

  useEffect(() => {
    if (!editing?.empreendimento_id) {
      setLibraryImages([]);
      return;
    }
    const mainImage = empreendimentos.find(
      (item) => item.id === editing.empreendimento_id,
    )?.imagem_url;
    void supabase
      .from("empreendimento_imagens")
      .select("id,url,titulo,categoria")
      .eq("empreendimento_id", editing.empreendimento_id)
      .order("ordem")
      .then(({ data }) => {
        const images = (data || []) as Array<{
          id: string;
          url: string;
          titulo: string | null;
          categoria: string | null;
        }>;
        if (mainImage && !images.some((item) => item.url === mainImage))
          images.unshift({
            id: "capa",
            url: mainImage,
            titulo: "Capa do empreendimento",
            categoria: "capa",
          });
        setLibraryImages(images);
      });
  }, [editing?.empreendimento_id, empreendimentos]);

  const visible = useMemo(
    () =>
      posts.filter((post) =>
        `${post.titulo} ${post.categoria} ${post.status}`
          .toLocaleLowerCase()
          .includes(query.toLocaleLowerCase()),
      ),
    [posts, query],
  );
  const save = async () => {
    if (!editing) return;
    const titulo = editing.titulo.trim();
    const slug = slugify(editing.slug || titulo);
    if (!titulo || !slug) {
      setMessage("Informe pelo menos título e URL do artigo.");
      return;
    }
    const payload = {
      ...editing,
      id: undefined,
      titulo,
      slug,
      publicado_em:
        editing.status === "publicado"
          ? editing.publicado_em || new Date().toISOString()
          : null,
      atualizado_em: new Date().toISOString(),
    };
    const result = editing.id
      ? await supabase.from("blog_posts").update(payload).eq("id", editing.id)
      : await supabase.from("blog_posts").insert(payload);
    if (result.error) {
      setMessage(`Não foi possível salvar: ${result.error.message}`);
      return;
    }
    setEditing(null);
    setMessage("Artigo salvo.");
    void load();
  };

  const uploadImages = async (files: FileList | null) => {
    if (!editing || !files?.length) return;
    const accepted = Array.from(files).filter(
      (file) =>
        ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(
          file.type,
        ) && file.size <= 10 * 1024 * 1024,
    );
    if (!accepted.length) {
      setMessage("Envie JPG, PNG, WebP ou AVIF de até 10 MB.");
      return;
    }
    setMessage("Enviando imagem(ns)…");
    const uploads = await Promise.all(
      accepted.map(async (file) => {
        const safeName = file.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9._-]/g, "-");
        const path = `artigos/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
        const { error } = await supabase.storage
          .from("blog-public")
          .upload(path, file, { contentType: file.type, upsert: false });
        if (error) throw error;
        return {
          url: supabase.storage.from("blog-public").getPublicUrl(path).data
            .publicUrl,
          alt: editing.titulo || "Imagem do artigo",
          legenda: "",
        };
      }),
    );
    setEditing({
      ...editing,
      imagem_capa_url: editing.imagem_capa_url || uploads[0]?.url || "",
      imagens: [...(editing.imagens || []), ...uploads],
    });
    setMessage(
      `${uploads.length} imagem(ns) adicionada(s). Defina o texto alternativo para SEO.`,
    );
  };

  const reuseImage = async (image: { url: string; titulo: string | null }) => {
    if (!editing || editing.imagens.some((item) => item.url === image.url))
      return;
    try {
      setMessage("Preparando imagem pública otimizada…");
      let publicUrl = image.url;
      if (!image.url.includes("/storage/v1/object/public/blog-public/")) {
        const response = await fetch(image.url);
        if (!response.ok)
          throw new Error(
            "Não foi possível ler a imagem privada do empreendimento.",
          );
        const blob = await response.blob();
        const extension =
          (
            {
              "image/jpeg": "jpg",
              "image/png": "png",
              "image/webp": "webp",
              "image/avif": "avif",
            } as Record<string, string>
          )[blob.type] || "jpg";
        const path = `empreendimentos/${Date.now()}-${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("blog-public")
          .upload(path, blob, {
            contentType: blob.type || "image/webp",
            upsert: false,
          });
        if (uploadError) throw uploadError;
        publicUrl = supabase.storage.from("blog-public").getPublicUrl(path)
          .data.publicUrl;
      }
      setEditing((current) =>
        current
          ? {
              ...current,
              imagem_capa_url: current.imagem_capa_url || publicUrl,
              imagens: [
                ...current.imagens,
                {
                  url: publicUrl,
                  alt:
                    image.titulo ||
                    current.titulo ||
                    "Imagem do empreendimento",
                  legenda: "",
                },
              ],
            }
          : current,
      );
      setMessage(
        "Imagem preparada para o Blog. A cópia pública é criada somente porque a galeria do empreendimento permanece privada e segura.",
      );
    } catch (error: any) {
      setMessage(
        error?.message || "Não foi possível preparar a imagem para o Blog.",
      );
    }
  };

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 1320, margin: "0 auto" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <small
            style={{
              color: "#d7ab63",
              letterSpacing: ".1em",
              textTransform: "uppercase",
            }}
          >
            Conteúdo e autoridade
          </small>
          <h1 style={{ margin: "4px 0", fontSize: 25 }}>Blog</h1>
          <p style={{ margin: 0, color: "#a1a1aa" }}>
            Crie conteúdo útil, padronizado e pronto para publicar no site.
          </p>
        </div>
        <button
          onClick={() => setEditing(empty())}
          style={{
            background: "#d6a94f",
            color: "#15100a",
            border: 0,
            borderRadius: 7,
            padding: "10px 13px",
            fontWeight: 800,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <FilePlus2 size={16} />
          Novo artigo
        </button>
      </header>
      {message && (
        <div
          style={{
            border: "1px solid #865d23",
            color: "#f0c879",
            background: "#20170c",
            borderRadius: 7,
            padding: "10px 12px",
          }}
        >
          {message}
        </div>
      )}
      <section
        style={{
          background: "#111114",
          border: "1px solid #28282d",
          borderRadius: 10,
          padding: 14,
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(220px,1fr) auto",
            gap: 10,
            alignItems: "center",
          }}
        >
          <label style={{ position: "relative" }}>
            <Search
              size={16}
              style={{ position: "absolute", left: 10, top: 11, color: "#777" }}
            />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por título, categoria ou status"
              style={{ ...field, paddingLeft: 34 }}
            />
          </label>
          <span style={{ color: "#a1a1aa", fontSize: 13 }}>
            {posts.length} artigo(s)
          </span>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(185px,1fr))",
            gap: 9,
            marginTop: 13,
          }}
        >
          {layouts.map(([id, name, description]) => (
            <button
              key={id}
              onClick={() => setEditing({ ...empty(), layout: id })}
              style={{
                background: "#161619",
                border: "1px solid #303036",
                borderRadius: 8,
                color: "#f4f4f5",
                textAlign: "left",
                padding: 11,
                cursor: "pointer",
              }}
            >
              <strong style={{ fontSize: 13 }}>{name}</strong>
              <small
                style={{ color: "#9b9ba4", display: "block", marginTop: 4 }}
              >
                {description}
              </small>
            </button>
          ))}
        </div>
      </section>
      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
          gap: 12,
        }}
      >
        {loading && (
          <span style={{ color: "#a1a1aa" }}>
            Carregando biblioteca editorial…
          </span>
        )}
        {!loading && visible.length === 0 && (
          <div
            style={{
              gridColumn: "1/-1",
              padding: 32,
              textAlign: "center",
              background: "#111114",
              border: "1px solid #28282d",
              borderRadius: 9,
              color: "#a1a1aa",
            }}
          >
            <BookOpen size={22} style={{ marginBottom: 8 }} />
            <br />
            Nenhum artigo encontrado.
          </div>
        )}
        {visible.map((post) => (
          <article
            key={post.id}
            style={{
              background: "#111114",
              border: "1px solid #28282d",
              borderRadius: 9,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: 108,
                background: post.imagem_capa_url
                  ? `center / cover url(${post.imagem_capa_url})`
                  : "linear-gradient(135deg,#272015,#111116)",
              }}
            />
            <div style={{ padding: 13 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <small style={{ color: "#d7ab63" }}>{post.categoria}</small>
                <small
                  style={{
                    color: post.status === "publicado" ? "#34d399" : "#a1a1aa",
                  }}
                >
                  {statusLabel[post.status]}
                </small>
              </div>
              <h2 style={{ fontSize: 16, margin: "7px 0" }}>{post.titulo}</h2>
              <p
                style={{
                  color: "#a1a1aa",
                  fontSize: 13,
                  minHeight: 36,
                  margin: "0 0 12px",
                }}
              >
                {post.resumo || "Sem resumo."}
              </p>
              <button
                onClick={() => setEditing(post)}
                style={{
                  ...field,
                  cursor: "pointer",
                  padding: "8px 10px",
                  color: "#d7ab63",
                }}
              >
                Editar
              </button>
            </div>
          </article>
        ))}
      </section>
      {editing && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 3000,
            background: "rgba(0,0,0,.72)",
            padding: 18,
            overflowY: "auto",
          }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEditing(null);
          }}
        >
          <section
            style={{
              maxWidth: 860,
              margin: "20px auto",
              background: "#151518",
              border: "1px solid #4a4a52",
              borderRadius: 10,
              padding: 18,
            }}
          >
            <header
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h2 style={{ margin: 0 }}>Editor de artigo</h2>
                <small style={{ color: "#a1a1aa" }}>
                  Escolha um modelo e preencha somente o que faz sentido.
                </small>
              </div>
              <button
                onClick={() => setEditing(null)}
                style={{
                  background: "transparent",
                  border: 0,
                  color: "#bbb",
                  cursor: "pointer",
                }}
              >
                <X />
              </button>
            </header>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 11,
                marginTop: 17,
              }}
            >
              <label>
                Título
                <input
                  value={editing.titulo}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      titulo: event.target.value,
                      slug: editing.slug || slugify(event.target.value),
                    })
                  }
                  style={field}
                />
              </label>
              <label>
                URL do artigo
                <input
                  value={editing.slug}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      slug: slugify(event.target.value),
                    })
                  }
                  placeholder="ex.: como-escolher-imovel"
                  style={field}
                />
              </label>
              <label>
                Categoria
                <select
                  value={editing.categoria}
                  onChange={(event) =>
                    setEditing({ ...editing, categoria: event.target.value })
                  }
                  style={field}
                >
                  {[
                    "Mercado imobiliário",
                    "Cidades e bairros",
                    "Empreendimentos",
                    "Indicadores e economia",
                    "Investimentos",
                    "Turismo e estilo de vida",
                    "Notícias",
                    "Cases",
                  ].map((category) => (
                    <option key={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label>
                Modelo
                <select
                  value={editing.layout}
                  onChange={(event) =>
                    setEditing({ ...editing, layout: event.target.value })
                  }
                  style={field}
                >
                  {layouts.map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Cidade ou região
                <input
                  value={editing.cidade || ""}
                  onChange={(event) =>
                    setEditing({ ...editing, cidade: event.target.value })
                  }
                  placeholder="Ex.: Balneário Piçarras"
                  style={field}
                />
              </label>
              <label>
                Palavras-chave
                <input
                  value={(editing.palavras_chave || []).join(", ")}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      palavras_chave: event.target.value
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean),
                    })
                  }
                  placeholder="imóveis, litoral, investimento"
                  style={field}
                />
              </label>
              <label style={{ gridColumn: "1/-1" }}>
                Vincular a empreendimento (opcional)
                <select
                  value={editing.empreendimento_id || ""}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      empreendimento_id: event.target.value || null,
                    })
                  }
                  style={field}
                >
                  <option value="">Sem vínculo</option>
                  {empreendimentos.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nome}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ gridColumn: "1/-1" }}>
                Imagem de capa (URL opcional)
                <input
                  value={editing.imagem_capa_url || ""}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      imagem_capa_url: event.target.value,
                    })
                  }
                  placeholder="Ou selecione/ envie abaixo pela biblioteca de mídia"
                  style={field}
                />
              </label>
              {editing.empreendimento_id && (
                <div
                  style={{
                    gridColumn: "1/-1",
                    border: "1px solid #3b3425",
                    borderRadius: 8,
                    padding: 12,
                    background: "#13120f",
                  }}
                >
                  <strong style={{ display: "block", color: "#e1b45c" }}>
                    Imagens já cadastradas no empreendimento
                  </strong>
                  <small
                    style={{
                      color: "#a1a1aa",
                      display: "block",
                      margin: "4px 0 9px",
                    }}
                  >
                    Clique em usar. O Blog somente referencia a imagem
                    existente: não haverá nova cópia nem consumo adicional de
                    Storage.
                  </small>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))",
                      gap: 8,
                    }}
                  >
                    {libraryImages.map((image) => (
                      <button
                        type="button"
                        key={image.id}
                        onClick={() => reuseImage(image)}
                        style={{
                          padding: 0,
                          overflow: "hidden",
                          border: "1px solid #62502a",
                          borderRadius: 6,
                          background: "#111",
                          color: "#eee",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <img
                          src={image.url}
                          alt="Imagem disponível"
                          style={{
                            width: "100%",
                            height: 74,
                            objectFit: "cover",
                            display: "block",
                          }}
                        />
                        <small style={{ display: "block", padding: 6 }}>
                          Usar esta imagem
                        </small>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div
                style={{
                  gridColumn: "1/-1",
                  border: "1px dashed #595965",
                  borderRadius: 8,
                  padding: 12,
                  background: "#101014",
                }}
              >
                <strong style={{ display: "block", marginBottom: 5 }}>
                  Biblioteca de imagens
                </strong>
                <small
                  style={{
                    color: "#a1a1aa",
                    display: "block",
                    marginBottom: 9,
                  }}
                >
                  Envie uma ou várias imagens apenas quando elas ainda não
                  existirem em um empreendimento. A primeira pode ser usada como
                  capa; as demais entram na galeria do layout escolhido.
                </small>
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    color: "#d7ab63",
                    cursor: "pointer",
                    border: "1px solid #695124",
                    padding: "8px 10px",
                    borderRadius: 6,
                  }}
                >
                  <Upload size={15} />
                  Enviar imagens novas
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif"
                    multiple
                    hidden
                    onChange={(event) => {
                      void uploadImages(event.target.files);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))",
                    gap: 9,
                    marginTop: 10,
                  }}
                >
                  {(editing.imagens || []).map((image, index) => (
                    <div
                      key={`${image.url}-${index}`}
                      style={{
                        border: "1px solid #383840",
                        borderRadius: 7,
                        padding: 7,
                      }}
                    >
                      <img
                        src={image.url}
                        alt="Prévia"
                        style={{
                          width: "100%",
                          height: 78,
                          objectFit: "cover",
                          borderRadius: 4,
                        }}
                      />
                      <input
                        value={image.alt}
                        onChange={(event) => {
                          const imagens = [...editing.imagens];
                          imagens[index] = {
                            ...image,
                            alt: event.target.value,
                          };
                          setEditing({ ...editing, imagens });
                        }}
                        placeholder="Descrição da imagem (SEO)"
                        style={{ ...field, marginTop: 6, padding: "7px" }}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setEditing({
                            ...editing,
                            imagens: editing.imagens.filter(
                              (_, itemIndex) => itemIndex !== index,
                            ),
                            imagem_capa_url:
                              editing.imagem_capa_url === image.url
                                ? ""
                                : editing.imagem_capa_url,
                          })
                        }
                        style={{
                          marginTop: 6,
                          background: "transparent",
                          border: 0,
                          color: "#f87171",
                          cursor: "pointer",
                          display: "inline-flex",
                          gap: 4,
                          alignItems: "center",
                        }}
                      >
                        <Trash2 size={13} />
                        Remover
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <label style={{ gridColumn: "1/-1" }}>
                Resumo
                <textarea
                  value={editing.resumo || ""}
                  onChange={(event) =>
                    setEditing({ ...editing, resumo: event.target.value })
                  }
                  rows={2}
                  style={field}
                />
              </label>
              <div
                style={{
                  gridColumn: "1/-1",
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 11,
                  padding: 12,
                  border: "1px solid #4c4028",
                  borderRadius: 8,
                  background: "#15130f",
                }}
              >
                <strong style={{ gridColumn: "1/-1", color: "#d7ab63" }}>Blocos de leitura estratégica</strong>
                <label>Frase de destaque<textarea value={editing.blocos?.destaque || ""} onChange={(event) => setEditing({ ...editing, blocos: { ...(editing.blocos || {}), destaque: event.target.value } })} rows={2} placeholder="A ideia que deve ficar na mente do leitor." style={field} /></label>
                <label>Dado, prova ou curiosidade<textarea value={editing.blocos?.prova || ""} onChange={(event) => setEditing({ ...editing, blocos: { ...(editing.blocos || {}), prova: event.target.value } })} rows={2} placeholder="Número, fato verificável ou curiosidade." style={field} /></label>
                <label>Chamada editorial<textarea value={editing.blocos?.curiosidade || ""} onChange={(event) => setEditing({ ...editing, blocos: { ...(editing.blocos || {}), curiosidade: event.target.value } })} rows={2} placeholder="Gancho para a próxima parte da leitura." style={field} /></label>
                <label>Próximo passo / CTA<textarea value={editing.blocos?.cta || ""} onChange={(event) => setEditing({ ...editing, blocos: { ...(editing.blocos || {}), cta: event.target.value } })} rows={2} placeholder="Convite sutil para conversar ou conhecer uma oportunidade." style={field} /></label>
              </div>
              <label style={{ gridColumn: "1/-1" }}>
                Conteúdo
                <textarea
                  value={editing.conteudo || ""}
                  onChange={(event) =>
                    setEditing({ ...editing, conteudo: event.target.value })
                  }
                  rows={12}
                  placeholder="Escreva em blocos curtos: contexto, dados, análise, recomendação e próximo passo."
                  style={field}
                />
              </label>
              <label>
                SEO: título para Google
                <input
                  value={editing.seo_titulo || ""}
                  onChange={(event) =>
                    setEditing({ ...editing, seo_titulo: event.target.value })
                  }
                  placeholder="Até ~60 caracteres"
                  style={field}
                />
              </label>
              <label>
                SEO: descrição para Google
                <input
                  value={editing.seo_descricao || ""}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      seo_descricao: event.target.value,
                    })
                  }
                  placeholder="Até ~155 caracteres"
                  style={field}
                />
              </label>
              <label>
                Status
                <select
                  value={editing.status}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      status: event.target.value as Status,
                    })
                  }
                  style={field}
                >
                  {Object.entries(statusLabel).map(([id, name]) => (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <footer
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 9,
                marginTop: 16,
              }}
            >
              <button
                onClick={() => setEditing(null)}
                style={{ ...field, width: "auto", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                onClick={save}
                style={{
                  background: "#d6a94f",
                  color: "#16110a",
                  border: 0,
                  borderRadius: 7,
                  padding: "10px 13px",
                  cursor: "pointer",
                  fontWeight: 800,
                  display: "inline-flex",
                  gap: 6,
                  alignItems: "center",
                }}
              >
                <Send size={15} />
                Salvar artigo
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
}
