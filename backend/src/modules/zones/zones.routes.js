const { Router } = require('express');
const ZonesController = require('./zones.controller');

const router = Router();

router.get('/', ZonesController.list);
router.get('/:id', ZonesController.getById);
router.post('/check-eligibility', ZonesController.checkEligibility);

module.exports = router;
