// Tipos centrais do ecossistema de Compras e Separação (Rede Mega 12)

export type StoreCluster = 'A' | 'B' | 'C';

export interface StoreConfig {
  id: string;
  name: string;
  cluster: StoreCluster;
  defaultWeight: number;
  active: boolean;
}

export interface SeparationPreset {
  id: string;
  name: string;
  description?: string;
  storeWeights: Record<string, number>; // { [storeId]: pesoOuPercentual }
  storeWeightsJson?: string;
  reserveStockPercent: number; // % retido no Estoque Central / CD (ex: 10)
  isDefault?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface FiscalConfig {
  icmsAliquota: number;      // Padrão: 11%
  ipiAliquota: number;       // Padrão: 0%
  pisCofinsAliquota: number; // Padrão: 3%
  custosFixos: number;       // Padrão: 26%
  creditoEntradaICMS: number;// Padrão: 19.5%
}

export interface Supplier {
  id: string;
  razaoSocial: string;
  nomeFantasia?: string;
  cnpj?: string;
  vendedorPadrao?: string;
  contatoVendedor?: string;
  condicaoPagamentoPadrao?: string;
  aliquotaStPadrao?: number;    // % de ST (Substituição Tributária) cobrada por este fornecedor
  aliquotaIpiPadrao?: number;   // % de IPI
  descontoOffPadrao?: number;   // % de Desconto comercial habitual
  percentualNotaPadrao?: number; // % Nota fiscal padrão do fornecedor
  observacoesDescarga?: string; // Instruções de entrega / paletes
  pedidoPadraoJson?: string;    // JSON com a grade de itens padrão deste fornecedor
  pedidoPadrao?: {
    items: OrderItem[];
    condicaoPagamento?: string;
    aliquotaSt?: number;
    descontoOff?: number;
    percentualNota?: number;
    observacoes?: string;
    savedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface OrderItemFiscalOverride {
  useCustomFiscal?: boolean;
  icmsAliquota?: number;
  ipiAliquota?: number;
  pisCofinsAliquota?: number;
  custosFixos?: number;
  creditoEntradaICMS?: number;
}

export interface Product {
  id: string;
  codigoInterno: string;        // Código de produto interno (visível em todas as telas)
  codigoFornecedor?: string;    // Código de produto do fornecedor (visível em compras/pedidos e catálogo)
  codigoBarras?: string;        // Código de barras EAN-13 (visível em catálogo, estoque, separação; oculto em compras)
  codigo?: string;              // Mantido para retrocompatibilidade (aponta para codigoInterno)
  eanBarcode?: string;          // Mantido para retrocompatibilidade (aponta para codigoBarras)
  descricao: string;
  categoria?: string;
  fotoUrl?: string;
  qtdPorPacote?: number;        // @deprecated — Mantido por retrocompatibilidade
  precoUnitarioPadrao: number;
  pdvSugerido?: number;
  ncm?: string;
  supplierId?: string;
  nomeFornecedor?: string;
  ativo: boolean;
  createdAt: string;
  updatedAt: string;
}

// 4.1 Item em Estoque no Depósito Central (CD / Matriz)
export interface CentralStockItem {
  id: string;
  productId?: string;
  codigoInterno?: string;        // Código de produto interno
  codigoFornecedor?: string;     // Código de produto do fornecedor
  codigoBarras?: string;         // Código de barras EAN-13
  codigo: string;                // Retrocompatibilidade
  descricao: string;
  categoria?: string;
  fotoUrl?: string;
  qtdPorPacote?: number;         // @deprecated — Mantido por retrocompatibilidade
  saldoCaixas?: number;          // @deprecated — Mantido por retrocompatibilidade
  saldoUnidades: number;         // Saldo disponível em unidades no depósito (campo principal)
  precoUnitario: number;         // Custo de compra unitário
  pdvSugerido: number;           // Preço de venda pretendido
  localizacaoGalpao?: string;    // Endereço no CD (ex: "Rua B - Palete 14")
  fornecedorOrigem?: string;     // Fornecedor / Fabricante
  dataUltimaEntrada?: string;
  updatedAt: string;
}

export interface OrderItem {
  id: string;
  codigoInterno?: string;       // Código de produto interno (visível em todas as telas)
  codigoFornecedor?: string;    // Código de produto do fornecedor (visível na página de compras)
  codigo?: string;              // Mantido para retrocompatibilidade
  descricao: string;
  fotoUrl?: string;          // Foto/Imagem do produto (URL ou Base64)
  qtdPorPacote?: number;     // @deprecated — Mantido por retrocompatibilidade
  qtdPacotes?: number;       // @deprecated — Mantido por retrocompatibilidade
  qtdTotalUnidades: number;  // Quantidade total de unidades compradas (entrada principal)
  precoUnitario: number;     // Preço de compra por unidade (tabela / bruto)
  valorTotalBruto: number;   // = qtdTotalUnidades × precoUnitario
  
  // Desconto comercial por produto
  percentualDesconto?: number; // % OFF negociado para este item (ex: 5%)
  valorDescontoItem?: number;  // Valor em R$ do desconto total do item
  valorTotalLiquido?: number;  // = valorTotalBruto - valorDescontoItem
  // Acréscimos rateados ou específicos
  freteUnitario?: number;
  stUnitario?: number;
  ipiUnitario?: number;
  difalUnitario?: number;
  
  // Limite de Preço / Engenharia Fiscal
  pdvAlvo: number;           // Preço de venda pretendido na ponta (ex: 12.00)
  fiscalOverride?: OrderItemFiscalOverride;
  
  // Cálculos resultantes
  despesasPdvUnit?: number;  // PDV * % Despesas (40%)
  creditoIcmsUnit?: number;  // Compra * % Crédito (19.5%)
  custoRealEfetivo?: number; // Compra + Despesas PDV - Crédito ICMS
  margemRealUnit?: number;   // PDV - Custo Real Efetivo
  margemPercentual?: number; // Margem Real / PDV

  // Grade de separação por loja: { [storeId]: quantidadeCalculadaOuEditada }
  separacaoLojas?: Record<string, number>;
  separacaoManual?: boolean; // Se foi editado manualmente
  qtdReservaEstoque?: number; // Quantidade retida no Estoque Central / Matriz / CD
}

export type OrderStatus = 'Em Cotação' | 'Aprovado' | 'Em Separação' | 'Finalizado';

export interface OrderHeader {
  id: string;
  numeroPedido: string;
  fornecedor: string;
  supplierId?: string;       // Vínculo com cadastro de fornecedor
  aliquotaSt?: number;       // % ST do Fornecedor aplicada no pedido
  vendedor: string;
  contatoVendedor?: string;
  condicaoPagamento: string;
  dataPedido: string;
  dataEntregaPrevista: string;
  percentualDescontoOff: number; // % OFF negociado
  percentualNota?: number;       // % NOTA (Percentual faturado em Nota Fiscal para média histórica)
  observacoesDescarga?: string;
  
  // Despesas adicionais globais a ratear
  valorFreteGlobal: number;
  valorOutrasDespesasGlobal: number;
  
  // Estrutura do Dropdown Duplo de Pagamento & Negociação Mista (Entrada à vista + Saldo a prazo)
  parcelasCount?: number;            // Quantidade de parcelas (ex: 1, 2, 3, 4...)
  prazoDias?: number | string;       // Intervalo ou dias (ex: 30, 28, 15, 21, 45, 60, 'vista', 'entrada_com_parcelamento', 'custom')
  diaVencimentoPersonalizado?: string; // Data inicial ou dia base
  
  // Negociação com Entrada À Vista + Saldo Parcelado
  valorEntradaAVista?: number;       // Valor em R$ pago à vista / sinal
  saldoParcelasCount?: number;       // Quantidade de parcelas do saldo restante (ex: 1x, 2x, 3x...)
  saldoPrazoDias?: number | string;  // Intervalo de vencimento do saldo (ex: 30, 28, 15...)

  // Esteira Operacional & Auditoria
  status: OrderStatus | 'Rascunho';
  aprovadoPor?: string;
  dataAprovacao?: string;
  liberadoPorDeposito?: string;
  dataLiberacaoSeparacao?: string;
  finalizadoPor?: string;
  dataFinalizacao?: string;

  createdAt: string;
  updatedAt: string;
}

// Estrutura de Parcelas e Boletos Financeiros (Editáveis para Acordos Comerciais)
export interface PaymentInstallment {
  id: string;
  orderId?: string;
  numeroPedido?: string;
  fornecedor?: string;
  numeroParcela: number;
  totalParcelas: number;
  dataVencimento: string; // YYYY-MM-DD
  valor: number; // EDITÁVEL para acordos comerciais
  valorOriginal?: number; // Valor proporcional original antes de alterações
  status: 'A Vencer' | 'Vence Hoje' | 'Em Atraso' | 'Pago';
  dataPagamento?: string; // YYYY-MM-DD quando liquidado
  observacao?: string; // Motivo do acordo comercial / desconto / abatimento
  documentoRef?: string; // Código de barras / Boleto / NF
  updatedAt?: string;
}

// Estrutura de Registro e Quantificação de Avarias e Perdas
export interface AvariaRecord {
  id: string;
  itemId: string;
  codigoProduto?: string;
  descricaoProduto?: string;
  storeId: string;
  nomeLoja?: string;
  quantidade: number;
  unidadeMedida?: 'UN' | 'CX' | 'PCT' | 'JG' | 'PAR' | string;
  custoUnitario?: number;
  valorPrejuizoTotal?: number; // quantidade * custoUnitario
  motivo: string;
  conferente?: string;
  dataRegistro?: string;
}

export interface OrderInspection {
  conferente?: string;
  dataConferencia?: string;
  possuiAvarias: boolean;
  observacoesDoca?: string;
  avarias: AvariaRecord[];
  totalPrejuizoAvarias?: number;
}

export interface PurchaseOrder {
  id?: string;
  header: OrderHeader;
  items: OrderItem[];
  fiscalConfig: FiscalConfig;
  storeConfigs: StoreConfig[];
  inspection?: OrderInspection;
  installments?: PaymentInstallment[];
}

// 7. Tipos de Usuários & Níveis de Acesso (RBAC: Diretoria, Depósito, Separação)
export type UserRole = 'diretoria' | 'deposito' | 'separacao';

export interface User {
  id: string;
  nome: string;
  email: string;
  role: UserRole;
  cargo?: string;
  telefone?: string;
  ativo: number | boolean;
  token?: string;
  createdAt?: string;
  updatedAt?: string;
}
