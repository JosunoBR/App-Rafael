const assert = require('assert');
const { getDatabase, execute } = require('../backend/src/config/database');
const { idempotencyMiddleware } = require('../backend/src/middlewares/idempotency.middleware');

async function run() {
  await getDatabase();
  const key = `test-idempotency-${Date.now()}`;
  let executions = 0;

  const invoke = body => new Promise((resolve, reject) => {
    const req = {
      method: 'POST',
      originalUrl: '/api/orders/test-operation',
      body,
      get: header => header === 'Idempotency-Key' ? key : undefined
    };
    const res = {
      statusCode: 200,
      status(code) { this.statusCode = code; return this; },
      json(payload) { resolve({ status: this.statusCode, body: payload }); return this; },
      on() { return this; }
    };

    idempotencyMiddleware(req, res, error => {
      if (error) return reject(error);
      executions += 1;
      res.status(201).json({ success: true, operationNumber: executions });
    });
  });

  try {
    const first = await invoke({ orderId: 'PED-1', action: 'confirm' });
    const duplicate = await invoke({ orderId: 'PED-1', action: 'confirm' });
    const divergent = await invoke({ orderId: 'PED-2', action: 'confirm' });

    assert.strictEqual(first.status, 201);
    assert.deepStrictEqual(duplicate, first, 'A resposta duplicada deve reutilizar o primeiro resultado');
    assert.strictEqual(executions, 1, 'A operação protegida deve executar somente uma vez');
    assert.strictEqual(divergent.status, 409, 'A mesma chave não pode proteger dados diferentes');
    console.log('✅ Idempotência bloqueou duplicidade e reutilização divergente da chave.');
  } finally {
    await execute('DELETE FROM idempotency_records WHERE idempotencyKey = ?', [key]);
  }
}

run().catch(error => {
  console.error('❌ Falha no teste de idempotência:', error);
  process.exit(1);
});
