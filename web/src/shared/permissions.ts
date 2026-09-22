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
    case 'fiscal':
    case 'users':
      return role === 'diretoria'; // Restrito à Diretoria

    case 'financial':
      return role === 'diretoria' || role === 'faturamento'; // Diretoria e Faturamento

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
 * Permite editar pedidos que já foram fechados ou que estão em andamento na esteira
 * (ex: Aprovado, Em Distribuição, Em Separação, Faturamento, Finalizado).
 * Regra: Exclusivo da Diretoria Executiva.
 */
export function canEditClosedOrders(role?: UserRole | null): boolean {
  return role === 'diretoria';
}

/**
 * Avalia se o usuário tem permissão para editar um pedido específico considerando o status atual dele.
 * - Diretoria: pode editar sempre, em qualquer status.
 * - Comprador: só pode editar enquanto for Rascunho ou Em Cotação.
 * - Outros perfis: somente leitura.
 */
export function canEditSpecificOrder(role?: UserRole | null, orderStatus?: string | null): boolean {
  if (!role) return false;
  if (role === 'diretoria') return true;
  if (role === 'comprador') {
    const st = orderStatus || 'Em Cotação';
    return st === 'Em Cotação' || st === 'Rascunho';
  }
  return false;
}

/**
 * Permite visualizar valores monetários de compra (custo, R$ total de cotações, etc.)
 * Estritamente bloqueado para Depósito e Separação conforme regra de negócio.
 */
export function canViewFinancialValues(role?: UserRole | null): boolean {
  return role === 'diretoria' || role === 'comprador' || role === 'faturamento';
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
 * Permite gerenciar faturamento e boletos
 */
export function canManageFaturamento(role?: UserRole | null): boolean {
  return role === 'diretoria' || role === 'faturamento';
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
  if (role === 'faturamento') return 'financial';
  if (role === 'deposito') return 'home';
  return 'home';
}

/**
 * Permite confirmar o recebimento físico de um pedido na Matriz (entrega do fornecedor).
 * Perfil 'separacao' NÃO pode confirmar entrega — é restrito à conferência na doca.
 * Regra: Pedidos em 'Em Cotação', 'Rascunho' ou 'Aprovado' NÃO podem ter recebimento confirmado.
 * O pedido precisa estar no mínimo em Distribuição.
 */
export function canConfirmReceipt(role?: UserRole | null, orderStatus?: string | null): boolean {
  const allowedRole = role === 'diretoria' || role === 'comprador' || role === 'deposito';
  if (!allowedRole) return false;
  if (!orderStatus) return true;
  const blockedStatuses = ['Em Cotação', 'Rascunho', 'Aprovado'];
  return !blockedStatuses.includes(orderStatus);
}

/**
 * Permite autorizar a liberação dos boletos de um pedido para o Contas a Pagar (Financeiro).
 * Exclusivo da Diretoria — requer análise prévia dos títulos e valores.
 */
export function canAuthorizeFinancialRelease(role?: UserRole | null): boolean {
  return role === 'diretoria';
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
