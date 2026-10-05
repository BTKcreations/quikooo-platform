const ProductsService = require('./products.service');

class ProductsController {
  static async list(req, res, next) {
    try {
      const products = await ProductsService.listProducts(req.query.vendorId);
      return res.status(200).json({ success: true, data: products });
    } catch (err) {
      return next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const product = await ProductsService.getProductById(req.params.id);
      return res.status(200).json({ success: true, data: product });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = ProductsController;
