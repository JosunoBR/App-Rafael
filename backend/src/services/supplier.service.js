const supplierRepository = require('../repositories/supplierRepository');
const productRepository = require('../repositories/productRepository');

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

    // 1. Excluir produtos do catálogo vinculados a este fornecedor
    // (Produtos cadastrados para outros fornecedores e histórico de compras anteriores são preservados)
    await productRepository.deleteBySupplierId(id, existing.razaoSocial);

    // 2. Excluir o cadastro do fornecedor
    await supplierRepository.delete(id);

    return { 
      success: true, 
      message: `Fornecedor "${existing.razaoSocial}" e seus produtos vinculados foram excluídos com sucesso.` 
    };
  }
}

module.exports = new SupplierService();
