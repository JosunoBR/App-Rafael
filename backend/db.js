const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbDir = path.join(__dirname, 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'mega12.db');

let dbInstance = null;

async function getDatabase() {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  // Se o arquivo já existe no disco, carrega o banco binário
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  // Criar tabelas se não existirem
  dbInstance.run(`
    CREATE TABLE IF NOT EXISTS fiscal_config (
      id TEXT PRIMARY KEY,
      icmsAliquota REAL NOT NULL DEFAULT 0.11,
      ipiAliquota REAL NOT NULL DEFAULT 0.00,
      pisCofinsAliquota REAL NOT NULL DEFAULT 0.03,
      custosFixos REAL NOT NULL DEFAULT 0.26,
      creditoEntradaICMS REAL NOT NULL DEFAULT 0.195,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stores (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cluster TEXT NOT NULL,
      defaultWeight REAL NOT NULL,
      active INTEGER NOT NULL DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      razaoSocial TEXT NOT NULL,
      nomeFantasia TEXT,
      cnpj TEXT,
      vendedorPadrao TEXT,
      contatoVendedor TEXT,
      condicaoPagamentoPadrao TEXT,
      aliquotaStPadrao REAL DEFAULT 0,
      aliquotaIpiPadrao REAL DEFAULT 0,
      descontoOffPadrao REAL DEFAULT 0,
      observacoesDescarga TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchase_orders (
      id TEXT PRIMARY KEY,
      numeroPedido TEXT NOT NULL UNIQUE,
      fornecedor TEXT NOT NULL,
      supplierId TEXT,
      aliquotaSt REAL DEFAULT 0,
      vendedor TEXT,
      contatoVendedor TEXT,
      condicaoPagamento TEXT,
      dataPedido TEXT NOT NULL,
      dataEntregaPrevista TEXT,
      percentualDescontoOff REAL DEFAULT 0,
      percentualNota REAL DEFAULT 100,
      observacoesDescarga TEXT,
      valorFreteGlobal REAL DEFAULT 0,
      valorOutrasDespesasGlobal REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Em Cotação',
      conferente TEXT,
      possuiAvarias INTEGER DEFAULT 0,
      observacoesDoca TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      codigo TEXT,
      descricao TEXT NOT NULL,
      fotoUrl TEXT,
      qtdPorPacote REAL NOT NULL,
      qtdPacotes REAL NOT NULL,
      qtdTotalUnidades REAL NOT NULL,
      precoUnitario REAL NOT NULL,
      valorTotalBruto REAL NOT NULL,
      pdvAlvo REAL NOT NULL,
      despesasPdvUnit REAL,
      creditoIcmsUnit REAL,
      custoRealEfetivo REAL,
      margemRealUnit REAL,
      margemPercentual REAL,
      separacaoLojas TEXT,
      separacaoManual INTEGER DEFAULT 0,
      qtdReservaEstoque REAL DEFAULT 0,
      fiscalOverride TEXT
    );

    -- Tabela de Produtos & Catálogo com Fotos
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      codigo TEXT,
      descricao TEXT NOT NULL,
      categoria TEXT,
      fotoUrl TEXT,
      qtdPorPacote REAL NOT NULL DEFAULT 1,
      precoUnitarioPadrao REAL NOT NULL DEFAULT 0,
      pdvSugerido REAL DEFAULT 0,
      ncm TEXT,
      eanBarcode TEXT,
      supplierId TEXT,
      nomeFornecedor TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    -- Tabela de Registro e Quantificação de Avarias e Perdas
    CREATE TABLE IF NOT EXISTS order_avarias (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      itemId TEXT NOT NULL,
      codigoProduto TEXT,
      descricaoProduto TEXT,
      storeId TEXT NOT NULL,
      nomeLoja TEXT,
      quantidade REAL NOT NULL,
      custoUnitario REAL NOT NULL DEFAULT 0,
      valorPrejuizoTotal REAL NOT NULL DEFAULT 0,
      motivo TEXT NOT NULL,
      conferente TEXT,
      dataRegistro TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_sequence (
      id INTEGER PRIMARY KEY,
      lastNumber INTEGER NOT NULL DEFAULT 0
    );

    -- Tabela de Parcelas e Boletos Financeiros
    CREATE TABLE IF NOT EXISTS order_installments (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      numeroPedido TEXT,
      fornecedor TEXT,
      numeroParcela INTEGER NOT NULL,
      totalParcelas INTEGER NOT NULL,
      dataVencimento TEXT NOT NULL,
      valor REAL NOT NULL,
      valorOriginal REAL,
      status TEXT NOT NULL DEFAULT 'A Vencer',
      dataPagamento TEXT,
      observacao TEXT,
      documentoRef TEXT,
      updatedAt TEXT NOT NULL
    );

    -- Tabela de Usuários e Níveis de Acesso (RBAC)
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha TEXT NOT NULL,
      role TEXT NOT NULL, -- 'diretoria', 'comprador', 'conferente', 'motorista'
      cargo TEXT,
      telefone TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  // Migrações seguras de colunas existentes
  try {
    dbInstance.run("ALTER TABLE purchase_orders ADD COLUMN percentualNota REAL DEFAULT 100");
  } catch (e) {
    // Coluna já existe
  }

  // Seeder de dados iniciais
  seedInitialData(dbInstance);

  // Salvar no disco imediatamente
  saveDatabaseToDisk(dbInstance);

  return dbInstance;
}

function saveDatabaseToDisk(db = dbInstance) {
  try {
    if (!db) return;
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (err) {
    console.error('Erro ao persistir banco SQLite no disco:', err);
  }
}

function seedInitialData(db) {
  // 1. Fiscal
  const fiscalCheck = db.exec("SELECT COUNT(*) as count FROM fiscal_config");
  const fiscalCount = fiscalCheck[0]?.values[0][0] || 0;
  if (fiscalCount === 0) {
    db.run(`
      INSERT INTO fiscal_config (id, icmsAliquota, ipiAliquota, pisCofinsAliquota, custosFixos, creditoEntradaICMS, updatedAt)
      VALUES ('global', 0.11, 0.00, 0.03, 0.26, 0.195, '${new Date().toISOString()}')
    `);
  }

  // 2. Stores
  const storeCheck = db.exec("SELECT COUNT(*) as count FROM stores");
  const storeCount = storeCheck[0]?.values[0][0] || 0;
  if (storeCount === 0) {
    const defaultStores = [
      ['pg_centro', 'Ponta Grossa Centro', 'A', 2.5, 1],
      ['reserva', 'Reserva', 'A', 2.5, 1],
      ['tibagi', 'Tibagi', 'A', 2.5, 1],
      ['nova_russia', 'Nova Rússia', 'A', 2.5, 1],
      ['javert', 'Javert', 'A', 2.5, 1],
      ['ivai', 'Ivaí', 'A', 2.5, 1],
      ['irati_centro', 'Irati Centro', 'A', 2.5, 1],
      ['campo_largo', 'Campo Largo', 'A', 2.5, 1],
      ['castro', 'Castro', 'B', 1.75, 1],
      ['imbituva', 'Imbituva', 'B', 1.75, 1],
      ['santa_paula', 'Santa Paula', 'B', 1.75, 1],
      ['prudentopolis', 'Prudentópolis', 'B', 1.75, 1],
      ['guarapuava', 'Guarapuava', 'B', 1.75, 1],
      ['imbau', 'Imbaú', 'B', 1.75, 1],
      ['rio_azul', 'Rio Azul', 'B', 1.75, 1],
      ['reboucas', 'Rebouças', 'B', 1.75, 1],
      ['deposito_central', 'Depósito Central', 'C', 1.25, 1],
      ['teixeira_soares', 'Teixeira Soares', 'C', 1.25, 1],
      ['mallet', 'Mallet', 'C', 1.25, 1],
      ['ipiranga', 'Ipiranga', 'C', 1.25, 1]
    ];

    defaultStores.forEach(s => {
      db.run(`INSERT INTO stores (id, name, cluster, defaultWeight, active) VALUES (?, ?, ?, ?, ?)`, s);
    });
  }

  // 3. Fornecedores
  const supCheck = db.exec("SELECT COUNT(*) as count FROM suppliers");
  const supCount = supCheck[0]?.values[0][0] || 0;
  if (supCount === 0) {
    const now = new Date().toISOString();
    const defaultSuppliers = [
      ['sup_1', 'Plásticos & Utilidades do Brasil Ltda', 'Brasil Plásticos', '12.345.678/0001-90', 'Carlos Andrade', '(42) 99988-7766', '30/60/90 Dias', 0, 0, 5.0, 'Entregar com paletização padrão no Depósito Central.', now, now],
      ['sup_2', 'Distribuidora Paranaense de Bazar S/A', 'Paraná Bazar', '98.765.432/0001-10', 'Mariana Souza', '(41) 98877-6655', '28/56 Dias', 7.5, 2.0, 3.0, 'Descarga das 08h às 16h no Depósito.', now, now],
      ['sup_3', 'Indústria Metalúrgica Alumínios União Ltda', 'Alumínios União', '45.678.901/0001-23', 'Roberto Lima', '(44) 99112-3344', 'À Vista (TED)', 12.0, 5.0, 8.0, 'Paletes padrão PBR. Agendar entrega com 24h de antecedência.', now, now]
    ];

    defaultSuppliers.forEach(sup => {
      db.run(`INSERT INTO suppliers VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, sup);
    });
  }

  // 4. Sequência
  const seqCheck = db.exec("SELECT COUNT(*) as count FROM order_sequence");
  const seqCount = seqCheck[0]?.values[0][0] || 0;
  if (seqCount === 0) {
    db.run("INSERT INTO order_sequence (id, lastNumber) VALUES (1, 0)");
  }

  // 5. Usuários e Níveis de Acesso
  const userCheck = db.exec("SELECT COUNT(*) as count FROM users");
  const userCount = userCheck[0]?.values[0][0] || 0;
  if (userCount === 0) {
    const now = new Date().toISOString();
    const defaultUsers = [
      ['usr_rafael', 'Rafael', 'rafael@mega12.com.br', '123456', 'diretoria', 'Diretor Geral / Administrador', '(42) 99999-1111', 1, now, now],
      ['usr_jorge', 'Jorge', 'jorge@mega12.com.br', '123456', 'conferente', 'Conferente de Separação / Doca', '(42) 99999-2222', 1, now, now]
    ];

    defaultUsers.forEach(u => {
      db.run(`INSERT INTO users VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, u);
    });
  }

  // 6. Catálogo de Produtos com Fotos
  const now = new Date().toISOString();
  const defaultProducts = [
    ['prod_1', 'PRD-001', 'Garrafa Térmica Inox 1L com Termômetro Digital', 'Utilidades Térmicas', 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=300&auto=format&fit=crop&q=80', 12, 18.50, 49.90, '9617.00.10', '7891000100011', 'sup_1', 'Brasil Plásticos', 1, now, now],
    ['prod_2', 'PRD-002', 'Conjunto 6 Taças de Cristal Lapidado 320ml', 'Vidros & Cristais', 'https://images.unsplash.com/photo-1574053415387-a25475d4088d?w=300&auto=format&fit=crop&q=80', 6, 28.00, 79.90, '7013.22.00', '7891000100028', 'sup_2', 'Paraná Bazar', 1, now, now],
    ['prod_3', 'PRD-003', 'Kit 4 Potes Herméticos de Vidro com Tampa Bambu', 'Organizadores', 'https://images.unsplash.com/photo-1584990347449-399a9a3b6fcf?w=300&auto=format&fit=crop&q=80', 8, 22.90, 59.90, '7013.49.00', '7891000100035', 'sup_1', 'Brasil Plásticos', 1, now, now],
    ['prod_4', 'PRD-004', 'Luminária Decorativa LED Articulada de Mesa', 'Decoração & Presentes', 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=300&auto=format&fit=crop&q=80', 24, 14.20, 39.90, '9405.20.00', '7891000100042', 'sup_2', 'Paraná Bazar', 1, now, now],
    ['prod_5', 'PRD-005', 'Frigideira Antiaderente Cerâmica 24cm Granito', 'Panelas & Cozinha', 'https://images.unsplash.com/photo-1583778176476-4a8b02a64c01?w=300&auto=format&fit=crop&q=80', 10, 32.00, 89.90, '7615.10.00', '7891000100059', 'sup_3', 'Alumínios União', 1, now, now],
    ['prod_6', 'PRD-006', 'Aparelho de Jantar 16 Peças Cerâmica Nórdica', 'Mesa Posta', 'https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=300&auto=format&fit=crop&q=80', 2, 85.00, 229.00, '6912.00.00', '7891000100066', 'sup_2', 'Paraná Bazar', 1, now, now],
    ['prod_7', 'PRD-007', 'Jogo 6 Facas Cozinha Inox com Cepo de Madeira', 'Cutelaria', 'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=300&auto=format&fit=crop&q=80', 12, 38.00, 99.90, '8211.91.00', '7891000100073', 'sup_3', 'Alumínios União', 1, now, now],
    ['prod_8', 'PRD-008', 'Difusor de Aromas Elétrico Ultrassônico 300ml', 'Bem-Estar & Casa', 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=300&auto=format&fit=crop&q=80', 20, 24.50, 69.90, '8509.80.90', '7891000100080', 'sup_1', 'Brasil Plásticos', 1, now, now],
    ['prod_9', 'PRD-009', 'Organizador Giratório Multiuso Acrílico 360°', 'Organizadores', 'https://images.unsplash.com/photo-1584990347449-399a9a3b6fcf?w=300&auto=format&fit=crop&q=80', 15, 16.80, 44.90, '3924.90.00', '7891000100097', 'sup_1', 'Brasil Plásticos', 1, now, now],
    ['prod_10', 'PRD-010', 'Porta Retrato Luxo Dourado 15x20 com Vidro', 'Decoração & Presentes', 'https://images.unsplash.com/photo-1582582494705-f8ce0b0c24f0?w=300&auto=format&fit=crop&q=80', 30, 8.90, 24.90, '8306.30.00', '7891000100103', 'sup_2', 'Paraná Bazar', 1, now, now],
    ['prod_11', 'PRD-011', 'Mop Giratório 360° Pro com Balde Inox e 2 Refis Microfibra', 'Limpeza & Utilidades', 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&auto=format&fit=crop&q=80', 6, 34.50, 79.90, '9603.90.00', '7891000100110', 'sup_1', 'Brasil Plásticos', 1, now, now],
    ['prod_12', 'PRD-012', 'Mop Giratório 360° Pro com Balde Inox e 2 Refis Microfibra', 'Limpeza & Utilidades', 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&auto=format&fit=crop&q=80', 6, 38.90, 84.90, '9603.90.00', '7891000100127', 'sup_2', 'Paraná Bazar', 1, now, now],
    ['prod_13', 'PRD-013', 'Mop Giratório 360° Pro com Balde Inox e 2 Refis Microfibra', 'Limpeza & Utilidades', 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=300&auto=format&fit=crop&q=80', 8, 31.80, 74.90, '9603.90.00', '7891000100134', 'sup_3', 'Alumínios União', 1, now, now],
    ['prod_14', 'PRD-014', 'Conjunto 3 Travessas Refratárias Retangulares em Vidro Opalino', 'Mesa Posta & Cozinha', 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=300&auto=format&fit=crop&q=80', 4, 42.00, 98.00, '7013.49.00', '7891000100141', 'sup_2', 'Paraná Bazar', 1, now, now],
    ['prod_15', 'PRD-015', 'Kit 6 Copos de Vidro Alto Diamond 350ml Transparente', 'Vidros & Cristais', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop&q=80', 12, 16.50, 39.90, '7013.37.00', '7891000100158', 'sup_2', 'Paraná Bazar', 1, now, now],
    ['prod_16', 'PRD-016', 'Panela de Pressão Alumínio Polido 4,5L Fechamento Externo', 'Panelas & Cozinha', 'https://images.unsplash.com/photo-1584990347449-399a9a3b6fcf?w=300&auto=format&fit=crop&q=80', 6, 58.00, 139.90, '7615.10.00', '7891000100165', 'sup_3', 'Alumínios União', 1, now, now],
    ['prod_17', 'PRD-017', 'Dispenser Automático de Sabonete Líquido com Sensor Infravermelho', 'Banheiro & Higiene', 'https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=300&auto=format&fit=crop&q=80', 20, 21.90, 54.90, '8509.80.90', '7891000100172', 'sup_1', 'Brasil Plásticos', 1, now, now],
    ['prod_18', 'PRD-018', 'Escorredor de Louças 2 Andares Inox Black com Porta Copos e Talheres', 'Organizadores', 'https://images.unsplash.com/photo-1583778176476-4a8b02a64c01?w=300&auto=format&fit=crop&q=80', 6, 46.50, 119.90, '7323.93.00', '7891000100189', 'sup_3', 'Alumínios União', 1, now, now],
    ['prod_19', 'PRD-019', 'Kit 5 Cabides Veludo Slim Antideslizante Bege', 'Organizadores', 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=300&auto=format&fit=crop&q=80', 30, 9.80, 24.90, '3924.90.00', '7891000100196', 'sup_1', 'Brasil Plásticos', 1, now, now],
    ['prod_20', 'PRD-020', 'Bandeja Espelhada Retangular Borda Dourada 30x20cm para Lavabo', 'Decoração & Presentes', 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?w=300&auto=format&fit=crop&q=80', 10, 26.00, 69.90, '7009.92.00', '7891000100202', 'sup_2', 'Paraná Bazar', 1, now, now],
    ['prod_21', 'PRD-021', 'Jogo de Assadeiras Antiaderente 3 Peças Redonda, Retangular e Torta', 'Panelas & Cozinha', 'https://images.unsplash.com/photo-1590794056226-79ef3a8147e1?w=300&auto=format&fit=crop&q=80', 8, 39.50, 89.90, '7615.10.00', '7891000100219', 'sup_3', 'Alumínios União', 1, now, now],
    ['prod_22', 'PRD-022', 'Garrafa Térmica Infantil com Canudo Silicone e Alça 500ml', 'Utilidades Térmicas', 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=300&auto=format&fit=crop&q=80', 16, 17.20, 44.90, '9617.00.10', '7891000100226', 'sup_1', 'Brasil Plásticos', 1, now, now],
    ['prod_23', 'PRD-023', 'Vaso Cerâmica Canelado Nórdico Matte 22cm Off-White', 'Decoração & Presentes', 'https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=300&auto=format&fit=crop&q=80', 12, 19.80, 49.90, '6913.90.00', '7891000100233', 'sup_2', 'Paraná Bazar', 1, now, now],
    ['prod_24', 'PRD-024', 'Caixa Organizadora Plástica Transparente com Trava e Rodízios 45L', 'Organizadores', 'https://images.unsplash.com/photo-1584990347449-399a9a3b6fcf?w=300&auto=format&fit=crop&q=80', 8, 29.90, 69.90, '3923.10.90', '7891000100240', 'sup_1', 'Brasil Plásticos', 1, now, now],
    ['prod_25', 'PRD-025', 'Faqueiro Aço Inox 24 Peças com Estojo Gaveta Laguna', 'Cutelaria', 'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=300&auto=format&fit=crop&q=80', 6, 54.00, 129.90, '8211.91.00', '7891000100257', 'sup_3', 'Alumínios União', 1, now, now],
    ['prod_26', 'PRD-026', 'Kit 3 Mini Bowls de Cerâmica com Base de Bambu para Petiscos', 'Mesa Posta', 'https://images.unsplash.com/photo-1614707267537-b85aaf00c4b7?w=300&auto=format&fit=crop&q=80', 12, 23.50, 59.90, '6912.00.00', '7891000100264', 'sup_2', 'Paraná Bazar', 1, now, now],
    ['prod_27', 'PRD-027', 'Bule Térmico Wave 1L com Ampola de Vidro e Cabo Madeira', 'Utilidades Térmicas', 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?w=300&auto=format&fit=crop&q=80', 10, 27.80, 64.90, '9617.00.10', '7891000100271', 'sup_1', 'Brasil Plásticos', 1, now, now],
    ['prod_28', 'PRD-028', 'Cuscuzeira Individual Alumínio Polido com Tampa de Vidro', 'Panelas & Cozinha', 'https://images.unsplash.com/photo-1584990347449-399a9a3b6fcf?w=300&auto=format&fit=crop&q=80', 12, 18.90, 42.90, '7615.10.00', '7891000100288', 'sup_3', 'Alumínios União', 1, now, now],
    ['prod_29', 'PRD-029', 'Relógio de Parede Silencioso Minimalista Scandinavian 30cm', 'Decoração & Presentes', 'https://images.unsplash.com/photo-1563861826100-9cb868fdbe1c?w=300&auto=format&fit=crop&q=80', 15, 22.00, 54.90, '9105.21.00', '7891000100295', 'sup_2', 'Paraná Bazar', 1, now, now],
    ['prod_30', 'PRD-030', 'Conjunto 4 Potes Herméticos Quadrados Empilháveis Slim', 'Organizadores', 'https://images.unsplash.com/photo-1584990347449-399a9a3b6fcf?w=300&auto=format&fit=crop&q=80', 10, 25.40, 62.90, '3924.90.00', '7891000100301', 'sup_1', 'Brasil Plásticos', 1, now, now]
  ];

    defaultProducts.forEach(p => {
      db.run(`INSERT OR IGNORE INTO products VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, p);
    });
}

module.exports = {
  getDatabase,
  saveDatabaseToDisk,
  dbPath
};
