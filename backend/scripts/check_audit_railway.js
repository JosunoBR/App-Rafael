const { queryAll, queryOne } = require('./src/config/database');
(async () => {
  const o = await queryOne("SELECT * FROM purchase_orders WHERE numeroPedido LIKE '%140928%'");
  console.log('ORDER:', o ? {
    id: o.id,
    numeroPedido: o.numeroPedido,
    fornecedor: o.fornecedor,
    status: o.status,
    createdAt: o.createdAt,
    distribuicaoConcluida: o.distribuicaoConcluida,
    distribuidoPor: o.distribuidoPor,
    dataDistribuicao: o.dataDistribuicao
  } : 'null');
  
  if (o) {
    const logs = await queryAll("SELECT * FROM order_distribution_logs WHERE numeroPedido = ? OR orderId = ?", [o.numeroPedido, o.id]);
    console.log('DIST_LOGS count:', logs.length);
    console.log('DIST_LOGS:', logs);
  }
})();
