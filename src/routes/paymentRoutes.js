const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const paymentService = require('../services/paymentService');

const router = express.Router();

router.get('/providers', (req, res) => {
  res.json(paymentService.getEnabledProviders());
});

router.post('/checkout', protect, async (req, res, next) => {
  try {
    const { amount, currency = 'NGN', provider, customerEmail, reference } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than zero' });
    }

    const session = paymentService.createCheckoutSession({
      amount: Number(amount),
      currency,
      provider,
      customerEmail,
      reference: reference || `PAY-${Date.now()}`,
    });

    res.status(201).json(session);
  } catch (error) {
    next(error);
  }
});

router.post('/verify', protect, authorize('admin', 'owner', 'manager'), async (req, res, next) => {
  try {
    const { reference, provider } = req.body;

    if (!reference) {
      return res.status(400).json({ message: 'Reference is required' });
    }

    const result = paymentService.verifyTransaction({ reference, provider });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
