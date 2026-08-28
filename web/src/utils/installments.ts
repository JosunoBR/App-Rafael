import { PurchaseOrder, PaymentInstallment } from '../shared/types';

export const PARCELAS_OPTIONS = [
  { value: 1, label: '1x (À Vista ou 1 Parcela)' },
  { value: 2, label: '2x Parcelas' },
  { value: 3, label: '3x Parcelas' },
  { value: 4, label: '4x Parcelas' },
  { value: 5, label: '5x Parcelas' },
  { value: 6, label: '6x Parcelas' },
  { value: 7, label: '7x Parcelas' },
  { value: 8, label: '8x Parcelas' },
  { value: 9, label: '9x Parcelas' },
  { value: 10, label: '10x Parcelas' },
  { value: 12, label: '12x Parcelas' },
];

export const PRAZO_OPTIONS = [
  { value: '30', label: 'A cada 30 dias (30/60/90...)' },
  { value: '28', label: 'A cada 28 dias (28/56/84...)' },
  { value: '15', label: 'A cada 15 dias (15/30/45...)' },
  { value: '21', label: 'A cada 21 dias (21/42/63...)' },
  { value: '45', label: '45 dias direto' },
  { value: '60', label: '60 dias direto' },
  { value: 'vista', label: 'À Vista / TED / PIX' },
  { value: 'custom', label: 'Personalizado' },
];

/**
 * Calcula o valor líquido total do pedido (itens com desconto OFF + frete + outras despesas)
 */
export function calculateOrderNetTotal(order: PurchaseOrder): number {
  if (!order) return 0;
  const itemsBruto = (order.items || []).reduce((sum, it) => sum + (it.valorTotalBruto || 0), 0);
  const discountOff = (order.header?.percentualDescontoOff || 0) / 100;
  const itemsComDesconto = itemsBruto * (1 - Math.max(0, Math.min(1, discountOff)));
  const frete = Number(order.header?.valorFreteGlobal) || 0;
  const outras = Number(order.header?.valorOutrasDespesasGlobal) || 0;
  return Math.max(0, itemsComDesconto + frete + outras);
}

/**
 * Formata a string de condição de pagamento (ex: "3x (30/60/90 Dias)")
 */
export function formatPaymentConditionString(parcelas: number, prazo: string | number): string {
  if (prazo === 'vista' || (parcelas === 1 && prazo === 'vista')) {
    return 'À Vista (TED/PIX)';
  }
  const intervalo = Number(prazo);
  if (!isNaN(intervalo) && intervalo > 0) {
    if (parcelas === 1) {
      return `${intervalo} Dias`;
    }
    const days: number[] = [];
    for (let i = 1; i <= parcelas; i++) {
      days.push(i * intervalo);
    }
    return `${parcelas}x (${days.join('/')} Dias)`;
  }
  if (prazo === 'custom') {
    return `${parcelas}x Personalizado`;
  }
  return `${parcelas}x Parcelas`;
}

/**
 * Extrai quantidade de parcelas e prazo a partir da string salva
 */
export function parsePaymentConditionString(cond?: string): { parcelas: number; prazo: string } {
  if (!cond || cond.trim() === '') {
    return { parcelas: 3, prazo: '30' };
  }
  const lower = cond.toLowerCase();
  if (lower.includes('vista') || lower.includes('ted') || lower.includes('pix')) {
    return { parcelas: 1, prazo: 'vista' };
  }

  // Verifica se há formato "Nx" (ex: "3x", "4x")
  const matchX = cond.match(/(\d+)\s*x/i);
  let parcelas = matchX ? parseInt(matchX[1], 10) : 0;

  if (lower.includes('28')) {
    if (!parcelas) parcelas = cond.includes('/') ? cond.split('/').length : 2;
    return { parcelas: parcelas || 2, prazo: '28' };
  }
  if (lower.includes('15')) {
    if (!parcelas) parcelas = cond.includes('/') ? cond.split('/').length : 3;
    return { parcelas: parcelas || 3, prazo: '15' };
  }
  if (lower.includes('21')) {
    if (!parcelas) parcelas = cond.includes('/') ? cond.split('/').length : 3;
    return { parcelas: parcelas || 3, prazo: '21' };
  }
  if (lower.includes('45')) {
    return { parcelas: parcelas || 1, prazo: '45' };
  }
  if (lower.includes('60')) {
    return { parcelas: parcelas || 1, prazo: '60' };
  }
  if (lower.includes('30')) {
    if (!parcelas) parcelas = cond.includes('/') ? cond.split('/').length : 3;
    return { parcelas: parcelas || 3, prazo: '30' };
  }

  return { parcelas: parcelas || 3, prazo: '30' };
}

