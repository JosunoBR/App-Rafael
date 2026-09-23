const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const config = require('./environment');

const dbDir = process.env.DB_DIR || path.resolve(__dirname, '../../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, config.DB_FILENAME);

let dbInstance = null;

async function getDatabase() {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    // 🛡️ Criar backup preventivo automático antes de carregar
    try {
      const backupDir = path.join(dbDir, 'backups');
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }
      const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
      const backupFile = path.join(backupDir, `mega12_${dateStr}.db`);
      fs.copyFileSync(dbPath, backupFile);
      console.log(`🛡️ Backup preventivo criado com sucesso: ${path.basename(backupFile)}`);

      // Manter até 20 backups históricos rotativos
      const existingBackups = fs.readdirSync(backupDir)
        .filter(f => f.startsWith('mega12_') && f.endsWith('.db'))
        .sort();
      while (existingBackups.length > 20) {
        const oldest = existingBackups.shift();
        fs.unlinkSync(path.join(backupDir, oldest));
      }
    } catch (bakErr) {
      console.warn('Aviso na criação de backup preventivo:', bakErr.message);
    }

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
      shortName TEXT,
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
      paymentConfigJson TEXT,
      inspectionJson TEXT,
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

    CREATE TABLE IF NOT EXISTS order_distribution_logs (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      numeroPedido TEXT NOT NULL,
      fornecedor TEXT,
      usuarioId TEXT,
      usuarioNome TEXT NOT NULL,
      usuarioRole TEXT NOT NULL,
      acao TEXT NOT NULL,
      lojasAfetadasJson TEXT,
      totalPecasDistribuidas INTEGER DEFAULT 0,
      detalhesJson TEXT,
      observacoes TEXT,
      timestamp TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (orderId) REFERENCES purchase_orders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS financial_audit_logs (
      id TEXT PRIMARY KEY,
      entryId TEXT,
      orderId TEXT,
      numeroPedido TEXT,
      descricao TEXT,
      usuarioId TEXT,
      usuarioNome TEXT NOT NULL,
      usuarioRole TEXT NOT NULL,
      acao TEXT NOT NULL,
      campoAlterado TEXT,
      valorAnterior TEXT,
      valorNovo TEXT,
      snapshotJson TEXT,
      observacao TEXT,
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
      permissions TEXT DEFAULT '{}',
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

    CREATE TABLE IF NOT EXISTS payment_conditions (
      id TEXT PRIMARY KEY,
      descricao TEXT NOT NULL,
      qtdParcelas INTEGER NOT NULL DEFAULT 1,
      parcelasDiasJson TEXT NOT NULL DEFAULT '[]',
      especie TEXT DEFAULT 'Boleto',
      banco TEXT DEFAULT '',
      ativo INTEGER NOT NULL DEFAULT 1,
      padrao INTEGER NOT NULL DEFAULT 0,
      observacao TEXT DEFAULT '',
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS financial_entries (
      id TEXT PRIMARY KEY,
      tipo TEXT NOT NULL DEFAULT 'despesa', -- 'despesa' | 'pedido_parcela'
      orderId TEXT,
      installmentId TEXT,
      descricao TEXT NOT NULL,
      categoria TEXT NOT NULL DEFAULT 'OPERACIONAL', -- 'FIXO', 'PRODUTOS', 'RH', 'OPERACIONAL', 'IMPOSTOS', 'INVESTIMENTOS', 'OUTROS'
      fornecedor TEXT,
      storeId TEXT,
      lojaNome TEXT,
      empresa TEXT DEFAULT 'ALS', -- 'ALS', 'CONECTA', 'MEGA 12 MATRIZ'
      formaPagamento TEXT NOT NULL DEFAULT 'BOLETO', -- 'BOLETO', 'DINHEIRO', 'PIX', 'DEPOSITO', 'CARTAO', 'CHEQUE'
      bancoConta TEXT DEFAULT '',
      documentoRef TEXT DEFAULT '',
      parcelaNumero INTEGER DEFAULT 1,
      parcelaTotal INTEGER DEFAULT 1,
      parcelaDesc TEXT DEFAULT 'Única',
      dataVencimento TEXT NOT NULL, -- YYYY-MM-DD
      valor REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'A Vencer', -- 'A Vencer', 'Vence Hoje', 'Em Atraso', 'Pago', 'Cancelado'
      dataPagamento TEXT, -- YYYY-MM-DD
      valorPago REAL DEFAULT 0,
      observacao TEXT DEFAULT '',
      recorrente INTEGER DEFAULT 0,
      recorrenciaId TEXT,
      statusPrevisao TEXT NOT NULL DEFAULT 'CONFIRMADO', -- 'PREVISTO' | 'CONFIRMADO'
      comprovanteNome TEXT,
      comprovanteTipo TEXT,
      comprovanteTamanho INTEGER,
      comprovanteArquivo TEXT,
      comprovanteUrl TEXT,
      comprovantesJson TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL,
      FOREIGN KEY (orderId) REFERENCES purchase_orders(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_fin_vencimento ON financial_entries(dataVencimento);
    CREATE INDEX IF NOT EXISTS idx_fin_status ON financial_entries(status);
    CREATE INDEX IF NOT EXISTS idx_fin_categoria ON financial_entries(categoria);
    CREATE INDEX IF NOT EXISTS idx_fin_loja ON financial_entries(lojaNome);
    CREATE INDEX IF NOT EXISTS idx_fin_order ON financial_entries(orderId);

    CREATE TABLE IF NOT EXISTS order_deletion_logs (
      id TEXT PRIMARY KEY,
      orderId TEXT NOT NULL,
      numeroPedido TEXT NOT NULL,
      tipoPedido TEXT NOT NULL, -- 'transferencia_cd' | 'compra_fornecedor'
      fornecedor TEXT,
      solicitadoPorNome TEXT NOT NULL,
      solicitadoPorEmail TEXT NOT NULL,
      autorizadoPorNome TEXT NOT NULL,
      autorizadoPorEmail TEXT NOT NULL,
      motivo TEXT NOT NULL,
      totalPecasEstornadas INTEGER DEFAULT 0,
      totalValor REAL DEFAULT 0,
      snapshotJson TEXT NOT NULL,
      dataExclusao TEXT NOT NULL,
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_del_order ON order_deletion_logs(numeroPedido);
    CREATE INDEX IF NOT EXISTS idx_del_data ON order_deletion_logs(dataExclusao);
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
        totalBruto: "REAL DEFAULT 0",
        totalIpi: "REAL DEFAULT 0",
        totalDesconto: "REAL DEFAULT 0",
        totalLiquido: "REAL DEFAULT 0",
        totalGeral: "REAL DEFAULT 0",
        totalVolumes: "INTEGER DEFAULT 0",
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
        paymentConfigJson: "TEXT",
        tipoFrete: "TEXT DEFAULT 'CIF'",
        valorFrete: "REAL DEFAULT 0",
        descontoComercialTotal: "REAL DEFAULT 0",
        descontoComercialTipo: "TEXT DEFAULT '%'",
        inspectionJson: "TEXT",
        isDraft: "INTEGER DEFAULT 0",
        recebidoMatriz: "INTEGER DEFAULT 0",
        dataRecebimentoMatriz: "TEXT",
        recebidoPor: "TEXT",
        numeroNotaFiscal: "TEXT",
        boletosLiberados: "INTEGER DEFAULT 0",
        boletosLiberadosPor: "TEXT",
        boletosLiberadosEm: "TEXT",
        distribuicaoConcluida: "INTEGER DEFAULT 0",
        distribuidoPor: "TEXT",
        dataDistribuicao: "TEXT",
        observacaoDistribuicao: "TEXT",
        separacaoConcluida: "INTEGER DEFAULT 0",
        separadoPor: "TEXT",
        dataSeparacao: "TEXT",
        observacaoSeparacao: "TEXT",
        finalizadoPor: "TEXT",
        dataFinalizacao: "TEXT",
        aprovadoPor: "TEXT",
        dataAprovacao: "TEXT"
      };

      Object.entries(requiredCols).forEach(([col, def]) => {
        if (!colNames.includes(col)) {
          try { dbInstance.run(`ALTER TABLE purchase_orders ADD COLUMN ${col} ${def}`); } catch (e) {}
        }
      });

      // 🔄 Migração de compatibilidade da esteira (5 etapas): converte 'Em Distribuição' para 'Em Separação' ou 'Aprovado'
      try {
        dbInstance.run(`
          UPDATE purchase_orders 
          SET status = CASE 
            WHEN distribuicaoConcluida = 1 THEN 'Em Separação' 
            ELSE 'Aprovado' 
          END 
          WHERE status = 'Em Distribuição';
        `);
      } catch (sepMigErr) {
        console.warn('Aviso ao migrar status Em Distribuição para 5 etapas:', sepMigErr.message);
      }

      // 🛡️ Integridade de Dados: Garante unicidade estrita e case-insensitive do número do pedido
      try {
        dbInstance.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_purchase_orders_numero_nocase ON purchase_orders(numeroPedido COLLATE NOCASE);`);
      } catch (idxErr) {
        console.warn('Aviso ao criar indice unico de numeroPedido:', idxErr.message);
      }
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
        qtdPorPacote: "REAL DEFAULT 1",
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

    try {
      const finTableInfo = dbInstance.exec("PRAGMA table_info(financial_entries)");
      if (finTableInfo[0]) {
        const colNames = finTableInfo[0].values.map(v => v[1]);
        if (!colNames.includes('comprovantesJson')) {
          try { dbInstance.run("ALTER TABLE financial_entries ADD COLUMN comprovantesJson TEXT"); } catch (e) {}
        }
      }
    } catch (finErr) {
      console.warn('Aviso ao verificar coluna comprovantesJson em financial_entries:', finErr.message);
    }

    // Migração de datas legadas para o formato brasileiro oficial (DD/MM/YYYY)
    try {
      dbInstance.run(`
        UPDATE financial_entries 
        SET dataVencimento = printf('%s/%s/%s', SUBSTR(dataVencimento, 9, 2), SUBSTR(dataVencimento, 6, 2), SUBSTR(dataVencimento, 1, 4))
        WHERE dataVencimento LIKE '____-__-__'
      `);
      dbInstance.run(`
        UPDATE financial_entries 
        SET dataPagamento = printf('%s/%s/%s', SUBSTR(dataPagamento, 9, 2), SUBSTR(dataPagamento, 6, 2), SUBSTR(dataPagamento, 1, 4))
        WHERE dataPagamento LIKE '____-__-__'
      `);
      dbInstance.run(`
        UPDATE order_installments 
        SET dataVencimento = printf('%s/%s/%s', SUBSTR(dataVencimento, 9, 2), SUBSTR(dataVencimento, 6, 2), SUBSTR(dataVencimento, 1, 4))
        WHERE dataVencimento LIKE '____-__-__'
      `);
      dbInstance.run(`
        UPDATE order_installments 
        SET dataPagamento = printf('%s/%s/%s', SUBSTR(dataPagamento, 9, 2), SUBSTR(dataPagamento, 6, 2), SUBSTR(dataPagamento, 1, 4))
        WHERE dataPagamento LIKE '____-__-__'
      `);
    } catch (dateErr) {
      console.warn('Aviso ao migrar datas para formato brasileiro:', dateErr.message);
    }
    // Migração de colunas da tabela stores (suporte a Nome Abreviado / Coluna)
    try {
      const storesTableInfo = dbInstance.exec("PRAGMA table_info(stores)");
      if (storesTableInfo[0]) {
        const colNames = storesTableInfo[0].values.map(v => v[1]);
        if (!colNames.includes('shortName')) {
          try { dbInstance.run("ALTER TABLE stores ADD COLUMN shortName TEXT"); } catch (e) {}
        }
      }
      // Inicializa shortName para lojas padrão ou com shortName vazio
      dbInstance.run(`
        UPDATE stores SET shortName = 'PG Centro' WHERE id = 'pg_centro' AND (shortName IS NULL OR shortName = '');
        UPDATE stores SET shortName = 'CD Central' WHERE id = 'deposito_central' AND (shortName IS NULL OR shortName = '');
        UPDATE stores SET shortName = name WHERE (shortName IS NULL OR shortName = '');
      `);
    } catch (e) {}
    // Migração de colunas da tabela financial_entries (suporte a boletos previstos e confirmados)
    try {
      const finTableInfo = dbInstance.exec("PRAGMA table_info(financial_entries)");
      if (finTableInfo[0]) {
        const colNames = finTableInfo[0].values.map(v => v[1]);
        if (!colNames.includes('statusPrevisao')) {
          try { dbInstance.run("ALTER TABLE financial_entries ADD COLUMN statusPrevisao TEXT DEFAULT 'CONFIRMADO'"); } catch (e) {}
        }
        if (!colNames.includes('recorrenciaId')) {
          try { dbInstance.run("ALTER TABLE financial_entries ADD COLUMN recorrenciaId TEXT"); } catch (e) {}
        }
        if (!colNames.includes('comprovanteNome')) {
          try { dbInstance.run("ALTER TABLE financial_entries ADD COLUMN comprovanteNome TEXT"); } catch (e) {}
        }
        if (!colNames.includes('comprovanteTipo')) {
          try { dbInstance.run("ALTER TABLE financial_entries ADD COLUMN comprovanteTipo TEXT"); } catch (e) {}
        }
        if (!colNames.includes('comprovanteTamanho')) {
          try { dbInstance.run("ALTER TABLE financial_entries ADD COLUMN comprovanteTamanho INTEGER"); } catch (e) {}
        }
        if (!colNames.includes('comprovanteArquivo')) {
          try { dbInstance.run("ALTER TABLE financial_entries ADD COLUMN comprovanteArquivo TEXT"); } catch (e) {}
        }
        if (!colNames.includes('comprovanteUrl')) {
          try { dbInstance.run("ALTER TABLE financial_entries ADD COLUMN comprovanteUrl TEXT"); } catch (e) {}
        }
      }
      try {
        dbInstance.run("CREATE INDEX IF NOT EXISTS idx_fin_status_previsao ON financial_entries(statusPrevisao)");
        dbInstance.run("CREATE INDEX IF NOT EXISTS idx_fin_recorrencia ON financial_entries(recorrenciaId)");
      } catch (e) {}
    } catch (e) {}
    // Sanitização de nomes de fornecedores de transferência e remoção de títulos indevidos
    try {
      dbInstance.run("UPDATE purchase_orders SET fornecedor = REPLACE(fornecedor, 'Depósito Central Mega 12', 'Depósito Central') WHERE fornecedor LIKE '%Depósito Central Mega 12%'");
      dbInstance.run("DELETE FROM financial_entries WHERE orderId LIKE 'order_transf_cd_%' OR documentoRef LIKE 'CD-%' OR fornecedor LIKE '%Transferência%'");
      dbInstance.run("DELETE FROM order_installments WHERE orderId LIKE 'order_transf_cd_%' OR orderId IN (SELECT id FROM purchase_orders WHERE supplierId = 'cd_matriz')");
    } catch (e) {}

    // Migração de permissões granulares por usuário na tabela users
    try {
      const usersTableInfo = dbInstance.exec("PRAGMA table_info(users)");
      if (usersTableInfo[0]) {
        const userCols = usersTableInfo[0].values.map(v => v[1]);
        if (!userCols.includes('permissions')) {
          try { dbInstance.run("ALTER TABLE users ADD COLUMN permissions TEXT DEFAULT '{}'"); } catch (e) {}
        }
      }
    } catch (e) {}
  } catch (err) {
    console.error('Aviso na verificação de migrações:', err.message);
  }

  // Garantir usuário raiz (root) único e seguro no sistema
  try {
    const bcrypt = require('bcryptjs');
    const rootHash = bcrypt.hashSync('Athlon64', 10);
    const now = new Date().toISOString();


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
    console.error("Aviso na inicializacao do usuario root:", userErr.message);
  }

  saveDatabaseToDisk();

  return dbInstance;
}

// Persistência em disco com debounce e gravação atômica assíncrona
let saveTimeout = null;
let isWritingDisk = false;
let pendingDiskSave = false;

function scheduleDatabaseSave(delayMs = 2000) {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveDatabaseToDiskAsync();
  }, delayMs);
}

async function saveDatabaseToDiskAsync() {
  if (!dbInstance) return;
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  if (isWritingDisk) {
    pendingDiskSave = true;
    return;
  }
  isWritingDisk = true;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    const tmpPath = `${dbPath}.tmp`;
    await fs.promises.writeFile(tmpPath, buffer);
    await fs.promises.rename(tmpPath, dbPath);
  } catch (err) {
    console.error('Erro ao salvar banco no disco assincronamente:', err);
  } finally {
    isWritingDisk = false;
    if (pendingDiskSave) {
      pendingDiskSave = false;
      scheduleDatabaseSave(500);
    }
  }
}

function saveDatabaseToDisk() {
  if (!dbInstance) return;
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    const tmpPath = `${dbPath}.tmp`;
    fs.writeFileSync(tmpPath, buffer);
    fs.renameSync(tmpPath, dbPath);
  } catch (err) {
    console.error('Erro ao salvar banco no disco sincronamente:', err);
  }
}

function flushDatabaseToDisk() {
  saveDatabaseToDisk();
}

// Garante flush imediato ao receber sinais de finalização do container
process.on('SIGTERM', () => {
  flushDatabaseToDisk();
});
process.on('SIGINT', () => {
  flushDatabaseToDisk();
});

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
  // Operação em memória concluída instantaneamente; disco é persistido em segundo plano com debounce
  scheduleDatabaseSave(2000);
}

module.exports = {
  getDatabase,
  saveDatabaseToDisk,
  scheduleDatabaseSave,
  flushDatabaseToDisk,
  dbPath,
  queryAll,
  queryOne,
  execute
};
