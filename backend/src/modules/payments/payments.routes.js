const { Router } = require('express');
const PaymentsController = require('./payments.controller');
const { authenticate } = require('../../middleware/auth');

const router = Router();

router.post('/create', authenticate, PaymentsController.create);
router.post('/verify', authenticate, PaymentsController.verify);
router.post('/refund', authenticate, PaymentsController.refund);

module.exports = router;
