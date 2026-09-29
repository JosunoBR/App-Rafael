import { PurchaseOrder } from '../shared/types';
import { toBrDate } from './masks';
import { calculateOrderTotals } from '../shared/orderCalculationEngine';

export type DeliveryAlertSeverity = 'late' | 'today' | 'upcoming';

export interface OrderDeliveryAlert {
  order: PurchaseOrder;
  orderId: string;
  numeroPedido: string;
  fornecedor: string;
  status: string;
  totalGeral: number;
  dataEntregaPrevista: string;
  dataEntregaPrevistaBr: string;
  daysDiff: number; // < 0 se atrasado (-1, -2...), 0 se hoje, > 0 se futuro (1, 2)
  daysLate: number; // Dias de atraso (positivo se atrasado, 0 caso contrário)
  severity: DeliveryAlertSeverity;
  label: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
}

export interface DeliveryAlertsSummary {
  alerts: OrderDeliveryAlert[];
  lateAlerts: OrderDeliveryAlert[];
  todayAlerts: OrderDeliveryAlert[];
  upcomingAlerts: OrderDeliveryAlert[];
  lateCount: number;
  todayCount: number;
  upcomingCount: number;
  totalAlerts: number;
  totalLateValue: number;
}

/**
 * Converte string de data flexível (YYYY-MM-DD ou DD/MM/YYYY) para objeto Date à meia-noite local.
 */
export function parseDeliveryDate(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const clean = dateStr.trim();
  if (!clean || clean.toLowerCase().includes('combinar') || clean === '—') return null;

  if (clean.includes('/')) {
    const parts = clean.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const d = new Date(year, month, day, 0, 0, 0, 0);
        if (!isNaN(d.getTime())) return d;
      }
    }
  } else if (clean.includes('-')) {
    const parts = clean.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        const d = new Date(year, month, day, 0, 0, 0, 0);
        if (!isNaN(d.getTime())) return d;
      }
    }
  }

  const fallback = new Date(clean);
  if (!isNaN(fallback.getTime())) {
    fallback.setHours(0, 0, 0, 0);
    return fallback;
  }

  return null;
}

/**
 * Avalia se um pedido está com entrega em atraso, prevista para hoje ou nos próximos 2 dias.
 */
export function getOrderDeliveryAlert(order: PurchaseOrder, refDate: Date = new Date()): OrderDeliveryAlert | null {
  if (!order || !order.header) return null;

  // Se a mercadoria já foi recebida na Matriz ou o pedido já foi finalizado, não há alerta de atraso
  const isDelivered = Boolean(order.header.recebidoMatriz || order.header.status === 'Finalizado');
  if (isDelivered) return null;

  // Ignorar pedidos que sejam rascunhos sem número ou cancelados
  if (order.header.isDraft && (!order.header.numeroPedido || order.header.numeroPedido.trim() === '')) {
    return null;
  }

  const rawDate = order.header.dataEntregaPrevista;
  const targetDate = parseDeliveryDate(rawDate);
  if (!targetDate) return null;

  const today = new Date(refDate);
  today.setHours(0, 0, 0, 0);

  const diffMs = targetDate.getTime() - today.getTime();
  const daysDiff = Math.round(diffMs / (1000 * 60 * 60 * 24));

  let severity: DeliveryAlertSeverity | null = null;
  let label = '';
  let badgeBg = '';
  let badgeText = '';
  let badgeBorder = '';
  const daysLate = daysDiff < 0 ? Math.abs(daysDiff) : 0;

  if (daysDiff < 0) {
    severity = 'late';
    label = daysLate === 1 ? 'Atrasado há 1 dia' : `Atrasado há ${daysLate} dias`;
    badgeBg = 'bg-rose-500/10 dark:bg-rose-500/20';
    badgeText = 'text-rose-600 dark:text-rose-400';
    badgeBorder = 'border-rose-400/40 dark:border-rose-700/50';
  } else if (daysDiff === 0) {
    severity = 'today';
    label = 'Entrega prevista para hoje';
    badgeBg = 'bg-amber-500/10 dark:bg-amber-500/20';
    badgeText = 'text-amber-700 dark:text-amber-300';
    badgeBorder = 'border-amber-400/40 dark:border-amber-700/50';
  } else if (daysDiff <= 2) {
    severity = 'upcoming';
    label = daysDiff === 1 ? 'Entrega prevista para amanhã' : `Entrega em ${daysDiff} dias`;
    badgeBg = 'bg-blue-500/10 dark:bg-blue-500/20';
    badgeText = 'text-blue-700 dark:text-blue-300';
    badgeBorder = 'border-blue-400/40 dark:border-blue-700/50';
  } else {
    // Prazo superior a 2 dias: dentro da normalidade, sem alerta
    return null;
  }

  const totals = calculateOrderTotals(order);

  return {
    order,
    orderId: order.header.id,
    numeroPedido: order.header.numeroPedido || 'S/N',
    fornecedor: order.header.fornecedor || 'Fornecedor não informado',
    status: order.header.status || 'Em Cotação',
    totalGeral: totals.totalGeral,
    dataEntregaPrevista: rawDate,
    dataEntregaPrevistaBr: toBrDate(rawDate),
    daysDiff,
    daysLate,
    severity,
    label,
    badgeBg,
    badgeText,
    badgeBorder
  };
}

/**
 * Calcula o resumo consolidado de todos os alertas de entrega da carteira de pedidos.
 */
export function getDeliveryAlertsSummary(orders: PurchaseOrder[] = []): DeliveryAlertsSummary {
  const alerts: OrderDeliveryAlert[] = [];
  const refDate = new Date();

  orders.forEach(order => {
    const alert = getOrderDeliveryAlert(order, refDate);
    if (alert) {
      alerts.push(alert);
    }
  });

  // Ordenação prioritária:
  // 1. Atrasados primeiro (do maior atraso para o menor)
  // 2. Previstos para hoje
  // 3. Próximos 2 dias (do mais próximo para o mais distante)
  alerts.sort((a, b) => a.daysDiff - b.daysDiff);

  const lateAlerts = alerts.filter(a => a.severity === 'late');
  const todayAlerts = alerts.filter(a => a.severity === 'today');
  const upcomingAlerts = alerts.filter(a => a.severity === 'upcoming');

  const totalLateValue = lateAlerts.reduce((sum, a) => sum + (a.totalGeral || 0), 0);

  return {
    alerts,
    lateAlerts,
    todayAlerts,
    upcomingAlerts,
    lateCount: lateAlerts.length,
    todayCount: todayAlerts.length,
    upcomingCount: upcomingAlerts.length,
    totalAlerts: alerts.length,
    totalLateValue
  };
}
