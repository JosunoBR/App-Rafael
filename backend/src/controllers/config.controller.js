const fiscalRepository = require('../repositories/fiscalRepository');

class ConfigController {
  async getFiscal(req, res, next) {
    try {
      const config = await fiscalRepository.getFiscalConfig();
      return res.json(config);
    } catch (err) {
      next(err);
    }
  }

  async saveFiscal(req, res, next) {
    try {
      const saved = await fiscalRepository.updateFiscalConfig(req.body);
      return res.json(saved);
    } catch (err) {
      next(err);
    }
  }

  async getStores(req, res, next) {
    try {
      const stores = await fiscalRepository.getStores();
      return res.json(stores);
    } catch (err) {
      next(err);
    }
  }

  async saveStores(req, res, next) {
    try {
      const saved = await fiscalRepository.updateStores(req.body);
      return res.json(saved);
    } catch (err) {
      next(err);
    }
  }

  async restoreBackup(req, res, next) {
    try {
      const user = req.user;
      const isRoot = user && (user.id === 'usr_root' || user.email === 'root' || user.nome === 'Root');
      if (!isRoot) {
        return res.status(403).json({ 
          error: 'Acesso negado. Apenas o Administrador Raiz (Root) possui permissão para restaurar backups do sistema.' 
        });
      }

      const backupRestoreService = require('../services/backupRestore.service');
      const result = await backupRestoreService.restoreFromBackupData(req.body);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async exportBackup(req, res, next) {
    try {
      const user = req.user;
      const isRoot = user && (user.id === 'usr_root' || user.email === 'root' || user.nome === 'Root' || user.role === 'diretoria');
      if (!isRoot) {
        return res.status(403).json({ 
          error: 'Acesso negado. Apenas o Administrador Raiz (Root) possui permissão para exportar backups do sistema.' 
        });
      }

      const backupRestoreService = require('../services/backupRestore.service');
      const backupData = await backupRestoreService.exportBackupData();
      return res.json(backupData);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ConfigController();
