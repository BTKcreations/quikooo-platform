const { Router } = require('express');
const NotificationsController = require('./notifications.controller');
const { authenticate } = require('../../middleware/auth');

const router = Router();

router.get('/', authenticate, NotificationsController.list);
router.post('/send', authenticate, NotificationsController.send);
router.patch('/:id/read', authenticate, NotificationsController.markRead);

module.exports = router;
