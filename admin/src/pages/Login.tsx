import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Lock, Mail, Loader2 } from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : error.message);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#0a0a0a", padding: "1rem" }}>
      <div style={{ width: "100%", maxWidth: "400px", backgroundColor: "#121212", border: "1px solid #222", borderRadius: "12px", padding: "2.5rem", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ color: "#c5a059", fontSize: "1.75rem", fontWeight: "bold", margin: "0 0 0.5rem 0", letterSpacing: "1px" }}>LUAN ESPECIALISTA</h1>
          <p style={{ color: "#a1a1aa", fontSize: "0.875rem", margin: 0 }}>Plataforma de Inteligência Patrimonial</p>
        </div>

        {error && (
          <div style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#ef4444", padding: "0.75rem", borderRadius: "6px", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div>
            <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.875rem", marginBottom: "0.5rem" }}>E-mail</label>
            <div style={{ position: "relative" }}>
              <Mail style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#52525b", width: "18px", height: "18px" }} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", color: "#fff", padding: "0.75rem 0.75rem 0.75rem 2.5rem", borderRadius: "6px", outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Senha</label>
            <div style={{ position: "relative" }}>
              <Lock style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#52525b", width: "18px", height: "18px" }} />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", color: "#fff", padding: "0.75rem 0.75rem 0.75rem 2.5rem", borderRadius: "6px", outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", backgroundColor: "#c5a059", color: "#000", fontWeight: "bold", padding: "0.75rem", borderRadius: "6px", border: "none", cursor: loading ? "not-allowed" : "pointer", marginTop: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
          >
            {loading ? <Loader2 style={{ animation: "spin 1s linear infinite", width: "18px", height: "18px" }} /> : "Entrar no Painel"}
          </button>
        </form>
      </div>
    </div>
  );
}
