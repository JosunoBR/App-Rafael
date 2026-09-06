const productRepository = require('../repositories/productRepository');

class ProductService {
  async listProducts() {
    return await productRepository.findAll();
  }

  async getProduct(id) {
    const product = await productRepository.findById(id);
    if (!product) {
      const err = new Error('Produto não encontrado.');
      err.statusCode = 404;
      throw err;
    }
    return product;
  }

  async saveProduct(productData) {
    if (!productData || !productData.codigo || !productData.descricao) {
      const err = new Error('Código e descrição do produto são obrigatórios.');
      err.statusCode = 400;
      throw err;
    }

    const payload = {
      ...productData,
      id: productData.id || ('prod_' + Date.now()),
      codigo: productData.codigo.trim().toUpperCase(),
      descricao: productData.descricao.trim()
    };

    const saved = await productRepository.upsert(payload);
    return {
      success: true,
      message: `Produto "${saved.descricao}" salvo com sucesso!`,
      product: saved
    };
  }

  async deleteProduct(id) {
    await this.getProduct(id);
    await productRepository.delete(id);
    return { success: true, message: 'Produto removido com sucesso.' };
  }

  async saveBatchProducts(productsList) {
    if (!Array.isArray(productsList) || productsList.length === 0) {
      return { success: true, count: 0, products: [] };
    }
    const savedList = [];
    for (const prod of productsList) {
      if (!prod || !prod.descricao || prod.descricao.trim().length === 0) continue;
      const cod = (prod.codigoInterno || prod.codigo || '').trim().toUpperCase();
      if (!cod) continue;

      const payload = {
        ...prod,
        id: prod.id || ('prod_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7)),
        codigo: cod,
        codigoInterno: cod,
        descricao: prod.descricao.trim()
      };
      try {
        const saved = await productRepository.upsert(payload);
        if (saved) savedList.push(saved);
      } catch (err) {
        console.error('Erro ao salvar produto em lote:', err.message);
      }
    }
    return { success: true, count: savedList.length, products: savedList };
  }

  async syncCatalog() {
    const { getDatabase, saveDatabaseToDisk } = require('../config/database');
    const { runFullDatabaseSeed } = require('../config/seedData');
    const db = await getDatabase();
    runFullDatabaseSeed(db);
    saveDatabaseToDisk();
    return await productRepository.findAll();
  }
}

module.exports = new ProductService();
