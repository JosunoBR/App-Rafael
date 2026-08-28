import { PurchaseOrder, FiscalConfig, StoreConfig, Supplier, Product } from '../shared/types';
import { DEFAULT_FISCAL_CONFIG, DEFAULT_STORES } from '../shared/constants';
import { calculateItemFiscal } from '../shared/fiscalEngine';
import { calculateAutomaticSeparation, calculateBoxesSeparation } from '../shared/separationEngine';

const STORAGE_KEYS = {
  CURRENT_ORDER: 'mega12_current_order_v1',
  SAVED_ORDERS: 'mega12_saved_orders_v1',
  GLOBAL_FISCAL: 'mega12_global_fiscal_v1',
  GLOBAL_STORES: 'mega12_global_stores_v1',
  SUPPLIERS: 'mega12_suppliers_v1',
  PRODUCTS: 'mega12_products_v1',
  ORDER_SEQUENCE: 'mega12_order_sequence_v1',
  THEME: 'mega12_theme_v1'
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod_1',
    codigo: 'PRD-001',
    descricao: 'Garrafa Térmica Inox 1L com Termômetro Digital',
    categoria: 'Utilidades Térmicas',
    fotoUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 12,
    precoUnitarioPadrao: 18.50,
    pdvSugerido: 49.90,
    ncm: '9617.00.10',
    eanBarcode: '7891000100011',
    supplierId: 'sup_1',
    nomeFornecedor: 'Brasil Plásticos',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_2',
    codigo: 'PRD-002',
    descricao: 'Conjunto 6 Taças de Cristal Lapidado 320ml',
    categoria: 'Vidros & Cristais',
    fotoUrl: 'https://images.unsplash.com/photo-1574053415387-a25475d4088d?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 6,
    precoUnitarioPadrao: 28.00,
    pdvSugerido: 79.90,
    ncm: '7013.22.00',
    eanBarcode: '7891000100028',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_3',
    codigo: 'PRD-003',
    descricao: 'Kit 4 Potes Herméticos de Vidro com Tampa Bambu',
    categoria: 'Organizadores',
    fotoUrl: 'https://images.unsplash.com/photo-1584990347449-399a9a3b6fcf?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 8,
    precoUnitarioPadrao: 22.90,
    pdvSugerido: 59.90,
    ncm: '7013.49.00',
    eanBarcode: '7891000100035',
    supplierId: 'sup_1',
    nomeFornecedor: 'Brasil Plásticos',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_4',
    codigo: 'PRD-004',
    descricao: 'Luminária Decorativa LED Articulada de Mesa',
    categoria: 'Decoração & Presentes',
    fotoUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 24,
    precoUnitarioPadrao: 14.20,
    pdvSugerido: 39.90,
    ncm: '9405.20.00',
    eanBarcode: '7891000100042',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_5',
    codigo: 'PRD-005',
    descricao: 'Frigideira Antiaderente Cerâmica 24cm Granito',
    categoria: 'Panelas & Cozinha',
    fotoUrl: 'https://images.unsplash.com/photo-1583778176476-4a8b02a64c01?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 10,
    precoUnitarioPadrao: 32.00,
    pdvSugerido: 89.90,
    ncm: '7615.10.00',
    eanBarcode: '7891000100059',
    supplierId: 'sup_3',
    nomeFornecedor: 'Alumínios União',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_6',
    codigo: 'PRD-006',
    descricao: 'Aparelho de Jantar 16 Peças Cerâmica Nórdica',
    categoria: 'Mesa Posta',
    fotoUrl: 'https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 2,
    precoUnitarioPadrao: 85.00,
    pdvSugerido: 229.00,
    ncm: '6912.00.00',
    eanBarcode: '7891000100066',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_7',
    codigo: 'PRD-007',
    descricao: 'Jogo 6 Facas Cozinha Inox com Cepo de Madeira',
    categoria: 'Cutelaria',
    fotoUrl: 'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 12,
    precoUnitarioPadrao: 38.00,
    pdvSugerido: 99.90,
    ncm: '8211.91.00',
    eanBarcode: '7891000100073',
    supplierId: 'sup_3',
    nomeFornecedor: 'Alumínios União',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_8',
    codigo: 'PRD-008',
    descricao: 'Difusor de Aromas Elétrico Ultrassônico 300ml',
    categoria: 'Bem-Estar & Casa',
    fotoUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 20,
    precoUnitarioPadrao: 24.50,
    pdvSugerido: 69.90,
    ncm: '8509.80.90',
    eanBarcode: '7891000100080',
    supplierId: 'sup_1',
    nomeFornecedor: 'Brasil Plásticos',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_9',
    codigo: 'PRD-009',
    descricao: 'Organizador Giratório Multiuso Acrílico 360°',
    categoria: 'Organizadores',
    fotoUrl: 'https://images.unsplash.com/photo-1584990347449-399a9a3b6fcf?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 15,
    precoUnitarioPadrao: 16.80,
    pdvSugerido: 44.90,
    ncm: '3924.90.00',
    eanBarcode: '7891000100097',
    supplierId: 'sup_1',
    nomeFornecedor: 'Brasil Plásticos',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_10',
    codigo: 'PRD-010',
    descricao: 'Porta Retrato Luxo Dourado 15x20 com Vidro',
    categoria: 'Decoração & Presentes',
    fotoUrl: 'https://images.unsplash.com/photo-1582582494705-f8ce0b0c24f0?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 30,
    precoUnitarioPadrao: 8.90,
    pdvSugerido: 24.90,
    ncm: '8306.30.00',
    eanBarcode: '7891000100103',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  // --- 20 NOVOS PRODUTOS CADASTRADOS (PRD-011 a PRD-030) ---
  // --- 1 PRODUTO DISPONÍVEL EM 3 FORNECEDORES DIFERENTES COM VALORES DISTINTOS: Mop Giratório ---
  {
    id: 'prod_11',
    codigo: 'PRD-011',
    descricao: 'Mop Giratório 360° Pro com Balde Inox e 2 Refis Microfibra',
    categoria: 'Limpeza & Utilidades',
    fotoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 6,
    precoUnitarioPadrao: 34.50,
    pdvSugerido: 79.90,
    ncm: '9603.90.00',
    eanBarcode: '7891000100110',
    supplierId: 'sup_1',
    nomeFornecedor: 'Brasil Plásticos',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_12',
    codigo: 'PRD-012',
    descricao: 'Mop Giratório 360° Pro com Balde Inox e 2 Refis Microfibra',
    categoria: 'Limpeza & Utilidades',
    fotoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 6,
    precoUnitarioPadrao: 38.90,
    pdvSugerido: 84.90,
    ncm: '9603.90.00',
    eanBarcode: '7891000100127',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_13',
    codigo: 'PRD-013',
    descricao: 'Mop Giratório 360° Pro com Balde Inox e 2 Refis Microfibra',
    categoria: 'Limpeza & Utilidades',
    fotoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 8,
    precoUnitarioPadrao: 31.80,
    pdvSugerido: 74.90,
    ncm: '9603.90.00',
    eanBarcode: '7891000100134',
    supplierId: 'sup_3',
    nomeFornecedor: 'Alumínios União',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_14',
    codigo: 'PRD-014',
    descricao: 'Conjunto 3 Travessas Refratárias Retangulares em Vidro Opalino',
    categoria: 'Mesa Posta & Cozinha',
    fotoUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 4,
    precoUnitarioPadrao: 42.00,
    pdvSugerido: 98.00,
    ncm: '7013.49.00',
    eanBarcode: '7891000100141',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_15',
    codigo: 'PRD-015',
    descricao: 'Kit 6 Copos de Vidro Alto Diamond 350ml Transparente',
    categoria: 'Vidros & Cristais',
    fotoUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 12,
    precoUnitarioPadrao: 16.50,
    pdvSugerido: 39.90,
    ncm: '7013.37.00',
    eanBarcode: '7891000100158',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_16',
    codigo: 'PRD-016',
    descricao: 'Panela de Pressão Alumínio Polido 4,5L Fechamento Externo',
    categoria: 'Panelas & Cozinha',
    fotoUrl: 'https://images.unsplash.com/photo-1584990347449-399a9a3b6fcf?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 6,
    precoUnitarioPadrao: 58.00,
    pdvSugerido: 139.90,
    ncm: '7615.10.00',
    eanBarcode: '7891000100165',
    supplierId: 'sup_3',
    nomeFornecedor: 'Alumínios União',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_17',
    codigo: 'PRD-017',
    descricao: 'Dispenser Automático de Sabonete Líquido com Sensor Infravermelho',
    categoria: 'Banheiro & Higiene',
    fotoUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 20,
    precoUnitarioPadrao: 21.90,
    pdvSugerido: 54.90,
    ncm: '8509.80.90',
    eanBarcode: '7891000100172',
    supplierId: 'sup_1',
    nomeFornecedor: 'Brasil Plásticos',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_18',
    codigo: 'PRD-018',
    descricao: 'Escorredor de Louças 2 Andares Inox Black com Porta Copos e Talheres',
    categoria: 'Organizadores',
    fotoUrl: 'https://images.unsplash.com/photo-1583778176476-4a8b02a64c01?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 6,
    precoUnitarioPadrao: 46.50,
    pdvSugerido: 119.90,
    ncm: '7323.93.00',
    eanBarcode: '7891000100189',
    supplierId: 'sup_3',
    nomeFornecedor: 'Alumínios União',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_19',
    codigo: 'PRD-019',
    descricao: 'Kit 5 Cabides Veludo Slim Antideslizante Bege',
    categoria: 'Organizadores',
    fotoUrl: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 30,
    precoUnitarioPadrao: 9.80,
    pdvSugerido: 24.90,
    ncm: '3924.90.00',
    eanBarcode: '7891000100196',
    supplierId: 'sup_1',
    nomeFornecedor: 'Brasil Plásticos',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_20',
    codigo: 'PRD-020',
    descricao: 'Bandeja Espelhada Retangular Borda Dourada 30x20cm para Lavabo',
    categoria: 'Decoração & Presentes',
    fotoUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 10,
    precoUnitarioPadrao: 26.00,
    pdvSugerido: 69.90,
    ncm: '7009.92.00',
    eanBarcode: '7891000100202',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_21',
    codigo: 'PRD-021',
    descricao: 'Jogo de Assadeiras Antiaderente 3 Peças Redonda, Retangular e Torta',
    categoria: 'Panelas & Cozinha',
    fotoUrl: 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 8,
    precoUnitarioPadrao: 39.50,
    pdvSugerido: 89.90,
    ncm: '7615.10.00',
    eanBarcode: '7891000100219',
    supplierId: 'sup_3',
    nomeFornecedor: 'Alumínios União',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_22',
    codigo: 'PRD-022',
    descricao: 'Garrafa Térmica Infantil com Canudo Silicone e Alça 500ml',
    categoria: 'Utilidades Térmicas',
    fotoUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 16,
    precoUnitarioPadrao: 17.20,
    pdvSugerido: 44.90,
    ncm: '9617.00.10',
    eanBarcode: '7891000100226',
    supplierId: 'sup_1',
    nomeFornecedor: 'Brasil Plásticos',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_23',
    codigo: 'PRD-023',
    descricao: 'Vaso Cerâmica Canelado Nórdico Matte 22cm Off-White',
    categoria: 'Decoração & Presentes',
    fotoUrl: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 12,
    precoUnitarioPadrao: 19.80,
    pdvSugerido: 49.90,
    ncm: '6913.90.00',
    eanBarcode: '7891000100233',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_24',
    codigo: 'PRD-024',
    descricao: 'Caixa Organizadora Plástica Transparente com Trava e Rodízios 45L',
    categoria: 'Organizadores',
    fotoUrl: 'https://images.unsplash.com/photo-1584990347449-399a9a3b6fcf?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 8,
    precoUnitarioPadrao: 29.90,
    pdvSugerido: 69.90,
    ncm: '3923.10.90',
    eanBarcode: '7891000100240',
    supplierId: 'sup_1',
    nomeFornecedor: 'Brasil Plásticos',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_25',
    codigo: 'PRD-025',
    descricao: 'Faqueiro Aço Inox 24 Peças com Estojo Gaveta Laguna',
    categoria: 'Cutelaria',
    fotoUrl: 'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 6,
    precoUnitarioPadrao: 54.00,
    pdvSugerido: 129.90,
    ncm: '8211.91.00',
    eanBarcode: '7891000100257',
    supplierId: 'sup_3',
    nomeFornecedor: 'Alumínios União',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_26',
    codigo: 'PRD-026',
    descricao: 'Kit 3 Mini Bowls de Cerâmica com Base de Bambu para Petiscos',
    categoria: 'Mesa Posta',
    fotoUrl: 'https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 12,
    precoUnitarioPadrao: 23.50,
    pdvSugerido: 59.90,
    ncm: '6912.00.00',
    eanBarcode: '7891000100264',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_27',
    codigo: 'PRD-027',
    descricao: 'Bule Térmico Wave 1L com Ampola de Vidro e Cabo Madeira',
    categoria: 'Utilidades Térmicas',
    fotoUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 10,
    precoUnitarioPadrao: 27.80,
    pdvSugerido: 64.90,
    ncm: '9617.00.10',
    eanBarcode: '7891000100271',
    supplierId: 'sup_1',
    nomeFornecedor: 'Brasil Plásticos',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_28',
    codigo: 'PRD-028',
    descricao: 'Cuscuzeira Individual Alumínio Polido com Tampa de Vidro',
    categoria: 'Panelas & Cozinha',
    fotoUrl: 'https://images.unsplash.com/photo-1584990347449-399a9a3b6fcf?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 12,
    precoUnitarioPadrao: 18.90,
    pdvSugerido: 42.90,
    ncm: '7615.10.00',
    eanBarcode: '7891000100288',
    supplierId: 'sup_3',
    nomeFornecedor: 'Alumínios União',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_29',
    codigo: 'PRD-029',
    descricao: 'Relógio de Parede Silencioso Minimalista Scandinavian 30cm',
    categoria: 'Decoração & Presentes',
    fotoUrl: 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 15,
    precoUnitarioPadrao: 22.00,
    pdvSugerido: 54.90,
    ncm: '9105.21.00',
    eanBarcode: '7891000100295',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_30',
    codigo: 'PRD-030',
    descricao: 'Conjunto 4 Potes Herméticos Quadrados Empilháveis Slim',
    categoria: 'Organizadores',
    fotoUrl: 'https://images.unsplash.com/photo-1584990347449-399a9a3b6fcf?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 10,
    precoUnitarioPadrao: 25.40,
    pdvSugerido: 62.90,
    ncm: '3924.90.00',
    eanBarcode: '7891000100301',
    supplierId: 'sup_1',
    nomeFornecedor: 'Brasil Plásticos',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export const INITIAL_SUPPLIERS: Supplier[] = [
  {
    id: 'sup_1',
    razaoSocial: 'Plásticos & Utilidades do Brasil Ltda',
    nomeFantasia: 'Brasil Plásticos',
    cnpj: '12.345.678/0001-90',
    vendedorPadrao: 'Carlos Andrade',
    contatoVendedor: '(42) 99988-7766',
    condicaoPagamentoPadrao: '30/60/90 Dias',
    aliquotaStPadrao: 0,
    aliquotaIpiPadrao: 0,
    descontoOffPadrao: 5.0,
    observacoesDescarga: 'Entregar com paletização padrão no Depósito Central.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sup_2',
    razaoSocial: 'Distribuidora Paranaense de Bazar S/A',
    nomeFantasia: 'Paraná Bazar',
    cnpj: '98.765.432/0001-10',
    vendedorPadrao: 'Mariana Souza',
    contatoVendedor: '(41) 98877-6655',
    condicaoPagamentoPadrao: '28/56 Dias',
    aliquotaStPadrao: 7.5,
    aliquotaIpiPadrao: 2.0,
    descontoOffPadrao: 3.0,
    observacoesDescarga: 'Descarga das 08h às 16h no Depósito.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sup_3',
    razaoSocial: 'Indústria Metalúrgica Alumínios União Ltda',
    nomeFantasia: 'Alumínios União',
    cnpj: '45.678.901/0001-23',
    vendedorPadrao: 'Roberto Lima',
    contatoVendedor: '(44) 99112-3344',
    condicaoPagamentoPadrao: 'À Vista (TED)',
    aliquotaStPadrao: 12.0,
    aliquotaIpiPadrao: 5.0,
    descontoOffPadrao: 8.0,
    observacoesDescarga: 'Paletes padrão PBR. Agendar entrega com 24h de antecedência.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

/**
 * Gera o próximo número sequencial do pedido no formato PED-0001, PED-0002...
 */
export function getNextOrderNumber(): string {
  try {
    const savedOrders = loadSavedOrdersList();
    let maxNum = 0;
    
    savedOrders.forEach(o => {
      const match = o.header.numeroPedido?.match(/PED-(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });

    const storedSeq = localStorage.getItem(STORAGE_KEYS.ORDER_SEQUENCE);
    const seqNum = storedSeq ? parseInt(storedSeq, 10) : 0;
    const nextNum = Math.max(maxNum, seqNum) + 1;
    
    localStorage.setItem(STORAGE_KEYS.ORDER_SEQUENCE, nextNum.toString());
    return `PED-${String(nextNum).padStart(4, '0')}`;
  } catch {
    return 'PED-0001';
  }
}

export function getSuppliersList(): Supplier[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  } catch {
    return INITIAL_SUPPLIERS;
  }
}

export function saveSuppliersList(suppliers: Supplier[]): void {
  localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
}

export function saveSupplier(supplier: Supplier): Supplier[] {
  const list = getSuppliersList();
  const index = list.findIndex(s => s.id === supplier.id);
  let updatedList: Supplier[];
  
  if (index >= 0) {
    updatedList = [...list];
    updatedList[index] = { ...supplier, updatedAt: new Date().toISOString() };
  } else {
    updatedList = [
      {
        ...supplier,
        id: supplier.id || 'sup_' + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      ...list
    ];
  }
  saveSuppliersList(updatedList);
  return updatedList;
}

export function deleteSupplier(supplierId: string): Supplier[] {
  const list = getSuppliersList().filter(s => s.id !== supplierId);
  saveSuppliersList(list);
  return list;
}

export function getProductsList(): Product[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    if (!saved) return INITIAL_PRODUCTS;
    const parsed: Product[] = JSON.parse(saved);
    const existingIds = new Set(parsed.map(p => p.id));
    const missing = INITIAL_PRODUCTS.filter(p => !existingIds.has(p.id));
    if (missing.length > 0) {
      const merged = [...parsed, ...missing];
      saveProductsList(merged);
      return merged;
    }
    return parsed;
  } catch {
    return INITIAL_PRODUCTS;
  }
}

export function saveProductsList(products: Product[]): void {
  localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
}

export function saveProduct(product: Product): Product[] {
  const list = getProductsList();
  const index = list.findIndex(p => p.id === product.id);
  let updatedList: Product[];

  if (index >= 0) {
    updatedList = [...list];
    updatedList[index] = { ...product, updatedAt: new Date().toISOString() };
  } else {
    updatedList = [
      {
        ...product,
        id: product.id || 'prod_' + Date.now(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      ...list
    ];
  }
  saveProductsList(updatedList);
  return updatedList;
}

export function deleteProduct(productId: string): Product[] {
  const list = getProductsList().filter(p => p.id !== productId);
  saveProductsList(list);
  return list;
}

export function getInitialFiscalConfig(): FiscalConfig {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.GLOBAL_FISCAL);
    return saved ? JSON.parse(saved) : DEFAULT_FISCAL_CONFIG;
  } catch {
    return DEFAULT_FISCAL_CONFIG;
  }
}

export function saveFiscalConfig(config: FiscalConfig): void {
  localStorage.setItem(STORAGE_KEYS.GLOBAL_FISCAL, JSON.stringify(config));
}

export function getInitialStoresConfig(): StoreConfig[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.GLOBAL_STORES);
    return saved ? JSON.parse(saved) : DEFAULT_STORES;
  } catch {
    return DEFAULT_STORES;
  }
}

export function saveStoresConfig(stores: StoreConfig[]): void {
  localStorage.setItem(STORAGE_KEYS.GLOBAL_STORES, JSON.stringify(stores));
}

export function createNewOrder(
  fiscalConfig: FiscalConfig, 
  storeConfigs: StoreConfig[], 
  supplierOrNumber?: Supplier | string,
  customOrderNumber?: string
): PurchaseOrder {
  const today = new Date().toISOString().split('T')[0];
  const deliveryDate = new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0];

  const targetSupplier = (typeof supplierOrNumber === 'object' && supplierOrNumber) ? supplierOrNumber : null;
  const orderNum = typeof supplierOrNumber === 'string' ? supplierOrNumber : (customOrderNumber || getNextOrderNumber());

  return {
    header: {
      id: 'order_' + Date.now(),
      numeroPedido: orderNum,
      fornecedor: targetSupplier ? targetSupplier.razaoSocial : '',
      supplierId: targetSupplier ? targetSupplier.id : '',
      aliquotaSt: targetSupplier?.aliquotaStPadrao || 0,
      vendedor: targetSupplier?.vendedorPadrao || '',
      contatoVendedor: targetSupplier?.contatoVendedor || '',
      condicaoPagamento: targetSupplier?.condicaoPagamentoPadrao || '30/60/90 Dias',
      dataPedido: today,
      dataEntregaPrevista: deliveryDate,
      percentualDescontoOff: targetSupplier?.descontoOffPadrao || 0,
      percentualNota: targetSupplier?.percentualNotaPadrao ?? 100,
      observacoesDescarga: targetSupplier?.observacoesDescarga || 'Entregar com paletização padrão no Depósito Central.',
      valorFreteGlobal: 0,
      valorOutrasDespesasGlobal: 0,
      status: 'Em Cotação',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    items: [],
    fiscalConfig,
    storeConfigs
  };
}

export function loadCurrentOrder(): PurchaseOrder | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_ORDER);
    if (!saved) return null;
    const ord = JSON.parse(saved);
    if (ord.header?.status === 'Finalizado') return null;
    return ord;
  } catch {
    return null;
  }
}

