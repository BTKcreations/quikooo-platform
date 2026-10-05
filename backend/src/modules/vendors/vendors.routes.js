const { Router } = require('express');
const VendorsController = require('./vendors.controller');

const router = Router();

router.get('/', VendorsController.list);
router.get('/:id', VendorsController.getById);
router.get('/:id/products', VendorsController.getProducts);

module.exports = router;
