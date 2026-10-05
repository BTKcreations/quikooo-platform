const { Router } = require('express');
const PaymentsController = require('./payments.controller');
const { handlePaymentWebhook } = require('./payments.webhook');
const { authenticate } = require('../../middleware/auth');

const router = Router();

// Public webhook endpoint for payment gateways (protected by HMAC-SHA256 signature)
router.post('/webhook', handlePaymentWebhook);

router.post('/create', authenticate, PaymentsController.create);
router.post('/verify', authenticate, PaymentsController.verify);
router.post('/refund', authenticate, PaymentsController.refund);

module.exports = router;
