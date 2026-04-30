const express = require('express');
const router = express.Router();
const { signup, login, getMe, updateShopProfile, verifyOtp } = require('../controllers/authController');
const { authenticate, authorize } = require('../middleware/auth');

// Public routes
router.post('/auth/signup', signup);
router.post('/auth/login', login);
router.post('/auth/verify-otp', verifyOtp);

// Protected routes
router.get('/auth/me', authenticate, getMe);
router.put('/auth/shop-profile', authenticate, authorize('shopkeeper'), updateShopProfile);

module.exports = router;
