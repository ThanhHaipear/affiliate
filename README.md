# Affiliate Marketplace

A full-stack e-commerce marketplace with built-in affiliate marketing. Sellers can publish products, affiliates can generate referral links and earn commissions, customers can shop and track orders, and admins can review, monitor, and operate the platform.

## Overview

Affiliate Marketplace is a multi-role commerce platform that models the core workflows of a seller-affiliate marketplace: account registration, authentication, role-based authorization, seller and affiliate approval, product review, product variants, affiliate tracking, cart, checkout, order management, payments, wallet balances, withdrawal requests, payout batches, notifications, and appeals.

The project is split into two applications:

- `front_end`: React + Vite application for the public storefront and role-based dashboards.
- `back_end`: Express REST API with Prisma ORM, MySQL, and domain-oriented modules.

## User Roles

- **Customer**: browse products, manage profile and addresses, use cart/checkout, track orders, review purchased products, and enroll as an affiliate.
- **Seller**: manage shop profile, KYC, products, variants, affiliate commission settings, orders, revenue, wallet, and withdrawal requests.
- **Affiliate**: manage profile and KYC, discover products, create affiliate links, track clicks, monitor commissions, manage wallet, and request withdrawals.
- **Admin**: review sellers, affiliates, and products; manage accounts, categories, orders, commissions, withdrawals, payout batches, fraud alerts, platform fee settings, and appeals.

## Key Features

- JWT authentication with access and refresh tokens.
- Role-based access control for customer, seller, affiliate, and admin flows.
- Public storefront with home page, product listing, product detail, and public shop pages.
- Seller dashboard for shop management, product management, variants, affiliate settings, orders, revenue, and withdrawals.
- Affiliate dashboard for product discovery, affiliate links, click tracking, commissions, and withdrawals.
- Admin dashboard for approvals, account moderation, product moderation, financial operations, and platform settings.
- Affiliate click tracking and attribution sessions passed through cart and order items.
- Cart checkout that can split items into multiple seller orders.
- VNPay sandbox payment flow and payment return confirmation.
- Wallets, wallet transactions, withdrawal requests, and payout batch processing.
- Cloudinary upload support for product images, avatars, and KYC documents.
- Notifications, appeals, activity logs, and audit-oriented utilities.
- Automated backend and frontend tests for critical business flows.

## Tech Stack

### Frontend

- React 18, Vite 6
- React Router 7
- TanStack React Query
- Zustand
- React Hook Form, Zod
- Axios
- Tailwind CSS 4
- Vitest, Testing Library, jsdom

### Backend

- Node.js, Express
- Prisma ORM
- MySQL 8.4
- JWT, bcryptjs
- Zod validation
- Multer, Cloudinary
- Nodemailer
- VNPay sandbox integration
- Node.js test runner

### DevOps

- Docker, Docker Compose
- Backend Docker entrypoint that generates Prisma Client, syncs the database schema, seeds baseline data, bootstraps an admin account, and starts the API server.

## Project Structure

