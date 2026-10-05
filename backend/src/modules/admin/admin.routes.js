const { Router } = require('express');
const AdminController = require('./admin.controller');
const { authenticate, authorize, ROLES } = require('../../middleware/auth');

const router = Router();

router.get('/config', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), AdminController.getConfig);
router.patch('/config', authenticate, authorize(ROLES.SUPER_ADMIN), AdminController.updateConfig);
router.get('/audit-logs', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), AdminController.getAuditLogs);

module.exports = router;
