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
  Warehouse
} from 'lucide-react';
import { PurchaseOrder, User, UserRole } from '../shared/types';

export type ActiveNavTab = 'home' | 'orders' | 'stock' | 'financial' | 'separation' | 'separationHistory' | 'products' | 'dashboard' | 'suppliers' | 'history' | 'fiscal' | 'users';

interface SidebarProps {
  order: PurchaseOrder;
  activeNav: ActiveNavTab;
  onSelectNav: (tab: ActiveNavTab) => void;
  isDark: boolean;
  onToggleTheme: () => void;
  currentUser?: User | null;
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

  // Configuração de visibilidade por perfil (RBAC: Diretoria, Depósito, Separação)
  const canAccessHome = true;
  const canAccessOrders = userRole === 'diretoria';
  const canAccessStock = userRole === 'diretoria' || userRole === 'deposito';
  const canAccessSeparation = true; // Diretoria, Depósito e Separação
  const canAccessSeparationHistory = true; // Todos podem ver romaneios e avarias
  const canAccessFinancial = userRole === 'diretoria';
  const canAccessDashboard = userRole === 'diretoria';
  const canAccessHistory = userRole === 'diretoria';
  const canAccessProducts = userRole === 'diretoria' || userRole === 'deposito';
  const canAccessSuppliers = userRole === 'diretoria';
  const canAccessFiscal = userRole === 'diretoria';
  const canAccessUsers = userRole === 'diretoria';

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'diretoria': return 'Diretoria';
      case 'deposito': return 'Depósito / CD';
      case 'separacao': return 'Separação / Doca';
      default: return 'Usuário';
    }
  };

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'diretoria': return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'deposito': return 'bg-blue-500/20 text-blue-400 border-blue-500/40';
      case 'separacao': return 'bg-teal-500/20 text-teal-400 border-teal-500/40';
      default: return 'bg-slate-500/20 text-slate-400 border-slate-500/40';
    }
  };

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shrink-0 h-screen sticky top-0 transition-colors z-30 overflow-y-auto select-none">
      
      {/* 1. Topo: Logo & Identificação do Usuário */}
      <div>
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight leading-none">
                Mega 12 <span className="text-emerald-600 dark:text-emerald-400 font-normal">Matriz</span>
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  SQLite Conectado
                </span>
              </div>
            </div>
          </div>

          {/* Widget do Usuário Logado no Topo */}
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
                  <div className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full border inline-block ${getRoleBadgeStyle(currentUser.role)}`}>
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

        {/* 2. Menu de Navegação em 4 Blocos Lógicos */}
        <div className="p-3 space-y-4">
          
          {/* BLOCO 1: OPERAÇÃO DE COMPRAS */}
          <div className="space-y-1">
            <span className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
              Operação de Compras
            </span>

            {/* Início / Painel */}
            {canAccessHome && (
              <button
                onClick={() => onSelectNav('home')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeNav === 'home'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
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

            {/* Cotação & Digitação */}
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
                  <ShoppingCart className="w-4 h-4 text-blue-400" />
                  <span>Cotação & Digitação</span>
                </div>
                <div className="flex items-center gap-1">
                  {hasActiveDraft && activeNav !== 'orders' && (
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-amber-500 text-slate-950 uppercase tracking-tighter animate-pulse" title="Pedido em andamento">
                      Rascunho
                    </span>
                  )}
                  {activeNav === 'orders' && <ChevronRight className="w-3.5 h-3.5" />}
                </div>
              </button>
            )}

            {/* Histórico de Pedidos */}
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

            {/* Depósito & Estoque Central CD */}
            {canAccessStock && (
              <button
                onClick={() => onSelectNav('stock')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeNav === 'stock'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Warehouse className="w-4 h-4 text-emerald-400" />
                  <span>Depósito / Estoque CD</span>
                </div>
                {activeNav === 'stock' && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Separação & Doca */}
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
                  <span>Separação & Doca</span>
                </div>
                {activeNav === 'separation' && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Histórico de Doca / Avarias */}
            {canAccessSeparationHistory && (
              <button
                onClick={() => onSelectNav('separationHistory')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeNav === 'separationHistory'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
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

            {/* Financeiro & Boletos */}
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

            {/* Dashboard & BI */}
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
                  <BarChart3 className="w-4 h-4 text-teal-500" />
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
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
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
                  <Building2 className="w-4 h-4 text-emerald-500" />
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

            {/* Gestão de Usuários */}
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

      {/* 3. Rodapé da Barra Lateral: Versão & Alternador de Tema */}
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
