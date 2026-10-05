const { Router } = require('express');
const ProductsController = require('./products.controller');

const router = Router();

router.get('/', ProductsController.list);
router.get('/:id', ProductsController.getById);

module.exports = router;
