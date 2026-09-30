const express = require('express');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, async (req, res, next) => {
  try {
    const sales = await Sale.find({}).sort({ createdAt: -1 }).populate('customer');
    res.json(sales);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', protect, async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id).populate('customer');
    if (!sale) {
      return res.status(404).json({ message: 'Sale not found' });
    }

    res.json(sale);
  } catch (error) {
    next(error);
  }
});

router.post('/', protect, authorize('admin', 'owner', 'manager', 'cashier'), async (req, res, next) => {
  try {
    const { customerId, customerName, items, paymentMethod, discount = 0 } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items array is required' });
    }

    let subtotal = 0;
    const preparedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        return res.status(404).json({ message: `Product ${item.productId} not found` });
      }

      if (product.quantity < Number(item.quantity || 0)) {
        return res.status(400).json({ message: `Not enough stock for ${product.name}` });
      }

      const lineTotal = Number(product.sellingPrice) * Number(item.quantity);
      subtotal += lineTotal;

      preparedItems.push({
        productId: product._id,
        name: product.name,
        quantity: Number(item.quantity),
        price: Number(product.sellingPrice),
        costPrice: Number(product.costPrice),
      });

      product.quantity -= Number(item.quantity);
      await product.save();
    }

    const total = Math.max(0, subtotal - Number(discount));

    const sale = await Sale.create({
      customer: customerId || null,
      customerName: customerName || 'Walk-in Customer',
      items: preparedItems,
      subtotal,
      discount: Number(discount),
      total,
      paymentMethod: paymentMethod || 'cash',
      paymentStatus: 'paid',
      createdBy: req.user._id,
    });

    res.status(201).json(sale);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
