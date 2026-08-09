import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Building, 
  Plus, 
  Trash2, 
  Edit3, 
  MapPin, 
  ChevronDown, 
  ChevronUp, 
  KeyRound, 
  Lock, 
  Unlock, 
  Layers, 
  AlertTriangle,
  X,
  Search
} from "lucide-react";

export const ConstrutorasModule: React.FC = () => {
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
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

      {/* LISTAGEM DISCRETA (TABELA / CARDS COMPACTOS) */}
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {filteredConstrutoras.map((item) => {
          const empsDaConstrutora = empreendimentos.filter((e) => e.construtora_id === item.id);
          const isExpanded = expandedId === item.id;

          return (
            <div key={item.id} style={{ backgroundColor: "#121212", border: "1px solid #222", borderRadius: "8px", overflow: "hidden" }}>
              {/* LINHA PRINCIPAL DA CONSTRUTORA */}
              <div style={{ padding: "0.85rem 1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#151518" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span style={{ backgroundColor: "#27272a", color: "#c5a059", padding: "0.2rem 0.5rem", borderRadius: "4px", fontSize: "0.75rem", fontFamily: "monospace", fontWeight: "bold" }}>
                    {item.sku || "SEM-SKU"}
                  </span>
                  <div>
                    <span style={{ fontWeight: "600", color: "#fff", fontSize: "0.95rem" }}>{item.nome}</span>
                    <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.2rem", flexWrap: "wrap" }}>
                      {item.cidades_atuacao?.map((cid: string, idx: number) => (
                        <span key={idx} style={{ color: "#a1a1aa", fontSize: "0.7rem", display: "inline-flex", alignItems: "center", gap: "0.2rem", backgroundColor: "#1f1f23", padding: "0.1rem 0.4rem", borderRadius: "3px" }}>
                          <MapPin style={{ width: "10px", height: "10px" }} /> {cid}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    style={{ backgroundColor: "transparent", border: "1px solid #27272a", color: "#a1a1aa", padding: "0.3rem 0.6rem", borderRadius: "4px", fontSize: "0.75rem", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem" }}
                  >
                    <Layers style={{ width: "14px", height: "14px" }} />
                    {empsDaConstrutora.length} Empreendimentos
                    {isExpanded ? <ChevronUp style={{ width: "14px", height: "14px" }} /> : <ChevronDown style={{ width: "14px", height: "14px" }} />}
                  </button>

                  <button onClick={() => handleOpenModal(item)} style={{ background: "none", border: "none", color: "#a1a1aa", cursor: "pointer", padding: "0.2rem" }}>
                    <Edit3 style={{ width: "15px", height: "15px" }} />
                  </button>
                  <button onClick={() => handleDeleteConstrutora(item.id, item.nome)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "0.2rem" }}>
                    <Trash2 style={{ width: "15px", height: "15px" }} />
                  </button>
                </div>
              </div>

              {/* ABA EXPANSÍVEL: EMPREENDIMENTOS DA CONSTRUTORA */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid #222", backgroundColor: "#0b0b0c", padding: "0.85rem 1.25rem" }}>
                  <div style={{ fontSize: "0.75rem", color: "#71717a", marginBottom: "0.5rem", fontWeight: "bold", textTransform: "uppercase" }}>
                    Empreendimentos Cadastrados
                  </div>
                  {empsDaConstrutora.length === 0 ? (
                    <div style={{ color: "#52525b", fontSize: "0.8rem", fontStyle: "italic" }}>
                      Nenhum empreendimento vinculado a esta construtora até o momento.
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.5rem" }}>
                      {empsDaConstrutora.map((emp) => (
                        <div key={emp.id} style={{ backgroundColor: "#141417", border: "1px solid #27272a", borderRadius: "6px", padding: "0.6rem 0.8rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            <div style={{ fontSize: "0.85rem", fontWeight: "bold", color: "#d4d4d8" }}>{emp.nome}</div>
                            <div style={{ fontSize: "0.7rem", color: "#71717a" }}>SKU: {emp.sku || "N/A"} • {emp.cidade || "Sem Cidade"}</div>
                          </div>
                          <button
                            onClick={() => handleDeleteEmpreendimento(emp.id, emp.nome)}
                            title="Excluir Empreendimento"
                            style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", opacity: 0.7 }}
                          >
                            <Trash2 style={{ width: "14px", height: "14px" }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL DE CADASTRO / EDIÇÃO */}
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999 }}>
          <div style={{ backgroundColor: "#121212", border: "1px solid #27272a", borderRadius: "8px", width: "100%", maxWidth: "480px", padding: "1.5rem" }}>
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