export type CashClosingStatus = 'aberto' | 'em_conferencia' | 'aprovado' | 'devolvido';
export type StorePortalStyle = 'hero' | 'split' | 'erica' | 'classic';

export interface ExpenseItem {
  id: string;
  descricao: string;
  tipo?: 'despesa' | 'deposito';
  valor: number;
}

export interface MarkedHoliday {
  date: string; // Formato YYYY-MM-DD
  holidayName: string;
  markedBy?: string;
  markedAt?: string;
  approvedBy?: string;
  status?: 'declarado' | 'aprovado';
}

export interface DailyCashClosing {
  data: string; // Formato YYYY-MM-DD
  status: CashClosingStatus;
  vendaTotal: number;
  quantidadeVendas?: number | null;
  dinheiro: number;
  pixKais: number;
  pixStone: number;
  pixCnpj: number;
  cartaoDebito: number;
  cartaoCredito: number;
  fundoTroco?: number;
  despesas: ExpenseItem[];
  memorando: string;
  responsavelFechamento: string;
  motivoDevolucao?: string;
  dataHoraEnvio?: string;
  dataHoraConferencia?: string;
  ajustadoPorFinanceiro?: boolean;
  motivoAjusteFinanceiro?: string;
}

export interface StoreGoalData {
  lojaId: string;
  lojaNome: string;
  mesAno: string; // Formato YYYY-MM
  metaNormal: number;
  superMeta: number;
  acumuladoVendido: number;
  diasUteisRestantes: number;
  mediaDiariaNecessaria: number;
  diasOperacionaisMes: number;
}
