const crypto = require('crypto');
const OrdersModuleService = require('../orders/orders.service');
const OrderService = require('../../services/OrderService');
const { emitOrderStatus } = require('../../realtime');

const DEFAULT_WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || 'quikooo_webhook_secret_key';

// In-memory idempotency store to prevent duplicate payment processing
// Maps transaction_id -> { order_id, processedAt, status }
const processedTransactions = new Map();

/**
 * Generates an HMAC-SHA256 signature for a webhook payload
 * @param {string|object} payload
 * @param {string} secret
 * @returns {string} hex digest
 */
function generateGatewaySignature(payload, secret = DEFAULT_WEBHOOK_SECRET) {
  const data = typeof payload === 'string' ? payload : JSON.stringify(payload);
  return crypto
    .createHmac('sha256', secret)
    .update(data)
    .digest('hex');
}

/**
 * Verifies an HMAC-SHA256 gateway signature using constant-time comparison
 * @param {string|object} payload
 * @param {string} signature
 * @param {string} secret
 * @returns {boolean}
 */
function verifyGatewaySignature(payload, signature, secret = DEFAULT_WEBHOOK_SECRET) {
  if (!signature || typeof signature !== 'string') {
    return false;
  }

  try {
    const expected = generateGatewaySignature(payload, secret);
    const expectedBuffer = Buffer.from(expected, 'utf8');
    const actualBuffer = Buffer.from(signature, 'utf8');

    if (expectedBuffer.length !== actualBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuffer, actualBuffer);
  } catch (err) {
    return false;
  }
}

/**
 * Resets idempotency map (utility for test suites)
 */
function clearProcessedTransactions() {
  processedTransactions.clear();
}

/**
 * Returns processed transactions map
 */
function getProcessedTransactions() {
  return processedTransactions;
}

/**
 * Payment Gateway Webhook Handler
 * 
 * Rules:
 * 1. Cryptographic HMAC-SHA256 signature verification (rejects unauthorized/tampered calls).
 * 2. Strict idempotency via unique transaction_id check (duplicate deliveries return 200 OK without re-executing).
 * 3. Authority rule: Only this verified webhook handler can mark an order as PAYMENT_CONFIRMED.
 * 4. Invalid transitions (e.g. from CANCELLED or DELIVERED) are rejected.
 * 5. Broadcasts realtime 'order.status' event to Socket.IO order room.
 */
async function handlePaymentWebhook(req, res, next) {
  try {
    // 1. Signature Verification
    const signature =
      req.headers['x-gateway-signature'] ||
      req.headers['x-razorpay-signature'] ||
      req.headers['x-webhook-signature'] ||
      req.headers['x-signature'] ||
      req.body?.signature;

    // Remove signature from body when verifying if it was passed in body
    let bodyForVerification = req.body;
    if (req.body && req.body.signature) {
      const { signature: _sig, ...rest } = req.body;
      bodyForVerification = rest;
    }

    const isValid = verifyGatewaySignature(bodyForVerification, signature);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or missing gateway signature',
      });
    }

    // 2. Transaction Idempotency Check
    const transactionId =
      req.body.transaction_id ||
      req.body.transactionId ||
      req.body.payment_id ||
      req.body.id;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: 'Missing transaction_id for idempotency tracking',
      });
    }

    if (processedTransactions.has(transactionId)) {
      const existing = processedTransactions.get(transactionId);
      return res.status(200).json({
        success: true,
        duplicate: true,
        message: 'Webhook already processed (idempotent duplicate)',
        transaction_id: transactionId,
        order_id: existing.order_id,
        status: OrderService.ORDER_STATUS.PAYMENT_CONFIRMED,
      });
    }

    // 3. Order ID Validation & Transition Verification
    const orderId = req.body.order_id || req.body.orderId;
    if (!orderId) {
      return res.status(400).json({
        success: false,
        message: 'Missing order_id in webhook payload',
      });
    }

    const order = await OrdersModuleService.getById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: `Order ${orderId} not found`,
      });
    }

    // State machine check: ORDER_PLACED -> PAYMENT_CONFIRMED
    try {
      OrderService.validateTransition(order.status, OrderService.ORDER_STATUS.PAYMENT_CONFIRMED);
    } catch (transitionErr) {
      return res.status(400).json({
        success: false,
        message: transitionErr.message,
      });
    }

    // 4. Authoritative State Mutation (Payment Confirmed)
    await OrdersModuleService.updateOrderStatus(orderId, OrderService.ORDER_STATUS.PAYMENT_CONFIRMED);

    // Record transaction as processed
    processedTransactions.set(transactionId, {
      order_id: orderId,
      amount: req.body.amount,
      status: OrderService.ORDER_STATUS.PAYMENT_CONFIRMED,
      processedAt: new Date().toISOString(),
    });

    // 5. Realtime Socket.IO Broadcast
    emitOrderStatus(orderId, {
      status: OrderService.ORDER_STATUS.PAYMENT_CONFIRMED,
      transaction_id: transactionId,
      orderNumber: order.orderNumber,
      zoneId: order.zoneId,
    });

    return res.status(200).json({
      success: true,
      duplicate: false,
      message: 'Payment confirmed successfully',
      transaction_id: transactionId,
      order_id: orderId,
      status: OrderService.ORDER_STATUS.PAYMENT_CONFIRMED,
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  verifyGatewaySignature,
  generateGatewaySignature,
  handlePaymentWebhook,
  clearProcessedTransactions,
  getProcessedTransactions,
  DEFAULT_WEBHOOK_SECRET,
};
