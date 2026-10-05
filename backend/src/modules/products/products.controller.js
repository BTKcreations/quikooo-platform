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

  /**
   * GET /api/v1/products/search?q=
   * Fuzzy ranked search with typo tolerance, prior order boost, and in-stock priority
   */
  static async search(req, res, next) {
    try {
      const q = req.query.q || '';
      const priorProductIds = req.query.priorProductIds || req.query.prior_order || req.query.boost_prior;
      const vendorId = req.query.vendorId;

      const results = await ProductsService.searchProducts(q, {
        priorProductIds,
        vendorId,
      });

      return res.status(200).json({
        success: true,
        count: results.length,
        query: q,
        data: results,
      });
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
