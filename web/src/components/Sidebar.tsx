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
  Sparkles,
  ChevronRight,
  LogOut,
  Users as UsersIcon,
  Boxes, 
  CreditCard,
  Layers
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
  const canAccessSeparation = true;
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

  const getRoleBadgeStyle = (role: UserRole) => {
    switch (role) {
      case 'diretoria': return 'bg-amber-500/15 text-amber-500 border-amber-500/30';
      case 'comprador': return 'bg-emerald-500/15 text-emerald-500 border-emerald-500/30';
      case 'conferente': return 'bg-teal-500/15 text-teal-500 border-teal-500/30';
      case 'motorista': return 'bg-purple-500/15 text-purple-500 border-purple-500/30';
    }
  };

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 flex flex-col justify-between shrink-0 h-screen sticky top-0 transition-colors z-30 overflow-y-auto select-none">
      
      {/* 1. Topo: Brand & Identificação */}
      <div>
        <div className="p-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-lg shadow-emerald-500/25 shrink-0">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-black text-slate-900 dark:text-white tracking-tight leading-none">
                Mega 12 <span className="text-emerald-600 dark:text-emerald-400 font-medium">Matriz</span>
              </h1>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  SQLite Ativo
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Menu de Navegação Estruturado em 3 Pilares Lógicos */}
        <div className="p-3 space-y-4">
          
          {/* GRUPO 1: OPERAÇÃO CENTRAL */}
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
              <span>Operação Central</span>
            </div>

            {/* Início / Home Hub */}
            {canAccessHome && (
              <button
                onClick={() => onSelectNav('home')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeNav === 'home'
                    ? 'bg-slate-900 text-white dark:bg-emerald-600 shadow-sm shadow-emerald-600/20'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Home className={`w-4 h-4 ${activeNav === 'home' ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>Início (Visão Geral)</span>
                </div>
                {activeNav === 'home' && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Cotação & Pedidos */}
            {canAccessOrders && (
              <button
                onClick={() => onSelectNav('orders')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeNav === 'orders'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingCart className={`w-4 h-4 ${activeNav === 'orders' ? 'text-white' : 'text-emerald-500'}`} />
                  <span>Cotação & Pedidos</span>
                </div>
                <div className="flex items-center gap-1">
                  {hasActiveDraft && activeNav !== 'orders' && (
                    <span className="px-1.5 py-0.5 rounded-md text-[9px] font-extrabold bg-amber-500 text-slate-950 uppercase tracking-tight animate-pulse" title="Rascunho em andamento">
                      Rascunho
                    </span>
                  )}
                  {activeNav === 'orders' && <ChevronRight className="w-3.5 h-3.5" />}
                </div>
              </button>
            )}

            {/* Separação (20 Lojas) */}
            {canAccessSeparation && (
              <button
                onClick={() => onSelectNav('separation')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeNav === 'separation'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <PackageCheck className={`w-4 h-4 ${activeNav === 'separation' ? 'text-white' : 'text-emerald-500'}`} />
                  <span>{userRole === 'motorista' ? 'Expedição / Carga' : 'Separação (20 Lojas)'}</span>
                </div>
                {activeNav === 'separation' && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          {/* GRUPO 2: GESTÃO & INTELIGÊNCIA */}
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Gestão & Inteligência
            </div>

            {/* Financeiro / Boletos */}
            {canAccessFinancial && (
              <button
                onClick={() => onSelectNav('financial')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeNav === 'financial'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className={`w-4 h-4 ${activeNav === 'financial' ? 'text-white' : 'text-amber-500'}`} />
                  <span>Financeiro / Boletos</span>
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
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <BarChart3 className={`w-4 h-4 ${activeNav === 'dashboard' ? 'text-white' : 'text-teal-500'}`} />
                  <span>Dashboard & BI</span>
                </div>
                {activeNav === 'dashboard' && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Histórico de Pedidos */}
            {canAccessHistory && (
              <button
                onClick={() => onSelectNav('history')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeNav === 'history'
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <FolderOpen className={`w-4 h-4 ${activeNav === 'history' ? 'text-white' : 'text-amber-500'}`} />
                  <span>Histórico de Pedidos</span>
                </div>
                {activeNav === 'history' && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Histórico de Separações */}
            {canAccessSeparation && (
              <button
                onClick={() => onSelectNav('separationHistory')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeNav === 'separationHistory'
                    ? 'bg-teal-600 text-white shadow-sm shadow-teal-600/25'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Boxes className={`w-4 h-4 ${activeNav === 'separationHistory' ? 'text-white' : 'text-teal-400'}`} />
                  <span>Histórico Separações</span>
                </div>
                {activeNav === 'separationHistory' && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          {/* GRUPO 3: CADASTROS & SISTEMA */}
          <div className="space-y-1">
            <div className="px-3 pb-1 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Cadastros & Sistema
            </div>

            {/* Catálogo de Produtos */}
            {canAccessProducts && (
              <button
                onClick={() => onSelectNav('products')}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeNav === 'products'
                    ? 'bg-purple-600 text-white shadow-sm shadow-purple-600/25'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <ShoppingBag className={`w-4 h-4 ${activeNav === 'products' ? 'text-white' : 'text-purple-400'}`} />
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
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Building2 className={`w-4 h-4 ${activeNav === 'suppliers' ? 'text-white' : 'text-emerald-500'}`} />
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
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Settings className={`w-4 h-4 ${activeNav === 'fiscal' ? 'text-white' : 'text-indigo-400'}`} />
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
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <UsersIcon className={`w-4 h-4 ${activeNav === 'users' ? 'text-white' : 'text-pink-400'}`} />
                  <span>Gestão de Usuários</span>
                </div>
                {activeNav === 'users' && <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

        </div>
      </div>

      {/* 3. Rodapé da Barra Lateral: Usuário & Tema */}
      <div className="p-3 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
        
        {/* Widget do Usuário Logado */}
        {currentUser && (
          <div className="p-2.5 rounded-2xl bg-white dark:bg-slate-800/90 border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center font-extrabold text-xs shrink-0 shadow-xs">
                {currentUser.nome.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {currentUser.nome}
                </div>
                <div className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-md border inline-block ${getRoleBadgeStyle(currentUser.role)}`}>
                  {getRoleLabel(currentUser.role)}
                </div>
              </div>
            </div>

            {onLogout && (
              <button
                onClick={onLogout}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition cursor-pointer"
                title="Sair da Conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Alternador de Tema Visual */}
        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">Modo de Cor</span>
          <button
            onClick={onToggleTheme}
            className="p-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition cursor-pointer flex items-center gap-1.5 text-xs font-bold shadow-2xs"
            title="Alternar Modo Escuro / Claro"
          >
            {isDark ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px]">Escuro</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-slate-600" />
                <span className="text-[10px]">Claro</span>
              </>
            )}
          </button>
        </div>

      </div>

    </aside>
  );
};
