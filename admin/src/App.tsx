import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ClientPortal from "./pages/ClientPortal";
import { Loader2 } from "lucide-react";
import LanguageSelector from "./components/LanguageSelector";
import ModuleErrorBoundary from "./components/ModuleErrorBoundary";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [accessRole, setAccessRole] = useState<"admin" | "cliente" | "afiliado">("admin");
  const [authError, setAuthError] = useState("");
  const [recoveringPassword, setRecoveringPassword] = useState(false);

  const validateAccess = async (nextSession: Session | null) => {
    setSession(nextSession);
    if (!nextSession) { setAuthorized(false); return; }
    let validationResult = await supabase.from("perfis_usuario").select("perfil,ativo").eq("user_id", nextSession.user.id).maybeSingle();
    if (validationResult.error && !["42P01", "PGRST205"].includes(validationResult.error.code || "")) {
      validationResult = await supabase.from("perfis_usuario").select("perfil,ativo").eq("user_id", nextSession.user.id).maybeSingle();
    }
    const { data, error } = validationResult;
    if (error) {
      setAuthorized(false);
      setAuthError("Não foi possível validar sua autorização. Por segurança, o acesso permaneceu bloqueado.");
      await supabase.auth.signOut();
      return;
    }
    const allowedProfiles = ["admin", "cliente", "afiliado"];
    const allowed = allowedProfiles.includes(data?.perfil || "") && data?.ativo === true;
    if (allowed) setAccessRole(data?.perfil as "admin" | "cliente" | "afiliado");
    setAuthorized(allowed);
    setAuthError(allowed ? "" : error ? "Não foi possível validar o acesso agora." : "Esta conta não possui um perfil de acesso ativo.");
    if (!allowed) await supabase.auth.signOut();
  };

  useEffect(() => {
    let mounted = true;

    const carregarSessao = async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Erro ao recuperar sessão:", error);
        }

        if (mounted) {
          await validateAccess(session);
        }
      } catch (error) {
        console.error("Erro de autenticação:", error);

        if (mounted) {
          setSession(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    carregarSessao();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (mounted) {
        if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && new URLSearchParams(window.location.search).get("recovery") === "1")) {
          setSession(session);
          setRecoveringPassword(true);
          setLoading(false);
        } else {
          window.setTimeout(() => { void validateAccess(session); }, 0);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!session || !authorized) return;
    const returnTo = new URLSearchParams(window.location.search).get("return");
    if (returnTo?.startsWith("/apresentacao/")) window.location.replace(returnTo);
  }, [session, authorized]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#080808",
          color: "#c5a059",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Loader2
          size={32}
          style={{
            animation: "spin 1s linear infinite",
          }}
        />
      </div>
    );
  }

  if (recoveringPassword) {
    return <><div style={{ position: "fixed", right: 18, top: 18, zIndex: 20 }}><LanguageSelector /></div><Login recoveryMode onPasswordUpdated={() => { setRecoveringPassword(false); void validateAccess(session); }} /></>;
  }

  if (!session || !authorized) {
    return <><div style={{ position: "fixed", right: 18, top: 18, zIndex: 20 }}><LanguageSelector /></div><Login externalError={authError} /></>;
  }

  const metadata = session.user.user_metadata || {};
  const userName = String(metadata.full_name || metadata.name || "").trim();
  if (accessRole === "cliente") return <ClientPortal userName={userName} />;
  return <ModuleErrorBoundary><Dashboard userName={userName} role={accessRole} /></ModuleErrorBoundary>;
}
