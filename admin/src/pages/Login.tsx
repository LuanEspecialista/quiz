import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Eye, EyeOff, Lock, Mail, Loader2, UserRound } from "lucide-react";
import { clearAuthUrl, getPanelUrl } from "@/lib/authRedirect";
import { useLocale } from "@/lib/i18n";

const loginCopy = {
  "pt-BR": { subtitle:"Plataforma de Inteligência Patrimonial", fullName:"Nome completo", yourName:"Seu nome", identifier:"E-mail ou usuário", password:"Senha", newPassword:"Nova senha", confirmPassword:"Confirmar nova senha", forgot:"Esqueci minha senha", stay:"Sua sessão permanece conectada neste dispositivo até você sair do painel.", accessAs:"Quero acesso como", client:"Cliente", affiliate:"Afiliado", requestInfo:"A solicitação não cria uma conta. O acesso só será liberado após sua aprovação.", enter:"Entrar no Painel", request:"Enviar solicitação pelo WhatsApp", savePassword:"Salvar nova senha", recovery:"Enviar link de recuperação", back:"Voltar ao login", askAccess:"Solicitar acesso", badLogin:"E-mail, usuário ou senha incorretos.", emailRecovery:"Informe o e-mail da conta para recuperar a senha.", sentRecovery:"Enviamos o link de recuperação. Verifique também a caixa de spam.", minPassword:"A nova senha deve ter pelo menos 8 caracteres.", equalPassword:"As duas senhas precisam ser iguais.", updatedPassword:"Senha atualizada e acesso mantido neste dispositivo.", requestError:"Não foi possível registrar a solicitação. Confira os dados e tente novamente.", requestOk:"Solicitação registrada. Se desejar, avise também pelo WhatsApp." },
  "en-US": { subtitle:"Wealth Intelligence Platform", fullName:"Full name", yourName:"Your name", identifier:"Email or username", password:"Password", newPassword:"New password", confirmPassword:"Confirm new password", forgot:"Forgot my password", stay:"Your session remains connected on this device until you sign out.", accessAs:"Request access as", client:"Client", affiliate:"Affiliate", requestInfo:"This request does not create an account. Access is granted only after approval.", enter:"Sign in", request:"Send request via WhatsApp", savePassword:"Save new password", recovery:"Send recovery link", back:"Back to sign in", askAccess:"Request access", badLogin:"Incorrect email, username or password.", emailRecovery:"Enter the account email to recover the password.", sentRecovery:"We sent the recovery link. Please also check your spam folder.", minPassword:"The new password must contain at least 8 characters.", equalPassword:"Both passwords must match.", updatedPassword:"Password updated and access retained on this device.", requestError:"We could not register the request. Check the information and try again.", requestOk:"Request registered. You may also notify us via WhatsApp." },
  es: { subtitle:"Plataforma de Inteligencia Patrimonial", fullName:"Nombre completo", yourName:"Tu nombre", identifier:"Correo electrónico o usuario", password:"Contraseña", newPassword:"Nueva contraseña", confirmPassword:"Confirmar nueva contraseña", forgot:"Olvidé mi contraseña", stay:"Tu sesión permanecerá conectada en este dispositivo hasta que cierres sesión.", accessAs:"Solicitar acceso como", client:"Cliente", affiliate:"Afiliado", requestInfo:"La solicitud no crea una cuenta. El acceso se habilitará únicamente después de la aprobación.", enter:"Ingresar al panel", request:"Enviar solicitud por WhatsApp", savePassword:"Guardar nueva contraseña", recovery:"Enviar enlace de recuperación", back:"Volver al inicio de sesión", askAccess:"Solicitar acceso", badLogin:"Correo, usuario o contraseña incorrectos.", emailRecovery:"Introduce el correo de la cuenta para recuperar la contraseña.", sentRecovery:"Enviamos el enlace de recuperación. Revisa también la carpeta de spam.", minPassword:"La nueva contraseña debe tener al menos 8 caracteres.", equalPassword:"Las dos contraseñas deben coincidir.", updatedPassword:"Contraseña actualizada y acceso mantenido en este dispositivo.", requestError:"No fue posible registrar la solicitud. Revisa los datos e inténtalo de nuevo.", requestOk:"Solicitud registrada. Si lo deseas, avísanos también por WhatsApp." }
} as const;

