import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

type Props = { children: ReactNode; moduleName: string };
type State = { failed: boolean };

// Evita uma tela preta quando uma fonte externa ou dado antigo quebra uma aba.
export default class ModuleErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`Falha no módulo ${this.props.moduleName}:`, error, info);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <section style={{ background: "#121212", border: "1px solid #7f1d1d", borderRadius: 10, padding: 28, color: "#e4e4e7", textAlign: "center" }}>
      <AlertTriangle size={28} color="#fbbf24" style={{ marginBottom: 10 }} />
      <h2 style={{ margin: 0, fontSize: 18 }}>Não foi possível abrir {this.props.moduleName}</h2>
      <p style={{ color: "#a1a1aa", fontSize: 13, lineHeight: 1.5 }}>Os demais módulos continuam protegidos. Atualize esta tela; se persistir, registre a mensagem do console para corrigirmos a origem dos dados.</p>
      <button onClick={() => this.setState({ failed: false })} style={{ background: "#c5a059", color: "#09090b", border: 0, borderRadius: 7, padding: "9px 12px", fontWeight: 800, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}><RefreshCw size={15} /> Tentar novamente</button>
    </section>;
  }
}
