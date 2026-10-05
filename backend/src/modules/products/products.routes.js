const { Router } = require('express');
const ProductsController = require('./products.controller');

const router = Router();

// Specific routes first
router.get('/search', ProductsController.search);

// General list and parameterized routes
router.get('/', ProductsController.list);
router.get('/:id', ProductsController.getById);

module.exports = router;
