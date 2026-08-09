import React, { useState, useEffect } from "react";
import { Upload, Image as ImageIcon, Trash2, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface EmpreendimentoImagensProps {
  empreendimentoId?: string;
  imagemAtual?: string;
  onImageUploaded: (url: string) => void;
}

export function EmpreendimentoImagens({ empreendimentoId, imagemAtual, onImageUploaded }: EmpreendimentoImagensProps) {
  const [uploading, setUploading] = useState(false);
  const [nomeArquivo, setNomeArquivo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(imagemAtual || null);
  const [mensagem, setMensagem] = useState("");

  useEffect(() => {
    setPreview(imagemAtual || null);
  }, [imagemAtual]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      setFile(selectedFile);
      setPreview(URL.createObjectURL(selectedFile));
      
      if (!nomeArquivo) {
        const nomeLimpo = selectedFile.name
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-");
        setNomeArquivo(nomeLimpo);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setMensagem("");

    try {
      const fileExt = file.name.split(".").pop();
      const customName = nomeArquivo ? nomeArquivo.trim() : `img-${Date.now()}`;
      const folder = empreendimentoId || "temp";
      const fileName = `${folder}/${customName}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("empreendimentos")
        .upload(fileName, file, { cacheControl: "3600", upsert: true });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("empreendimentos")
        .getPublicUrl(fileName);

      const urlFinal = publicUrlData.publicUrl;

      setMensagem("Imagem enviada com sucesso!");
      onImageUploaded(urlFinal);
      setFile(null);
    } catch (err: any) {
      console.error("Erro no upload:", err);
      alert("Erro ao enviar imagem: " + (err.message || err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ backgroundColor: "#18181b", border: "1px solid #27272a", borderRadius: "6px", padding: "0.75rem", color: "#e4e4e7" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.6rem" }}>
        <ImageIcon style={{ width: "15px", height: "15px", color: "#c5a059" }} />
        <span style={{ fontSize: "0.72rem", fontWeight: "bold", color: "#c5a059", textTransform: "uppercase" }}>Imagem de Destaque / Fachada</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 120px", gap: "0.75rem", alignItems: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          <div>
            <label style={{ fontSize: "0.68rem", color: "#a1a1aa", display: "block", marginBottom: "0.2rem" }}>Nome personalizado (Opcional):</label>
            <input 
              type="text" 
              placeholder="ex: fachada-principal" 
              value={nomeArquivo}
              onChange={(e) => setNomeArquivo(e.target.value)}
              style={{ width: "100%", backgroundColor: "#121212", border: "1px solid #27272a", borderRadius: "4px", padding: "0.4rem", color: "#fff", fontSize: "0.75rem", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <label style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", backgroundColor: "#121212", border: "1px dashed #c5a059", borderRadius: "4px", padding: "0.4rem", color: "#c5a059", cursor: "pointer", fontSize: "0.72rem", fontWeight: "bold" }}>
              <Upload style={{ width: "12px", height: "12px" }} />
              {file ? "Trocar Arquivo" : "Selecionar Imagem"}
              <input type="file" accept="image/*" onChange={handleFileChange} style={{ display: "none" }} />
            </label>

            {file && !uploading && (
              <button 
                type="button"
                onClick={handleUpload}
                style={{ backgroundColor: "#c5a059", color: "#000", border: "none", borderRadius: "4px", padding: "0.4rem 0.8rem", fontWeight: "bold", fontSize: "0.72rem", cursor: "pointer" }}
              >
                Enviar
              </button>
            )}
            {uploading && <Loader2 style={{ width: "16px", height: "16px", animation: "spin 1s linear infinite", color: "#c5a059" }} />}
          </div>
          {mensagem && <span style={{ fontSize: "0.68rem", color: "#22c55e" }}>{mensagem}</span>}
        </div>

        {/* Preview da Imagem */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#121212", borderRadius: "4px", border: "1px solid #27272a", height: "80px", overflow: "hidden" }}>
          {preview ? (
            <img src={preview} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            <span style={{ fontSize: "0.65rem", color: "#71717a", textAlign: "center", padding: "0.2rem" }}>Sem imagem</span>
          )}
        </div>
      </div>
    </div>
  );
}