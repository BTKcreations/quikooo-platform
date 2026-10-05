const config = require('../config');
const PricingService = require('./PricingService');
const TaxService = require('./TaxService');
const FinancialLedgerService = require('./FinancialLedgerService');
const { round2 } = require('./TaxService');

const ORDER_STATUS = {
  ORDER_PLACED: 'ORDER_PLACED',
  PAYMENT_CONFIRMED: 'PAYMENT_CONFIRMED',
  VENDOR_ACCEPTED: 'VENDOR_ACCEPTED',
  PREPARING: 'PREPARING',
  READY_FOR_PICKUP: 'READY_FOR_PICKUP',
  DELIVERY_ASSIGNED: 'DELIVERY_ASSIGNED',
  DELIVERY_ACCEPTED: 'DELIVERY_ACCEPTED',
  PICKED_UP: 'PICKED_UP',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',

  // Rural specific state flow
  SCHEDULED_FOR_NEXT_DAY: 'SCHEDULED_FOR_NEXT_DAY',
  READY_FOR_MORNING_DISPATCH: 'READY_FOR_MORNING_DISPATCH',

  // Cancellation & Refund states
  CANCELLED: 'CANCELLED',
  REFUND_INITIATED: 'REFUND_INITIATED',
  REFUNDED: 'REFUNDED',
};

// Transition matrix for order state machine
const ALLOWED_TRANSITIONS = {
  [ORDER_STATUS.ORDER_PLACED]: [
    ORDER_STATUS.PAYMENT_CONFIRMED,
    ORDER_STATUS.CANCELLED,
  ],
  [ORDER_STATUS.PAYMENT_CONFIRMED]: [
    ORDER_STATUS.VENDOR_ACCEPTED,
    ORDER_STATUS.SCHEDULED_FOR_NEXT_DAY,
    ORDER_STATUS.CANCELLED,
  ],
  [ORDER_STATUS.SCHEDULED_FOR_NEXT_DAY]: [
    ORDER_STATUS.READY_FOR_MORNING_DISPATCH,
    ORDER_STATUS.CANCELLED,
  ],
  [ORDER_STATUS.READY_FOR_MORNING_DISPATCH]: [
    ORDER_STATUS.DELIVERY_ASSIGNED,
    ORDER_STATUS.CANCELLED,
  ],
  [ORDER_STATUS.VENDOR_ACCEPTED]: [
    ORDER_STATUS.PREPARING,
    ORDER_STATUS.CANCELLED,
  ],
  [ORDER_STATUS.PREPARING]: [
    ORDER_STATUS.READY_FOR_PICKUP,
    ORDER_STATUS.CANCELLED,
  ],
  [ORDER_STATUS.READY_FOR_PICKUP]: [
    ORDER_STATUS.DELIVERY_ASSIGNED,
    ORDER_STATUS.DELIVERY_ACCEPTED,
    ORDER_STATUS.CANCELLED,
  ],
  [ORDER_STATUS.DELIVERY_ASSIGNED]: [
    ORDER_STATUS.DELIVERY_ACCEPTED,
    ORDER_STATUS.CANCELLED,
  ],
  [ORDER_STATUS.DELIVERY_ACCEPTED]: [
    ORDER_STATUS.PICKED_UP,
    ORDER_STATUS.CANCELLED,
  ],
  [ORDER_STATUS.PICKED_UP]: [
    ORDER_STATUS.OUT_FOR_DELIVERY,
    ORDER_STATUS.CANCELLED,
  ],
  [ORDER_STATUS.OUT_FOR_DELIVERY]: [
    ORDER_STATUS.DELIVERED,
  ],
  [ORDER_STATUS.DELIVERED]: [], // Terminal state
  [ORDER_STATUS.CANCELLED]: [
    ORDER_STATUS.REFUND_INITIATED,
  ],
  [ORDER_STATUS.REFUND_INITIATED]: [
    ORDER_STATUS.REFUNDED,
  ],
  [ORDER_STATUS.REFUNDED]: [], // Terminal state
};

class OrderService {
  static ORDER_STATUS = ORDER_STATUS;
  static ALLOWED_TRANSITIONS = ALLOWED_TRANSITIONS;

  /**
   * Validates if transition from currentStatus to nextStatus is allowed
   * Throws an error on invalid transitions
   */
  static validateTransition(currentStatus, nextStatus) {
    if (!currentStatus || !nextStatus) {
      throw new Error(`Both currentStatus and nextStatus are required for transition check`);
    }

    const validNextStates = ALLOWED_TRANSITIONS[currentStatus];
    if (!validNextStates) {
      throw new Error(`Unknown or unmanaged order status: ${currentStatus}`);
    }

    if (!validNextStates.includes(nextStatus)) {
      throw new Error(`Invalid order status transition from ${currentStatus} to ${nextStatus}`);
    }

    return true;
  }

  /**
   * Enforces MVP single vendor cart constraint
   */
  static validateSingleVendor(items, primaryVendorId) {
    if (!Array.isArray(items) || items.length === 0) {
      throw new Error('Items array must be provided and non-empty');
    }

    const firstVendorId = primaryVendorId || items[0].vendorId;
    for (const item of items) {
      if (item.vendorId && item.vendorId !== firstVendorId) {
        throw new Error('MVP cart only supports items from a single vendor.');
      }
    }

    return firstVendorId;
  }

