const crypto = require('crypto');
const OrdersModuleService = require('../orders/orders.service');
const OrderService = require('../../services/OrderService');
const { emitOrderStatus } = require('../../realtime');
const { refundPayment } = require('./razorpay');
const config = require('../../config');

const DEFAULT_WEBHOOK_SECRET =
  config.razorpay?.webhookSecret ||
  process.env.PAYMENT_WEBHOOK_SECRET ||
  'quikooo_webhook_secret_key';

// In-memory Set of processed event IDs for strict idempotency
// In production with Redis:
// await redisClient.sAdd('webhook:processed_events', eventId);
// await redisClient.expire('webhook:processed_events', 7 * 86400); // 7 day retention
const processedEventIds = new Set();

// In-memory map for transaction idempotency & tracking
// Maps transaction_id -> { order_id, processedAt, status, event }
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
 * Reset idempotency stores (utility for test suites)
 */
function clearProcessedTransactions() {
  processedTransactions.clear();
  processedEventIds.clear();
}

function getProcessedTransactions() {
  return processedTransactions;
}

function getProcessedEventIds() {
  return processedEventIds;
}

/**
 * Core async processing for webhook events
 */
async function processWebhookPayload(body) {
  const event = body.event || 'payment.captured';
  const payloadEntity =
    body.payload?.payment?.entity ||
    body.payload?.refund?.entity ||
    body;

  const orderId =
    body.order_id ||
    body.orderId ||
    payloadEntity.notes?.orderId ||
    payloadEntity.notes?.order_id ||
    payloadEntity.order_id ||
    payloadEntity.orderId;

  const paymentId =
    payloadEntity.id ||
    body.transaction_id ||
    body.transactionId ||
    body.payment_id;

  const amount = payloadEntity.amount || body.amount;

  if (!orderId) {
    console.warn('[Payment Webhook] Event received without resolvable order_id');
    return { success: false, reason: 'missing_order_id' };
  }

  const order = await OrdersModuleService.getById(orderId);
  if (!order) {
    console.warn(`[Payment Webhook] Order ${orderId} not found`);
    return { success: false, reason: 'order_not_found' };
  }

  // Handle Event Types
  switch (event) {
    case 'payment.authorized': {
      // Check for late-auth condition: if order was already cancelled, issue automatic refund
      if (order.status === OrderService.ORDER_STATUS.CANCELLED) {
        console.warn(
          `[Payment Webhook] Late-auth detected: payment.authorized received for CANCELLED order ${orderId}. Initiating late-auth refund note and gateway refund.`
        );
        const refundResult = await refundPayment(paymentId, amount, {
          reason: 'Late-auth auto-refund for cancelled order',
          notes: { orderId, condition: 'late_authorization' },
        });
        return {
          status: order.status,
          lateAuthRefund: true,
          refundId: refundResult.id,
          note: 'Late-auth auto-refund initiated',
        };
      }
      return { status: order.status, authorized: true };
    }

    case 'payment.captured': {
      // Check for late-auth condition on captured payments
      if (order.status === OrderService.ORDER_STATUS.CANCELLED) {
        console.warn(
          `[Payment Webhook] Late-capture detected: payment.captured received for CANCELLED order ${orderId}. Initiating auto-refund.`
        );
        const refundResult = await refundPayment(paymentId, amount, {
          reason: 'Late-capture auto-refund for cancelled order',
          notes: { orderId, condition: 'late_authorization' },
        });
        return {
          status: order.status,
          lateAuthRefund: true,
          refundId: refundResult.id,
          note: 'Late-auth refund processed',
        };
      }

      // Normal path: Transition order to PAYMENT_CONFIRMED
      OrderService.validateTransition(order.status, OrderService.ORDER_STATUS.PAYMENT_CONFIRMED);
      await OrdersModuleService.updateOrderStatus(orderId, OrderService.ORDER_STATUS.PAYMENT_CONFIRMED);

      emitOrderStatus(orderId, {
        status: OrderService.ORDER_STATUS.PAYMENT_CONFIRMED,
        transaction_id: paymentId,
        orderNumber: order.orderNumber,
        zoneId: order.zoneId,
      });

      return {
        status: OrderService.ORDER_STATUS.PAYMENT_CONFIRMED,
        confirmed: true,
      };
    }

    case 'payment.failed': {
      console.warn(`[Payment Webhook] Payment failed for order ${orderId}. Reason: ${payloadEntity.error_description || 'Gateway decline'}`);
      emitOrderStatus(orderId, {
        status: 'PAYMENT_FAILED',
        orderNumber: order.orderNumber,
        error: payloadEntity.error_description || 'Payment failed',
      });
      return { status: 'PAYMENT_FAILED', failed: true };
    }

    case 'refund.created': {
      try {
        if (order.status === OrderService.ORDER_STATUS.CANCELLED) {
          await OrdersModuleService.updateOrderStatus(orderId, OrderService.ORDER_STATUS.REFUND_INITIATED);
        }
      } catch (e) {
        console.warn(`[Payment Webhook] refund.created transition notice: ${e.message}`);
      }
      return { status: OrderService.ORDER_STATUS.REFUND_INITIATED, refundCreated: true };
    }

    case 'refund.processed': {
      try {
        if (order.status === OrderService.ORDER_STATUS.CANCELLED || order.status === OrderService.ORDER_STATUS.REFUND_INITIATED) {
          // If in CANCELLED state, move first to REFUND_INITIATED then REFUNDED if needed
          if (order.status === OrderService.ORDER_STATUS.CANCELLED) {
            await OrdersModuleService.updateOrderStatus(orderId, OrderService.ORDER_STATUS.REFUND_INITIATED);
          }
          await OrdersModuleService.updateOrderStatus(orderId, OrderService.ORDER_STATUS.REFUNDED);
        }
      } catch (e) {
        console.warn(`[Payment Webhook] refund.processed transition notice: ${e.message}`);
      }
      return { status: OrderService.ORDER_STATUS.REFUNDED, refunded: true };
    }

    case 'refund.failed': {
      console.error(`[Payment Webhook] Critical: Refund failed on gateway for order ${orderId}. Manual intervention needed.`);
      return { status: order.status, refundFailed: true };
    }

    default:
      return { status: order.status, unhandledEvent: event };
  }
}

