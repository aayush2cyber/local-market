const { v4: uuidv4 } = require('uuid');
const { readJSON, writeJSON } = require('../utils/db');

const ORDERS_FILE = 'orders.json';
const VALID_STATUSES = ['pending', 'accepted', 'rejected', 'completed'];

/**
 * POST /api/orders — Customer: place a new order
 */
function placeOrder(req, res) {
  try {
    const { items, address, phone, name: customerName, notes, deliveryType } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item.' });
    }

    const delivery = deliveryType === 'pickup' ? 'pickup' : 'delivery';

    if (delivery === 'delivery' && !address) {
      return res.status(400).json({ error: 'Delivery address is required for delivery orders.' });
    }

    // Calculate total from product prices
    const products = readJSON('products.json');
    let total = 0;
    const orderItems = items.map(item => {
      const product = products.find(p => p.id === item.productId);
      if (!product) return null;
      const qty = parseInt(item.quantity) || 1;
      total += product.price * qty;
      return {
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity: qty,
        image: product.image,
        shopkeeperId: product.shopkeeperId
      };
    }).filter(Boolean);

    if (orderItems.length === 0) {
      return res.status(400).json({ error: 'No valid products found in order.' });
    }

    // Group by shopkeeper to determine delivery charge
    const shopkeeperIds = [...new Set(orderItems.map(i => i.shopkeeperId))];
    let deliveryCharge = 0;

    if (delivery === 'delivery') {
      const users = readJSON('users.json');
      shopkeeperIds.forEach(skId => {
        const sk = users.find(u => u.id === skId);
        if (sk && sk.deliveryAvailable) {
          deliveryCharge += parseFloat(sk.deliveryCharge || 0);
        }
      });
    }

    const orders = readJSON(ORDERS_FILE);

    const newOrder = {
      id: uuidv4(),
      customerId: req.user.id,
      customerName: customerName || req.user.name,
      customerEmail: req.user.email,
      phone: phone || '',
      items: orderItems,
      total: Math.round((total + deliveryCharge) * 100) / 100,
      itemsTotal: Math.round(total * 100) / 100,
      deliveryCharge: Math.round(deliveryCharge * 100) / 100,
      deliveryType: delivery,
      status: 'pending',
      address: (address || '').trim(),
      notes: (notes || '').trim(),
      createdAt: new Date().toISOString()
    };

    orders.push(newOrder);
    writeJSON(ORDERS_FILE, orders);

    res.status(201).json({ message: 'Order placed successfully!', order: newOrder });
  } catch (err) {
    console.error('Place order error:', err);
    res.status(500).json({ error: 'Failed to place order.' });
  }
}

/**
 * GET /api/orders/my — Customer: get own order history
 */
function getMyOrders(req, res) {
  try {
    const orders = readJSON(ORDERS_FILE);
    const myOrders = orders
      .filter(o => o.customerId === req.user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(myOrders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
}

/**
 * GET /api/orders/shop — Shopkeeper: get orders containing their products
 */
function getShopOrders(req, res) {
  try {
    const orders = readJSON(ORDERS_FILE);
    const shopOrders = orders
      .filter(o => o.items.some(item => item.shopkeeperId === req.user.id))
      .map(o => ({
        ...o,
        // Only show items belonging to this shopkeeper
        items: o.items.filter(item => item.shopkeeperId === req.user.id)
      }))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(shopOrders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch shop orders.' });
  }
}

/**
 * GET /api/orders — Admin: get all orders
 */
function getAllOrders(req, res) {
  try {
    const orders = readJSON(ORDERS_FILE);
    const sorted = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders.' });
  }
}

/**
 * PUT /api/orders/:id/status — Shopkeeper or Admin: update order status
 */
function updateOrderStatus(req, res) {
  try {
    const { status } = req.body;

    if (!VALID_STATUSES.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${VALID_STATUSES.join(', ')}` });
    }

    const orders = readJSON(ORDERS_FILE);
    const index = orders.findIndex(o => o.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    // Shopkeepers can only update orders that contain their products
    if (req.user.role === 'shopkeeper') {
      const hasItem = orders[index].items.some(i => i.shopkeeperId === req.user.id);
      if (!hasItem) {
        return res.status(403).json({ error: 'You can only update orders containing your products.' });
      }
    }

    orders[index].status = status;
    orders[index].updatedAt = new Date().toISOString();
    writeJSON(ORDERS_FILE, orders);

    res.json({ message: 'Order status updated.', order: orders[index] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order.' });
  }
}

module.exports = { placeOrder, getMyOrders, getShopOrders, getAllOrders, updateOrderStatus };
