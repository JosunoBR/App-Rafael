const supplierRepository = require('../repositories/supplierRepository');

class SupplierService {
  async listSuppliers() {
    return await supplierRepository.findAll();
  }

  async getSupplier(id) {
    const supplier = await supplierRepository.findById(id);
    if (!supplier) {
      const err = new Error('Fornecedor não encontrado.');
      err.statusCode = 404;
      throw err;
    }
    return supplier;
  }

  async saveSupplier(supplierData) {
    if (!supplierData || !supplierData.razaoSocial || supplierData.razaoSocial.trim() === '') {
      const err = new Error('A Razão Social do fornecedor é obrigatória.');
      err.statusCode = 400;
      throw err;
    }

    const payload = {
      ...supplierData,
      id: supplierData.id || ('sup_' + Date.now()),
      razaoSocial: supplierData.razaoSocial.trim()
    };

    const saved = await supplierRepository.upsert(payload);
    return {
      success: true,
      message: `Fornecedor "${saved.razaoSocial}" salvo com sucesso!`,
      supplier: saved
    };
  }

  async deleteSupplier(id) {
    const existing = await supplierRepository.findById(id);
    if (!existing) {
      const err = new Error('Fornecedor não encontrado.');
      err.statusCode = 404;
      throw err;
    }

    await supplierRepository.delete(id);
    return { success: true, message: `Fornecedor "${existing.razaoSocial}" excluído com sucesso.` };
  }
}

module.exports = new SupplierService();
