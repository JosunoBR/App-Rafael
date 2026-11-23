export interface StoreGoalRow {
  lojaId: string;
  lojaNome: string;
  cluster: 'A' | 'B' | 'C';
  cidade: string;
  vendasAnoAnterior: number; // 2025
  metaNormal: number; // Editável na calculadora
  superMeta: number; // Calculada: metaNormal * 1.10
  pontoEquilibrio: number; // Ponto de equilíbrio (PE)
  custosFixosTotais: number; // Total das despesas da planilha
  percentualComissaoMeta: number; // % comissão meta (ex: 0.3%)
  percentualComissaoSuper: number; // % comissão supermeta (ex: 0.9%)
  valorComissaoMeta: number; // Simulação comissão na meta
  valorComissaoSuper: number; // Simulação comissão na supermeta
  ticketMedioProjetado: number; // R$
  quantidadeVendasProjetada: number; // Qtd cupons
  statusPublicacao: 'publicado' | 'rascunho' | 'ajustado';
  historicoVendas: {
    ano: number;
    valor: number;
  }[];
}

export interface CustomCostItem {
  id: string;
  nome: string;
  valor: number;
}

export interface StoreFixedCosts {
  lojaId: string;
  lojaNome: string;
  aluguel: number;
  folhaPagamento: number;
  luz: number;
  agua: number;
  internet: number;
  seguranca: number;
  sistema: number;
  honorarios: number;
  operacional5: number;
  outrosCustos?: CustomCostItem[];
  totalCustosFixos: number;
  pontoEquilibrio: number; // Custos / 0.31
}

export interface ExecutiveNetworkGoalsSummary {
  metaGlobal: number;
  superMetaGlobal: number;
  pontoEquilibrioGlobal: number;
  margemSegurancaPercentual: number;
  totalComissoesMeta: number;
  totalComissoesSuper: number;
  ticketMedioMedio: number;
  totalVendasEstimadas: number;
  lojasPublicadasCount: number;
  totalLojasCount: number;
}
