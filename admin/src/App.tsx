import React, { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import { Loader2 } from "lucide-react";

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    }).catch(() => {
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div style={{ height: "100vh", backgroundColor: "#0a0a0a", color: "#c5a059", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Loader2 style={{ animation: "spin 1s linear infinite", width: "32px", height: "32px" }} />
      </div>
    );
  }

  return session ? <Dashboard userEmail={session.user?.email} /> : <Dashboard userEmail="admin@luanespecialista.com.br" />;
}