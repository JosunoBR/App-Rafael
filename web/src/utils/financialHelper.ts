import { FinancialEntry, PurchaseOrder } from '../shared/types';

export interface EntryOrderAndNf {
  orderNumber: string;
  nfNumber: string;
}

/**
 * Extrai e normaliza o Número do Pedido e o Número da Nota Fiscal (NF)
 * para exibição em colunas dedicadas e organizadas na tela do Financeiro e relatórios.
 */
export function getEntryOrderAndNf(item: FinancialEntry, linkedOrder?: PurchaseOrder): EntryOrderAndNf {
  // 1. Identificar Número do Pedido
  let orderNumber = '';
  if (linkedOrder?.header?.numeroPedido) {
    orderNumber = linkedOrder.header.numeroPedido.trim();
  } else if (item.numeroPedido) {
    orderNumber = item.numeroPedido.trim();
  } else if (item.documentoRef && /^PED-?\d+/i.test(item.documentoRef.trim())) {
    orderNumber = item.documentoRef.trim().toUpperCase();
  } else {
    const match = item.descricao.match(/PED-?\d+/i) || item.descricao.match(/Pedido\s*\d+/i);
    if (match) {
      orderNumber = match[0].toUpperCase().replace(/\s+/, '-');
    }
  }

  // 2. Identificar Número da Nota Fiscal (NF)
  let nfNumber = '';
  if (linkedOrder?.header?.numeroNotaFiscal && linkedOrder.header.numeroNotaFiscal.trim()) {
    nfNumber = linkedOrder.header.numeroNotaFiscal.trim();
  } else if (item.numeroNotaFiscal && item.numeroNotaFiscal.trim()) {
    nfNumber = item.numeroNotaFiscal.trim();
  }

  // Se ainda não achou a NF no pedido, verifica se o documentoRef é a NF (não sendo cópia do pedido ou frete genérico)
  if (!nfNumber && item.documentoRef && item.documentoRef.trim()) {
    const doc = item.documentoRef.trim();
    const isJustPed = orderNumber && doc.toUpperCase() === orderNumber.toUpperCase();
    const isFreightPlaceholder = doc.toLowerCase().startsWith('boleto frete');
    if (!isJustPed && !isFreightPlaceholder) {
      nfNumber = doc;
    }
  }

  return {
    orderNumber: orderNumber || '—',
    nfNumber: nfNumber || '—'
  };
}
