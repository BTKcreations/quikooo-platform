const { Router } = require('express');
const UsersController = require('./users.controller');
const { authenticate, authorize, ROLES } = require('../../middleware/auth');

const router = Router();

router.get('/', authenticate, authorize(ROLES.SUPER_ADMIN, ROLES.ADMIN), UsersController.listUsers);
router.get('/:id', authenticate, UsersController.getProfile);
router.patch('/:id', authenticate, UsersController.updateProfile);

module.exports = router;
