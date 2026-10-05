const { createGatewayOrder, verifyPaymentSignature, capturePayment, refundPayment } = require('./razorpay');
const OrdersModuleService = require('../orders/orders.service');
const OrderService = require('../../services/OrderService');
const { emitOrderStatus } = require('../../realtime');

class PaymentsService {
  /**
   * Creates a Gateway Order based ONLY on server-calculated totals.
   * If client passes an amount, an error is thrown to enforce zero-trust client pricing.
   */
  static async createGatewayOrder({ orderId, items, vendorId, addressId, zoneType, receipt, notes, clientAmount }) {
    // Zero-trust check: Reject client-specified amounts
    if (clientAmount !== undefined) {
      const err = new Error('Client-specified amount is not allowed. Order totals must be server-calculated.');
      err.statusCode = 400;
      throw err;
    }

    let calculatedPayable = 0;
    let resolvedOrderId = orderId;
    let receiptId = receipt;

    if (orderId) {
      const order = await OrdersModuleService.getById(orderId);
      if (!order) {
        const err = new Error(`Order ${orderId} not found`);
        err.statusCode = 404;
        throw err;
      }
      calculatedPayable = Number(order.customerPayable || order.totalAmount);
      receiptId = receiptId || order.orderNumber || `rcpt_${order.id}`;
    } else if (items && Array.isArray(items) && items.length > 0) {
      // Calculate server authoritative totals
      const calculation = OrderService.calculateOrder({
        vendorId,
        items,
        addressId,
        zoneType: zoneType || 'URBAN',
      });
      calculatedPayable = calculation.customerPayable;
      receiptId = receiptId || `rcpt_${Date.now()}`;
    } else {
      const err = new Error('Either orderId or non-empty items array must be provided to create gateway order.');
      err.statusCode = 400;
      throw err;
    }

    if (!calculatedPayable || calculatedPayable <= 0) {
      const err = new Error(`Calculated payable amount must be positive. Received: ${calculatedPayable}`);
      err.statusCode = 400;
      throw err;
    }

    // Convert INR to Paise for Razorpay
    const amountPaise = Math.round(calculatedPayable * 100);

    const gatewayOrder = await createGatewayOrder(amountPaise, receiptId, notes || { orderId: resolvedOrderId });

    return {
      gatewayOrder,
      orderId: resolvedOrderId,
      amount: calculatedPayable,
      amountPaise,
      currency: 'INR',
    };
  }

  /**
   * Backwards compatible createPayment wrapper
   */
  static async createPayment(payload) {
    if (payload.amount !== undefined) {
      const err = new Error('Client-specified amount is not allowed. Order totals must be server-calculated.');
      err.statusCode = 400;
      throw err;
    }
    return this.createGatewayOrder(payload);
  }

  /**
   * Verifies payment signature and marks order as confirmed
   */
  static async verifyPayment({ orderId, paymentId, signature, razorpay_order_id, razorpay_payment_id, razorpay_signature, secret }) {
    const finalOrderId = orderId || razorpay_order_id;
    const finalPaymentId = paymentId || razorpay_payment_id;
    const finalSignature = signature || razorpay_signature;

    if (!finalOrderId || !finalPaymentId || !finalSignature) {
      const err = new Error('Missing required verification parameters: orderId, paymentId, and signature are required.');
      err.statusCode = 400;
      throw err;
    }

    const isValid = verifyPaymentSignature(finalOrderId, finalPaymentId, finalSignature, secret);
    if (!isValid) {
      const err = new Error('Invalid payment signature verification failed.');
      err.statusCode = 400;
      throw err;
    }

    // If order exists in system, transition to PAYMENT_CONFIRMED
    let order = null;
    try {
      order = await OrdersModuleService.getById(finalOrderId);
      if (order) {
        try {
          OrderService.validateTransition(order.status, OrderService.ORDER_STATUS.PAYMENT_CONFIRMED);
          await OrdersModuleService.updateOrderStatus(finalOrderId, OrderService.ORDER_STATUS.PAYMENT_CONFIRMED);
          emitOrderStatus(finalOrderId, {
            status: OrderService.ORDER_STATUS.PAYMENT_CONFIRMED,
            transaction_id: finalPaymentId,
            orderNumber: order.orderNumber,
            zoneId: order.zoneId,
          });
        } catch (transErr) {
          // If already PAYMENT_CONFIRMED or invalid transition, log but continue
          console.warn(`[Payment Verification] Note on order ${finalOrderId} transition: ${transErr.message}`);
        }
      }
    } catch (findErr) {
      console.warn(`[Payment Verification] Could not update order ${finalOrderId}: ${findErr.message}`);
    }

    return {
      orderId: finalOrderId,
      paymentId: finalPaymentId,
      status: 'CONFIRMED',
      verified: true,
      verifiedAt: new Date().toISOString(),
    };
  }

  /**
   * Capture authorized payment
   */
  static async capturePayment({ paymentId, amount, currency = 'INR' }) {
    if (!paymentId) {
      const err = new Error('paymentId is required for capture');
      err.statusCode = 400;
      throw err;
    }
    const amountPaise = amount ? Math.round(Number(amount) * 100) : undefined;
    return capturePayment(paymentId, amountPaise, currency);
  }

  /**
   * Initiate refund
   */
  static async initiateRefund({ orderId, paymentId, amount, reason }) {
    const targetPaymentId = paymentId || `pay_ref_${orderId}`;
    const amountPaise = amount ? Math.round(Number(amount) * 100) : undefined;

    const refundResult = await refundPayment(targetPaymentId, amountPaise, {
      reason: reason || 'Customer requested refund',
      notes: { orderId },
    });

    if (orderId) {
      try {
        const order = await OrdersModuleService.getById(orderId);
        if (order && order.status === OrderService.ORDER_STATUS.CANCELLED) {
          await OrdersModuleService.updateOrderStatus(orderId, OrderService.ORDER_STATUS.REFUND_INITIATED);
        }
      } catch (err) {
        console.warn(`[PaymentsService] Could not transition order ${orderId} on refund: ${err.message}`);
      }
    }

    return {
      refundId: refundResult.id,
      orderId,
      paymentId: targetPaymentId,
      amount,
      reason,
      status: refundResult.status || 'REFUND_INITIATED',
      refundResult,
    };
  }
}

module.exports = PaymentsService;