export function saveCurrentOrder(order: PurchaseOrder): void {
  // Não salva pedidos finalizados como rascunho ativo
  if (order.header?.status === 'Finalizado') {
    localStorage.removeItem(STORAGE_KEYS.CURRENT_ORDER);
    return;
  }
  localStorage.setItem(STORAGE_KEYS.CURRENT_ORDER, JSON.stringify(order));
}

export function clearCurrentDraft(): void {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_ORDER);
}

export function createRealisticMockOrder(fiscalConfig: FiscalConfig, storeConfigs: StoreConfig[]): PurchaseOrder {
  const mockProducts = [
    { codigo: 'PRE-001', descricao: 'Caneca Cerâmica Decorada com Frases 350ml', pct: 12, cx: 80, preco: 6.20, pdv: 16.90 },
    { codigo: 'PRE-002', descricao: 'Difusor e Aromatizador de Ambientes Lavanda 250ml', pct: 6, cx: 120, preco: 14.50, pdv: 34.90 },
    { codigo: 'PRE-003', descricao: 'Porta-Retrato Vidro e Dourado 15x20cm', pct: 24, cx: 50, preco: 7.80, pdv: 19.90 },
    { codigo: 'PRE-004', descricao: 'Vela Aromática Copo de Vidro Baunilha 180g', pct: 12, cx: 90, preco: 9.50, pdv: 24.90 },
    { codigo: 'PRE-005', descricao: 'Luminária de Mesa LED Articulada USB', pct: 8, cx: 65, preco: 24.00, pdv: 59.90 },
    { codigo: 'PRE-006', descricao: 'Caixa Organizadora Cartonada Decorativa P/M/G', pct: 4, cx: 150, preco: 18.20, pdv: 44.90 },
    { codigo: 'PRE-007', descricao: 'Garrafa Squeeze Inox Degradê 750ml', pct: 12, cx: 70, preco: 16.80, pdv: 39.90 },
    { codigo: 'PRE-008', descricao: 'Jogo de Xícaras de Café Cristal Coração 6un', pct: 6, cx: 85, preco: 28.50, pdv: 69.90 },
    { codigo: 'PRE-009', descricao: 'Espelho de Mesa com LED Touch e Base Porta-Jóias', pct: 6, cx: 60, preco: 32.00, pdv: 79.90 },
    { codigo: 'PRE-010', descricao: 'Mini Vaso Cachepot Cerâmica com Suculenta', pct: 24, cx: 100, preco: 3.90, pdv: 9.90 },
    { codigo: 'PRE-011', descricao: 'Almofada Decorativa Veludo com Enchimento 45x45cm', pct: 10, cx: 75, preco: 15.50, pdv: 38.90 },
    { codigo: 'PRE-012', descricao: 'Relógio de Parede Moderno Minimalista 30cm', pct: 12, cx: 45, preco: 21.00, pdv: 49.90 },
    { codigo: 'PRE-013', descricao: 'Copo Térmico com Tampa e Abridor 473ml', pct: 12, cx: 110, preco: 19.50, pdv: 49.90 },
    { codigo: 'PRE-014', descricao: 'Kit Canetas Fineliner Tons Pastel 12 Cores', pct: 24, cx: 55, preco: 8.90, pdv: 22.90 },
    { codigo: 'PRE-015', descricao: 'Garrafa Térmica Nórdica Cabo Madeira 1L', pct: 6, cx: 80, preco: 34.00, pdv: 79.90 },
    { codigo: 'PRE-016', descricao: 'Bandeja Espelhada Retangular Decorativa Lavabo', pct: 6, cx: 50, preco: 26.50, pdv: 64.90 },
    { codigo: 'PRE-017', descricao: 'Bloco de Anotações Planner Semanal Wire-o', pct: 20, cx: 40, preco: 7.20, pdv: 18.90 },
    { codigo: 'PRE-018', descricao: 'Peseira Manta de Sofá Algodão Trabalhado', pct: 4, cx: 60, preco: 38.00, pdv: 89.90 },
    { codigo: 'PRE-019', descricao: 'Conjunto Taças de Vinho Cristal Borda Dourada 6un', pct: 4, cx: 95, preco: 45.00, pdv: 109.90 },
    { codigo: 'PRE-020', descricao: 'Aromatizador Umidificador Ultrassônico de Mesa', pct: 6, cx: 70, preco: 42.00, pdv: 99.90 }
  ];

  const items = mockProducts.map((p, idx) => {
    const qtdTotalUnidades = p.pct * p.cx;
    const valorTotalBruto = qtdTotalUnidades * p.preco;
    const fiscal = calculateItemFiscal(p.preco, p.pdv, fiscalConfig);
    const separation = calculateAutomaticSeparation(qtdTotalUnidades, storeConfigs);

    return {
      id: `item_mock_${idx + 1}`,
      codigo: p.codigo,
      descricao: p.descricao,
      qtdPorPacote: p.pct,
      qtdPacotes: p.cx,
      qtdTotalUnidades,
      precoUnitario: p.preco,
      valorTotalBruto,
      pdvAlvo: p.pdv,
      despesasPdvUnit: fiscal.despesasPdvUnit,
      creditoIcmsUnit: fiscal.creditoIcmsUnit,
      custoRealEfetivo: fiscal.custoRealEfetivo,
      margemRealUnit: fiscal.margemRealUnit,
      margemPercentual: fiscal.margemPercentual,
      separacaoLojas: separation.allocations,
      qtdReservaEstoque: separation.reserveStock,
      separacaoManual: false
    };
  });

  const today = new Date().toISOString().split('T')[0];
  const deliveryDate = new Date(Date.now() + 12 * 86400000).toISOString().split('T')[0];
  const sup = INITIAL_SUPPLIERS[1] || INITIAL_SUPPLIERS[0]; // Distribuidora Paranaense de Bazar / Presentes

  return {
    header: {
      id: 'order_mock_test_' + Date.now(),
      numeroPedido: 'PED-0042',
      fornecedor: sup.razaoSocial,
      supplierId: sup.id,
      aliquotaSt: sup.aliquotaStPadrao || 0,
      vendedor: sup.vendedorPadrao || 'Mariana Souza',
      contatoVendedor: sup.contatoVendedor || '(41) 98877-6655',
      condicaoPagamento: sup.condicaoPagamentoPadrao || '28/56 Dias',
      dataPedido: today,
      dataEntregaPrevista: deliveryDate,
      percentualDescontoOff: sup.descontoOffPadrao || 3.0,
      observacoesDescarga: 'Entregar com paletização padrão PBR no Depósito Central.',
      valorFreteGlobal: 0,
      valorOutrasDespesasGlobal: 0,
      status: 'Aprovado',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    items,
    fiscalConfig,
    storeConfigs
  };
}

export function loadSavedOrdersList(): PurchaseOrder[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SAVED_ORDERS);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function saveOrderToHistory(order: PurchaseOrder): void {
  const list = loadSavedOrdersList();
  const index = list.findIndex(o => o.header.id === order.header.id);
  const updatedOrder = { ...order, header: { ...order.header, updatedAt: new Date().toISOString() } };
  
  if (index >= 0) {
    list[index] = updatedOrder;
  } else {
    list.unshift(updatedOrder);
  }
  localStorage.setItem(STORAGE_KEYS.SAVED_ORDERS, JSON.stringify(list));
}
