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
  { path: ROUTE_PATHS.STORE_PORTAL, name: 'store_portal', title: 'Portal da Loja', requiresAuth: true },
  { path: ROUTE_PATHS.NEAR_EXPIRY, name: 'near_expiry', title: 'Validade Próxima', requiresAuth: true },
  { path: ROUTE_PATHS.UNITS, name: 'units', title: 'Unidades', requiresAuth: true },
  { path: ROUTE_PATHS.UNITS_CASH, name: 'units_cash', title: 'Caixa das Unidades', requiresAuth: true },
  { path: ROUTE_PATHS.GOALS, name: 'goals', title: 'Metas Executivas', requiresAuth: true },
  { path: ROUTE_PATHS.UNITS_BI, name: 'units_bi', title: 'BI das Lojas', requiresAuth: true },
  { path: ROUTE_PATHS.UNITS_CALENDAR, name: 'units_calendar', title: 'Calendário', requiresAuth: true },
  { path: ROUTE_PATHS.UNITS_HISTORY, name: 'units_history', title: 'Histórico de Vendas', requiresAuth: true },
  { path: ROUTE_PATHS.LOGIN, name: 'login', title: 'Autenticação', requiresAuth: false }
];
