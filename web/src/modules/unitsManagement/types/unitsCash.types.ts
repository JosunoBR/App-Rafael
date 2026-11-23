export type ExpenseCategory = 
  | 'limpeza' 
  | 'correios' 
  | 'transporte' 
  | 'alimentacao' 
  | 'manutencao' 
  | 'escritorio' 
  | 'outros';

export interface StoreExpenseRecord {
  id: string;
  descricao: string;
  valor: number;
  hora?: string;
  categoria: ExpenseCategory;
  comprovanteNome?: string;
  comprovanteUrl?: string;
  autorizadoPor?: string;
}

export interface StoreDailyCashMovement {
  data: string; // YYYY-MM-DD
  dataFormatada: string; // DD/MM/YYYY
  diaSemana: string;
  entradaDinheiro: number;
  despesas: StoreExpenseRecord[];
  totalDespesas: number;
  sangriaDia?: number;
  saldoLiquidoDia: number; // entradaDinheiro - totalDespesas - sangriaDia
  responsavel: string;
  memorando?: string;
}

export interface StoreCashBalance {
  lojaId: string;
  lojaCodigo: string;
  lojaNome: string;
  cidade: string;
  responsavel: string;
  fundoDeCaixa: number; // Troco fixo da loja
  totalEntradasDinheiro: number; // Soma de dinheiro que entrou no mês
  totalDespesas: number; // Soma de todos os gastos pagos pelo caixa
  totalSangrias: number; // Retiradas para depósito em conta
  saldoAtualEmCaixa: number; // fundoDeCaixa + totalEntradas - totalDespesas - totalSangrias
  ultimaAtualizacao: string;
  alertaSangria?: boolean; // Alerta se saldo em dinheiro ultrapassar limite seguro (ex: > R$ 3.000)
  movimentacoes: StoreDailyCashMovement[];
}
