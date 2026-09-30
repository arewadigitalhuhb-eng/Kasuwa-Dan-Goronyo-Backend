const express = require('express');
const Customer = require('../models/Customer');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, async (req, res, next) => {
  try {
    const customers = await Customer.find({}).sort({ createdAt: -1 });
    res.json(customers);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', protect, async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    res.json(customer);
  } catch (error) {
    next(error);
  }
});

router.post('/', protect, authorize('admin', 'owner', 'manager', 'cashier'), async (req, res, next) => {
  try {
    const { name, phone, email, address, type, balance } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Customer name is required' });
    }

    const customer = await Customer.create({
      name,
      phone: phone || '',
      email: email || '',
      address: address || '',
      type: type || 'walk-in',
      balance: balance || 0,
      createdBy: req.user._id,
    });

    res.status(201).json(customer);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', protect, authorize('admin', 'owner', 'manager'), async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    Object.assign(customer, req.body);
    await customer.save();

    res.json(customer);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', protect, authorize('admin', 'owner'), async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) {
      return res.status(404).json({ message: 'Customer not found' });
    }

    await customer.deleteOne();
    res.json({ message: 'Customer deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
