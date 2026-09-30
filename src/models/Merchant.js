const mongoose = require('mongoose');

const merchantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    businessName: { type: String, required: true },
    businessType: { type: String, default: '' },
    registrationNumber: { type: String, default: '' },
    taxId: { type: String, default: '' },
    logo: { type: String, default: null },
    countryCode: { type: String, default: 'NG' },
    city: { type: String, default: '' },
    address: { type: String, default: '' },
    phone: { type: String, default: '' },
    email: { type: String, default: '' },
    website: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'verified', 'suspended', 'banned'],
      default: 'pending',
    },
    kycVerified: { type: Boolean, default: false },
    kycDocuments: [
      {
        type: { type: String, enum: ['national-id', 'passport', 'drivers-license', 'business-license'] },
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    totalSales: { type: Number, default: 0 },
    totalTransactions: { type: Number, default: 0 },
    monthlyRevenue: { type: Number, default: 0 },
    lastActiveAt: { type: Date, default: Date.now },
    accountScore: { type: Number, default: 50 },
    notes: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Merchant', merchantSchema);
