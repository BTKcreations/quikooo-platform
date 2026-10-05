const VendorsService = require('./vendors.service');

class VendorsController {
  static async list(req, res, next) {
    try {
      const vendors = await VendorsService.listVendors(req.query);
      return res.status(200).json({ success: true, data: vendors });
    } catch (err) {
      return next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      const vendor = await VendorsService.getVendorById(req.params.id);
      return res.status(200).json({ success: true, data: vendor });
    } catch (err) {
      return next(err);
    }
  }

  static async getProducts(req, res, next) {
    try {
      const products = await VendorsService.getVendorProducts(req.params.id);
      return res.status(200).json({ success: true, data: products });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = VendorsController;
