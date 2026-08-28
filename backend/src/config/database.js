const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const config = require('./environment');

const dbDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, config.DB_FILENAME);

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
      itemsJson TEXT NOT NULL,
      separationDistributionJson TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
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
      createdAt TEXT NOT NULL
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
      pdvSugerido REAL NOT NULL,
      qtdPorPacote INTEGER NOT NULL DEFAULT 12,
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
  `);

  // Migrações automáticas de colunas
  try {
    const tableInfo = dbInstance.exec("PRAGMA table_info(purchase_orders)");
    if (tableInfo[0]) {
      const colNames = tableInfo[0].values.map(v => v[1]);
      if (!colNames.includes('installmentsJson')) {
        dbInstance.run("ALTER TABLE purchase_orders ADD COLUMN installmentsJson TEXT");
      }
      if (!colNames.includes('percentualNota')) {
        dbInstance.run("ALTER TABLE purchase_orders ADD COLUMN percentualNota REAL DEFAULT 100");
      }
    }
  } catch (err) {
    console.error('Aviso na verificação de migrações:', err.message);
  }

  // Seed de usuários padrão se a tabela estiver vazia
  const userCheck = dbInstance.exec("SELECT COUNT(*) as count FROM users");
  if (userCheck[0] && userCheck[0].values[0][0] === 0) {
    const now = new Date().toISOString();
    // Inserir senhas padrão (serão hasheadas automaticamente no login)
    dbInstance.run(`
      INSERT INTO users (id, nome, email, senha, role, cargo, telefone, ativo, createdAt, updatedAt)
      VALUES 
        ('usr_rafael', 'Rafael (Diretoria)', 'diretoria@mega12.com.br', '123456', 'diretoria', 'Diretor Geral', '(42) 99999-0001', 1, '${now}', '${now}'),
        ('usr_comprador', 'Mariana Compras', 'compras@mega12.com.br', '123456', 'comprador', 'Compradora Pleno', '(42) 99999-0002', 1, '${now}', '${now}'),
        ('usr_conferente', 'Jorge Doca (Separação)', 'separacao@mega12.com.br', '123456', 'conferente', 'Conferente Líder Doca', '(42) 99999-0003', 1, '${now}', '${now}')
    `);
    saveDatabaseToDisk();
  }

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
