const { v4: uuidv4 } = require('uuid');
const { readJSON, writeJSON } = require('../utils/db');
const fs = require('fs');
const path = require('path');

const PRODUCTS_FILE = 'products.json';

/**
 * GET /api/products — Public, list all products with optional filters
 */
function getAllProducts(req, res) {
  try {
    const products = readJSON(PRODUCTS_FILE);
    const { category, search, shopkeeperId } = req.query;
    let result = products;

    if (category) {
      result = result.filter(p =>
        p.category.toLowerCase() === category.toLowerCase()
      );
    }

    if (search) {
      const term = search.toLowerCase();
      result = result.filter(p =>
        p.name.toLowerCase().includes(term) ||
        p.description.toLowerCase().includes(term)
      );
    }

    if (shopkeeperId) {
      result = result.filter(p => p.shopkeeperId === shopkeeperId);
    }

    // Add shopkeeper name to each product
    const users = readJSON('users.json');
    result = result.map(p => {
      const shopkeeper = users.find(u => u.id === p.shopkeeperId);
      return {
        ...p,
        shopkeeperName: shopkeeper ? shopkeeper.name : 'Unknown'
      };
    });

    res.json(result);
  } catch (err) {
    console.error('Get products error:', err);
    res.status(500).json({ error: 'Failed to fetch products.' });
  }
}

/**
 * GET /api/products/categories — Public, get distinct categories
 */
function getCategories(req, res) {
  try {
    const products = readJSON(PRODUCTS_FILE);
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch categories.' });
  }
}

/**
 * GET /api/products/:id — Public, get single product
 */
function getProduct(req, res) {
  try {
    const products = readJSON(PRODUCTS_FILE);
    const product = products.find(p => p.id === req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    // Add shopkeeper info
    const users = readJSON('users.json');
    const shopkeeper = users.find(u => u.id === product.shopkeeperId);
    res.json({ ...product, shopkeeperName: shopkeeper ? shopkeeper.name : 'Unknown' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch product.' });
  }
}

/**
 * GET /api/products/my — Shopkeeper only, get own products
 */
function getMyProducts(req, res) {
  try {
    const products = readJSON(PRODUCTS_FILE);
    const myProducts = products.filter(p => p.shopkeeperId === req.user.id);
    res.json(myProducts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch your products.' });
  }
}

/**
 * POST /api/products — Shopkeeper only, add new product
 */
function createProduct(req, res) {
  try {
    const { name, price, description, category, unit } = req.body;

    if (!name || !price) {
      return res.status(400).json({ error: 'Product name and price are required.' });
    }

    const products = readJSON(PRODUCTS_FILE);

    const newProduct = {
      id: uuidv4(),
      shopkeeperId: req.user.id,
      name: name.trim(),
      price: parseFloat(price),
      description: (description || '').trim(),
      category: (category || 'General').trim(),
      unit: (unit || 'piece').trim(),
      image: req.file ? `/uploads/${req.file.filename}` : '',
      createdAt: new Date().toISOString()
    };

    products.push(newProduct);
    writeJSON(PRODUCTS_FILE, products);

    res.status(201).json({ message: 'Product added successfully.', product: newProduct });
  } catch (err) {
    console.error('Create product error:', err);
    res.status(500).json({ error: 'Failed to add product.' });
  }
}

/**
 * PUT /api/products/:id — Shopkeeper only (owner)
 */
function updateProduct(req, res) {
  try {
    const products = readJSON(PRODUCTS_FILE);
    const index = products.findIndex(p => p.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // Ownership check
    if (products[index].shopkeeperId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only edit your own products.' });
    }

    const { name, price, description, category, unit } = req.body;

    if (name) products[index].name = name.trim();
    if (price) products[index].price = parseFloat(price);
    if (description !== undefined) products[index].description = description.trim();
    if (category) products[index].category = category.trim();
    if (unit) products[index].unit = unit.trim();

    // Handle new image upload
    if (req.file) {
      // Delete old image if it's a local file
      if (products[index].image && products[index].image.startsWith('/uploads/')) {
        const oldPath = path.join(__dirname, '..', products[index].image);
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
      }
      products[index].image = `/uploads/${req.file.filename}`;
    }

    products[index].updatedAt = new Date().toISOString();
    writeJSON(PRODUCTS_FILE, products);

    res.json({ message: 'Product updated.', product: products[index] });
  } catch (err) {
    console.error('Update product error:', err);
    res.status(500).json({ error: 'Failed to update product.' });
  }
}

/**
 * DELETE /api/products/:id — Shopkeeper (owner) or Admin
 */
function deleteProduct(req, res) {
  try {
    const products = readJSON(PRODUCTS_FILE);
    const index = products.findIndex(p => p.id === req.params.id);

    if (index === -1) {
      return res.status(404).json({ error: 'Product not found.' });
    }

    // Ownership check (admin can delete any)
    if (products[index].shopkeeperId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own products.' });
    }

    // Delete image file if local
    if (products[index].image && products[index].image.startsWith('/uploads/')) {
      const imgPath = path.join(__dirname, '..', products[index].image);
      if (fs.existsSync(imgPath)) fs.unlinkSync(imgPath);
    }

    products.splice(index, 1);
    writeJSON(PRODUCTS_FILE, products);

    res.json({ message: 'Product deleted.' });
  } catch (err) {
    console.error('Delete product error:', err);
    res.status(500).json({ error: 'Failed to delete product.' });
  }
}

module.exports = {
  getAllProducts,
  getCategories,
  getProduct,
  getMyProducts,
  createProduct,
  updateProduct,
  deleteProduct
};