/**
 * Adiciona dias a uma data no formato YYYY-MM-DD
 */
export function addDaysToDate(dateStr: string, days: number): string {
  try {
    const [year, month, day] = dateStr.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    d.setDate(d.getDate() + days);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const dayFormatted = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayFormatted}`;
  } catch {
    return dateStr;
  }
}

/**
 * Determina o status do boleto com base na data de vencimento e pagamento
 */
export function getInstallmentStatus(
  dataVencimento: string, 
  dataPagamento?: string
): 'A Vencer' | 'Vence Hoje' | 'Em Atraso' | 'Pago' {
  if (dataPagamento && dataPagamento.trim() !== '') {
    return 'Pago';
  }
  if (!dataVencimento) return 'A Vencer';

  const todayStr = new Date().toISOString().split('T')[0];
  if (dataVencimento === todayStr) {
    return 'Vence Hoje';
  }
  if (dataVencimento < todayStr) {
    return 'Em Atraso';
  }
  return 'A Vencer';
}

/**
 * Gera a lista de parcelas/boletos calculados para o pedido, preservando acordos já editados se aplicável
 */
export function generateOrderInstallments(
  order: PurchaseOrder,
  customParcelas?: number,
  customPrazo?: string | number,
  preserveExistingEdits = true
): PaymentInstallment[] {
  if (!order || !order.header) return [];

  const parsed = parsePaymentConditionString(order.header.condicaoPagamento);
  const totalParcelas = customParcelas ?? order.header.parcelasCount ?? parsed.parcelas ?? 3;
  const prazo = String(customPrazo ?? order.header.prazoDias ?? parsed.prazo ?? '30');

  const baseDate = order.header.dataPedido || new Date().toISOString().split('T')[0];
  const netTotal = calculateOrderNetTotal(order);

  // Valor base por parcela arredondado
  const baseValue = totalParcelas > 0 ? Number((netTotal / totalParcelas).toFixed(2)) : netTotal;
  const remainder = totalParcelas > 0 ? Number((netTotal - baseValue * totalParcelas).toFixed(2)) : 0;

  const existingMap = new Map<number, PaymentInstallment>();
  if (preserveExistingEdits && Array.isArray(order.installments)) {
    order.installments.forEach(inst => {
      existingMap.set(inst.numeroParcela, inst);
    });
  }

  const list: PaymentInstallment[] = [];

  for (let i = 1; i <= totalParcelas; i++) {
    const existing = existingMap.get(i);

    // Calcular data de vencimento padrão
    let dueDays = 0;
    if (prazo === 'vista') {
      dueDays = 0;
    } else if (prazo === '45') {
      dueDays = 45 + (i - 1) * 30;
    } else if (prazo === '60') {
      dueDays = 60 + (i - 1) * 30;
    } else {
      const intervalNum = Number(prazo) || 30;
      dueDays = i * intervalNum;
    }

    const calculatedDueDate = addDaysToDate(baseDate, dueDays);
    const originalProportionalVal = i === 1 ? Number((baseValue + remainder).toFixed(2)) : baseValue;

    // Se já havia uma parcela com edição de acordo ou status, preserva
    const valorFinal = existing?.valor !== undefined ? existing.valor : originalProportionalVal;
    const dataVencimentoFinal = existing?.dataVencimento || calculatedDueDate;
    const statusFinal = existing?.status || getInstallmentStatus(dataVencimentoFinal, existing?.dataPagamento);

    list.push({
      id: existing?.id || `inst_${order.header.id || 'ord'}_${i}_${Date.now()}`,
      orderId: order.header.id,
      numeroPedido: order.header.numeroPedido,
      fornecedor: order.header.fornecedor,
      numeroParcela: i,
      totalParcelas: totalParcelas,
      dataVencimento: dataVencimentoFinal,
      valor: valorFinal,
      valorOriginal: existing?.valorOriginal ?? originalProportionalVal,
      status: statusFinal,
      dataPagamento: existing?.dataPagamento,
      observacao: existing?.observacao,
      documentoRef: existing?.documentoRef,
      updatedAt: new Date().toISOString()
    });
  }

  return list;
}
