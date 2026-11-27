const { randomUUID } = require('node:crypto');
const { queryAll, queryOne, execute, withTransaction } = require('../config/database');

const invalid = (message, status = 400) => Object.assign(new Error(message), { status });

function validatedText(value, field, max) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw invalid(`${field}: informe entre 1 e ${max} caracteres.`);
  }
  return value.trim();
}

async function list() {
  const announcements = await queryAll(`
    SELECT id,title,body,audience,status,authorId,authorName,createdAt,archivedAt
    FROM franchise_announcements ORDER BY createdAt DESC LIMIT 200
  `);
  if (!announcements.length) return [];
  const targets = await queryAll('SELECT announcementId,storeId FROM franchise_announcement_targets');
  const idsByAnnouncement = new Map();
  for (const row of targets) {
    if (!idsByAnnouncement.has(row.announcementId)) idsByAnnouncement.set(row.announcementId, []);
    idsByAnnouncement.get(row.announcementId).push(row.storeId);
  }
  return announcements.map(row => ({ ...row, storeIds: idsByAnnouncement.get(row.id) || [] }));
}

async function publish(actor, payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw invalid('Dados do comunicado inválidos.');
  const title = validatedText(payload.title, 'Título', 160);
  const body = validatedText(payload.body, 'Mensagem', 10000);
  if (payload.audience !== 'all' && payload.audience !== 'selected') throw invalid('Selecione os destinatários.');
  if (!Array.isArray(payload.storeIds) || payload.storeIds.length > 200 || payload.storeIds.some(id => typeof id !== 'string' || !id || id.length > 100)) {
    throw invalid('Lista de unidades inválida.');
  }
  const storeIds = [...new Set(payload.storeIds)];
  if (payload.audience === 'selected' && !storeIds.length) throw invalid('Escolha pelo menos uma unidade.');
  if (payload.audience === 'all' && storeIds.length) throw invalid('Para toda a rede, não informe unidades individuais.');

  return withTransaction(async () => {
    if (storeIds.length) {
      const active = await queryAll('SELECT id FROM stores WHERE active=1');
      const activeIds = new Set(active.map(row => row.id));
      if (storeIds.some(id => !activeIds.has(id))) throw invalid('Há unidades inexistentes ou inativas na seleção.');
    }
    const id = randomUUID();
    const now = new Date().toISOString();
    await execute('INSERT INTO franchise_announcements(id,title,body,audience,status,authorId,authorName,createdAt) VALUES(?,?,?,?,?,?,?,?)',
      [id, title, body, payload.audience, 'published', actor.id, actor.nome || 'Root', now]);
    for (const storeId of storeIds) {
      await execute('INSERT INTO franchise_announcement_targets(announcementId,storeId) VALUES(?,?)', [id, storeId]);
    }
    await execute('INSERT INTO franchise_announcement_audit(id,announcementId,action,actorId,occurredAt) VALUES(?,?,?,?,?)',
      [randomUUID(), id, 'published', actor.id, now]);
    return { id };
  });
}

async function archive(actor, id) {
  if (typeof id !== 'string' || !/^[0-9a-f-]{36}$/i.test(id)) throw invalid('Comunicado inválido.');
  return withTransaction(async () => {
    const record = await queryOne('SELECT id,status FROM franchise_announcements WHERE id=?', [id]);
    if (!record) throw invalid('Comunicado não encontrado.', 404);
    if (record.status !== 'published') throw invalid('Este comunicado já foi arquivado.', 409);
    const now = new Date().toISOString();
    await execute("UPDATE franchise_announcements SET status='archived',archivedAt=?,archivedBy=? WHERE id=?", [now, actor.id, id]);
    await execute('INSERT INTO franchise_announcement_audit(id,announcementId,action,actorId,occurredAt) VALUES(?,?,?,?,?)',
      [randomUUID(), id, 'archived', actor.id, now]);
    return { id, status: 'archived' };
  });
}

module.exports = { list, publish, archive };
