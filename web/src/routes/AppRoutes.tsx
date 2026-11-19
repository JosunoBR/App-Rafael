import { ROUTE_PATHS, NAV_TAB_TO_PATH, PATH_TO_NAV_TAB, AppRouteKey } from './routePaths';

export { ROUTE_PATHS, NAV_TAB_TO_PATH, PATH_TO_NAV_TAB };
export type { AppRouteKey };

export interface RouteConfig {
  path: string;
  name: string;
  title: string;
  requiresAuth: boolean;
}

export const APP_ROUTES: RouteConfig[] = [
  { path: ROUTE_PATHS.HOME, name: 'home', title: 'Hub Principal', requiresAuth: true },
  { path: ROUTE_PATHS.ORDERS, name: 'orders', title: 'Compras & Pedidos', requiresAuth: true },
  { path: ROUTE_PATHS.ORDER_HISTORY, name: 'history', title: 'Histórico de Compras', requiresAuth: true },
  { path: ROUTE_PATHS.SEPARATION, name: 'separation', title: 'Separação & Doca', requiresAuth: true },
  { path: ROUTE_PATHS.SEPARATION_HISTORY, name: 'separationHistory', title: 'Histórico de Separações', requiresAuth: true },
  { path: ROUTE_PATHS.STOCK, name: 'stock', title: 'Estoque Central', requiresAuth: true },
  { path: ROUTE_PATHS.PRODUCTS, name: 'products', title: 'Catálogo de Produtos', requiresAuth: true },
  { path: ROUTE_PATHS.SUPPLIERS, name: 'suppliers', title: 'Gestão de Fornecedores', requiresAuth: true },
  { path: ROUTE_PATHS.FINANCIAL, name: 'financial', title: 'Contas a Pagar & Boletos', requiresAuth: true },
  { path: ROUTE_PATHS.DASHBOARD, name: 'dashboard', title: 'BI Executivo', requiresAuth: true },
  { path: ROUTE_PATHS.BI_PRODUCTS, name: 'bi_products', title: 'Curva ABC & Produtos', requiresAuth: true },
  { path: ROUTE_PATHS.FISCAL, name: 'fiscal', title: 'Configurações Fiscais', requiresAuth: true },
  { path: ROUTE_PATHS.USERS, name: 'users', title: 'Gestão de Usuários', requiresAuth: true },
  { path: ROUTE_PATHS.LOGIN, name: 'login', title: 'Autenticação', requiresAuth: false }
];
