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
    const existing = await productRepository.findById(id);
    if (!existing) {
      const err = new Error('Produto não encontrado.');
      err.statusCode = 404;
      throw err;
    }

    await productRepository.delete(id);
    return { success: true, message: `Produto "${existing.descricao}" excluído com sucesso.` };
  }
}

module.exports = new ProductService();
