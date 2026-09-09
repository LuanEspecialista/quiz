import React, { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import { deliveryDateIso, normalizeDeliveryMonth } from "../../lib/deliveryDate";
import { parseStandardTypology } from "../../lib/realEstateStandard";
import { Sparkles, CheckCircle2, AlertCircle, Loader2, FileJson, ArrowRight, Building2, Trash2, History, Home, ListChecks } from "lucide-react";

const UnidadesImporter: React.FC = () => {
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
      .replace(/^\uFEFF/, "")
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
  };

  const parseBrazilNumber = (value: unknown) => {
    if (typeof value === "number") return Number.isFinite(value) ? value : 0;
    const original = String(value ?? "").toLowerCase();
    const multiplier = /\bmilh(?:ão|ao|ões|oes)\b/.test(original) ? 1_000_000 : /\bmil\b/.test(original) ? 1_000 : 1;
    const raw = original.replace(/r\$|brl|reais?|\s/g, "").trim();
    if (!raw) return 0;
    const numeric = raw.replace(/[^0-9,.-]/g, "");
    const hasComma = numeric.includes(",");
    const dots = (numeric.match(/\./g) || []).length;
    let normalized = numeric;
    if (hasComma) normalized = numeric.replace(/\./g, "").replace(",", ".");
    else if (dots > 1 || (dots === 1 && /^-?\d{1,3}\.\d{3}$/.test(numeric))) normalized = numeric.replace(/\./g, "");
    const result = Number(normalized);
    return Number.isFinite(result) ? result * multiplier : 0;
  };

  const firstPresent = (...values: unknown[]) => values.find((value) => value !== undefined && value !== null && String(value).trim() !== "");

  const phaseTotal = (phase: any) => {
    const explicit = parseBrazilNumber(firstPresent(phase?.valor_total, phase?.total, phase?.valor));
    if (explicit > 0) return explicit;
    const quantity = parseBrazilNumber(firstPresent(phase?.quantidade, phase?.qtd, 1));
    const unitValue = parseBrazilNumber(firstPresent(phase?.valor_unitario, phase?.valor_parcela));
    return quantity > 0 && unitValue > 0 ? quantity * unitValue : 0;
  };

  const priceFromFlow = (phases: any[]) => {
    if (!Array.isArray(phases) || phases.length === 0) return 0;
    const totals = phases.map(phaseTotal);
    return totals.every((value) => value > 0) ? totals.reduce((sum, value) => sum + value, 0) : 0;
  };

  // Aceita tanto o JSON compacto antigo quanto o JSON técnico dos prompts atuais.
  const normalizeUnit = (unit: any, index: number) => {
    const identification = unit.identificacao || {};
    const product = unit.produto || {};
    const commercial = unit.comercial || {};
    const rawTypology = unit.tipologia || product.tipologia_original || product.tipologia_padrao || identification.tipo_ativo || "";
    const typology = parseStandardTypology(rawTypology, Number(unit.quartos ?? product.dormitorios ?? product.quartos ?? 0));
    const alternatives = commercial.alternativas_fluxo || unit.alternativas_fluxo || [];
    const firstAlternative = alternatives?.[0] || {};
    const phases = firstAlternative.fases || unit.fluxo_dados?.condicoes?.etapas || unit.fluxo_dados?.fases || commercial.fases || [];
    const flow = { ...(unit.fluxo_dados || {}), alternativas_fluxo: alternatives, fases: phases };
    if (!flow.percentual_ate_chaves && firstAlternative.percentual_ate_chaves) flow.percentual_ate_chaves = firstAlternative.percentual_ate_chaves;
    if (!flow.percentual_pos_chaves && firstAlternative.percentual_pos_chaves) flow.percentual_pos_chaves = firstAlternative.percentual_pos_chaves;
    if (!flow.tipo && firstAlternative.modalidade) flow.tipo = firstAlternative.modalidade;
    const firstValue = (names: string[]) => phases.find((phase: any) => names.some((name) => String(phase.momento || phase.nome || "").toLowerCase().includes(name)));
    const ato = firstValue(["ato", "entrada", "reserva"]);
    if (ato && !flow.ato) flow.ato = parseBrazilNumber(ato.valor_total || ato.valor_unitario);
    const directPrice = firstPresent(
      unit.valor_tabela, unit.preco_tabela, unit.preco, unit.preço, unit.preco_venda, unit.valor_total, unit.valor_imovel,
      commercial.valor_tabela, commercial.preco_tabela, commercial.preco, commercial.preço, commercial.preco_venda,
      commercial.valor_total, commercial.valor_imovel, commercial.valor_atual, commercial.valor_promocional,
      commercial.precos?.valor_tabela, commercial.precos?.valor_atual,
    );
    const parsedDirectPrice = parseBrazilNumber(directPrice);
    const calculatedPrice = parsedDirectPrice > 0 ? 0 : priceFromFlow(phases);
    const code = firstPresent(
      unit.codigo_unidade, unit.numero_unidade, unit.numero,
      unit.unidade, unit.apto, unit.apartamento,
      identification.numero, identification.codigo, identification.unidade, identification.apto, identification.sku_sugerido,
    );
    return {
      ...unit,
      codigo_unidade: code ? String(code).trim() : "",
      torre: unit.torre || identification.torre || identification.bloco || "Única",
      tipologia: rawTypology || typology.label,
      quartos: Number(unit.quartos ?? product.dormitorios ?? typology.dormitorios ?? 0),
      suites: Number(unit.suites ?? product.suites ?? typology.suites ?? 0),
      area_privativa: unit.area_privativa ?? product.area_privativa_m2,
      vagas: unit.vagas ?? (Array.isArray(product.vagas) ? product.vagas.length : product.vagas),
      valor_tabela: parsedDirectPrice || calculatedPrice || 0,
      status: unit.status ?? commercial.status ?? "disponivel",
      fluxo_dados: flow,
      _tipology: typology,
      _sourceIndex: index + 1,
      _priceSource: parsedDirectPrice > 0 ? "documento" : calculatedPrice > 0 ? "soma_das_etapas" : "ausente",
    };
  };

  const unitIssues = (unit: any) => {
    const issues: string[] = [];
    if (!String(unit.codigo_unidade || "").trim()) issues.push("código da unidade");
    if (parseBrazilNumber(unit.valor_tabela) <= 0) issues.push("valor total da tabela");
    return issues;
  };

  const normalizedStatus = (value: unknown) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  const summaryIssues = (data: any, units: any[]) => {
    const summary = data.resumo_oficial || data.validacao?.resumo_oficial;
    if (!summary) return ["O JSON não separou o resumo oficial impresso da contagem extraída. Gere novamente com o prompt atualizado antes de importar."];
    if (summary.encontrado === false) return [];
    const officialTotal = Number(summary.total ?? summary.quantidade_total);
    const officialAvailable = Number(summary.disponiveis ?? summary.por_status?.Disponivel ?? summary.por_status?.["Disponível"]);
    const officialReserved = Number(summary.reservadas ?? summary.por_status?.Reservada);
    const extractedAvailable = units.filter((unit) => normalizedStatus(unit.status) === "disponivel").length;
    const extractedReserved = units.filter((unit) => normalizedStatus(unit.status) === "reservada").length;
    const issues: string[] = [];
    if (Number.isFinite(officialTotal) && officialTotal !== units.length) issues.push(`total oficial ${officialTotal}, mas ${units.length} linhas foram extraídas`);
    if (Number.isFinite(officialAvailable) && officialAvailable !== extractedAvailable) issues.push(`disponíveis no resumo ${officialAvailable}, mas extraídas ${extractedAvailable}`);
    if (Number.isFinite(officialReserved) && officialReserved !== extractedReserved) issues.push(`reservadas no resumo ${officialReserved}, mas extraídas ${extractedReserved}`);
    return issues;
  };

  const updateParsedUnit = (index: number, changes: Record<string, unknown>) => {
    setParsedData((current: any) => current ? {
      ...current,
      unidades: current.unidades.map((unit: any, unitIndex: number) => unitIndex === index ? { ...unit, ...changes } : unit),
    } : current);
    setImportStatus(null);
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

      if (data.status === "PENDENTE_INFORMACAO") {
        const perguntas = Array.isArray(data.perguntas)
          ? data.perguntas.map((item: any) => item.pergunta || item.motivo).filter(Boolean)
          : [];
        setParsedData(null);
        setImportStatus({
          error: perguntas.length
            ? `A IA identificou informações pendentes: ${perguntas.join(" ")}`
            : "A IA identificou informações pendentes. Responda às perguntas antes de gerar o JSON de importação.",
        });
        return;
      }

      if (data.status && data.status !== "PRONTO_PARA_IMPORTAR") {
        setParsedData(null);
        setImportStatus({ error: "Status de importação inválido. Use um JSON com status PRONTO_PARA_IMPORTAR." });
        return;
      }

      const readySource = data.unidades || data.estoque || data.imoveis || data.dados?.unidades;
      const pendingSource = Array.isArray(data.unidades_pendentes) ? data.unidades_pendentes : [];
      const sourceUnits = [...(Array.isArray(readySource) ? readySource : []), ...pendingSource];
      if (sourceUnits.length === 0) {
        setImportStatus({ error: "Formato inválido: O JSON precisa conter a lista 'unidades'." });
        return;
      }
      const normalizedUnits = sourceUnits.map(normalizeUnit);
      const invalid = normalizedUnits.filter((unit: any) => unitIssues(unit).length > 0);
      const reconciliationIssues = summaryIssues(data, normalizedUnits);
      const normalizedData = { ...data, unidades: normalizedUnits, _summaryIssues: reconciliationIssues };
      setParsedData(normalizedData);
      if (reconciliationIssues.length) {
        setImportStatus({ error: `Importação bloqueada por divergência de contagem: ${reconciliationIssues.join("; ")}. Nenhuma unidade será gravada até a extração fechar com o resumo oficial.` });
      } else if (invalid.length) {
        const examples = invalid.slice(0, 5).map((unit: any) => `linha ${unit._sourceIndex}: ${unitIssues(unit).join(" e ")}`).join("; ");
        const ready = normalizedUnits.length - invalid.length;
        setImportStatus({ error: `${invalid.length} unidade(s) ficaram pendentes (${examples}${invalid.length > 5 ? "; …" : ""}). ${ready > 0 ? `${ready} unidade(s) válidas podem ser gravadas sem inventar os dados ausentes.` : "Não há unidade válida para gravar."}` });
      } else {
        const calculated = normalizedUnits.filter((unit: any) => unit._priceSource === "soma_das_etapas").length;
        setImportStatus(calculated ? { success: `${normalizedUnits.length} unidades reconhecidas. Em ${calculated}, o valor total foi conciliado pela soma completa das etapas do fluxo.` } : null);
      }

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

    const invalid = parsedData.unidades.filter((unit: any) => unitIssues(unit).length > 0);
    const validUnits = parsedData.unidades.filter((unit: any) => unitIssues(unit).length === 0);
    if (parsedData._summaryIssues?.length) {
      setImportStatus({ error: `Corrija a divergência com o resumo oficial antes de importar: ${parsedData._summaryIssues.join("; ")}.` });
      return;
    }
    if (!validUnits.length) {
      setImportStatus({ error: "Nenhuma unidade possui código e valor total válidos. Nada foi gravado." });
      return;
    }
    if (invalid.length && limparAntes) {
      setImportStatus({ error: "Não é seguro substituir o estoque enquanto existem unidades pendentes. Desmarque “Substituir estoque” para gravar apenas as válidas." });
      return;
    }

    setLoading(true);
    setImportStatus(null);

    try {
      const pctAtoCabecalho = parsedData.regras_cabecalho?.percentual_ato || null;

      // 1. Monta as unidades para a tabela principal (estoque ativo)
      const unidadesParaInserir = validUnits.map((u: any) => {
        const cod = (u.codigo_unidade || u.numero || "S/N").toString().trim();
        const torreClean = String(u.torre).trim();
        const valorTabela = parseBrazilNumber(u.valor_tabela);

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
          tipologia: u.tipologia,
          tipologia_dados: {
            original: u.tipologia,
            dormitorios: u._tipology?.dormitorios || Number(u.quartos) || 0,
            suites: u.suites || u._tipology?.suites || 0,
            studio: Boolean(u._tipology?.studio),
          },
          quartos: Number(u.quartos) || u._tipology?.dormitorios || 0,
          area_privativa: parseBrazilNumber(u.area_privativa) || null,
          vagas: parseBrazilNumber(u.vagas) || 0,
          valor_tabela: valorTabela,
          status: (u.status || "disponivel").toLowerCase(),
          fluxo_dados: { ...fluxo, tipologia_extraida: { dormitorios: u._tipology?.dormitorios || 0, suites: u.suites || u._tipology?.suites || 0 } },
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
        success: histError
          ? `${unidadesParaInserir.length} unidades válidas atualizadas. O histórico não foi salvo: ${histError.message}`
          : `Sucesso! ${unidadesParaInserir.length} unidades válidas atualizadas e histórico salvo para ${mesReferencia}/${anoReferencia}.${invalid.length ? ` ${invalid.length} pendente(s) não foram gravadas por falta de código ou preço.` : ""}`,
      });
      if (!invalid.length) setJsonInput("");
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
                    disabled={parsedData.unidades.some((unit: any) => unitIssues(unit).length > 0)}
                    onChange={(e) => setLimparAntes(e.target.checked)}
                  />
                  <Trash2 style={{ width: "14px", height: "14px" }} /> Substituir estoque ativo atual deste empreendimento
                </label>
                {parsedData.unidades.some((unit: any) => unitIssues(unit).length > 0) && <small style={{ display: "block", color: "#fbbf24", marginTop: 6 }}>Desativado para proteger o estoque: existem unidades pendentes que não serão gravadas.</small>}
              </div>

              <div style={{ backgroundColor: "#18181b", padding: "0.75rem", borderRadius: "6px", marginBottom: "1rem", fontSize: "0.85rem", color: "#d4d4d8" }}>
                <div><strong>Empreendimento Lido:</strong> {parsedData.empreendimento?.nome || "N/I"}</div>
                <div><strong>Total Mapeado:</strong> {parsedData.unidades.length} unidades</div>
                <div><strong>Prontas:</strong> {parsedData.unidades.filter((unit: any) => unitIssues(unit).length === 0).length} · <strong>Para revisar:</strong> {parsedData.unidades.filter((unit: any) => unitIssues(unit).length > 0).length}</div>
                {parsedData.resumo_oficial?.encontrado !== false && <div><strong>Resumo oficial:</strong> {parsedData.resumo_oficial?.total ?? parsedData.resumo_oficial?.quantidade_total ?? "não informado"} total · {parsedData.resumo_oficial?.disponiveis ?? "?"} disponíveis · {parsedData.resumo_oficial?.reservadas ?? "?"} reservadas</div>}
              </div>

              <div style={{ maxHeight: "310px", overflowY: "auto", border: "1px solid #222", borderRadius: "6px", padding: "0.5rem", marginBottom: "1rem" }}>
                {parsedData.unidades.map((u: any, idx: number) => {
                  const valorTab = parseBrazilNumber(u.valor_tabela);
                  const pctAto = parsedData.regras_cabecalho?.percentual_ato;
                  const atoCalculado = u.fluxo_dados?.ato || (pctAto ? (valorTab * pctAto) / 100 : 0);
                  const issues = unitIssues(u);

                  return (
                    <div key={idx} style={{ padding: "0.55rem 0.6rem", borderBottom: "1px solid #1f1f23", fontSize: "0.75rem", color: "#a1a1aa", background: issues.length ? "rgba(239,68,68,.07)" : "transparent" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: issues.length ? 7 : 0 }}>
                        <span><strong style={{ color: "#fff" }}>Linha {u._sourceIndex || idx + 1}</strong> · {u.tipologia || "Tipologia não informada"}</span>
                        <span style={{ color: issues.length ? "#f87171" : "#22c55e", fontWeight: 700 }}>{issues.length ? `Revisar: ${issues.join(" e ")}` : "Pronta"}</span>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "minmax(90px,1fr) minmax(140px,1.4fr)", gap: 7 }}>
                        <label style={{ color: "#71717a" }}>Código<input value={u.codigo_unidade || ""} onChange={(event) => updateParsedUnit(idx, { codigo_unidade: event.target.value })} placeholder="Ex.: 401" style={{ width: "100%", boxSizing: "border-box", marginTop: 3, background: "#101012", color: "#fff", border: `1px solid ${!u.codigo_unidade ? "#ef4444" : "#34343a"}`, borderRadius: 4, padding: "6px 7px" }}/></label>
                        <label style={{ color: "#71717a" }}>Valor total (R$)<input value={u.valor_tabela || ""} onChange={(event) => updateParsedUnit(idx, { valor_tabela: event.target.value, _priceSource: "revisado_manualmente" })} placeholder="Ex.: 850000" inputMode="decimal" style={{ width: "100%", boxSizing: "border-box", marginTop: 3, background: "#101012", color: "#fff", border: `1px solid ${valorTab <= 0 ? "#ef4444" : "#34343a"}`, borderRadius: 4, padding: "6px 7px" }}/></label>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 5, fontSize: "0.65rem", color: "#71717a" }}>
                        <span>{u._priceSource === "soma_das_etapas" ? "Valor conciliado pela soma das etapas" : u._priceSource === "revisado_manualmente" ? "Valor revisado manualmente" : u._priceSource === "ausente" ? "Valor não localizado" : "Valor lido do documento"}</span>
                        <span>Ato: {formatCurrency(atoCalculado)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleExecuteImport}
                disabled={loading || !selectedEmpId || Boolean(parsedData._summaryIssues?.length) || !parsedData.unidades.some((unit: any) => unitIssues(unit).length === 0)}
                style={{ width: "100%", backgroundColor: selectedEmpId && !parsedData._summaryIssues?.length && parsedData.unidades.some((unit: any) => unitIssues(unit).length === 0) ? "#c5a059" : "#3f3f46", color: "#000", fontWeight: "bold", padding: "0.75rem", borderRadius: "6px", border: "none", cursor: selectedEmpId && !parsedData._summaryIssues?.length && parsedData.unidades.some((unit: any) => unitIssues(unit).length === 0) ? "pointer" : "not-allowed", display: "flex", justifyContent: "center", alignItems: "center", gap: "0.5rem" }}
              >
                {loading ? <Loader2 style={{ animation: "spin 1s linear infinite", width: "18px", height: "18px" }} /> : `Gravar ${parsedData.unidades.filter((unit: any) => unitIssues(unit).length === 0).length} válida(s) e salvar histórico`}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

type EmpreendimentoResumo = { id: string; nome: string; cidade?: string | null };
type ConstrutoraResumo = { id: string; nome: string; sku?: string | null };

type CaracteristicaExtra = {
  categoria: string;
  nome: string;
  valor: unknown;
  unidade?: string | null;
  fonte?: string | null;
};

type EmpreendimentoIA = {
  status?: string;
  empreendimento?: {
    nome?: string;
    construtora?: string | null;
    cidade?: string | null;
    bairro?: string | null;
    endereco?: string | null;
    tipo?: string | null;
    status_obra?: string | null;
    previsao_entrega?: string | null;
    descricao?: string | null;
    quantidade_torres?: number | null;
    quantidade_unidades?: number | null;
    total_pavimentos?: number | null;
    area_lazer_m2?: number | null;
    area_minima?: number | null;
    area_maxima?: number | null;
    faixa_preco?: number | null;
    valorizacao_aa?: number | null;
    quartos_disponiveis?: number[] | null;
  };
  lazer?: Array<string | Record<string, unknown>>;
  diferenciais?: Array<string | Record<string, unknown>>;
  caracteristicas?: CaracteristicaExtra[];
  observacoes?: string | null;
  fontes?: Array<{ arquivo?: string; pagina?: string | number; trecho?: string }>;
  campos_nao_encontrados?: string[];
  perguntas?: Array<{ campo?: string; pergunta?: string; motivo?: string }>;
};

function cleanJson(raw: string) {
  return raw.replace(/```json/gi, "").replace(/```/g, "").trim();
}

// O prompt atual entrega um cadastro rico, agrupado por assunto. O painel antigo
// usa campos planos; este adaptador evita que um PDF bem lido seja rejeitado só
// por causa dessa diferença de formato.
function normalizeEnterpriseDocument(raw: any): EmpreendimentoIA {
  const source = raw?.empreendimento;
  if (!source?.identidade) return raw as EmpreendimentoIA;
  const identity = source.identidade || {};
  const location = source.localizacao || {};
  const timeline = source.cronograma || {};
  const product = source.produto || {};
  const leisure = source.lazer || {};
  const characteristics: CaracteristicaExtra[] = [
    leisure.area_total_m2 != null ? { categoria: "lazer", nome: "Área total de lazer", valor: leisure.area_total_m2, unidade: "m²" } : null,
    product.area_terreno_m2 != null ? { categoria: "produto", nome: "Área do terreno", valor: product.area_terreno_m2, unidade: "m²" } : null,
    product.area_construida_m2 != null ? { categoria: "produto", nome: "Área construída", valor: product.area_construida_m2, unidade: "m²" } : null,
  ].filter(Boolean) as CaracteristicaExtra[];
  return {
    status: raw.status || "PRONTO_PARA_IMPORTAR",
    empreendimento: {
      nome: identity.nome_comercial,
      construtora: identity.construtora,
      cidade: location.cidade,
      bairro: location.bairro,
      endereco: location.endereco,
      tipo: product.tipo,
      status_obra: source.comercial?.status,
      previsao_entrega: timeline.entrega,
      quantidade_torres: product.torres,
      quantidade_unidades: product.unidades,
      total_pavimentos: product.pavimentos,
      area_lazer_m2: leisure.area_total_m2,
      area_minima: product.area_minima_m2,
      area_maxima: product.area_maxima_m2,
      quartos_disponiveis: (product.tipologias || []).map((item: any) => parseStandardTypology(item?.tipologia_original || item?.nome || item).dormitorios).filter((value: number) => value >= 0),
    },
    lazer: leisure.areas || [],
    diferenciais: source.diferenciais || [],
    caracteristicas: characteristics,
    observacoes: source.comercial?.observacoes?.join(" · ") || null,
    fontes: source.fontes || [],
    campos_nao_encontrados: raw.validacao?.campos_ausentes_importantes || [],
  };
}

function present(value: unknown) {
  return value !== undefined && value !== null && value !== "";
}

function normalizeBuilderName(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/\b(construtora|incorporadora|empreendimentos|engenharia|ltda|sa|s a)\b/g, "")
    .replace(/[^a-z0-9]/g, "");
}

const EmpreendimentoImporter: React.FC = () => {
  const [jsonInput, setJsonInput] = useState("");
  const [parsed, setParsed] = useState<EmpreendimentoIA | null>(null);
  const [empreendimentos, setEmpreendimentos] = useState<EmpreendimentoResumo[]>([]);
  const [construtoras, setConstrutoras] = useState<ConstrutoraResumo[]>([]);
  const [selectedConstrutoraId, setSelectedConstrutoraId] = useState("");
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ error?: string; success?: string } | null>(null);

  useEffect(() => {
    void Promise.all([
      supabase.from("empreendimentos").select("id, nome, cidade").order("nome"),
      supabase.from("construtoras").select("id, nome, sku").order("nome"),
    ]).then(([empResult, construtoraResult]) => {
      if (empResult.error || construtoraResult.error) setStatus({ error: empResult.error?.message || construtoraResult.error?.message });
      else {
        setEmpreendimentos((empResult.data || []) as EmpreendimentoResumo[]);
        setConstrutoras((construtoraResult.data || []) as ConstrutoraResumo[]);
      }
    });
  }, []);

  function parse() {
    setStatus(null);
    try {
      const data = normalizeEnterpriseDocument(JSON.parse(cleanJson(jsonInput)));
      if (data.status === "PENDENTE_INFORMACAO") {
        const questions = (data.perguntas || []).map((item) => item.pergunta || item.motivo).filter(Boolean);
        setParsed(null);
        setStatus({ error: questions.length ? questions.join(" ") : "A leitura precisa de esclarecimentos antes de ser importada." });
        return;
      }
      if (data.status !== "PRONTO_PARA_IMPORTAR" || !data.empreendimento?.nome) {
        throw new Error("O JSON precisa ter status PRONTO_PARA_IMPORTAR e o nome do empreendimento.");
      }
      if (!Array.isArray(data.caracteristicas) || !Array.isArray(data.lazer) || !Array.isArray(data.diferenciais)) {
        throw new Error("O JSON precisa conter as listas caracteristicas, lazer e diferenciais, mesmo quando vazias.");
      }
      const invalid = data.caracteristicas.some((item) => !item || !item.categoria || !item.nome || !present(item.valor));
      if (invalid) throw new Error("Cada característica precisa ter categoria, nome e valor confirmado.");

      setParsed(data);
      const builderName = normalizeBuilderName(data.empreendimento.construtora || "");
      const builderMatch = construtoras.find((item) => normalizeBuilderName(item.nome) === builderName);
      setSelectedConstrutoraId(builderMatch?.id || "");
    } catch (error) {
      setParsed(null);
      setStatus({ error: error instanceof Error ? error.message : "JSON inválido." });
    }
  }

  async function save() {
    if (!parsed?.empreendimento || !selectedConstrutoraId) return;
    const source = parsed.empreendimento;
    const payload: Record<string, unknown> = {
      nome: source.nome?.trim(),
      construtora_id: selectedConstrutoraId,
      ativo: true,
    };
    const normalizedDelivery = normalizeDeliveryMonth(source.previsao_entrega);
    if (normalizedDelivery) {
      payload.entrega = normalizedDelivery;
      payload.entrega_date = deliveryDateIso(normalizedDelivery);
    }
    const mapping: Array<[string, unknown]> = [
      ["cidade", source.cidade], ["bairro", source.bairro], ["endereco", source.endereco],
      ["tipo", source.tipo], ["status", source.status_obra], ["previsao_entrega", source.previsao_entrega],
      ["descricao", source.descricao], ["quantidade_torres", source.quantidade_torres],
      ["quantidade_unidades", source.quantidade_unidades], ["total_pavimentos", source.total_pavimentos],
      ["area_lazer_m2", source.area_lazer_m2], ["area_minima", source.area_minima],
      ["area_maxima", source.area_maxima], ["faixa_preco", source.faixa_preco],
      ["valorizacao_aa", source.valorizacao_aa], ["observacoes", parsed.observacoes],
      ["quartos_disponiveis", source.quartos_disponiveis],
    ];
    mapping.forEach(([key, value]) => { if (present(value)) payload[key] = value; });
    payload.lazer = parsed.lazer || [];
    payload.diferenciais = parsed.diferenciais || [];
    payload.caracteristicas = {
      itens: parsed.caracteristicas || [],
      fontes: parsed.fontes || [],
      campos_nao_encontrados: parsed.campos_nao_encontrados || [],
      importado_em: new Date().toISOString(),
    };

    setSaving(true);
    setStatus(null);
    const duplicate = empreendimentos.find((item) =>
      item.nome.trim().toLocaleLowerCase("pt-BR") === source.nome?.trim().toLocaleLowerCase("pt-BR") &&
      (!source.cidade || item.cidade?.trim().toLocaleLowerCase("pt-BR") === source.cidade.trim().toLocaleLowerCase("pt-BR"))
    );
    if (duplicate) {
      setSaving(false);
      setStatus({ error: `O empreendimento ${duplicate.nome} já está cadastrado. Edite-o pela aba Empreendimentos.` });
      return;
    }
    const { error } = await supabase.from("empreendimentos").insert(payload);
    setSaving(false);
    if (error) setStatus({ error: `Erro ao cadastrar o empreendimento: ${error.message}` });
    else {
      setStatus({ success: "Empreendimento cadastrado e preenchido. Ele já está disponível nas abas Empreendimentos e Apresentações." });
      setJsonInput("");
      setParsed(null);
      setSelectedConstrutoraId("");
    }
  }

  const selectedConstrutora = construtoras.find((item) => item.id === selectedConstrutoraId);
  const builderDiffers = Boolean(parsed && selectedConstrutora && normalizeBuilderName(parsed.empreendimento?.construtora || "") !== normalizeBuilderName(selectedConstrutora.nome));

  return <div>
    {status?.error && <div style={errorBox}><AlertCircle size={18} /> {status.error}</div>}
    {status?.success && <div style={successBox}><CheckCircle2 size={18} /> {status.success}</div>}
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: "1.5rem" }}>
      <section style={panelStyle}>
        <h2 style={panelTitle}><FileJson size={18} /> JSON das características</h2>
        <p style={helpStyle}>Cole o JSON produzido com o prompt de empreendimento. Dados ausentes não serão apagados nem substituídos.</p>
        <textarea rows={20} value={jsonInput} onChange={(event) => setJsonInput(event.target.value)} placeholder="Cole aqui o JSON do leitor de empreendimento..." style={textareaStyle} />
        <button onClick={parse} style={secondaryActionStyle}>Validar características <ArrowRight size={16} /></button>
      </section>
      <section style={panelStyle}>
        <h2 style={panelTitle}><Home size={18} /> Prévia e destino</h2>
        {!parsed ? <div style={emptyStyle}><Home size={38} /><span>Valide um JSON para revisar todas as características antes de salvar.</span></div> : <div>
          <label style={labelStyle}>Confirmar construtora existente *</label>
          <select value={selectedConstrutoraId} onChange={(event) => setSelectedConstrutoraId(event.target.value)} style={selectStyle}>
            <option value="">Selecione a construtora...</option>
            {construtoras.map((item) => <option key={item.id} value={item.id}>{item.nome}{item.sku ? ` (${item.sku})` : ""}</option>)}
          </select>
          {!selectedConstrutoraId && <div style={{ ...errorBox, marginTop: 10 }}>A construtora lida não foi localizada automaticamente. Confirme uma construtora existente ou cadastre-a primeiro na aba Construtoras.</div>}
          {builderDiffers && <div style={{ ...errorBox, marginTop: 10 }}>A construtora selecionada é diferente do nome lido no material. Revise antes de cadastrar.</div>}
          <div style={summaryStyle}>
            <div><strong>Nome lido:</strong> {parsed.empreendimento?.nome}</div>
            <div><strong>Construtora lida:</strong> {parsed.empreendimento?.construtora}</div>
            <div><strong>Cidade:</strong> {parsed.empreendimento?.cidade || "não encontrada"}</div>
            <div><strong>Torres:</strong> {parsed.empreendimento?.quantidade_torres ?? "não encontrado"}</div>
            <div><strong>Unidades:</strong> {parsed.empreendimento?.quantidade_unidades ?? "não encontrado"}</div>
            <div><strong>Quartos:</strong> {parsed.empreendimento?.quartos_disponiveis?.map((q) => q === 0 ? "Studio" : `${q}Q`).join(" · ") || "não encontrado"}</div>
            <div><strong>Valorização:</strong> {parsed.empreendimento?.valorizacao_aa != null ? `${parsed.empreendimento.valorizacao_aa}% a.a.` : "não encontrada (editável depois)"}</div>
            <div><strong>Lazeres:</strong> {parsed.lazer?.length || 0}</div>
            <div><strong>Diferenciais:</strong> {parsed.diferenciais?.length || 0}</div>
            <div><strong>Outras características:</strong> {parsed.caracteristicas?.length || 0}</div>
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto", border: "1px solid #27272a", borderRadius: 6 }}>
            {(parsed.caracteristicas || []).map((item, index) => <div key={`${item.categoria}-${item.nome}-${index}`} style={itemStyle}><div><strong style={{ color: "#fff" }}>{item.nome}</strong><small style={{ display: "block", color: "#71717a" }}>{item.categoria}{item.fonte ? ` · ${item.fonte}` : ""}</small></div><span style={{ color: "#c5a059", textAlign: "right" }}>{typeof item.valor === "object" ? JSON.stringify(item.valor) : String(item.valor)}{item.unidade ? ` ${item.unidade}` : ""}</span></div>)}
          </div>
          {(parsed.campos_nao_encontrados?.length || 0) > 0 && <p style={{ color: "#fbbf24", fontSize: 12 }}>Não encontrados: {parsed.campos_nao_encontrados?.join(", ")}</p>}
          <button disabled={!selectedConstrutoraId || saving || builderDiffers} onClick={() => void save()} style={{ ...primaryActionStyle, opacity: !selectedConstrutoraId || saving || builderDiffers ? .45 : 1 }}>{saving ? <Loader2 size={18} /> : <ListChecks size={18} />}{saving ? "Cadastrando..." : "Cadastrar empreendimento"}</button>
        </div>}
      </section>
    </div>
  </div>;
};

