const express = require('express');
const Merchant = require('../models/Merchant');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const PaymentTransaction = require('../models/PaymentTransaction');
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Admin-only middleware
const adminOnly = authorize('admin');

// ==========================================
// MERCHANT MANAGEMENT
// ==========================================

// Get all merchants with filters
router.get('/merchants', protect, adminOnly, async (req, res, next) => {
  try {
    const { status = 'all', sortBy = '-createdAt', page = 1, limit = 20 } = req.query;

    const query = status === 'all' ? {} : { status };
    const skip = (page - 1) * limit;

    const [merchants, total] = await Promise.all([
      Merchant.find(query)
        .populate('userId', 'name email storeName plan')
        .sort(sortBy)
        .skip(skip)
        .limit(Number(limit)),
      Merchant.countDocuments(query),
    ]);

    res.json({
      merchants,
      pagination: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get single merchant details
router.get('/merchants/:merchantId', protect, adminOnly, async (req, res, next) => {
  try {
    const merchant = await Merchant.findById(req.params.merchantId).populate('userId');
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    const subscription = await Subscription.findOne({ userId: merchant.userId });
    const recentTransactions = await PaymentTransaction.find({ userId: merchant.userId })
      .sort({ createdAt: -1 })
      .limit(10);

    res.json({
      merchant,
      subscription,
      recentTransactions,
    });
  } catch (error) {
    next(error);
  }
});

// Verify merchant KYC
router.put('/merchants/:merchantId/verify', protect, adminOnly, async (req, res, next) => {
  try {
    const { kycVerified, status } = req.body;
    const merchant = await Merchant.findByIdAndUpdate(
      req.params.merchantId,
      {
        kycVerified: kycVerified || true,
        status: status || 'verified',
      },
      { new: true }
    );

    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    await AuditLog.create({
      userId: req.user._id,
      action: 'merchant_verified',
      entityType: 'merchant',
      entityId: merchant._id,
      details: { kycVerified, status },
    });

    res.json({ message: 'Merchant verified successfully', merchant });
  } catch (error) {
    next(error);
  }
});

// Suspend merchant account
router.put('/merchants/:merchantId/suspend', protect, adminOnly, async (req, res, next) => {
  try {
    const { reason = '' } = req.body;
    const merchant = await Merchant.findByIdAndUpdate(
      req.params.merchantId,
      { status: 'suspended', notes: reason },
      { new: true }
    );

    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    const user = await User.findByIdAndUpdate(merchant.userId, { status: 'suspended' });

    await AuditLog.create({
      userId: req.user._id,
      action: 'merchant_suspended',
      entityType: 'merchant',
      entityId: merchant._id,
      details: { reason },
    });

    res.json({ message: 'Merchant account suspended', merchant });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// SUBSCRIPTION MANAGEMENT
// ==========================================

// Get all subscriptions
router.get('/subscriptions', protect, adminOnly, async (req, res, next) => {
  try {
    const { status = 'all', plan = 'all', page = 1, limit = 20 } = req.query;

    const query = {};
    if (status !== 'all') query.status = status;
    if (plan !== 'all') query.plan = plan;

    const skip = (page - 1) * limit;

    const [subscriptions, total] = await Promise.all([
      Subscription.find(query)
        .populate('userId', 'name email storeName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      Subscription.countDocuments(query),
    ]);

    res.json({
      subscriptions,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// Upgrade/downgrade subscription manually
router.put('/subscriptions/:subscriptionId/change-plan', protect, adminOnly, async (req, res, next) => {
  try {
    const { newPlan, reason = '' } = req.body;
    const planPrices = { free: 0, pro: 5000, business: 15000, enterprise: 50000 };

    const subscription = await Subscription.findByIdAndUpdate(
      req.params.subscriptionId,
      {
        plan: newPlan,
        planPrice: planPrices[newPlan] || 0,
      },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    await AuditLog.create({
      userId: req.user._id,
      action: 'subscription_upgraded',
      entityType: 'subscription',
      entityId: subscription._id,
      details: { newPlan, reason },
    });

    res.json({ message: 'Subscription plan changed', subscription });
  } catch (error) {
    next(error);
  }
});

// Cancel subscription
router.put('/subscriptions/:subscriptionId/cancel', protect, adminOnly, async (req, res, next) => {
  try {
    const { reason = '' } = req.body;
    const subscription = await Subscription.findByIdAndUpdate(
      req.params.subscriptionId,
      {
        status: 'cancelled',
        cancelledAt: new Date(),
      },
      { new: true }
    );

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    await AuditLog.create({
      userId: req.user._id,
      action: 'subscription_cancelled',
      entityType: 'subscription',
      entityId: subscription._id,
      details: { reason },
    });

    res.json({ message: 'Subscription cancelled', subscription });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// PAYMENT MANAGEMENT
// ==========================================

// Get all transactions
router.get('/payments', protect, adminOnly, async (req, res, next) => {
  try {
    const { status = 'all', gateway = 'all', startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status !== 'all') query.status = status;
    if (gateway !== 'all') query.gateway = gateway;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      PaymentTransaction.find(query)
        .populate('userId', 'name email storeName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      PaymentTransaction.countDocuments(query),
    ]);

    const stats = await PaymentTransaction.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          successfulCount: { $sum: { $cond: [{ $eq: ['$status', 'successful'] }, 1, 0] } },
          failedCount: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
        },
      },
    ]);

    res.json({
      transactions,
      stats: stats[0] || { totalAmount: 0, successfulCount: 0, failedCount: 0 },
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// Manually mark payment as successful (for bank transfers, etc.)
router.put('/payments/:transactionId/confirm', protect, adminOnly, async (req, res, next) => {
  try {
    const { notes = '' } = req.body;
    const transaction = await PaymentTransaction.findByIdAndUpdate(
      req.params.transactionId,
      {
        status: 'successful',
        paymentStatus: 'successful',
        processedAt: new Date(),
      },
      { new: true }
    );

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    await AuditLog.create({
      userId: req.user._id,
      action: 'payment_processed',
      entityType: 'payment',
      entityId: transaction._id,
      details: { notes },
    });

    res.json({ message: 'Payment confirmed', transaction });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// ANALYTICS & REPORTING
// ==========================================

// Get admin dashboard summary
router.get('/dashboard', protect, adminOnly, async (req, res, next) => {
  try {
    const [totalMerchants, activeMerchants, totalRevenue, totalTransactions, recentMerchants] = await Promise.all([
      Merchant.countDocuments(),
      Merchant.countDocuments({ status: 'verified' }),
      PaymentTransaction.aggregate([
        { $match: { status: 'successful' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      PaymentTransaction.countDocuments(),
      Merchant.find()
        .populate('userId', 'name email storeName')
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    const subscriptionStats = await Subscription.aggregate([
      {
        $group: {
          _id: '$plan',
          count: { $sum: 1 },
        },
      },
    ]);

    res.json({
      summary: {
        totalMerchants,
        activeMerchants,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalTransactions,
      },
      subscriptionBreakdown: subscriptionStats,
      recentMerchants,
    });
  } catch (error) {
    next(error);
  }
});

// Get revenue report
router.get('/reports/revenue', protect, adminOnly, async (req, res, next) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;

    const matchStage = { status: 'successful' };
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }

    const groupStage = {};
    if (groupBy === 'day') {
      groupStage._id = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
    } else if (groupBy === 'month') {
      groupStage._id = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
    }

    groupStage.revenue = { $sum: '$amount' };
    groupStage.count = { $sum: 1 };

    const report = await PaymentTransaction.aggregate([
      { $match: matchStage },
      { $group: groupStage },
      { $sort: { _id: 1 } },
    ]);

    res.json({ report });
  } catch (error) {
    next(error);
  }
});

// Get audit logs
router.get('/audit-logs', protect, adminOnly, async (req, res, next) => {
  try {
    const { action = 'all', entityType = 'all', limit = 50 } = req.query;

    const query = {};
    if (action !== 'all') query.action = action;
    if (entityType !== 'all') query.entityType = entityType;

    const logs = await AuditLog.find(query).populate('userId', 'name email').sort({ createdAt: -1 }).limit(Number(limit));

    res.json({ logs });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
