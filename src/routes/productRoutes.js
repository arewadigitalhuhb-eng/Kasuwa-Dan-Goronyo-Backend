const express = require('express');
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, async (req, res, next) => {
  try {
    const products = await Product.find({ status: 'active' }).sort({ createdAt: -1 });
    res.json(products);
  } catch (error) {
    next(error);
  }
});

router.get('/low-stock', protect, async (req, res, next) => {
  try {
    const products = await Product.find({
      quantity: { $lte: '$lowStockAlert' },
      status: 'active',
    });

    res.json(products);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', protect, async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    next(error);
  }
});

router.post('/', protect, authorize('admin', 'owner', 'manager'), async (req, res, next) => {
  try {
    const {
      name,
      category,
      quantity,
      costPrice,
      sellingPrice,
      lowStockAlert,
      barcode,
      sku,
      unit,
    } = req.body;

    if (!name || !category || !sellingPrice) {
      return res.status(400).json({ message: 'Product name, category and selling price are required' });
    }

    const product = await Product.create({
      name,
      category,
      quantity: quantity || 0,
      costPrice: costPrice || 0,
      sellingPrice,
      lowStockAlert: lowStockAlert || 10,
      barcode: barcode || '',
      sku: sku || '',
      unit: unit || 'unit',
      createdBy: req.user._id,
    });

    res.status(201).json(product);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', protect, authorize('admin', 'owner', 'manager'), async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    Object.assign(product, req.body);
    await product.save();

    res.json(product);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', protect, authorize('admin', 'owner'), async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    product.status = 'archived';
    await product.save();

    res.json({ message: 'Product archived successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
