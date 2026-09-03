const separationPresetRepository = require('../repositories/separationPresetRepository');

class SeparationPresetController {
  async list(req, res, next) {
    try {
      const presets = await separationPresetRepository.findAll();
      return res.json(presets);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const preset = await separationPresetRepository.findById(req.params.id);
      if (!preset) {
        return res.status(404).json({ error: 'Modelo de separação não encontrado.' });
      }
      return res.json(preset);
    } catch (err) {
      next(err);
    }
  }

  async save(req, res, next) {
    try {
      const { name, storeWeights } = req.body;
      if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Nome do modelo de separação é obrigatório.' });
      }
      if (!storeWeights || typeof storeWeights !== 'object') {
        return res.status(400).json({ error: 'Pesos/distribuição das lojas são obrigatórios.' });
      }

      const saved = await separationPresetRepository.upsert(req.body);
      return res.status(201).json(saved);
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      await separationPresetRepository.delete(req.params.id);
      return res.json({ success: true, message: 'Modelo de separação removido com sucesso.' });
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new SeparationPresetController();
