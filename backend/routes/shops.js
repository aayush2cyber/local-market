const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// ─── Load Data ───────────────────────────────────────────────
const dbPath = path.join(__dirname, '..', 'data', 'database.json');
let shops = [];

const REQUIRED_FIELDS = ['id', 'name', 'category', 'phone', 'address'];

const loadShops = () => {
  try {
    const raw = fs.readFileSync(dbPath, 'utf8');
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      throw new Error('database.json root must be an array');
    }

    // Validate each entry has required fields
    const valid = [];
    const skipped = [];

    parsed.forEach((entry, i) => {
      const missing = REQUIRED_FIELDS.filter(f => !entry[f]);
      if (missing.length > 0) {
        skipped.push({ index: i, missing });
      } else {
        valid.push(entry);
      }
    });

    shops = valid;
    console.log(`  ✓ Loaded ${shops.length} shops from database.json`);

    if (skipped.length > 0) {
      console.warn(`  ⚠ Skipped ${skipped.length} malformed entries:`);
      skipped.forEach(s => console.warn(`    - Index ${s.index}: missing [${s.missing.join(', ')}]`));
    }
  } catch (err) {
    console.error('  ✗ Failed to load database.json:', err.message);
    shops = [];
  }
};

loadShops();

// ─── GET /api/categories ─────────────────────────────────────
// Returns distinct category names from the shop data.
router.get('/categories', (req, res) => {
  res.set('Cache-Control', 'public, max-age=3600'); // 1 hour cache
  const categories = [...new Set(shops.map(s => s.category))].sort();
  res.json(categories);
});

// ─── GET /api/shops ──────────────────────────────────────────
// Query params:
//   ?category=Grocery   — filter by category (case-insensitive)
//   ?search=term        — search name + description (case-insensitive)
router.get('/shops', (req, res) => {
  res.set('Cache-Control', 'public, max-age=300'); // 5 min cache
  const { category, search } = req.query;
  let result = shops;

  if (category) {
    result = result.filter(s =>
      s.category.toLowerCase() === category.toLowerCase()
    );
  }

  if (search) {
    const term = search.toLowerCase();
    result = result.filter(s =>
      s.name.toLowerCase().includes(term) ||
      s.description.toLowerCase().includes(term)
    );
  }

  // Return summaries only — strip phone and products from list view
  const summaries = result.map(({ phone, products, ...rest }) => rest);
  res.json(summaries);
});

// ─── GET /api/shops/:id ──────────────────────────────────────
// Returns a single shop by numeric ID.
router.get('/shops/:id', (req, res) => {
  const shopId = parseInt(req.params.id, 10);

  if (isNaN(shopId)) {
    return res.status(400).json({ error: 'Invalid shop ID. Must be a number.' });
  }

  const shop = shops.find(s => s.id === shopId);

  if (!shop) {
    return res.status(404).json({ error: 'Shop not found.' });
  }

  res.json(shop);
});

module.exports = router;
