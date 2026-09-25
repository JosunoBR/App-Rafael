const fs = require('fs');
const financialService = require('../services/financialService');

class FinancialController {
  async getEntries(req, res) {
    try {
      const { month, year, storeId, lojaNome, categoria, status, tipo, search, empresa, statusPrevisao, formaPagamento } = req.query;
      const entries = await financialService.listEntries({
        month,
        year,
        storeId,
        lojaNome,
        categoria,
        status,
        tipo,
        search,
        empresa,
        statusPrevisao,
        formaPagamento
      });
      return res.status(200).json({ success: true, data: entries });
    } catch (error) {
      console.error('Erro ao buscar lançamentos financeiros:', error);
      return res.status(500).json({ success: false, error: 'Erro interno ao consultar lançamentos financeiros.' });
    }
  }

  async getSummary(req, res) {
    try {
      const { month, year, storeId, lojaNome, categoria, status, tipo, search, empresa, statusPrevisao, formaPagamento } = req.query;
      const summary = await financialService.getSummary({
        month,
        year,
        storeId,
        lojaNome,
        categoria,
        status,
        tipo,
        search,
        empresa,
        statusPrevisao,
        formaPagamento
      });
      return res.status(200).json({ success: true, data: summary });
    } catch (error) {
      console.error('Erro ao buscar resumo financeiro:', error);
      return res.status(500).json({ success: false, error: 'Erro interno ao gerar resumo financeiro.' });
    }
  }

  async getEntryById(req, res) {
    try {
      const { id } = req.params;
      const entry = await financialService.getEntryById(id);
      if (!entry) {
        return res.status(404).json({ success: false, error: 'Lançamento financeiro não encontrado.' });
      }
      return res.status(200).json({ success: true, data: entry });
    } catch (error) {
      console.error('Erro ao consultar lançamento:', error);
      return res.status(500).json({ success: false, error: 'Erro ao buscar lançamento financeiro.' });
    }
  }

  async createEntry(req, res) {
    try {
      const result = await financialService.createEntry(req.body);
      return res.status(201).json({
        success: true,
        data: result,
        message: 'Lançamento financeiro criado com sucesso!'
      });
    } catch (error) {
      console.error('Erro ao criar lançamento financeiro:', error);
      return res.status(400).json({ success: false, error: error.message || 'Erro ao registrar lançamento.' });
    }
  }

  async updateEntry(req, res) {
    try {
      const { id } = req.params;
      const updated = await financialService.updateEntry(id, req.body, req.user);
      return res.status(200).json({
        success: true,
        data: updated,
        message: 'Lançamento financeiro atualizado com sucesso!'
      });
    } catch (error) {
      console.error('Erro ao atualizar lançamento:', error);
      return res.status(400).json({ success: false, error: error.message || 'Erro ao atualizar lançamento.' });
    }
  }

  async payEntry(req, res) {
    try {
      const { id } = req.params;
      const { dataPagamento, valorPago, observacao, comprovante, comprovantes } = req.body;
      const paid = await financialService.markAsPaid(id, { dataPagamento, valorPago, observacao, comprovante, comprovantes }, req.user);
      return res.status(200).json({
        success: true,
        data: paid,
        message: 'Pagamento baixado com sucesso!'
      });
    } catch (error) {
      console.error('Erro ao baixar pagamento:', error);
      return res.status(400).json({ success: false, error: error.message || 'Erro ao liquidar pagamento.' });
    }
  }

  async downloadComprovante(req, res) {
    try {
      const { id } = req.params;
      const { index, file } = req.query;
      const fileInfo = await financialService.getComprovante(id, { index, file });
      
      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(fileInfo.fileName)}"`);
      res.setHeader('Content-Length', fileInfo.tamanho);
      
      const fileStream = fs.createReadStream(fileInfo.filePath);
      return fileStream.pipe(res);
    } catch (error) {
      console.error('Erro ao obter comprovante:', error);
      return res.status(404).json({ success: false, error: error.message || 'Comprovante não encontrado.' });
    }
  }

  async batchPay(req, res) {
    try {
      const { ids, dataPagamento, observacao } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ success: false, error: 'Lista de IDs para baixa em lote não informada.' });
      }
      const updatedList = await financialService.markMultipleAsPaid(ids, { dataPagamento, observacao }, req.user);
      return res.status(200).json({
        success: true,
        data: updatedList,
        count: updatedList.length,
        message: `${updatedList.length} pagamentos baixados com sucesso!`
      });
    } catch (error) {
      console.error('Erro ao baixar pagamentos em lote:', error);
      return res.status(400).json({ success: false, error: error.message || 'Erro ao liquidar pagamentos em lote.' });
    }
  }

  async deleteEntry(req, res) {
    try {
      const { id } = req.params;
      const { password } = req.body || {};
      await financialService.deleteEntry(id, password, req.user);
      return res.status(200).json({ success: true, message: 'Lançamento financeiro removido com sucesso.' });
    } catch (error) {
      console.error('Erro ao excluir lançamento:', error);
      return res.status(error.statusCode || 500).json({ success: false, error: error.message || 'Erro ao excluir lançamento financeiro.' });
    }
  }

  async syncOrders(req, res) {
    try {
      const result = await financialService.syncOrdersToFinancial();
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error('Erro ao sincronizar pedidos com o financeiro:', error);
      return res.status(500).json({ success: false, error: 'Erro ao sincronizar pedidos com o financeiro.' });
    }
  }

  async importSheet(req, res) {
    try {
      const { customFilePath } = req.body;
      const result = await financialService.importClientSpreadsheet(customFilePath);
      return res.status(200).json({ success: true, data: result });
    } catch (error) {
      console.error('Erro ao importar planilha do cliente:', error);
      return res.status(500).json({ success: false, error: error.message || 'Erro ao importar planilha do cliente.' });
    }
  }

  async importSpreadsheet(req, res) {
    try {
      const { entries, targetYear, targetMonth, mode } = req.body;
      if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ success: false, error: 'Lista de lançamentos para importação não informada ou vazia.' });
      }

      const result = await financialService.importSpreadsheetEntries({
        entries,
        targetYear,
        targetMonth,
        mode
      }, req.user);

      return res.status(200).json({
        success: true,
        data: result,
        message: result.message
      });
    } catch (error) {
      console.error('Erro ao importar lançamentos de planilha:', error);
      return res.status(400).json({ success: false, error: error.message || 'Erro ao importar lote de lançamentos.' });
    }
  }

  async cancelRecurrence(req, res) {
    try {
      const { recorrenciaId } = req.params;
      await financialService.cancelRecurringSeries(recorrenciaId);
      return res.status(200).json({ success: true, message: 'Recorrência futura cancelada com sucesso.' });
    } catch (error) {
      console.error('Erro ao cancelar série recorrente:', error);
      return res.status(400).json({ success: false, error: error.message || 'Erro ao cancelar série recorrente.' });
    }
  }
}

module.exports = new FinancialController();
