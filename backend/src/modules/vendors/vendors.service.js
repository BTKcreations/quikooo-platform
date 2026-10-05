const config = require('../../config');

class VendorsService {
  static async listVendors(filters = {}) {
    // TODO: Connect to DB vendors table
    return [
      {
        id: 'vendor-sample-1',
        name: 'Curry & Spice Express',
        businessType: 'RESTAURANT',
        menuAdjustmentPercent: config.pricing.restaurantMenuAdjustmentPercent,
        commissionPercent: config.pricing.restaurantPlatformCommissionPercent,
        isAcceptingOrders: true,
      },
    ];
  }

  static async getVendorById(id) {
    // TODO: Connect to DB vendors table
    return {
      id,
      name: 'Curry & Spice Express',
      businessType: 'RESTAURANT',
      menuAdjustmentPercent: config.pricing.restaurantMenuAdjustmentPercent,
      commissionPercent: config.pricing.restaurantPlatformCommissionPercent,
      isAcceptingOrders: true,
    };
  }

  static async getVendorProducts(vendorId) {
    // TODO: Connect to DB vendor_products table
    return [
      {
        id: 'prod-1',
        vendorId,
        name: 'Paneer Butter Masala',
        originalPrice: 100.0,
        customerMenuPrice: 105.0, // 5% markup
        isAvailable: true,
      },
    ];
  }
}

module.exports = VendorsService;
