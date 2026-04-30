const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  placeOrder,
  getMyOrders,
  getShopOrders,
  getAllOrders,
  updateOrderStatus
} = require('../controllers/orderController');

// Customer
router.post('/orders', authenticate, authorize('customer'), placeOrder);
router.get('/orders/my', authenticate, authorize('customer'), getMyOrders);

// Shopkeeper
router.get('/orders/shop', authenticate, authorize('shopkeeper'), getShopOrders);
router.put('/orders/:id/status', authenticate, authorize('shopkeeper', 'admin'), updateOrderStatus);

// Admin
router.get('/orders', authenticate, authorize('admin'), getAllOrders);

module.exports = router;
