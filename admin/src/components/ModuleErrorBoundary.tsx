import { Component, type ErrorInfo, type ReactNode } from "react";

export default class ModuleErrorBoundary extends Component<{ children: ReactNode; moduleName?: string }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error("Falha ao renderizar módulo", error, info); }
  render() {
    if (!this.state.error) return this.props.children;
    const missingChunk = /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk .* failed/i.test(this.state.error.message);
    return <main style={{minHeight:"60vh",display:"grid",placeItems:"center",color:"#f4f4f5"}}><section role="alert" style={{maxWidth:680,background:"#101012",border:"1px solid #7f1d1d",borderRadius:12,padding:22}}><h1 style={{fontSize:20,marginTop:0}}>{this.props.moduleName || "Este módulo"} encontrou um erro</h1><p style={{color:"#fca5a5"}}>{missingChunk?"O painel foi atualizado enquanto esta página estava aberta. Carregue a versão mais recente para continuar.":this.state.error.message || "Erro inesperado de renderização."}</p><p style={{color:"#a1a1aa",fontSize:12}}>{missingChunk?"Se a atualização não resolver, avise a equipe; o arquivo da nova versão pode não ter sido publicado corretamente.":"O restante do painel continua protegido. Se persistir, copie esta mensagem para o suporte."}</p><button onClick={()=>{if(missingChunk){const url=new URL(window.location.href);url.searchParams.set("_painel_atualizado",Date.now().toString());window.location.assign(url.href)}else this.setState({error:null})}} style={{background:"#c5a059",border:0,borderRadius:7,padding:"9px 12px",fontWeight:800,cursor:"pointer"}}>{missingChunk?"Carregar versão atual":"Tentar novamente"}</button></section></main>;
  }
}
