import { ExpenseItem } from '../../storePortal/types/storePortal.types';

export type ClosingStatus = 'aguardando' | 'aprovado' | 'devolvido' | 'pendente';

export interface StorePaymentMethods {
  dinheiro: number;
  pixKais: number;
  pixStone: number;
  pixCnpj: number;
  cartaoDebito: number;
  cartaoCredito: number;
}

export interface StoreDailyClosingSummary {
  lojaId: string;
  lojaNome: string;
  lojaCodigo: string;
  data: string; // YYYY-MM-DD
  status: ClosingStatus;
  vendaTotal: number;
  quantidadeVendas?: number | null;
  ticketMedio?: number;
  meiosPagamento: StorePaymentMethods;
  despesas: ExpenseItem[];
  memorando?: string;
  responsavelFechamento?: string;
  dataHoraEnvio?: string;
  motivoDevolucao?: string;
  conferidoPor?: string;
  conferidoEm?: string;
  ajustadoPorFinanceiro?: boolean;
  motivoAjusteFinanceiro?: string;
}

export type HolidayRequestStatus = 'pendente' | 'aprovado' | 'recusado';

export interface StoreHolidayRequest {
  id: string;
  lojaId: string;
  lojaNome: string;
  data: string; // YYYY-MM-DD
  holidayName: string;
  solicitadoPor: string;
  solicitadoEm: string;
  status: HolidayRequestStatus;
  motivoLoja?: string;
  respostaFinanceiro?: string;
  respondidoPor?: string;
  respondidoEm?: string;
}

export interface StorePerformanceMetric {
  lojaId: string;
  lojaNome: string;
  lojaCodigo: string;
  cluster: 'A' | 'B' | 'C';
  metaNormal: number;
  superMeta: number;
  acumuladoVendido: number;
  percentualMeta: number;
  percentualSuperMeta: number;
  ritmoDiario: number;
  mediaDiariaNecessaria: number;
  projecaoFechamento: number;
  diasUteisOperacionais: number;
  diasUteisRestantes: number;
  statusRitmo: 'supermeta' | 'meta' | 'no_ritmo' | 'abaixo';
  ticketMedio: number;
  totalAtendimentos: number;
}

export interface BiDailyProgression {
  dia: number;
  dataStr: string;
  vendaRealAcumulada: number | null;
  linhaMeta: number;
  linhaSuperMeta: number;
  vendaDia: number | null;
}

export interface PaymentMixItem {
  id: string;
  label: string;
  valor: number;
  percentual: number;
  color: string;
  iconName: string;
}

export interface AnnualStoreMatrixRow {
  lojaId: string;
  lojaNome: string;
  cluster: 'A' | 'B' | 'C';
  vendas2021: number;
  vendas2022: number;
  vendas2023: number;
  vendas2024: number;
  vendas2025: number;
  vendas2026: number; // Mês atual ou projeção
  meta2026: number;
  superMeta2026: number;
  pontoEquilibrio: number;
  crescimentoAnualPct: number;
  comissaoMetaEstimada: number;
  comissaoSuperMetaEstimada: number;
}
