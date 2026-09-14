const { Router } = require('express');
const fs = require('fs');
const path = require('path');
const { dbPath } = require('../config/database');

const router = Router();

// Endpoint temporário para download do arquivo de banco de dados SQLite (mega12.db)
// Utilizado apenas para investigações e testes locais. Não requer autenticação.
router.get('/download-db', (req, res) => {
  const filePath = dbPath || path.join('/app/backend/data', 'mega12.db');

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'Arquivo mega12.db não encontrado.' });
  }

  res.download(filePath, 'mega12.db', (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ message: 'Erro ao baixar o arquivo mega12.db.', error: err.message });
    }
  });
});

module.exports = router;
