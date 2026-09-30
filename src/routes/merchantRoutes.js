const express = require('express');
const User = require('../models/User');
const Subscription = require('../models/Subscription');
const Invoice = require('../models/Invoice');
const PaymentTransaction = require('../models/PaymentTransaction');
const Merchant = require('../models/Merchant');
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const AuditLog = require('../models/AuditLog');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// ==========================================
// MERCHANT MANAGEMENT (Admin Only)
// ==========================================

// Get all merchants with pagination and filters
router.get('/merchants', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { status = 'all', sortBy = '-createdAt', page = 1, limit = 20, search = '' } = req.query;
    const query = {};

    if (status !== 'all') query.status = status;

    if (search) {
      query.$or = [
        { businessName: { $regex: search, $options: 'i' } },
        { 'userId.name': { $regex: search, $options: 'i' } },
        { 'userId.email': { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (page - 1) * limit;
    const [merchants, total] = await Promise.all([
      Merchant.find(query)
        .populate('userId', 'name email storeName plan status')
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

// Get single merchant with full details
router.get('/merchants/:merchantId', protect, authorize('admin'), async (req, res, next) => {
  try {
    const merchant = await Merchant.findById(req.params.merchantId).populate('userId');
    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    const [subscription, sales, recentTransactions, products] = await Promise.all([
      Subscription.findOne({ userId: merchant.userId }),
      Sale.countDocuments({ createdBy: merchant.userId }),
      PaymentTransaction.find({ userId: merchant.userId }).sort({ createdAt: -1 }).limit(10),
      Product.countDocuments({ createdBy: merchant.userId }),
    ]);

    res.json({
      merchant,
      subscription,
      stats: {
        totalSales: sales,
        totalProducts: products,
      },
      recentTransactions,
    });
  } catch (error) {
    next(error);
  }
});

// Verify merchant KYC
router.put('/merchants/:merchantId/verify-kyc', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { kycVerified, status, notes = '' } = req.body;
    const merchant = await Merchant.findByIdAndUpdate(
      req.params.merchantId,
      {
        kycVerified: kycVerified || true,
        status: status || 'verified',
        notes: notes || merchant.notes,
      },
      { new: true }
    );

    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    // Also update the user status
    await User.findByIdAndUpdate(merchant.userId, { status: 'active' });

    // Log audit
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
router.put('/merchants/:merchantId/suspend', protect, authorize('admin'), async (req, res, next) => {
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

    await User.findByIdAndUpdate(merchant.userId, { status: 'suspended' });

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

// Ban merchant account
router.put('/merchants/:merchantId/ban', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { reason = '' } = req.body;
    const merchant = await Merchant.findByIdAndUpdate(
      req.params.merchantId,
      { status: 'banned', notes: reason },
      { new: true }
    );

    if (!merchant) {
      return res.status(404).json({ message: 'Merchant not found' });
    }

    await User.findByIdAndUpdate(merchant.userId, { status: 'inactive' });

    res.json({ message: 'Merchant account banned', merchant });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// SUBSCRIPTION MANAGEMENT (Admin Only)
// ==========================================

// Get all subscriptions
router.get('/subscriptions', protect, authorize('admin'), async (req, res, next) => {
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

// Manually change subscription plan
router.put('/subscriptions/:subscriptionId/change-plan', protect, authorize('admin'), async (req, res, next) => {
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
router.put('/subscriptions/:subscriptionId/cancel', protect, authorize('admin'), async (req, res, next) => {
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
// PAYMENT MANAGEMENT (Admin Only)
// ==========================================

// Get all payments/transactions
router.get('/payments', protect, authorize('admin'), async (req, res, next) => {
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
    const [transactions, total, stats] = await Promise.all([
      PaymentTransaction.find(query)
        .populate('userId', 'name email storeName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      PaymentTransaction.countDocuments(query),
      PaymentTransaction.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalAmount: { $sum: '$amount' },
            successfulCount: { $sum: { $cond: [{ $eq: ['$status', 'successful'] }, 1, 0] } },
            failedCount: { $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] } },
            pendingCount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
          },
        },
      ]),
    ]);

    res.json({
      transactions,
      stats: stats[0] || { totalAmount: 0, successfulCount: 0, failedCount: 0, pendingCount: 0 },
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// Manually confirm payment (for bank transfers, etc.)
router.put('/payments/:transactionId/confirm', protect, authorize('admin'), async (req, res, next) => {
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

    // Update invoice if exists
    if (transaction.invoiceId) {
      await Invoice.findByIdAndUpdate(transaction.invoiceId, {
        status: 'paid',
        paymentStatus: 'successful',
        transactionId: transaction._id,
        paymentDate: new Date(),
      });
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

// Refund payment
router.put('/payments/:transactionId/refund', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { reason = '' } = req.body;
    const transaction = await PaymentTransaction.findByIdAndUpdate(
      req.params.transactionId,
      {
        status: 'refunded',
        paymentStatus: 'refunded',
      },
      { new: true }
    );

    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    res.json({ message: 'Payment refunded', transaction });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// INVOICING (Admin Only)
// ==========================================

// Get all invoices
router.get('/invoices', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { status = 'all', page = 1, limit = 20 } = req.query;
    const query = status !== 'all' ? { status } : {};
    const skip = (page - 1) * limit;

    const [invoices, total] = await Promise.all([
      Invoice.find(query).populate('userId', 'name email storeName').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Invoice.countDocuments(query),
    ]);

    res.json({
      invoices,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// ADMIN DASHBOARD
// ==========================================

router.get('/dashboard', protect, authorize('admin'), async (req, res, next) => {
  try {
    const [totalMerchants, activeMerchants, suspendedMerchants, kycPendingCount, totalRevenue, totalTransactions, recentMerchants] = await Promise.all([
      Merchant.countDocuments(),
      Merchant.countDocuments({ status: 'verified' }),
      Merchant.countDocuments({ status: 'suspended' }),
      Merchant.countDocuments({ kycVerified: false }),
      PaymentTransaction.aggregate([
        { $match: { status: 'successful' } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      PaymentTransaction.countDocuments(),
      Merchant.find()
        .populate('userId', 'name email storeName plan')
        .sort({ createdAt: -1 })
        .limit(5),
    ]);

    const subscriptionStats = await Subscription.aggregate([
      {
        $group: {
          _id: '$plan',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$planPrice' },
        },
      },
    ]);

    const monthlyRevenue = await PaymentTransaction.aggregate([
      { $match: { status: 'successful' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          revenue: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 12 },
    ]);

    res.json({
      summary: {
        totalMerchants,
        activeMerchants,
        suspendedMerchants,
        kycPending: kycPendingCount,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalTransactions,
      },
      subscriptionBreakdown: subscriptionStats,
      monthlyRevenue: monthlyRevenue.reverse(),
      recentMerchants,
    });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// REPORTING
// ==========================================

// Revenue report
router.get('/reports/revenue', protect, authorize('admin'), async (req, res, next) => {
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
    } else if (groupBy === 'year') {
      groupStage._id = { $dateToString: { format: '%Y', date: '$createdAt' } };
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

// Merchant activity report
router.get('/reports/merchants', protect, authorize('admin'), async (req, res, next) => {
  try {
    const report = await Merchant.aggregate([
      {
        $lookup: {
          from: 'subscriptions',
          localField: 'userId',
          foreignField: 'userId',
          as: 'subscription',
        },
      },
      {
        $project: {
          businessName: 1,
          status: 1,
          kycVerified: 1,
          totalSales: 1,
          totalTransactions: 1,
          monthlyRevenue: 1,
          lastActiveAt: 1,
          accountScore: 1,
          plan: { $arrayElemAt: ['$subscription.plan', 0] },
        },
      },
      { $sort: { totalSales: -1 } },
      { $limit: 100 },
    ]);

    res.json({ report });
  } catch (error) {
    next(error);
  }
});

// ==========================================
// AUDIT LOGS (Admin Only)
// ==========================================

router.get('/audit-logs', protect, authorize('admin'), async (req, res, next) => {
  try {
    const { action = 'all', entityType = 'all', limit = 50, page = 1 } = req.query;
    const query = {};

    if (action !== 'all') query.action = action;
    if (entityType !== 'all') query.entityType = entityType;

    const skip = (page - 1) * limit;
    const [logs, total] = await Promise.all([
      AuditLog.find(query).populate('userId', 'name email').sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      AuditLog.countDocuments(query),
    ]);

    res.json({
      logs,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
