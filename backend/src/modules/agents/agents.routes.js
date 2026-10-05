const { Router } = require('express');
const AgentsController = require('./agents.controller');
const { authenticate, authorize, checkAgentRestrictions, ROLES } = require('../../middleware/auth');

const router = Router();

router.get('/', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), AgentsController.list);
router.get('/:id', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.AGENT), checkAgentRestrictions, AgentsController.getById);
router.get('/:id/analytics', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.AGENT), checkAgentRestrictions, AgentsController.getAnalytics);
router.get('/:id/payouts', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.AGENT), checkAgentRestrictions, AgentsController.getPayouts);

module.exports = router;
