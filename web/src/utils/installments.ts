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
  { value: '7', label: 'A cada 7 dias (7/14/21...)' },
  { value: '10', label: 'A cada 10 dias (10/20/30...)' },
  { value: '15', label: 'A cada 15 dias (15/30/45...)' },
  { value: '21', label: 'A cada 21 dias (21/42/63...)' },
  { value: '28', label: 'A cada 28 dias (28/56/84...)' },
  { value: '30', label: 'A cada 30 dias (30/60/90...)' },
  { value: 'vista', label: '100% À Vista Integral (TED / PIX)' },
  { value: 'entrada_com_parcelamento', label: 'Entrada À Vista + Saldo Parcelado' },
];

export const SALDO_PRAZO_OPTIONS = PRAZO_OPTIONS.filter(
  (opt) => !['vista', 'entrada_com_parcelamento'].includes(opt.value)
);

/**
 * Calcula o valor líquido total apenas das mercadorias/produtos (com desconto OFF)
 */
export function calculateOrderMerchandiseTotal(order: PurchaseOrder): number {
  if (!order) return 0;

  const items = order.items || [];
  const offGlobal = Math.max(0, Math.min(100, Number(order.header?.percentualDescontoOff) || 0));

  return items.reduce((sum, it) => {
    if (!it || (!it.descricao && !it.codigo)) return sum;
    const bruto = it.valorTotalBruto || ((it.qtdTotalUnidades || 0) * (it.precoUnitario || 0)) || 0;
    if (bruto <= 0) return sum;

    // Se o item tem percentual de desconto individual > 0, utiliza ele; caso contrário, aplica o OFF global do pedido
    const descPct = (it.percentualDesconto !== undefined && it.percentualDesconto > 0)
      ? Math.max(0, Math.min(100, it.percentualDesconto))
      : offGlobal;

    const liq = (it.valorTotalLiquido !== undefined && it.percentualDesconto !== undefined && it.percentualDesconto > 0) 
      ? it.valorTotalLiquido 
      : (bruto * (1 - descPct / 100));

    return sum + Math.max(0, liq);
  }, 0);
}

/**
 * Calcula o valor líquido total do pedido (itens com desconto OFF + frete + outras despesas)
 */
export function calculateOrderNetTotal(order: PurchaseOrder): number {
  if (!order) return 0;

  const itemsComDesconto = calculateOrderMerchandiseTotal(order);
  const frete = Number(order.header?.valorFrete ?? order.header?.valorFreteGlobal) || 0;
  const outras = Number(order.header?.valorOutrasDespesasGlobal) || 0;
  return Math.max(0, itemsComDesconto + frete + outras);
}

/**
 * Formata a string de condição de pagamento (ex: "3x (30/60/90 Dias)" ou "Entrada R$ 5.000 + 2x (30/60 Dias)")
 */
