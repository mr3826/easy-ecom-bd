# Remaining Integration Execution Plan

Date: 2026-07-21

## Goal

Move Bornohin to one production Next.js app where:

- `https://bornohinbd.com/` is the customer shop.
- `https://bornohinbd.com/admin` is the admin dashboard.
- `shop.bornohinbd.com` redirects to `https://bornohinbd.com/`.
- `admin.bornohinbd.com` redirects to `https://bornohinbd.com/admin` or is disabled.

The work must prioritize real storefront/admin/backend connectivity before adding extra features.

## Current State

- The Next.js app already contains both the public shop routes and the `/admin` dashboard.
- Admin reads and writes most operational data through `src/server/store.ts`.
- Public storefront pages use `src/server/storefront-catalog.ts`, which partially bridges backend products into static Bornohin storefront templates.
- Checkout, payment records, inventory reservation, order history, settings, and courier shipment records are backed by Prisma when `DATABASE_URL` is configured.
- The cPanel deployment script targets the root Passenger runtime at `public_html/.next/standalone`, but prior live recovery left the root domain redirecting to `shop.bornohinbd.com` because of Passenger process pressure.

## Phase 1: Lock the Production Data Source

1. Confirm the production `DATABASE_URL`, `AUTH_SECRET`, `NEXT_PUBLIC_APP_URL`, and `APP_URL` values in cPanel.
2. Set both app URL values to `https://bornohinbd.com`.
3. Run Prisma migration/generation against the production database from a controlled environment.
4. Seed only required baseline rows:
   - admin user
   - settings row
   - enabled courier rows
   - real categories and brands
5. Stop treating demo/no-db mode as production-capable. It can remain for local preview only.

Acceptance checks:

- `/login` can authenticate the admin user.
- `/admin` loads after login.
- `/account` loads after customer login.
- `DATABASE_URL` absence is not accepted for production.

## Phase 2: Make Shop Catalog Fully Backend-Driven

1. Replace static-template fallback behavior in `src/server/storefront-catalog.ts` with backend-first catalog output.
2. Ensure products appear on the public shop even when their category slugs do not match legacy static template slugs.
3. Use backend category names/slugs for category rail, breadcrumbs, filters, and collection links.
4. Keep visual fallback values only for presentation defaults, not product/category existence.
5. Use product images from `ProductImage` rows on product cards and product detail pages.
6. Map product metadata and variants into public product detail UI where purchase selection depends on variants.

Acceptance checks:

- A product created in `/admin/products/new` appears on `/shop` without editing static files.
- Editing product name, price, stock, active state, category, and image in admin updates the public shop.
- Archived/inactive/out-of-stock products do not allow purchase.
- Search returns backend products, not only static template products.

## Phase 3: Fix Cart and Checkout Path

1. Fix `addToCartAction()` so slug resolution passes the resolved backend product id into `addToCart()`.
2. Add a focused regression test for adding a product to cart by slug and by id.
3. Verify cart quantity update, item removal, clear cart, coupon application, and cart persistence.
4. Align cart and checkout delivery fee display with backend zone calculation.
5. Confirm checkout creates an order, reserves inventory, clears cart, and redirects to tracking or payment.

Acceptance checks:

- Quick add from `/shop` works.
- Add to cart from `/product/[slug]` works.
- `/cart` shows the exact selected backend product.
- COD checkout creates an order visible in `/admin/orders`.
- Stock decreases only after successful backend order creation.

## Phase 4: Admin Operational Completion

1. Verify every admin module against real DB:
   - dashboard
   - products
   - categories
   - brands
   - orders
   - customers
   - coupons
   - payments
   - deliveries
   - landing pages
   - reports
   - settings
2. Confirm all admin server actions call `requireAdmin()` before mutation.
3. Confirm image uploads write to the intended production storage location and are served through `/uploads`.
4. Add smoke tests or scripted checks for the highest-risk admin mutations:
   - create product
   - update product
   - archive product
   - create coupon
   - update settings
   - update order status
   - create courier shipment

Acceptance checks:

- Admin-created media renders on public pages.
- Admin changes invalidate/revalidate the related public and admin paths.
- Non-admin users cannot access `/admin`.

## Phase 5: Payment and Courier Provider Readiness

1. Set production callback URL base to `https://bornohinbd.com`.
2. Configure bKash credentials and verify create-payment plus callback handling.
3. Decide whether Nagad remains simulated or receives a real provider implementation before launch.
4. Configure Pathao and Steadfast credentials.
5. Verify courier creation from `/admin/orders` or `/admin/deliveries`.
6. Confirm webhook/callback signatures with provider test payloads.

Acceptance checks:

- bKash payment initiation redirects to provider or approved sandbox.
- Payment callback updates payment and order status.
- Courier shipment creation stores tracking and consignment ids.
- Provider-disabled settings are enforced by backend, not only hidden in UI.

## Phase 6: Root Domain and Admin Path Deployment

1. Reconfigure cPanel so the root domain runs the single Next.js standalone app.
2. Use one Passenger app only for this product:
   - app root: `/home/bornohin/public_html/.next/standalone`
   - app URL: `https://bornohinbd.com`
   - Node version: Node 20 if available and stable on the host
   - low Passenger pool settings to avoid account process pressure
3. Replace the current root redirect to `shop.bornohinbd.com` with Passenger routing for the Next app.
4. Add redirect rules:
   - `shop.bornohinbd.com/*` -> `https://bornohinbd.com/$1`
   - `admin.bornohinbd.com/*` -> `https://bornohinbd.com/admin`
5. Update deployment script defaults so they do not imply the admin subdomain is the upload identity or runtime.
6. Deploy the standalone bundle and restart Passenger by touching `tmp/restart.txt`.

Acceptance checks:

- `https://bornohinbd.com/` returns `200`.
- `https://bornohinbd.com/shop` returns `200`.
- `https://bornohinbd.com/admin` redirects unauthenticated users to `/login?next=/admin`.
- Admin login returns to `/admin`.
- `shop.bornohinbd.com` no longer serves a separate app.
- `admin.bornohinbd.com` no longer serves a separate app.
- `stderr.log` does not repeat `fork: Resource temporarily unavailable`.

## Phase 7: Final Verification

Run the full launch smoke in this order:

1. `npm run lint`
2. `npm test`
3. `npm run build`
4. Production HTTP smoke:
   - `/`
   - `/shop`
   - `/product/<real-product-slug>`
   - `/cart`
   - `/checkout`
   - `/login`
   - `/register`
   - `/account`
   - `/admin`
   - `/track-order?code=<real-order-code>`
5. Business-flow smoke:
   - create product in admin
   - view product on public shop
   - add to cart
   - complete COD checkout
   - verify order in admin
   - update order status
   - create courier shipment
   - verify customer tracking page

## Execution Order

1. Fix catalog source of truth and product image rendering.
2. Fix cart add-by-slug/id behavior.
3. Verify checkout and admin order visibility.
4. Verify admin CRUD and media serving.
5. Configure real production env and provider callback base URL.
6. Reconfigure cPanel to root-domain single-app routing.
7. Deploy and run live smoke checks.

Do not merge or deploy to production until phases 1 through 5 pass locally or in staging, because phase 6 changes the public canonical domain behavior.
