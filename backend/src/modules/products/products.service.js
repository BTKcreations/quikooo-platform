const PricingService = require('../../services/PricingService');

class ProductsService {
  static async listProducts(vendorId) {
    // TODO: Connect to DB vendor_products table
    const orig1 = 100.0;
    const orig2 = 200.0;
    return [
      {
        id: 'prod-1',
        name: 'Veg Biryani',
        originalPrice: orig1,
        ...PricingService.calculateRestaurantPricing(orig1),
        isAvailable: true,
      },
      {
        id: 'prod-2',
        name: 'Butter Chicken',
        originalPrice: orig2,
        ...PricingService.calculateRestaurantPricing(orig2),
        isAvailable: true,
      },
    ];
  }

  static async getProductById(id) {
    // TODO: Connect to DB vendor_products table
    const orig = 150.0;
    return {
      id,
      name: 'Paneer Tikka',
      originalPrice: orig,
      ...PricingService.calculateRestaurantPricing(orig),
      isAvailable: true,
    };
  }
}

module.exports = ProductsService;
