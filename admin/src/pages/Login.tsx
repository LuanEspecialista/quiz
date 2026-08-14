import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, Lock, Mail, Loader2 } from "lucide-react";

export default function Login({ externalError = "", recoveryMode = false, onPasswordUpdated }: { externalError?: string; recoveryMode?: boolean; onPasswordUpdated?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [forgotMode, setForgotMode] = useState(false);

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

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return setError("Informe seu e-mail.");
    setLoading(true); setError(null); setNotice(null);
    const redirectTo = `${window.location.origin}${window.location.pathname}`;
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
    setLoading(false);
    if (error) setError(error.message); else setNotice("Enviamos o link de recuperação. Verifique também a caixa de spam.");
  };

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError("A nova senha deve ter pelo menos 8 caracteres.");
    setLoading(true); setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) setError(error.message); else { setNotice("Senha atualizada com sucesso."); onPasswordUpdated?.(); }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#0a0a0a", padding: "1rem" }}>
      <div style={{ width: "100%", maxWidth: "400px", backgroundColor: "#121212", border: "1px solid #222", borderRadius: "12px", padding: "2.5rem", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <img src="/imagens/logo.png" alt="Luan Especialista" style={{ width: 82, height: 82, objectFit: "contain", marginBottom: 12 }} />
          <h1 style={{ color: "#c5a059", fontSize: "1.75rem", fontWeight: "bold", margin: "0 0 0.5rem 0", letterSpacing: "1px" }}>LUAN ESPECIALISTA</h1>
          <p style={{ color: "#a1a1aa", fontSize: "0.875rem", margin: 0 }}>Plataforma de Inteligência Patrimonial</p>
        </div>

        {(error || externalError) && (
          <div style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#ef4444", padding: "0.75rem", borderRadius: "6px", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
            {error || externalError}
          </div>
        )}

        {notice && <div style={{ backgroundColor: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.35)", color: "#4ade80", padding: "0.75rem", borderRadius: "6px", fontSize: "0.875rem", marginBottom: "1.5rem" }}>{notice}</div>}

        <form onSubmit={recoveryMode ? handleNewPassword : forgotMode ? handleForgotPassword : handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {!recoveryMode && (
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
          )}

          {!forgotMode && <div>
            <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.875rem", marginBottom: "0.5rem" }}>{recoveryMode ? "Nova senha" : "Senha"}</label>
            <div style={{ position: "relative" }}>
              <Lock style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#52525b", width: "18px", height: "18px" }} />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", color: "#fff", padding: "0.75rem 2.75rem 0.75rem 2.5rem", borderRadius: "6px", outline: "none", boxSizing: "border-box" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                title={showPassword ? "Ocultar senha" : "Mostrar senha"}
                style={{ position: "absolute", right: "0.65rem", top: "50%", transform: "translateY(-50%)", display: "flex", alignItems: "center", background: "transparent", border: 0, color: "#a1a1aa", cursor: "pointer", padding: "0.25rem" }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>}

          {!recoveryMode && !forgotMode && <button type="button" onClick={() => { setForgotMode(true); setError(null); }} style={{ alignSelf: "flex-end", background: "none", border: 0, color: "#c5a059", cursor: "pointer", fontSize: "0.8rem", padding: 0 }}>Esqueci minha senha</button>}

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", backgroundColor: "#c5a059", color: "#000", fontWeight: "bold", padding: "0.75rem", borderRadius: "6px", border: "none", cursor: loading ? "not-allowed" : "pointer", marginTop: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
          >
            {loading ? <Loader2 style={{ animation: "spin 1s linear infinite", width: "18px", height: "18px" }} /> : recoveryMode ? "Salvar nova senha" : forgotMode ? "Enviar link de recuperação" : "Entrar no Painel"}
          </button>
          {forgotMode && <button type="button" onClick={() => { setForgotMode(false); setError(null); setNotice(null); }} style={{ background: "none", border: 0, color: "#a1a1aa", cursor: "pointer" }}>Voltar ao login</button>}
        </form>
      </div>
    </div>
  );
}
