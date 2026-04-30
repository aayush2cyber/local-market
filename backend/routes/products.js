const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');
const {
  getAllProducts,
  getCategories,
  getProduct,
  getMyProducts,
  createProduct,
  updateProduct,
  deleteProduct
} = require('../controllers/productController');

// Public routes
router.get('/products/categories', getCategories);
router.get('/products', getAllProducts);

// Shopkeeper: get own products (must come before :id route)
router.get('/products/my', authenticate, authorize('shopkeeper'), getMyProducts);

// Public: single product
router.get('/products/:id', getProduct);

// Shopkeeper: CRUD
router.post('/products', authenticate, authorize('shopkeeper'), upload.single('image'), createProduct);
router.put('/products/:id', authenticate, authorize('shopkeeper', 'admin'), upload.single('image'), updateProduct);
router.delete('/products/:id', authenticate, authorize('shopkeeper', 'admin'), deleteProduct);

module.exports = router;
