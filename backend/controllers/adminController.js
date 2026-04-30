const { readJSON, writeJSON } = require('../utils/db');
const fs = require('fs');
const path = require('path');

const VALID_STATUSES = ['pending', 'accepted', 'rejected', 'completed'];

/**
 * GET /api/admin/analytics — Dashboard summary statistics
 */
function getAnalytics(req, res) {
  try {
    const users = readJSON('users.json');
    const products = readJSON('products.json');
    const orders = readJSON('orders.json');
    const offers = readJSON('offers.json');

    const totalCustomers = users.filter(u => u.role === 'customer').length;
    const totalShopkeepers = users.filter(u => u.role === 'shopkeeper').length;
    const totalProducts = products.length;
    const totalOrders = orders.length;
    const totalOffers = offers.length;

    const totalRevenue = orders
      .filter(o => o.status === 'completed')
      .reduce((sum, o) => sum + (o.total || 0), 0);

    const pendingOrders = orders.filter(o => o.status === 'pending').length;
    const acceptedOrders = orders.filter(o => o.status === 'accepted').length;
    const completedOrders = orders.filter(o => o.status === 'completed').length;
    const rejectedOrders = orders.filter(o => o.status === 'rejected').length;

    // Recent orders (last 10)
    const recentOrders = orders
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    // Revenue per day (last 7 days)
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().split('T')[0];
      const dayOrders = orders.filter(o => o.createdAt && o.createdAt.startsWith(dayStr));
      const dayRevenue = dayOrders.reduce((sum, o) => sum + (o.total || 0), 0);
      last7Days.push({
        date: dayStr,
        orders: dayOrders.length,
        revenue: Math.round(dayRevenue * 100) / 100
      });
    }

    // Top categories
    const categoryCounts = {};
    products.forEach(p => {
      const cat = p.category || 'General';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    res.json({
      users: { total: users.length - 1, customers: totalCustomers, shopkeepers: totalShopkeepers },
      products: { total: totalProducts, categories: categoryCounts },
      orders: {
        total: totalOrders,
        pending: pendingOrders,
        accepted: acceptedOrders,
        completed: completedOrders,
        rejected: rejectedOrders
      },
      offers: { total: totalOffers, pending: offers.filter(o => o.status === 'pending').length },
      revenue: { total: Math.round(totalRevenue * 100) / 100 },
      recentOrders,
      last7Days
    });
  } catch (err) {
    console.error('Analytics error:', err);
    res.status(500).json({ error: 'Failed to generate analytics.' });
  }
}

/**
 * GET /api/admin/users — List all users (excluding passwords)
 */
function getUsers(req, res) {
  try {
    const users = readJSON('users.json');
    const sanitized = users.map(({ password, ...rest }) => rest);
    res.json(sanitized);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users.' });
  }
}

/**
 * DELETE /api/admin/users/:id — Delete a user
 */
function deleteUser(req, res) {
  try {
    const users = readJSON('users.json');
    const index = users.findIndex(u => u.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (users[index].id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own admin account.' });
    }

    // If deleting shopkeeper, also remove their products
    if (users[index].role === 'shopkeeper') {
      const products = readJSON('products.json');
      const remaining = products.filter(p => p.shopkeeperId !== users[index].id);
      writeJSON('products.json', remaining);
    }

    users.splice(index, 1);
    writeJSON('users.json', users);

    res.json({ message: 'User deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user.' });
  }
}

/**
 * PUT /api/admin/users/:id/approve — Admin: Approve a pending shopkeeper
 */
function approveShopkeeper(req, res) {
  try {
    const users = readJSON('users.json');
    const index = users.findIndex(u => u.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (users[index].role !== 'shopkeeper') {
      return res.status(400).json({ error: 'Only shopkeepers require approval.' });
    }

    users[index].isApproved = true;
    writeJSON('users.json', users);

    res.json({ message: 'Shopkeeper approved successfully.', user: users[index] });
  } catch (err) {
    console.error('Approve shopkeeper error:', err);
    res.status(500).json({ error: 'Failed to approve shopkeeper.' });
  }
}

/**
 * GET /api/admin/products — All products with shopkeeper info
 */
function getAllProducts(req, res) {
  try {
    const products = readJSON('products.json');
    const users = readJSON('users.json');

    const enriched = products.map(p => {
      const shopkeeper = users.find(u => u.id === p.shopkeeperId);
      return {
        ...p,
        shopkeeperName: shopkeeper ? shopkeeper.name : 'Unknown',
        shopkeeperEmail: shopkeeper ? shopkeeper.email : ''
      };
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
}

/**
 * DELETE /api/admin/products/:id — Delete any product
 */
function deleteProduct(req, res) {
  try {
    const products = readJSON('products.json');
    const index = products.findIndex(p => p.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    if (products[index].image && products[index].image.startsWith('/uploads/')) {
      const imgPath = path.join(__dirname, '..', products[index].image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    products.splice(index, 1);
    writeJSON('products.json', products);

    res.json({ message: 'Product deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete product.' });
  }
}

/**
 * GET /api/admin/orders — All orders
 */
function getAllOrders(req, res) {
  try {
    const orders = readJSON('orders.json');
    const sorted = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
}

/**
 * PUT /api/admin/orders/:id/status — Admin: update any order status
 */
function updateOrderStatus(req, res) {
  try {
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const orders = readJSON('orders.json');
    const index = orders.findIndex(o => o.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    orders[index].status = status;
    orders[index].updatedAt = new Date().toISOString();
    writeJSON('orders.json', orders);

    res.json({ message: 'Order status updated.', order: orders[index] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order status.' });
  }
}

/**
 * GET /api/admin/offers — All offers
 */
function getAllOffers(req, res) {
  try {
    const offers = readJSON('offers.json');
    const sorted = offers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch offers.' });
  }
}

module.exports = {
  getAnalytics, getUsers, deleteUser, approveShopkeeper,
  getAllProducts, deleteProduct,
  getAllOrders, updateOrderStatus,
  getAllOffers
};
