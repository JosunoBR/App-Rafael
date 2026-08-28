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
  Warehouse
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
  onDiscardDraft,
  onExportExcel,
  onExportPDF,
  onSelectNav
}) => {
  const userRole: UserRole = currentUser?.role || 'diretoria';
  const canAccessOrders = userRole === 'diretoria' || userRole === 'comprador';

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
        return { title: 'Separação & Matriz de 20 Lojas', group: 'Operação', icon: PackageCheck, color: 'text-emerald-500' };
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
    <header className="sticky top-0 z-20 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200/80 dark:border-slate-800 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        
        {/* Lado Esquerdo: Breadcrumb & Título da Página */}
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center ${navMeta.color} shadow-xs border border-slate-200/60 dark:border-slate-700/60 shrink-0`}>
            <IconComp className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              <span>Rede Mega 12</span>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="text-slate-600 dark:text-slate-400">{navMeta.group}</span>
              {activeNav === 'orders' && hasActiveDraft && !isSavedOrder && (
                <span className="ml-1.5 px-2 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 animate-pulse">
                  Rascunho Ativo
                </span>
              )}
            </div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight leading-tight">
              {navMeta.title}
            </h1>
          </div>
        </div>

        {/* Lado Direito: Modos de Dispositivo & Ações Contextuais */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          
          {/* Seletor de Modo de Visualização (Desktop vs Mobile PWA) */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/90 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold">
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
              <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
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
              <PackageCheck className="w-3.5 h-3.5 text-teal-400" />
              <span className="hidden sm:inline">Doca</span>
            </button>
          </div>

          {/* Ações Específicas da Tela de Cotação & Pedidos */}
          {activeNav === 'orders' && viewMode === 'desktop' && canAccessOrders && (
            <div className="flex items-center gap-1.5 pl-1">
              <button
                onClick={onNewOrder}
                className="px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center gap-1 cursor-pointer"
                title="Criar novo pedido em branco"
              >
                <Plus className="w-3.5 h-3.5 text-emerald-500" />
                <span className="hidden sm:inline">Novo</span>
              </button>

              <button
                onClick={onExportExcel}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition flex items-center gap-1 cursor-pointer"
                title="Exportar Matriz em Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Excel</span>
              </button>

              <button
                onClick={onExportPDF}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900 transition flex items-center gap-1 cursor-pointer"
                title="Gerar PDF do Romaneio"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">PDF</span>
              </button>

              <button
                onClick={onSaveOrder}
                className="px-3.5 py-1.5 rounded-xl text-xs font-extrabold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/30 transition flex items-center gap-1.5 cursor-pointer hover:scale-102"
                title="Salvar alterações no SQLite"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar</span>
              </button>
            </div>
          )}

          {/* Ações Específicas da Tela de Separação */}
          {activeNav === 'separation' && viewMode === 'desktop' && (
            <div className="flex items-center gap-1.5 pl-1">
              <button
                onClick={onExportExcel}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition flex items-center gap-1 cursor-pointer"
                title="Exportar Romaneio em Excel"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>

              <button
                onClick={onExportPDF}
                className="px-2.5 py-1.5 rounded-xl text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900 transition flex items-center gap-1 cursor-pointer"
                title="Imprimir Romaneio PDF"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Romaneio PDF</span>
              </button>
            </div>
          )}

        </div>

      </div>
    </header>
  );
};
