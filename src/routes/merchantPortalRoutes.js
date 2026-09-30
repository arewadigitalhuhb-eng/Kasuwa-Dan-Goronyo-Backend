const express = require('express');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Merchant = require('../models/Merchant');
const Invoice = require('../models/Invoice');
const { protect } = require('../middleware/auth');
const subscriptionService = require('../services/subscriptionService');

const router = express.Router();

// Merchant completes profile after registration
router.post('/profile', protect, async (req, res, next) => {
  try {
    const { businessName, businessType, countryCode, city, address, phone } = req.body;

    if (!businessName) {
      return res.status(400).json({ message: 'Business name is required' });
    }

    let merchant = await Merchant.findOne({ userId: req.user._id });
    if (!merchant) {
      merchant = await Merchant.create({
        userId: req.user._id,
        businessName,
        businessType: businessType || '',
        countryCode: countryCode || 'NG',
        city: city || '',
        address: address || '',
        phone: phone || req.user.phone,
      });
    } else {
      merchant = await Merchant.findByIdAndUpdate(
        merchant._id,
        { businessName, businessType, countryCode, city, address, phone },
        { new: true }
      );
    }

    res.json({ message: 'Merchant profile updated', merchant });
  } catch (error) {
    next(error);
  }
});

// Get merchant's current subscription
router.get('/subscription', protect, async (req, res, next) => {
  try {
    const subscription = await Subscription.findOne({ userId: req.user._id });
    if (!subscription) {
      return res.status(404).json({ message: 'No active subscription found' });
    }

    res.json(subscription);
  } catch (error) {
    next(error);
  }
});

// Get available subscription plans
router.get('/plans', (req, res) => {
  const plans = subscriptionService.getAvailablePlans();
  res.json({ plans });
});

// Request upgrade/downgrade
router.post('/subscription/upgrade', protect, async (req, res, next) => {
  try {
    const { newPlan, billingCycle = 'monthly' } = req.body;

    if (!newPlan) {
      return res.status(400).json({ message: 'New plan is required' });
    }

    const plans = subscriptionService.getAvailablePlans();
    const planExists = plans.find((p) => p.name === newPlan);
    if (!planExists) {
      return res.status(400).json({ message: 'Invalid plan' });
    }

    let subscription = await Subscription.findOne({ userId: req.user._id });
    if (!subscription) {
      const renewalDate = new Date();
      if (billingCycle === 'monthly') renewalDate.setMonth(renewalDate.getMonth() + 1);
      else if (billingCycle === 'quarterly') renewalDate.setMonth(renewalDate.getMonth() + 3);
      else if (billingCycle === 'annual') renewalDate.setFullYear(renewalDate.getFullYear() + 1);

      subscription = await Subscription.create({
        userId: req.user._id,
        plan: newPlan,
        billingCycle,
        planPrice: planExists.price,
        currency: 'NGN',
        renewalDate,
        features: subscriptionService.getPlanFeatures(newPlan),
      });
    } else {
      subscription.plan = newPlan;
      subscription.planPrice = planExists.price;
      subscription.billingCycle = billingCycle;
      subscription.features = subscriptionService.getPlanFeatures(newPlan);
      await subscription.save();
    }

    // Create invoice
    const invoiceNumber = `INV-${Date.now()}`;
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    const invoice = await Invoice.create({
      invoiceNumber,
      userId: req.user._id,
      subscriptionId: subscription._id,
      plan: newPlan,
      amount: planExists.price,
      currency: 'NGN',
      billingPeriodStart: new Date(),
      billingPeriodEnd: subscription.renewalDate,
      dueDate,
      status: 'issued',
    });

    res.status(201).json({
      message: 'Subscription upgrade initiated',
      subscription,
      invoice,
    });
  } catch (error) {
    next(error);
  }
});

// Get user's invoices
router.get('/invoices', protect, async (req, res, next) => {
  try {
    const invoices = await Invoice.find({ userId: req.user._id }).sort({ createdAt: -1 });
    res.json({ invoices });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
