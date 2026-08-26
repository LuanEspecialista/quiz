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
  X,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { useTranslation } from "../../lib/i18n";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role?: "admin" | "equipe" | "afiliado";
}

export function Sidebar({ activeTab, setActiveTab, role = "admin" }: SidebarProps) {
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("luan.sidebar.collapsed") === "true");
  const { t } = useTranslation();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const width = isMobile ? "0px" : collapsed ? "76px" : "250px";
    document.documentElement.style.setProperty("--sidebar-width", width);
    return () => { document.documentElement.style.removeProperty("--sidebar-width"); };
  }, [collapsed, isMobile]);

  const toggleCollapsed = () => setCollapsed(current => {
    const next = !current;
    localStorage.setItem("luan.sidebar.collapsed", String(next));
    return next;
  });

  const menuItems = role === "afiliado" ? [
    { id: "afiliados", label: t("catalog"), icon: UserCheck },
  ] : [
    { id: "dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { id: "construtoras", label: t("developers"), icon: Building2 },
    { id: "empreendimentos", label: t("developments"), icon: Building },
    { id: "apresentacoes", label: t("presentations"), icon: FileText },
    { id: "unidades", label: t("units"), icon: Layers },
    { id: "importar-ia", label: t("importAI"), icon: Bot },
    { id: "prompts", label: t("prompts"), icon: FileText },
    { id: "fluxos", label: t("financialFlows"), icon: GitBranch },
    { id: "clientes", label: t("clients"), icon: Users },
    { id: "afiliados", label: t("affiliates"), icon: UserCheck },
    { id: "indicadores", label: t("indicators"), icon: TrendingUp },
    { id: "links", label: t("temporaryLinks"), icon: Link2 },
    { id: "configuracoes", label: t("settings"), icon: Settings },
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
          width: isMobile ? "250px" : collapsed ? "76px" : "250px",
          minWidth: isMobile ? "250px" : collapsed ? "76px" : "250px",
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
          padding: collapsed && !isMobile ? "1.5rem .7rem" : "1.5rem 1rem",
          boxSizing: "border-box"
        }}
      >
        <div style={{ display: "flex", justifyContent: collapsed && !isMobile ? "center" : "space-between", alignItems: "center", marginBottom: "1.6rem" }}>
        <a href="/" aria-label="Ir para a página inicial" title="Página inicial" style={{ padding: "0 0.5rem", display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
          <img src="/imagens/logo.png" alt="Luan Especialista" style={{ width: 34, height: 34, objectFit: "contain", opacity: .9 }} />
          {!collapsed && <span style={{ display: "grid", gap: 2 }}>
            <strong style={{ fontSize: ".78rem", color: "#d7ab63", letterSpacing: ".08em" }}>LUAN ESPECIALISTA</strong>
            <small style={{ fontSize: ".58rem", color: "#71717a", textTransform: "uppercase", letterSpacing: ".08em" }}>Inteligência imobiliária</small>
          </span>}
        </a>
        {!isMobile && !collapsed && <button type="button" onClick={toggleCollapsed} title={t("collapseMenu")} aria-label={t("collapseMenu")} style={{ color: "#8b8b95", border: 0, background: "transparent", cursor: "pointer", padding: 5 }}><PanelLeftClose size={17} /></button>}
        {!isMobile && collapsed && <button type="button" onClick={toggleCollapsed} title={t("expandMenu")} aria-label={t("expandMenu")} style={{ position: "absolute", top: 15, right: -30, color: "#d7ab63", border: "1px solid #34343a", background: "#161618", borderRadius: 5, cursor: "pointer", padding: 5 }}><PanelLeftOpen size={15} /></button>}
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: 1, overflowY: "auto" }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                title={collapsed && !isMobile ? item.label : undefined}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  padding: collapsed && !isMobile ? "0.65rem" : "0.6rem 0.8rem",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: isActive ? "#1c1917" : "transparent",
                  color: isActive ? "#c5a059" : "#a1a1aa",
                  fontWeight: isActive ? "bold" : "normal",
                  fontSize: "0.85rem",
                  cursor: "pointer",
                  textAlign: collapsed && !isMobile ? "center" : "left",
                  justifyContent: collapsed && !isMobile ? "center" : "flex-start",
                  transition: "all 0.2s ease"
                }}
              >
                <Icon size={18} style={{ color: isActive ? "#c5a059" : "#71717a" }} />
                {(!collapsed || isMobile) && <span>{item.label}</span>}
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
