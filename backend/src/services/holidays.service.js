const { randomUUID } = require('node:crypto');
const { queryAll, queryOne, execute, withTransaction } = require('../config/database');

const fail = (message, status = 400) => Object.assign(new Error(message), { status });
function validateDate(date) {
  if (typeof date !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0, 10) !== date) throw fail('Informe uma data válida entre 2000 e 2099.');
}
function text(value, name, required = true) {
  if (value === undefined && !required) return '';
  if (typeof value !== 'string' || (required && !value.trim()) || value.trim().length > 300) throw fail(`${name}: informe até 300 caracteres.`);
  return value.trim();
}
async function audit(id, action, actor, note = '') {
  await execute('INSERT INTO store_holiday_audit(id,holidayId,action,actorId,note,createdAt) VALUES(?,?,?,?,?,?)', [randomUUID(), id, action, actor.id, note, new Date().toISOString()]);
}
async function activeClosures(storeId, date) {
  return queryAll("SELECT * FROM store_holidays WHERE status='aprovado' AND action='fechar' AND holidayDate=? AND (storeId IS NULL OR storeId=?)", [date, storeId]);
}
async function ensureNoClosing(storeId, date) {
  const closing = await queryOne("SELECT id FROM store_daily_closings WHERE closingDate=? AND status IN ('aguardando','aprovado') AND (? IS NULL OR storeId=?) LIMIT 1", [date, storeId, storeId]);
  if (closing) throw fail('Já existe fechamento de caixa enviado ou aprovado nesta data. Resolva o lançamento antes de declarar o dia sem expediente.', 409);
}
async function list({ storeId, month } = {}) {
  if (storeId !== undefined && (typeof storeId !== 'string' || !storeId || storeId.length > 100)) throw fail('Unidade inválida.');
  if (month !== undefined && (typeof month !== 'string' || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(month))) throw fail('Mês inválido.');
  const params = [];
  let where = 'WHERE 1=1';
  if (storeId !== undefined) { where += ' AND (h.storeId=? OR h.storeId IS NULL)'; params.push(storeId); }
  if (month) { where += ' AND substr(h.holidayDate,1,7)=?'; params.push(month); }
  const rows = await queryAll(`SELECT h.*,s.name AS storeName,u.nome AS requesterName,r.nome AS reviewerName FROM store_holidays h LEFT JOIN stores s ON s.id=h.storeId LEFT JOIN users u ON u.id=h.requestedBy LEFT JOIN users r ON r.id=h.reviewedBy ${where} ORDER BY h.holidayDate DESC,h.createdAt DESC`, params);
  return rows.map(row => ({ id: row.id, lojaId: row.storeId, lojaNome: row.storeId ? row.storeName : 'Toda a rede', data: row.holidayDate, holidayName: row.name,
    action: row.action, targetId: row.targetId, scope: row.storeId ? 'unidade' : 'rede', status: row.status,
    solicitadoPor: row.requesterName || '', solicitadoEm: row.createdAt, motivoLoja: row.reason,
    respostaFinanceiro: row.reviewNote, respondidoPor: row.reviewerName || '', respondidoEm: row.reviewedAt }));
}
async function submit(actor, payload, global = false) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw fail('Dados do feriado inválidos.');
  validateDate(payload.date);
  const name = text(payload.name, 'Nome do feriado');
  const reason = text(payload.reason, 'Justificativa', false);
  const action = payload.action ?? 'fechar';
  if (!['fechar', 'reabrir'].includes(action) || (global && action !== 'fechar')) throw fail('Operação de feriado inválida.');
  const storeId = global ? null : actor.storeId;
  if (!global && !storeId) throw fail('Usuário sem unidade vinculada.', 403);
  // A unidade é obtida da sessão; nunca se aceita outra unidade enviada pelo cliente.
  if (payload.storeId !== undefined && payload.storeId !== storeId) throw fail('Acesso à unidade negado.', 403);
  return withTransaction(async () => {
    if (storeId && !(await queryOne('SELECT id FROM stores WHERE id=? AND active=1', [storeId]))) throw fail('Unidade indisponível.', 403);
    if (await queryOne("SELECT id FROM store_holidays WHERE COALESCE(storeId,'')=COALESCE(?,'') AND holidayDate=? AND status='pendente'", [storeId, payload.date])) throw fail('Já existe uma solicitação pendente nesta data.', 409);
    const closures = await activeClosures(storeId, payload.date);
    let targetId = null;
    if (action === 'reabrir') {
      const target = closures.find(row => row.storeId === storeId);
      if (!target || closures.some(row => row.storeId === null)) throw fail('Somente a central pode alterar um feriado geral. Para esta unidade, não há feriado local que possa ser reaberto.', 409);
      targetId = target.id;
    } else {
      if (closures.length) throw fail('Esta data já está declarada sem expediente.', 409);
      await ensureNoClosing(storeId, payload.date);
    }
    const id = randomUUID(), now = new Date().toISOString();
    await execute('INSERT INTO store_holidays(id,storeId,holidayDate,name,action,targetId,status,reason,requestedBy,createdAt,reviewedBy,reviewedAt) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)',
      [id, storeId, payload.date, name, action, targetId, global ? 'aprovado' : 'pendente', reason, actor.id, now, global ? actor.id : null, global ? now : null]);
    await audit(id, global ? 'declarado_rede' : 'solicitado', actor, reason);
    return { id };
  });
}
async function review(actor, id, decision, note = '') {
  if (!['aprovado','recusado','cancelado'].includes(decision)) throw fail('Decisão inválida.');
  const reason = text(note, 'Motivo', decision === 'recusado');
  return withTransaction(async () => {
    const record = await queryOne('SELECT * FROM store_holidays WHERE id=?', [id]);
    if (!record) throw fail('Feriado não encontrado.', 404);
    if (decision === 'cancelado') {
      if (record.status !== 'aprovado' || record.action !== 'fechar') throw fail('Este feriado não pode ser cancelado.', 409);
    } else if (record.status !== 'pendente') throw fail('Esta solicitação já foi analisada.', 409);
    if (decision === 'aprovado') {
      if (record.action === 'fechar') {
        if ((await activeClosures(record.storeId, record.holidayDate)).length) throw fail('A data já possui um feriado aprovado.', 409);
        await ensureNoClosing(record.storeId, record.holidayDate);
      } else {
        const target = await queryOne("SELECT * FROM store_holidays WHERE id=? AND status='aprovado' AND action='fechar' AND storeId=?", [record.targetId, record.storeId]);
        if (!target) throw fail('O feriado original já foi alterado.', 409);
        if ((await activeClosures(record.storeId, record.holidayDate)).some(row => row.storeId === null)) throw fail('Há um feriado geral nesta data. A central deve cancelá-lo primeiro.', 409);
        await execute("UPDATE store_holidays SET status='cancelado',reviewedBy=?,reviewedAt=? WHERE id=?", [actor.id, new Date().toISOString(), target.id]);
        await audit(target.id, 'reaberto', actor);
      }
    }
    await execute('UPDATE store_holidays SET status=?,reviewNote=?,reviewedBy=?,reviewedAt=? WHERE id=?', [decision, reason, actor.id, new Date().toISOString(), id]);
    await audit(id, decision, actor, reason);
    return { id, status: decision };
  });
}
async function declare(actor, payload) {
  if (!payload || !['rede', 'unidades'].includes(payload.scope)) throw fail('Escolha todas as unidades ou unidades específicas.');
  if (payload.scope === 'rede') {
    if (payload.storeIds !== undefined && (!Array.isArray(payload.storeIds) || payload.storeIds.length)) throw fail('Não selecione unidades no feriado geral.');
    return submit(actor, payload, true);
  }
  if (!Array.isArray(payload.storeIds) || !payload.storeIds.length || payload.storeIds.length > 500 || payload.storeIds.some(id => typeof id !== 'string' || !id || id.length > 100)) throw fail('Selecione pelo menos uma unidade válida.');
  const ids = [...new Set(payload.storeIds)];
  return withTransaction(async () => {
    // O lote inteiro é validado e gravado na mesma transação.
    for (const storeId of ids) if (!(await queryOne('SELECT id FROM stores WHERE id=? AND active=1', [storeId]))) throw fail('Uma das unidades selecionadas está inativa ou não existe.');
    const created = [];
    for (const storeId of ids) {
      const result = await submit({ ...actor, storeId }, { date: payload.date, name: payload.name, reason: payload.reason, storeId });
      await review(actor, result.id, 'aprovado', 'Cadastrado pela central para esta unidade');
      created.push(result.id);
    }
    return { ids: created };
  });
}
async function stores() {
  return queryAll('SELECT id,name,active FROM stores ORDER BY name');
}
module.exports = { list, submit, review, activeClosures, declare, stores };
