const { Router } = require('express');
const { authMiddleware } = require('../middlewares/auth.middleware');
const memos = require('../services/calendarMemos.service');
const router = Router();
router.use(authMiddleware);
router.use((req, res, next) => ['root','diretoria'].includes(req.user.role) || req.user.id === 'usr_root' ? next() : res.status(403).json({ error: 'Os memorandos de avaliação são exclusivos da diretoria.' }));
const action = work => async (req, res) => {
  try { res.setHeader('Cache-Control', 'no-store'); res.json(await work(req)); }
  catch (error) { if (!error.status) console.error('[memorandos-calendario]', error.message); res.status(error.status || 500).json({ error: error.status ? error.message : 'Não foi possível processar o memorando. Tente novamente.' }); }
};
router.get('/', action(req => memos.list(req.query.month, req.query.storeId)));
router.get('/attachments/:id', async (req, res) => {
  try {
    const record = await memos.attachment(req.params.id);
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.download(record.filePath, record.originalName, error => {
      if (error && !res.headersSent) res.status(404).json({ error: 'Arquivo não encontrado no servidor.' });
    });
  } catch (error) { res.status(error.status || 500).json({ error: error.status ? error.message : 'Não foi possível baixar o arquivo.' }); }
});
router.get('/:storeId/:date', action(req => memos.get(req.params.storeId, req.params.date)));
router.put('/:storeId/:date', action(req => memos.save(req.user, req.params.storeId, req.params.date, req.body)));
router.post('/:storeId/:date/attachments', action(req => {
  if (req.headers['content-type'] !== 'application/octet-stream') return Promise.reject(Object.assign(new Error('Envie o arquivo em formato binário.'), { status: 415 }));
  const size = Number(req.headers['content-length']);
  if (Number.isFinite(size) && size > memos.MAX_ATTACHMENT_BYTES) return Promise.reject(Object.assign(new Error('O arquivo excede o limite de 20 MB.'), { status: 413 }));
  let name;
  try { name = decodeURIComponent(req.headers['x-file-name'] || ''); }
  catch { return Promise.reject(Object.assign(new Error('Nome do arquivo inválido.'), { status: 400 })); }
  return memos.attach(req.user, req.params.storeId, req.params.date, name, req);
}));
module.exports = router;
