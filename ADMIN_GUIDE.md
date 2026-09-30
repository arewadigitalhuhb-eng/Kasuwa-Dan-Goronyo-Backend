# Admin Dashboard & Merchant Management

## Admin Endpoints

### Merchant Management

```bash
GET    /api/admin/merchants                    # List all merchants
GET    /api/admin/merchants/:merchantId        # Get merchant details
PUT    /api/admin/merchants/:merchantId/verify-kyc  # Verify KYC
PUT    /api/admin/merchants/:merchantId/suspend     # Suspend account
PUT    /api/admin/merchants/:merchantId/ban         # Ban account
```

### Subscription Management

```bash
GET    /api/admin/subscriptions                           # List all subscriptions
PUT    /api/admin/subscriptions/:subscriptionId/change-plan  # Change plan
PUT    /api/admin/subscriptions/:subscriptionId/cancel       # Cancel subscription
```

### Payment Management

```bash
GET    /api/admin/payments                      # List all payments
PUT    /api/admin/payments/:transactionId/confirm  # Confirm payment
PUT    /api/admin/payments/:transactionId/refund   # Refund payment
```

### Invoicing

```bash
GET    /api/admin/invoices    # List all invoices
```

### Dashboard & Reports

```bash
GET    /api/admin/dashboard                  # Dashboard summary
GET    /api/admin/reports/revenue            # Revenue reports
GET    /api/admin/reports/merchants          # Merchant reports
GET    /api/admin/audit-logs                 # Audit logs
```

## Merchant Portal Endpoints

```bash
POST   /api/merchant/profile                 # Complete merchant profile
GET    /api/merchant/subscription             # Get current subscription
GET    /api/merchant/plans                    # Get available plans
POST   /api/merchant/subscription/upgrade     # Request upgrade
GET    /api/merchant/invoices                 # Get invoices
```

## Subscription Plans

### Free Plan
- ₦0/month
- 5 products max
- 10 customers max
- No analytics
- No credit tracking
- 1 team user

### Pro Plan
- ₦5,000/month
- 500 products
- 1,000 customers
- Analytics enabled
- Credit tracking
- 3 team users
- Cloud backup

### Business Plan
- ₦15,000/month
- 5,000 products
- 10,000 customers
- Full analytics
- API access
- 10 team users

### Enterprise Plan
- ₦50,000/month
- Unlimited products/customers
- Premium support
- Custom integrations

## Revenue Model

1. **Merchant Signup** → Free plan automatically
2. **Plan Upgrade** → Monthly/Quarterly/Annual billing
3. **Automatic Renewal** → Subscriptions auto-renew unless cancelled
4. **Payment Verification** → Admin confirms bank transfers
5. **Reporting** → Revenue tracked in real-time

## Admin Capabilities

✅ View all merchants and their details
✅ Verify/reject KYC documents
✅ Suspend/ban merchant accounts
✅ Manage subscriptions (upgrade, downgrade, cancel)
✅ Confirm manual payments (bank transfers)
✅ View complete transaction history
✅ Generate revenue reports
✅ Track merchant activity via audit logs
✅ Download reports for accounting

## Deployment

Deploy to Render, Railway, or AWS with:

```bash
npm install
npm start
```

Set environment variables:

```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=long-random-secret
CORS_ORIGIN=https://yourdomain.com
```