```text
.
|-- back_end/
|   |-- prisma/              # Prisma schema and baseline seed data
|   |-- scripts/             # Admin bootstrap and smoke test scripts
|   |-- src/
|   |   |-- config/          # Environment, Prisma, and Cloudinary config
|   |   |-- middlewares/     # Auth, role, validation, upload, and error handlers
|   |   |-- modules/         # Domain modules: auth, seller, product, order, etc.
|   |   |-- realtime/        # Realtime/notification polling endpoints
|   |   |-- repositories/    # Shared repositories
|   |   |-- routes/          # API route mounting
|   |   `-- utils/           # JWT, password, mailer, VNPay, audit, pagination
|   |-- tests/               # Backend tests
|   `-- docs/api.md          # API inventory and request examples
|-- front_end/
|   |-- src/
|   |   |-- api/             # Axios client, endpoint map, and API adapters
|   |   |-- app/             # Router and app providers
|   |   |-- components/      # Shared UI, layout, admin, product, order, wallet
|   |   |-- hooks/           # Auth, role, toast, and loading helpers
|   |   |-- lib/             # Guards, formatters, checkout, attribution, mappers
|   |   |-- pages/           # Public, auth, customer, seller, affiliate, admin pages
|   |   |-- schemas/         # Zod schemas
|   |   |-- store/           # Zustand stores
|   |   `-- test/            # Test setup and utilities
|   `-- vite.config.js
|-- docker-compose.yml
|-- docker-compose.example.yml
`-- DOCKER.md
```

## Requirements

- Node.js 18+ or 20+
- npm
- Docker Desktop if running MySQL/backend with Docker
- MySQL 8.x if running the backend fully locally
- Cloudinary account for real image uploads
- VNPay sandbox credentials for payment testing

## Quick Start With Docker

The Docker Compose setup runs **MySQL** and the **backend API**. The frontend is intended to run outside Docker with Vite.

1. Create the backend Docker env file:

```bash
cp back_end/.env.example back_end/.env.docker
```

2. Start MySQL and the backend:

```bash
docker compose up --build
```

Backend URL:

```text
http://localhost:4000
```

Health check:

```text
http://localhost:4000/health
```

3. Start the frontend:

```bash
cd front_end
npm install
cp .env.example .env
npm run dev
```

Frontend URL:

```text
http://localhost:5173
```

For local development, `front_end/.env` can use:

```env
VITE_BACKEND_HOST=localhost
VITE_BACKEND_PORT=4000
VITE_USE_MOCK_AUTH=false
```

Default admin account after bootstrap:

```text
Email: admin.test@example.com
Password: 123456
```

> This default account is for development/demo only. Change `BOOTSTRAP_ADMIN_EMAIL`, `BOOTSTRAP_ADMIN_PASSWORD`, and all JWT secrets before deploying or exposing the project publicly.

## Local Setup Without Docker

### Backend

1. Install dependencies:

```bash
cd back_end
npm install
```

2. Create `.env`:

```bash
cp .env.example .env
```

3. Update `DATABASE_URL` for your local MySQL database:

```env
DATABASE_URL=mysql://root:password@localhost:3306/tiepthi_lienket
PORT=4000
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
FRONTEND_BASE_URL=http://localhost:5173
PASSWORD_RESET_URL=http://localhost:5173/auth/reset-password
VNPAY_RETURN_URL=http://localhost:5173/payment/vnpay-return
VNPAY_IPN_URL=http://localhost:4000/api/payments/vnpay-ipn
```

4. Initialize the database:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run bootstrap:admin
```

5. Start the server:

```bash
npm run dev
```

### Frontend

```bash
cd front_end
npm install
cp .env.example .env
npm run dev
```

## Available Scripts

### Backend

```bash
npm run dev              # Start Express with nodemon
npm start                # Start the production server
npm test                 # Run backend tests
npm run check            # Syntax-check server/app
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Run Prisma migration in development
npm run prisma:seed      # Seed roles, categories, platform fee, withdrawal config
npm run bootstrap:admin  # Create/update the default admin account
npm run smoke:test       # Run smoke tests against a running server
```

### Frontend

```bash
npm run dev          # Start Vite dev server
npm run build        # Build for production
npm run preview      # Preview production build
npm test             # Run Vitest
npm run test:watch   # Run tests in watch mode
```

## API Documentation

Detailed API documentation is available at:

```text
back_end/docs/api.md
```

Local base URL:

```text
http://localhost:4000/api
```

Main endpoint groups:

- `/api/auth`
- `/api/admin`
- `/api/seller`
- `/api/affiliate`
- `/api/products`
- `/api/tracking`
- `/api/cart`
- `/api/orders`
- `/api/payments`
- `/api/commissions`
- `/api/wallets`
- `/api/withdrawals`
- `/api/payout-batches`
- `/api/notifications`
- `/api/appeals`

## Testing

Run backend tests:

```bash
cd back_end
npm test
```

Run frontend tests:

```bash
cd front_end
npm test
```

The current test suite covers important flows such as account status handling, seller and affiliate approval access, public product visibility, multi-seller cart checkout, affiliate attribution, payment group actions, forgot password, admin financial stats, and frontend components/stores/schemas.

## Technical Highlights

- Backend organized by domain modules with `routes`, `controller`, `service`, `repository`, and `schema` layers.
- Rich Prisma data model covering accounts, roles, sellers, affiliates, products, product variants, carts, orders, commissions, wallets, withdrawals, payout batches, notifications, appeals, and fraud alerts.
- Consistent role-based access control between backend middleware and frontend route guards.
- Axios interceptor with automatic access token refresh.
- Checkout flow that splits cart items by seller and stores product/commission snapshots at order time.
- Affiliate attribution flow connecting clicks, affiliate links, attribution sessions, cart items, and order items.
- Financial workflow with wallet transactions, idempotency keys, withdrawal review, and payout batch processing.
- Dockerized backend setup that can prepare the database automatically for local demo usage.

## Resume Description

**Affiliate Marketplace** - Full-stack e-commerce affiliate platform built with React, Express, Prisma, and MySQL. Implemented multi-role dashboards for customers, sellers, affiliates, and admins; JWT authentication; product approval workflow; affiliate link tracking; cart/checkout; order management; commission calculation; wallet/withdrawal flow; VNPay sandbox payment; Cloudinary uploads; Dockerized backend setup; and automated tests.

