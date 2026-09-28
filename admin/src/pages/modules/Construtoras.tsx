import { useState, useEffect } from "react";
import type { FC } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Building, 
  Plus, 
  Trash2, 
  Edit3, 
  MapPin, 
  Lock, 
  Unlock, 
  Layers, 
  X,
  Search,
  LayoutGrid,
  List,
  ToggleLeft,
  ToggleRight
} from "lucide-react";

const formatCompactCurrency = (value: number) => {
  if (!Number.isFinite(value)) return "—";
  if (value >= 1000000) return `R$ ${(value / 1000000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mi`;
  if (value >= 1000) return `R$ ${(value / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil`;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value);
};

export const ConstrutorasModule: FC = () => {
  const [construtoras, setConstrutoras] = useState<any[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<any[]>([]);
  const [empreendimentoCovers, setEmpreendimentoCovers] = useState<Record<string, string>>({});
  const [empreendimentoMetrics, setEmpreendimentoMetrics] = useState<Record<string, { units: number; minPrice: number | null; maxPrice: number | null; typologies: string[] }>>({});
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "cards">(() => {
    try {
      return window.localStorage.getItem("luan-admin-construtoras-view") === "list" ? "list" : "cards";
    } catch {
      return "cards";
    }
  });
  
  useEffect(() => {
    try { window.localStorage.setItem("luan-admin-construtoras-view", viewMode); } catch { /* preferência opcional */ }
  }, [viewMode]);

  // Modais e Expansão
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBuilder, setSelectedBuilder] = useState<any | null>(null);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Form State
  const [formNome, setFormNome] = useState("");
  const [formSku, setFormSku] = useState("");
  const [formCidades, setFormCidades] = useState<string[]>([]);
  const [inputCidade, setInputCidade] = useState("");
  const [formSite, setFormSite] = useState("");
  const [formContato, setFormContato] = useState("");
  const [unlockSku, setUnlockSku] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [{ data: constData }, { data: empData }, { data: imageData }, { data: unitData }] = await Promise.all([
      supabase.from("construtoras").select("*").order("nome"),
      supabase.from("empreendimentos").select("*").order("nome"),
      supabase.from("empreendimento_imagens").select("empreendimento_id, url, storage_path, ordem").order("ordem", { ascending: true }),
      supabase.from("unidades").select("empreendimento_id, tipologia, tipologia_dados, valor_tabela, status"),
    ]);

    if (constData) setConstrutoras(constData);
    if (empData) setEmpreendimentos(empData);
    const metrics: Record<string, { units: number; minPrice: number | null; maxPrice: number | null; typologies: string[] }> = {};
    for (const unit of (unitData || []) as any[]) {
      const id = String(unit.empreendimento_id || "");
      if (!id) continue;
      const current = metrics[id] || { units: 0, minPrice: null, maxPrice: null, typologies: [] };
      current.units += 1;
      const label = String(unit.tipologia_dados?.original || unit.tipologia || "").trim();
      if (label && !current.typologies.includes(label)) current.typologies.push(label);
      const status = String(unit.status || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
      const price = Number(unit.valor_tabela);
      if (["disponivel", "disponíveis", "disponiveis"].some((value) => status.includes(value)) && Number.isFinite(price) && price > 0) {
        current.minPrice = current.minPrice == null ? price : Math.min(current.minPrice, price);
        current.maxPrice = current.maxPrice == null ? price : Math.max(current.maxPrice, price);
      }
      current.typologies.sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true }));
      metrics[id] = current;
    }
    setEmpreendimentoMetrics(metrics);
    const covers: Record<string, string> = {};
    for (const image of (imageData || []) as any[]) {
      if (covers[image.empreendimento_id]) continue;
      if (image.url) { covers[image.empreendimento_id] = image.url; continue; }
      if (image.storage_path) {
        const { data } = await supabase.storage.from("empreendimentos").createSignedUrl(image.storage_path, 3600);
        if (data?.signedUrl) covers[image.empreendimento_id] = data.signedUrl;
      }
    }
    (empData || []).forEach((emp: any) => {
      if (!covers[emp.id] && emp.imagem_url && !String(emp.imagem_url).startsWith("storage://")) covers[emp.id] = emp.imagem_url;
    });
    setEmpreendimentoCovers(covers);
    setLoading(false);
  };

  // Gera pré-SKU automático baseado no nome
  const generatePreSku = (nome: string) => {
    return nome
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .substring(0, 6);
  };

  const handleNomeChange = (val: string) => {
    setFormNome(val);
    if (!editingItem && !unlockSku) {
      setFormSku(generatePreSku(val));
    }
  };

  const handleAddCidade = () => {
    if (inputCidade.trim() && !formCidades.includes(inputCidade.trim())) {
      setFormCidades([...formCidades, inputCidade.trim()]);
      setInputCidade("");
    }
  };

  const handleRemoveCidade = (cid: string) => {
    setFormCidades(formCidades.filter((c) => c !== cid));
  };

  const handleOpenModal = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setFormNome(item.nome || "");
      setFormSku(item.sku || "");
      setFormCidades(item.cidades_atuacao || []);
      setFormSite(item.site || "");
      setFormContato(item.contato || "");
      setUnlockSku(false);
    } else {
      setEditingItem(null);
      setFormNome("");
      setFormSku("");
      setFormCidades([]);
      setFormSite("");
      setFormContato("");
      setUnlockSku(false);
    }
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!formNome.trim() || !formSku.trim()) {
      alert("Nome e SKU são obrigatórios.");
      return;
    }

    // Validação de SKU Duplicado em Construtoras
    const skuClean = formSku.trim().toUpperCase();
    const duplicate = construtoras.find(
      (c) => c.sku === skuClean && c.id !== editingItem?.id
    );

    if (duplicate) {
      alert("Este SKU já está em uso por outra construtora!");
      return;
    }

    const payload = {
      nome: formNome.trim(),
      sku: skuClean,
      cidades_atuacao: formCidades,
      site: formSite.trim(),
      contato: formContato.trim(),
    };

    setLoading(true);

    let error;
    if (editingItem) {
      const res = await supabase.from("construtoras").update(payload).eq("id", editingItem.id);
      error = res.error;
    } else {
      const res = await supabase.from("construtoras").insert([payload]);
      error = res.error;
    }

    if (error) {
      alert("Erro ao salvar: " + error.message);
    } else {
      setIsModalOpen(false);
      fetchData();
    }
    setLoading(false);
  };

  const toggleConstrutora = async (item: any, event: React.MouseEvent) => {
    event.stopPropagation();
    const next = item.ativo === false;
    const { error } = await supabase.from("construtoras").update({ ativo: next }).eq("id", item.id);
    if (error) {
      alert("Não foi possível alterar o status da construtora: " + error.message);
      return;
    }
    setConstrutoras((current) => current.map((entry) => entry.id === item.id ? { ...entry, ativo: next } : entry));
  };

  const toggleEmpreendimento = async (item: any, event: React.MouseEvent) => {
    event.stopPropagation();
    const next = item.ativo === false;
    const { error } = await supabase.from("empreendimentos").update({ ativo: next }).eq("id", item.id);
    if (error) {
      alert("Não foi possível alterar o status do empreendimento: " + error.message);
      return;
    }
    setEmpreendimentos((current) => current.map((entry) => entry.id === item.id ? { ...entry, ativo: next } : entry));
  };

  const handleDeleteConstrutora = async (id: string, nome: string) => {
    const vinculados = empreendimentos.filter((e) => e.construtora_id === id);
    if (vinculados.length > 0) {
      if (!confirm(`A construtora "${nome}" possui ${vinculados.length} empreendimentos vinculados. Deseja excluir a construtora mesmo assim? Os empreendimentos ficarão sem construtora.`)) {
        return;
      }
    } else {
      if (!confirm(`Deseja excluir a construtora "${nome}"?`)) return;
    }

    await supabase.from("construtoras").delete().eq("id", id);
    fetchData();
  };

  const handleDeleteEmpreendimento = async (empId: string, empNome: string) => {
    if (confirm(`Tem certeza que deseja apagar permanentemente o empreendimento "${empNome}" e todo o seu estoque de unidades?`)) {
      await supabase.from("empreendimentos").delete().eq("id", empId);
      fetchData();
    }
  };

  const filteredConstrutoras = construtoras.filter((c) =>
    c.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ color: "#e4e4e7", fontFamily: "sans-serif" }}>
      {/* HEADER DISCRETO */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.25rem", fontWeight: "600", color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Building style={{ width: "20px", height: "20px", color: "#c5a059" }} /> Gestão de Construtoras
          </h1>
          <p style={{ color: "#71717a", fontSize: "0.8rem", margin: "0.2rem 0 0 0" }}>
            Mapeamento de parceiros, SKUs corporativos e raio de atuação regional
          </p>
        </div>

        <button
          onClick={() => handleOpenModal()}
          style={{ backgroundColor: "#c5a059", color: "#000", fontWeight: "600", padding: "0.5rem 1rem", borderRadius: "6px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem" }}
        >
          <Plus style={{ width: "16px", height: "16px" }} /> Nova Construtora
        </button>
      </div>

      {/* FILTRO E PESQUISA */}
      <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem", alignItems: "stretch" }}>
        <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
          <Search style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", width: "16px", height: "16px", color: "#71717a" }} />
          <input
            type="text"
            placeholder="Pesquisar por nome ou SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", height: "100%", backgroundColor: "#121212", border: "1px solid #27272a", color: "#fff", padding: "0.55rem 0.75rem 0.55rem 2.2rem", borderRadius: "6px", fontSize: "0.85rem", boxSizing: "border-box" }}
          />
        </div>
        <div className="builder-view-switch" role="group" aria-label="Modo de visualização">
          <button type="button" onClick={() => setViewMode("list")} aria-label="Visualizar construtoras em lista" aria-pressed={viewMode === "list"} className={viewMode === "list" ? "is-active" : ""}><List size={16} /><span>Lista</span></button>
          <button type="button" onClick={() => setViewMode("cards")} aria-label="Visualizar construtoras em cards" aria-pressed={viewMode === "cards"} className={viewMode === "cards" ? "is-active" : ""}><LayoutGrid size={16} /><span>Cards</span></button>
        </div>
      </div>

      <style>{`
        .builder-products-backdrop { position: fixed; inset: 0; z-index: 1200; display: grid; place-items: center; padding: 20px; background: rgba(0,0,0,.78); }
        .builder-products-modal { width: min(980px, 100%); max-height: min(820px, calc(100dvh - 40px)); overflow: auto; background: #101012; border: 1px solid #4b3a1e; border-radius: 14px; box-shadow: 0 24px 90px rgba(0,0,0,.6); }
        .builder-products-modal-head { position: sticky; top: 0; z-index: 1; display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; padding: 18px 20px; background: rgba(16,16,18,.97); border-bottom: 1px solid #29292e; }
        .builder-modal-eyebrow { color: #c5a059; font-size: .66rem; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; }
        .builder-products-modal h2 { margin: 4px 0 0; color: #fff; font-size: 1.25rem; }
        .builder-products-modal-head p { margin: 4px 0 0; color: #8b8b95; font-size: .78rem; }
        .builder-modal-close { display: grid; place-items: center; flex: 0 0 auto; width: 34px; height: 34px; border: 1px solid #3f3f46; border-radius: 7px; background: #18181b; color: #d4d4d8; cursor: pointer; }
        .builder-products-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; padding: 16px 20px 20px; }
        .builder-product-modal-card { overflow: hidden; border: 1px solid #2f2f35; border-radius: 10px; background: #151518; }
        .builder-product-modal-cover { height: 142px; background: linear-gradient(135deg,#292018,#111114); }
        .builder-product-modal-cover img { width: 100%; height: 100%; display: block; object-fit: cover; }
        .builder-product-modal-cover > div { height: 100%; display: grid; place-items: center; align-content: center; gap: 5px; color: #c5a059; font-size: .68rem; }
        .builder-product-modal-body { position: relative; padding: 13px; }
        .builder-product-modal-status { position: absolute; top: 12px; right: 12px; padding: 3px 7px; border-radius: 99px; background: #4a2929; color: #fecaca; font-size: .62rem; }
        .builder-product-modal-status[data-active="true"] { background: #14532d; color: #bbf7d0; }
        .builder-product-modal-body h3 { margin: 0 72px 4px 0; color: #f4f4f5; font-size: .95rem; }
        .builder-product-modal-meta { color: #c5a059; font-size: .7rem; }
        .builder-product-modal-body p { min-height: 38px; margin: 9px 0; color: #a1a1aa; font-size: .73rem; line-height: 1.45; }
        .builder-product-modal-footer { display: flex; justify-content: space-between; align-items: center; gap: 8px; padding-top: 9px; border-top: 1px solid #29292e; }
        .builder-product-modal-footer small { color: #71717a; font-size: .65rem; }
        .builder-product-modal-footer > div { display: flex; gap: 4px; }
        .builder-summary-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 7px; margin-top: .75rem; }
        .builder-summary-grid > div, .builder-product-summary-grid > div { min-width: 0; padding: 7px; border: 1px solid #2b2b31; border-radius: 6px; background: #111114; }
        .builder-summary-grid small, .builder-product-summary-grid small { display: block; color: #71717a; font-size: .59rem; text-transform: uppercase; letter-spacing: .04em; }
        .builder-summary-grid strong, .builder-product-summary-grid strong { display: block; margin-top: 3px; color: #e7c778; font-size: .72rem; line-height: 1.25; overflow-wrap: anywhere; }
        .builder-product-summary-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 7px; margin-top: 12px; }
        .builder-products-empty { padding: 35px 20px; color: #a1a1aa; text-align: center; }
        .builder-view-switch { display: inline-flex; flex: 0 0 auto; align-items: stretch; padding: 3px; gap: 2px; border: 1px solid #34343a; border-radius: 7px; background: #121214; }
        .builder-view-switch button { display: inline-flex; align-items: center; gap: .35rem; border: 0; border-radius: 5px; padding: .45rem .6rem; background: transparent; color: #85858f; font-size: .72rem; cursor: pointer; }
        .builder-view-switch button.is-active { background: #2b2418; color: #f5d58b; box-shadow: inset 0 0 0 1px #765d2c; }
        .builder-collection.cards { grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)) !important; align-items: start; }
        .builder-collection.cards > article { height: 100%; }
        .builder-collection.cards .builder-card-head { grid-template-columns: 1fr; align-items: stretch; }
        .builder-collection.cards .builder-card-actions { justify-content: flex-start; padding-top: .75rem; border-top: 1px solid #29292e; }
        .builder-card-head { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 1rem; align-items: center; padding: 1rem; background: #151518; }
        .builder-card-info { display: grid; grid-template-columns: 84px minmax(0, 1fr); gap: .9rem; align-items: center; min-width: 0; }
        .builder-cover-placeholder { width: 84px; height: 64px; display: grid; place-items: center; border: 1px solid #34343a; border-radius: 7px; background: linear-gradient(135deg, #242124, #111114); color: #c5a059; }
        .builder-card-title { min-width: 0; color: #fff; font-size: 1rem; font-weight: 700; line-height: 1.25; overflow-wrap: anywhere; }
        .builder-card-meta { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: .5rem; }
        .builder-card-actions { display: flex; align-items: center; justify-content: flex-end; gap: .45rem; flex-wrap: wrap; }
        .builder-action { display: inline-flex; align-items: center; justify-content: center; gap: .35rem; min-height: 34px; border-radius: 6px; cursor: pointer; }
        .builder-emp-card { display: grid; grid-template-columns: 92px minmax(0, 1fr); gap: 0; align-items: stretch; }
        .builder-emp-cover { min-height: 148px; background: linear-gradient(135deg, #292018, #111114); overflow: hidden; }
        .builder-emp-cover img { width: 100%; height: 100%; min-height: 148px; object-fit: cover; display: block; }
        .builder-emp-cover-empty { height: 100%; min-height: 148px; display: grid; place-items: center; align-content: center; gap: 5px; color: #c5a059; font-size: .62rem; text-align: center; padding: 6px; }
        .builder-emp-content { min-width: 0; padding: .75rem; display: flex; flex-direction: column; justify-content: space-between; }
        @media (max-width: 620px) {
          .builder-card-head { grid-template-columns: 1fr; gap: .85rem; padding: .9rem; }
          .builder-card-info { grid-template-columns: 72px minmax(0, 1fr); gap: .7rem; }
          .builder-cover-placeholder { width: 72px; height: 58px; }
          .builder-card-actions { justify-content: flex-start; padding-top: .7rem; border-top: 1px solid #29292e; }
          .builder-card-actions .builder-action { flex: 0 0 auto; }
          .builder-emp-card { grid-template-columns: 88px minmax(0, 1fr); align-items: stretch; }
          .builder-emp-cover, .builder-emp-cover img, .builder-emp-cover-empty { min-height: 154px; }
          .builder-emp-content { padding: .7rem; }
          .builder-emp-card > div:last-child { justify-content: flex-start; }
        }
      `}</style>

      {/* CARDS RESPONSIVOS: uma hierarquia clara para construtora, status e empreendimentos */}
      <div className={`builder-collection ${viewMode}`} style={{ display: "grid", gap: "0.75rem" }}>
        {filteredConstrutoras.map((item) => {
          const empsDaConstrutora = empreendimentos.filter((e) => e.construtora_id === item.id);
          const construtoraAtiva = item.ativo !== false;

          return (
            <article key={item.id} style={{ backgroundColor: "#121212", border: `1px solid ${construtoraAtiva ? "#29292e" : "#4a2929"}`, borderRadius: "10px", overflow: "hidden", opacity: construtoraAtiva ? 1 : .72 }}>
              <div className="builder-card-head">
                <button
                  type="button"
                  onClick={() => setSelectedBuilder(item)}
                  aria-expanded={false}
                  style={{ display: "block", width: "100%", minWidth: 0, padding: 0, border: 0, background: "transparent", color: "inherit", textAlign: "left", cursor: "pointer" }}
                >
                  <div className="builder-card-info">
                    <div className="builder-cover-placeholder" aria-label={`Capa da construtora ${item.nome || "sem nome"}`} title="Capa da construtora — disponível para adicionar futuramente">
                      <Building size={25} strokeWidth={1.5} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div className="builder-card-title">{item.nome}</div>
                      <div className="builder-card-meta">
                        <span style={{ backgroundColor: "#27272a", color: "#d7ab63", padding: ".22rem .48rem", borderRadius: "4px", fontSize: ".7rem", fontFamily: "monospace", fontWeight: "bold" }}>{item.sku || "SEM-SKU"}</span>
                        {item.cidades_atuacao?.map((cid: string, idx: number) => (
                          <span key={idx} style={{ color: "#a1a1aa", fontSize: ".7rem", display: "inline-flex", alignItems: "center", gap: ".2rem", backgroundColor: "#1f1f23", padding: ".22rem .45rem", borderRadius: "4px" }}>
                            <MapPin size={10} /> {cid}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>

                <div className="builder-card-actions">
                  <button className="builder-action" onClick={(event) => toggleConstrutora(item, event)} title={construtoraAtiva ? "Desativar construtora" : "Ativar construtora"} aria-label={construtoraAtiva ? "Desativar construtora" : "Ativar construtora"} aria-pressed={construtoraAtiva} style={{ background: construtoraAtiva ? "#10291b" : "#202024", border: `1px solid ${construtoraAtiva ? "#237a49" : "#3f3f46"}`, color: construtoraAtiva ? "#4ade80" : "#a1a1aa", padding: ".25rem .55rem" }}>
                    {construtoraAtiva ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}<span style={{ fontSize: ".7rem", fontWeight: 700 }}>{construtoraAtiva ? "Ativa" : "Inativa"}</span>
                  </button>
                  <button className="builder-action" onClick={(event) => { event.stopPropagation(); setSelectedBuilder(item); }} style={{ backgroundColor: "#18181b", border: "1px solid #34343a", color: "#c4c4cc", padding: ".25rem .55rem", fontSize: ".72rem" }}>
                    <Layers size={14} /> {empsDaConstrutora.length} {empsDaConstrutora.length === 1 ? "empreendimento" : "empreendimentos"}
                  </button>
                  <button className="builder-action" onClick={(event) => { event.stopPropagation(); handleOpenModal(item); }} title="Editar construtora" aria-label={`Editar ${item.nome}`} style={{ background: "transparent", border: "1px solid #34343a", color: "#c4c4cc", padding: ".35rem" }}><Edit3 size={16} /></button>
                  <button className="builder-action" onClick={(event) => { event.stopPropagation(); handleDeleteConstrutora(item.id, item.nome); }} title="Excluir construtora" aria-label={`Excluir ${item.nome}`} style={{ background: "transparent", border: "1px solid #4a2929", color: "#ef4444", padding: ".35rem" }}><Trash2 size={16} /></button>
                </div>
              </div>

              {/* Os empreendimentos são exibidos no modal contextual abaixo. */}
            </article>
          );
        })}
      </div>

      {selectedBuilder && (() => {
        const modalEmpreendimentos = empreendimentos.filter((emp) => emp.construtora_id === selectedBuilder.id);
        return <div className="builder-products-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedBuilder(null); }}>
          <section className="builder-products-modal" role="dialog" aria-modal="true" aria-labelledby="builder-products-title">
            <div className="builder-products-modal-head">
              <div>
                <div className="builder-modal-eyebrow">Construtora selecionada</div>
                <h2 id="builder-products-title">{selectedBuilder.nome}</h2>
                <p>{modalEmpreendimentos.length} {modalEmpreendimentos.length === 1 ? "empreendimento disponível" : "empreendimentos disponíveis"}</p>
              </div>
              <button type="button" onClick={() => setSelectedBuilder(null)} className="builder-modal-close" aria-label="Fechar empreendimentos"><X size={20} /></button>
            </div>
            {modalEmpreendimentos.length === 0 ? <div className="builder-products-empty">Nenhum empreendimento vinculado a esta construtora.</div> : <div className="builder-products-grid">
              {modalEmpreendimentos.map((emp) => {
                const empreendimentoAtivo = emp.ativo !== false;
                const cover = empreendimentoCovers[emp.id] || emp.imagem_url;
                return <article className="builder-product-modal-card" key={emp.id}>
                  <div className="builder-product-modal-cover">{cover ? <img src={cover} alt={`Capa de ${emp.nome}`} /> : <div><Building size={28} /><span>Foto pendente</span></div>}</div>
                  <div className="builder-product-modal-body">
                    <div className="builder-product-modal-status" data-active={empreendimentoAtivo}>{empreendimentoAtivo ? "Ativo" : "Inativo"}</div>
                    <h3>{emp.nome}</h3>
                    <div className="builder-product-modal-meta">{emp.cidade || "Cidade não informada"}</div>
                    <div className="builder-product-summary-grid">
                      <div><small>Ticket</small><strong>{(() => { const metric = empreendimentoMetrics[emp.id]; const min = metric?.minPrice ?? emp.menor_preco_disponivel ?? emp.faixa_preco; const max = metric?.maxPrice ?? emp.maior_preco_disponivel ?? emp.faixa_preco; if (min == null && max == null) return "—"; if (min === max || max == null) return formatCompactCurrency(Number(min)); return `${formatCompactCurrency(Number(min))}–${formatCompactCurrency(Number(max))}`; })()}</strong></div>
                      <div><small>Áreas</small><strong>{emp.area_minima != null && emp.area_maxima != null ? `${emp.area_minima}–${emp.area_maxima} m²` : emp.area_minima != null ? `a partir de ${emp.area_minima} m²` : "—"}</strong></div>
                      <div><small>Tipologias</small><strong>{(empreendimentoMetrics[emp.id]?.typologies?.length ? empreendimentoMetrics[emp.id].typologies : (emp.tipologias_disponiveis || emp.tipologias_estoque || emp.quartos_disponiveis?.map((value: number) => value === 0 ? "Studio" : `${value}Q`) || [])).join(" · ") || "—"}</strong></div>
                      <div><small>Áreas de lazer</small><strong>{emp.quantidade_areas_lazer != null ? `${emp.quantidade_areas_lazer} áreas` : "—"}</strong></div>
                      <div><small>Unidades</small><strong>{empreendimentoMetrics[emp.id]?.units ?? emp.unidades_cadastradas ?? emp.numero_unidades ?? "—"}</strong></div>
                      <div><small>Entrega</small><strong>{emp.entrega_date || emp.entrega || emp.previsao_entrega || "—"}</strong></div>
                    </div>
                    <div className="builder-product-modal-footer"><small>SKU: {emp.sku || "N/A"}</small><div>
                      <button className="builder-action" onClick={(event) => toggleEmpreendimento(emp, event)} title={empreendimentoAtivo ? "Desativar empreendimento" : "Ativar empreendimento"} aria-label={empreendimentoAtivo ? "Desativar empreendimento" : "Ativar empreendimento"} aria-pressed={empreendimentoAtivo}>{empreendimentoAtivo ? <ToggleRight size={21} /> : <ToggleLeft size={21} />}</button>
                      <button className="builder-action" onClick={(event) => { event.stopPropagation(); handleDeleteEmpreendimento(emp.id, emp.nome); }} title="Excluir empreendimento" aria-label={`Excluir ${emp.nome}`}><Trash2 size={15} /></button>
                    </div></div>
                  </div>
                </article>;
              })}
            </div>}
          </section>
        </div>;
      })()}

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999 }}>
          <div role="dialog" aria-modal="true" style={{ backgroundColor: "#121212", border: "1px solid #27272a", borderRadius: "8px", width: "min(100%, 480px)", maxHeight: "calc(100dvh - 24px)", overflowY: "auto", padding: "clamp(1rem, 4vw, 1.5rem)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h3 style={{ margin: 0, color: "#fff", fontSize: "1.1rem" }}>
                {editingItem ? "Editar Construtora" : "Nova Construtora"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", color: "#a1a1aa", cursor: "pointer" }}>
                <X style={{ width: "18px", height: "18px" }} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
              {/* NOME */}
              <div>
                <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.75rem", marginBottom: "0.25rem" }}>Nome da Construtora *</label>
                <input
                  type="text"
                  value={formNome}
                  onChange={(e) => handleNomeChange(e.target.value)}
                  style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", color: "#fff", padding: "0.5rem", borderRadius: "4px", fontSize: "0.85rem", boxSizing: "border-box" }}
                />
              </div>

              {/* PRE-SKU / SKU COM REVOLVER DE EDICAO */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.25rem" }}>
                  <label style={{ color: "#a1a1aa", fontSize: "0.75rem" }}>SKU Corporativo *</label>
                  <button
                    type="button"
                    onClick={() => setUnlockSku(!unlockSku)}
                    style={{ background: "none", border: "none", color: "#c5a059", fontSize: "0.7rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.2rem" }}
                  >
                    {unlockSku ? <Unlock style={{ width: "12px", height: "12px" }} /> : <Lock style={{ width: "12px", height: "12px" }} />}
                    {unlockSku ? "Bloquear Edit" : "Pré-SKU (Editar)"}
                  </button>
                </div>
                <input
                  type="text"
                  value={formSku}
                  readOnly={!unlockSku}
                  onChange={(e) => setFormSku(e.target.value.toUpperCase())}
                  style={{ width: "100%", backgroundColor: unlockSku ? "#18181b" : "#09090b", border: "1px solid #27272a", color: unlockSku ? "#fff" : "#c5a059", padding: "0.5rem", borderRadius: "4px", fontSize: "0.85rem", fontFamily: "monospace", fontWeight: "bold", boxSizing: "border-box" }}
                />
              </div>

              {/* CIDADES DE ATUAÇÃO (MULTI-CIDADES PARA FILTROS FUTUROS) */}
              <div>
                <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.75rem", marginBottom: "0.25rem" }}>Cidades de Atuação</label>
                <div style={{ display: "flex", gap: "0.4rem", marginBottom: "0.4rem" }}>
                  <input
                    type="text"
                    placeholder="Ex: Penha, Balneário Camboriú..."
                    value={inputCidade}
                    onChange={(e) => setInputCidade(e.target.value)}
                    style={{ flex: 1, backgroundColor: "#18181b", border: "1px solid #27272a", color: "#fff", padding: "0.45rem", borderRadius: "4px", fontSize: "0.8rem", boxSizing: "border-box" }}
                  />
                  <button type="button" onClick={handleAddCidade} style={{ backgroundColor: "#27272a", color: "#fff", border: "none", padding: "0 0.8rem", borderRadius: "4px", cursor: "pointer", fontSize: "0.8rem" }}>
                    + Add
                  </button>
                </div>
                <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                  {formCidades.map((c, i) => (
                    <span key={i} style={{ backgroundColor: "#1f1f23", border: "1px solid #27272a", color: "#d4d4d8", padding: "0.15rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      {c}
                      <X onClick={() => handleRemoveCidade(c)} style={{ width: "12px", height: "12px", cursor: "pointer", color: "#ef4444" }} />
                    </span>
                  ))}
                </div>
              </div>

              {/* BOTOES */}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "1rem" }}>
                <button onClick={() => setIsModalOpen(false)} style={{ backgroundColor: "transparent", color: "#a1a1aa", border: "1px solid #27272a", padding: "0.5rem 1rem", borderRadius: "4px", cursor: "pointer", fontSize: "0.85rem" }}>
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={loading} style={{ backgroundColor: "#c5a059", color: "#000", fontWeight: "bold", border: "none", padding: "0.5rem 1rem", borderRadius: "4px", cursor: "pointer", fontSize: "0.85rem" }}>
                  Salvar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
