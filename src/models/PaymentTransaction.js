const mongoose = require('mongoose');

const paymentTransactionSchema = new mongoose.Schema(
  {
    transactionId: { type: String, unique: true, required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    invoiceId: { type: mongoose.Schema.Types.ObjectId, ref: 'Invoice', default: null },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'NGN' },
    paymentMethod: {
      type: String,
      enum: ['card', 'bank-transfer', 'mobile-money', 'cash', 'manual'],
      required: true,
    },
    gateway: {
      type: String,
      enum: ['stripe', 'flutterwave', 'paystack', 'manual', 'bank'],
      default: 'manual',
    },
    status: {
      type: String,
      enum: ['pending', 'processing', 'successful', 'failed', 'refunded'],
      default: 'pending',
    },
    gatewayReference: { type: String, default: null },
    gatewayResponse: { type: mongoose.Schema.Types.Mixed, default: null },
    description: { type: String, default: '' },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
    processedAt: { type: Date, default: null },
    failureReason: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('PaymentTransaction', paymentTransactionSchema);
