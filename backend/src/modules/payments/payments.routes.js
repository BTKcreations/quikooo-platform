const { Router } = require('express');
const PaymentsController = require('./payments.controller');
const { handlePaymentWebhook } = require('./payments.webhook');

const router = Router();

// Public webhook endpoint for payment gateways (protected by HMAC-SHA256 signature)
router.post('/webhook', handlePaymentWebhook);

// Payment order endpoints (server creates gateway order from server-calculated totals ONLY, never client amount)
router.post('/create-order', PaymentsController.createOrder);
router.post('/create', PaymentsController.create);
router.post('/verify', PaymentsController.verify);
router.post('/refund', PaymentsController.refund);

module.exports = router;
