import React from 'react';
import { 
  Home,
  ShoppingCart, 
  PackageCheck, 
  BarChart3, 
  Building2, 
  FolderOpen, 
  Settings, 
  Sun, 
  Moon, 
  ShoppingBag, 
  ChevronRight,
  LogOut,
  Users as UsersIcon,
  Boxes,
  CreditCard,
  Layers,
  Truck
} from 'lucide-react';
import { PurchaseOrder, User, UserRole } from '../shared/types';

export type ActiveNavTab = 'home' | 'orders' | 'financial' | 'separation' | 'separationHistory' | 'products' | 'dashboard' | 'suppliers' | 'history' | 'fiscal' | 'users';

interface SidebarProps {
  order: PurchaseOrder;
  activeNav: ActiveNavTab;
  onSelectNav: (tab: ActiveNavTab) => void;
  isDark: boolean;
  onToggleTheme: () => void;
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
  currentUser,
  onLogout,
  hasActiveDraft
}) => {
  const userRole: UserRole = currentUser?.role || 'diretoria';

  // Configuração de visibilidade por perfil (RBAC)
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

        {/* 2. Menu Principal de Navegação (4 Blocos Lógicos por Ciclo Operacional) */}
        <div className="p-3 space-y-4">
          
          {/* BLOCO 1: OPERAÇÃO DE COMPRAS */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
              Operação de Compras
            </span>

            {/* Início / Home Hub */}
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
                  <span>Início / Painel</span>
                </div>
                {activeNav === 'home' && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Cotação & Digitação de Pedidos */}
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
                  <span>Cotação & Digitação</span>
                </div>
                <div className="flex items-center gap-1">
                  {hasActiveDraft && activeNav !== 'orders' && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-amber-500 text-slate-950 uppercase tracking-tighter" title="Pedido em andamento">
                      Rascunho
                    </span>
                  )}
                  {activeNav === 'orders' && <ChevronRight className="w-3.5 h-3.5" />}
                </div>
              </button>
            )}

            {/* Histórico & Arquivo de Pedidos */}
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
                  <FolderOpen className="w-4 h-4 text-amber-500" />
                  <span>Histórico de Pedidos</span>
                </div>
                {activeNav === 'history' && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          {/* BLOCO 2: LOGÍSTICA & DOCA (20 LOJAS) */}
          <div className="space-y-1 pt-2 border-t border-slate-150 dark:border-slate-800/80">
            <span className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
              Logística & Doca (20 Lojas)
            </span>

            {/* Separação do Pedido */}
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
                  <PackageCheck className="w-4 h-4 text-teal-400" />
                  <span>{userRole === 'motorista' ? 'Expedição / Carga' : 'Separação & Doca'}</span>
                </div>
                {activeNav === 'separation' && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Histórico de Separações & Avarias */}
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
                  <span>Histórico de Doca / Avarias</span>
                </div>
                {activeNav === 'separationHistory' && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          {/* BLOCO 3: FINANCEIRO & INTELIGÊNCIA */}
          <div className="space-y-1 pt-2 border-t border-slate-150 dark:border-slate-800/80">
            <span className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
              Financeiro & Inteligência
            </span>

            {/* Gestão Financeira & Boletos */}
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
                  <CreditCard className="w-4 h-4 text-amber-500" />
                  <span>Financeiro & Boletos</span>
                </div>
                {activeNav === 'financial' && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Dashboard Executivo & BI */}
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
                  <BarChart3 className="w-4 h-4 text-blue-500" />
                  <span>Dashboard & BI</span>
                </div>
                {activeNav === 'dashboard' && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          {/* BLOCO 4: CADASTROS & GESTÃO */}
          <div className="space-y-1 pt-2 border-t border-slate-150 dark:border-slate-800/80">
            <span className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
              Cadastros & Gestão
            </span>

            {/* Catálogo de Produtos */}
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

            {/* Fornecedores */}
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

            {/* Configurações Fiscais */}
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

            {/* Gestão de Usuários (RBAC) */}
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
      </div>

      {/* 3. Rodapé da Barra Lateral: Apenas Tema Visual & Logout */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Mega 12 v2.4</span>
        </div>
        <button
          onClick={onToggleTheme}
          className="p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1 text-xs font-medium"
          title="Alternar Modo Escuro / Claro"
        >
          {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-600" />}
        </button>
      </div>

    </aside>
  );
};
