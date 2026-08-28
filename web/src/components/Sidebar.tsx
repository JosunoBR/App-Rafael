import React from 'react';
import { 
  Home,
  ShoppingCart, 
  PackageCheck, 
  BarChart3, 
  Building2, 
  FolderOpen, 
  Settings, 
  PlusCircle, 
  Save, 
  FileSpreadsheet, 
  FileText, 
  Sun, 
  Moon, 
  ShoppingBag, 
  Sparkles,
  Database,
  ChevronRight,
  LogOut,
  Users as UsersIcon,
  ShieldCheck,
  Truck,
  Smartphone,
  Boxes,
  ClipboardCheck,
  Receipt,
  CreditCard
} from 'lucide-react';
import { PurchaseOrder, User, UserRole } from '../shared/types';

export type ActiveNavTab = 'home' | 'orders' | 'financial' | 'separation' | 'separationHistory' | 'products' | 'dashboard' | 'suppliers' | 'history' | 'fiscal' | 'users';

interface SidebarProps {
  order: PurchaseOrder;
  activeNav: ActiveNavTab;
  onSelectNav: (tab: ActiveNavTab) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  onNewOrder: () => void;
  onSaveOrder: () => void;
  onExportExcel: () => void;
  onExportPDF: () => void;
  currentUser?: User;
  onLogout?: () => void;
  hasActiveDraft?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  order,
  activeNav,
  onSelectNav,
  isDark,
  onToggleTheme,
  onNewOrder,
  onSaveOrder,
  onExportExcel,
  onExportPDF,
  currentUser,
  onLogout,
  hasActiveDraft
}) => {
  const userRole: UserRole = currentUser?.role || 'diretoria';

  // Configuração de visibilidade por perfil
  const canAccessHome = true;
  const canAccessOrders = userRole === 'diretoria' || userRole === 'comprador';
  const canAccessFinancial = userRole === 'diretoria' || userRole === 'comprador';
  const canAccessSeparation = true; // Todos acessam separação/expedição
  const canAccessDashboard = userRole === 'diretoria' || userRole === 'comprador';
  const canAccessProducts = userRole === 'diretoria' || userRole === 'comprador';
  const canAccessSuppliers = userRole === 'diretoria' || userRole === 'comprador';
  const canAccessHistory = true;
  const canAccessFiscal = userRole === 'diretoria';
  const canAccessUsers = userRole === 'diretoria';

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'diretoria': return 'Diretoria';
      case 'comprador': return 'Comprador';
      case 'conferente': return 'Conferente Doca';
      case 'motorista': return 'Motorista';
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'diretoria': return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'comprador': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'conferente': return 'bg-teal-500/20 text-teal-400 border-teal-500/40';
      case 'motorista': return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
    }
  };

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 h-screen sticky top-0 transition-colors z-30 overflow-y-auto">
      
      {/* 1. Topo: Logo & Brand */}
      <div>
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                  Mega 12 <span className="text-emerald-600 dark:text-emerald-400 font-normal">Matriz</span>
                </h1>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  SQLite Conectado
                </span>
              </div>
            </div>
          </div>

          {/* Widget do Usuário Logado */}
          {currentUser && (
            <div className="mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between">
              <div className="flex items-center gap-2 overflow-hidden">
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {currentUser.nome.charAt(0).toUpperCase()}
                </div>
                <div className="overflow-hidden">
                  <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                    {currentUser.nome}
                  </div>
                  <div className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full border inline-block ${getRoleColor(currentUser.role)}`}>
                    {getRoleLabel(currentUser.role)}
                  </div>
                </div>
              </div>

              {onLogout && (
                <button
                  onClick={onLogout}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                  title="Sair da Conta"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* 2. Menu Principal de Navegação (Módulos & Cadastros por Perfil) */}
        <div className="p-3 space-y-1.5">
          <span className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">
            Módulos Permitidos
          </span>

          {/* 0. Início / Home Hub */}
          {canAccessHome && (
            <button
              onClick={() => onSelectNav('home')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeNav === 'home'
                  ? 'bg-slate-900 text-white dark:bg-emerald-600 shadow-md shadow-emerald-600/20'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Home className="w-4 h-4 text-emerald-400" />
                <span>Início</span>
              </div>
              {activeNav === 'home' && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* 1. Cotação & Pedidos */}
          {canAccessOrders && (
            <button
              onClick={() => onSelectNav('orders')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeNav === 'orders'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="w-4 h-4" />
                <span>Cotação & Pedidos</span>
              </div>
              <div className="flex items-center gap-1">
                {hasActiveDraft && activeNav !== 'orders' && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-amber-500 text-slate-950 uppercase tracking-tighter" title="Pedido não salvo em andamento">
                    Rascunho
                  </span>
                )}
                {activeNav === 'orders' && <ChevronRight className="w-3.5 h-3.5" />}
              </div>
            </button>
          )}

          {/* 2. Separação (20 Lojas) */}
          {canAccessSeparation && (
            <button
              onClick={() => onSelectNav('separation')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeNav === 'separation'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <PackageCheck className="w-4 h-4 text-emerald-400" />
                <span>{userRole === 'motorista' ? 'Expedição / Carga' : 'Separação do Pedido'}</span>
              </div>
              {activeNav === 'separation' && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* 2.1 Histórico de Separações & Conferentes */}
          {canAccessSeparation && (
            <button
              onClick={() => onSelectNav('separationHistory')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeNav === 'separationHistory'
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/20'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Boxes className="w-4 h-4 text-teal-400" />
                <span>Histórico de Separações</span>
              </div>
              {activeNav === 'separationHistory' && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* 3. Dashboard & BI */}
          {canAccessDashboard && (
            <button
              onClick={() => onSelectNav('dashboard')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeNav === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <BarChart3 className="w-4 h-4 text-teal-400" />
                <span>Dashboard & BI</span>
              </div>
              {activeNav === 'dashboard' && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* 3.1 Gestão Financeira & Boletos */}
          {canAccessFinancial && (
            <button
              onClick={() => onSelectNav('financial')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeNav === 'financial'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-4 h-4 text-amber-400" />
                <span>Financeiro / Boletos</span>
              </div>
              {activeNav === 'financial' && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}

          <div className="pt-3 border-t border-slate-200/80 dark:border-slate-800 my-2" />

          <span className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
            Cadastros & Arquivo
          </span>

          {/* 4. Catálogo de Produtos com Fotos */}
          {canAccessProducts && (
            <button
              onClick={() => onSelectNav('products')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeNav === 'products'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="w-4 h-4 text-purple-400" />
                <span>Catálogo de Produtos</span>
              </div>
              {activeNav === 'products' && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* 5. Fornecedores */}
          {canAccessSuppliers && (
            <button
              onClick={() => onSelectNav('suppliers')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeNav === 'suppliers'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <span>Fornecedores</span>
              </div>
              {activeNav === 'suppliers' && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* 5. Histórico de Pedidos */}
          {canAccessHistory && (
            <button
              onClick={() => onSelectNav('history')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeNav === 'history'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FolderOpen className="w-4 h-4 text-amber-400" />
                <span>Histórico de Pedidos</span>
              </div>
              {activeNav === 'history' && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* 6. Configurações Fiscais */}
          {canAccessFiscal && (
            <button
              onClick={() => onSelectNav('fiscal')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeNav === 'fiscal'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Settings className="w-4 h-4 text-indigo-400" />
                <span>Configurações Fiscais</span>
              </div>
              {activeNav === 'fiscal' && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* 7. Gestão de Usuários (RBAC) */}
          {canAccessUsers && (
            <button
              onClick={() => onSelectNav('users')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeNav === 'users'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <UsersIcon className="w-4 h-4 text-pink-400" />
                <span>Gestão de Usuários</span>
              </div>
              {activeNav === 'users' && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* 3. Rodapé da Barra Lateral: Ações Rápidas do Pedido & Tema */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 space-y-2">
        
        {/* Ações Rápidas (Apenas para Diretoria e Compras) */}
        {canAccessOrders && (
          <>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={onNewOrder}
                className="flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                title="Novo Pedido"
              >
                <PlusCircle className="w-3.5 h-3.5 text-emerald-500" />
                <span>Novo</span>
              </button>

              <button
                onClick={onSaveOrder}
                className="flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-xs transition cursor-pointer"
                title="Salvar Pedido no Banco SQLite"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                onClick={onExportExcel}
                className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 dark:hover:bg-emerald-900 transition cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Excel</span>
              </button>

              <button
                onClick={onExportPDF}
                className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 dark:hover:bg-rose-900 transition cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>PDF</span>
              </button>
            </div>
          </>
        )}

        {/* Alternador de Tema */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between px-2">
          <span className="text-[11px] font-medium text-slate-500">Tema Visual</span>
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
            title="Alternar Modo Escuro / Claro"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
          </button>
        </div>

      </div>

    </aside>
  );
};
