const crypto = require('crypto');
const { queryOne, execute } = require('../config/database');

const activeRequests = new Map();

function fingerprintRequest(req) {
  const authorizationContext = String(req.get('Authorization') || 'anonymous');
  return crypto
    .createHash('sha256')
    .update(`${authorizationContext}:${req.method}:${req.originalUrl}:${JSON.stringify(req.body || {})}`)
    .digest('hex');
}

async function handleIdempotency(req, res, next) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();
  if (req.originalUrl.startsWith('/api/auth/')) return next();
  const protectedPrefixes = [
    '/api/orders', '/api/financial', '/api/stock', '/api/products',
    '/api/suppliers', '/api/config', '/api/payment-conditions'
  ];
  if (!protectedPrefixes.some(prefix => req.originalUrl.startsWith(prefix))) return next();

  const key = String(req.get('Idempotency-Key') || '').trim();
  if (!key) return next();
  if (key.length > 128) {
    return res.status(400).json({ error: 'Chave de idempotência inválida.' });
  }

  const fingerprint = fingerprintRequest(req);
  const existing = await queryOne(
    'SELECT requestFingerprint, responseStatus, responseJson FROM idempotency_records WHERE idempotencyKey = ?',
    [key]
  );

  if (existing) {
    if (existing.requestFingerprint !== fingerprint) {
      return res.status(409).json({
        error: 'A mesma chave de operação foi reutilizada com dados diferentes.',
        code: 'IDEMPOTENCY_KEY_REUSED'
      });
    }
    return res.status(Number(existing.responseStatus) || 200).json(JSON.parse(existing.responseJson));
  }

  if (activeRequests.has(key)) {
    const result = await activeRequests.get(key);
    if (result.fingerprint !== fingerprint) {
      return res.status(409).json({ error: 'Operação duplicada com conteúdo divergente.', code: 'IDEMPOTENCY_KEY_REUSED' });
    }
    return res.status(result.status).json(result.body);
  }

  let resolveActive;
  let responseHandled = false;
  const pending = new Promise(resolve => { resolveActive = resolve; });
  activeRequests.set(key, pending);

  const originalJson = res.json.bind(res);
  res.json = body => {
    responseHandled = true;
    const status = res.statusCode || 200;
    const result = { fingerprint, status, body };

    if (status >= 200 && status < 300) {
      execute(
        `INSERT OR REPLACE INTO idempotency_records
          (idempotencyKey, requestFingerprint, responseStatus, responseJson, createdAt)
         VALUES (?, ?, ?, ?, ?)`,
        [key, fingerprint, status, JSON.stringify(body ?? null), new Date().toISOString()]
      ).catch(error => console.error('Falha ao persistir idempotência:', error));
    }

    resolveActive(result);
    if (status >= 200 && status < 300) {
      const cleanupTimer = setTimeout(() => activeRequests.delete(key), 60_000);
      cleanupTimer.unref?.();
    } else {
      activeRequests.delete(key);
    }
    return originalJson(body);
  };

  res.on('close', () => {
    if (!responseHandled && activeRequests.has(key)) {
      resolveActive({ fingerprint, status: 503, body: { error: 'Operação interrompida antes da confirmação.' } });
      activeRequests.delete(key);
    }
  });

  return next();
}

function idempotencyMiddleware(req, res, next) {
  handleIdempotency(req, res, next).catch(next);
}

module.exports = { idempotencyMiddleware };
