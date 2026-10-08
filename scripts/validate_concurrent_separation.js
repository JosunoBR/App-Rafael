const assert = require('assert');
const { getDatabase } = require('../backend/src/config/database');
const orderRepository = require('../backend/src/repositories/orderRepository');

async function run() {
  await getDatabase();
  const timestamp = Date.now();
  const orderId = `test_concurrent_separation_${timestamp}`;
  const itemA = `item_a_${timestamp}`;
  const itemB = `item_b_${timestamp}`;

  try {
    const order = await orderRepository.save({
      header: {
        id: orderId,
        numeroPedido: `TEST-CONC-${timestamp}`,
        fornecedor: 'Teste de concorrência da doca',
        status: 'Em Separação',
        dataPedido: new Date().toISOString().slice(0, 10)
      },
      items: [
        { id: itemA, codigo: 'A', descricao: 'Produto A', qtdTotalUnidades: 1, separacaoLojas: { loja_01: 1 } },
        { id: itemB, codigo: 'B', descricao: 'Produto B', qtdTotalUnidades: 1, separacaoLojas: { loja_01: 1 } }
      ],
      installments: [],
      inspection: { conferenciaLojas: {} }
    });

    const sameInitialVersion = order.header.version;
    await Promise.all([
      orderRepository.updateSeparationCheck(
        orderId, 'loja_01', itemA, { conferido: true },
        { id: 'sep_a', nome: 'Separador A', role: 'separacao' }, sameInitialVersion
      ),
      orderRepository.updateSeparationCheck(
        orderId, 'loja_01', itemB, { conferido: true },
        { id: 'sep_b', nome: 'Separador B', role: 'separacao' }, sameInitialVersion
      )
    ]);

    const persisted = await orderRepository.findById(orderId);
    const checks = persisted.inspection?.conferenciaLojas || {};
    assert.strictEqual(checks[`loja_01_${itemA}`]?.conferido, true, 'Check do Separador A deve ser preservado');
    assert.strictEqual(checks[`loja_01_${itemB}`]?.conferido, true, 'Check do Separador B deve ser preservado');
    assert.strictEqual(checks[`loja_01_${itemA}`]?.conferenteNome, 'Separador A');
    assert.strictEqual(checks[`loja_01_${itemB}`]?.conferenteNome, 'Separador B');

    console.log('✅ Conferências simultâneas preservadas e sincronizadas sem conflito operacional.');
  } finally {
    await orderRepository.delete(orderId).catch(() => undefined);
  }
}

run().catch(error => {
  console.error('❌ Falha no teste de concorrência da separação:', error);
  process.exit(1);
});
