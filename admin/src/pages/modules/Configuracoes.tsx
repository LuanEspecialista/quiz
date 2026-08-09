import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Settings, 
  Save, 
  Building2, 
  Percent, 
  Sliders, 
  RefreshCw,
  CheckCircle2,
  AlertCircle
} from "lucide-react";

interface ConfigGerais {
  taxa_administracao_padrao: number;
  fundo_reserva_padrao: number;
  taxa_juros_financiamento_anual: number;
  incc_projetado_anual: number;
  valor_m2_referencia: number;
  rentabilidade_aluguel_anual: number;
  moeda_padrao: string;
  casas_decimais_taxas: number;
}

export default function Configuracoes() {
  const [activeTab, setActiveTab] = useState<"geral" | "imobiliario" | "exibicao">("geral");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [form, setForm] = useState<ConfigGerais>({
    taxa_administracao_padrao: 15.0,
    fundo_reserva_padrao: 1.0,
    taxa_juros_financiamento_anual: 11.5,
    incc_projetado_anual: 5.5,
    valor_m2_referencia: 8500.0,
    rentabilidade_aluguel_anual: 0.5,
    moeda_padrao: "BRL",
    casas_decimais_taxas: 2
  });

  useEffect(() => {
    fetchConfiguracoes();
  }, []);

  const fetchConfiguracoes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("configuracoes")
        .select("*")
        .maybeSingle();

      if (error) {
        console.error("Erro ao carregar configurações:", error);
      } else if (data) {
        setForm({
          taxa_administracao_padrao: data.taxa_administracao_padrao ?? 15.0,
          fundo_reserva_padrao: data.fundo_reserva_padrao ?? 1.0,
          taxa_juros_financiamento_anual: data.taxa_juros_financiamento_anual ?? 11.5,
          incc_projetado_anual: data.incc_projetado_anual ?? 5.5,
          valor_m2_referencia: data.valor_m2_referencia ?? 8500.0,
          rentabilidade_aluguel_anual: data.rentabilidade_aluguel_anual ?? 0.5,
          moeda_padrao: data.moeda_padrao ?? "BRL",
          casas_decimais_taxas: data.casas_decimais_taxas ?? 2
        });
      }
    } catch (err) {
      console.error("Erro de conexão:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: keyof ConfigGerais, val: any) => {
    setForm((prev) => ({ ...prev, [field]: val }));
  };

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);

    try {
      const { error } = await supabase
        .from("configuracoes")
        .upsert({ id: 1, ...form, updated_at: new Date().toISOString() });

      if (error) throw error;

      setFeedback({ type: "success", msg: "Configurações salvas com sucesso!" });
    } catch (err: any) {
      setFeedback({ type: "error", msg: "Erro ao salvar: " + (err.message || "Tente novamente.") });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ color: "#e4e4e7", fontFamily: "sans-serif", fontSize: "0.85rem", padding: "1.5rem" }}>
      {/* CABEÇALHO */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.2rem", borderBottom: "1px solid #1f1f23", paddingBottom: "0.8rem" }}>
        <div>
          <h1 style={{ fontSize: "1.2rem", fontWeight: "600", color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "0.4rem" }}>
            <Settings style={{ width: "20px", height: "20px", color: "#c5a059" }} /> Configurações do Sistema
          </h1>
          <p style={{ color: "#71717a", fontSize: "0.75rem", margin: "0.2rem 0 0 0" }}>
            Defina as taxas base, parâmetros imobiliários e preferências que alimentam os comparativos.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || loading}
          style={{
            backgroundColor: "#c5a059",
            color: "#000",
            fontWeight: "bold",
            padding: "0.5rem 1.1rem",
            borderRadius: "4px",
            border: "none",
            cursor: saving ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            fontSize: "0.8rem"
          }}
        >
          {saving ? <RefreshCw style={{ width: "14px", height: "14px", animation: "spin 1s linear infinite" }} /> : <Save style={{ width: "14px", height: "14px" }} />}
          Salvar Parâmetros
        </button>
      </div>

      {/* FEEDBACK DE SUCESSO/ERRO */}
      {feedback && (
        <div
          style={{
            padding: "0.6rem 0.8rem",
            borderRadius: "4px",
            marginBottom: "1rem",
            fontSize: "0.8rem",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            backgroundColor: feedback.type === "success" ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
            border: `1px solid ${feedback.type === "success" ? "#22c55e" : "#ef4444"}`,
            color: feedback.type === "success" ? "#4ade80" : "#f87171"
          }}
        >
          {feedback.type === "success" ? <CheckCircle2 style={{ width: "16px", height: "16px" }} /> : <AlertCircle style={{ width: "16px", height: "16px" }} />}
          {feedback.msg}
        </div>
      )}

      {/* ABAS */}
      <div style={{ display: "flex", gap: "0.5rem", borderBottom: "1px solid #1f1f23", marginBottom: "1.2rem" }}>
        {[
          { id: "geral", label: "Consórcio & Financiamento", icon: Percent },
          { id: "imobiliario", label: "Parâmetros Imobiliários", icon: Building2 },
          { id: "exibicao", label: "Formatação & Exibição", icon: Sliders }
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              style={{
                backgroundColor: "transparent",
                color: isActive ? "#c5a059" : "#a1a1aa",
                border: "none",
                borderBottom: isActive ? "2px solid #c5a059" : "2px solid transparent",
                padding: "0.5rem 0.8rem",
                fontSize: "0.8rem",
                fontWeight: isActive ? "bold" : "normal",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.35rem"
              }}
            >
              <Icon style={{ width: "14px", height: "14px" }} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* PAINEL DE FORMULÁRIO */}
      <div style={{ backgroundColor: "#09090b", border: "1px solid #1f1f23", borderRadius: "6px", padding: "1.2rem" }}>
        {activeTab === "geral" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.2rem" }}>
            <div>
              <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.75rem", marginBottom: "0.3rem" }}>Taxa de Administração Padrão (%)</label>
              <input
                type="number"
                step="0.1"
                value={form.taxa_administracao_padrao}
                onChange={(e) => handleChange("taxa_administracao_padrao", parseFloat(e.target.value) || 0)}
                style={{ width: "100%", backgroundColor: "#121212", border: "1px solid #27272a", color: "#fff", padding: "0.5rem", borderRadius: "4px", fontSize: "0.8rem", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.75rem", marginBottom: "0.3rem" }}>Fundo de Reserva Padrão (%)</label>
              <input
                type="number"
                step="0.1"
                value={form.fundo_reserva_padrao}
                onChange={(e) => handleChange("fundo_reserva_padrao", parseFloat(e.target.value) || 0)}
                style={{ width: "100%", backgroundColor: "#121212", border: "1px solid #27272a", color: "#fff", padding: "0.5rem", borderRadius: "4px", fontSize: "0.8rem", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.75rem", marginBottom: "0.3rem" }}>Juros Financiamento Anual (%)</label>
              <input
                type="number"
                step="0.1"
                value={form.taxa_juros_financiamento_anual}
                onChange={(e) => handleChange("taxa_juros_financiamento_anual", parseFloat(e.target.value) || 0)}
                style={{ width: "100%", backgroundColor: "#121212", border: "1px solid #27272a", color: "#fff", padding: "0.5rem", borderRadius: "4px", fontSize: "0.8rem", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.75rem", marginBottom: "0.3rem" }}>INCC Projetado Anual (%)</label>
              <input
                type="number"
                step="0.1"
                value={form.incc_projetado_anual}
                onChange={(e) => handleChange("incc_projetado_anual", parseFloat(e.target.value) || 0)}
                style={{ width: "100%", backgroundColor: "#121212", border: "1px solid #27272a", color: "#fff", padding: "0.5rem", borderRadius: "4px", fontSize: "0.8rem", boxSizing: "border-box" }}
              />
            </div>
          </div>
        )}

        {activeTab === "imobiliario" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.2rem" }}>
            <div>
              <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.75rem", marginBottom: "0.3rem" }}>Valor Médio m² de Referência (R$)</label>
              <input
                type="number"
                step="100"
                value={form.valor_m2_referencia}
                onChange={(e) => handleChange("valor_m2_referencia", parseFloat(e.target.value) || 0)}
                style={{ width: "100%", backgroundColor: "#121212", border: "1px solid #27272a", color: "#fff", padding: "0.5rem", borderRadius: "4px", fontSize: "0.8rem", boxSizing: "border-box" }}
              />
            </div>

            <div>
              <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.75rem", marginBottom: "0.3rem" }}>Rentabilidade de Aluguel Estimada (% ao mês)</label>
              <input
                type="number"
                step="0.05"
                value={form.rentabilidade_aluguel_anual}
                onChange={(e) => handleChange("rentabilidade_aluguel_anual", parseFloat(e.target.value) || 0)}
                style={{ width: "100%", backgroundColor: "#121212", border: "1px solid #27272a", color: "#fff", padding: "0.5rem", borderRadius: "4px", fontSize: "0.8rem", boxSizing: "border-box" }}
              />
            </div>
          </div>
        )}

        {activeTab === "exibicao" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.2rem" }}>
            <div>
              <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.75rem", marginBottom: "0.3rem" }}>Moeda Base</label>
              <select
                value={form.moeda_padrao}
                onChange={(e) => handleChange("moeda_padrao", e.target.value)}
                style={{ width: "100%", backgroundColor: "#121212", border: "1px solid #27272a", color: "#fff", padding: "0.5rem", borderRadius: "4px", fontSize: "0.8rem" }}
              >
                <option value="BRL">Real Brasileiro (R$)</option>
                <option value="USD">Dólar Americano ($)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.75rem", marginBottom: "0.3rem" }}>Casas Decimais para Taxas</label>
              <select
                value={form.casas_decimais_taxas}
                onChange={(e) => handleChange("casas_decimais_taxas", parseInt(e.target.value, 10))}
                style={{ width: "100%", backgroundColor: "#121212", border: "1px solid #27272a", color: "#fff", padding: "0.5rem", borderRadius: "4px", fontSize: "0.8rem" }}
              >
                <option value={2}>2 Casas Decimais (ex: 15,00%)</option>
                <option value={3}>3 Casas Decimais (ex: 15,000%)</option>
                <option value={4}>4 Casas Decimais (ex: 15,0000%)</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}