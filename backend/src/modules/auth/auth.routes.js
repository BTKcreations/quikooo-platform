const { Router } = require('express');
const AuthController = require('./auth.controller');
const { authenticate } = require('../../middleware/auth');

const router = Router();

// POST /api/v1/auth/login
router.post('/login', AuthController.login);

// POST /api/v1/auth/register
router.post('/register', AuthController.register);

// GET /api/v1/auth/me (Protected)
router.get('/me', authenticate, AuthController.me);

module.exports = router;
