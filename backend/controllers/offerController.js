const { v4: uuidv4 } = require('uuid');
const { readJSON, writeJSON } = require('../utils/db');

const OFFERS_FILE = 'offers.json';

/**
 * POST /api/offers — Customer: submit a price offer on a product
 */
function createOffer(req, res) {
  try {
    const { productId, offeredPrice } = req.body;

    if (!productId || !offeredPrice) {
      return res.status(400).json({ error: 'productId and offeredPrice are required.' });
    }

    const products = readJSON('products.json');
    const product = products.find(p => p.id === productId);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    const parsedPrice = parseFloat(offeredPrice);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return res.status(400).json({ error: 'offeredPrice must be a positive number.' });
    }

    const offers = readJSON(OFFERS_FILE);

    // Prevent duplicate pending offer from same customer on same product
    const existing = offers.find(
      o => o.productId === productId && o.customerId === req.user.id && o.status === 'pending'
    );
    if (existing) {
      return res.status(409).json({ error: 'You already have a pending offer on this product.' });
    }

    const newOffer = {
      id: uuidv4(),
      productId,
      productName: product.name,
      productImage: product.image || '',
      originalPrice: product.price,
      offeredPrice: parsedPrice,
      customerId: req.user.id,
      customerName: req.user.name,
      shopkeeperId: product.shopkeeperId,
      status: 'pending',  // pending | accepted | rejected
      createdAt: new Date().toISOString()
    };

    offers.push(newOffer);
    writeJSON(OFFERS_FILE, offers);

    res.status(201).json({ message: 'Offer submitted successfully!', offer: newOffer });
  } catch (err) {
    console.error('Create offer error:', err);
    res.status(500).json({ error: 'Failed to submit offer.' });
  }
}

/**
 * GET /api/offers/my — Customer: get own submitted offers
 */
function getMyOffers(req, res) {
  try {
    const offers = readJSON(OFFERS_FILE);
    const myOffers = offers
      .filter(o => o.customerId === req.user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(myOffers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch your offers.' });
  }
}

/**
 * GET /api/offers/shop — Shopkeeper: get offers on their products
 */
function getShopOffers(req, res) {
  try {
    const offers = readJSON(OFFERS_FILE);
    const shopOffers = offers
      .filter(o => o.shopkeeperId === req.user.id)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(shopOffers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch shop offers.' });
  }
}

/**
 * PUT /api/offers/:id — Shopkeeper: accept or reject an offer
 */
function respondToOffer(req, res) {
  try {
    const { status } = req.body;
    const validStatuses = ['accepted', 'rejected'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status must be "accepted" or "rejected".' });
    }

    const offers = readJSON(OFFERS_FILE);
    const index = offers.findIndex(o => o.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Offer not found.' });
    }

    // Ownership check
    if (offers[index].shopkeeperId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only respond to offers on your own products.' });
    }

    if (offers[index].status !== 'pending') {
      return res.status(400).json({ error: 'This offer has already been responded to.' });
    }

    offers[index].status = status;
    offers[index].respondedAt = new Date().toISOString();
    writeJSON(OFFERS_FILE, offers);

    res.json({ message: `Offer ${status}.`, offer: offers[index] });
  } catch (err) {
    console.error('Respond to offer error:', err);
    res.status(500).json({ error: 'Failed to update offer.' });
  }
}

/**
 * GET /api/offers — Admin: get all offers
 */
function getAllOffers(req, res) {
  try {
    const offers = readJSON(OFFERS_FILE);
    const sorted = offers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(sorted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch offers.' });
  }
}

module.exports = { createOffer, getMyOffers, getShopOffers, respondToOffer, getAllOffers };