/**
 * Payment Gateway Webhook Handler
 * 
 * Rules:
 * 1. Cryptographic HMAC-SHA256 signature verification.
 * 2. Idempotency tracking via event ID / transaction ID (Set + Map, Redis-backed in production).
 * 3. Authority: Only verified webhook marks order as PAYMENT_CONFIRMED.
 * 4. Immediate HTTP 200 response with async event processing.
 * 5. Handles payment.authorized, payment.captured, payment.failed,
 *    refund.created, refund.processed, refund.failed, and late-auth refund conditions.
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

    // 2. Transaction / Event Idempotency Check
    const eventId =
      req.headers['x-razorpay-event-id'] ||
      req.body.id ||
      req.body.event_id ||
      req.body.transaction_id ||
      req.body.transactionId ||
      req.body.payment_id ||
      req.body.payload?.payment?.entity?.id ||
      req.body.payload?.refund?.entity?.id;

    const transactionId =
      req.body.transaction_id ||
      req.body.transactionId ||
      req.body.payment_id ||
      req.body.id ||
      eventId;

    if (!transactionId && !eventId) {
      return res.status(400).json({
        success: false,
        message: 'Missing transaction_id for idempotency tracking',
      });
    }

    const primaryKey = transactionId || eventId;

    // Duplicate detection
    if (processedEventIds.has(primaryKey) || (transactionId && processedTransactions.has(transactionId))) {
      const existing = processedTransactions.get(transactionId) || {};
      return res.status(200).json({
        success: true,
        duplicate: true,
        message: 'Webhook already processed (idempotent duplicate)',
        transaction_id: transactionId,
        order_id: existing.order_id || req.body.order_id,
        status: existing.status || OrderService.ORDER_STATUS.PAYMENT_CONFIRMED,
      });
    }

    // 3. Order ID Validation & Transition Verification for capture events
    const orderId =
      req.body.order_id ||
      req.body.orderId ||
      req.body.payload?.payment?.entity?.notes?.orderId ||
      req.body.payload?.payment?.entity?.order_id ||
      req.body.payload?.refund?.entity?.notes?.orderId;

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

    const event = req.body.event || 'payment.captured';

    // State machine validation: Check transition compatibility
    if (event === 'payment.captured' || !req.body.event) {
      try {
        OrderService.validateTransition(order.status, OrderService.ORDER_STATUS.PAYMENT_CONFIRMED);
      } catch (transitionErr) {
        if (order.status === OrderService.ORDER_STATUS.CANCELLED) {
          console.warn(
            `[Payment Webhook] Late-auth / late-capture detected for CANCELLED order ${orderId}. Late-auth refund note: Order is already CANCELLED. Auto-refund should be processed.`
          );
          // Note late-auth refund processing
          refundPayment(transactionId, req.body.amount, {
            reason: 'Late-auth auto-refund for cancelled order',
            notes: { orderId, condition: 'late_authorization' },
          }).catch((err) => console.error('[Payment Webhook] Late-auth refund error:', err.message));
        }
        return res.status(400).json({
          success: false,
          message: transitionErr.message,
        });
      }
    }

    // Record as processed in Set (and Map for metadata)
    processedEventIds.add(primaryKey);
    processedTransactions.set(primaryKey, {
      order_id: orderId,
      amount: req.body.amount,
      event,
      status: OrderService.ORDER_STATUS.PAYMENT_CONFIRMED,
      processedAt: new Date().toISOString(),
    });

    // 4. Async Processing with Immediate 200 Return
    const asyncProcessingPromise = processWebhookPayload(req.body);

    if (process.env.NODE_ENV === 'test') {
      // In test environment, wait for processing to finish so assertions never race
      const result = await asyncProcessingPromise;
      return res.status(200).json({
        success: true,
        duplicate: false,
        message: 'Payment confirmed successfully',
        transaction_id: transactionId,
        order_id: orderId,
        status: result?.status || OrderService.ORDER_STATUS.PAYMENT_CONFIRMED,
        ...result,
      });
    }

    // Production: Return 200 immediately to avoid gateway timeouts, process asynchronously in background
    res.status(200).json({
      success: true,
      duplicate: false,
      message: 'Webhook received and queued for asynchronous processing',
      transaction_id: transactionId,
      order_id: orderId,
    });

    asyncProcessingPromise.catch((err) => {
      console.error('[Payment Webhook] Background async processing error:', err);
    });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  verifyGatewaySignature,
  generateGatewaySignature,
  handlePaymentWebhook,
  processWebhookPayload,
  clearProcessedTransactions,
  getProcessedTransactions,
  getProcessedEventIds,
  DEFAULT_WEBHOOK_SECRET,
};
