import { useState, useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
import { 
  LayoutDashboard, 
  Building2, 
  Building, 
  Layers, 
  Bot, 
  GitBranch, 
  Users, 
  UserCheck, 
  UserCog,
  TrendingUp, 
  FileText,
  BookOpen,
  BrainCircuit,
  Shapes,
  Settings,
  Menu,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowUp,
  ArrowDown,
  RotateCcw,
  Pencil,
  Check,
  GripVertical
} from "lucide-react";
import { useTranslation } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  role?: "admin" | "equipe" | "afiliado";
}

export function Sidebar({ activeTab, setActiveTab, role = "admin" }: SidebarProps) {
  const [isOpenMobile, setIsOpenMobile] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem("luan.sidebar.collapsed") === "true");
  const [customOrder,setCustomOrder]=useState<string[]>([]);
  const [organizing,setOrganizing]=useState(false);
  const [dragging,setDragging]=useState<string|null>(null);
  const customOrderRef=useRef<string[]>([]);
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
    { id: "minha-conta", label: "Minha conta", icon: UserCheck },
    { id: "afiliados", label: t("catalog"), icon: UserCheck },
  ] : [
    { id: "dashboard", label: t("dashboard"), icon: LayoutDashboard },
    { id: "minha-conta", label: "Minha conta", icon: UserCheck },
    { id: "clientes", label: t("clients"), icon: Users },
    { id: "empreendimentos", label: t("developments"), icon: Building },
    { id: "unidades", label: t("units"), icon: Layers },
    { id: "fluxos", label: t("financialFlows"), icon: GitBranch },
    { id: "apresentacoes", label: t("presentations"), icon: FileText },
    { id: "importar-ia", label: t("importAI"), icon: Bot },
    { id: "playbook", label: "Playbook", icon: BrainCircuit },
    { id: "afiliados", label: t("affiliates"), icon: UserCheck },
    { id: "blog", label: "Blog", icon: BookOpen },
    { id: "indicadores", label: t("indicators"), icon: TrendingUp },
    { id: "construtoras", label: t("developers"), icon: Building2 },
    { id: "tipologias", label: "Tipologias e plantas", icon: Shapes },
    { id: "prompts", label: t("prompts"), icon: FileText },
    ...(role === "admin" ? [{ id: "usuarios-acessos", label: "Usuários e acessos", icon: UserCog }] : []),
    { id: "configuracoes", label: t("settings"), icon: Settings },
  ];
  const orderedItems=[...menuItems].sort((a,b)=>{const ai=customOrder.indexOf(a.id),bi=customOrder.indexOf(b.id);return (ai<0?999:ai)-(bi<0?999:bi)});
  useEffect(()=>{void supabase.auth.getUser().then(async({data})=>{if(!data.user)return;const{data:profile}=await supabase.from("perfis_usuario").select("menu_ordem").eq("user_id",data.user.id).maybeSingle();if(Array.isArray(profile?.menu_ordem)){const next=profile.menu_ordem.filter((id):id is string=>typeof id==="string");customOrderRef.current=next;setCustomOrder(next);}});},[]);
  async function persistOrder(next:string[]){customOrderRef.current=next;setCustomOrder(next);const{error}=await supabase.rpc("salvar_menu_ordem",{p_ordem:next});if(error)console.error("Não foi possível salvar a ordem do menu",error);}
  const move=(id:string,direction:-1|1)=>{const ids=orderedItems.map(item=>item.id),index=ids.indexOf(id),target=index+direction;if(target<0||target>=ids.length)return;[ids[index],ids[target]]=[ids[target],ids[index]];void persistOrder(ids)};
  const moveTo=(id:string,targetId:string)=>{if(id===targetId)return;const currentIds=[...menuItems].sort((a,b)=>{const ai=customOrderRef.current.indexOf(a.id),bi=customOrderRef.current.indexOf(b.id);return(ai<0?999:ai)-(bi<0?999:bi)}).map(item=>item.id);const from=currentIds.indexOf(id),to=currentIds.indexOf(targetId);if(from<0||to<0)return;currentIds.splice(to,0,currentIds.splice(from,1)[0]);customOrderRef.current=currentIds;setCustomOrder(currentIds)};
  const startDrag=(event:ReactPointerEvent<HTMLButtonElement>,id:string)=>{event.preventDefault();event.stopPropagation();event.currentTarget.setPointerCapture(event.pointerId);setDragging(id)};
  const continueDrag=(event:ReactPointerEvent<HTMLButtonElement>)=>{if(!dragging)return;event.preventDefault();const target=document.elementFromPoint(event.clientX,event.clientY)?.closest<HTMLElement>("[data-menu-id]");const targetId=target?.dataset.menuId;if(targetId)moveTo(dragging,targetId)};
  const finishDrag=(event:ReactPointerEvent<HTMLButtonElement>)=>{if(!dragging)return;event.preventDefault();event.stopPropagation();setDragging(null);void persistOrder(customOrderRef.current)};

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
          {orderedItems.map((item,index) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <div
                key={item.id}
                data-menu-id={item.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  borderRadius: "6px",
                  backgroundColor: isActive ? "#1c1917" : "transparent",
                  border: dragging===item.id ? "1px solid #8e672e" : "1px solid transparent",
                  opacity: dragging===item.id ? .72 : 1,
                  transition: "background-color .2s ease, border-color .2s ease"
                }}
              >
                {organizing&&<button type="button" aria-label={`Arrastar ${item.label}`} title="Arrastar para reorganizar" onPointerDown={event=>startDrag(event,item.id)} onPointerMove={continueDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag} style={{alignSelf:"stretch",display:"grid",placeItems:"center",border:0,background:"transparent",color:"#d7ab63",padding:collapsed&&!isMobile?4:"0 3px 0 7px",cursor:dragging===item.id?"grabbing":"grab",touchAction:"none"}}><GripVertical size={15}/></button>}
                <button
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  title={collapsed && !isMobile ? item.label : undefined}
                  style={{display:"flex",alignItems:"center",gap:"0.75rem",flex:1,minWidth:0,padding:collapsed&&!isMobile?"0.65rem":"0.6rem 0.5rem",border:0,background:"transparent",color:isActive?"#c5a059":"#a1a1aa",fontWeight:isActive?"bold":"normal",fontSize:"0.85rem",cursor:"pointer",textAlign:collapsed&&!isMobile?"center":"left",justifyContent:collapsed&&!isMobile?"center":"flex-start"}}
                >
                  <Icon size={18} style={{ color: isActive ? "#c5a059" : "#71717a", flexShrink:0 }} />
                  {(!collapsed || isMobile) && <span style={{overflow:"hidden",textOverflow:"ellipsis"}}>{item.label}</span>}
                </button>
                {organizing&&(!collapsed||isMobile)&&<span style={{display:"flex",gap:1,paddingRight:3}}><button type="button" aria-label={`Mover ${item.label} para cima`} disabled={!index} onClick={()=>move(item.id,-1)} style={{display:"grid",placeItems:"center",border:0,background:"transparent",color:"#a1a1aa",padding:5,opacity:index?1:.25,cursor:index?"pointer":"default"}}><ArrowUp size={13}/></button><button type="button" aria-label={`Mover ${item.label} para baixo`} disabled={index===orderedItems.length-1} onClick={()=>move(item.id,1)} style={{display:"grid",placeItems:"center",border:0,background:"transparent",color:"#a1a1aa",padding:5,opacity:index<orderedItems.length-1?1:.25,cursor:index<orderedItems.length-1?"pointer":"default"}}><ArrowDown size={13}/></button></span>}
              </div>
            );
          })}
        </nav>
        <div style={{display:"flex",justifyContent:collapsed&&!isMobile?"center":"flex-end",gap:4,paddingTop:8,borderTop:"1px solid #242428"}}>{organizing&&<button type="button" onClick={()=>void persistOrder([])} title="Restaurar ordem padrão" aria-label="Restaurar ordem padrão" style={{display:"grid",placeItems:"center",border:0,background:"transparent",color:"#71717a",padding:8,cursor:"pointer"}}><RotateCcw size={15}/></button>}<button type="button" onClick={()=>{setDragging(null);setOrganizing(value=>!value)}} title={organizing?"Concluir organização":"Organizar menu"} aria-label={organizing?"Concluir organização do menu":"Organizar menu"} aria-pressed={organizing} style={{display:"grid",placeItems:"center",border:`1px solid ${organizing?"#8e672e":"#34343a"}`,borderRadius:6,background:organizing?"#2a2113":"#161618",color:organizing?"#d7ab63":"#8b8b95",padding:8,cursor:"pointer"}}>{organizing?<Check size={16}/>:<Pencil size={15}/>}</button></div>
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
