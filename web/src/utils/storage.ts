import { PurchaseOrder, FiscalConfig, StoreConfig, Supplier, Product, CentralStockItem, OrderItem } from '../shared/types';
import { DEFAULT_FISCAL_CONFIG, DEFAULT_STORES } from '../shared/constants';
import { calculateItemFiscal } from '../shared/fiscalEngine';
import { calculateAutomaticSeparation } from '../shared/separationEngine';

const STORAGE_KEYS = {
  CURRENT_ORDER: 'mega12_current_order_v1',
  SAVED_ORDERS: 'mega12_saved_orders_v1',
  GLOBAL_FISCAL: 'mega12_global_fiscal_v1',
  GLOBAL_STORES: 'mega12_global_stores_v1',
  SUPPLIERS: 'mega12_suppliers_v1',
  PRODUCTS: 'mega12_products_v1',
  CENTRAL_STOCK: 'mega12_central_stock_v1',
  ORDER_SEQUENCE: 'mega12_order_sequence_v1',
  THEME: 'mega12_theme_v1'
};

export const INITIAL_PRODUCTS: Product[] = [
  {
    id: 'prod_pre_1',
    codigoInterno: 'PRE-001',
    codigoFornecedor: 'PAR-101',
    codigoBarras: '7892000100012',
    codigo: 'PRE-001',
    eanBarcode: '7892000100012',
    descricao: 'Caneca Cerâmica Decorada com Frases 350ml',
    categoria: 'Presentes & Decoração',
    fotoUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 12,
    precoUnitarioPadrao: 4.20,
    pdvSugerido: 12.00,
    ncm: '6912.00.00',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_pre_2',
    codigoInterno: 'PRE-002',
    codigoFornecedor: 'PAR-102',
    codigoBarras: '7892000100029',
    codigo: 'PRE-002',
    eanBarcode: '7892000100029',
    descricao: 'Difusor e Aromatizador de Ambientes Lavanda 250ml',
    categoria: 'Bem-Estar & Casa',
    fotoUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 6,
    precoUnitarioPadrao: 4.80,
    pdvSugerido: 12.00,
    ncm: '3307.49.00',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_pre_3',
    codigoInterno: 'PRE-003',
    codigoFornecedor: 'PAR-103',
    codigoBarras: '7892000100036',
    codigo: 'PRE-003',
    eanBarcode: '7892000100036',
    descricao: 'Porta-Retrato Vidro e Dourado 15x20cm',
    categoria: 'Presentes & Decoração',
    fotoUrl: 'https://images.unsplash.com/photo-1582582494705-f8ce0b0c24f0?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 24,
    precoUnitarioPadrao: 3.80,
    pdvSugerido: 12.00,
    ncm: '8306.30.00',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_pre_4',
    codigoInterno: 'PRE-004',
    codigoFornecedor: 'PAR-104',
    codigoBarras: '7892000100043',
    codigo: 'PRE-004',
    eanBarcode: '7892000100043',
    descricao: 'Vela Aromática Copo de Vidro Baunilha 180g',
    categoria: 'Bem-Estar & Casa',
    fotoUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 12,
    precoUnitarioPadrao: 4.50,
    pdvSugerido: 12.00,
    ncm: '3406.00.00',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_pre_5',
    codigoInterno: 'PRE-005',
    codigoFornecedor: 'PAR-105',
    codigoBarras: '7892000100050',
    codigo: 'PRE-005',
    eanBarcode: '7892000100050',
    descricao: 'Luminária de Mesa LED Articulada USB',
    categoria: 'Presentes & Decoração',
    fotoUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 8,
    precoUnitarioPadrao: 5.20,
    pdvSugerido: 12.00,
    ncm: '9405.20.00',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_pre_6',
    codigoInterno: 'PRE-006',
    codigoFornecedor: 'PAR-106',
    codigoBarras: '7892000100067',
    codigo: 'PRE-006',
    eanBarcode: '7892000100067',
    descricao: 'Caixa Organizadora Cartonada Decorativa P/M/G',
    categoria: 'Organizadores',
    fotoUrl: 'https://images.unsplash.com/photo-1584990347449-399a9a3b6fcf?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 4,
    precoUnitarioPadrao: 4.80,
    pdvSugerido: 12.00,
    ncm: '4819.10.00',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_pre_7',
    codigoInterno: 'PRE-007',
    codigoFornecedor: 'PAR-107',
    codigoBarras: '7892000100074',
    codigo: 'PRE-007',
    eanBarcode: '7892000100074',
    descricao: 'Garrafa Squeeze Inox Degradê 750ml',
    categoria: 'Presentes & Decoração',
    fotoUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 12,
    precoUnitarioPadrao: 5.10,
    pdvSugerido: 12.00,
    ncm: '7323.93.00',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_pre_8',
    codigoInterno: 'PRE-008',
    codigoFornecedor: 'PAR-108',
    codigoBarras: '7892000100081',
    codigo: 'PRE-008',
    eanBarcode: '7892000100081',
    descricao: 'Jogo de Xícaras de Café Cristal Coração 6un',
    categoria: 'Mesa Posta',
    fotoUrl: 'https://images.unsplash.com/photo-1574053415387-a25475d4088d?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 6,
    precoUnitarioPadrao: 5.50,
    pdvSugerido: 12.00,
    ncm: '7013.37.00',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_pre_9',
    codigoInterno: 'PRE-009',
    codigoFornecedor: 'PAR-109',
    codigoBarras: '7892000100098',
    codigo: 'PRE-009',
    eanBarcode: '7892000100098',
    descricao: 'Espelho de Mesa com LED Touch e Base Porta-Jóias',
    categoria: 'Presentes & Decoração',
    fotoUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 6,
    precoUnitarioPadrao: 5.40,
    pdvSugerido: 12.00,
    ncm: '7009.92.00',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_pre_10',
    codigoInterno: 'PRE-010',
    codigoFornecedor: 'PAR-110',
    codigoBarras: '7892000100104',
    codigo: 'PRE-010',
    eanBarcode: '7892000100104',
    descricao: 'Mini Vaso Cachepot Cerâmica com Suculenta',
    categoria: 'Presentes & Decoração',
    fotoUrl: 'https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 24,
    precoUnitarioPadrao: 3.50,
    pdvSugerido: 12.00,
    ncm: '6912.00.00',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_pre_11',
    codigoInterno: 'PRE-011',
    codigoFornecedor: 'PAR-111',
    codigoBarras: '7892000100111',
    codigo: 'PRE-011',
    eanBarcode: '7892000100111',
    descricao: 'Almofada Decorativa Veludo com Enchimento 45x45cm',
    categoria: 'Cama, Mesa & Banho',
    fotoUrl: 'https://images.unsplash.com/photo-1584990347449-399a9a3b6fcf?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 10,
    precoUnitarioPadrao: 4.90,
    pdvSugerido: 12.00,
    ncm: '9404.90.00',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_pre_12',
    codigoInterno: 'PRE-012',
    codigoFornecedor: 'PAR-112',
    codigoBarras: '7892000100128',
    codigo: 'PRE-012',
    eanBarcode: '7892000100128',
    descricao: 'Relógio de Parede Moderno Minimalista 30cm',
    categoria: 'Presentes & Decoração',
    fotoUrl: 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 12,
    precoUnitarioPadrao: 4.50,
    pdvSugerido: 12.00,
    ncm: '9105.21.00',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_pre_13',
    codigoInterno: 'PRE-013',
    codigoFornecedor: 'PAR-113',
    codigoBarras: '7892000100135',
    codigo: 'PRE-013',
    eanBarcode: '7892000100135',
    descricao: 'Copo Térmico com Tampa e Abridor 473ml',
    categoria: 'Utilidades Térmicas',
    fotoUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 12,
    precoUnitarioPadrao: 5.20,
    pdvSugerido: 12.00,
    ncm: '9617.00.10',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_pre_14',
    codigoInterno: 'PRE-014',
    codigoFornecedor: 'PAR-114',
    codigoBarras: '7892000100142',
    codigo: 'PRE-014',
    eanBarcode: '7892000100142',
    descricao: 'Kit Canetas Fineliner Tons Pastel 12 Cores',
    categoria: 'Papelaria & Bazar',
    fotoUrl: 'https://images.unsplash.com/photo-1583778176476-4a8b02a64c01?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 24,
    precoUnitarioPadrao: 3.90,
    pdvSugerido: 12.00,
    ncm: '9608.20.00',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_pre_15',
    codigoInterno: 'PRE-015',
    codigoFornecedor: 'PAR-115',
    codigoBarras: '7892000100159',
    codigo: 'PRE-015',
    eanBarcode: '7892000100159',
    descricao: 'Garrafa Térmica Nórdica Cabo Madeira 1L',
    categoria: 'Utilidades Térmicas',
    fotoUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 6,
    precoUnitarioPadrao: 5.80,
    pdvSugerido: 12.00,
    ncm: '9617.00.10',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_pre_16',
    codigoInterno: 'PRE-016',
    codigoFornecedor: 'PAR-116',
    codigoBarras: '7892000100166',
    codigo: 'PRE-016',
    eanBarcode: '7892000100166',
    descricao: 'Bandeja Espelhada Retangular Decorativa Lavabo',
    categoria: 'Presentes & Decoração',
    fotoUrl: 'https://images.unsplash.com/photo-1582582494705-f8ce0b0c24f0?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 6,
    precoUnitarioPadrao: 4.90,
    pdvSugerido: 12.00,
    ncm: '7009.92.00',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_pre_17',
    codigoInterno: 'PRE-017',
    codigoFornecedor: 'PAR-117',
    codigoBarras: '7892000100173',
    codigo: 'PRE-017',
    eanBarcode: '7892000100173',
    descricao: 'Bloco de Anotações Planner Semanal Wire-o',
    categoria: 'Papelaria & Bazar',
    fotoUrl: 'https://images.unsplash.com/photo-1583778176476-4a8b02a64c01?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 20,
    precoUnitarioPadrao: 3.20,
    pdvSugerido: 12.00,
    ncm: '4820.10.00',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_pre_18',
    codigoInterno: 'PRE-018',
    codigoFornecedor: 'PAR-118',
    codigoBarras: '7892000100180',
    codigo: 'PRE-018',
    eanBarcode: '7892000100180',
    descricao: 'Peseira Manta de Sofá Algodão Trabalhado',
    categoria: 'Cama, Mesa & Banho',
    fotoUrl: 'https://images.unsplash.com/photo-1584990347449-399a9a3b6fcf?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 4,
    precoUnitarioPadrao: 5.60,
    pdvSugerido: 12.00,
    ncm: '6301.30.00',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_pre_19',
    codigoInterno: 'PRE-019',
    codigoFornecedor: 'PAR-119',
    codigoBarras: '7892000100197',
    codigo: 'PRE-019',
    eanBarcode: '7892000100197',
    descricao: 'Conjunto Taças de Vinho Cristal Borda Dourada 6un',
    categoria: 'Vidros & Cristais',
    fotoUrl: 'https://images.unsplash.com/photo-1574053415387-a25475d4088d?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 4,
    precoUnitarioPadrao: 5.80,
    pdvSugerido: 12.00,
    ncm: '7013.22.00',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_pre_20',
    codigoInterno: 'PRE-020',
    codigoFornecedor: 'PAR-120',
    codigoBarras: '7892000100203',
    codigo: 'PRE-020',
    eanBarcode: '7892000100203',
    descricao: 'Aromatizador Umidificador Ultrassônico de Mesa',
    categoria: 'Bem-Estar & Casa',
    fotoUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 6,
    precoUnitarioPadrao: 5.50,
    pdvSugerido: 12.00,
    ncm: '8509.80.90',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_1',
    codigoInterno: 'PRD-001',
    codigoFornecedor: 'BP-1001',
    codigoBarras: '7891000100011',
    codigo: 'PRD-001',
    eanBarcode: '7891000100011',
    descricao: 'Garrafa Térmica Inox 1L com Termômetro Digital',
    categoria: 'Utilidades Térmicas',
    fotoUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 12,
    precoUnitarioPadrao: 5.50,
    pdvSugerido: 12.00,
    ncm: '9617.00.10',
    supplierId: 'sup_1',
    nomeFornecedor: 'Brasil Plásticos',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_2',
    codigoInterno: 'PRD-002',
    codigoFornecedor: 'PB-2002',
    codigoBarras: '7891000100028',
    codigo: 'PRD-002',
    eanBarcode: '7891000100028',
    descricao: 'Conjunto 6 Taças de Cristal Lapidado 320ml',
    categoria: 'Vidros & Cristais',
    fotoUrl: 'https://images.unsplash.com/photo-1574053415387-a25475d4088d?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 6,
    precoUnitarioPadrao: 5.80,
    pdvSugerido: 12.00,
    ncm: '7013.22.00',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_3',
    codigoInterno: 'PRD-003',
    codigoFornecedor: 'BP-1003',
    codigoBarras: '7891000100035',
    codigo: 'PRD-003',
    eanBarcode: '7891000100035',
    descricao: 'Kit 4 Potes Herméticos de Vidro com Tampa Bambu',
    categoria: 'Organizadores',
    fotoUrl: 'https://images.unsplash.com/photo-1584990347449-399a9a3b6fcf?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 8,
    precoUnitarioPadrao: 4.90,
    pdvSugerido: 12.00,
    ncm: '7013.49.00',
    supplierId: 'sup_1',
    nomeFornecedor: 'Brasil Plásticos',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_4',
    codigoInterno: 'PRD-004',
    codigoFornecedor: 'PB-2004',
    codigoBarras: '7891000100042',
    codigo: 'PRD-004',
    eanBarcode: '7891000100042',
    descricao: 'Luminária Decorativa LED Articulada de Mesa',
    categoria: 'Decoração & Presentes',
    fotoUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 24,
    precoUnitarioPadrao: 4.20,
    pdvSugerido: 12.00,
    ncm: '9405.20.00',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_5',
    codigoInterno: 'PRD-005',
    codigoFornecedor: 'AU-3005',
    codigoBarras: '7891000100059',
    codigo: 'PRD-005',
    eanBarcode: '7891000100059',
    descricao: 'Frigideira Antiaderente Cerâmica 24cm Granito',
    categoria: 'Panelas & Cozinha',
    fotoUrl: 'https://images.unsplash.com/photo-1583778176476-4a8b02a64c01?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 10,
    precoUnitarioPadrao: 5.20,
    pdvSugerido: 12.00,
    ncm: '7615.10.00',
    supplierId: 'sup_3',
    nomeFornecedor: 'Alumínios União',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_6',
    codigoInterno: 'PRD-006',
    codigoFornecedor: 'PB-2006',
    codigoBarras: '7891000100066',
    codigo: 'PRD-006',
    eanBarcode: '7891000100066',
    descricao: 'Aparelho de Jantar 16 Peças Cerâmica Nórdica',
    categoria: 'Mesa Posta',
    fotoUrl: 'https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 4,
    precoUnitarioPadrao: 5.90,
    pdvSugerido: 12.00,
    ncm: '6912.00.00',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_7',
    codigoInterno: 'PRD-007',
    codigoFornecedor: 'AU-3007',
    codigoBarras: '7891000100073',
    codigo: 'PRD-007',
    eanBarcode: '7891000100073',
    descricao: 'Jogo 6 Facas Cozinha Inox com Cepo de Madeira',
    categoria: 'Cutelaria',
    fotoUrl: 'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 12,
    precoUnitarioPadrao: 4.80,
    pdvSugerido: 12.00,
    ncm: '8211.91.00',
    supplierId: 'sup_3',
    nomeFornecedor: 'Alumínios União',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_8',
    codigoInterno: 'PRD-008',
    codigoFornecedor: 'BP-1008',
    codigoBarras: '7891000100080',
    codigo: 'PRD-008',
    eanBarcode: '7891000100080',
    descricao: 'Difusor de Aromas Elétrico Ultrassônico 300ml',
    categoria: 'Bem-Estar & Casa',
    fotoUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 20,
    precoUnitarioPadrao: 4.50,
    pdvSugerido: 12.00,
    ncm: '8509.80.90',
    supplierId: 'sup_1',
    nomeFornecedor: 'Brasil Plásticos',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_9',
    codigoInterno: 'PRD-009',
    codigoFornecedor: 'BP-1009',
    codigoBarras: '7891000100097',
    codigo: 'PRD-009',
    eanBarcode: '7891000100097',
    descricao: 'Organizador Giratório Multiuso Acrílico 360°',
    categoria: 'Organizadores',
    fotoUrl: 'https://images.unsplash.com/photo-1584990347449-399a9a3b6fcf?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 15,
    precoUnitarioPadrao: 4.80,
    pdvSugerido: 12.00,
    ncm: '3924.90.00',
    supplierId: 'sup_1',
    nomeFornecedor: 'Brasil Plásticos',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_10',
    codigoInterno: 'PRD-010',
    codigoFornecedor: 'PB-2010',
    codigoBarras: '7891000100103',
    codigo: 'PRD-010',
    eanBarcode: '7891000100103',
    descricao: 'Porta Retrato Luxo Dourado 15x20 com Vidro',
    categoria: 'Decoração & Presentes',
    fotoUrl: 'https://images.unsplash.com/photo-1582582494705-f8ce0b0c24f0?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 30,
    precoUnitarioPadrao: 3.90,
    pdvSugerido: 12.00,
    ncm: '8306.30.00',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_11',
    codigoInterno: 'PRD-011',
    codigoFornecedor: 'BP-MOP01',
    codigoBarras: '7891000100110',
    codigo: 'PRD-011',
    eanBarcode: '7891000100110',
    descricao: 'Mop Giratório 360° Pro com Balde Inox e 2 Refis Microfibra',
    categoria: 'Limpeza & Utilidades',
    fotoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 6,
    precoUnitarioPadrao: 5.50,
    pdvSugerido: 12.00,
    ncm: '9603.90.00',
    supplierId: 'sup_1',
    nomeFornecedor: 'Brasil Plásticos',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_12',
    codigoInterno: 'PRD-012',
    codigoFornecedor: 'PB-MOP02',
    codigoBarras: '7891000100127',
    codigo: 'PRD-012',
    eanBarcode: '7891000100127',
    descricao: 'Mop Giratório 360° Pro com Balde Inox e 2 Refis Microfibra',
    categoria: 'Limpeza & Utilidades',
    fotoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 6,
    precoUnitarioPadrao: 5.80,
    pdvSugerido: 12.00,
    ncm: '9603.90.00',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_13',
    codigoInterno: 'PRD-013',
    codigoFornecedor: 'AU-MOP03',
    codigoBarras: '7891000100134',
    codigo: 'PRD-013',
    eanBarcode: '7891000100134',
    descricao: 'Mop Giratório 360° Pro com Balde Inox e 2 Refis Microfibra',
    categoria: 'Limpeza & Utilidades',
    fotoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 8,
    precoUnitarioPadrao: 5.20,
    pdvSugerido: 12.00,
    ncm: '9603.90.00',
    supplierId: 'sup_3',
    nomeFornecedor: 'Alumínios União',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_14',
    codigoInterno: 'PRD-014',
    codigoFornecedor: 'PB-2014',
    codigoBarras: '7891000100141',
    codigo: 'PRD-014',
    eanBarcode: '7891000100141',
    descricao: 'Conjunto 3 Travessas Refratárias Retangulares em Vidro Opalino',
    categoria: 'Mesa Posta & Cozinha',
    fotoUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 4,
    precoUnitarioPadrao: 5.00,
    pdvSugerido: 12.00,
    ncm: '7013.49.00',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_15',
    codigoInterno: 'PRD-015',
    codigoFornecedor: 'PB-2015',
    codigoBarras: '7891000100158',
    codigo: 'PRD-015',
    eanBarcode: '7891000100158',
    descricao: 'Kit 6 Copos de Vidro Alto Diamond 350ml Transparente',
    categoria: 'Vidros & Cristais',
    fotoUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 12,
    precoUnitarioPadrao: 4.50,
    pdvSugerido: 12.00,
    ncm: '7013.37.00',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_16',
    codigoInterno: 'PRD-016',
    codigoFornecedor: 'AU-3016',
    codigoBarras: '7891000100165',
    codigo: 'PRD-016',
    eanBarcode: '7891000100165',
    descricao: 'Panela de Pressão Alumínio Polido 4,5L Fechamento Externo',
    categoria: 'Panelas & Cozinha',
    fotoUrl: 'https://images.unsplash.com/photo-1584990347449-399a9a3b6fcf?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 6,
    precoUnitarioPadrao: 5.80,
    pdvSugerido: 12.00,
    ncm: '7615.10.00',
    supplierId: 'sup_3',
    nomeFornecedor: 'Alumínios União',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_17',
    codigoInterno: 'PRD-017',
    codigoFornecedor: 'BP-1017',
    codigoBarras: '7891000100172',
    codigo: 'PRD-017',
    eanBarcode: '7891000100172',
    descricao: 'Dispenser Automático de Sabonete Líquido com Sensor Infravermelho',
    categoria: 'Banheiro & Higiene',
    fotoUrl: 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 20,
    precoUnitarioPadrao: 4.80,
    pdvSugerido: 12.00,
    ncm: '8509.80.90',
    supplierId: 'sup_1',
    nomeFornecedor: 'Brasil Plásticos',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_18',
    codigoInterno: 'PRD-018',
    codigoFornecedor: 'AU-3018',
    codigoBarras: '7891000100189',
    codigo: 'PRD-018',
    eanBarcode: '7891000100189',
    descricao: 'Escorredor de Louças 2 Andares Inox Black com Porta Copos e Talheres',
    categoria: 'Organizadores',
    fotoUrl: 'https://images.unsplash.com/photo-1583778176476-4a8b02a64c01?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 6,
    precoUnitarioPadrao: 4.60,
    pdvSugerido: 12.00,
    ncm: '7323.93.00',
    supplierId: 'sup_3',
    nomeFornecedor: 'Alumínios União',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_19',
    codigoInterno: 'PRD-019',
    codigoFornecedor: 'BP-1019',
    codigoBarras: '7891000100196',
    codigo: 'PRD-019',
    eanBarcode: '7891000100196',
    descricao: 'Kit 5 Cabides Veludo Slim Antideslizante Bege',
    categoria: 'Organizadores',
    fotoUrl: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 30,
    precoUnitarioPadrao: 3.50,
    pdvSugerido: 12.00,
    ncm: '3924.90.00',
    supplierId: 'sup_1',
    nomeFornecedor: 'Brasil Plásticos',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_20',
    codigoInterno: 'PRD-020',
    codigoFornecedor: 'PB-2020',
    codigoBarras: '7891000100202',
    codigo: 'PRD-020',
    eanBarcode: '7891000100202',
    descricao: 'Bandeja Espelhada Retangular Borda Dourada 30x20cm para Lavabo',
    categoria: 'Decoração & Presentes',
    fotoUrl: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 10,
    precoUnitarioPadrao: 4.80,
    pdvSugerido: 12.00,
    ncm: '7009.92.00',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_21',
    codigoInterno: 'PRD-021',
    codigoFornecedor: 'AU-3021',
    codigoBarras: '7891000100219',
    codigo: 'PRD-021',
    eanBarcode: '7891000100219',
    descricao: 'Jogo de Assadeiras Antiaderente 3 Peças Redonda, Retangular e Torta',
    categoria: 'Panelas & Cozinha',
    fotoUrl: 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 8,
    precoUnitarioPadrao: 4.90,
    pdvSugerido: 12.00,
    ncm: '7615.10.00',
    supplierId: 'sup_3',
    nomeFornecedor: 'Alumínios União',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_22',
    codigoInterno: 'PRD-022',
    codigoFornecedor: 'BP-1022',
    codigoBarras: '7891000100226',
    codigo: 'PRD-022',
    eanBarcode: '7891000100226',
    descricao: 'Garrafa Térmica Infantil com Canudo Silicone e Alça 500ml',
    categoria: 'Utilidades Térmicas',
    fotoUrl: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 16,
    precoUnitarioPadrao: 4.20,
    pdvSugerido: 12.00,
    ncm: '9617.00.10',
    supplierId: 'sup_1',
    nomeFornecedor: 'Brasil Plásticos',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_23',
    codigoInterno: 'PRD-023',
    codigoFornecedor: 'PB-2023',
    codigoBarras: '7891000100233',
    codigo: 'PRD-023',
    eanBarcode: '7891000100233',
    descricao: 'Vaso Cerâmica Canelado Nórdico Matte 22cm Off-White',
    categoria: 'Decoração & Presentes',
    fotoUrl: 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 12,
    precoUnitarioPadrao: 4.50,
    pdvSugerido: 12.00,
    ncm: '6913.90.00',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_24',
    codigoInterno: 'PRD-024',
    codigoFornecedor: 'BP-1024',
    codigoBarras: '7891000100240',
    codigo: 'PRD-024',
    eanBarcode: '7891000100240',
    descricao: 'Caixa Organizadora Plástica Transparente com Trava e Rodízios 45L',
    categoria: 'Organizadores',
    fotoUrl: 'https://images.unsplash.com/photo-1584990347449-399a9a3b6fcf?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 8,
    precoUnitarioPadrao: 4.90,
    pdvSugerido: 12.00,
    ncm: '3923.10.90',
    supplierId: 'sup_1',
    nomeFornecedor: 'Brasil Plásticos',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_25',
    codigoInterno: 'PRD-025',
    codigoFornecedor: 'AU-3025',
    codigoBarras: '7891000100257',
    codigo: 'PRD-025',
    eanBarcode: '7891000100257',
    descricao: 'Faqueiro Aço Inox 24 Peças com Estojo Gaveta Laguna',
    categoria: 'Cutelaria',
    fotoUrl: 'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 6,
    precoUnitarioPadrao: 5.40,
    pdvSugerido: 12.00,
    ncm: '8211.91.00',
    supplierId: 'sup_3',
    nomeFornecedor: 'Alumínios União',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_26',
    codigoInterno: 'PRD-026',
    codigoFornecedor: 'PB-2026',
    codigoBarras: '7891000100264',
    codigo: 'PRD-026',
    eanBarcode: '7891000100264',
    descricao: 'Kit 3 Mini Bowls de Cerâmica com Base de Bambu para Petiscos',
    categoria: 'Mesa Posta',
    fotoUrl: 'https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 12,
    precoUnitarioPadrao: 4.60,
    pdvSugerido: 12.00,
    ncm: '6912.00.00',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_27',
    codigoInterno: 'PRD-027',
    codigoFornecedor: 'BP-1027',
    codigoBarras: '7891000100271',
    codigo: 'PRD-027',
    eanBarcode: '7891000100271',
    descricao: 'Bule Térmico Wave 1L com Ampola de Vidro e Cabo Madeira',
    categoria: 'Utilidades Térmicas',
    fotoUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 10,
    precoUnitarioPadrao: 4.80,
    pdvSugerido: 12.00,
    ncm: '9617.00.10',
    supplierId: 'sup_1',
    nomeFornecedor: 'Brasil Plásticos',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_28',
    codigoInterno: 'PRD-028',
    codigoFornecedor: 'AU-3028',
    codigoBarras: '7891000100288',
    codigo: 'PRD-028',
    eanBarcode: '7891000100288',
    descricao: 'Cuscuzeira Individual Alumínio Polido com Tampa de Vidro',
    categoria: 'Panelas & Cozinha',
    fotoUrl: 'https://images.unsplash.com/photo-1584990347449-399a9a3b6fcf?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 12,
    precoUnitarioPadrao: 4.30,
    pdvSugerido: 12.00,
    ncm: '7615.10.00',
    supplierId: 'sup_3',
    nomeFornecedor: 'Alumínios União',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_29',
    codigoInterno: 'PRD-029',
    codigoFornecedor: 'PB-2029',
    codigoBarras: '7891000100295',
    codigo: 'PRD-029',
    eanBarcode: '7891000100295',
    descricao: 'Relógio de Parede Silencioso Minimalista Scandinavian 30cm',
    categoria: 'Decoração & Presentes',
    fotoUrl: 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 15,
    precoUnitarioPadrao: 4.20,
    pdvSugerido: 12.00,
    ncm: '9105.21.00',
    supplierId: 'sup_2',
    nomeFornecedor: 'Paraná Bazar',
    ativo: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: 'prod_30',
    codigoInterno: 'PRD-030',
    codigoFornecedor: 'BP-1030',
    codigoBarras: '7891000100301',
    codigo: 'PRD-030',
    eanBarcode: '7891000100301',
    descricao: 'Conjunto 4 Potes Herméticos Quadrados Empilháveis Slim',
    categoria: 'Organizadores',
    fotoUrl: 'https://images.unsplash.com/photo-1584990347449-399a9a3b6fcf?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 10,
    precoUnitarioPadrao: 4.90,
    pdvSugerido: 12.00,
    ncm: '3924.90.00',
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
    const list: Supplier[] = saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
    return list.map(s => {
      let parsedPadrao = s.pedidoPadrao;
      if (!parsedPadrao && s.pedidoPadraoJson) {
        try {
          parsedPadrao = JSON.parse(s.pedidoPadraoJson);
        } catch {}
      }
      return {
        ...s,
        pedidoPadrao: parsedPadrao
      };
    });
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
  
  const pedidoPadraoJson = supplier.pedidoPadraoJson || (supplier.pedidoPadrao ? JSON.stringify(supplier.pedidoPadrao) : undefined);
  const normalizedSupplier: Supplier = {
    ...supplier,
    pedidoPadraoJson
  };
  
  if (index >= 0) {
    updatedList = [...list];
    updatedList[index] = { ...normalizedSupplier, updatedAt: new Date().toISOString() };
  } else {
    updatedList = [
      {
        ...normalizedSupplier,
        id: normalizedSupplier.id || 'sup_' + Date.now(),
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
    let list: Product[] = saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
    const existingIds = new Set(list.map(p => p.id));
    const missing = INITIAL_PRODUCTS.filter(p => !existingIds.has(p.id));
    if (missing.length > 0) {
      list = [...list, ...missing];
    }
    // Normalizar campos de código e travar PDV Sugerido na regra de negócio da Rede Mega 12 (R$ 12,00 Fixo)
    return list.map(p => {
      const codigoInterno = p.codigoInterno || p.codigo || 'PRD-000';
      const codigoBarras = p.codigoBarras || p.eanBarcode || '';
      return {
        ...p,
        codigoInterno,
        codigo: codigoInterno,
        codigoFornecedor: p.codigoFornecedor || '',
        codigoBarras,
        eanBarcode: codigoBarras,
        pdvSugerido: 12.00
      };
    });
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
  const normalized: Product = {
    ...product,
    codigoInterno: product.codigoInterno || product.codigo || `PRD-${Date.now()}`,
    codigo: product.codigoInterno || product.codigo || `PRD-${Date.now()}`,
    codigoFornecedor: product.codigoFornecedor || '',
    codigoBarras: product.codigoBarras || product.eanBarcode || '',
    eanBarcode: product.codigoBarras || product.eanBarcode || '',
    pdvSugerido: 12.00,
    updatedAt: new Date().toISOString()
  };
  let updatedList: Product[];

  if (index >= 0) {
    updatedList = [...list];
    updatedList[index] = normalized;
  } else {
    updatedList = [
      {
        ...normalized,
        id: product.id || 'prod_' + Date.now(),
        createdAt: new Date().toISOString()
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
    items: [
      {
        id: 'item_' + Date.now(),
        codigo: '',
        codigoInterno: '',
        codigoFornecedor: '',
        descricao: '',
        qtdTotalUnidades: 0,
        precoUnitario: 0,
        valorTotalBruto: 0,
        pdvAlvo: 12.0
      }
    ],
    fiscalConfig,
    storeConfigs
  };
}

export function loadCurrentOrder(): PurchaseOrder | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CURRENT_ORDER);
    if (!saved) return null;
    const ord: PurchaseOrder = JSON.parse(saved);
    if (ord.header?.status === 'Finalizado') return null;
    if (ord.items) {
      ord.items = ord.items.map(it => ({ ...it, pdvAlvo: 12.00 }));
    }
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
  const orderWithFixedPdv = {
    ...order,
    items: (order.items || []).map(it => ({ ...it, pdvAlvo: 12.00 }))
  };
  localStorage.setItem(STORAGE_KEYS.CURRENT_ORDER, JSON.stringify(orderWithFixedPdv));
}

export function clearCurrentDraft(): void {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_ORDER);
}

export function createRealisticMockOrder(
  fiscalConfig: FiscalConfig, 
  storeConfigs: StoreConfig[],
  customOrderNumber?: string
): PurchaseOrder {
  const mockProducts = [
    { codigo: 'PRE-001', descricao: 'Caneca Cerâmica Decorada com Frases 350ml', pct: 12, cx: 80, preco: 4.20, pdv: 12.00 },
    { codigo: 'PRE-002', descricao: 'Difusor e Aromatizador de Ambientes Lavanda 250ml', pct: 6, cx: 120, preco: 4.80, pdv: 12.00 },
    { codigo: 'PRE-003', descricao: 'Porta-Retrato Vidro e Dourado 15x20cm', pct: 24, cx: 50, preco: 3.80, pdv: 12.00 },
    { codigo: 'PRE-004', descricao: 'Vela Aromática Copo de Vidro Baunilha 180g', pct: 12, cx: 90, preco: 4.50, pdv: 12.00 },
    { codigo: 'PRE-005', descricao: 'Luminária de Mesa LED Articulada USB', pct: 8, cx: 65, preco: 5.20, pdv: 12.00 },
    { codigo: 'PRE-006', descricao: 'Caixa Organizadora Cartonada Decorativa P/M/G', pct: 4, cx: 150, preco: 4.80, pdv: 12.00 },
    { codigo: 'PRE-007', descricao: 'Garrafa Squeeze Inox Degradê 750ml', pct: 12, cx: 70, preco: 5.10, pdv: 12.00 },
    { codigo: 'PRE-008', descricao: 'Jogo de Xícaras de Café Cristal Coração 6un', pct: 6, cx: 85, preco: 5.50, pdv: 12.00 },
    { codigo: 'PRE-009', descricao: 'Espelho de Mesa com LED Touch e Base Porta-Jóias', pct: 6, cx: 60, preco: 5.40, pdv: 12.00 },
    { codigo: 'PRE-010', descricao: 'Mini Vaso Cachepot Cerâmica com Suculenta', pct: 24, cx: 100, preco: 3.50, pdv: 12.00 },
    { codigo: 'PRE-011', descricao: 'Almofada Decorativa Veludo com Enchimento 45x45cm', pct: 10, cx: 75, preco: 4.90, pdv: 12.00 },
    { codigo: 'PRE-012', descricao: 'Relógio de Parede Moderno Minimalista 30cm', pct: 12, cx: 45, preco: 4.50, pdv: 12.00 },
    { codigo: 'PRE-013', descricao: 'Copo Térmico com Tampa e Abridor 473ml', pct: 12, cx: 110, preco: 5.20, pdv: 12.00 },
    { codigo: 'PRE-014', descricao: 'Kit Canetas Fineliner Tons Pastel 12 Cores', pct: 24, cx: 55, preco: 3.90, pdv: 12.00 },
    { codigo: 'PRE-015', descricao: 'Caderno Wire-o Capa Dura Holográfico 100 Folhas', pct: 12, cx: 95, preco: 4.60, pdv: 12.00 },
    { codigo: 'PRE-016', descricao: 'Quadro Decorativo Moldura Caixa Alta 20x30cm', pct: 8, cx: 80, preco: 5.00, pdv: 12.00 },
    { codigo: 'PRE-017', descricao: 'Bandeja Espelhada com Alça Metal Ouro Rose', pct: 4, cx: 130, preco: 5.40, pdv: 12.00 },
    { codigo: 'PRE-018', descricao: 'Moringa de Vidro com Copo 800ml Floral', pct: 6, cx: 70, preco: 4.70, pdv: 12.00 },
    { codigo: 'PRE-019', descricao: 'Kit 3 Cestos Organizadores de Corda de Algodão', pct: 4, cx: 140, preco: 5.60, pdv: 12.00 },
    { codigo: 'PRE-020', descricao: 'Lousa Mágica Digital LCD Infantil 8.5 Pol', pct: 12, cx: 160, preco: 4.30, pdv: 12.00 }
  ];

  const allCatalogProducts = getProductsList();

  const items: OrderItem[] = mockProducts.map((p, idx) => {
    const qtdTotalUnidades = p.pct * p.cx;
    const valorTotalBruto = qtdTotalUnidades * p.preco;
    const fiscal = calculateItemFiscal(p.preco, 12.00, fiscalConfig);
    const separation = calculateAutomaticSeparation(qtdTotalUnidades, storeConfigs);
    const matchedProd = allCatalogProducts.find(cp => (cp.codigoInterno || cp.codigo) === p.codigo);

    return {
      id: `item_mock_${idx + 1}_${Date.now()}`,
      codigo: p.codigo,
      codigoInterno: p.codigo,
      codigoFornecedor: matchedProd?.codigoFornecedor || `PAR-1${idx + 1 < 10 ? '0' + (idx + 1) : idx + 1}`,
      descricao: p.descricao,
      fotoUrl: matchedProd?.fotoUrl || '',
      qtdPorPacote: p.pct,
      qtdPacotes: p.cx,
      qtdTotalUnidades,
      precoUnitario: p.preco,
      valorTotalBruto,
      pdvAlvo: 12.00,
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
  const sup = INITIAL_SUPPLIERS[1] || INITIAL_SUPPLIERS[0];
  const finalOrderNumber = customOrderNumber || getNextOrderNumber();

  return {
    header: {
      id: 'ord_' + finalOrderNumber.toLowerCase().replace('-', '_'),
      numeroPedido: finalOrderNumber,
      fornecedor: sup.razaoSocial,
      supplierId: sup.id,
      aliquotaSt: sup.aliquotaStPadrao || 0,
      vendedor: sup.vendedorPadrao || 'Mariana Souza',
      contatoVendedor: sup.contatoVendedor || '(41) 98877-6655',
      condicaoPagamento: sup.condicaoPagamentoPadrao || '28/56 Dias',
      dataPedido: today,
      dataEntregaPrevista: deliveryDate,
      percentualDescontoOff: sup.descontoOffPadrao || 3.0,
      percentualNota: 100,
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

export function saveSavedOrdersList(orders: PurchaseOrder[]): void {
  // Desduplicar estritamente por número de pedido
  const map = new Map<string, PurchaseOrder>();
  orders.forEach(o => {
    if (o?.header?.numeroPedido) {
      map.set(o.header.numeroPedido.trim().toUpperCase(), o);
    }
  });
  const uniqueList = Array.from(map.values());
  localStorage.setItem(STORAGE_KEYS.SAVED_ORDERS, JSON.stringify(uniqueList));
}

export function loadSavedOrdersList(): PurchaseOrder[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.SAVED_ORDERS);
    if (!saved) return [];
    const list: PurchaseOrder[] = JSON.parse(saved);
    
    // Desduplica por numeroPedido garantindo 1 único registro por pedido
    const map = new Map<string, PurchaseOrder>();
    list.forEach(ord => {
      if (ord?.header?.numeroPedido) {
        const num = ord.header.numeroPedido.trim().toUpperCase();
        map.set(num, {
          ...ord,
          items: (ord.items || []).map(it => ({ ...it, pdvAlvo: 12.00 }))
        });
      }
    });

    return Array.from(map.values());
  } catch {
    return [];
  }
}

export function saveOrderToHistory(order: PurchaseOrder): void {
  const list = loadSavedOrdersList();
  const orderNum = order.header.numeroPedido.trim().toUpperCase();
  const index = list.findIndex(o => 
    o.header.id === order.header.id || 
    (o.header.numeroPedido && o.header.numeroPedido.trim().toUpperCase() === orderNum)
  );
  
  const updatedOrder = { 
    ...order, 
    items: (order.items || []).map(it => ({ ...it, pdvAlvo: 12.00 })),
    header: { ...order.header, updatedAt: new Date().toISOString() } 
  };
  
  if (index >= 0) {
    list[index] = updatedOrder;
  } else {
    list.unshift(updatedOrder);
  }
  
  saveSavedOrdersList(list);
}

// ==========================================
// 📦 MÓDULO DE GESTÃO DO DEPÓSITO CENTRAL (CD)
// ==========================================

export const INITIAL_CENTRAL_STOCK: CentralStockItem[] = [
  {
    id: 'stock_1',
    productId: 'prod_1',
    codigo: 'PRD-001',
    descricao: 'Garrafa Térmica Inox 1L com Termômetro Digital',
    categoria: 'Utilidades Térmicas',
    fotoUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 12,
    saldoCaixas: 45,
    saldoUnidades: 45 * 12, // 540 un
    precoUnitario: 5.50,
    pdvSugerido: 12.00,
    localizacaoGalpao: 'Rua A - Palete 04',
    fornecedorOrigem: 'Brasil Plásticos',
    dataUltimaEntrada: '2026-08-15',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'stock_2',
    productId: 'prod_2',
    codigo: 'PRD-002',
    descricao: 'Conjunto 6 Taças de Cristal Lapidado 320ml',
    categoria: 'Vidros & Cristais',
    fotoUrl: 'https://images.unsplash.com/photo-1574053415387-a25475d4088d?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 6,
    saldoCaixas: 30,
    saldoUnidades: 30 * 6, // 180 un
    precoUnitario: 5.80,
    pdvSugerido: 12.00,
    localizacaoGalpao: 'Rua A - Palete 12',
    fornecedorOrigem: 'Paraná Bazar',
    dataUltimaEntrada: '2026-08-18',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'stock_3',
    productId: 'prod_4',
    codigo: 'PRD-004',
    descricao: 'Difusor de Aromas Elétrico Ultrassônico Madeira 300ml',
    categoria: 'Aromaterapia & Casa',
    fotoUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 6,
    saldoCaixas: 25,
    saldoUnidades: 25 * 6, // 150 un
    precoUnitario: 4.50,
    pdvSugerido: 12.00,
    localizacaoGalpao: 'Rua B - Palete 02',
    fornecedorOrigem: 'Paraná Bazar',
    dataUltimaEntrada: '2026-08-10',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'stock_4',
    productId: 'prod_5',
    codigo: 'PRD-005',
    descricao: 'Vela Aromática Premium Pote Vidro Fosco Baunilha & Âmbar 200g',
    categoria: 'Aromaterapia & Casa',
    fotoUrl: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 12,
    saldoCaixas: 60,
    saldoUnidades: 60 * 12, // 720 un
    precoUnitario: 4.20,
    pdvSugerido: 12.00,
    localizacaoGalpao: 'Rua B - Palete 08',
    fornecedorOrigem: 'Paraná Bazar',
    dataUltimaEntrada: '2026-08-20',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'stock_5',
    productId: 'prod_7',
    codigo: 'PRD-007',
    descricao: 'Copo Térmico Parede Dupla Inox com Tampa e Abridor 473ml',
    categoria: 'Utilidades Térmicas',
    fotoUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 12,
    saldoCaixas: 50,
    saldoUnidades: 50 * 12, // 600 un
    precoUnitario: 5.10,
    pdvSugerido: 12.00,
    localizacaoGalpao: 'Rua C - Palete 01',
    fornecedorOrigem: 'Brasil Plásticos',
    dataUltimaEntrada: '2026-08-22',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'stock_6',
    productId: 'prod_8',
    codigo: 'PRD-008',
    descricao: 'Luminária de Mesa Articulada LED Touch com Porta-Canetas',
    categoria: 'Decoração & Iluminação',
    fotoUrl: 'https://images.unsplash.com/photo-1534353436294-0dbd4bdac845?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 8,
    saldoCaixas: 35,
    saldoUnidades: 35 * 8, // 280 un
    precoUnitario: 4.20,
    pdvSugerido: 12.00,
    localizacaoGalpao: 'Rua C - Palete 10',
    fornecedorOrigem: 'Importadora Oriente',
    dataUltimaEntrada: '2026-08-12',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'stock_7',
    productId: 'prod_10',
    codigo: 'PRD-010',
    descricao: 'Organizador Giratório Acrílico Multiuso 360 Graus 28cm',
    categoria: 'Organizadores',
    fotoUrl: 'https://images.unsplash.com/photo-1584990347449-399a9a3b6fcf?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 12,
    saldoCaixas: 40,
    saldoUnidades: 40 * 12, // 480 un
    precoUnitario: 4.80,
    pdvSugerido: 12.00,
    localizacaoGalpao: 'Rua D - Palete 05',
    fornecedorOrigem: 'Brasil Plásticos',
    dataUltimaEntrada: '2026-08-16',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'stock_8',
    productId: 'prod_14',
    codigo: 'PRD-014',
    descricao: 'Conjunto Assadeiras de Alumínio Polido com Grelha 3 Peças',
    categoria: 'Panelas & Assadeiras',
    fotoUrl: 'https://images.unsplash.com/photo-1584990347449-a2927236d654?w=300&auto=format&fit=crop&q=80',
    qtdPorPacote: 6,
    saldoCaixas: 20,
    saldoUnidades: 20 * 6, // 120 un
    precoUnitario: 5.00,
    pdvSugerido: 12.00,
    localizacaoGalpao: 'Rua D - Palete 14',
    fornecedorOrigem: 'Alumínios União',
    dataUltimaEntrada: '2026-08-05',
    updatedAt: new Date().toISOString()
  }
];

export function getInitialCentralStock(): CentralStockItem[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.CENTRAL_STOCK);
    if (saved) {
      const parsed: CentralStockItem[] = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map(s => ({ ...s, pdvSugerido: 12.00 }));
      }
    }
  } catch {}
  localStorage.setItem(STORAGE_KEYS.CENTRAL_STOCK, JSON.stringify(INITIAL_CENTRAL_STOCK));
  return INITIAL_CENTRAL_STOCK;
}

export function loadCentralStock(): CentralStockItem[] {
  return getInitialCentralStock();
}

export function saveCentralStock(stockList: CentralStockItem[]): void {
  localStorage.setItem(STORAGE_KEYS.CENTRAL_STOCK, JSON.stringify(stockList));
}

export function updateStockBalance(stockId: string, deltaCaixas: number, newLocation?: string): CentralStockItem[] {
  const stock = loadCentralStock();
  const index = stock.findIndex(s => s.id === stockId);
  if (index >= 0) {
    const item = stock[index];
    const pack = item.qtdPorPacote || 1;
    const currentUnidades = item.saldoUnidades || 0;
    const newSaldoUnidades = Math.max(0, currentUnidades + (deltaCaixas * pack));
    const newSaldoCaixas = Math.floor(newSaldoUnidades / pack);
    stock[index] = {
      ...item,
      saldoCaixas: newSaldoCaixas,
      saldoUnidades: newSaldoUnidades,
      localizacaoGalpao: newLocation !== undefined ? newLocation : item.localizacaoGalpao,
      updatedAt: new Date().toISOString()
    };
    saveCentralStock(stock);
  }
  return stock;
}

export function createStockTransferOrder(
  selectedItemsWithBoxes: Array<{ stockItem: CentralStockItem; caixasParaSeparar: number }>,
  storeConfigs: StoreConfig[],
  fiscalConfig: FiscalConfig
): PurchaseOrder {
  const nextNum = 'CD-' + String(Date.now()).slice(-4);
  const today = new Date().toISOString().split('T')[0];

  const items: OrderItem[] = selectedItemsWithBoxes.map((sel, idx) => {
    const { stockItem, caixasParaSeparar } = sel;
    const pack = stockItem.qtdPorPacote || 1;
    const qtdTotalUnidades = caixasParaSeparar * pack;
    const valorTotalBruto = qtdTotalUnidades * stockItem.precoUnitario;
    const fiscal = calculateItemFiscal(stockItem.precoUnitario, stockItem.pdvSugerido, fiscalConfig);
    const separation = calculateAutomaticSeparation(qtdTotalUnidades, storeConfigs);

    return {
      id: `item_transf_${Date.now()}_${idx + 1}`,
      codigo: stockItem.codigo,
      descricao: stockItem.descricao,
      fotoUrl: stockItem.fotoUrl,
      qtdPorPacote: pack,
      qtdPacotes: caixasParaSeparar,
      qtdTotalUnidades,
      precoUnitario: stockItem.precoUnitario,
      valorTotalBruto,
      pdvAlvo: stockItem.pdvSugerido,
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

  return {
    header: {
      id: 'order_transf_cd_' + Date.now(),
      numeroPedido: nextNum,
      fornecedor: 'Depósito Central Mega 12 (Transferência CD)',
      supplierId: 'cd_matriz',
      aliquotaSt: 0,
      vendedor: 'Expedição / CD Matriz',
      contatoVendedor: '(41) 3300-1200',
      condicaoPagamento: 'Transferência Interna Entre Filiais',
      dataPedido: today,
      dataEntregaPrevista: today,
      percentualDescontoOff: 0,
      percentualNota: 100,
      observacoesDescarga: 'Romaneio gerado a partir do estoque físico do Depósito Central para distribuição às 20 lojas.',
      valorFreteGlobal: 0,
      valorOutrasDespesasGlobal: 0,
      status: 'Em Separação',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    items,
    fiscalConfig,
    storeConfigs
  };
}
