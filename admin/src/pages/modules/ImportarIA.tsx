import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { Sparkles, CheckCircle2, AlertCircle, Loader2, FileJson, ArrowRight, Building2, Trash2, History } from "lucide-react";

export const ImportarIAModule: React.FC = () => {
  const [jsonInput, setJsonInput] = useState("");
  const [parsedData, setParsedData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [empreendimentos, setEmpreendimentos] = useState<any[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [limparAntes, setLimparAntes] = useState(false);
  const [importStatus, setImportStatus] = useState<{ success?: string; error?: string } | null>(null);

  // Mês e Ano de referência para guardar o histórico de preços
  const currentDate = new Date();
  const [mesReferencia, setMesReferencia] = useState<number>(currentDate.getMonth() + 1);
  const [anoReferencia, setAnoReferencia] = useState<number>(currentDate.getFullYear());

  useEffect(() => {
    fetchEmpreendimentos();
  }, []);

  const fetchEmpreendimentos = async () => {
    const { data } = await supabase.from("empreendimentos").select("id, nome, cidade, sku");
    if (data) setEmpreendimentos(data);
  };

  const sanitizeJsonString = (raw: string) => {
    return raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
  };

  const handleParseJson = () => {
    setImportStatus(null);
    try {
      const cleanJson = sanitizeJsonString(jsonInput);
      if (!cleanJson) {
        setImportStatus({ error: "Cole o texto JSON gerado antes de validar." });
        return;
      }

      const data = JSON.parse(cleanJson);

      if (!data.unidades || !Array.isArray(data.unidades)) {
        setImportStatus({ error: "Formato inválido: O JSON precisa conter a lista 'unidades'." });
        return;
      }

      setParsedData(data);

      if (data.empreendimento?.nome) {
        const empMatch = empreendimentos.find(
          (e) => e.nome.toLowerCase().trim() === data.empreendimento.nome.toLowerCase().trim()
        );
        if (empMatch) setSelectedEmpId(empMatch.id);
      }
    } catch (err: any) {
      setImportStatus({ error: "Erro de sintaxe no JSON. Certifique-se de ter copiado a resposta completa." });
      setParsedData(null);
    }
  };

  const handleExecuteImport = async () => {
    if (!parsedData || !selectedEmpId) {
      alert("Selecione um empreendimento válido para vincular estas unidades.");
      return;
    }

    setLoading(true);
    setImportStatus(null);

    try {
      const pctAtoCabecalho = parsedData.regras_cabecalho?.percentual_ato || null;

      // 1. Monta as unidades para a tabela principal (estoque ativo)
      const unidadesParaInserir = parsedData.unidades.map((u: any) => {
        const cod = (u.codigo_unidade || u.numero || "S/N").toString().trim();
        const torreClean = (u.torre || "Torre A").trim();
        const valorTabela = parseFloat(u.valor_tabela) || 0;

        let fluxo = u.fluxo_dados || {};
        if ((!fluxo.ato || fluxo.ato === 0) && pctAtoCabecalho && valorTabela > 0) {
          fluxo.ato = (valorTabela * pctAtoCabecalho) / 100;
        }

        return {
          empreendimento_id: selectedEmpId,
          torre: torreClean,
          codigo_unidade: cod,
          numero_unidade: cod,
          numero: cod,
          sku: `${selectedEmpId}-${torreClean}-${cod}`.replace(/\s+/g, ""),
          tipologia: u.tipologia || "Studio",
          area_privativa: parseFloat(u.area_privativa) || null,
          vagas: parseInt(u.vagas) || 0,
          valor_tabela: valorTabela,
          status: (u.status || "disponivel").toLowerCase(),
          fluxo_dados: fluxo,
        };
      });

      // 2. Se marcada a opção, remove o estoque ativo atual
      if (limparAntes) {
        const { error: deleteError } = await supabase
          .from("unidades")
          .delete()
          .eq("empreendimento_id", selectedEmpId);

        if (deleteError) {
          throw new Error("Erro ao limpar estoque antigo: " + deleteError.message);
        }
      }

      // 3. Atualiza/Insere o estoque ativo vigente
      let { data: unidadesGravadas, error } = await supabase
        .from("unidades")
        .upsert(unidadesParaInserir, { onConflict: "sku" })
        .select("id, codigo_unidade");

      if (error && error.message.includes("ON CONFLICT")) {
        const insertRes = await supabase.from("unidades").insert(unidadesParaInserir).select("id, codigo_unidade");
        error = insertRes.error;
        unidadesGravadas = insertRes.data;
      }

      if (error) {
        setImportStatus({ error: "Erro ao gravar unidades no banco: " + error.message });
        return;
      }

      // 4. GRAVA O HISTÓRICO DE PREÇOS (SNAPSHOT HISTÓRICO)
      const historicoParaInserir = unidadesParaInserir.map((u: any) => {
        const matchGrad = unidadesGravadas?.find((ug: any) => ug.codigo_unidade === u.codigo_unidade);
        return {
          empreendimento_id: selectedEmpId,
          unidade_id: matchGrad?.id || null,
          codigo_unidade: u.codigo_unidade,
          mes_referencia: Number(mesReferencia),
          ano_referencia: Number(anoReferencia),
          valor_tabela: u.valor_tabela,
          entrada_sugerida: u.fluxo_dados?.ato || 0,
          fluxo_dados: u.fluxo_dados
        };
      });

      const { error: histError } = await supabase
        .from("historico_tabelas_preco")
        .insert(historicoParaInserir);

      if (histError) {
        console.warn("Aviso: Falha ao registrar histórico de preços:", histError.message);
      }

      setImportStatus({
        success: `Sucesso! ${unidadesParaInserir.length} unidades atualizadas e histórico salvo para ${mesReferencia}/${anoReferencia}.`,
      });
      setJsonInput("");
      setParsedData(null);

    } catch (err: any) {
      setImportStatus({ error: err.message || "Erro inesperado ao processar a importação." });
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val || 0);
  };

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <Sparkles style={{ color: "#c5a059" }} /> Importador Inteligente por IA
        </h1>
        <p style={{ color: "#71717a", fontSize: "0.875rem", margin: "0.25rem 0 0 0" }}>
          Valide a estrutura e grave o estoque com histórico de valorização mensal
        </p>
      </div>

      {importStatus?.error && (
        <div style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", color: "#ef4444", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <AlertCircle style={{ width: "18px", height: "18px" }} /> {importStatus.error}
        </div>
      )}

      {importStatus?.success && (
        <div style={{ backgroundColor: "rgba(34, 197, 94, 0.1)", border: "1px solid #22c55e", color: "#22c55e", padding: "1rem", borderRadius: "8px", marginBottom: "1.5rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <CheckCircle2 style={{ width: "18px", height: "18px" }} /> {importStatus.success}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        {/* ENTRADA */}
        <div style={{ backgroundColor: "#121212", border: "1px solid #222", borderRadius: "8px", padding: "1.25rem" }}>
          <h2 style={{ color: "#c5a059", fontSize: "1rem", margin: "0 0 0.75rem 0", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <FileJson style={{ width: "18px", height: "18px" }} /> Resposta JSON da IA
          </h2>

          <textarea
            rows={18}
            placeholder="Cole aqui o resultado fornecido pela IA..."
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", color: "#a1a1aa", padding: "0.75rem", borderRadius: "6px", fontFamily: "monospace", fontSize: "0.8rem", resize: "vertical", boxSizing: "border-box" }}
          />

          <button
            onClick={handleParseJson}
            style={{ width: "100%", marginTop: "1rem", backgroundColor: "#27272a", color: "#fff", fontWeight: "bold", padding: "0.75rem", borderRadius: "6px", border: "1px solid #3f3f46", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}
          >
            Validar e Ler Estrutura <ArrowRight style={{ width: "16px", height: "16px" }} />
          </button>
        </div>

        {/* PREVISUALIZACAO E ACOES */}
        <div style={{ backgroundColor: "#121212", border: "1px solid #222", borderRadius: "8px", padding: "1.25rem" }}>
          <h2 style={{ color: "#c5a059", fontSize: "1rem", margin: "0 0 0.75rem 0", display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Building2 style={{ width: "18px", height: "18px" }} /> Mapeamento e Destino
          </h2>

          {!parsedData ? (
            <div style={{ height: "300px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", color: "#71717a", border: "1px dashed #27272a", borderRadius: "6px" }}>
              <FileJson style={{ width: "36px", height: "36px", marginBottom: "0.5rem" }} />
              Cole e valide o JSON à esquerda para visualizar e gravar as unidades
            </div>
          ) : (
            <div>
              <div style={{ marginBottom: "1rem" }}>
                <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.8rem", marginBottom: "0.3rem" }}>
                  Vincular ao Empreendimento *
                </label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #c5a059", color: "#fff", padding: "0.6rem", borderRadius: "6px", boxSizing: "border-box" }}
                >
                  <option value="">Selecione o Empreendimento Alvo...</option>
                  {empreendimentos.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.nome} ({emp.cidade || "N/I"})
                    </option>
                  ))}
                </select>
              </div>

              {/* MÊS E ANO DE REFERÊNCIA DA TABELA */}
              <div style={{ backgroundColor: "#18181b", padding: "0.75rem", borderRadius: "6px", marginBottom: "1rem", border: "1px solid #27272a" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", color: "#c5a059", fontSize: "0.75rem", fontWeight: "bold", marginBottom: "0.5rem" }}>
                  <History style={{ width: "14px", height: "14px" }} /> Referência da Tabela (Mês/Ano para Histórico)
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem" }}>
                  <div>
                    <label style={{ fontSize: "0.7rem", color: "#71717a" }}>Mês:</label>
                    <select
                      value={mesReferencia}
                      onChange={(e) => setMesReferencia(Number(e.target.value))}
                      style={{ width: "100%", backgroundColor: "#121212", border: "1px solid #27272a", color: "#fff", padding: "0.3rem", borderRadius: "4px", fontSize: "0.75rem" }}
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>{m.toString().padStart(2, "0")}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: "0.7rem", color: "#71717a" }}>Ano:</label>
                    <input
                      type="number"
                      value={anoReferencia}
                      onChange={(e) => setAnoReferencia(Number(e.target.value))}
                      style={{ width: "100%", backgroundColor: "#121212", border: "1px solid #27272a", color: "#fff", padding: "0.3rem", borderRadius: "4px", fontSize: "0.75rem", boxSizing: "border-box" }}
                    />
                  </div>
                </div>
              </div>

              {/* OPÇÃO DE LIMPEZA PRÉVIA */}
              <div style={{ marginBottom: "1rem", backgroundColor: "#18181b", padding: "0.75rem", borderRadius: "6px", border: "1px solid #27272a" }}>
                <label style={{ color: "#ef4444", fontSize: "0.8rem", display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontWeight: "bold" }}>
                  <input
                    type="checkbox"
                    checked={limparAntes}
                    onChange={(e) => setLimparAntes(e.target.checked)}
                  />
                  <Trash2 style={{ width: "14px", height: "14px" }} /> Substituir estoque ativo atual deste empreendimento
                </label>
              </div>

              <div style={{ backgroundColor: "#18181b", padding: "0.75rem", borderRadius: "6px", marginBottom: "1rem", fontSize: "0.85rem", color: "#d4d4d8" }}>
                <div><strong>Empreendimento Lido:</strong> {parsedData.empreendimento?.nome || "N/I"}</div>
                <div><strong>Total Mapeado:</strong> {parsedData.unidades.length} unidades</div>
              </div>

              <div style={{ maxHeight: "180px", overflowY: "auto", border: "1px solid #222", borderRadius: "6px", padding: "0.5rem", marginBottom: "1rem" }}>
                {parsedData.unidades.map((u: any, idx: number) => {
                  const valorTab = parseFloat(u.valor_tabela) || 0;
                  const pctAto = parsedData.regras_cabecalho?.percentual_ato;
                  const atoCalculado = u.fluxo_dados?.ato || (pctAto ? (valorTab * pctAto) / 100 : 0);

                  return (
                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0.6rem", borderBottom: "1px solid #1f1f23", fontSize: "0.75rem", color: "#a1a1aa" }}>
                      <span>
                        <strong style={{ color: "#fff" }}>Unid {u.codigo_unidade || u.numero}</strong> ({u.tipologia || "Studio"})
                      </span>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ color: "#22c55e", fontWeight: "bold", display: "block" }}>{formatCurrency(valorTab)}</span>
                        <span style={{ fontSize: "0.65rem", color: "#71717a" }}>Ato: {formatCurrency(atoCalculado)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleExecuteImport}
                disabled={loading || !selectedEmpId}
                style={{ width: "100%", backgroundColor: selectedEmpId ? "#c5a059" : "#3f3f46", color: "#000", fontWeight: "bold", padding: "0.75rem", borderRadius: "6px", border: "none", cursor: selectedEmpId ? "pointer" : "not-allowed", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}
              >
                {loading ? <Loader2 style={{ animation: "spin 1s linear infinite", width: "18px", height: "18px" }} /> : "Gravar Estoque e Salvar Histórico"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};