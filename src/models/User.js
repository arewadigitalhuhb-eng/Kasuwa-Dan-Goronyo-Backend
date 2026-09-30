const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'owner', 'manager', 'cashier'],
      default: 'owner',
    },
    storeName: { type: String, default: 'Kasuwa Dan Goronyo' },
    phone: { type: String, default: '' },
    currency: { type: String, default: 'NGN' },
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active',
    },
    subscriptionExpiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

userSchema.methods.matchPassword = async function (enteredPassword) {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.getSignedJwtToken = function () {
  return require('jsonwebtoken').sign({ id: this._id, role: this.role }, process.env.JWT_SECRET || 'development-secret', {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });
};

module.exports = mongoose.model('User', userSchema);
