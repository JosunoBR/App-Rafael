const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { pipeline } = require('node:stream/promises');
const { Transform } = require('node:stream');
const { dbPath, queryAll, queryOne, execute, withTransaction } = require('../config/database');
const ATTACHMENTS_DIR = path.join(path.dirname(dbPath), 'calendar-memos');
const MAX_ATTACHMENT_BYTES = 20 * 1024 * 1024;
const fail = (message, status = 400) => Object.assign(new Error(message), { status });
function validateStoreId(id) {
  if (typeof id !== 'string' || !id || id.length > 100) throw fail('Unidade inválida.');
}
function validateDate(date) {
  if (typeof date !== 'string' || !/^20\d{2}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date)) || new Date(date).toISOString().slice(0,10) !== date) throw fail('Informe uma data válida.');
}
async function get(storeId, date) {
  validateStoreId(storeId); validateDate(date);
  const store = await queryOne('SELECT id,name FROM stores WHERE id=?', [storeId]);
  if (!store) throw fail('Unidade não encontrada.', 404);
  const memo = await queryOne(`SELECT m.*,
    (SELECT MIN(createdAt) FROM store_daily_memos WHERE storeId=m.storeId AND memoDate=m.memoDate) AS firstCreatedAt
    FROM store_daily_memos m WHERE m.storeId=? AND m.memoDate=? ORDER BY m.version DESC LIMIT 1`, [storeId, date]);
  const attachments = await queryAll('SELECT id,originalName,sizeBytes,uploadedAt FROM store_memo_attachments WHERE storeId=? AND memoDate=? ORDER BY uploadedAt,id', [storeId,date]);
  return { storeId, storeName: store.name, date, content: memo?.content ?? '', version: memo?.version ?? 0,
    authorName: memo?.authorName ?? '', createdAt: memo?.firstCreatedAt ?? null, updatedAt: memo?.createdAt ?? null, attachments };
}
async function attach(actor, storeId, date, originalName, request) {
  validateStoreId(storeId); validateDate(date);
  if (typeof originalName !== 'string' || !originalName.trim() || originalName.length > 240 || /[\\/\x00-\x1f\x7f]/.test(originalName)) throw fail('Nome do arquivo inválido.');
  const current = await get(storeId, date);
  if (!current.version) throw fail('Salve o memorando antes de anexar arquivos.', 409);
  const id = randomUUID(), storageName = id;
  await fs.promises.mkdir(ATTACHMENTS_DIR, { recursive: true });
  const destination = path.join(ATTACHMENTS_DIR, storageName);
  let length = 0;
  const limit = new Transform({ transform(chunk, _encoding, callback) {
    length += chunk.length;
    if (length > MAX_ATTACHMENT_BYTES) callback(fail('O arquivo excede o limite de 20 MB.', 413));
    else callback(null, chunk);
  }});
  try {
    await pipeline(request, limit, fs.createWriteStream(destination, { flags: 'wx', mode: 0o600 }));
    if (!length) throw fail('O arquivo está vazio.');
    await execute(`INSERT INTO store_memo_attachments(id,storeId,memoDate,memoVersion,originalName,storageName,sizeBytes,uploadedBy,uploadedAt)
      VALUES(?,?,?,?,?,?,?,?,?)`, [id,storeId,date,current.version,originalName.trim(),storageName,length,actor.id,new Date().toISOString()]);
    return { id, originalName: originalName.trim(), sizeBytes: length };
  } catch (error) {
    await fs.promises.rm(destination, { force: true }).catch(() => {});
    throw error;
  }
}
async function attachment(id) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw fail('Anexo inválido.');
  const record = await queryOne('SELECT id,originalName,storageName FROM store_memo_attachments WHERE id=?', [id]);
  if (!record) throw fail('Anexo não encontrado.', 404);
  return { ...record, filePath: path.join(ATTACHMENTS_DIR, record.storageName) };
}
async function list(month, storeId) {
  if (typeof month !== 'string' || !/^20\d{2}-(0[1-9]|1[0-2])$/.test(month)) throw fail('Informe um mês válido.');
  if (storeId !== undefined) validateStoreId(storeId);
  const params = [`${month}-%`];
  const where = storeId === undefined ? '' : ' AND m.storeId=?';
  if (storeId !== undefined) params.push(storeId);
  return queryAll(`SELECT m.storeId,s.name AS storeName,m.memoDate AS date,m.version,m.authorName,m.createdAt AS updatedAt
    FROM store_daily_memos m JOIN stores s ON s.id=m.storeId
    WHERE m.memoDate LIKE ? ${where} AND (m.content<>'' OR EXISTS
      (SELECT 1 FROM store_memo_attachments a WHERE a.storeId=m.storeId AND a.memoDate=m.memoDate))
    AND m.version=(SELECT MAX(version) FROM store_daily_memos WHERE storeId=m.storeId AND memoDate=m.memoDate)
    ORDER BY m.memoDate,s.name`, params);
}
async function save(actor, storeId, date, payload) {
  validateStoreId(storeId); validateDate(date);
  if (!payload || typeof payload.content !== 'string' || payload.content.length > 10000) throw fail('O memorando deve conter até 10.000 caracteres.');
  if (!Number.isSafeInteger(payload.version) || payload.version < 0) throw fail('Versão do memorando inválida.');
  const content = payload.content.trim();
  return withTransaction(async () => {
    const current = await get(storeId, date);
    if (current.version !== payload.version) throw fail('Este memorando foi alterado por outra pessoa. Seu texto foi preservado; recarregue o registro antes de salvar.', 409);
    if (!content && !current.version) throw fail('Escreva a avaliação antes de salvar.');
    if (content === current.content) return current;
    // Revisions are append-only: previous evaluations and authorship remain available for audit.
    await execute('INSERT INTO store_daily_memos(id,storeId,memoDate,content,version,authorId,authorName,createdAt) VALUES(?,?,?,?,?,?,?,?)',
      [randomUUID(), storeId, date, content, current.version + 1, actor.id, actor.nome || '', new Date().toISOString()]);
    return get(storeId, date);
  });
}
module.exports = { get, list, save, attach, attachment, MAX_ATTACHMENT_BYTES };
