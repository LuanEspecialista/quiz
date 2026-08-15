import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./lib/supabase";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { Loader2 } from "lucide-react";
import LanguageSelector from "./components/LanguageSelector";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [authError, setAuthError] = useState("");
  const [recoveringPassword, setRecoveringPassword] = useState(false);

  const validateAdmin = async (nextSession: Session | null) => {
    setSession(nextSession);
    if (!nextSession) { setAuthorized(false); return; }
    const { data, error } = await supabase.from("perfis_usuario").select("perfil,ativo").eq("user_id", nextSession.user.id).maybeSingle();
    const profileUnavailable = error?.code === "42P01" || error?.code === "PGRST205";
    const allowed = profileUnavailable || (!error && data?.perfil === "admin" && data?.ativo === true);
    setAuthorized(allowed);
    setAuthError(allowed ? "" : error ? "Não foi possível validar o acesso administrativo." : "Esta conta não possui acesso administrativo ativo.");
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
          await validateAdmin(session);
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
        if (event === "PASSWORD_RECOVERY") {
          setSession(session);
          setRecoveringPassword(true);
          setLoading(false);
        } else {
          void validateAdmin(session);
        }
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
    return <><div style={{ position: "fixed", right: 18, top: 18, zIndex: 20 }}><LanguageSelector /></div><Login recoveryMode onPasswordUpdated={() => { setRecoveringPassword(false); void validateAdmin(session); }} /></>;
  }

  if (!session || !authorized) {
    return <><div style={{ position: "fixed", right: 18, top: 18, zIndex: 20 }}><LanguageSelector /></div><Login externalError={authError} /></>;
  }

  const metadata = session.user.user_metadata || {};
  const fallbackName = (session.user.email || "Usuário").split("@")[0].replace(/[._-]+/g, " ");
  const userName = String(metadata.full_name || metadata.name || fallbackName).trim();
  return <Dashboard userName={userName} />;
}
