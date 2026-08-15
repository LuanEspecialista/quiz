import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, Lock, Mail, Loader2 } from "lucide-react";
import { clearAuthUrl, getPanelUrl } from "@/lib/authRedirect";

export default function Login({ externalError = "", recoveryMode = false, onPasswordUpdated }: { externalError?: string; recoveryMode?: boolean; onPasswordUpdated?: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [forgotMode, setForgotMode] = useState(false);
  const [requestMode, setRequestMode] = useState(false);
  const [requestName, setRequestName] = useState("");
  const [accessType, setAccessType] = useState<"cliente" | "afiliado">("cliente");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
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
    const redirectTo = getPanelUrl({ recovery: "1" });
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), { redirectTo });
    setLoading(false);
    if (error) setError(error.message); else setNotice("Enviamos o link de recuperação. Verifique também a caixa de spam.");
  };

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError("A nova senha deve ter pelo menos 8 caracteres.");
    if (password !== passwordConfirmation) return setError("As duas senhas precisam ser iguais.");
    setLoading(true); setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) await supabase.auth.refreshSession();
    setLoading(false);
    if (error) setError(error.message); else {
      clearAuthUrl();
      setNotice("Senha atualizada e acesso mantido neste dispositivo.");
      onPasswordUpdated?.();
    }
  };

  const handleAccessRequest = (e: React.FormEvent) => {
    e.preventDefault();
    const message = ["Olá, Luan! Gostaria de solicitar acesso à plataforma.", `Nome: ${requestName.trim()}`, `E-mail: ${email.trim()}`, `Tipo de acesso: ${accessType === "cliente" ? "Cliente" : "Afiliado"}`, "Se aprovado, aguardo as instruções para entrar."].join("\n");
    window.open(`https://wa.me/5547992120915?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="login-page" style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#0a0a0a", padding: "max(1rem, env(safe-area-inset-top)) 1rem max(1rem, env(safe-area-inset-bottom))" }}>
      <style>{`@media(max-width:480px){.login-card{padding:1.35rem !important;border-radius:10px !important}.login-brand{margin-bottom:1.25rem !important}.login-brand h1{font-size:1.3rem !important}.login-page{align-items:flex-start !important;overflow-y:auto}.login-card{margin:auto 0}}`}</style>
      <div className="login-card" style={{ width: "100%", maxWidth: "400px", backgroundColor: "#121212", border: "1px solid #222", borderRadius: "12px", padding: "2.5rem", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
        <div className="login-brand" style={{ textAlign: "center", marginBottom: "2rem" }}>
          <a href="/" aria-label="Ir para a página inicial"><img src="/imagens/logo.png" alt="Luan Especialista" style={{ width: 58, height: 58, objectFit: "contain", marginBottom: 12, opacity: .92 }} /></a>
          <h1 style={{ color: "#c5a059", fontSize: "1.75rem", fontWeight: "bold", margin: "0 0 0.5rem 0", letterSpacing: "1px" }}>LUAN ESPECIALISTA</h1>
          <p style={{ color: "#a1a1aa", fontSize: "0.875rem", margin: 0 }}>Plataforma de Inteligência Patrimonial</p>
        </div>

        {(error || externalError) && (
          <div style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#ef4444", padding: "0.75rem", borderRadius: "6px", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
            {error || externalError}
          </div>
        )}

        {notice && <div style={{ backgroundColor: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.35)", color: "#4ade80", padding: "0.75rem", borderRadius: "6px", fontSize: "0.875rem", marginBottom: "1.5rem" }}>{notice}</div>}

        <form onSubmit={requestMode ? handleAccessRequest : recoveryMode ? handleNewPassword : forgotMode ? handleForgotPassword : handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {requestMode && <div><label style={{ display: "block", color: "#a1a1aa", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Nome completo</label><input required value={requestName} onChange={(e) => setRequestName(e.target.value)} placeholder="Seu nome" style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", color: "#fff", padding: "0.75rem", borderRadius: "6px", boxSizing: "border-box" }} /></div>}
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

          {!forgotMode && !requestMode && <div>
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

          {recoveryMode && <div>
            <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Confirmar nova senha</label>
            <div style={{ position: "relative" }}>
              <Lock style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#52525b", width: "18px", height: "18px" }} />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                placeholder="••••••••"
                style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", color: "#fff", padding: "0.75rem 0.75rem 0.75rem 2.5rem", borderRadius: "6px", outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>}

          {requestMode && <div><label style={{ display: "block", color: "#a1a1aa", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Quero acesso como</label><select value={accessType} onChange={(e) => setAccessType(e.target.value as "cliente" | "afiliado")} style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", color: "#fff", padding: "0.75rem", borderRadius: "6px" }}><option value="cliente">Cliente</option><option value="afiliado">Afiliado</option></select><p style={{ color: "#71717a", fontSize: "0.75rem", lineHeight: 1.5 }}>A solicitação não cria uma conta. O acesso só será liberado após sua aprovação.</p></div>}
          {!recoveryMode && !forgotMode && !requestMode && <button type="button" onClick={() => { setForgotMode(true); setError(null); }} style={{ alignSelf: "flex-end", background: "none", border: 0, color: "#c5a059", cursor: "pointer", fontSize: "0.8rem", padding: 0 }}>Esqueci minha senha</button>}
          {!recoveryMode && !forgotMode && !requestMode && <p style={{ color: "#71717a", fontSize: "0.75rem", lineHeight: 1.5, margin: 0 }}>Sua sessão permanece conectada neste dispositivo até você sair do painel.</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", backgroundColor: "#c5a059", color: "#000", fontWeight: "bold", padding: "0.75rem", borderRadius: "6px", border: "none", cursor: loading ? "not-allowed" : "pointer", marginTop: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
          >
            {loading ? <Loader2 style={{ animation: "spin 1s linear infinite", width: "18px", height: "18px" }} /> : requestMode ? "Enviar solicitação pelo WhatsApp" : recoveryMode ? "Salvar nova senha" : forgotMode ? "Enviar link de recuperação" : "Entrar no Painel"}
          </button>
          {forgotMode && <button type="button" onClick={() => { setForgotMode(false); setError(null); setNotice(null); }} style={{ background: "none", border: 0, color: "#a1a1aa", cursor: "pointer" }}>Voltar ao login</button>}
          {!recoveryMode && !forgotMode && <button type="button" onClick={() => { setRequestMode((value) => !value); setError(null); setNotice(null); }} style={{ background: "none", border: "1px solid #3f3524", color: "#d7ab63", padding: "0.7rem", borderRadius: "6px", cursor: "pointer" }}>{requestMode ? "Voltar ao login" : "Solicitar acesso"}</button>}
        </form>
      </div>
    </div>
  );
}
