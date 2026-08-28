import React from 'react';
import { 
  FileSpreadsheet, 
  FileText, 
  Settings, 
  Save, 
  PlusCircle, 
  FolderOpen, 
  Moon, 
  Sun, 
  Sparkles,
  ShoppingBag,
  Building2,
  BarChart3,
  ShoppingCart
} from 'lucide-react';
import { PurchaseOrder } from '../shared/types';

export type ActiveNavTab = 'orders' | 'dashboard';

interface HeaderProps {
  order: PurchaseOrder;
  activeNav: ActiveNavTab;
  onSelectNav: (tab: ActiveNavTab) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onNewOrder: () => void;
  onSaveOrder: () => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
  onOpenSettings: () => void;
  onOpenSavedOrders: () => void;
  onOpenSuppliers: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  order,
  activeNav,
  onSelectNav,
  isDark,
  onToggleTheme,
  onNewOrder,
  onSaveOrder,
  onExportExcel,
  onExportPDF,
  onOpenSettings,
  onOpenSavedOrders,
  onOpenSuppliers
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Brand / Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
                Mega 12 <span className="text-emerald-600 dark:text-emerald-400 font-normal">Matriz</span>
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <Sparkles className="w-3 h-3 mr-1" />
                SQLite Ativo
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">
              Gestão de Compras, Engenharia Fiscal & Dashboards
            </p>
          </div>
        </div>

        {/* Central Single-Page Navigation Tabs */}
        <nav className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <button
            onClick={() => onSelectNav('orders')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeNav === 'orders'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Cotação & Pedidos</span>
          </button>

          <button
            onClick={() => onSelectNav('dashboard')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeNav === 'dashboard'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BarChart3 className="w-4 h-4 text-emerald-500" />
            <span>Dashboard & BI</span>
          </button>
        </nav>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          
          {activeNav === 'orders' && (
            <>
              <button
                onClick={onNewOrder}
                className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                title="Criar novo pedido em branco"
              >
                <PlusCircle className="w-4 h-4 text-emerald-500" />
                Novo Pedido
              </button>

              <button
                onClick={onSaveOrder}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/30 transition"
                title="Salvar alterações do pedido atual"
              >
                <Save className="w-4 h-4" />
                <span className="hidden md:inline">Salvar</span>
              </button>

              {/* Export buttons */}
              <button
                onClick={onExportExcel}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition"
                title="Exportar no formato Excel (.xlsx)"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                <span className="hidden xl:inline">Exportar Excel</span>
              </button>

              <button
                onClick={onExportPDF}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900 transition"
                title="Gerar PDF do Romaneio"
              >
                <FileText className="w-4 h-4 text-rose-600" />
                <span className="hidden xl:inline">Romaneio PDF</span>
              </button>
            </>
          )}

          <button
            onClick={onOpenSuppliers}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            title="Cadastrar e gerenciar fornecedores"
          >
            <Building2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden lg:inline">Fornecedores</span>
          </button>

          <button
            onClick={onOpenSavedOrders}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            title="Ver histórico de pedidos salvos"
          >
            <FolderOpen className="w-4 h-4 text-amber-500" />
            <span className="hidden lg:inline">Histórico</span>
          </button>

          <div className="h-5 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

          {/* Settings & Theme */}
          <button
            onClick={onOpenSettings}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            title="Parâmetros Fiscais & Configurações de Lojas"
          >
            <Settings className="w-4 h-4" />
          </button>

          <button
            onClick={onToggleTheme}
            className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition"
            title="Alternar Modo Escuro/Claro"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>

        </div>
      </div>
    </header>
  );
};
