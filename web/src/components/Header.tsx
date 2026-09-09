import React from 'react';
import { 
  Home,
  ShoppingCart, 
  PackageCheck, 
  BarChart3, 
  Building2, 
  FolderOpen, 
  Settings, 
  Plus, 
  Save, 
  FileSpreadsheet, 
  FileText, 
  ShoppingBag, 
  Boxes, 
  CreditCard,
  Users as UsersIcon,
  Monitor,
  Smartphone,
  Sparkles,
  Clock,
  Trash2,
  CheckCircle2,
  ChevronRight,
  Warehouse,
  Copy
} from 'lucide-react';
import { PurchaseOrder, User, UserRole } from '../shared/types';
import { ActiveNavTab } from './Sidebar';

interface HeaderProps {
  activeNav: ActiveNavTab;
  order: PurchaseOrder;
  currentUser: User;
  viewMode: 'desktop' | 'mobile_purchases' | 'mobile_separation';
  onChangeViewMode: (mode: 'desktop' | 'mobile_purchases' | 'mobile_separation') => void;
  hasActiveDraft: boolean;
  isSavedOrder: boolean;
  onNewOrder: () => void;
  onSaveOrder: () => void;
  onCloseOrder?: () => void;
  onDuplicateOrder?: () => void;
  onDiscardDraft: () => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
  onSelectNav?: (tab: ActiveNavTab) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeNav,
  order,
  currentUser,
  viewMode,
  onChangeViewMode,
  hasActiveDraft,
  isSavedOrder,
  onNewOrder,
  onSaveOrder,
  onCloseOrder,
  onDuplicateOrder,
  onDiscardDraft,
  onExportExcel,
  onExportPDF,
  onSelectNav
}) => {
  const userRole: UserRole = currentUser?.role || 'diretoria';
  const canAccessOrders = userRole === 'diretoria';

  // Configurações de Título e Ícone da Página Ativa
  const getNavMeta = (tab: ActiveNavTab) => {
    switch (tab) {
      case 'home':
        return { title: 'Visão Geral & Hub', group: 'Operação', icon: Home, color: 'text-emerald-500' };
      case 'orders':
        return { title: 'Cotação & Pedidos de Compras', group: 'Operação', icon: ShoppingCart, color: 'text-emerald-500' };
      case 'stock':
        return { title: 'Estoque do Depósito Central (CD Matriz)', group: 'Operação', icon: Warehouse, color: 'text-emerald-500' };
      case 'separation':
        return { title: 'Separação & Distribuição', group: 'Operação', icon: PackageCheck, color: 'text-emerald-500' };
      case 'financial':
        return { title: 'Gestão Financeira & Boletos', group: 'Gestão', icon: CreditCard, color: 'text-amber-500' };
      case 'dashboard':
        return { title: 'Dashboard Executivo & Barganha BI', group: 'Gestão', icon: BarChart3, color: 'text-teal-500' };
      case 'history':
        return { title: 'Histórico & Arquivo de Pedidos', group: 'Gestão', icon: FolderOpen, color: 'text-amber-500' };
      case 'separationHistory':
        return { title: 'Histórico de Separações & Conferência', group: 'Gestão', icon: Boxes, color: 'text-teal-500' };
      case 'products':
        return { title: 'Catálogo de Produtos & Imagens', group: 'Cadastros', icon: ShoppingBag, color: 'text-purple-500' };
      case 'suppliers':
        return { title: 'Cadastro de Fornecedores & ST', group: 'Cadastros', icon: Building2, color: 'text-emerald-500' };
      case 'fiscal':
        return { title: 'Configurações Fiscais & Parâmetros', group: 'Cadastros', icon: Settings, color: 'text-indigo-500' };
      case 'users':
        return { title: 'Gestão de Usuários & Acessos (RBAC)', group: 'Sistema', icon: UsersIcon, color: 'text-pink-500' };
      default:
        return { title: 'Sistema Mega 12', group: 'Matriz', icon: ShoppingBag, color: 'text-emerald-500' };
    }
  };

  const navMeta = getNavMeta(activeNav);
  const IconComp = navMeta.icon;

  return (
    <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200/80 dark:border-slate-800 backdrop-blur-md transition-colors shadow-2xs">
      <div className="w-full px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        
        {/* Lado Esquerdo: Breadcrumb & Título da Página (Sem quebras de texto) */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shadow-xs border border-emerald-200/60 dark:border-emerald-800/60 shrink-0">
            <IconComp className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500 leading-none mb-1">
              <span>Rede Mega 12</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="text-slate-600 dark:text-slate-400">{navMeta.group}</span>
              {activeNav === 'orders' && hasActiveDraft && !isSavedOrder && (
                <span className="ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 whitespace-nowrap">
                  Rascunho Ativo
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight whitespace-nowrap">
                {activeNav === 'orders' ? 'Cotação & Pedidos' : navMeta.title}
              </h1>
              {(activeNav === 'orders' || activeNav === 'separation') && order?.header?.numeroPedido && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-600 text-white inline-flex items-center gap-1.5 shadow-xs whitespace-nowrap shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                  <span>{order.header.numeroPedido}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Lado Direito: Modos de Dispositivo & Ações Contextuais Agrupadas */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          
          {/* Grupo 1: Seletor de Modo de Visualização & Sincronizar BD */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold shadow-2xs">
              <button
                onClick={() => onChangeViewMode('desktop')}
                className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'desktop'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Visualização Completa para Computadores"
              >
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Desktop</span>
              </button>

              <button
                onClick={() => onChangeViewMode('mobile_purchases')}
                className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'mobile_purchases'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Modo Mobile: Digitação Rápida para Feiras e Viagens"
              >
                <Smartphone className="w-3.5 h-3.5 text-emerald-300" />
                <span className="hidden sm:inline">Viagens</span>
              </button>

              <button
                onClick={() => onChangeViewMode('mobile_separation')}
                className={`px-2.5 py-1.5 rounded-lg transition flex items-center gap-1.5 cursor-pointer ${
                  viewMode === 'mobile_separation'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Modo Mobile: Romaneio de Bolso para Doca e Galpão"
              >
                <PackageCheck className="w-3.5 h-3.5 text-teal-300" />
                <span className="hidden sm:inline">Doca</span>
              </button>
            </div>
          </div>

          {/* Divisor vertical sutil */}
          <div className="hidden xl:block h-6 w-px bg-slate-200 dark:bg-slate-700 mx-0.5" />

          {/* Grupo 2: Ações Específicas da Tela de Cotação & Pedidos */}
          {activeNav === 'orders' && viewMode === 'desktop' && canAccessOrders && (
            <div className="flex items-center gap-2 flex-wrap">
              
              {/* Subgrupo: Gestão do Pedido (Novo, Duplicar, Descartar) */}
              <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                <button
                  onClick={onNewOrder}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 hover:shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  title="Criar novo pedido em branco"
                >
                  <Plus className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Novo</span>
                </button>

                {onDuplicateOrder && (
                  <button
                    onClick={onDuplicateOrder}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 hover:shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    title="Duplicar este pedido para ajustar quantidades"
                  >
                    <Copy className="w-3.5 h-3.5 text-blue-500" />
                    <span className="hidden sm:inline">Duplicar</span>
                  </button>
                )}

                {onDiscardDraft && (
                  <button
                    onClick={() => {
                      if (window.confirm('Tem certeza que deseja descartar as alterações deste pedido e zerar a digitação?')) {
                        onDiscardDraft();
                      }
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition cursor-pointer"
                    title="Descartar rascunho e zerar pedido"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Subgrupo: Exportações (Excel & PDF) */}
              <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
                <button
                  onClick={onExportExcel}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 hover:shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  title="Exportar Matriz em Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Excel</span>
                </button>

                <button
                  onClick={onExportPDF}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 hover:shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  title="Gerar PDF do Pedido de Compra Oficial (Via Fornecedor)"
                >
                  <FileText className="w-3.5 h-3.5 text-rose-500" />
                  <span>PDF</span>
                </button>
              </div>

              {/* Subgrupo: Ações Principais (Salvar & Fechar Pedido) */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={onSaveOrder}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 hover:border-amber-400 hover:text-amber-700 dark:hover:text-amber-400 shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                  title="Salvar alterações e manter pedido em espera/rascunho"
                >
                  <Save className="w-3.5 h-3.5 text-amber-500" />
                  <span>Salvar</span>
                </button>

                {onCloseOrder && (
                  <button
                    onClick={onCloseOrder}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/30 transition flex items-center gap-1.5 cursor-pointer hover:scale-102"
                    title="Fechar pedido e enviar para a separação do depósito"
                  >
                    <PackageCheck className="w-3.5 h-3.5" />
                    <span>Fechar Pedido</span>
                  </button>
                )}
              </div>

            </div>
          )}

          {/* Grupo 3: Ações Específicas da Tela de Separação */}
          {activeNav === 'separation' && viewMode === 'desktop' && (
            <div className="flex items-center gap-1 bg-slate-100/90 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-2xs">
              <button
                onClick={onExportExcel}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 hover:shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                title="Exportar Romaneio em Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Excel</span>
              </button>

              <button
                onClick={onExportPDF}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-white dark:hover:bg-slate-900 hover:shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                title="Imprimir Romaneio PDF"
              >
                <FileText className="w-3.5 h-3.5 text-rose-500" />
                <span>Romaneio PDF</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </header>
  );
};
