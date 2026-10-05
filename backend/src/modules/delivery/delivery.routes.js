const { Router } = require('express');
const DeliveryController = require('./delivery.controller');
const { updateLocation, getTracking } = require('./delivery.tracking');
const { authenticate, authorize, ROLES } = require('../../middleware/auth');

const router = Router();

router.post('/assign', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.AGENT), DeliveryController.assign);

// Live GPS Tracking & Telemetry endpoints
router.post('/:id/location', updateLocation);
router.get('/:id/track', getTracking);
router.get('/track/:id', getTracking);

router.patch('/status', authenticate, authorize(ROLES.DELIVERY_PARTNER, ROLES.ADMIN), DeliveryController.updateStatus);

module.exports = router;
