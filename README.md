# Kasuwa Dan Goronyo Backend

Production-ready backend API for the Kasuwa Dan Goronyo POS and inventory platform. This backend powers authentication, inventory management, sales tracking, customer credit management, admin analytics, and subscription/payment flows for merchants across Africa.

## Features

- Secure user authentication with JWT and role-based access
- Product inventory management with low stock alerts
- Customer records and credit/debt tracking
- Sales creation and payment processing
- Admin analytics and dashboard summary data
- Subscription plans for free, pro, and enterprise merchants
- Payment provider abstraction for Stripe and Flutterwave-style flows
- MongoDB persistence with Express and Node.js

## Tech Stack

- Node.js 18+
- Express.js
- MongoDB + Mongoose
- JWT for authentication
- bcryptjs for password hashing
- CORS + dotenv configuration

## Quick Start

```bash
npm install
cp .env.example .env
# update the values in .env
npm run dev
```

Then open:

- http://localhost:5000/api/health

## Required Environment Variables

See `.env.example` for configuration.

## Core Endpoints

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Products

- `GET /api/products`
- `POST /api/products`
- `GET /api/products/:id`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`

### Customers

- `GET /api/customers`
- `POST /api/customers`
- `GET /api/customers/:id`
- `PUT /api/customers/:id`
- `DELETE /api/customers/:id`

### Sales

- `GET /api/sales`
- `POST /api/sales`
- `GET /api/sales/:id`

### Payments

- `GET /api/payments/providers`
- `POST /api/payments/checkout`
- `POST /api/payments/verify`

### Admin

- `GET /api/admin/dashboard`

## Subscription Model

This product is designed for a monetization model across Africa.

- Free Plan: basic ERP features
- Pro Plan: advanced sales, analytics, and customer tracking
- Enterprise Plan: multi-branch support and custom integrations

## Production Notes

For production deployment, configure:

- MongoDB Atlas or managed MongoDB cluster
- Strong JWT secret
- HTTPS origin in CORS
- Stripe or Flutterwave credentials
- A reverse proxy or load balancer

## License

MIT