export default function Login({ externalError = "", recoveryMode = false, onPasswordUpdated }: { externalError?: string; recoveryMode?: boolean; onPasswordUpdated?: () => void }) {
  const locale = useLocale();
  const c = loginCopy[locale];
  const [identifier, setIdentifier] = useState("");
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
  const [requestNickname, setRequestNickname] = useState("");
  const [birthdayDay, setBirthdayDay] = useState("");
  const [birthdayMonth, setBirthdayMonth] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const login = identifier.trim().toLowerCase();
    let loginError: { message: string } | null;
    if (login.includes("@")) {
      const result = await supabase.auth.signInWithPassword({ email: login, password });
      loginError = result.error;
    } else {
      const result = await supabase.functions.invoke("login-usuario", {
        body: { usuario: login, senha: password },
      });
      loginError = result.error;
      if (!loginError && result.data?.access_token && result.data?.refresh_token) {
        const sessionResult = await supabase.auth.setSession({
          access_token: result.data.access_token,
          refresh_token: result.data.refresh_token,
        });
        loginError = sessionResult.error;
      }
    }

    if (loginError) {
      setError(c.badLogin);
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !identifier.includes("@")) return setError(c.emailRecovery);
    setLoading(true); setError(null); setNotice(null);
    const redirectTo = getPanelUrl({ recovery: "1" });
    const { error } = await supabase.auth.resetPasswordForEmail(identifier.trim().toLowerCase(), { redirectTo });
    setLoading(false);
    if (error) setError(error.message); else setNotice(c.sentRecovery);
  };

  const handleNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return setError(c.minPassword);
    if (password !== passwordConfirmation) return setError(c.equalPassword);
    setLoading(true); setError(null);
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) await supabase.auth.refreshSession();
    setLoading(false);
    if (error) setError(error.message); else {
      clearAuthUrl();
      setNotice(c.updatedPassword);
      onPasswordUpdated?.();
    }
  };

  const handleAccessRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null); setNotice(null);
    const nickname = requestNickname.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9._-]{2,23}$/.test(nickname)) {
      setLoading(false); return setError("Escolha um nickname de 3 a 24 caracteres, usando letras, números, ponto, traço ou sublinhado.");
    }
    const day=Number(birthdayDay),month=Number(birthdayMonth);const validBirthday=month>=1&&month<=12&&day>=1&&day<=new Date(2000,month,0).getDate();
    if(!validBirthday){setLoading(false);return setError("Informe um dia e mês de aniversário válidos.");}
    const { error: requestError } = await supabase.rpc("solicitar_acesso", { p_nome: requestName.trim(), p_email: identifier.trim().toLowerCase(), p_tipo: accessType, p_usuario: nickname, p_aniversario_dia:day, p_aniversario_mes:month });
    setLoading(false);
    if (requestError) return setError(c.requestError);
    setNotice(c.requestOk);
    const message = (locale === "es"
      ? ["Hola, Luan. Quisiera solicitar acceso a la plataforma.", `Nombre: ${requestName.trim()}`, `Correo: ${identifier.trim()}`, `Usuario: ${nickname}`, `Tipo de acceso: ${accessType === "cliente" ? "Cliente" : "Afiliado"}`, "Si se aprueba, espero las instrucciones de acceso."]
      : locale === "en-US"
        ? ["Hello, Luan. I would like to request access to the platform.", `Name: ${requestName.trim()}`, `Email: ${identifier.trim()}`, `Username: ${nickname}`, `Access type: ${accessType === "cliente" ? "Client" : "Affiliate"}`, "If approved, I will wait for the access instructions."]
        : ["Olá, Luan! Gostaria de solicitar acesso à plataforma.", `Nome: ${requestName.trim()}`, `E-mail: ${identifier.trim()}`, `Nickname: ${nickname}`, `Aniversário: ${String(day).padStart(2,"0")}/${String(month).padStart(2,"0")}`, `Tipo de acesso: ${accessType === "cliente" ? "Cliente" : "Afiliado"}`, "Se aprovado, aguardo as instruções para entrar."]).join("\n");
    window.open(`https://wa.me/5547992120915?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="login-page" style={{ minHeight: "100dvh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#0a0a0a", padding: "max(1rem, env(safe-area-inset-top)) 1rem max(1rem, env(safe-area-inset-bottom))" }}>
      <style>{`@media(max-width:480px){.login-card{padding:1.35rem !important;border-radius:10px !important}.login-brand{margin-bottom:1.25rem !important}.login-brand h1{font-size:1.3rem !important}.login-page{align-items:flex-start !important;overflow-y:auto}.login-card{margin:auto 0}}`}</style>
      <div className="login-card" style={{ width: "100%", maxWidth: "400px", backgroundColor: "#121212", border: "1px solid #222", borderRadius: "12px", padding: "2.5rem", boxShadow: "0 10px 25px rgba(0,0,0,0.5)" }}>
        <div className="login-brand" style={{ textAlign: "center", marginBottom: "2rem" }}>
          <a href="/" aria-label="Ir para a página inicial"><img src="/imagens/logo.png" alt="Luan Especialista" style={{ width: 58, height: 58, objectFit: "contain", marginBottom: 12, opacity: .92 }} /></a>
          <h1 style={{ color: "#c5a059", fontSize: "1.75rem", fontWeight: "bold", margin: "0 0 0.5rem 0", letterSpacing: "1px" }}>LUAN ESPECIALISTA</h1>
          <p style={{ color: "#a1a1aa", fontSize: "0.875rem", margin: 0 }}>{c.subtitle}</p>
        </div>

        {(error || externalError) && (
          <div style={{ backgroundColor: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)", color: "#ef4444", padding: "0.75rem", borderRadius: "6px", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
            {error || externalError}
          </div>
        )}

        {notice && <div style={{ backgroundColor: "rgba(34,197,94,.1)", border: "1px solid rgba(34,197,94,.35)", color: "#4ade80", padding: "0.75rem", borderRadius: "6px", fontSize: "0.875rem", marginBottom: "1.5rem" }}>{notice}</div>}

        <form onSubmit={requestMode ? handleAccessRequest : recoveryMode ? handleNewPassword : forgotMode ? handleForgotPassword : handleLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {requestMode && <><div><label style={{ display: "block", color: "#a1a1aa", fontSize: "0.875rem", marginBottom: "0.5rem" }}>{c.fullName}</label><input required value={requestName} onChange={(e) => setRequestName(e.target.value)} placeholder={c.yourName} style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", color: "#fff", padding: "0.75rem", borderRadius: "6px", boxSizing: "border-box" }} /></div><div><label style={{ display: "block", color: "#a1a1aa", fontSize: "0.875rem", marginBottom: "0.5rem" }}>Nickname desejado</label><input required value={requestNickname} onChange={(e) => setRequestNickname(e.target.value.toLowerCase())} autoCapitalize="none" autoCorrect="off" placeholder="ex.: nome.sobrenome" style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", color: "#fff", padding: "0.75rem", borderRadius: "6px", boxSizing: "border-box" }} /><small style={{ color: "#71717a", lineHeight: 1.4 }}>Será usado junto com a senha para entrar. Não pode se repetir.</small></div><div><label style={{display:"block",color:"#a1a1aa",fontSize:"0.875rem",marginBottom:"0.5rem"}}>Aniversário (dia e mês)</label><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><input required type="number" min="1" max="31" value={birthdayDay} onChange={e=>setBirthdayDay(e.target.value)} placeholder="Dia" style={{width:"100%",boxSizing:"border-box",background:"#18181b",border:"1px solid #27272a",color:"#fff",padding:"0.75rem",borderRadius:6}}/><input required type="number" min="1" max="12" value={birthdayMonth} onChange={e=>setBirthdayMonth(e.target.value)} placeholder="Mês" style={{width:"100%",boxSizing:"border-box",background:"#18181b",border:"1px solid #27272a",color:"#fff",padding:"0.75rem",borderRadius:6}}/></div></div></>}
          {!recoveryMode && (
          <div>
            <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.875rem", marginBottom: "0.5rem" }}>{forgotMode || requestMode ? "E-mail" : c.identifier}</label>
            <div style={{ position: "relative" }}>
              {forgotMode || requestMode ? <Mail style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#52525b", width: "18px", height: "18px" }} /> : <UserRound style={{ position: "absolute", left: "0.75rem", top: "50%", transform: "translateY(-50%)", color: "#52525b", width: "18px", height: "18px" }} />}
              <input
                type={forgotMode || requestMode ? "email" : "text"}
                required
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder={forgotMode || requestMode ? "seu@email.com" : "seu@email.com ou seu.usuario"}
                autoCapitalize="none"
                autoCorrect="off"
                style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", color: "#fff", padding: "0.75rem 0.75rem 0.75rem 2.5rem", borderRadius: "6px", outline: "none", boxSizing: "border-box" }}
              />
            </div>
          </div>
          )}

          {!forgotMode && !requestMode && <div>
            <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.875rem", marginBottom: "0.5rem" }}>{recoveryMode ? c.newPassword : c.password}</label>
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
            <label style={{ display: "block", color: "#a1a1aa", fontSize: "0.875rem", marginBottom: "0.5rem" }}>{c.confirmPassword}</label>
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

          {requestMode && <div><label style={{ display: "block", color: "#a1a1aa", fontSize: "0.875rem", marginBottom: "0.5rem" }}>{c.accessAs}</label><select value={accessType} onChange={(e) => setAccessType(e.target.value as "cliente" | "afiliado")} style={{ width: "100%", backgroundColor: "#18181b", border: "1px solid #27272a", color: "#fff", padding: "0.75rem", borderRadius: "6px" }}><option value="cliente">{c.client}</option><option value="afiliado">{c.affiliate}</option></select><p style={{ color: "#71717a", fontSize: "0.75rem", lineHeight: 1.5 }}>{c.requestInfo}</p></div>}
          {!recoveryMode && !forgotMode && !requestMode && <button type="button" onClick={() => { setForgotMode(true); setError(null); }} style={{ alignSelf: "flex-end", background: "none", border: 0, color: "#c5a059", cursor: "pointer", fontSize: "0.8rem", padding: 0 }}>{c.forgot}</button>}
          {!recoveryMode && !forgotMode && !requestMode && <p style={{ color: "#71717a", fontSize: "0.75rem", lineHeight: 1.5, margin: 0 }}>{c.stay}</p>}

          <button
            type="submit"
            disabled={loading}
            style={{ width: "100%", backgroundColor: "#c5a059", color: "#000", fontWeight: "bold", padding: "0.75rem", borderRadius: "6px", border: "none", cursor: loading ? "not-allowed" : "pointer", marginTop: "0.5rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
          >
            {loading ? <Loader2 style={{ animation: "spin 1s linear infinite", width: "18px", height: "18px" }} /> : requestMode ? c.request : recoveryMode ? c.savePassword : forgotMode ? c.recovery : c.enter}
          </button>
          {forgotMode && <button type="button" onClick={() => { setForgotMode(false); setError(null); setNotice(null); }} style={{ background: "none", border: 0, color: "#a1a1aa", cursor: "pointer" }}>{c.back}</button>}
          {!recoveryMode && !forgotMode && <button type="button" onClick={() => { setRequestMode((value) => !value); setError(null); setNotice(null); }} style={{ background: "none", border: "1px solid #3f3524", color: "#d7ab63", padding: "0.7rem", borderRadius: "6px", cursor: "pointer" }}>{requestMode ? c.back : c.askAccess}</button>}
        </form>
      </div>
    </div>
  );
}
