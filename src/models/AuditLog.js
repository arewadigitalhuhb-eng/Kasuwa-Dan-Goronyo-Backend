const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    action: {
      type: String,
      enum: [
        'user_created',
        'user_login',
        'user_logout',
        'subscription_upgraded',
        'subscription_downgraded',
        'subscription_cancelled',
        'payment_processed',
        'payment_failed',
        'product_created',
        'product_deleted',
        'sale_completed',
        'merchant_verified',
        'merchant_suspended',
      ],
      required: true,
    },
    entityType: {
      type: String,
      enum: ['user', 'subscription', 'payment', 'product', 'sale', 'merchant'],
      default: null,
    },
    entityId: { type: String, default: null },
    details: { type: mongoose.Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
