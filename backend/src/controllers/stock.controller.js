const stockRepository = require('../repositories/stockRepository');

class StockController {
  async list(req, res, next) {
    try {
      const items = await stockRepository.findAll();
      return res.json(items);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const item = await stockRepository.findById(req.params.id);
      if (!item) return res.status(404).json({ error: 'Item de estoque não encontrado.' });
      return res.json(item);
    } catch (err) {
      next(err);
    }
  }

  async save(req, res, next) {
    try {
      const saved = await stockRepository.save(req.body);
      return res.status(201).json(saved);
    } catch (err) {
      next(err);
    }
  }

  async updateBalance(req, res, next) {
    try {
      const { deltaUnidades, localizacaoGalpao } = req.body;
      const updated = await stockRepository.updateBalance(req.params.id, deltaUnidades, localizacaoGalpao);
      return res.json(updated);
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await stockRepository.delete(req.params.id);
      return res.json({ success: true, message: 'Item removido do estoque central.' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new StockController();
