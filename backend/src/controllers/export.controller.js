const exportService = require('../services/export.service');

class ExportController {
  async exportExcel(req, res, next) {
    try {
      let bodyData = req.body || {};
      if (typeof bodyData.payload === 'string') {
        try { bodyData = JSON.parse(bodyData.payload); } catch {}
      }
      const order = bodyData.order || bodyData;
      const stores = bodyData.stores || order.storeConfigs || [];
      const activeStores = stores.filter(s => s.active);

      const { buffer, filename } = exportService.generateExcel(order, activeStores);

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (err) {
      next(err);
    }
  }

  async exportPdf(req, res, next) {
    try {
      let bodyData = req.body || {};
      if (typeof bodyData.payload === 'string') {
        try { bodyData = JSON.parse(bodyData.payload); } catch {}
      }
      const order = bodyData.order || bodyData;
      const stores = bodyData.stores || order.storeConfigs || [];

      const { buffer, filename } = exportService.generatePdf(order, stores);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.send(buffer);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ExportController();
