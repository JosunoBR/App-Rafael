import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Download, RotateCcw, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showDetails: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('🛡️ [ErrorBoundary] Erro crítico capturado na interface:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null, showDetails: false });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  handleDownloadBackup = (): void => {
    try {
      const currentOrder = localStorage.getItem('mega12_current_order');
      const savedOrders = localStorage.getItem('mega12_saved_orders');
      const backupData = {
        timestamp: new Date().toISOString(),
        currentOrder: currentOrder ? JSON.parse(currentOrder) : null,
        savedOrders: savedOrders ? JSON.parse(savedOrders) : null
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mega12_backup_seguranca_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Não foi possível gerar o arquivo de backup local: ' + (err as Error).message);
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4 sm:p-6 font-sans">
          <div className="w-full max-w-2xl bg-slate-800/90 border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 backdrop-blur-md">
            {/* Cabeçalho */}
            <div className="flex items-center gap-4 mb-6">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Proteção de Interface Ativada
                </h1>
                <p className="text-sm text-slate-400 mt-0.5">
                  Um erro inesperado foi isolado para evitar a interrupção das suas atividades.
                </p>
              </div>
            </div>

            {/* Aviso de Segurança de Dados */}
            <div className="bg-emerald-950/40 border border-emerald-600/30 rounded-xl p-4 mb-6">
              <p className="text-sm text-emerald-300 font-medium flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Seus dados locais estão preservados em segurança no navegador.
              </p>
              <p className="text-xs text-emerald-400/80 mt-1">
                Nenhum dado digitado foi apagado. Você pode baixar uma cópia de segurança imediata ou tentar reabrir o módulo.
              </p>
            </div>

            {/* Ações */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex-1 min-w-[140px] px-4 py-2.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium text-sm rounded-xl transition-colors shadow-lg shadow-blue-900/30 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Tentar Novamente
              </button>

              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 min-w-[140px] px-4 py-2.5 bg-slate-700 hover:bg-slate-600 active:bg-slate-750 text-slate-200 font-medium text-sm rounded-xl transition-colors border border-slate-600 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                Recarregar Sistema
              </button>

              <button
                type="button"
                onClick={this.handleDownloadBackup}
                className="w-full sm:w-auto px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-750 text-amber-300 font-medium text-sm rounded-xl transition-colors border border-amber-500/30 flex items-center justify-center gap-2 cursor-pointer"
                title="Gera um arquivo JSON com todos os dados digitados do pedido atual"
              >
                <Download className="w-4 h-4" />
                Baixar Cópia dos Dados (Backup JSON)
              </button>
            </div>

            {/* Detalhes Técnicos (Colapsável) */}
            <div className="border-t border-slate-700/80 pt-4">
              <button
                type="button"
                onClick={() => this.setState(prev => ({ showDetails: !prev.showDetails }))}
                className="text-xs text-slate-400 hover:text-slate-300 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                {this.state.showDetails ? 'Ocultar detalhes técnicos' : 'Ver detalhes técnicos do erro'}
              </button>

              {this.state.showDetails && (
                <div className="mt-3 p-3 bg-slate-950/70 border border-slate-800 rounded-lg text-xs font-mono text-rose-300 overflow-x-auto max-h-48">
                  <p className="font-semibold text-rose-400">{this.state.error?.toString()}</p>
                  {this.state.errorInfo?.componentStack && (
                    <pre className="mt-2 text-[11px] text-slate-400 whitespace-pre-wrap">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
