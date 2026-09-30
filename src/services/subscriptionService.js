const plans = [
  {
    name: 'free',
    label: 'Free Plan',
    price: 0,
    description: 'Perfect for getting started',
    features: {
      maxProducts: 5,
      maxCustomers: 10,
      analytics: false,
      creditTracking: false,
      teamUsers: 1,
      apiAccess: false,
      cloudBackup: false,
    },
  },
  {
    name: 'pro',
    label: 'Pro Plan',
    price: 5000,
    description: 'For growing businesses',
    features: {
      maxProducts: 500,
      maxCustomers: 1000,
      analytics: true,
      creditTracking: true,
      teamUsers: 3,
      apiAccess: false,
      cloudBackup: true,
    },
  },
  {
    name: 'business',
    label: 'Business Plan',
    price: 15000,
    description: 'For established businesses',
    features: {
      maxProducts: 5000,
      maxCustomers: 10000,
      analytics: true,
      creditTracking: true,
      teamUsers: 10,
      apiAccess: true,
      cloudBackup: true,
    },
  },
  {
    name: 'enterprise',
    label: 'Enterprise Plan',
    price: 50000,
    description: 'For large enterprises',
    features: {
      maxProducts: null,
      maxCustomers: null,
      analytics: true,
      creditTracking: true,
      teamUsers: null,
      apiAccess: true,
      cloudBackup: true,
    },
  },
];

const getAvailablePlans = () => plans;

const getPlanFeatures = (planName) => {
  const plan = plans.find((p) => p.name === planName);
  return plan ? plan.features : plans[0].features;
};

const getPlanByName = (planName) => plans.find((p) => p.name === planName);

const calculateRenewalDate = (billingCycle) => {
  const now = new Date();
  if (billingCycle === 'monthly') {
    now.setMonth(now.getMonth() + 1);
  } else if (billingCycle === 'quarterly') {
    now.setMonth(now.getMonth() + 3);
  } else if (billingCycle === 'annual') {
    now.setFullYear(now.getFullYear() + 1);
  }
  return now;
};

const checkFeatureAccess = (features, feature) => {
  return features[feature] === true || (typeof features[feature] === 'number' && features[feature] > 0);
};

module.exports = {
  getAvailablePlans,
  getPlanFeatures,
  getPlanByName,
  calculateRenewalDate,
  checkFeatureAccess,
};
