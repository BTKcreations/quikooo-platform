const config = require('../config');
const { round2 } = require('./TaxService');

class PricingService {
  /**
   * CRITICAL OFFICIAL BUSINESS MODEL (Phase 1)
   * DO NOT USE OLD 12% COMMISSION
   * 
   * For originalPrice = 100:
   * - menuAdjustment = 5% (5.00)
   * - customerMenuPrice = 105.00 (order food subtotal)
   * - commission = 10% (10.00, calculated on ORIGINAL price 100, NOT on 105)
   * - vendorSettlement = 100 - 10 = 90.00
   * - quikoooGrossRevenue = 5 + 10 = 15.00
   * 
   * @param {number} originalPrice - Vendor original listed price
   * @param {Object} [overrides] - Optional overrides for percent rates
   * @returns {Object} JSON { originalPrice, menuAdjustmentPercent, menuAdjustmentAmount, customerMenuPrice, commissionPercent, commissionAmount, vendorSettlement, quikoooGrossRevenue }
   */
  static calculateRestaurantPricing(originalPrice, overrides = {}) {
    const orig = Number(originalPrice);
    if (isNaN(orig) || orig <= 0) {
      throw new Error(`Invalid original price: ${originalPrice}`);
    }

    const menuAdjustmentPercent = overrides.menuAdjustmentPercent !== undefined
      ? Number(overrides.menuAdjustmentPercent)
      : config.pricing.restaurantMenuAdjustmentPercent;

    const commissionPercent = overrides.commissionPercent !== undefined
      ? Number(overrides.commissionPercent)
      : config.pricing.restaurantPlatformCommissionPercent;

    // 1. Menu Adjustment: 5% added to original price
    const menuAdjustmentAmount = round2(orig * (menuAdjustmentPercent / 100));

    // 2. Customer Menu Price: Original + Adjustment (Customer faces this price)
    const customerMenuPrice = round2(orig + menuAdjustmentAmount);

    // 3. Platform Commission: 10% on ORIGINAL price ONLY (never on 105)
    const commissionAmount = round2(orig * (commissionPercent / 100));

    // 4. Vendor Settlement: Original - Commission (Vendor receives this)
    const vendorSettlement = round2(orig - commissionAmount);

    // 5. QUIKOOO Gross Revenue: Adjustment markup + Commission
    const quikoooGrossRevenue = round2(menuAdjustmentAmount + commissionAmount);

    return {
      originalPrice: round2(orig),
      menuAdjustmentPercent,
      menuAdjustmentAmount,
      customerMenuPrice,
      commissionPercent,
      commissionAmount,
      vendorSettlement,
      quikoooGrossRevenue,
    };
  }

  /**
   * Calculates final order totals for customer and settlement breakdown
   * 
   * subtotal = customerMenuPrice (105 for 100 original)
   * platformFee = 5
   * deliveryFee = 25
   * customerPayable = subtotal + 5 + 25 = 135
   * 
   * @param {number|Object} input - foodOriginalPrice (number) or options object { foodOriginalPrice, items, deliveryFee, platformFee }
   * @returns {Object} Totals breakdown
   */
  static calculateOrderTotals(input, options = {}) {
    let foodOriginalPrice = 0;
    let itemsBreakdown = [];

    if (typeof input === 'number') {
      foodOriginalPrice = input;
    } else if (input && typeof input.foodOriginalPrice === 'number') {
      foodOriginalPrice = input.foodOriginalPrice;
      options = { ...input, ...options };
    } else if (input && Array.isArray(input.items)) {
      itemsBreakdown = input.items.map((item) => {
        const itemOrig = Number(item.originalPrice || item.price || 0);
        const qty = Number(item.quantity || 1);
        const pricing = PricingService.calculateRestaurantPricing(itemOrig);
        return {
          productId: item.productId,
          name: item.name,
          quantity: qty,
          originalPrice: pricing.originalPrice,
          customerMenuPrice: pricing.customerMenuPrice,
          itemTotalOriginal: round2(pricing.originalPrice * qty),
          itemTotalCustomer: round2(pricing.customerMenuPrice * qty),
          pricing,
        };
      });

      foodOriginalPrice = itemsBreakdown.reduce((sum, i) => sum + i.itemTotalOriginal, 0);
      options = { ...input, ...options };
    } else {
      throw new Error('foodOriginalPrice or valid items array must be provided');
    }

    const pricing = PricingService.calculateRestaurantPricing(foodOriginalPrice, {
      menuAdjustmentPercent: options.menuAdjustmentPercent,
      commissionPercent: options.commissionPercent,
    });

    const subtotal = pricing.customerMenuPrice;
    const platformFee = options.platformFee !== undefined
      ? Number(options.platformFee)
      : config.pricing.customerPlatformFee;
    const deliveryFee = options.deliveryFee !== undefined
      ? Number(options.deliveryFee)
      : config.pricing.customerDeliveryFee;

    const customerPayable = round2(subtotal + platformFee + deliveryFee);
    const deliveryPartnerPayout = options.deliveryPartnerPayout !== undefined
      ? Number(options.deliveryPartnerPayout)
      : config.pricing.deliveryPartnerPayout;

    return {
      originalPrice: pricing.originalPrice,
      subtotal,
      platformFee,
      deliveryFee,
      customerPayable,
      deliveryPartnerPayout,
      vendorSettlement: pricing.vendorSettlement,
      quikoooGrossRevenue: pricing.quikoooGrossRevenue,
      menuAdjustmentAmount: pricing.menuAdjustmentAmount,
      commissionAmount: pricing.commissionAmount,
      pricing,
      items: itemsBreakdown.length > 0 ? itemsBreakdown : undefined,
    };
  }
}

module.exports = PricingService;
