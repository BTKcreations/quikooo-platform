const { Router } = require('express');
const ReportsController = require('./reports.controller');
const { authenticate, authorize, ROLES } = require('../../middleware/auth');

const router = Router();

router.get('/sales', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), ReportsController.getSales);
router.get('/agent-commissions', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.AGENT), ReportsController.getAgentCommissions);
router.get('/rural-batches', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.AGENT), ReportsController.getRuralBatches);

module.exports = router;
