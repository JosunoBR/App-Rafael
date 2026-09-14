import { UserRole } from './types';

export type ActiveNavTab = 
  | 'home' 
  | 'orders' 
  | 'stock' 
  | 'financial' 
  | 'separation' 
  | 'separationHistory' 
  | 'products' 
  | 'dashboard' 
  | 'suppliers' 
  | 'history' 
  | 'fiscal' 
  | 'users';

/**
 * Determina se determinado perfil tem autorização de acesso a uma tela / aba específica.
 * Quando o retorno for false, o menu, atalho e a página devem ser completamente OCULTOS.
 */
export function canAccessTab(role?: UserRole | null, tab?: ActiveNavTab | null): boolean {
  if (!role || !tab) return false;

  switch (tab) {
    case 'home':
      return role === 'diretoria' || role === 'comprador' || role === 'deposito';

    case 'orders':
      return role === 'diretoria' || role === 'comprador';

    case 'stock':
      return role === 'diretoria' || role === 'deposito';

    case 'separation':
    case 'separationHistory':
      return true; // Diretoria, Comprador, Depósito e Separação têm acesso à esteira e romaneios

    case 'products':
      return role === 'diretoria' || role === 'comprador' || role === 'deposito';

    case 'dashboard':
    case 'financial':
    case 'fiscal':
    case 'users':
      return role === 'diretoria'; // Restrito à Diretoria

    case 'suppliers':
    case 'history':
      return role === 'diretoria' || role === 'comprador';

    default:
      return false;
  }
}

/**
 * Permite criar ou editar pedidos de compra / cotação
 */
export function canCreateOrEditOrders(role?: UserRole | null): boolean {
  return role === 'diretoria' || role === 'comprador';
}

/**
 * Permite visualizar valores monetários de compra (custo, R$ total de cotações, etc.)
 */
export function canViewFinancialValues(role?: UserRole | null): boolean {
  return role === 'diretoria' || role === 'comprador';
}

/**
 * Permite gerenciar o estoque central do CD
 */
export function canManageStock(role?: UserRole | null): boolean {
  return role === 'diretoria' || role === 'deposito';
}

/**
 * Permite interagir com as etapas de distribuição e liberação para doca na esteira
 */
export function canManagePipelineDistribution(role?: UserRole | null): boolean {
  return role === 'diretoria' || role === 'deposito';
}

/**
 * Permite aprovar formalmente pedidos na esteira
 */
export function canApproveOrder(role?: UserRole | null): boolean {
  return role === 'diretoria';
}

/**
 * Retorna a rota padrão inicial ao fazer login ou ao tentar acessar rota não permitida
 */
export function getDefaultNavForRole(role?: UserRole | null): ActiveNavTab {
  if (role === 'separacao') return 'separation';
  if (role === 'deposito') return 'home';
  return 'home';
}
