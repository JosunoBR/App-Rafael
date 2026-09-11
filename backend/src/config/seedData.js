/**
 * Seeder de Configurações Estruturais - Rede Mega 12
 * Mantém apenas estruturas fixas do sistema (Lojas e Configuração Fiscal Padrão).
 * Fornecedores, produtos, pedidos e estoque iniciam 100% zerados.
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

const DEFAULT_SUPPLIERS = [];
const DEFAULT_PRODUCTS = [];

function runFullDatabaseSeed(db) {
  const now = new Date().toISOString();

  // 1. Configuração Fiscal Padrão Global (se a tabela estiver vazia)
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

  // 2. Lojas da Rede (20 Lojas)
  const storeCheck = db.exec("SELECT COUNT(*) as count FROM stores");
  if (!storeCheck[0] || storeCheck[0].values[0][0] === 0) {
    DEFAULT_STORES.forEach(s => {
      db.run("INSERT INTO stores (id, name, cluster, defaultWeight, active) VALUES (?, ?, ?, ?, ?)", [s.id, s.name, s.cluster, s.defaultWeight, 1]);
    });
  }

  // Fornecedores, produtos, pedidos e estoque permanecem vazios.
}

module.exports = {
  runFullDatabaseSeed,
  DEFAULT_STORES,
  DEFAULT_SUPPLIERS,
  DEFAULT_PRODUCTS
};
