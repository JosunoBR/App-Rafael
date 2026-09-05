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
}

module.exports = new ConfigController();
