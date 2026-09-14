const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const { dbPath, saveDatabaseToDisk } = require('../config/database');
const { authMiddleware } = require('../middlewares/auth.middleware');
const { requireRole } = require('../middlewares/rbac.middleware');

const router = Router();

// Caminho de fallback utilizado em produção (container Railway)
const FALLBACK_DB_PATH = '/app/backend/data/mega12.db';

/**
 * GET /api/admin/download-db
 * Permite que usuários com perfil de diretoria baixem o arquivo físico
 * do banco de dados SQLite (mega12.db) para backup/auditoria.
 */
router.get('/download-db', authMiddleware, requireRole('diretoria'), async (req, res, next) => {
  try {
    // Garante que os dados mais recentes em memória sejam persistidos em disco
    // antes de servir o arquivo para download.
    if (typeof saveDatabaseToDisk === 'function') {
      try {
        saveDatabaseToDisk();
      } catch (saveErr) {
        console.error('Aviso ao persistir banco antes do download:', saveErr.message);
      }
    }

    const candidatePaths = [dbPath, FALLBACK_DB_PATH].filter(Boolean);
    const resolvedPath = candidatePaths.find((p) => fs.existsSync(p));

    if (!resolvedPath) {
      return res.status(404).json({
        error: 'Arquivo do banco de dados não foi encontrado.',
        pathsVerificados: candidatePaths
      });
    }

    const fileName = path.basename(resolvedPath);

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    return res.download(path.resolve(resolvedPath), fileName, (err) => {
      if (err) {
        console.error('Erro ao enviar arquivo do banco de dados:', err.message);
        return next(err);
      }
    });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
