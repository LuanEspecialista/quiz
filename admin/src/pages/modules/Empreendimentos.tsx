import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Building2, 
  Plus, 
  Search, 
  MapPin, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  Building,
  Filter,
  Sparkles,
  TrendingUp,
  ShieldCheck,
  CheckSquare,
  Square,
  Calendar,
  Image as ImageIcon
} from "lucide-react";
import { EmpreendimentoImagens } from "./EmpreendimentoImagens";

const DEFAULT_CIDADES = [
  "Penha - SC", "Balneário Piçarras - SC", "Barra Velha - SC", "Navegantes - SC",
  "Itajaí - SC", "Balneário Camboriú - SC", "Camboriú - SC", "Itapema - SC",
  "Porto Belo - SC", "Bombinhas - SC", "Blumenau - SC", "Brusque - SC",
  "Florianópolis - SC", "São José - SC", "Palhoça - SC", "Joinville - SC",
  "Araquari - SC", "São Francisco do Sul - SC", "Jaraguá do Sul - SC", "Tijucas - SC"
];

const OPCOES_LAZER_PADRAO = [
  "Piscina Adulto", "Piscina Infantil", "Piscina Aquecida", "Piscina Coberta com Raia", 
  "Raia Semi-Olímpica", "Deck Molhado", "Bar Molhado", "Rooftop 360º", "SPA / Jacuzzi",
  "Academia Fit / Fitness Center", "Crossfit Zone", "Pilates", "Sauna Seca", "Sauna Úmida", 
  "Espaço Massagem", "Quadra de Tênis", "Quadra Poliesportiva", "Quadra de Beach Tennis",
  "Espaço Gourmet", "Salão de Festas", "Churrasqueira Coletiva", "Fire Place (Praça do Fogo)", 
  "Pub / Bar Temático", "Adega Compartilhada", "Coworking / Sala de Reunião", 
  "Lavanderia OMO / Compartilhada", "Pet Place / Pet Care", "Mini Market 24h", "Car Wash", 
  "Carregador para Carro Elétrico", "Bicicletário / Oficina", "Brinquedoteca", 
  "Playground Outdoor", "Game Room / Salão de Jogos", "Cinema / Cine Lounge"
];

