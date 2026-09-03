/**
 * Seeder Completo de Dados Históricos - Rede Mega 12
 * Gera produtos, fornecedores, lojas, usuários e histórico de compras desde Janeiro de 2026.
 */

const DEFAULT_STORES = [
  { id: 'pg_centro', name: 'Ponta Grossa Centro', cluster: 'A', defaultWeight: 2.5 },
  { id: 'reserva', name: 'Reserva', cluster: 'A', defaultWeight: 2.5 },
  { id: 'tibagi', name: 'Tibagi', cluster: 'A', defaultWeight: 2.5 },
  { id: 'nova_russia', name: 'Nova Rússia', cluster: 'A', defaultWeight: 2.5 },
  { id: 'javert', name: 'Javert', cluster: 'A', defaultWeight: 2.5 },
  { id: 'ivai', name: 'Ivaí', cluster: 'A', defaultWeight: 2.5 },
  { id: 'irati_centro', name: 'Irati Centro', cluster: 'A', defaultWeight: 2.5 },
  { id: 'campo_largo', name: 'Campo Largo', cluster: 'A', defaultWeight: 2.5 },
  { id: 'castro', name: 'Castro', cluster: 'B', defaultWeight: 1.75 },
  { id: 'imbituva', name: 'Imbituva', cluster: 'B', defaultWeight: 1.75 },
  { id: 'santa_paula', name: 'Santa Paula', cluster: 'B', defaultWeight: 1.75 },
  { id: 'prudentopolis', name: 'Prudentópolis', cluster: 'B', defaultWeight: 1.75 },
  { id: 'guarapuava', name: 'Guarapuava', cluster: 'B', defaultWeight: 1.75 },
  { id: 'imbau', name: 'Imbaú', cluster: 'B', defaultWeight: 1.75 },
  { id: 'rio_azul', name: 'Rio Azul', cluster: 'B', defaultWeight: 1.75 },
  { id: 'reboucas', name: 'Rebouças', cluster: 'B', defaultWeight: 1.75 },
  { id: 'deposito_central', name: 'Depósito Central', cluster: 'C', defaultWeight: 1.25 },
  { id: 'teixeira_soares', name: 'Teixeira Soares', cluster: 'C', defaultWeight: 1.25 },
  { id: 'mallet', name: 'Mallet', cluster: 'C', defaultWeight: 1.25 },
  { id: 'ipiranga', name: 'Ipiranga', cluster: 'C', defaultWeight: 1.25 }
];

const DEFAULT_SUPPLIERS = [
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
    observacoesDescarga: 'Entregar com paletização padrão no Depósito Central.'
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
    observacoesDescarga: 'Descarga das 08h às 16h no Depósito Central.'
  },
  {
    id: 'sup_3',
    razaoSocial: 'Indústria Metalúrgica Alumínios União Ltda',
    nomeFantasia: 'Alumínios União',
    cnpj: '45.678.901/0001-23',
    vendedorPadrao: 'Roberto Lima',
    contatoVendedor: '(44) 99112-3344',
    condicaoPagamentoPadrao: '30/60/90 Dias',
    aliquotaStPadrao: 12.0,
    aliquotaIpiPadrao: 5.0,
    descontoOffPadrao: 8.0,
    observacoesDescarga: 'Paletes padrão PBR. Agendar entrega com 24h de antecedência.'
  }
];

