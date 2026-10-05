const { Router } = require('express');
const DeliveryController = require('./delivery.controller');
const { authenticate, authorize, ROLES } = require('../../middleware/auth');

const router = Router();

router.post('/assign', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.AGENT), DeliveryController.assign);
router.get('/track/:id', DeliveryController.track);
router.patch('/status', authenticate, authorize(ROLES.DELIVERY_PARTNER, ROLES.ADMIN), DeliveryController.updateStatus);

module.exports = router;
