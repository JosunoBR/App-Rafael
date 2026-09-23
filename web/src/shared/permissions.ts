import { User, UserRole } from './types';
import { PERMISSIONS_MAP } from './permissionsCatalog';

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

export type UserLike = 
  | User 
  | { role?: UserRole | string; permissions?: Record<string, boolean>; id?: string; email?: string; nome?: string } 
  | UserRole 
  | string 
  | null 
  | undefined;

/**
 * Função mestre de resolução de permissões (RBAC + Exceções Granulares)
 * Prioridade:
 * 1. Root e Diretoria possuem acesso total irrestrito (bypass)
 * 2. Exceção granular individual do usuário (se definida como true ou false)
 * 3. Matriz padrão do cargo extraída do Catálogo Oficial
 */
export function hasPermission(userOrRole: UserLike, code: string): boolean {
  if (!userOrRole) return false;

  let role: UserRole | string = '';
  let permissions: Record<string, boolean> | undefined;
  let isRoot = false;

  if (typeof userOrRole === 'string') {
    role = userOrRole;
    isRoot = role === 'root' || role === 'diretoria';
  } else {
    role = userOrRole.role || '';
    permissions = userOrRole.permissions;
    isRoot = userOrRole.role === 'root' || 
             userOrRole.role === 'diretoria' || 
             userOrRole.id === 'usr_root' || 
             userOrRole.email?.toLowerCase() === 'root' || 
             userOrRole.nome?.toLowerCase() === 'root';
  }

  // 1. Root e Diretoria possuem acesso irrestrito
  if (isRoot || role === 'diretoria') {
    return true;
  }

  // 2. Exceção individual configurada para o usuário
  if (permissions && typeof permissions === 'object') {
    if (permissions[code] === true) return true;
    if (permissions[code] === false) return false;
  }

  // 3. Padrão do cargo no catálogo oficial
  const def = PERMISSIONS_MAP[code];
  if (def && def.roleDefaults) {
    const roleKey = role as UserRole;
    return Boolean(def.roleDefaults[roleKey]);
  }

  return false;
}

/**
 * Determina se o usuário tem autorização de acesso a uma tela / aba específica.
 */
export function canAccessTab(userOrRole?: UserLike, tab?: ActiveNavTab | null): boolean {
  if (!userOrRole || !tab) return false;

  if (tab === 'home') {
    return hasPermission(userOrRole, 'nav:orders') || 
           hasPermission(userOrRole, 'nav:separation') || 
           hasPermission(userOrRole, 'nav:stock');
  }

  if (tab === 'separationHistory') {
    return hasPermission(userOrRole, 'nav:separation_history');
  }

  return hasPermission(userOrRole, `nav:${tab}`);
}

/**
 * Permite criar ou editar pedidos de compra / cotação
 */
export function canCreateOrEditOrders(userOrRole?: UserLike): boolean {
  return hasPermission(userOrRole, 'orders:create') || 
         hasPermission(userOrRole, 'orders:edit_draft') || 
         hasPermission(userOrRole, 'orders:edit_closed');
}

/**
 * Permite editar pedidos que já foram fechados ou que estão em andamento na esteira
 */
export function canEditClosedOrders(userOrRole?: UserLike): boolean {
  return hasPermission(userOrRole, 'orders:edit_closed');
}

/**
 * Avalia se o usuário tem permissão para editar um pedido específico considerando o status dele.
 */
export function canEditSpecificOrder(userOrRole?: UserLike, orderStatus?: string | null): boolean {
  if (!userOrRole) return false;
  const st = orderStatus || 'Em Cotação';
  const isClosed = st !== 'Em Cotação' && st !== 'Rascunho';

  if (isClosed) {
    return hasPermission(userOrRole, 'orders:edit_closed');
  }
  return hasPermission(userOrRole, 'orders:edit_draft') || hasPermission(userOrRole, 'orders:create');
}

/**
 * Permite visualizar valores monetários de compra (custo, R$ total de cotações, etc.)
 */
export function canViewFinancialValues(userOrRole?: UserLike): boolean {
  return hasPermission(userOrRole, 'orders:view_values');
}

/**
 * Permite gerenciar o estoque central do CD
 */
export function canManageStock(userOrRole?: UserLike): boolean {
  return hasPermission(userOrRole, 'nav:stock');
}

/**
 * Permite interagir com as etapas de distribuição e liberação para doca na esteira
 */
export function canManagePipelineDistribution(userOrRole?: UserLike): boolean {
  return hasPermission(userOrRole, 'pipeline:distribute') || hasPermission(userOrRole, 'pipeline:send_distribution');
}

/**
 * Permite gerenciar faturamento e boletos
 */
export function canManageFaturamento(userOrRole?: UserLike): boolean {
  return hasPermission(userOrRole, 'nav:financial') || hasPermission(userOrRole, 'financial:view');
}

/**
 * Permite aprovar formalmente pedidos na esteira
 */
export function canApproveOrder(userOrRole?: UserLike): boolean {
  return hasPermission(userOrRole, 'orders:approve');
}

/**
 * Permite duplicar pedidos
 */
export function canDuplicateOrder(userOrRole?: UserLike): boolean {
  return hasPermission(userOrRole, 'orders:duplicate');
}

/**
 * Permite excluir pedidos ou cancelar itens
 */
export function canDeleteOrder(userOrRole?: UserLike): boolean {
  return hasPermission(userOrRole, 'orders:delete');
}

/**
 * Retorna a rota padrão inicial ao fazer login ou ao tentar acessar rota não permitida
 */
export function getDefaultNavForRole(role?: UserRole | null): ActiveNavTab {
  if (role === 'separacao') return 'separation';
  if (role === 'faturamento') return 'financial';
  if (role === 'deposito') return 'home';
  return 'home';
}

/**
 * Permite confirmar o recebimento físico de um pedido na Matriz (entrega do fornecedor).
 */
export function canConfirmReceipt(userOrRole?: UserLike, orderStatus?: string | null): boolean {
  if (!hasPermission(userOrRole, 'pipeline:confirm_receipt')) return false;
  if (!orderStatus) return true;
  const blockedStatuses = ['Em Cotação', 'Rascunho'];
  return !blockedStatuses.includes(orderStatus);
}

/**
 * Permite autorizar a liberação dos boletos de um pedido para o Contas a Pagar (Financeiro).
 * Conforme regra de negócio, o botão é liberado na Etapa 4 (Faturamento).
 */
export function canAuthorizeFinancialRelease(userOrRole?: UserLike, orderStatus?: string | null): boolean {
  if (!hasPermission(userOrRole, 'financial:authorize_release')) return false;
  if (!orderStatus) return true;
  return orderStatus === 'Faturamento';
}

/**
 * Permite retroceder o status de um pedido na esteira operacional.
 * Restrito exclusivamente à Diretoria Executiva ou usuário Root/Superadmin.
 */
export function canRollbackOrderStatus(user?: { role?: UserRole; id?: string; email?: string; nome?: string } | null): boolean {
  if (!user) return false;
  return user.role === 'diretoria' || 
         user.role === ('root' as any) || 
         user.id === 'usr_root' || 
         user.email?.toLowerCase() === 'root' || 
         user.nome?.toLowerCase() === 'root';
}
