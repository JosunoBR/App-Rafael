const fs = require('node:fs');
const path = require('node:path');
const repository = require('../repositories/goalsRepository');
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const seedPath = path.resolve(__dirname, '../data/goalsWorkbookSeed.json');
async function importSeed(actor) {
  if (!fs.existsSync(seedPath)) throw fail('A planilha ainda não foi preparada para importação.', 503);
  return repository.importWorkbook(JSON.parse(fs.readFileSync(seedPath, 'utf8')), actor);
}
let initialization;
async function ensureSeed() {
  if (await repository.findWorkbook()) return;
  initialization ??= importSeed('system:initial-import').catch(error => { initialization = null; throw error; });
  await initialization;
}
function validatePeriod(year, month) {
  if (!Number.isInteger(year) || year < 1900 || year > 2100 || !Number.isInteger(month) || month < 1 || month > 12) throw fail('Informe um mês e ano válidos.');
}
function validatePlans(body) {
  if (!body || typeof body !== 'object') throw fail('Informe as metas a salvar.');
  validatePeriod(body.year, body.month);
  if (!Array.isArray(body.plans) || body.plans.length < 1 || body.plans.length > 500) throw fail('Informe entre 1 e 500 metas.');
  const ids = new Set();
  for (const plan of body.plans) {
    if (!plan || typeof plan.storeId !== 'string' || !plan.storeId || plan.storeId.length > 200 || ids.has(plan.storeId)) throw fail('Loja inválida ou repetida.');
    ids.add(plan.storeId);
    if (!Number.isInteger(plan.version) || plan.version < 0) throw fail('Versão da meta inválida.');
    if (plan.amount !== null && (typeof plan.amount !== 'number' || !Number.isFinite(plan.amount) || plan.amount < 0 || plan.amount > 1e12)) throw fail('A meta deve ser um valor positivo ou zero.');
  }
  return body;
}
module.exports = { ensureSeed, importSeed, validatePeriod, validatePlans };
