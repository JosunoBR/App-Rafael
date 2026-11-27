const { Router } = require('express');
const { randomUUID } = require('node:crypto');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requirePermission } = require('../middlewares/rbac.middleware');
const { queryAll, queryOne, execute, withTransaction } = require('../config/database');

const router = Router();
router.use(authMiddleware);
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
const action = work => async (req, res) => {
  try { res.setHeader('Cache-Control', 'no-store'); res.json(await work(req)); }
  catch (error) { if ((error.status || 500) >= 500) console.error('[fechamentos]', error.message); res.status(error.status || 500).json({ error: error.status ? error.message : 'Não foi possível processar o fechamento.' }); }
};
const cents = value => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || Math.round(value * 100) !== value * 100 && Math.abs(Math.round(value * 100) - value * 100) > 0.00001) throw fail('Valor monetário inválido.');
  return Math.round(value * 100);
};
const validDate = date => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;
const isDirector = user => ['root', 'diretoria'].includes(user.role) || user.id === 'usr_root';
const allowedStore = (req, storeId) => isDirector(req.user) || (req.user.role === 'unidade' && req.user.storeId === storeId);

router.get('/', (req,res,next) => requirePermission(req.user.role === 'unidade' ? 'nav:store_portal' : 'nav:units_conference', 'faturamento')(req,res,next), action(async req => {
  const { month, storeId } = req.query;
  if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw fail('Mês inválido.');
  if (storeId && (typeof storeId !== 'string' || storeId.length > 100)) throw fail('Unidade inválida.');
  if (req.user.role === 'unidade' && (!req.user.storeId || (storeId && storeId !== req.user.storeId))) throw fail('Acesso à unidade negado.', 403);
  const params = [];
  let where = 'WHERE 1=1';
  if (month) { where += ' AND c.closingDate LIKE ?'; params.push(`${month}-%`); }
  if (storeId) { where += ' AND c.storeId = ?'; params.push(storeId); }
  if (req.user.role === 'unidade') { where += ' AND c.storeId = ?'; params.push(req.user.storeId); }
  const rows = await queryAll(`WITH expense_totals AS (
      SELECT closingId,SUM(amountCents) AS amountCents FROM store_daily_expenses GROUP BY closingId
    ), closing_balances AS (
      SELECT c.*,COALESCE(SUM(CASE WHEN c.status='aprovado' THEN c.cashCents-COALESCE(e.amountCents,0) ELSE 0 END)
        OVER(PARTITION BY c.storeId ORDER BY c.closingDate ROWS BETWEEN UNBOUNDED PRECEDING AND 1 PRECEDING),0) AS cashBalanceBeforeDateCents
      FROM store_daily_closings c LEFT JOIN expense_totals e ON e.closingId=c.id
    )
    SELECT c.*,s.name AS storeName,s.shortName,c.submittedByName AS responsibleName
    FROM closing_balances c JOIN stores s ON s.id=c.storeId ${where} ORDER BY c.closingDate DESC,s.name`, params);
  return Promise.all(rows.map(async row => ({ ...row, expenses: await queryAll('SELECT id,description,amountCents,financialEntryId,movementType FROM store_daily_expenses WHERE closingId = ?', [row.id]) })));
}));

router.get('/monthly-sales', requirePermission('nav:units_history', 'financeiro'), action(async () => {
  return queryAll(`SELECT s.id AS storeId,s.name AS storeName,substr(c.closingDate,1,7) AS month,
    SUM(c.salesCents) AS salesCents, SUM(COALESCE(c.salesCount,0)) AS salesCount
    FROM store_daily_closings c JOIN stores s ON s.id=c.storeId
    WHERE c.status='aprovado' GROUP BY s.id,substr(c.closingDate,1,7) ORDER BY month,s.name`);
}));