export const EmpreendimentosModule: React.FC = () => {
  const [empreendimentos, setEmpreendimentos] = useState<any[]>([]);
  const [construtoras, setConstrutoras] = useState<any[]>([]);
  const [cidadesList, setCidadesList] = useState<string[]>(DEFAULT_CIDADES);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCidadeFilter, setSelectedCidadeFilter] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  const [formNome, setFormNome] = useState("");
  const [formConstrutoraId, setFormConstrutoraId] = useState("");
  const [formCidade, setFormCidade] = useState("");
  const [formBairro, setFormBairro] = useState("");
  const [formSku, setFormSku] = useState("");
  const [skuManual, setSkuManual] = useState(false);
  const [formImagemUrl, setFormImagemUrl] = useState("");

  const [formDataEntrega, setFormDataEntrega] = useState("");
  const [formAreaLazerM2, setFormAreaLazerM2] = useState("");
  const [formValorizacaoAa, setFormValorizacaoAa] = useState("12");
  const [lazerSelecionado, setLazerSelecionado] = useState<string[]>([]);
  const [listaLazerCustom, setListaLazerCustom] = useState<string[]>(OPCOES_LAZER_PADRAO);
  const [novoItemLazer, setNovoItemLazer] = useState("");

  const [indicePre, setIndicePre] = useState("CUB");
  const [indicePos, setIndicePos] = useState("IPCA");
  const [jurosPos, setJurosPos] = useState("1.0");

  const [isAddingNewCity, setIsAddingNewCity] = useState(false);
  const [newCityInput, setNewCityInput] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (!skuManual && formNome && !editingItem) {
      const nomeClean = formNome.replace(/[^a-zA-Z0-9]/g, "").substring(0, 4).toUpperCase();
      const cidadeClean = formCidade ? formCidade.replace(/[^a-zA-Z0-9]/g, "").substring(0, 3).toUpperCase() : "EMP";
      const randomDigit = Math.floor(100 + Math.random() * 900);
      setFormSku(`EMP-${nomeClean}-${cidadeClean}-${randomDigit}`);
    }
  }, [formNome, formCidade, skuManual, editingItem]);

  const fetchData = async () => {
    setLoading(true);
    const { data: empData, error } = await supabase
      .from("empreendimentos")
      .select("*, construtoras(id, nome)")
      .order("nome");

    if (error) console.error("Erro ao buscar empreendimentos:", error);

    const { data: constData } = await supabase.from("construtoras").select("id, nome").order("nome");

    if (empData) setEmpreendimentos(empData);
    if (constData) setConstrutoras(constData);

    if (empData) {
      const cidadesExistentes = empData
        .map((e) => e.cidade)
        .filter((c): c is string => Boolean(c));
      
      const setUnico = new Set([...DEFAULT_CIDADES, ...cidadesExistentes]);
      setCidadesList(Array.from(setUnico).sort());
    }

    setLoading(false);
  };

  const handleOpenModal = (item?: any) => {
    setIsAddingNewCity(false);
    setNewCityInput("");
    setSkuManual(false);

    if (item) {
      setEditingItem(item);
      setFormNome(item.nome || "");
      setFormConstrutoraId(item.construtora_id || "");
      setFormCidade(item.cidade || "");
      setFormBairro(item.bairro || "");
      setFormSku(item.sku || "");
      setFormImagemUrl(item.imagem_url || "");
      setFormDataEntrega(item.data_entrega || "");
      setFormAreaLazerM2(item.area_lazer_m2 ? String(item.area_lazer_m2) : "");
      setFormValorizacaoAa(item.valorizacao_aa ? String(item.valorizacao_aa) : "12");
      setLazerSelecionado(Array.isArray(item.lazer) ? item.lazer : []);
      
      const regras = item.regras_correcao || {};
      setIndicePre(regras.indice_pre_chaves || "CUB");
      setIndicePos(regras.indice_pos_chaves || "IPCA");
      setJurosPos(regras.juros_pos_chaves_am || "1.0");
    } else {
      setEditingItem(null);
      setFormNome("");
      setFormConstrutoraId("");
      setFormCidade("");
      setFormBairro("");
      setFormSku("");
      setFormImagemUrl("");
      setFormDataEntrega("");
      setFormAreaLazerM2("");
      setFormValorizacaoAa("12");
      setLazerSelecionado([]);
      setIndicePre("CUB");
      setIndicePos("IPCA");
      setJurosPos("1.0");
    }
    setIsModalOpen(true);
  };

  const toggleLazer = (item: string) => {
    if (lazerSelecionado.includes(item)) {
      setLazerSelecionado(lazerSelecionado.filter((i) => i !== item));
    } else {
      setLazerSelecionado([...lazerSelecionado, item]);
    }
  };

  const handleAddCustomLazer = () => {
    if (!novoItemLazer.trim()) return;
    const itemFormatted = novoItemLazer.trim();
    if (!listaLazerCustom.includes(itemFormatted)) {
      setListaLazerCustom([...listaLazerCustom, itemFormatted]);
    }
    if (!lazerSelecionado.includes(itemFormatted)) {
      setLazerSelecionado([...lazerSelecionado, itemFormatted]);
    }
    setNovoItemLazer("");
  };

  const handleAddNewCity = () => {
    if (!newCityInput.trim()) return;
    const cidadeFormatada = newCityInput.trim();

    if (!cidadesList.includes(cidadeFormatada)) {
      const novaLista = [...cidadesList, cidadeFormatada].sort();
      setCidadesList(novaLista);
    }

    setFormCidade(cidadeFormatada);
    setNewCityInput("");
    setIsAddingNewCity(false);
  };

  const handleSave = async () => {
    if (!formNome.trim() || !formConstrutoraId) {
      alert("Preencha o Nome e selecione a Construtora.");
      return;
    }

    setLoading(true);

    const payload = {
      nome: formNome.trim(),
      construtora_id: formConstrutoraId,
      cidade: formCidade || null,
      bairro: formBairro || null,
      sku: formSku.trim() || null,
      imagem_url: formImagemUrl.trim() || null,
      data_entrega: formDataEntrega || null,
      area_lazer_m2: formAreaLazerM2 ? Number(formAreaLazerM2) : null,
      valorizacao_aa: formValorizacaoAa ? Number(formValorizacaoAa) : null,
      lazer: lazerSelecionado,
      regras_correcao: {
        indice_pre_chaves: indicePre,
        indice_pos_chaves: indicePos,
        juros_pos_chaves_am: jurosPos
      }
    };

    try {
      let result;
      if (editingItem) {
        result = await supabase
          .from("empreendimentos")
          .update(payload)
          .eq("id", editingItem.id)
          .select();
      } else {
        result = await supabase
          .from("empreendimentos")
          .insert([payload])
          .select();
      }

      if (result.error) {
        console.error("Erro no Supabase ao salvar:", result.error);
        alert(`Erro ao salvar no banco: ${result.error.message}`);
      } else {
        setIsModalOpen(false);
        await fetchData();
      }
    } catch (err: any) {
      console.error("Exceção não tratada ao salvar:", err);
      alert(`Erro inesperado: ${err.message || err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, nome: string) => {
    if (confirm(`Excluir o empreendimento "${nome}"?`)) {
      const { error } = await supabase.from("empreendimentos").delete().eq("id", id);
      if (error) {
        alert("Erro ao excluir: " + error.message);
      } else {
        fetchData();
      }
    }
  };

  const filteredEmpreendimentos = empreendimentos.filter((emp) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      emp.nome?.toLowerCase().includes(term) ||
      emp.cidade?.toLowerCase().includes(term) ||
      emp.construtoras?.nome?.toLowerCase().includes(term) ||
      emp.sku?.toLowerCase().includes(term);

    const matchesCity = selectedCidadeFilter ? emp.cidade === selectedCidadeFilter : true;

    return matchesSearch && matchesCity;
  });

  return (
    <div style={{ color: "#e4e4e7", fontFamily: "sans-serif", fontSize: "0.85rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", borderBottom: "1px solid #222", paddingBottom: "0.75rem" }}>
        <div>
          <h1 style={{ fontSize: "1.1rem", fontWeight: "600", color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Building2 style={{ width: "18px", height: "18px", color: "#c5a059" }} /> Empreendimentos
            <span style={{ fontSize: "0.7rem", backgroundColor: "#1f1f23", color: "#c5a059", border: "1px solid #27272a", padding: "0.1rem 0.4rem", borderRadius: "10px", marginLeft: "0.5rem" }}>
              {filteredEmpreendimentos.length} cadastrados
            </span>
          </h1>
        </div>

        <button
          onClick={() => handleOpenModal()}
          style={{ backgroundColor: "#c5a059", color: "#000", fontWeight: "600", padding: "0.4rem 0.8rem", borderRadius: "4px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "0.3rem", fontSize: "0.8rem" }}
        >
          <Plus style={{ width: "14px", height: "14px" }} /> Novo Empreendimento
        </button>
      </div>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.85rem" }}>
        <div style={{ position: "relative", flex: 2 }}>
          <Search style={{ position: "absolute", left: "0.6rem", top: "50%", transform: "translateY(-50%)", width: "14px", height: "14px", color: "#71717a" }} />
          <input
            type="text"
            placeholder="Buscar por nome, construtora, cidade ou SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: "100%", backgroundColor: "#121212", border: "1px solid #27272a", color: "#fff", padding: "0.4rem 0.6rem 0.4rem 2rem", borderRadius: "4px", fontSize: "0.8rem", boxSizing: "border-box" }}
          />
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <Filter style={{ width: "14px", height: "14px", color: "#71717a" }} />
          <select
            value={selectedCidadeFilter}
            onChange={(e) => setSelectedCidadeFilter(e.target.value)}
            style={{ width: "100%", backgroundColor: "#121212", border: "1px solid #27272a", color: "#a1a1aa", padding: "0.4rem 0.5rem", borderRadius: "4px", fontSize: "0.8rem" }}
          >
            <option value="">Todas as Cidades</option>
            {cidadesList.map((cid, idx) => (
              <option key={idx} value={cid}>{cid}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ backgroundColor: "#121212", border: "1px solid #222", borderRadius: "6px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "0.8rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#18181b", borderBottom: "1px solid #27272a", color: "#71717a", textTransform: "uppercase", fontSize: "0.7rem", letterSpacing: "0.05em" }}>
              <th style={{ padding: "0.55rem 0.8rem", fontWeight: "600", width: "50px" }}>Img</th>
              <th style={{ padding: "0.55rem 0.8rem", fontWeight: "600" }}>Empreendimento</th>
              <th style={{ padding: "0.55rem 0.8rem", fontWeight: "600" }}>Construtora</th>
              <th style={{ padding: "0.55rem 0.8rem", fontWeight: "600" }}>Localização / Cidade</th>
              <th style={{ padding: "0.55rem 0.8rem", fontWeight: "600" }}>Entrega</th>
              <th style={{ padding: "0.55rem 0.8rem", fontWeight: "600" }}>Lazer / Valorização</th>
              <th style={{ padding: "0.55rem 0.8rem", fontWeight: "600" }}>SKU</th>
              <th style={{ padding: "0.55rem 0.8rem", fontWeight: "600", textAlign: "right" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredEmpreendimentos.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "1.5rem", textAlign: "center", color: "#52525b", fontStyle: "italic" }}>
                  Nenhum empreendimento encontrado.
                </td>
              </tr>
            ) : (
              filteredEmpreendimentos.map((emp) => (
                <tr key={emp.id} style={{ borderBottom: "1px solid #1a1a1e" }}>
                  <td style={{ padding: "0.4rem 0.8rem" }}>
                    {emp.imagem_url ? (
                      <img src={emp.imagem_url} alt="" style={{ width: "32px", height: "32px", objectFit: "cover", borderRadius: "4px", border: "1px solid #27272a" }} />
                    ) : (
                      <div style={{ width: "32px", height: "32px", backgroundColor: "#18181b", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <ImageIcon style={{ width: "14px", height: "14px", color: "#52525b" }} />
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "0.5rem 0.8rem", fontWeight: "600", color: "#fff" }}>
                    {emp.nome}
                  </td>
                  <td style={{ padding: "0.5rem 0.8rem", color: "#d4d4d8" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Building style={{ width: "12px", height: "12px", color: "#c5a059" }} />
                      {emp.construtoras?.nome || <span style={{ color: "#52525b" }}>Sem Construtora</span>}
                    </div>
                  </td>
                  <td style={{ padding: "0.5rem 0.8rem", color: "#a1a1aa" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <MapPin style={{ width: "12px", height: "12px", color: "#71717a" }} />
                      {emp.cidade ? emp.cidade : <span style={{ color: "#52525b", fontStyle: "italic" }}>Não informada</span>}
                    </div>
                  </td>
                  <td style={{ padding: "0.5rem 0.8rem", color: "#d4d4d8" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.3rem" }}>
                      <Calendar style={{ width: "12px", height: "12px", color: "#c5a059" }} />
                      {emp.data_entrega ? emp.data_entrega : <span style={{ color: "#52525b", fontStyle: "italic" }}>—</span>}
                    </div>
                  </td>
                  <td style={{ padding: "0.5rem 0.8rem", color: "#a1a1aa" }}>
                    <div style={{ fontSize: "0.72rem" }}>
                      {emp.lazer && Array.isArray(emp.lazer) ? `${emp.lazer.length} itens` : "0 itens"}
                      {emp.valorizacao_aa ? <span style={{ color: "#22c55e", marginLeft: "0.4rem", fontWeight: "bold" }}>({emp.valorizacao_aa}% a.a.)</span> : ""}
                    </div>
                  </td>
                  <td style={{ padding: "0.5rem 0.8rem" }}>
                    {emp.sku ? (
                      <span style={{ fontFamily: "monospace", fontSize: "0.7rem", backgroundColor: "#1c1c20", color: "#c5a059", padding: "0.1rem 0.35rem", borderRadius: "3px", border: "1px solid #27272a" }}>
                        {emp.sku}
                      </span>
                    ) : (
                      <span style={{ color: "#3f3f46", fontSize: "0.75rem" }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "0.5rem 0.8rem", textAlign: "right" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.4rem" }}>
                      <button onClick={() => handleOpenModal(emp)} title="Editar" style={{ background: "none", border: "none", color: "#a1a1aa", cursor: "pointer", padding: "0.2rem" }}>
                        <Edit3 style={{ width: "14px", height: "14px" }} />
                      </button>
                      <button onClick={() => handleDelete(emp.id, emp.nome)} title="Excluir" style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "0.2rem" }}>
                        <Trash2 style={{ width: "14px", height: "14px" }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.85)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 999, padding: "1rem" }}>
          <div style={{ backgroundColor: "#121212", border: "1px solid #27272a", borderRadius: "8px", width: "100%", maxWidth: "680px", maxHeight: "90vh", overflowY: "auto", padding: "1.2rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
            
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #222", paddingBottom: "0.5rem" }}>
              <h3 style={{ margin: 0, color: "#fff", fontSize: "1rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <Building2 style={{ width: "18px", height: "18px", color: "#c5a059" }} />
                {editingItem ? "Editar Empreendimento" : "Cadastrar Empreendimento"}
              </h3>
              <button onClick={() => setIsModalOpen(false)} style={{ background: "none", border: "none", color: "#a1a1aa", cursor: "pointer" }}>
                <X style={{ width: "18px", height: "18px" }} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.68rem", fontWeight: "bold", color: "#c5a059", textTransform: "uppercase" }}>1. Informações Principais</span>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.7rem", marginBottom: "0.2rem" }}>Construtora Responsável *</label>
                  <select
                    value={formConstrutoraId}
                    onChange={(e) => setFormConstrutoraId(e.target.value)}
                    style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", color: "#fff", padding: "0.45rem", borderRadius: "4px", fontSize: "0.8rem" }}
                  >
                    <option value="">Selecione uma Construtora...</option>
                    {construtoras.map((c) => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.7rem", marginBottom: "0.2rem" }}>Nome do Empreendimento *</label>
                  <input
                    type="text"
                    placeholder="Ex: Azure Palm Club"
                    value={formNome}
                    onChange={(e) => setFormNome(e.target.value)}
                    style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", color: "#fff", padding: "0.45rem", borderRadius: "4px", fontSize: "0.8rem", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                    <label style={{ color: "#a1a1aa", fontSize: "0.7rem" }}>Cidade / Localização</label>
                    {!isAddingNewCity && (
                      <button type="button" onClick={() => setIsAddingNewCity(true)} style={{ background: "none", border: "none", color: "#c5a059", fontSize: "0.65rem", cursor: "pointer" }}>+ Cadastrar</button>
                    )}
                  </div>

                  {isAddingNewCity ? (
                    <div style={{ display: "flex", gap: "0.3rem" }}>
                      <input
                        type="text"
                        placeholder="Guaramirim - SC"
                        value={newCityInput}
                        onChange={(e) => setNewCityInput(e.target.value)}
                        style={{ flex: 1, backgroundColor: "#18181b", border: "1px solid #c5a059", color: "#fff", padding: "0.4rem", borderRadius: "4px", fontSize: "0.75rem" }}
                      />
                      <button type="button" onClick={handleAddNewCity} style={{ backgroundColor: "#c5a059", color: "#000", border: "none", padding: "0 0.4rem", borderRadius: "4px" }}><Check style={{ width: "12px", height: "12px" }} /></button>
                      <button type="button" onClick={() => setIsAddingNewCity(false)} style={{ backgroundColor: "#27272a", color: "#a1a1aa", border: "none", padding: "0 0.4rem", borderRadius: "4px" }}><X style={{ width: "12px", height: "12px" }} /></button>
                    </div>
                  ) : (
                    <select
                      value={formCidade}
                      onChange={(e) => setFormCidade(e.target.value)}
                      style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", color: "#fff", padding: "0.45rem", borderRadius: "4px", fontSize: "0.8rem" }}
                    >
                      <option value="">Selecione...</option>
                      {cidadesList.map((cid, idx) => (
                        <option key={idx} value={cid}>{cid}</option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.7rem", marginBottom: "0.2rem" }}>Bairro / Praia</label>
                  <input
                    type="text"
                    placeholder="Ex: Armação"
                    value={formBairro}
                    onChange={(e) => setFormBairro(e.target.value)}
                    style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", color: "#fff", padding: "0.45rem", borderRadius: "4px", fontSize: "0.8rem", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                    <label style={{ color: "#a1a1aa", fontSize: "0.7rem" }}>SKU (Editável)</label>
                    {skuManual && <span style={{ fontSize: "0.6rem", color: "#c5a059" }}>Manual</span>}
                  </div>
                  <input
                    type="text"
                    placeholder="EMP-AZUR-PEN"
                    value={formSku}
                    onChange={(e) => {
                      setSkuManual(true);
                      setFormSku(e.target.value.toUpperCase());
                    }}
                    style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", color: "#c5a059", padding: "0.45rem", borderRadius: "4px", fontSize: "0.8rem", fontFamily: "monospace", boxSizing: "border-box" }}
                  />
                </div>
              </div>

              {/* Componente de Imagem Integrado */}
              <EmpreendimentoImagens 
                empreendimentoId={editingItem?.id} 
                imagemAtual={formImagemUrl} 
                onImageUploaded={(url) => setFormImagemUrl(url)} 
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", backgroundColor: "#18181b", padding: "0.75rem", borderRadius: "6px", border: "1px solid #27272a" }}>
              <span style={{ fontSize: "0.68rem", fontWeight: "bold", color: "#c5a059", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <TrendingUp style={{ width: "13px", height: "13px" }} /> 2. Comparativos de Ativos & Previsões
              </span>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.68rem", marginBottom: "0.2rem" }}>Previsão de Entrega *</label>
                  <input
                    type="text"
                    placeholder="Ex: Dez/2028"
                    value={formDataEntrega}
                    onChange={(e) => setFormDataEntrega(e.target.value)}
                    style={{ width: "100%", backgroundColor: "#121212", border: "1px solid #27272a", color: "#fff", padding: "0.4rem", borderRadius: "4px", fontSize: "0.75rem", boxSizing: "border-box" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.68rem", marginBottom: "0.2rem" }}>Área de Lazer (m²)</label>
                  <input
                    type="number"
                    placeholder="Ex: 800"
                    value={formAreaLazerM2}
                    onChange={(e) => setFormAreaLazerM2(e.target.value)}
                    style={{ width: "100%", backgroundColor: "#121212", border: "1px solid #27272a", color: "#fff", padding: "0.4rem", borderRadius: "4px", fontSize: "0.75rem" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.68rem", marginBottom: "0.2rem" }}>Valorização (% a.a.)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ex: 12"
                    value={formValorizacaoAa}
                    onChange={(e) => setFormValorizacaoAa(e.target.value)}
                    style={{ width: "100%", backgroundColor: "#121212", border: "1px solid #27272a", color: "#22c55e", fontWeight: "bold", padding: "0.4rem", borderRadius: "4px", fontSize: "0.75rem" }}
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.68rem", fontWeight: "bold", color: "#c5a059", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Sparkles style={{ width: "13px", height: "13px" }} /> 3. Estrutura & Área de Lazer ({lazerSelecionado.length} selecionados)
              </span>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.4rem", maxHeight: "180px", overflowY: "auto", padding: "0.5rem", border: "1px solid #27272a", borderRadius: "4px", backgroundColor: "#18181b" }}>
                {listaLazerCustom.map((item) => {
                  const checked = lazerSelecionado.includes(item);
                  return (
                    <div
                      key={item}
                      onClick={() => toggleLazer(item)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        padding: "0.3rem 0.5rem",
                        borderRadius: "3px",
                        backgroundColor: checked ? "rgba(197, 160, 89, 0.15)" : "#121212",
                        border: checked ? "1px solid #c5a059" : "1px solid #27272a",
                        cursor: "pointer"
                      }}
                    >
                      {checked ? <CheckSquare style={{ width: "12px", height: "12px", color: "#c5a059" }} /> : <Square style={{ width: "12px", height: "12px", color: "#71717a" }} />}
                      <span style={{ fontSize: "0.7rem", color: checked ? "#fff" : "#a1a1aa" }}>{item}</span>
                    </div>
                  );
                })}
              </div>

              <div style={{ display: "flex", gap: "0.4rem" }}>
                <input
                  type="text"
                  placeholder="Cadastrar novo item de lazer..."
                  value={novoItemLazer}
                  onChange={(e) => setNovoItemLazer(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddCustomLazer(); } }}
                  style={{ flex: 1, backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "4px", padding: "0.35rem 0.5rem", color: "#fff", fontSize: "0.75rem" }}
                />
                <button type="button" onClick={handleAddCustomLazer} style={{ backgroundColor: "#27272a", border: "1px solid #3f3f46", color: "#fff", padding: "0.35rem 0.7rem", borderRadius: "4px", fontSize: "0.72rem", cursor: "pointer" }}>
                  + Adicionar
                </button>
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.68rem", fontWeight: "bold", color: "#c5a059", textTransform: "uppercase", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <ShieldCheck style={{ width: "13px", height: "13px" }} /> 4. Índices Financeiros
              </span>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.68rem", marginBottom: "0.2rem" }}>Índice Pré-Chaves</label>
                  <input type="text" value={indicePre} onChange={(e) => setIndicePre(e.target.value)} style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", color: "#fff", padding: "0.4rem", borderRadius: "4px", fontSize: "0.75rem" }} />
                </div>
                <div>
                  <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.68rem", marginBottom: "0.2rem" }}>Índice Pós-Chaves</label>
                  <input type="text" value={indicePos} onChange={(e) => setIndicePos(e.target.value)} style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", color: "#fff", padding: "0.4rem", borderRadius: "4px", fontSize: "0.75rem" }} />
                </div>
                <div>
                  <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.68rem", marginBottom: "0.2rem" }}>Juros Pós (% a.m.)</label>
                  <input type="text" value={jurosPos} onChange={(e) => setJurosPos(e.target.value)} style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", color: "#fff", padding: "0.4rem", borderRadius: "4px", fontSize: "0.75rem" }} />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: "0.5rem", borderTop: "1px solid #222", paddingTop: "0.75rem" }}>
              <button onClick={() => setIsModalOpen(false)} style={{ backgroundColor: "transparent", color: "#a1a1aa", border: "1px solid #27272a", padding: "0.45rem 1rem", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem" }}>
                Cancelar
              </button>
              <button onClick={handleSave} disabled={loading} style={{ backgroundColor: "#c5a059", color: "#000", fontWeight: "bold", border: "none", padding: "0.45rem 1.2rem", borderRadius: "4px", cursor: "pointer", fontSize: "0.75rem" }}>
                {loading ? "Salvando..." : "Salvar Empreendimento"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};