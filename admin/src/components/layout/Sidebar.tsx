import { useState, useEffect } from "react";
import { 
  LayoutDashboard, 
  Building2, 
  Building, 
  Layers, 
  Bot, 
  GitBranch, 
  Users, 
  UserCheck, 
  TrendingUp, 
  Link2, 
  FileText,
  Settings,
  Menu,
  X
} from "lucide-react";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role?: "admin" | "equipe" | "afiliado";
}

export function Sidebar({ activeTab, setActiveTab, role = "admin" }: SidebarProps) {
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const menuItems = role === "afiliado" ? [
    { id: "afiliados", label: "Meu catálogo", icon: UserCheck },
  ] : [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "construtoras", label: "Construtoras", icon: Building2 },
    { id: "empreendimentos", label: "Empreendimentos", icon: Building },
    { id: "apresentacoes", label: "Apresentações", icon: FileText },
    { id: "unidades", label: "Unidades", icon: Layers },
    { id: "importar-ia", label: "Importar IA", icon: Bot },
    { id: "prompts", label: "Prompts", icon: FileText },
    { id: "fluxos", label: "Fluxos Financeiros", icon: GitBranch },
    { id: "clientes", label: "Clientes", icon: Users },
    { id: "afiliados", label: "Afiliados", icon: UserCheck },
    { id: "indicadores", label: "Indicadores (Selic/CUB)", icon: TrendingUp },
    { id: "links", label: "Links Temporários", icon: Link2 },
    { id: "configuracoes", label: "Configurações", icon: Settings },
  ];

  const handleSelect = (id: string) => {
    setActiveTab(id);
    if (isMobile) setIsOpenMobile(false);
  };

  return (
    <>
      {/* Botão de Menu para Celulares */}
      {isMobile && (
        <button
          onClick={() => setIsOpenMobile(!isOpenMobile)}
          style={{
            position: "fixed",
            bottom: "20px",
            right: "20px",
            zIndex: 9999,
            backgroundColor: "#c5a059",
            color: "#000",
            border: "none",
            borderRadius: "50%",
            width: "50px",
            height: "50px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
            cursor: "pointer"
          }}
        >
          {isOpenMobile ? <X size={24} /> : <Menu size={24} />}
        </button>
      )}

      {/* Container do Menu */}
      <aside
        style={{
          width: "250px",
          minWidth: "250px",
          backgroundColor: "#0d0d0f",
          borderRight: "1px solid #1a1a1e",
          height: "100vh",
          position: isMobile ? "fixed" : "sticky",
          top: 0,
          left: isMobile ? (isOpenMobile ? "0" : "-260px") : "0",
          zIndex: 1000,
          transition: "left 0.3s ease",
          display: "flex",
          flexDirection: "column",
          padding: "1.5rem 1rem",
          boxSizing: "border-box"
        }}
      >
        <a href="/" aria-label="Ir para a página inicial" title="Página inicial" style={{ marginBottom: "1.6rem", padding: "0 0.5rem", display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <img src="/imagens/logo.png" alt="Luan Especialista" style={{ width: 34, height: 34, objectFit: "contain", opacity: .9 }} />
          <span style={{ display: "grid", gap: 2 }}>
            <strong style={{ fontSize: ".78rem", color: "#d7ab63", letterSpacing: ".08em" }}>LUAN ESPECIALISTA</strong>
            <small style={{ fontSize: ".58rem", color: "#71717a", textTransform: "uppercase", letterSpacing: ".08em" }}>Inteligência imobiliária</small>
          </span>
        </a>

        <nav style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1, overflowY: "auto" }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: "0.6rem 0.8rem",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: isActive ? "#1c1917" : "transparent",
                  color: isActive ? "#c5a059" : "#a1a1aa",
                  fontWeight: isActive ? "bold" : "normal",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "all 0.2s ease"
                }}
              >
                <Icon size={18} style={{ color: isActive ? "#c5a059" : "#71717a" }} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Overlay escuro ao abrir o menu no celular */}
      {isMobile && isOpenMobile && (
        <div
          onClick={() => setIsOpenMobile(false)}
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            zIndex: 999
          }}
        />
      )}
    </>
  );
}