  /**
   * Calculates order breakdown with immutable server authority (no client trust)
   */
  static calculateOrder({ vendorId, items, addressId, zoneType = 'URBAN' }) {
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Valid items list is required');
    }

    // Verify MVP single vendor rule
    OrderService.validateSingleVendor(items, vendorId);

    // Calculate item pricing based on official 5% adjustment & 10% commission on original
    let totalOriginalPrice = 0;
    const computedItems = items.map((item, index) => {
      const orig = Number(item.originalPrice || item.price || 100);
      const qty = parseInt(item.quantity || 1, 10);
      const pricing = PricingService.calculateRestaurantPricing(orig);

      const itemTotalOriginal = round2(pricing.originalPrice * qty);
      const itemTotalCustomer = round2(pricing.customerMenuPrice * qty);
      totalOriginalPrice = round2(totalOriginalPrice + itemTotalOriginal);

      return {
        productId: item.productId || `prod_${index + 1}`,
        name: item.name || `Item ${index + 1}`,
        quantity: qty,
        originalPrice: pricing.originalPrice,
        menuAdjustmentPercent: pricing.menuAdjustmentPercent,
        menuAdjustmentAmount: pricing.menuAdjustmentAmount,
        customerMenuPrice: pricing.customerMenuPrice,
        commissionPercent: pricing.commissionPercent,
        commissionAmount: pricing.commissionAmount,
        vendorSettlement: pricing.vendorSettlement,
        quikoooGrossRevenue: pricing.quikoooGrossRevenue,
        itemTotalOriginal,
        itemTotalCustomer,
      };
    });

    // Overall aggregate totals
    const aggregatePricing = PricingService.calculateRestaurantPricing(totalOriginalPrice);
    const subtotal = aggregatePricing.customerMenuPrice;
    const platformFee = config.pricing.customerPlatformFee;
    const deliveryFee = config.pricing.customerDeliveryFee;
    const deliveryPartnerPayout = config.pricing.deliveryPartnerPayout;
    const customerPayable = round2(subtotal + platformFee + deliveryFee);

    // Financial split snapshots
    const quikoooGrossRevenue = aggregatePricing.quikoooGrossRevenue;
    const taxRate = config.tax.defaultRate;
    const taxCalculation = TaxService.calculateTax(quikoooGrossRevenue, taxRate);
    const revenueSplit = FinancialLedgerService.splitRevenue(taxCalculation.netAmount);

    return {
      vendorId,
      addressId: addressId || null,
      zoneType,
      items: computedItems,
      totalOriginalPrice: aggregatePricing.originalPrice,
      subtotal, // customerMenuPrice aggregate
      platformFee,
      deliveryFee,
      deliveryPartnerPayout,
      customerPayable, // subtotal + platformFee + deliveryFee (e.g. 105 + 5 + 25 = 135)
      vendorSettlement: aggregatePricing.vendorSettlement,
      quikoooGrossRevenue,
      tax: {
        taxRate,
        taxAmount: taxCalculation.taxAmount,
        netRevenuePool: taxCalculation.netAmount,
      },
      distribution: {
        agentSharePercent: config.pricing.agentSharePercent,
        agentShareAmount: revenueSplit.agentShare,
        quikoooSharePercent: config.pricing.quikoooSharePercent,
        quikoooShareAmount: revenueSplit.quikoooShare,
      },
    };
  }

  /**
   * Prepares immutable snapshot record for order creation in DB
   */
  static createOrderSnapshot({
    customerId,
    vendorId,
    zoneId,
    agentId,
    addressId,
    items,
    zoneType = 'URBAN',
  }) {
    const calc = OrderService.calculateOrder({ vendorId, items, addressId, zoneType });

    const orderNumber = `QK-${Date.now().toString(36).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

    return {
      orderNumber,
      customerId,
      vendorId,
      zoneId,
      agentId,
      addressId,
      status: ORDER_STATUS.ORDER_PLACED,
      zoneType,
      // Immutable pricing snapshot fields
      subtotal: calc.subtotal,
      platformFee: calc.platformFee,
      deliveryFee: calc.deliveryFee,
      deliveryPartnerPayout: calc.deliveryPartnerPayout,
      totalAmount: calc.customerPayable,
      vendorPayout: calc.vendorSettlement,
      commissionPercent: config.pricing.restaurantPlatformCommissionPercent,
      menuAdjustmentPercent: config.pricing.restaurantMenuAdjustmentPercent,
      quikoooGrossRevenue: calc.quikoooGrossRevenue,
      taxRate: calc.tax.taxRate,
      taxAmount: calc.tax.taxAmount,
      agentCommissionShare: calc.distribution.agentShareAmount,
      quikoooRevenueShare: calc.distribution.quikoooShareAmount,
      items: calc.items,
      createdAt: new Date().toISOString(),
    };
  }
}

module.exports = OrderService;
