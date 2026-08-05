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
- Prisma Studio: `http://localhost:5555`

`docker-compose.yml` also starts Redis and passes `REDIS_URL` to the app, but no
application code reads it. Nothing depends on the service.

For a host-based development run:

```powershell
Copy-Item .env.example .env
npm ci
npm run prisma:generate
npm run dev
```

Use `.env`, not `.env.local`. Next.js reads both, but `prisma.config.ts` loads
only `.env` — so a `DATABASE_URL` that lives in `.env.local` reaches the dev
server while `prisma:migrate`, `prisma:seed`, and `db:reset` silently fall back
to the local default in `prisma.config.ts` and operate on a different database.

`DATABASE_URL` is required for persistent application and test behavior.

Load or reset local data:

```powershell
npm run db:reset              # empty every table, recreate the admin from .env
npm run db:reset -- --seed    # ... and load the demo catalogue
```

## Validation

```powershell
npm run lint
npm test
npm run build
```

## Deployment and Operations

The production host must provide Node.js 20.9 or newer and network access to PostgreSQL. Shared-hosting MySQL/MariaDB is not compatible with the current Prisma datasource.

```powershell
$env:CPANEL_API_TOKEN = "<short-lived token>"
.\scripts\cpanel-preflight.ps1
.\scripts\deploy-cpanel.ps1 -AppRoot bornohin_app -ConfirmAppRoot bornohin_app
```

`scripts/deploy-cpanel.ps1` is the only supported deployment path, and
`scripts/wipe-production-db.ps1` the only supported production wipe.
**[docs/OPERATIONS.md](docs/OPERATIONS.md)** covers both in full, along with
environment variables, rollback, database resets, troubleshooting, and the
security rules that apply to production.

See [the production cutover plan](docs/remaining-integration-execution-plan.md) before cleaning the old cPanel applications or changing Cloudflare DNS.

## Maintenance

**[docs/AUDIT-2026-08-05.md](docs/AUDIT-2026-08-05.md)** is the current audit:
four critical defects on the money path, forty frontend/backend contract gaps,
build and operations findings, and a documentation review.
**[docs/REMEDIATION_PLAN.md](docs/REMEDIATION_PLAN.md)** turns it into nine
landable packets and a release gate. Start there.

> **Release status: blocked.** Packets P0–P2 must land before the next
> production deploy. See the release gate at the end of the plan.

[docs/DEAD_CODE_CLEANUP_PLAN.md](docs/DEAD_CODE_CLEANUP_PLAN.md) is the previous
dead-code audit. All six packets shipped on 2026-08-04; it is kept for the
reasoning, not as a to-do. Two items from it are still open and are carried
forward in the current audit.

Seven dated reports from finished work live in
[docs/archive/](docs/archive/README.md). Several contradict the current code —
read them as history, not as guidance.

[docs/remaining-integration-execution-plan.md](docs/remaining-integration-execution-plan.md)
is not history: the production cutover is unfinished, and it records the open
ExonHost DNS blocker.
