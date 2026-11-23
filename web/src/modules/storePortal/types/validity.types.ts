export type ValidityAlertStatus = 'pendente' | 'snoozed' | 'conferido' | 'esgotado';

export interface StoreProductValidity {
  id: string;
  orderId: string;
  orderNumber: string;
  supplierName: string;
  itemId: string;
  productId: string;
  productName: string;
  productCode: string;
  productImage?: string;
  categoria: string;
  
  // Dados de validade e doca
  expirationDate: string; // YYYY-MM-DD
  batchNumber?: string;
  separationDate: string; // YYYY-MM-DD
  separatedBy: string;
  
  // Destino
  storeId: string;
  storeName: string;
  cidade: string;
  quantityAllocated: number; // Qtd enviada para esta loja
  
  // Status do Alerta de 15 Dias
  alert15dStatus: ValidityAlertStatus;
  alert15dSnoozedUntil?: string; // ISO timestamp
  alert15dConfirmedAt?: string;
  alert15dConfirmedBy?: string;
  stockRemaining?: number | null; // null = esgotado / vendido
  storeNotes?: string;
  
  // Lembrete do Dia D (Vencimento)
  dueDayAcknowledged?: boolean;
  dueDayAcknowledgedAt?: string;
}

export interface ValidityNetworkSummary {
  totalLotesMonitorados: number;
  totalVencemHoje: number;
  totalCritico7Dias: number;
  totalAlerta15Dias: number;
  totalAtencao30Dias: number;
  totalLojasPendentes: number;
  totalLojasConferidas: number;
}