router.put('/:storeId/:date', requirePermission('units:submit', 'unidade'), action(async req => withTransaction(async () => {
  const { storeId, date } = req.params;
  if (!allowedStore(req, storeId)) throw fail('Acesso à unidade negado.', 403);
  if ((await require('../services/holidays.service').activeClosures(storeId, date)).length) throw fail('Esta data está aprovada como sem expediente. Solicite a reabertura antes de enviar o fechamento.', 409);
  if (!validDate(date)) throw fail('Data inválida.');
  if (!await queryOne('SELECT id FROM stores WHERE id=? AND active=1', [storeId])) throw fail('Unidade não cadastrada ou inativa.', 404);
  const data = req.body || {};
  if (data.responsavelFechamento !== undefined && (typeof data.responsavelFechamento !== 'string' || data.responsavelFechamento.length > 150)) throw fail('Informe o nome do responsável pelo fechamento (até 150 caracteres).');
  const responsibleName = data.responsavelFechamento?.trim() || null;
  const existing = await queryOne('SELECT * FROM store_daily_closings WHERE storeId=? AND closingDate=?', [storeId, date]);
  if (existing?.status === 'aprovado') throw fail('Fechamento aprovado não pode ser alterado.', 409);
  if (!Array.isArray(data.despesas) || data.despesas.length > 100) throw fail('Lista de gastos inválida.');
  const expenses = data.despesas.map(item => {
    if (!item || typeof item.descricao !== 'string' || !item.descricao.trim() || item.descricao.length > 500) throw fail('Descrição do gasto inválida.');
    const movementType = item.tipo ?? 'despesa';
    if (!['despesa','deposito','vale_funcionario'].includes(movementType)) throw fail('Tipo de saída inválido. Selecione Despesa, Depósito ou Vale funcionário.');
    const amount = cents(item.valor);
    if (!amount) throw fail('O valor da saída deve ser maior que zero.');
    return { id: randomUUID(), description: item.descricao.trim(), amount, movementType };
  });
  if (data.quantidadeVendas != null && (!Number.isInteger(data.quantidadeVendas) || data.quantidadeVendas < 0)) throw fail('Quantidade de vendas inválida.');
  if (typeof data.memorando !== 'string' || data.memorando.length > 5000) throw fail('Memorando inválido.');
  const payment = data.meiosPagamento || {};
  const amounts = ['dinheiro','pixKais','pixStone','pixCnpj','cartaoDebito','cartaoCredito'].map(key => cents(payment[key] ?? 0));
  const sales = cents(data.vendaTotal);
  const id = existing?.id || randomUUID(), now = new Date().toISOString();
  await execute(`INSERT INTO store_daily_closings(id,storeId,closingDate,status,salesCents,salesCount,cashCents,pixKaisCents,pixStoneCents,pixCnpjCents,debitCents,creditCents,memo,submittedBy,submittedByName,createdAt,updatedAt)
    VALUES(?,?,?,'aguardando',?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(storeId,closingDate) DO UPDATE SET status='aguardando',salesCents=excluded.salesCents,salesCount=excluded.salesCount,cashCents=excluded.cashCents,pixKaisCents=excluded.pixKaisCents,pixStoneCents=excluded.pixStoneCents,pixCnpjCents=excluded.pixCnpjCents,debitCents=excluded.debitCents,creditCents=excluded.creditCents,memo=excluded.memo,submittedBy=excluded.submittedBy,submittedByName=excluded.submittedByName,updatedAt=excluded.updatedAt,reviewNote=NULL`,
    [id,storeId,date,sales,data.quantidadeVendas ?? null,...amounts,data.memorando,req.user.id,responsibleName,now,now]);
  await execute('DELETE FROM store_daily_expenses WHERE closingId=?', [id]);
  for (const expense of expenses) await execute('INSERT INTO store_daily_expenses(id,closingId,description,amountCents,movementType) VALUES(?,?,?,?,?)', [expense.id,id,expense.description,expense.amount,expense.movementType]);
  return { id, status: 'aguardando' };
})));

router.post('/:id/review', requirePermission('nav:units_conference', 'faturamento'), action(async req => withTransaction(async () => {
  const closing = await queryOne('SELECT c.*,s.name AS storeName FROM store_daily_closings c JOIN stores s ON s.id=c.storeId WHERE c.id=?', [req.params.id]);
  if (!closing) throw fail('Fechamento não encontrado.', 404);
  if (closing.status === 'aprovado') throw fail('Fechamento já aprovado.', 409);
  const { decision, note } = req.body || {};
  if (!['aprovado','devolvido'].includes(decision) || typeof note !== 'string' || note.length > 2000 || (decision === 'devolvido' && !note.trim())) throw fail('Conferência inválida.');
  const now = new Date().toISOString();
  await execute('UPDATE store_daily_closings SET status=?,reviewNote=?,reviewedBy=?,reviewedAt=?,updatedAt=? WHERE id=?', [decision,note.trim(),req.user.id,now,now,closing.id]);
  if (decision === 'aprovado') {
    const expenses = await queryAll('SELECT * FROM store_daily_expenses WHERE closingId=?', [closing.id]);
    for (const expense of expenses) {
      if (expense.movementType !== 'despesa') continue;
      const entryId = `store-expense:${expense.id}`;
      await execute(`INSERT INTO financial_entries(id,tipo,descricao,categoria,storeId,lojaNome,formaPagamento,documentoRef,dataVencimento,valor,status,dataPagamento,valorPago,observacao,createdAt,updatedAt)
        VALUES(?,'despesa',?,'OPERACIONAL',?,?,'DINHEIRO',?,?,?,'Pago',?,?,?, ?,?)`,
        [entryId,expense.description,closing.storeId,closing.storeName,`Fechamento ${closing.closingDate}`,closing.closingDate,expense.amountCents/100,closing.closingDate,expense.amountCents/100,`Gasto do caixa da unidade; fechamento ${closing.id}`,now,now]);
      await execute('UPDATE store_daily_expenses SET financialEntryId=? WHERE id=?', [entryId,expense.id]);
      await execute(`INSERT INTO financial_audit_logs(id,entryId,descricao,usuarioId,usuarioNome,usuarioRole,acao,observacao,timestamp,createdAt)
        VALUES(?,?,?,?,?,?,?,?,?,?)`, [randomUUID(),entryId,expense.description,req.user.id,req.user.nome || 'Financeiro',req.user.role,
        'criado_por_fechamento',`Despesa paga do fechamento ${closing.id}`,now,now]);
    }
  }
  return { id: closing.id, status: decision };
})));
module.exports = router;