export function formatPaymentConditionString(
  parcelas: number, 
  prazo: string | number,
  valorEntrada?: number,
  saldoParcelas?: number,
  saldoPrazo?: string | number
): string {
  if (prazo === 'vista' || (parcelas === 1 && prazo === 'vista')) {
    return '100% À Vista (TED/PIX)';
  }
  if (prazo === 'entrada_com_parcelamento') {
    const entradaStr = valorEntrada && valorEntrada > 0 
      ? `Entrada R$ ${valorEntrada.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` 
      : 'Entrada À Vista';
    const sParc = saldoParcelas || 2;
    const sPrazo = saldoPrazo || '30';
    const sPrazoStr = formatPaymentConditionString(sParc, sPrazo);
    return `${entradaStr} + ${sPrazoStr}`;
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
  if (lower.includes('entrada') && (lower.includes('+') || lower.includes('saldo') || lower.includes('dias') || lower.includes('x'))) {
    return { parcelas: 3, prazo: 'entrada_com_parcelamento' };
  }
  if (lower.includes('vista') || lower.includes('ted') || lower.includes('pix')) {
    return { parcelas: 1, prazo: 'vista' };
  }

  // Verifica se há formato "Nx" (ex: "3x", "4x")
  const matchX = cond.match(/(\d+)\s*x/i);
  let parcelas = matchX ? parseInt(matchX[1], 10) : 0;

  if (lower.includes('7') && (lower.includes('7/') || lower.includes('7 dias') || lower.includes('cada 7') || lower.includes('(7/'))) {
    if (!parcelas) parcelas = cond.includes('/') ? cond.split('/').length : 2;
    return { parcelas: parcelas || 2, prazo: '7' };
  }
  if (lower.includes('10') && (lower.includes('10/') || lower.includes('10 dias') || lower.includes('cada 10') || lower.includes('(10/'))) {
    if (!parcelas) parcelas = cond.includes('/') ? cond.split('/').length : 3;
    return { parcelas: parcelas || 3, prazo: '10' };
  }
  if (lower.includes('15')) {
    if (!parcelas) parcelas = cond.includes('/') ? cond.split('/').length : 3;
    return { parcelas: parcelas || 3, prazo: '15' };
  }
  if (lower.includes('21')) {
    if (!parcelas) parcelas = cond.includes('/') ? cond.split('/').length : 3;
    return { parcelas: parcelas || 3, prazo: '21' };
  }
  if (lower.includes('28')) {
    if (!parcelas) parcelas = cond.includes('/') ? cond.split('/').length : 2;
    return { parcelas: parcelas || 2, prazo: '28' };
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
    const d = new Date(Date.UTC(year, month - 1, day));
    d.setUTCDate(d.getUTCDate() + days);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const dayFormatted = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${dayFormatted}`;
  } catch {
    return dateStr;
  }
}

/**
 * Calcula a diferença em dias exatos entre duas datas no formato YYYY-MM-DD
 */
export function getDaysDifference(d1: string, d2: string): number {
  try {
    const [y1, m1, day1] = d1.split('-').map(Number);
    const [y2, m2, day2] = d2.split('-').map(Number);
    const dt1 = new Date(Date.UTC(y1, m1 - 1, day1));
    const dt2 = new Date(Date.UTC(y2, m2 - 1, day2));
    const diffMs = dt2.getTime() - dt1.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return 0;
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
  const prazo = String(customPrazo ?? order.header.prazoDias ?? parsed.prazo ?? '30');
  const netTotal = calculateOrderNetTotal(order);
  const customDates = order.header.datasVencimentoPersonalizadas;

  // A primeira parcela a prazo é contada a partir da data de entrega da mercadoria
  const baseDeliveryDate = order.header.dataEntregaPrevista || order.header.dataPedido || new Date().toISOString().split('T')[0];
  const orderDate = order.header.dataPedido || new Date().toISOString().split('T')[0];

  const existingMap = new Map<number, PaymentInstallment>();
  if (preserveExistingEdits && Array.isArray(order.installments)) {
    order.installments.forEach(inst => {
      existingMap.set(inst.numeroParcela, inst);
    });
  }

  const list: PaymentInstallment[] = [];
  const valorFrete = Number(order.header?.valorFrete ?? order.header?.valorFreteGlobal) || 0;
  // As parcelas de mercadoria do fornecedor dividem o valor líquido sem o frete (pois o frete possui boleto próprio)
  const valorBaseMercadoria = Math.max(0, netTotal - valorFrete);

  // CENÁRIO A: ENTRADA À VISTA + SALDO PARCELADO A PRAZO
  if (prazo === 'entrada_com_parcelamento') {
    const valorEntrada = Math.min(valorBaseMercadoria, Math.max(0, order.header.valorEntradaAVista || 0));
    const saldoRestante = Math.max(0, valorBaseMercadoria - valorEntrada);
    const totalParcelasSaldo = Math.max(1, order.header.saldoParcelasCount || 2);
    const saldoPrazo = String(order.header.saldoPrazoDias || '30');
    const totalParcelasGeral = 1 + totalParcelasSaldo;

    // 1. Parcela de Entrada (À Vista)
    const existingEntrada = existingMap.get(1);
    const customEntradaDate = customDates?.['1'];
    const dataVencEntrada = customEntradaDate || existingEntrada?.dataVencimento || orderDate;
    const valorEntradaFinal = existingEntrada?.valor !== undefined ? existingEntrada.valor : valorEntrada;
    const statusEntrada = existingEntrada?.status || getInstallmentStatus(dataVencEntrada, existingEntrada?.dataPagamento);

    list.push({
      id: existingEntrada?.id || `inst_${order.header.id || 'ord'}_1_${Date.now()}`,
      orderId: order.header.id,
      numeroPedido: order.header.numeroPedido,
      fornecedor: order.header.fornecedor,
      numeroParcela: 1,
      totalParcelas: totalParcelasGeral,
      dataVencimento: dataVencEntrada,
      valor: valorEntradaFinal,
      valorOriginal: existingEntrada?.valorOriginal ?? valorEntrada,
      status: statusEntrada,
      dataPagamento: existingEntrada?.dataPagamento,
      observacao: existingEntrada?.observacao || 'Entrada / Sinal À Vista (TED/PIX)',
      documentoRef: existingEntrada?.documentoRef,
      tipoTitulo: 'mercadoria',
      isBoletoFrete: false,
      updatedAt: new Date().toISOString()
    });

    // 2. Parcelas do Saldo a Prazo (Contadas a partir da entrega)
    const saldoBaseValue = totalParcelasSaldo > 0 ? Number((saldoRestante / totalParcelasSaldo).toFixed(2)) : saldoRestante;
    const saldoRemainder = totalParcelasSaldo > 0 ? Number((saldoRestante - saldoBaseValue * totalParcelasSaldo).toFixed(2)) : 0;

    for (let j = 1; j <= totalParcelasSaldo; j++) {
      const numParcela = j + 1;
      const existing = existingMap.get(numParcela);

      let dueDays = 0;
      const intervalNum = Number(saldoPrazo) || 30;
      dueDays = j * intervalNum;

      const calculatedDueDate = addDaysToDate(baseDeliveryDate, dueDays);
      const originalProportionalVal = j === 1 ? Number((saldoBaseValue + saldoRemainder).toFixed(2)) : saldoBaseValue;

      const customSaldoDate = customDates?.[String(numParcela)];
      const valorFinal = existing?.valor !== undefined ? existing.valor : originalProportionalVal;
      const dataVencimentoFinal = customSaldoDate || existing?.dataVencimento || calculatedDueDate;
      const statusFinal = existing?.status || getInstallmentStatus(dataVencimentoFinal, existing?.dataPagamento);

      list.push({
        id: existing?.id || `inst_${order.header.id || 'ord'}_${numParcela}_${Date.now()}`,
        orderId: order.header.id,
        numeroPedido: order.header.numeroPedido,
        fornecedor: order.header.fornecedor,
        numeroParcela: numParcela,
        totalParcelas: totalParcelasGeral,
        dataVencimento: dataVencimentoFinal,
        valor: valorFinal,
        valorOriginal: existing?.valorOriginal ?? originalProportionalVal,
        status: statusFinal,
        dataPagamento: existing?.dataPagamento,
        observacao: existing?.observacao || `Saldo ${j}/${totalParcelasSaldo} (${dueDays}d da Entrega)`,
        documentoRef: existing?.documentoRef,
        tipoTitulo: 'mercadoria',
        isBoletoFrete: false,
        updatedAt: new Date().toISOString()
      });
    }
  } else {
    // CENÁRIO B: PARCELAMENTO PADRÃO (OU 100% À VISTA)
    const totalParcelas = customParcelas ?? order.header.parcelasCount ?? parsed.parcelas ?? 3;
    const baseValue = totalParcelas > 0 ? Number((valorBaseMercadoria / totalParcelas).toFixed(2)) : valorBaseMercadoria;
    const remainder = totalParcelas > 0 ? Number((valorBaseMercadoria - baseValue * totalParcelas).toFixed(2)) : 0;

    for (let i = 1; i <= totalParcelas; i++) {
      const existing = existingMap.get(i);

      let dueDays = 0;
      if (prazo === 'vista') {
        dueDays = 0;
      } else {
        const intervalNum = Number(prazo) || 30;
        dueDays = i * intervalNum;
      }

      const calculatedDueDate = addDaysToDate(baseDeliveryDate, dueDays);
      const originalProportionalVal = i === 1 ? Number((baseValue + remainder).toFixed(2)) : baseValue;

      const customDate = customDates?.[String(i)];
      const valorFinal = existing?.valor !== undefined ? existing.valor : originalProportionalVal;
      const dataVencimentoFinal = customDate || existing?.dataVencimento || calculatedDueDate;
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
        observacao: existing?.observacao || (prazo === 'vista' ? 'Pagamento 100% À Vista' : `Parcela ${i}/${totalParcelas} (${dueDays}d da Entrega)`),
        documentoRef: existing?.documentoRef,
        tipoTitulo: 'mercadoria',
        isBoletoFrete: false,
        updatedAt: new Date().toISOString()
      });
    }
  }

  // CENÁRIO C: BOLETO AUTOMÁTICO DE FRETE (10 DIAS APÓS A DATA DE ENTREGA)
  if (valorFrete > 0) {
    const freteDueDate = addDaysToDate(baseDeliveryDate, 10);
    // Verificar se já existia um boleto de frete preservado
    const existingFrete = Array.isArray(order.installments)
      ? order.installments.find(inst => inst.isBoletoFrete || inst.tipoTitulo === 'frete' || inst.observacao?.toLowerCase().includes('frete'))
      : undefined;

    const nextParcelaNum = list.length + 1;
    const customFreteDate = customDates?.['frete'] || customDates?.[String(nextParcelaNum)];

    const valorFreteFinal = existingFrete?.valor !== undefined ? existingFrete.valor : valorFrete;
    const dataVencFrete = customFreteDate || existingFrete?.dataVencimento || freteDueDate;
    const statusFrete = existingFrete?.status || getInstallmentStatus(dataVencFrete, existingFrete?.dataPagamento);

    list.push({
      id: existingFrete?.id || `inst_frete_${order.header.id || 'ord'}_${Date.now()}`,
      orderId: order.header.id,
      numeroPedido: order.header.numeroPedido,
      fornecedor: order.header.fornecedor ? `${order.header.fornecedor} (Frete)` : 'Transportadora / Frete',
      numeroParcela: nextParcelaNum,
      totalParcelas: nextParcelaNum,
      dataVencimento: dataVencFrete,
      valor: valorFreteFinal,
      valorOriginal: existingFrete?.valorOriginal ?? valorFrete,
      status: statusFrete,
      dataPagamento: existingFrete?.dataPagamento,
      observacao: existingFrete?.observacao || 'Boleto de Frete (10 dias após a entrega)',
      documentoRef: existingFrete?.documentoRef || 'Boleto Frete',
      isBoletoFrete: true,
      tipoTitulo: 'frete',
      updatedAt: new Date().toISOString()
    });
  }

  return list;
}
