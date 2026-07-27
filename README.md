# Bornohin

Bangladesh-focused ecommerce application built with Next.js App Router, PostgreSQL, a protected admin dashboard, configurable storefront sections, wallet/manual payment options, and delivery-zone operations.

## Application Routes

- Shop: `https://bornohin.com/`
- Admin: `https://bornohin.com/admin`
- API: `https://bornohin.com/api/*`
- Health check: `https://bornohin.com/api/health`

The shop, admin dashboard, server actions, and API route handlers are one deployable Next.js application.

## Included

- Customer storefront, search, product details, cart, checkout, authentication, account, and order tracking
- Admin operations for products, categories, brands, inventory, orders, customers, coupons, payments, reports, and settings
- Landing page builder with banners, carousels, product sections, testimonials, FAQs, and calls to action
- PostgreSQL persistence through Prisma
- bKash integration with signed callback verification
- Manual COD and bKash order flows controlled by admin settings
- Persistent uploaded media served from `/uploads`

## Local Development

The complete local stack uses Docker:

```powershell
docker compose up --build
```

Services:

- App: `http://localhost:3000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- Prisma Studio: `http://localhost:5555`

For a host-based development run:

```powershell
Copy-Item .env.example .env.local
npm ci
npm run prisma:generate
npm run dev
```

`DATABASE_URL` is required for persistent application and test behavior.

## Validation

```powershell
npm run lint
npm test
npm run build
```

## cPanel Deployment

The production host must provide Node.js 20.9 or newer and network access to PostgreSQL. Shared-hosting MySQL/MariaDB is not compatible with the current Prisma datasource.

Create a short-lived cPanel API token and keep it in a local environment variable:

```powershell
$env:CPANEL_API_TOKEN = "<short-lived token>"
.\scripts\cpanel-preflight.ps1
.\scripts\cpanel-preflight.ps1 -StartFullBackup
.\scripts\deploy-cpanel.ps1 -AppRoot bornohin_app -ConfirmAppRoot bornohin_app
```

The deploy script uses cPanel HTTPS APIs. It does not use FTP, disable certificate verification, publish a PHP extractor, or delete domains/databases.

See [the production cutover plan](docs/remaining-integration-execution-plan.md) before cleaning the old cPanel applications or changing Cloudflare DNS.

## Production Environment

Required core values:

```dotenv
NODE_ENV=production
DATABASE_URL=postgresql://...
AUTH_SECRET=...
ADMIN_NAME=Bornohin Admin
ADMIN_EMAIL=admin@bornohin.com
ADMIN_PASSWORD=...
NEXT_PUBLIC_APP_URL=https://bornohin.com
APP_URL=https://bornohin.com
UPLOAD_DIR=/home/bornohin/bornohin_uploads
```

bKash must remain disabled unless all provider credentials and `BKASH_WEBHOOK_SECRET` are configured. There is no production payment simulator.

After applying migrations to a fresh database, create or rotate the production
administrator without loading demo customers, orders, or credentials:

```powershell
npm run production:bootstrap-admin
```
