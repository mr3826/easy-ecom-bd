# Bornohin

Bangladesh-focused ecommerce starter built with Next.js App Router, a protected admin dashboard, direct wallet payment flows for bKash and Nagad, and delivery abstractions for Pathao and Steadfast.

## What is included

- Customer storefront with home, catalog, product detail, cart, checkout, login, register, account, and tracking pages
- Admin dashboard for products, categories, brands, inventory, orders, customers, coupons, payments, deliveries, landing pages, reports, and settings
- Landing page builder with custom slugs and attached products
- Payment provider interfaces for bKash and Nagad with backend verification flow
- Courier provider interfaces for Pathao and Steadfast
- Prisma schema for PostgreSQL
- Demo content and local in-memory persistence so the app runs immediately

## Demo accounts

- Admin: `admin@easy-ecom.test` / `admin1234`
- Customer: `amina@example.com` / `customer1234`

## Local setup

1. Copy `.env.example` to `.env.local`
2. Fill in the values you have
3. Run `npm run dev`

## Notes

- The local demo mode uses an in-memory store so the site is functional without a database.
- The Prisma schema is ready for PostgreSQL once `DATABASE_URL` is configured.
- Payment callbacks are verified in the backend route handlers before an order can become paid.
