const { Router } = require('express');
const SettlementsController = require('./settlements.controller');
const { authenticate, authorize, ROLES } = require('../../middleware/auth');

const router = Router();

router.get('/', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), SettlementsController.list);
router.post('/calculate', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), SettlementsController.calculate);
router.post('/process', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), SettlementsController.process);

module.exports = router;
