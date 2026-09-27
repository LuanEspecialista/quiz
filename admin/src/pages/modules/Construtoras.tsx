import { useState, useEffect } from "react";
import type { FC } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Building, 
  Plus, 
  Trash2, 
  Edit3, 
  MapPin, 
  ChevronDown, 
  ChevronUp, 
  Lock, 
  Unlock, 
  Layers, 
  X,
  Search,
  ToggleLeft,
  ToggleRight
} from "lucide-react";

export const ConstrutorasModule: FC = () => {
  const [construtoras, setConstrutoras] = useState<any[]>([]);
  const [empreendimentos, setEmpreendimentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modais e Expansão
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
    const { data: constData } = await supabase.from("construtoras").select("*").order("nome");
    const { data: empData } = await supabase.from("empreendimentos").select("id, nome, cidade, sku, construtora_id");

    if (constData) setConstrutoras(constData);
    if (empData) setEmpreendimentos(empData);
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
      <div style={{ marginBottom: "1rem", display: "flex", gap: "0.5rem" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", width: "16px", height: "16px", color: "#71717a" }} />
          <input
            type="text"
            placeholder="Pesquisar por nome ou SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", backgroundColor: "#121212", border: "1px solid #27272a", color: "#fff", padding: "0.55rem 0.75rem 0.55rem 2.2rem", borderRadius: "6px", fontSize: "0.85rem", boxSizing: "border-box" }}
          />
        </div>
      </div>

      <style>{`
        .builder-card-head { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 1rem; align-items: center; padding: 1rem; background: #151518; }
        .builder-card-info { display: grid; grid-template-columns: 84px minmax(0, 1fr); gap: .9rem; align-items: center; min-width: 0; }
        .builder-cover-placeholder { width: 84px; height: 64px; display: grid; place-items: center; border: 1px solid #34343a; border-radius: 7px; background: linear-gradient(135deg, #242124, #111114); color: #c5a059; }
        .builder-card-title { min-width: 0; color: #fff; font-size: 1rem; font-weight: 700; line-height: 1.25; overflow-wrap: anywhere; }
        .builder-card-meta { display: flex; flex-wrap: wrap; gap: .4rem; margin-top: .5rem; }
        .builder-card-actions { display: flex; align-items: center; justify-content: flex-end; gap: .45rem; flex-wrap: wrap; }
        .builder-action { display: inline-flex; align-items: center; justify-content: center; gap: .35rem; min-height: 34px; border-radius: 6px; cursor: pointer; }
        .builder-emp-card { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: .75rem; align-items: center; }
        @media (max-width: 620px) {
          .builder-card-head { grid-template-columns: 1fr; gap: .85rem; padding: .9rem; }
          .builder-card-info { grid-template-columns: 72px minmax(0, 1fr); gap: .7rem; }
          .builder-cover-placeholder { width: 72px; height: 58px; }
          .builder-card-actions { justify-content: flex-start; padding-top: .7rem; border-top: 1px solid #29292e; }
          .builder-card-actions .builder-action { flex: 0 0 auto; }
          .builder-emp-card { grid-template-columns: 1fr; align-items: stretch; }
          .builder-emp-card > div:last-child { justify-content: flex-start; }
        }
      `}</style>

      {/* CARDS RESPONSIVOS: uma hierarquia clara para construtora, status e empreendimentos */}
      <div style={{ display: "grid", gap: "0.75rem" }}>
        {filteredConstrutoras.map((item) => {
          const empsDaConstrutora = empreendimentos.filter((e) => e.construtora_id === item.id);
          const isExpanded = expandedId === item.id;
          const construtoraAtiva = item.ativo !== false;

          return (
            <article key={item.id} style={{ backgroundColor: "#121212", border: `1px solid ${construtoraAtiva ? "#29292e" : "#4a2929"}`, borderRadius: "10px", overflow: "hidden", opacity: construtoraAtiva ? 1 : .72 }}>
              <div className="builder-card-head">
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  aria-expanded={isExpanded}
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
                  <button className="builder-action" onClick={(event) => { event.stopPropagation(); setExpandedId(isExpanded ? null : item.id); }} style={{ backgroundColor: "#18181b", border: "1px solid #34343a", color: "#c4c4cc", padding: ".25rem .55rem", fontSize: ".72rem" }}>
                    <Layers size={14} /> {empsDaConstrutora.length} {empsDaConstrutora.length === 1 ? "empreendimento" : "empreendimentos"} {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                  <button className="builder-action" onClick={(event) => { event.stopPropagation(); handleOpenModal(item); }} title="Editar construtora" aria-label={`Editar ${item.nome}`} style={{ background: "transparent", border: "1px solid #34343a", color: "#c4c4cc", padding: ".35rem" }}><Edit3 size={16} /></button>
                  <button className="builder-action" onClick={(event) => { event.stopPropagation(); handleDeleteConstrutora(item.id, item.nome); }} title="Excluir construtora" aria-label={`Excluir ${item.nome}`} style={{ background: "transparent", border: "1px solid #4a2929", color: "#ef4444", padding: ".35rem" }}><Trash2 size={16} /></button>
                </div>
              </div>

              {isExpanded && (
                <div style={{ borderTop: "1px solid #29292e", backgroundColor: "#0b0b0c", padding: ".85rem 1rem" }}>
                  <div style={{ fontSize: ".7rem", color: "#8b8b95", marginBottom: ".55rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em" }}>Empreendimentos vinculados</div>
                  {empsDaConstrutora.length === 0 ? (
                    <div style={{ color: "#8b8b95", fontSize: ".8rem", padding: ".7rem .75rem", border: "1px dashed #34343a", borderRadius: "7px" }}>Nenhum empreendimento vinculado a esta construtora. O cadastro pode ser feito na gestão de empreendimentos.</div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: ".55rem" }}>
                      {empsDaConstrutora.map((emp) => {
                        const empreendimentoAtivo = emp.ativo !== false;
                        return <div className="builder-emp-card" key={emp.id} style={{ backgroundColor: "#141417", border: `1px solid ${empreendimentoAtivo ? "#27272a" : "#4a2929"}`, borderRadius: "7px", padding: ".65rem .75rem", opacity: empreendimentoAtivo ? 1 : .65 }}>
                          <div style={{ minWidth: 0 }}>
                            <div style={{ fontSize: ".84rem", fontWeight: 700, color: "#e4e4e7", overflowWrap: "anywhere" }}>{emp.nome}</div>
                            <div style={{ fontSize: ".7rem", color: "#85858f", marginTop: ".25rem" }}>SKU: {emp.sku || "N/A"} · {emp.cidade || "Sem cidade"}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: ".35rem" }}>
                            <button className="builder-action" onClick={(event) => toggleEmpreendimento(emp, event)} title={empreendimentoAtivo ? "Desativar empreendimento" : "Ativar empreendimento"} aria-label={empreendimentoAtivo ? "Desativar empreendimento" : "Ativar empreendimento"} aria-pressed={empreendimentoAtivo} style={{ background: "transparent", border: 0, color: empreendimentoAtivo ? "#4ade80" : "#71717a", padding: ".15rem" }}>{empreendimentoAtivo ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}</button>
                            <button className="builder-action" onClick={(event) => { event.stopPropagation(); handleDeleteEmpreendimento(emp.id, emp.nome); }} title="Excluir empreendimento" aria-label={`Excluir ${emp.nome}`} style={{ background: "transparent", border: 0, color: "#ef4444", padding: ".15rem" }}><Trash2 size={15} /></button>
                          </div>
                        </div>;
                      })}
                    </div>
                  )}
                </div>
              )}
            </article>
          );
        })}
      </div>

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
