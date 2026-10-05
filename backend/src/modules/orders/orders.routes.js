const { Router } = require('express');
const OrdersController = require('./orders.controller');

const router = Router();

// POST /api/v1/orders/calculate (Public or Authenticated: calculate cart totals)
router.post('/calculate', OrdersController.calculate);

// POST /api/v1/orders (Create order)
router.post('/', OrdersController.create);

// GET /api/v1/orders/:id (Get order details)
router.get('/:id', OrdersController.getById);

// POST /api/v1/orders/:id/transition (Execute order state transition)
router.post('/:id/transition', OrdersController.transitionStatus);

// GET /api/v1/orders (List orders)
router.get('/', OrdersController.list);

module.exports = router;
