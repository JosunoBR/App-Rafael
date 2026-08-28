const productService = require('../services/product.service');

class ProductController {
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
}

module.exports = new ProductController();
