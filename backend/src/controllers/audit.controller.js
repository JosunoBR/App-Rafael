const auditService = require('../services/audit.service');
const distributionAuditRepo = require('../repositories/distributionAuditRepository');
const financialAuditRepo = require('../repositories/financialAuditRepository');

class AuditController {
  async list(req, res, next) {
    try {
      const logs = await auditService.listLogs(req.query.orderId);
      return res.json(logs);
    } catch (err) {
      next(err);
    }
  }

  async create(req, res, next) {
    try {
      const logData = {
        ...req.body,
        conferenteId: req.user?.id || req.body.conferenteId,
        conferenteNome: req.user?.nome || req.body.conferenteNome
      };
      const result = await auditService.logSeparation(logData);
      return res.status(201).json(result);
    } catch (err) {
      next(err);
    }
  }

  async listDeletions(req, res, next) {
    try {
      const logs = await auditService.listDeletions(req.query.orderId);
      return res.json(logs);
    } catch (err) {
      next(err);
    }
  }

  async listDistributionLogs(req, res, next) {
    try {
      const { orderId } = req.params;
      const logs = orderId 
        ? await distributionAuditRepo.findByOrderId(orderId)
        : await distributionAuditRepo.findAll(100);
      return res.json(logs);
    } catch (err) {
      next(err);
    }
  }

  async listFinancialLogs(req, res, next) {
    try {
      const { entryId, orderId } = req.query;
      if (entryId) {
        const logs = await financialAuditRepo.findByEntryId(entryId);
        return res.json(logs);
      }
      if (orderId) {
        const logs = await financialAuditRepo.findByOrderId(orderId);
        return res.json(logs);
      }
      const logs = await financialAuditRepo.findAll(100);
      return res.json(logs);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new AuditController();
