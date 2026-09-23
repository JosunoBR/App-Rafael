const path = require('path');
const fs = require('fs');
const productService = require('../services/product.service');

class ProductController {
  async getImage(req, res, next) {
    try {
      const filename = req.params.filename;
      // Validação estrita de formato de nome de arquivo (apenas alfanumérico, hífen, underline e extensões válidas)
      if (!filename || !/^[a-zA-Z0-9_\-\.]+\.(webp|png|jpe?g|gif|svg)$/i.test(filename)) {
        return res.status(400).json({ error: 'Nome de arquivo de imagem inválido.' });
      }

      const productImagesDir = path.resolve(__dirname, '../../data/produtos');
      const safePath = path.resolve(productImagesDir, filename);

      // Prevenção rigorosa contra Directory Traversal
      if (!safePath.startsWith(productImagesDir) || !fs.existsSync(safePath)) {
        return res.status(404).json({ error: 'Imagem do produto não encontrada.' });
      }

      // Headers de cache HTTP de alta performance (1 mês no navegador do cliente)
      res.setHeader('Cache-Control', 'public, max-age=2592000, immutable');
      return res.sendFile(safePath);
    } catch (err) {
      next(err);
    }
  }

  async list(req, res, next) {
    try {
      const products = await productService.listProducts();
      return res.json(products);
    } catch (err) {
      next(err);
    }
  }

  async getById(req, res, next) {
    try {
      const product = await productService.getProduct(req.params.id);
      return res.json(product);
    } catch (err) {
      next(err);
    }
  }

  async save(req, res, next) {
    try {
      const result = await productService.saveProduct(req.body);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async delete(req, res, next) {
    try {
      const result = await productService.deleteProduct(req.params.id);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async saveBatch(req, res, next) {
    try {
      const result = await productService.saveBatchProducts(req.body);
      return res.json(result);
    } catch (err) {
      next(err);
    }
  }

  async syncCatalog(req, res, next) {
    try {
      const products = await productService.syncCatalog();
      return res.json(products);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new ProductController();
