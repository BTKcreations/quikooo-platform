const { Router } = require('express');
const FinanceController = require('./finance.controller');
const { authenticate, authorize, checkAgentRestrictions, ROLES } = require('../../middleware/auth');

const router = Router();

// Agents and admins can view summary/ledger, but agents cannot create/modify entries
router.get('/ledger', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.AGENT), checkAgentRestrictions, FinanceController.getLedger);
router.get('/summary', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN, ROLES.AGENT), checkAgentRestrictions, FinanceController.getSummary);
router.post('/entry', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), checkAgentRestrictions, FinanceController.createEntry);

module.exports = router;
