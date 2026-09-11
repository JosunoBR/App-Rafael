const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const config = require('./environment');

const dbDir = process.env.DB_DIR || path.resolve(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, config.DB_FILENAME);

// Reset completo do banco de dados via variável de ambiente RESET_DATABASE=true
// Quando ativa, o arquivo do banco é excluído antes da inicialização, forçando
// a criação de um novo banco vazio com as tabelas padrão e seeds iniciais.
if (process.env.RESET_DATABASE === 'true') {
  try {
    if (fs.existsSync(dbPath)) {
      fs.unlinkSync(dbPath);
      console.log(`🗑️  RESET_DATABASE=true: banco de dados "${dbPath}" foi excluído. Um novo banco será criado do zero.`);
    } else {
      console.log('🗑️  RESET_DATABASE=true: nenhum banco de dados existente foi encontrado. Um novo banco será criado do zero.');
    }
  } catch (resetErr) {
    console.error('Erro ao tentar resetar o banco de dados:', resetErr.message);
  }
}

let dbInstance = null;

async function getDatabase() {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    dbInstance = new SQL.Database(fileBuffer);
  } else {
    dbInstance = new SQL.Database();
  }

  // Ativar verificação e integridade de chaves estrangeiras no SQLite
  try {
    dbInstance.run("PRAGMA foreign_keys = ON;");
  } catch (e) {
    console.warn('Aviso ao ativar PRAGMA foreign_keys:', e.message);
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
      telefoneEmpresa TEXT,
      endereco TEXT,
      email TEXT,
      observacoesDescarga TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS central_stock (
      id TEXT PRIMARY KEY,
      productId TEXT,
      codigoInterno TEXT,
      codigoFornecedor TEXT,
      codigoBarras TEXT,
      codigo TEXT,
      descricao TEXT NOT NULL,
      categoria TEXT,
      fotoUrl TEXT,
      saldoUnidades INTEGER NOT NULL DEFAULT 0,
      precoUnitario REAL NOT NULL DEFAULT 0,
      pdvSugerido REAL NOT NULL DEFAULT 12.0,
      localizacaoGalpao TEXT,
      fornecedorOrigem TEXT,
      dataUltimaEntrada TEXT,
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
      dataPedido TEXT,
      dataEmissao TEXT,
      dataEntregaPrevista TEXT,
      percentualDescontoOff REAL DEFAULT 0,
      percentualNota REAL DEFAULT 100,
      observacoes TEXT,
      status TEXT DEFAULT 'Em Cotação',
      separationStatus TEXT DEFAULT 'Pendente',
      totalLiquido REAL DEFAULT 0,
      totalPecas INTEGER DEFAULT 0,
      installmentsJson TEXT,
      fiscalConfigJson TEXT,
      aliquotaIpi REAL DEFAULT 0,
      aliquotaFrete REAL DEFAULT 0,
      aliquotaIcmsEntrada REAL DEFAULT 12,
      aliquotaCustoFixo REAL DEFAULT 26,
      aliquotaIcmsSaida REAL DEFAULT 19.5,
      aliquotaPisCofinsIr REAL DEFAULT 6,
      itemsJson TEXT NOT NULL DEFAULT '[]',
      separationDistributionJson TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS order_items (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      codigoInterno TEXT,
      codigoFornecedor TEXT,
      codigoBarras TEXT,
      codigo TEXT,
      descricao TEXT NOT NULL,
      fotoUrl TEXT,
      qtdNoPacote REAL DEFAULT 1,
      qtdPacotes REAL DEFAULT 0,
      qtdTotalUnidades INTEGER NOT NULL DEFAULT 0,
      precoUnitario REAL NOT NULL DEFAULT 0,
      valorTotalBruto REAL NOT NULL DEFAULT 0,
      percentualDesconto REAL DEFAULT 0,
      valorDescontoItem REAL DEFAULT 0,
      valorTotalLiquido REAL DEFAULT 0,
      pdvAlvo REAL NOT NULL DEFAULT 12.0,
      custoLoja REAL DEFAULT 0,
      custoFornecedor REAL DEFAULT 0,
      despesasPdvUnit REAL DEFAULT 0,
      creditoIcmsUnit REAL DEFAULT 0,
      custoRealEfetivo REAL DEFAULT 0,
      margemRealUnit REAL DEFAULT 0,
      margemPercentual REAL DEFAULT 0,
      qtdReservaEstoque INTEGER DEFAULT 0,
      separacaoManual INTEGER DEFAULT 0,
      separacaoLojasJson TEXT,
      ruptura INTEGER DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (orderId) REFERENCES purchase_orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_installments (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      numeroParcela INTEGER NOT NULL,
      totalParcelas INTEGER NOT NULL,
      dataVencimento TEXT NOT NULL,
      valor REAL NOT NULL DEFAULT 0,
      valorOriginal REAL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'A Vencer',
      dataPagamento TEXT,
      observacao TEXT,
      documentoRef TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (orderId) REFERENCES purchase_orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS order_avarias (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      itemId TEXT NOT NULL,
      codigoProduto TEXT,
      descricaoProduto TEXT,
      storeId TEXT NOT NULL,
      nomeLoja TEXT,
      quantidade INTEGER NOT NULL DEFAULT 0,
      unidadeMedida TEXT DEFAULT 'UN',
      custoUnitario REAL DEFAULT 0,
      valorPrejuizoTotal REAL DEFAULT 0,
      motivo TEXT NOT NULL,
      conferente TEXT,
      dataRegistro TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (orderId) REFERENCES purchase_orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS separation_audit_logs (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      numeroPedido TEXT NOT NULL,
      conferenteNome TEXT NOT NULL,
      conferenteId TEXT,
      statusAnterior TEXT,
      novoStatus TEXT NOT NULL,
      totalItensConferidos INTEGER DEFAULT 0,
      totalDivergencias INTEGER DEFAULT 0,
      observacoes TEXT,
      fotosJson TEXT,
      romaneioDataJson TEXT,
      timestamp TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (orderId) REFERENCES purchase_orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      codigo TEXT NOT NULL UNIQUE,
      descricao TEXT NOT NULL,
      categoria TEXT NOT NULL,
      subcategoria TEXT,
      fornecedorPadraoId TEXT,
      fornecedorPadraoNome TEXT,
      precoUnitarioPadrao REAL NOT NULL,
      pdvSugerido REAL NOT NULL DEFAULT 12.0,
      qtdPorPacote INTEGER NOT NULL DEFAULT 1,
      fotoUrl TEXT,
      ncm TEXT,
      eanBarcode TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      senha TEXT NOT NULL,
      role TEXT NOT NULL,
      cargo TEXT,
      telefone TEXT,
      ativo INTEGER NOT NULL DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS separation_presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      storeWeightsJson TEXT NOT NULL,
      reserveStockPercent REAL NOT NULL DEFAULT 10,
      isDefault INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fiscal_presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      ipiAliquota REAL NOT NULL DEFAULT 0.00,
      aliquotaSt REAL NOT NULL DEFAULT 0.00,
      freteAliquota REAL NOT NULL DEFAULT 0.00,
      creditoEntradaICMS REAL NOT NULL DEFAULT 0.12,
      custosFixos REAL NOT NULL DEFAULT 0.26,
      icmsAliquota REAL NOT NULL DEFAULT 0.19,
      pisCofinsAliquota REAL NOT NULL DEFAULT 0.06,
      isDefault INTEGER NOT NULL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );
  `);

  // Migrações automáticas de colunas
  try {
    const tableInfo = dbInstance.exec("PRAGMA table_info(purchase_orders)");
    if (tableInfo[0]) {
      const colNames = tableInfo[0].values.map(v => v[1]);
      const requiredCols = {
        dataPedido: "TEXT",
        dataEmissao: "TEXT",
        dataEntregaPrevista: "TEXT",
        totalLiquido: "REAL DEFAULT 0",
        totalPecas: "INTEGER DEFAULT 0",
        separationStatus: "TEXT DEFAULT 'Pendente'",
        observacoes: "TEXT",
        fiscalConfigJson: "TEXT",
        aliquotaIpi: "REAL DEFAULT 0",
        aliquotaFrete: "REAL DEFAULT 0",
        aliquotaIcmsEntrada: "REAL DEFAULT 12",
        aliquotaCustoFixo: "REAL DEFAULT 26",
        aliquotaIcmsSaida: "REAL DEFAULT 19.5",
        aliquotaPisCofinsIr: "REAL DEFAULT 6",
        itemsJson: "TEXT NOT NULL DEFAULT '[]'",
        separationDistributionJson: "TEXT",
        installmentsJson: "TEXT",
        percentualNota: "REAL DEFAULT 100",
        percentualDescontoOff: "REAL DEFAULT 0",
        aliquotaSt: "REAL DEFAULT 0",
        supplierId: "TEXT",
        vendedor: "TEXT",
        contatoVendedor: "TEXT",
        condicaoPagamento: "TEXT",
        formaPagamento: "TEXT",
        previsaoPagamento: "TEXT",
        tipoFrete: "TEXT DEFAULT 'CIF'",
        valorFrete: "REAL DEFAULT 0",
        descontoComercialTotal: "REAL DEFAULT 0",
        descontoComercialTipo: "TEXT DEFAULT '%'",
        isDraft: "INTEGER DEFAULT 0"
      };

      Object.entries(requiredCols).forEach(([col, def]) => {
        if (!colNames.includes(col)) {
          try { dbInstance.run(`ALTER TABLE purchase_orders ADD COLUMN ${col} ${def}`); } catch (e) {}
        }
      });
    }

    const prodTableInfo = dbInstance.exec("PRAGMA table_info(products)");
    if (prodTableInfo[0]) {
      const colNames = prodTableInfo[0].values.map(v => v[1]);
      const requiredProdCols = {
        codigoInterno: "TEXT",
        codigoFornecedor: "TEXT",
        codigoBarras: "TEXT",
        subcategoria: "TEXT",
        supplierId: "TEXT",
        nomeFornecedor: "TEXT",
        fotoUrl: "TEXT",
        qtdPorPacote: "REAL DEFAULT 1"
      };

      Object.entries(requiredProdCols).forEach(([col, def]) => {
        if (!colNames.includes(col)) {
          try { dbInstance.run(`ALTER TABLE products ADD COLUMN ${col} ${def}`); } catch (e) {}
        }
      });
    }

    const supTableInfo = dbInstance.exec("PRAGMA table_info(suppliers)");
    if (supTableInfo[0]) {
      const colNames = supTableInfo[0].values.map(v => v[1]);
      const requiredSupCols = {
        pedidoPadraoJson: "TEXT",
        percentualNotaPadrao: "REAL DEFAULT 100",
        observacoes: "TEXT",
        telefoneEmpresa: "TEXT",
        endereco: "TEXT",
        email: "TEXT"
      };

      Object.entries(requiredSupCols).forEach(([col, def]) => {
        if (!colNames.includes(col)) {
          try { dbInstance.run(`ALTER TABLE suppliers ADD COLUMN ${col} ${def}`); } catch (e) {}
        }
      });
    }

    const orderItemsTableInfo = dbInstance.exec("PRAGMA table_info(order_items)");
    if (orderItemsTableInfo[0]) {
      const colNames = orderItemsTableInfo[0].values.map(v => v[1]);
      const requiredItemCols = {
        codigoInterno: "TEXT",
        codigoFornecedor: "TEXT",
        percentualDesconto: "REAL DEFAULT 0",
        valorDescontoItem: "REAL DEFAULT 0",
        valorTotalLiquido: "REAL DEFAULT 0",
        qtdNoPacote: "REAL DEFAULT 1",
        qtdPacotes: "REAL DEFAULT 0",
        codigoBarras: "TEXT",
        custoLoja: "REAL DEFAULT 0",
        custoFornecedor: "REAL DEFAULT 0",
        separacaoLojasJson: "TEXT",
        separacaoManual: "INTEGER DEFAULT 0",
        qtdReservaEstoque: "INTEGER DEFAULT 0",
        ruptura: "INTEGER DEFAULT 0",
        createdAt: "TEXT",
        updatedAt: "TEXT"
      };

      Object.entries(requiredItemCols).forEach(([col, def]) => {
        if (!colNames.includes(col)) {
          try { dbInstance.run(`ALTER TABLE order_items ADD COLUMN ${col} ${def}`); } catch (e) {}
        }
      });
    }

    const orderInstTableInfo = dbInstance.exec("PRAGMA table_info(order_installments)");
    if (orderInstTableInfo[0]) {
      const colNames = orderInstTableInfo[0].values.map(v => v[1]);
      const requiredInstCols = {
        isBoletoFrete: "INTEGER DEFAULT 0",
        tipoTitulo: "TEXT DEFAULT 'mercadoria'",
        createdAt: "TEXT",
        updatedAt: "TEXT"
      };

      Object.entries(requiredInstCols).forEach(([col, def]) => {
        if (!colNames.includes(col)) {
          try { dbInstance.run(`ALTER TABLE order_installments ADD COLUMN ${col} ${def}`); } catch (e) {}
        }
      });
    }
  } catch (err) {
    console.error('Aviso na verificação de migrações:', err.message);
  }

  // Garantir usuário raiz (root) único e seguro no sistema
  try {
    const bcrypt = require('bcryptjs');
    const rootHash = bcrypt.hashSync('Athlon64', 10);
    const now = new Date().toISOString();

    // Remove qualquer resquício de logins de teste antigos
    try {
      dbInstance.run(`
        DELETE FROM users 
        WHERE id IN ('usr_rafael', 'usr_comprador', 'usr_conferente', 'usr_diretoria', 'usr_deposito', 'usr_separacao', 'usr_jorge', 'usr_marcos') 
           OR LOWER(email) IN ('diretoria@mega12.com.br', 'deposito@mega12.com.br', 'separacao@mega12.com.br', 'compras@mega12.com.br', 'jorge@mega12.com.br', 'marcos@mega12.com.br')
      `);
    } catch (cleanErr) {}

    // Verifica se usuário root já existe
    const rootCheck = dbInstance.exec("SELECT id FROM users WHERE LOWER(email) = 'root' OR id = 'usr_root' OR LOWER(nome) = 'root'");
    if (!rootCheck[0] || rootCheck[0].values.length === 0) {
      dbInstance.run(`
        INSERT INTO users (id, nome, email, senha, role, cargo, telefone, ativo, createdAt, updatedAt)
        VALUES ('usr_root', 'Root', 'root', ?, 'diretoria', 'Administrador Raiz (Root)', '', 1, ?, ?)
      `, [rootHash, now, now]);
      console.log('✔ Usuário root (Athlon64) inicializado no banco de dados.');
    } else {
      // Garante que a senha e privilégios estejam atualizados para Athlon64 e diretoria
      dbInstance.run(`
        UPDATE users 
        SET senha = ?, role = 'diretoria', ativo = 1, updatedAt = ? 
        WHERE LOWER(email) = 'root' OR id = 'usr_root' OR LOWER(nome) = 'root'
      `, [rootHash, now]);
    }
  } catch (userErr) {
    console.error('Aviso na inicialização do usuário root:', userErr.message);
  }

  // Seeder rico de dados e histórico de compras desde Janeiro de 2026
  try {
    const { runFullDatabaseSeed } = require('./seedData');
    runFullDatabaseSeed(dbInstance);
  } catch (seedErr) {
    console.error('Aviso no seeding de histórico:', seedErr.message);
  }

  // Regra de Negócio Central Rede Mega 12: Todos os produtos com PDV Sugerido travado em R$ 12,00
  try {
    dbInstance.run("UPDATE products SET pdvSugerido = 12.0;");
  } catch (e) {
    console.error('Aviso na sincronização de PDV para R$ 12,00:', e.message);
  }

  // Seed do modelo de separação padrão da Rede Mega 12 se a tabela estiver vazia
  try {
    const presetCheck = dbInstance.exec("SELECT COUNT(*) as count FROM separation_presets");
    if (presetCheck[0] && presetCheck[0].values[0][0] === 0) {
      const { DEFAULT_STORES } = require('./seedData');
      const storeWeights = {};
      DEFAULT_STORES.forEach(s => {
        storeWeights[s.id] = s.defaultWeight;
      });
      const now = new Date().toISOString();
      dbInstance.run(`
        INSERT INTO separation_presets (id, name, description, storeWeightsJson, reserveStockPercent, isDefault, createdAt, updatedAt)
        VALUES (
          'preset_default_clusters',
          'Padrão Rede (Clusters A, B e C)',
          'Distribuição oficial da Rede Mega 12 (10% CD • Cluster A 51.3% • Cluster B 33.3% • Cluster C 15.4%)',
          ?,
          10,
          1,
          '${now}',
          '${now}'
        )
      `, [JSON.stringify(storeWeights)]);
    }
  } catch (presetErr) {
    console.warn('Aviso no seeding de separation_presets:', presetErr.message);
  }

  // Seed dos modelos fiscais padrão da Rede Mega 12 se a tabela estiver vazia
  try {
    const fiscalPresetCheck = dbInstance.exec("SELECT COUNT(*) as count FROM fiscal_presets");
    if (fiscalPresetCheck[0] && fiscalPresetCheck[0].values[0][0] === 0) {
      const now = new Date().toISOString();
      dbInstance.run(`
        INSERT INTO fiscal_presets (
          id, name, description, ipiAliquota, aliquotaSt, freteAliquota,
          creditoEntradaICMS, custosFixos, icmsAliquota, pisCofinsAliquota,
          isDefault, createdAt, updatedAt
        ) VALUES 
          (
            'preset_fiscal_padrao',
            'Padrão Geral',
            'Padrão Geral Rede Mega 12 (ICMS Entrada 12%, CF 26%, ICMS Saída 19.5%, PIS/COF 6%)',
            0.00, 0.00, 0.00, 0.12, 0.26, 0.195, 0.06, 1, '${now}', '${now}'
          );
      `);
    }
  } catch (fiscPresetErr) {
    console.warn('Aviso no seeding de fiscal_presets:', fiscPresetErr.message);
  }

  saveDatabaseToDisk();

  return dbInstance;
}

function saveDatabaseToDisk() {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (err) {
    console.error('Erro ao salvar banco no disco:', err);
  }
}

// Helpers de Execução de Queries
async function queryAll(sql, params = []) {
  const db = await getDatabase();
  const res = db.exec(sql, params);
  if (!res[0]) return [];
  const columns = res[0].columns;
  return res[0].values.map(val => {
    const obj = {};
    columns.forEach((col, i) => { obj[col] = val[i]; });
    return obj;
  });
}

async function queryOne(sql, params = []) {
  const list = await queryAll(sql, params);
  return list.length > 0 ? list[0] : null;
}

async function execute(sql, params = []) {
  const db = await getDatabase();
  db.run(sql, params);
  saveDatabaseToDisk();
}

module.exports = {
  getDatabase,
  saveDatabaseToDisk,
  dbPath,
  queryAll,
  queryOne,
  execute
};
