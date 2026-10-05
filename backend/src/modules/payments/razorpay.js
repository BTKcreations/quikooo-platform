const crypto = require('crypto');
const Razorpay = require('razorpay');
const config = require('../../config');

/**
 * Checks if live Razorpay credentials are present
 */
function isLiveConfigured() {
  const keyId = config.razorpay?.keyId || process.env.RAZORPAY_KEY_ID;
  const keySecret = config.razorpay?.keySecret || process.env.RAZORPAY_KEY_SECRET;
  return Boolean(keyId && keySecret);
}

/**
 * Lazily instantiate Razorpay instance
 */
function getRazorpayInstance() {
  const keyId = config.razorpay?.keyId || process.env.RAZORPAY_KEY_ID;
  const keySecret = config.razorpay?.keySecret || process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    return null;
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });
}

/**
 * Create a Gateway Order (in paise)
 * @param {number|object} amountOrOptions - amount in paise or options object
 * @param {string} [receipt] - unique order receipt
 * @param {object} [notes] - metadata notes
 */
async function createGatewayOrder(amountOrOptions, receipt, notes = {}) {
  let amountPaise;
  let receiptId = receipt;
  let orderNotes = notes;
  let currency = 'INR';

  if (typeof amountOrOptions === 'object' && amountOrOptions !== null) {
    amountPaise = amountOrOptions.amount;
    receiptId = amountOrOptions.receipt || receipt;
    orderNotes = amountOrOptions.notes || notes;
    currency = amountOrOptions.currency || 'INR';
  } else {
    amountPaise = amountOrOptions;
  }

  amountPaise = Math.round(Number(amountPaise));
  if (isNaN(amountPaise) || amountPaise <= 0) {
    throw new Error(`Invalid amount for gateway order: ${amountPaise}. Must be positive paise integer.`);
  }

  receiptId = receiptId || `rcpt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  const rzp = getRazorpayInstance();
  if (rzp) {
    try {
      const order = await rzp.orders.create({
        amount: amountPaise,
        currency,
        receipt: receiptId,
        notes: orderNotes,
      });
      return order;
    } catch (err) {
      console.error('[Razorpay] Live order creation failed:', err.message);
      throw err;
    }
  }

  // Graceful degradation: test-mode stub
  console.log(`[Razorpay] TEST-MODE: simulated order created for amount ${amountPaise} paise (receipt: ${receiptId})`);
  const testId = `order_test_${crypto.randomBytes(8).toString('hex')}`;
  return {
    id: testId,
    entity: 'order',
    amount: amountPaise,
    amount_paid: 0,
    amount_due: amountPaise,
    currency,
    receipt: receiptId,
    status: 'created',
    attempts: 0,
    notes: orderNotes,
    created_at: Math.floor(Date.now() / 1000),
    test_mode: true,
  };
}

/**
 * Verifies payment signature using Razorpay validateWebhookSignature
 * Signature for checkout verify is HMAC-SHA256 of `${orderId}|${paymentId}` with secret.
 * @param {string|object} orderIdOrParams
 * @param {string} [paymentId]
 * @param {string} [signature]
 * @param {string} [customSecret]
 * @returns {boolean}
 */
function verifyPaymentSignature(orderIdOrParams, paymentId, signature, customSecret) {
  let orderIdVal = orderIdOrParams;
  let paymentIdVal = paymentId;
  let signatureVal = signature;
  let secretVal = customSecret;

  if (typeof orderIdOrParams === 'object' && orderIdOrParams !== null) {
    orderIdVal = orderIdOrParams.orderId || orderIdOrParams.order_id || orderIdOrParams.razorpay_order_id;
    paymentIdVal = orderIdOrParams.paymentId || orderIdOrParams.payment_id || orderIdOrParams.razorpay_payment_id;
    signatureVal = orderIdOrParams.signature || orderIdOrParams.razorpay_signature;
    secretVal = orderIdOrParams.secret || customSecret;
  }

  if (!orderIdVal || !paymentIdVal || !signatureVal) {
    return false;
  }

  const secret =
    secretVal ||
    config.razorpay?.keySecret ||
    process.env.RAZORPAY_KEY_SECRET ||
    config.razorpay?.webhookSecret ||
    'test_secret';

  const payload = `${orderIdVal}|${paymentIdVal}`;

  try {
    // Razorpay SDK validateWebhookSignature(body, signature, secret)
    return Razorpay.validateWebhookSignature(payload, signatureVal, secret);
  } catch (err) {
    // Fallback constant-time HMAC check
    try {
      const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex');
      const expectedBuf = Buffer.from(expected, 'utf8');
      const actualBuf = Buffer.from(signatureVal, 'utf8');
      if (expectedBuf.length !== actualBuf.length) return false;
      return crypto.timingSafeEqual(expectedBuf, actualBuf);
    } catch (e) {
      return false;
    }
  }
}

/**
 * Capture payment helper
 * @param {string} paymentId
 * @param {number} amountPaise
 * @param {string} [currency='INR']
 */
async function capturePayment(paymentId, amountPaise, currency = 'INR') {
  const rzp = getRazorpayInstance();
  const paise = Math.round(Number(amountPaise));

  if (rzp) {
    return rzp.payments.capture(paymentId, paise, currency);
  }

  console.log(`[Razorpay] TEST-MODE: payment ${paymentId} captured for ${paise} paise`);
  return {
    id: paymentId,
    entity: 'payment',
    status: 'captured',
    amount: paise,
    currency,
    captured: true,
    created_at: Math.floor(Date.now() / 1000),
    test_mode: true,
  };
}

/**
 * Refund payment helper
 * @param {string} paymentId
 * @param {number} amountPaise
 * @param {object} [options={}]
 */
async function refundPayment(paymentId, amountPaise, options = {}) {
  const rzp = getRazorpayInstance();
  const paise = amountPaise ? Math.round(Number(amountPaise)) : undefined;

  if (rzp) {
    const params = { ...options };
    if (paise) params.amount = paise;
    return rzp.payments.refund(paymentId, params);
  }

  console.log(`[Razorpay] TEST-MODE: refund created for payment ${paymentId}, amount: ${paise || 'full'}`);
  return {
    id: `rfnd_test_${crypto.randomBytes(6).toString('hex')}`,
    entity: 'refund',
    payment_id: paymentId,
    amount: paise || 0,
    status: 'processed',
    notes: options.notes || {},
    reason: options.reason || 'Customer request',
    created_at: Math.floor(Date.now() / 1000),
    test_mode: true,
  };
}

/**
 * Helper to generate a valid test signature for tests and mocking
 */
function generatePaymentSignature(orderId, paymentId, secret = config.razorpay?.keySecret || 'test_secret') {
  const payload = `${orderId}|${paymentId}`;
  return crypto.createHmac('sha256', secret).update(payload).digest('hex');
}

module.exports = {
  createGatewayOrder,
  verifyPaymentSignature,
  capturePayment,
  capture: capturePayment,
  refundPayment,
  refund: refundPayment,
  generatePaymentSignature,
  isLiveConfigured,
};
