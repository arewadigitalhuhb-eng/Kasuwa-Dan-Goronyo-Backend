const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    plan: {
      type: String,
      enum: ['free', 'pro', 'business', 'enterprise'],
      default: 'free',
    },
    billingCycle: {
      type: String,
      enum: ['monthly', 'quarterly', 'annual'],
      default: 'monthly',
    },
    planPrice: { type: Number, default: 0 },
    currency: { type: String, default: 'NGN' },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'expired', 'suspended'],
      default: 'active',
    },
    startDate: { type: Date, default: Date.now },
    renewalDate: { type: Date, required: true },
    cancelledAt: { type: Date, default: null },
    autoRenew: { type: Boolean, default: true },
    features: {
      maxProducts: { type: Number, default: 5 },
      maxCustomers: { type: Number, default: 10 },
      analytics: { type: Boolean, default: false },
      creditTracking: { type: Boolean, default: false },
      teamUsers: { type: Number, default: 1 },
      apiAccess: { type: Boolean, default: false },
      cloudBackup: { type: Boolean, default: false },
    },
    paymentMethod: {
      type: String,
      enum: ['card', 'bank-transfer', 'mobile-money', 'manual'],
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Subscription', subscriptionSchema);
