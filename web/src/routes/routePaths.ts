/**
 * TABELA OFICIAL DE ROTAS WEB DO SISTEMA
 * Centraliza os caminhos das URLs para evitar strings mágicas espalhadas.
 */

export const ROUTE_PATHS = {
  HOME: '/',
  ORDERS: '/pedidos',
  ORDER_DETAIL: '/pedidos/:orderId',
  ORDER_HISTORY: '/pedidos/historico',
  SEPARATION: '/separacao',
  SEPARATION_DETAIL: '/separacao/:orderId',
  SEPARATION_HISTORY: '/separacao/historico',
  STOCK: '/estoque',
  PRODUCTS: '/produtos',
  SUPPLIERS: '/fornecedores',
  FINANCIAL: '/financeiro',
  DASHBOARD: '/bi/dashboard',
  BI_PRODUCTS: '/bi/curva-abc',
  FISCAL: '/configuracoes/fiscal',
  USERS: '/usuarios',
  LOGIN: '/login'
} as const;

export type AppRouteKey = keyof typeof ROUTE_PATHS;

/**
 * Mapeamento bidirecional entre ActiveNavTab legado e as novas URLs
 */
export const NAV_TAB_TO_PATH: Record<string, string> = {
  home: ROUTE_PATHS.HOME,
  orders: ROUTE_PATHS.ORDERS,
  separation: ROUTE_PATHS.SEPARATION,
  separationHistory: ROUTE_PATHS.SEPARATION_HISTORY,
  stock: ROUTE_PATHS.STOCK,
  products: ROUTE_PATHS.PRODUCTS,
  suppliers: ROUTE_PATHS.SUPPLIERS,
  financial: ROUTE_PATHS.FINANCIAL,
  dashboard: ROUTE_PATHS.DASHBOARD,
  bi_products: ROUTE_PATHS.BI_PRODUCTS,
  history: ROUTE_PATHS.ORDER_HISTORY,
  fiscal: ROUTE_PATHS.FISCAL,
  users: ROUTE_PATHS.USERS
};

export const PATH_TO_NAV_TAB: Record<string, string> = Object.entries(NAV_TAB_TO_PATH).reduce(
  (acc, [tab, path]) => {
    acc[path] = tab;
    return acc;
  },
  {} as Record<string, string>
);