export const ImportarIAModule: React.FC = () => {
  const [mode, setMode] = useState<"unidades" | "empreendimento">("unidades");
  return <div>
    <div style={{ marginBottom: "1.5rem" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: ".5rem" }}><Sparkles style={{ color: "#c5a059" }} /> Importador Inteligente por IA</h1>
      <p style={{ color: "#71717a", fontSize: ".875rem", margin: ".25rem 0 0" }}>Escolha o leitor adequado para cada tipo de documento.</p>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20, padding: 6, background: "#121212", border: "1px solid #27272a", borderRadius: 9 }}>
      <button onClick={() => setMode("unidades")} style={modeButton(mode === "unidades")}><Building2 size={17} /><span><strong>Leitor de unidades</strong><small>Tabelas, preços, estoque e fluxos</small></span></button>
      <button onClick={() => setMode("empreendimento")} style={modeButton(mode === "empreendimento")}><Home size={17} /><span><strong>Leitor de empreendimento</strong><small>Cadastro, lazer e características</small></span></button>
    </div>
    {mode === "unidades" ? <UnidadesImporter /> : <EmpreendimentoImporter />}
  </div>;
};

const panelStyle = { backgroundColor: "#121212", border: "1px solid #222", borderRadius: 8, padding: "1.25rem" } as const;
const panelTitle = { color: "#c5a059", fontSize: "1rem", margin: "0 0 .75rem", display: "flex", alignItems: "center", gap: ".4rem" } as const;
const helpStyle = { color: "#71717a", fontSize: 12, lineHeight: 1.5 } as const;
const textareaStyle = { width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", color: "#d4d4d8", padding: ".75rem", borderRadius: 6, fontFamily: "monospace", fontSize: ".8rem", resize: "vertical", boxSizing: "border-box" } as const;
const secondaryActionStyle = { width: "100%", marginTop: "1rem", background: "#27272a", color: "#fff", fontWeight: 700, padding: ".75rem", borderRadius: 6, border: "1px solid #3f3f46", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: ".5rem" } as const;
const primaryActionStyle = { width: "100%", marginTop: 16, background: "#c5a059", color: "#09090b", fontWeight: 800, padding: ".75rem", borderRadius: 6, border: 0, cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: ".5rem" } as const;
const errorBox = { background: "rgba(239,68,68,.1)", border: "1px solid #ef4444", color: "#f87171", padding: ".8rem", borderRadius: 7, marginBottom: "1rem", display: "flex", alignItems: "center", gap: ".5rem", fontSize: 13 } as const;
const successBox = { ...errorBox, background: "rgba(34,197,94,.1)", border: "1px solid #22c55e", color: "#4ade80" } as const;
const emptyStyle = { minHeight: 360, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", gap: 10, color: "#71717a", border: "1px dashed #27272a", borderRadius: 6 } as const;
const labelStyle = { display: "block", color: "#a1a1aa", fontSize: 12, marginBottom: 6 } as const;
const selectStyle = { width: "100%", background: "#18181b", border: "1px solid #c5a059", color: "#fff", padding: ".65rem", borderRadius: 6, boxSizing: "border-box" } as const;
const summaryStyle = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "14px 0", padding: 12, background: "#18181b", borderRadius: 6, color: "#d4d4d8", fontSize: 12 } as const;
const itemStyle = { display: "flex", justifyContent: "space-between", gap: 12, padding: "9px 10px", borderBottom: "1px solid #27272a", color: "#a1a1aa", fontSize: 12 } as const;
const modeButton = (active: boolean) => ({ border: active ? "1px solid #c5a059" : "1px solid transparent", background: active ? "rgba(197,160,89,.12)" : "transparent", color: active ? "#f4d79c" : "#a1a1aa", borderRadius: 6, padding: "12px 14px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, textAlign: "left", ...(active ? {} : {}), } as const);
