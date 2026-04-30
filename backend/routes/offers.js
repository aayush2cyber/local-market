const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');
const {
  createOffer,
  getMyOffers,
  getShopOffers,
  respondToOffer,
  getAllOffers
} = require('../controllers/offerController');

// Customer routes
router.post('/offers', authenticate, authorize('customer'), createOffer);
router.get('/offers/my', authenticate, authorize('customer'), getMyOffers);

// Shopkeeper routes
router.get('/offers/shop', authenticate, authorize('shopkeeper'), getShopOffers);
router.put('/offers/:id', authenticate, authorize('shopkeeper', 'admin'), respondToOffer);

// Admin routes
router.get('/offers', authenticate, authorize('admin'), getAllOffers);

module.exports = router;
