const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { readJSON, writeJSON } = require('../utils/db');
const { JWT_SECRET } = require('../middleware/auth');

const USERS_FILE = 'users.json';

/**
 * Seed the default admin account if no admin exists.
 */
function seedAdmin() {
  const users = readJSON(USERS_FILE);
  const adminExists = users.some(u => u.role === 'admin');
  if (!adminExists) {
    const hashed = bcrypt.hashSync('admin123', 10);
    users.push({
      id: uuidv4(),
      name: 'Admin',
      email: 'admin@nirjuli.com',
      password: hashed,
      role: 'admin',
      createdAt: new Date().toISOString()
    });
    writeJSON(USERS_FILE, users);
    console.log('  ✓ Default admin seeded: admin@nirjuli.com / admin123');
  }
}

// Seed on module load
seedAdmin();

/**
 * POST /api/auth/signup
 */
async function signup(req, res) {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const userRole = (role === 'shopkeeper') ? 'shopkeeper' : 'customer';

    const users = readJSON(USERS_FILE);

    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const hashed = await bcrypt.hash(password, 10);

    const newUser = {
      id: uuidv4(),
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashed,
      role: userRole,
      // Shopkeeper profile fields
      shopName: userRole === 'shopkeeper' ? name.trim() + "'s Shop" : undefined,
      shopAddress: userRole === 'shopkeeper' ? '' : undefined,
      deliveryAvailable: userRole === 'shopkeeper' ? false : undefined,
      deliveryCharge: userRole === 'shopkeeper' ? 0 : undefined,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    writeJSON(USERS_FILE, users);

    const token = jwt.sign(
      { id: newUser.id, email: newUser.email, role: newUser.role, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Account created successfully.',
      token,
      user: {
        id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role,
        shopName: newUser.shopName, shopAddress: newUser.shopAddress,
        deliveryAvailable: newUser.deliveryAvailable, deliveryCharge: newUser.deliveryCharge
      }
    });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'Server error during signup.' });
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const users = readJSON(USERS_FILE);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: {
        id: user.id, name: user.name, email: user.email, role: user.role,
        shopName: user.shopName, shopAddress: user.shopAddress,
        deliveryAvailable: user.deliveryAvailable, deliveryCharge: user.deliveryCharge
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
}

/**
 * GET /api/auth/me
 */
function getMe(req, res) {
  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.id === req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found.' });
  }
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    shopName: user.shopName,
    shopAddress: user.shopAddress,
    deliveryAvailable: user.deliveryAvailable,
    deliveryCharge: user.deliveryCharge,
    createdAt: user.createdAt
  });
}

/**
 * PUT /api/auth/shop-profile — Shopkeeper: update shop settings
 */
function updateShopProfile(req, res) {
  try {
    const { shopName, shopAddress, deliveryAvailable, deliveryCharge } = req.body;

    const users = readJSON(USERS_FILE);
    const index = users.findIndex(u => u.id === req.user.id);

    if (index === -1) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (shopName !== undefined) users[index].shopName = shopName.trim();
    if (shopAddress !== undefined) users[index].shopAddress = shopAddress.trim();
    if (deliveryAvailable !== undefined) users[index].deliveryAvailable = !!deliveryAvailable;
    if (deliveryCharge !== undefined) users[index].deliveryCharge = parseFloat(deliveryCharge) || 0;

    writeJSON(USERS_FILE, users);

    res.json({
      message: 'Shop profile updated.',
      shop: {
        shopName: users[index].shopName,
        shopAddress: users[index].shopAddress,
        deliveryAvailable: users[index].deliveryAvailable,
        deliveryCharge: users[index].deliveryCharge
      }
    });
  } catch (err) {
    console.error('Update shop profile error:', err);
    res.status(500).json({ error: 'Failed to update shop profile.' });
  }
}

module.exports = { signup, login, getMe, updateShopProfile };