const DEFAULT_PRODUCTS = [
  { id: 'prod_pre_1', codigo: 'PRE-001', descricao: 'Caneca Cerâmica Decorada com Frases 350ml', categoria: 'Presentes & Decoração', fotoUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 12, precoUnitarioPadrao: 4.20, pdvSugerido: 12.00, ncm: '6912.00.00', eanBarcode: '7892000100012', supplierId: 'sup_2', nomeFornecedor: 'Paraná Bazar' },
  { id: 'prod_pre_2', codigo: 'PRE-002', descricao: 'Difusor e Aromatizador de Ambientes Lavanda 250ml', categoria: 'Bem-Estar & Casa', fotoUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 6, precoUnitarioPadrao: 4.80, pdvSugerido: 12.00, ncm: '3307.49.00', eanBarcode: '7892000100029', supplierId: 'sup_2', nomeFornecedor: 'Paraná Bazar' },
  { id: 'prod_pre_3', codigo: 'PRE-003', descricao: 'Porta-Retrato Vidro e Dourado 15x20cm', categoria: 'Presentes & Decoração', fotoUrl: 'https://images.unsplash.com/photo-1582582494705-f8ce0b0c24f0?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 24, precoUnitarioPadrao: 3.80, pdvSugerido: 12.00, ncm: '8306.30.00', eanBarcode: '7892000100036', supplierId: 'sup_2', nomeFornecedor: 'Paraná Bazar' },
  { id: 'prod_pre_4', codigo: 'PRE-004', descricao: 'Vela Aromática Copo de Vidro Baunilha 180g', categoria: 'Bem-Estar & Casa', fotoUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 12, precoUnitarioPadrao: 4.50, pdvSugerido: 12.00, ncm: '3406.00.00', eanBarcode: '7892000100043', supplierId: 'sup_2', nomeFornecedor: 'Paraná Bazar' },
  { id: 'prod_pre_5', codigo: 'PRE-005', descricao: 'Luminária de Mesa LED Articulada USB', categoria: 'Presentes & Decoração', fotoUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 8, precoUnitarioPadrao: 5.20, pdvSugerido: 12.00, ncm: '9405.20.00', eanBarcode: '7892000100050', supplierId: 'sup_2', nomeFornecedor: 'Paraná Bazar' },
  { id: 'prod_pre_6', codigo: 'PRE-006', descricao: 'Caixa Organizadora Cartonada Decorativa P/M/G', categoria: 'Organizadores', fotoUrl: 'https://images.unsplash.com/photo-1584990347449-399a9a3b6fcf?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 4, precoUnitarioPadrao: 4.80, pdvSugerido: 12.00, ncm: '4819.10.00', eanBarcode: '7892000100067', supplierId: 'sup_2', nomeFornecedor: 'Paraná Bazar' },
  { id: 'prod_pre_7', codigo: 'PRE-007', descricao: 'Garrafa Squeeze Inox Degradê 750ml', categoria: 'Presentes & Decoração', fotoUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 12, precoUnitarioPadrao: 5.10, pdvSugerido: 12.00, ncm: '7323.93.00', eanBarcode: '7892000100074', supplierId: 'sup_2', nomeFornecedor: 'Paraná Bazar' },
  { id: 'prod_pre_8', codigo: 'PRE-008', descricao: 'Jogo de Xícaras de Café Cristal Coração 6un', categoria: 'Mesa Posta', fotoUrl: 'https://images.unsplash.com/photo-1574053415387-a25475d4088d?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 6, precoUnitarioPadrao: 5.50, pdvSugerido: 12.00, ncm: '7013.37.00', eanBarcode: '7892000100081', supplierId: 'sup_2', nomeFornecedor: 'Paraná Bazar' },
  { id: 'prod_pre_9', codigo: 'PRE-009', descricao: 'Espelho de Mesa com LED Touch e Base Porta-Jóias', categoria: 'Presentes & Decoração', fotoUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 6, precoUnitarioPadrao: 5.40, pdvSugerido: 12.00, ncm: '7009.92.00', eanBarcode: '7892000100098', supplierId: 'sup_2', nomeFornecedor: 'Paraná Bazar' },
  { id: 'prod_pre_10', codigo: 'PRE-010', descricao: 'Mini Vaso Cachepot Cerâmica com Suculenta', categoria: 'Presentes & Decoração', fotoUrl: 'https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 24, precoUnitarioPadrao: 3.50, pdvSugerido: 12.00, ncm: '6912.00.00', eanBarcode: '7892000100104', supplierId: 'sup_2', nomeFornecedor: 'Paraná Bazar' },
  { id: 'prod_pre_11', codigo: 'PRE-011', descricao: 'Almofada Decorativa Veludo com Enchimento 45x45cm', categoria: 'Cama, Mesa & Banho', fotoUrl: 'https://images.unsplash.com/photo-1584990347449-399a9a3b6fcf?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 10, precoUnitarioPadrao: 4.90, pdvSugerido: 12.00, ncm: '9404.90.00', eanBarcode: '7892000100111', supplierId: 'sup_2', nomeFornecedor: 'Paraná Bazar' },
  { id: 'prod_pre_12', codigo: 'PRE-012', descricao: 'Relógio de Parede Moderno Minimalista 30cm', categoria: 'Presentes & Decoração', fotoUrl: 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 12, precoUnitarioPadrao: 4.50, pdvSugerido: 12.00, ncm: '9105.21.00', eanBarcode: '7892000100128', supplierId: 'sup_2', nomeFornecedor: 'Paraná Bazar' },
  { id: 'prod_pre_13', codigo: 'PRE-013', descricao: 'Copo Térmico com Tampa e Abridor 473ml', categoria: 'Utilidades Térmicas', fotoUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 12, precoUnitarioPadrao: 5.20, pdvSugerido: 12.00, ncm: '9617.00.10', eanBarcode: '7892000100135', supplierId: 'sup_2', nomeFornecedor: 'Paraná Bazar' },
  { id: 'prod_pre_14', codigo: 'PRE-014', descricao: 'Kit Canetas Fineliner Tons Pastel 12 Cores', categoria: 'Papelaria & Bazar', fotoUrl: 'https://images.unsplash.com/photo-1583778176476-4a8b02a64c01?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 24, precoUnitarioPadrao: 3.90, pdvSugerido: 12.00, ncm: '9608.20.00', eanBarcode: '7892000100142', supplierId: 'sup_2', nomeFornecedor: 'Paraná Bazar' },
  { id: 'prod_pre_15', codigo: 'PRE-015', descricao: 'Garrafa Térmica Nórdica Cabo Madeira 1L', categoria: 'Utilidades Térmicas', fotoUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 6, precoUnitarioPadrao: 5.80, pdvSugerido: 12.00, ncm: '9617.00.10', eanBarcode: '7892000100159', supplierId: 'sup_2', nomeFornecedor: 'Paraná Bazar' },
  { id: 'prod_pre_16', codigo: 'PRE-016', descricao: 'Bandeja Espelhada Retangular Decorativa Lavabo', categoria: 'Presentes & Decoração', fotoUrl: 'https://images.unsplash.com/photo-1582582494705-f8ce0b0c24f0?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 6, precoUnitarioPadrao: 4.90, pdvSugerido: 12.00, ncm: '7009.92.00', eanBarcode: '7892000100166', supplierId: 'sup_2', nomeFornecedor: 'Paraná Bazar' },
  { id: 'prod_pre_17', codigo: 'PRE-017', descricao: 'Bloco de Anotações Planner Semanal Wire-o', categoria: 'Papelaria & Bazar', fotoUrl: 'https://images.unsplash.com/photo-1583778176476-4a8b02a64c01?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 20, precoUnitarioPadrao: 3.20, pdvSugerido: 12.00, ncm: '4820.10.00', eanBarcode: '7892000100173', supplierId: 'sup_2', nomeFornecedor: 'Paraná Bazar' },
  { id: 'prod_pre_18', codigo: 'PRE-018', descricao: 'Peseira Manta de Sofá Algodão Trabalhado', categoria: 'Cama, Mesa & Banho', fotoUrl: 'https://images.unsplash.com/photo-1584990347449-399a9a3b6fcf?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 4, precoUnitarioPadrao: 5.60, pdvSugerido: 12.00, ncm: '6301.30.00', eanBarcode: '7892000100180', supplierId: 'sup_2', nomeFornecedor: 'Paraná Bazar' },
  { id: 'prod_pre_19', codigo: 'PRE-019', descricao: 'Conjunto Taças de Vinho Cristal Borda Dourada 6un', categoria: 'Vidros & Cristais', fotoUrl: 'https://images.unsplash.com/photo-1574053415387-a25475d4088d?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 4, precoUnitarioPadrao: 5.80, pdvSugerido: 12.00, ncm: '7013.22.00', eanBarcode: '7892000100197', supplierId: 'sup_2', nomeFornecedor: 'Paraná Bazar' },
  { id: 'prod_pre_20', codigo: 'PRE-020', descricao: 'Aromatizador Umidificador Ultrassônico de Mesa', categoria: 'Bem-Estar & Casa', fotoUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 6, precoUnitarioPadrao: 5.50, pdvSugerido: 12.00, ncm: '8509.80.90', eanBarcode: '7892000100203', supplierId: 'sup_2', nomeFornecedor: 'Paraná Bazar' },
  { id: 'prod_1', codigo: 'PRD-001', descricao: 'Garrafa Térmica Inox 1L com Termômetro Digital', categoria: 'Utilidades Térmicas', fotoUrl: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 12, precoUnitarioPadrao: 5.50, pdvSugerido: 12.00, ncm: '9617.00.10', eanBarcode: '7891000100011', supplierId: 'sup_1', nomeFornecedor: 'Brasil Plásticos' },
  { id: 'prod_2', codigo: 'PRD-002', descricao: 'Conjunto 6 Taças de Cristal Lapidado 320ml', categoria: 'Vidros & Cristais', fotoUrl: 'https://images.unsplash.com/photo-1574053415387-a25475d4088d?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 6, precoUnitarioPadrao: 5.80, pdvSugerido: 12.00, ncm: '7013.22.00', eanBarcode: '7891000100028', supplierId: 'sup_2', nomeFornecedor: 'Paraná Bazar' },
  { id: 'prod_3', codigo: 'PRD-003', descricao: 'Kit 4 Potes Herméticos de Vidro com Tampa Bambu', categoria: 'Organizadores', fotoUrl: 'https://images.unsplash.com/photo-1584990347449-399a9a3b6fcf?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 8, precoUnitarioPadrao: 4.90, pdvSugerido: 12.00, ncm: '7013.49.00', eanBarcode: '7891000100035', supplierId: 'sup_1', nomeFornecedor: 'Brasil Plásticos' },
  { id: 'prod_4', codigo: 'PRD-004', descricao: 'Luminária Decorativa LED Articulada de Mesa', categoria: 'Decoração & Presentes', fotoUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 24, precoUnitarioPadrao: 4.20, pdvSugerido: 12.00, ncm: '9405.20.00', eanBarcode: '7891000100042', supplierId: 'sup_2', nomeFornecedor: 'Paraná Bazar' },
  { id: 'prod_5', codigo: 'PRD-005', descricao: 'Frigideira Antiaderente Cerâmica 24cm Granito', categoria: 'Panelas & Cozinha', fotoUrl: 'https://images.unsplash.com/photo-1583778176476-4a8b02a64c01?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 10, precoUnitarioPadrao: 5.20, pdvSugerido: 12.00, ncm: '7615.10.00', eanBarcode: '7891000100059', supplierId: 'sup_3', nomeFornecedor: 'Alumínios União' },
  { id: 'prod_6', codigo: 'PRD-006', descricao: 'Aparelho de Jantar 16 Peças Cerâmica Nórdica', categoria: 'Mesa Posta', fotoUrl: 'https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 6, precoUnitarioPadrao: 5.90, pdvSugerido: 12.00, ncm: '6912.00.00', eanBarcode: '7891000100066', supplierId: 'sup_2', nomeFornecedor: 'Paraná Bazar' },
  { id: 'prod_7', codigo: 'PRD-007', descricao: 'Jogo 6 Facas Cozinha Inox com Cepo de Madeira', categoria: 'Cutelaria', fotoUrl: 'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 12, precoUnitarioPadrao: 4.80, pdvSugerido: 12.00, ncm: '8211.91.00', eanBarcode: '7891000100073', supplierId: 'sup_3', nomeFornecedor: 'Alumínios União' },
  { id: 'prod_8', codigo: 'PRD-008', descricao: 'Difusor de Aromas Elétrico Ultrassônico 300ml', categoria: 'Bem-Estar & Casa', fotoUrl: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 20, precoUnitarioPadrao: 4.50, pdvSugerido: 12.00, ncm: '8509.80.90', eanBarcode: '7891000100080', supplierId: 'sup_1', nomeFornecedor: 'Brasil Plásticos' },
  { id: 'prod_9', codigo: 'PRD-009', descricao: 'Organizador Giratório Multiuso Acrílico 360°', categoria: 'Organizadores', fotoUrl: 'https://images.unsplash.com/photo-1584990347449-399a9a3b6fcf?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 15, precoUnitarioPadrao: 4.80, pdvSugerido: 12.00, ncm: '3924.90.00', eanBarcode: '7891000100097', supplierId: 'sup_1', nomeFornecedor: 'Brasil Plásticos' },
  { id: 'prod_10', codigo: 'PRD-010', descricao: 'Porta Retrato Luxo Dourado 15x20 com Vidro', categoria: 'Decoração & Presentes', fotoUrl: 'https://images.unsplash.com/photo-1582582494705-f8ce0b0c24f0?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 30, precoUnitarioPadrao: 3.90, pdvSugerido: 12.00, ncm: '8306.30.00', eanBarcode: '7891000100103', supplierId: 'sup_2', nomeFornecedor: 'Paraná Bazar' },
  { id: 'prod_11', codigo: 'PRD-011', descricao: 'Mop Giratório 360° Pro com Balde Inox e 2 Refis', categoria: 'Limpeza & Utilidades', fotoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 6, precoUnitarioPadrao: 5.50, pdvSugerido: 12.00, ncm: '9603.90.00', eanBarcode: '7891000100110', supplierId: 'sup_1', nomeFornecedor: 'Brasil Plásticos' },
  { id: 'prod_12', codigo: 'PRD-014', descricao: 'Conjunto 3 Travessas Refratárias Retangulares em Vidro Opalino', categoria: 'Mesa Posta & Cozinha', fotoUrl: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 4, precoUnitarioPadrao: 5.00, pdvSugerido: 12.00, ncm: '7013.49.00', eanBarcode: '7891000100141', supplierId: 'sup_2', nomeFornecedor: 'Paraná Bazar' },
  { id: 'prod_13', codigo: 'PRD-015', descricao: 'Kit 6 Copos de Vidro Alto Diamond 350ml Transparente', categoria: 'Vidros & Cristais', fotoUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 12, precoUnitarioPadrao: 4.50, pdvSugerido: 12.00, ncm: '7013.37.00', eanBarcode: '7891000100158', supplierId: 'sup_2', nomeFornecedor: 'Paraná Bazar' },
  { id: 'prod_14', codigo: 'PRD-016', descricao: 'Panela de Pressão Alumínio Polido 4,5L Fechamento Externo', categoria: 'Panelas & Cozinha', fotoUrl: 'https://images.unsplash.com/photo-1584990347449-399a9a3b6fcf?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 6, precoUnitarioPadrao: 5.80, pdvSugerido: 12.00, ncm: '7615.10.00', eanBarcode: '7891000100165', supplierId: 'sup_3', nomeFornecedor: 'Alumínios União' },
  { id: 'prod_15', codigo: 'PRD-018', descricao: 'Escorredor de Louças 2 Andares Inox Black com Porta Copos', categoria: 'Organizadores', fotoUrl: 'https://images.unsplash.com/photo-1583778176476-4a8b02a64c01?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 6, precoUnitarioPadrao: 4.60, pdvSugerido: 12.00, ncm: '7323.93.00', eanBarcode: '7891000100189', supplierId: 'sup_3', nomeFornecedor: 'Alumínios União' },
  { id: 'prod_16', codigo: 'PRD-021', descricao: 'Jogo de Assadeiras Antiaderente 3 Peças Redonda e Torta', categoria: 'Panelas & Cozinha', fotoUrl: 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 8, precoUnitarioPadrao: 4.90, pdvSugerido: 12.00, ncm: '7615.10.00', eanBarcode: '7891000100219', supplierId: 'sup_3', nomeFornecedor: 'Alumínios União' },
  { id: 'prod_17', codigo: 'PRD-024', descricao: 'Caixa Organizadora Plástica Transparente com Trava 45L', categoria: 'Organizadores', fotoUrl: 'https://images.unsplash.com/photo-1584990347449-399a9a3b6fcf?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 8, precoUnitarioPadrao: 4.90, pdvSugerido: 12.00, ncm: '3923.10.90', eanBarcode: '7891000100240', supplierId: 'sup_1', nomeFornecedor: 'Brasil Plásticos' },
  { id: 'prod_18', codigo: 'PRD-025', descricao: 'Faqueiro Aço Inox 24 Peças com Estojo Gaveta Laguna', categoria: 'Cutelaria', fotoUrl: 'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 6, precoUnitarioPadrao: 5.40, pdvSugerido: 12.00, ncm: '8211.91.00', eanBarcode: '7891000100257', supplierId: 'sup_3', nomeFornecedor: 'Alumínios União' },
  { id: 'prod_19', codigo: 'PRD-027', descricao: 'Bule Térmico Wave 1L com Ampola de Vidro e Cabo Madeira', categoria: 'Utilidades Térmicas', fotoUrl: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 10, precoUnitarioPadrao: 4.80, pdvSugerido: 12.00, ncm: '9617.00.10', eanBarcode: '7891000100271', supplierId: 'sup_1', nomeFornecedor: 'Brasil Plásticos' },
  { id: 'prod_20', codigo: 'PRD-029', descricao: 'Relógio de Parede Silencioso Minimalista Scandinavian 30cm', categoria: 'Decoração & Presentes', fotoUrl: 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=300&auto=format&fit=crop&q=80', qtdPorPacote: 15, precoUnitarioPadrao: 4.20, pdvSugerido: 12.00, ncm: '9105.21.00', eanBarcode: '7891000100295', supplierId: 'sup_2', nomeFornecedor: 'Paraná Bazar' }
];

function buildItemCalculations(prod, qtdPacotes, fiscalConfig, stores) {
  const qtdTotal = qtdPacotes * prod.qtdPorPacote;
  const precoCompra = prod.precoUnitarioPadrao;
  const pdv = prod.pdvSugerido;

  const icms = fiscalConfig.icmsAliquota || 0.11;
  const ipi = fiscalConfig.ipiAliquota || 0;
  const pisCofins = fiscalConfig.pisCofinsAliquota || 0.03;
  const custosFixos = fiscalConfig.custosFixos || 0.26;
  const creditoEntrada = fiscalConfig.creditoEntradaICMS || 0.195;

  const totalDespesas = icms + ipi + pisCofins + custosFixos;
  const despesasPdvUnit = Number((pdv * totalDespesas).toFixed(4));
  const creditoIcmsUnit = Number((precoCompra * creditoEntrada).toFixed(4));
  const custoRealEfetivo = Number((precoCompra + despesasPdvUnit - creditoIcmsUnit).toFixed(4));
  const margemRealUnit = Number((pdv - custoRealEfetivo).toFixed(4));
  const margemPercentual = pdv > 0 ? Number(((margemRealUnit / pdv) * 100).toFixed(2)) : 0;

  // Rateio de Separação para as 20 lojas
  const totalWeight = stores.reduce((acc, s) => acc + s.defaultWeight, 0);
  let totalDistributed = 0;
  const separacaoLojas = {};

  stores.forEach(s => {
    const share = (s.defaultWeight / totalWeight) * qtdTotal;
    const packs = Math.max(1, Math.floor(share / prod.qtdPorPacote));
    const units = packs * prod.qtdPorPacote;
    separacaoLojas[s.id] = units;
    totalDistributed += units;
  });

  const reserveStock = Math.max(0, qtdTotal - totalDistributed);

  return {
    id: 'item_' + Math.random().toString(36).substr(2, 9),
    codigo: prod.codigo,
    descricao: prod.descricao,
    categoria: prod.categoria,
    fotoUrl: prod.fotoUrl,
    qtdPorPacote: prod.qtdPorPacote,
    qtdPacotes,
    qtdTotalUnidades: qtdTotal,
    precoUnitario: precoCompra,
    valorTotalBruto: Number((precoCompra * qtdTotal).toFixed(2)),
    pdvAlvo: pdv,
    despesasPdvUnit,
    creditoIcmsUnit,
    custoRealEfetivo,
    margemRealUnit,
    margemPercentual,
    separacaoLojas,
    separacaoManual: false,
    qtdReservaEstoque: reserveStock,
    custoLiquidoTotalComDesconto: Number((precoCompra * qtdTotal).toFixed(2))
  };
}

function buildInstallments(orderTotal, condicao, deliveryDate, statusPedido) {
  const parts = condicao.split('/');
  const count = parts.length > 0 && parts[0].includes('Dias') ? parts.length : 3;
  const daysInterval = [30, 60, 90, 120];

  const valuePerInstallment = Number((orderTotal / count).toFixed(2));
  const baseDate = new Date(deliveryDate);
  const now = new Date();

  return Array.from({ length: count }).map((_, i) => {
    const days = daysInterval[i] || (i + 1) * 30;
    const dueDate = new Date(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    const isPast = dueDate < now;

    let installmentStatus = 'A Vencer';
    let dataPagamento = null;

    if (statusPedido === 'Finalizado' && isPast) {
      installmentStatus = 'Pago';
      dataPagamento = dueDate.toISOString().split('T')[0];
    } else if (isPast) {
      installmentStatus = 'A Vencer';
    }

    return {
      id: 'inst_' + Math.random().toString(36).substr(2, 9),
      numeroParcela: i + 1,
      totalParcelas: count,
      dataVencimento: dueDate.toISOString().split('T')[0],
      valor: valuePerInstallment,
      valorOriginal: valuePerInstallment,
      status: installmentStatus,
      dataPagamento,
      observacao: installmentStatus === 'Pago' ? 'Liquidado via DDA / Banco Itaú' : 'Boleto registrado'
    };
  });
}

function generateHistoricalOrders(fiscalConfig, stores) {
  const orderTemplates = [
    {
      num: 'PED-0001',
      fornecedor: 'Plásticos & Utilidades do Brasil Ltda',
      supplierId: 'sup_1',
      vendedor: 'Carlos Andrade',
      condicao: '30/60/90 Dias',
      dataEmissao: '2026-01-14T09:30:00.000Z',
      dataEntrega: '2026-01-22T14:00:00.000Z',
      status: 'Finalizado',
      separationStatus: 'Concluído',
      descontoOff: 5.0,
      prodIndices: [0, 2, 7, 8], // Térmica, Potes, Difusor, Organizador
      pacotes: [30, 40, 25, 35]
    },
    {
      num: 'PED-0002',
      fornecedor: 'Distribuidora Paranaense de Bazar S/A',
      supplierId: 'sup_2',
      vendedor: 'Mariana Souza',
      condicao: '28/56 Dias',
      dataEmissao: '2026-02-05T10:15:00.000Z',
      dataEntrega: '2026-02-16T11:00:00.000Z',
      status: 'Finalizado',
      separationStatus: 'Concluído',
      descontoOff: 3.0,
      prodIndices: [1, 3, 5, 9], // Taças, Luminária, Aparelho Jantar, Porta Retrato
      pacotes: [50, 30, 25, 40]
    },
    {
      num: 'PED-0003',
      fornecedor: 'Indústria Metalúrgica Alumínios União Ltda',
      supplierId: 'sup_3',
      vendedor: 'Roberto Lima',
      condicao: '30/60/90 Dias',
      dataEmissao: '2026-03-09T14:00:00.000Z',
      dataEntrega: '2026-03-20T16:30:00.000Z',
      status: 'Finalizado',
      separationStatus: 'Concluído',
      descontoOff: 8.0,
      prodIndices: [4, 6, 13, 14], // Frigideira, Facas, Panela Pressão, Escorredor
      pacotes: [40, 35, 30, 25]
    },
    {
      num: 'PED-0004',
      fornecedor: 'Plásticos & Utilidades do Brasil Ltda',
      supplierId: 'sup_1',
      vendedor: 'Carlos Andrade',
      condicao: '30/60/90 Dias',
      dataEmissao: '2026-04-12T11:00:00.000Z',
      dataEntrega: '2026-04-23T15:00:00.000Z',
      status: 'Finalizado',
      separationStatus: 'Concluído',
      descontoOff: 5.0,
      prodIndices: [10, 16, 18], // Mop Pro, Caixa 45L, Bule Wave
      pacotes: [60, 45, 50]
    },
    {
      num: 'PED-0005',
      fornecedor: 'Distribuidora Paranaense de Bazar S/A',
      supplierId: 'sup_2',
      vendedor: 'Mariana Souza',
      condicao: '28/56 Dias',
      dataEmissao: '2026-05-18T13:20:00.000Z',
      dataEntrega: '2026-05-29T10:00:00.000Z',
      status: 'Finalizado',
      separationStatus: 'Concluído',
      descontoOff: 4.0,
      prodIndices: [1, 11, 12, 19], // Taças, Travessas, Copos Diamond, Relógio
      pacotes: [45, 35, 50, 30]
    },
    {
      num: 'PED-0006',
      fornecedor: 'Indústria Metalúrgica Alumínios União Ltda',
      supplierId: 'sup_3',
      vendedor: 'Roberto Lima',
      condicao: '30/60/90 Dias',
      dataEmissao: '2026-06-15T08:45:00.000Z',
      dataEntrega: '2026-06-25T14:00:00.000Z',
      status: 'Finalizado',
      separationStatus: 'Concluído',
      descontoOff: 8.0,
      prodIndices: [4, 13, 15, 17], // Frigideira, Panela Pressão, Assadeiras, Faqueiro
      pacotes: [50, 40, 45, 30]
    },
    {
      num: 'PED-0007',
      fornecedor: 'Plásticos & Utilidades do Brasil Ltda',
      supplierId: 'sup_1',
      vendedor: 'Carlos Andrade',
      condicao: '30/60/90 Dias',
      dataEmissao: '2026-07-10T10:30:00.000Z',
      dataEntrega: '2026-07-21T16:00:00.000Z',
      status: 'Finalizado',
      separationStatus: 'Concluído',
      descontoOff: 5.0,
      prodIndices: [0, 2, 8, 16], // Térmica, Potes, Organizador 360, Caixa 45L
      pacotes: [40, 50, 45, 35]
    },
    {
      num: 'PED-0008',
      fornecedor: 'Distribuidora Paranaense de Bazar S/A',
      supplierId: 'sup_2',
      vendedor: 'Mariana Souza',
      condicao: '28/56 Dias',
      dataEmissao: '2026-08-05T14:15:00.000Z',
      dataEntrega: '2026-08-18T10:30:00.000Z',
      status: 'Conferido',
      separationStatus: 'Concluído',
      descontoOff: 3.0,
      prodIndices: [11, 12, 19, 3], // Travessas, Copos Diamond, Relógio, Luminária LED
      pacotes: [35, 60, 25, 30]
    },
    {
      num: 'PED-0009',
      fornecedor: 'Indústria Metalúrgica Alumínios União Ltda',
      supplierId: 'sup_3',
      vendedor: 'Roberto Lima',
      condicao: '30/60/90 Dias',
      dataEmissao: '2026-08-19T09:00:00.000Z',
      dataEntrega: '2026-08-30T15:00:00.000Z',
      status: 'Em Separação',
      separationStatus: 'Em Andamento',
      descontoOff: 7.0,
      prodIndices: [6, 14, 15, 17], // Facas, Escorredor, Assadeiras, Faqueiro
      pacotes: [30, 25, 40, 25]
    },
    {
      num: 'PED-0010',
      fornecedor: 'Plásticos & Utilidades do Brasil Ltda',
      supplierId: 'sup_1',
      vendedor: 'Carlos Andrade',
      condicao: '30/60/90 Dias',
      dataEmissao: '2026-08-26T16:00:00.000Z',
      dataEntrega: '2026-09-08T11:00:00.000Z',
      status: 'Em Cotação',
      separationStatus: 'Pendente',
      descontoOff: 5.0,
      prodIndices: [0, 7, 10, 18], // Térmica, Difusor, Mop Pro, Bule Wave
      pacotes: [35, 25, 40, 30]
    }
  ];

  return orderTemplates.map(tmpl => {
    const items = tmpl.prodIndices.map((prodIdx, i) => {
      const prod = DEFAULT_PRODUCTS[prodIdx];
      const qtdPac = tmpl.pacotes[i] || 20;
      return buildItemCalculations(prod, qtdPac, fiscalConfig, stores);
    });

    let totalLiquido = 0;
    let totalPecas = 0;
    items.forEach(it => {
      totalLiquido += it.valorTotalBruto * (1 - tmpl.descontoOff / 100);
      totalPecas += it.qtdTotalUnidades;
    });

    const installments = buildInstallments(totalLiquido, tmpl.condicao, tmpl.dataEntrega, tmpl.status);

    return {
      id: 'ord_' + tmpl.num.toLowerCase().replace('-', '_'),
      numeroPedido: tmpl.num,
      fornecedor: tmpl.fornecedor,
      supplierId: tmpl.supplierId,
      aliquotaSt: 0,
      vendedor: tmpl.vendedor,
      contatoVendedor: '(42) 99988-7766',
      condicaoPagamento: tmpl.condicao,
      dataEmissao: tmpl.dataEmissao.split('T')[0],
      dataEntregaPrevista: tmpl.dataEntrega.split('T')[0],
      percentualDescontoOff: tmpl.descontoOff,
      percentualNota: 100,
      observacoes: `Pedido de reposição mensal para as 20 lojas da Rede Mega 12. Carga paletizada.`,
      status: tmpl.status,
      separationStatus: tmpl.separationStatus,
      totalLiquido: Number(totalLiquido.toFixed(2)),
      totalPecas,
      installmentsJson: JSON.stringify(installments),
      itemsJson: JSON.stringify(items),
      separationDistributionJson: JSON.stringify({ storesAllocated: 20 }),
      createdAt: tmpl.dataEmissao,
      updatedAt: tmpl.dataEmissao
    };
  });
}

function runFullDatabaseSeed(db) {
  const now = new Date().toISOString();

  // 1. Fiscal Config
  const fiscalCheck = db.exec("SELECT COUNT(*) as count FROM fiscal_config");
  const fiscalConfig = {
    icmsAliquota: 0.11,
    ipiAliquota: 0.00,
    pisCofinsAliquota: 0.03,
    custosFixos: 0.26,
    creditoEntradaICMS: 0.195
  };

  if (!fiscalCheck[0] || fiscalCheck[0].values[0][0] === 0) {
    db.run(`
      INSERT INTO fiscal_config (id, icmsAliquota, ipiAliquota, pisCofinsAliquota, custosFixos, creditoEntradaICMS, updatedAt)
      VALUES ('global', ?, ?, ?, ?, ?, ?)
    `, [fiscalConfig.icmsAliquota, fiscalConfig.ipiAliquota, fiscalConfig.pisCofinsAliquota, fiscalConfig.custosFixos, fiscalConfig.creditoEntradaICMS, now]);
  }

  // 2. Stores (20 Lojas)
  const storeCheck = db.exec("SELECT COUNT(*) as count FROM stores");
  if (!storeCheck[0] || storeCheck[0].values[0][0] === 0) {
    DEFAULT_STORES.forEach(s => {
      db.run("INSERT INTO stores (id, name, cluster, defaultWeight, active) VALUES (?, ?, ?, ?, ?)", [s.id, s.name, s.cluster, s.defaultWeight, 1]);
    });
  }

  // 3. Fornecedores
  const supCheck = db.exec("SELECT COUNT(*) as count FROM suppliers");
  if (!supCheck[0] || supCheck[0].values[0][0] === 0) {
    DEFAULT_SUPPLIERS.forEach(s => {
      db.run(`
        INSERT INTO suppliers (id, razaoSocial, nomeFantasia, cnpj, vendedorPadrao, contatoVendedor, condicaoPagamentoPadrao, aliquotaStPadrao, aliquotaIpiPadrao, descontoOffPadrao, observacoesDescarga, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [s.id, s.razaoSocial, s.nomeFantasia, s.cnpj, s.vendedorPadrao, s.contatoVendedor, s.condicaoPagamentoPadrao, s.aliquotaStPadrao, s.aliquotaIpiPadrao, s.descontoOffPadrao, s.observacoesDescarga, now, now]);
    });
  }

  // 4. Catálogo de Produtos com Fotos (Garante inserção de todos os produtos do seed se faltar algum)
  DEFAULT_PRODUCTS.forEach(p => {
    const existing = db.exec("SELECT id FROM products WHERE id = ? OR codigo = ?", [p.id, p.codigo]);
    if (!existing[0] || existing[0].values.length === 0) {
      db.run(`
        INSERT INTO products (id, codigo, codigoInterno, codigoFornecedor, codigoBarras, descricao, categoria, subcategoria, supplierId, nomeFornecedor, precoUnitarioPadrao, pdvSugerido, qtdPorPacote, fotoUrl, ncm, eanBarcode, ativo, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        p.id, 
        p.codigo, 
        p.codigoInterno || p.codigo, 
        p.codigoFornecedor || '', 
        p.codigoBarras || p.eanBarcode || '', 
        p.descricao, 
        p.categoria, 
        p.subcategoria || '', 
        p.supplierId || '', 
        p.nomeFornecedor || '', 
        p.precoUnitarioPadrao, 
        p.pdvSugerido, 
        p.qtdPorPacote, 
        p.fotoUrl || '', 
        p.ncm || '', 
        p.eanBarcode || '', 
        1, 
        now, 
        now
      ]);
    }
  });

  // 5. Histórico de Pedidos de Compra (Janeiro a Agosto de 2026)
  const orderCheck = db.exec("SELECT COUNT(*) as count FROM purchase_orders");
  const currentOrderCount = orderCheck[0] ? orderCheck[0].values[0][0] : 0;

  if (currentOrderCount < 5) {
    const tableInfo = db.exec("PRAGMA table_info(purchase_orders)");
    const colNames = tableInfo[0] ? tableInfo[0].values.map(v => v[1]) : [];
    const hasDataPedido = colNames.includes('dataPedido');

    const historicalOrders = generateHistoricalOrders(fiscalConfig, DEFAULT_STORES);
    historicalOrders.forEach(ord => {
      if (hasDataPedido) {
        db.run(`
          INSERT OR REPLACE INTO purchase_orders (
            id, numeroPedido, fornecedor, supplierId, aliquotaSt, vendedor,
            contatoVendedor, condicaoPagamento, dataEmissao, dataPedido, dataEntregaPrevista,
            percentualDescontoOff, percentualNota, observacoes, status,
            separationStatus, totalLiquido, totalPecas, installmentsJson,
            itemsJson, separationDistributionJson, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          ord.id, ord.numeroPedido, ord.fornecedor, ord.supplierId, ord.aliquotaSt, ord.vendedor,
          ord.contatoVendedor, ord.condicaoPagamento, ord.dataEmissao, ord.dataEmissao, ord.dataEntregaPrevista,
          ord.percentualDescontoOff, ord.percentualNota, ord.observacoes, ord.status,
          ord.separationStatus, ord.totalLiquido, ord.totalPecas, ord.installmentsJson,
          ord.itemsJson, ord.separationDistributionJson, ord.createdAt, ord.updatedAt
        ]);
      } else {
        db.run(`
          INSERT OR REPLACE INTO purchase_orders (
            id, numeroPedido, fornecedor, supplierId, aliquotaSt, vendedor,
            contatoVendedor, condicaoPagamento, dataEmissao, dataEntregaPrevista,
            percentualDescontoOff, percentualNota, observacoes, status,
            separationStatus, totalLiquido, totalPecas, installmentsJson,
            itemsJson, separationDistributionJson, createdAt, updatedAt
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          ord.id, ord.numeroPedido, ord.fornecedor, ord.supplierId, ord.aliquotaSt, ord.vendedor,
          ord.contatoVendedor, ord.condicaoPagamento, ord.dataEmissao, ord.dataEntregaPrevista,
          ord.percentualDescontoOff, ord.percentualNota, ord.observacoes, ord.status,
          ord.separationStatus, ord.totalLiquido, ord.totalPecas, ord.installmentsJson,
          ord.itemsJson, ord.separationDistributionJson, ord.createdAt, ord.updatedAt
        ]);
      }
    });
  }

  // 6. Usuários do Sistema (3 Níveis: Diretoria, Depósito, Separação)
  try {
    const bcrypt = require('bcryptjs');
    const defaultPasswordHash = bcrypt.hashSync('123456', 10);

    // Migração de roles legadas
    db.run("UPDATE users SET role = 'deposito' WHERE role = 'comprador'");
    db.run("UPDATE users SET role = 'separacao' WHERE role IN ('conferente', 'motorista')");

    const defaultUsers = [
      {
        id: 'usr_diretoria',
        nome: 'Rafael',
        email: 'diretoria@mega12.com.br',
        senha: defaultPasswordHash,
        role: 'diretoria',
        cargo: 'Diretoria Executiva',
        telefone: '(42) 99999-0001'
      },
      {
        id: 'usr_deposito',
        nome: 'Marcos',
        email: 'deposito@mega12.com.br',
        senha: defaultPasswordHash,
        role: 'deposito',
        cargo: 'Gestão de Estoque & Depósito',
        telefone: '(42) 99999-0002'
      },
      {
        id: 'usr_separacao',
        nome: 'Jorge',
        email: 'separacao@mega12.com.br',
        senha: defaultPasswordHash,
        role: 'separacao',
        cargo: 'Conferência & Separação Doca',
        telefone: '(42) 99999-0003'
      }
    ];

    defaultUsers.forEach(u => {
      const check = db.exec(`SELECT id FROM users WHERE LOWER(email) = '${u.email.toLowerCase()}' OR id = '${u.id}'`);
      if (!check[0] || check[0].values.length === 0) {
        db.run(`
          INSERT INTO users (id, nome, email, senha, role, cargo, telefone, ativo, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?)
        `, [u.id, u.nome, u.email, u.senha, u.role, u.cargo, u.telefone, now, now]);
      } else {
        // Atualizar nome, papel e cargo
        db.run(`
          UPDATE users SET nome = ?, role = ?, cargo = ?, updatedAt = ? WHERE id = ?
        `, [u.nome, u.role, u.cargo, now, u.id]);
      }
    });
  } catch (err) {
    console.warn('Aviso no seed de usuários:', err.message);
  }
}

module.exports = {
  runFullDatabaseSeed,
  DEFAULT_STORES,
  DEFAULT_SUPPLIERS,
  DEFAULT_PRODUCTS
};
