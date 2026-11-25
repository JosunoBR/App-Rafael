import assert from 'node:assert/strict';
import { createServer } from 'vite';
import { fileURLToPath } from 'node:url';
const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true }, appType: 'custom' });
try {
  const { compareTableValues } = await server.ssrLoadModule('/src/shared/useTableSort.ts');
  const values = [1000, null, -30, 0, 20, 2, undefined];
  assert.deepEqual([...values].sort((a,b) => compareTableValues(a,b,'asc')), [-30,0,2,20,1000,null,undefined]);
  assert.deepEqual([...values].sort((a,b) => compareTableValues(a,b,'desc')), [1000,20,2,0,-30,null,undefined]);
  assert.ok(compareTableValues('Unidade 2','Unidade 10','asc') < 0);
  assert.equal(compareTableValues('Ivaí','ivai','asc'), 0);
  assert.equal(compareTableValues(null,0,'desc'), 1);
  console.log('Ordenação: moeda numérica, negativos, zero, nomes e valores ausentes verificados.');
} finally { await server.close(); }
