import { useState } from "react";
import { Loader2, UserRound } from "lucide-react";
import { supabase } from "@/lib/supabase";

type Props = { onSaved: (username: string) => void; onSkip: () => void };

export default function UsernameSetup({ onSaved, onSkip }: Props) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const normalized = username.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{2,23}$/.test(normalized)) {
      setError("Use de 3 a 24 caracteres: letras sem acento, números, ponto, traço ou sublinhado.");
      return;
    }
    setLoading(true);
    setError("");
    const { data, error } = await supabase.rpc("definir_meu_usuario", { p_usuario: normalized });
    setLoading(false);
    if (error) {
      setError(error.message.includes("USUARIO_EM_USO") ? "Esse usuário já está em uso. Escolha outro." : "Não foi possível salvar o usuário agora.");
      return;
    }
    onSaved(String(data || normalized));
  };

  return <div style={{ minHeight: "100dvh", background: "#080808", color: "#fff", display: "grid", placeItems: "center", padding: 16 }}>
    <form onSubmit={save} style={{ width: "min(420px,100%)", background: "#121212", border: "1px solid #292929", borderRadius: 12, padding: "clamp(20px,6vw,36px)", display: "grid", gap: 16 }}>
      <UserRound size={34} color="#c5a059" />
      <div><h1 style={{ margin: "0 0 8px", fontSize: 22 }}>Crie seu usuário</h1><p style={{ margin: 0, color: "#a1a1aa", lineHeight: 1.5 }}>Na próxima vez, você poderá entrar com este usuário ou continuar usando seu e-mail.</p></div>
      <label style={{ display: "grid", gap: 7, color: "#d4d4d8", fontSize: 14 }}>Usuário
        <input required minLength={3} maxLength={24} value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} autoCapitalize="none" autoCorrect="off" placeholder="ex.: luan.especialista" style={{ width: "100%", boxSizing: "border-box", background: "#18181b", border: "1px solid #34343a", color: "#fff", padding: 12, borderRadius: 7 }} />
      </label>
      {error && <div role="alert" style={{ color: "#f87171", fontSize: 13 }}>{error}</div>}
      <button disabled={loading} style={{ border: 0, borderRadius: 7, padding: 12, background: "#c5a059", color: "#080808", fontWeight: 700 }}>{loading ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} /> : "Salvar usuário"}</button>
      <button type="button" onClick={onSkip} style={{ border: 0, background: "transparent", color: "#a1a1aa", padding: 8 }}>Agora não</button>
    </form>
  </div>;
}
