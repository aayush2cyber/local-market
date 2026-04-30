const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  getAnalytics, getUsers, deleteUser, approveShopkeeper,
  getAllProducts, deleteProduct,
  getAllOrders, updateOrderStatus,
  getAllOffers
} = require('../controllers/adminController');

// All admin routes require admin role
router.use(authenticate, authorize('admin'));

router.get('/admin/analytics', getAnalytics);
router.get('/admin/users', getUsers);
router.delete('/admin/users/:id', deleteUser);
router.put('/admin/users/:id/approve', approveShopkeeper);
router.get('/admin/products', getAllProducts);
router.delete('/admin/products/:id', deleteProduct);
router.get('/admin/orders', getAllOrders);
router.put('/admin/orders/:id/status', updateOrderStatus);
router.get('/admin/offers', getAllOffers);

module.exports = router;
