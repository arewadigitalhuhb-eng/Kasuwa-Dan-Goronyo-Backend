const providers = [];

const getEnabledProviders = () => {
  const list = [];

  if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY !== 'your_stripe_secret_key_here') {
    list.push({ name: 'stripe', enabled: true, mode: 'live' });
  }

  if (process.env.FLUTTERWAVE_SECRET_KEY && process.env.FLUTTERWAVE_SECRET_KEY !== 'your_flutterwave_secret_key_here') {
    list.push({ name: 'flutterwave', enabled: true, mode: 'live' });
  }

  if (list.length === 0) {
    list.push({ name: 'manual', enabled: true, mode: 'demo' });
  }

  return list;
};

const createCheckoutSession = ({ amount, currency = 'NGN', provider, customerEmail, reference }) => {
  const enabledProviders = getEnabledProviders();
  const selectedProvider = provider || enabledProviders[0]?.name || 'manual';

  return {
    reference: reference || `PAY-${Date.now()}`,
    provider: selectedProvider,
    amount,
    currency,
    customerEmail: customerEmail || 'customer@example.com',
    status: 'pending',
    checkoutUrl: `${process.env.APP_BASE_URL || 'http://localhost:5000'}/api/payments/verify`,
    message: 'Payment session created. Connect a live gateway for production charging.',
  };
};

const verifyTransaction = ({ reference, provider }) => ({
  reference,
  provider: provider || 'manual',
  status: 'verified',
  message: 'Demo verification successful. Implement gateway webhook verification in production.',
  details: {
    amount: 0,
    currency: 'NGN',
  },
});

module.exports = {
  getEnabledProviders,
  createCheckoutSession,
  verifyTransaction,
};
