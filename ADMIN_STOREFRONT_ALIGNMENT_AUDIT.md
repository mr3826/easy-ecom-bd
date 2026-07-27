# Admin-Storefront Alignment Audit

Date: 2026-07-27
Scope: admin panel to customer-facing shop alignment only. This audit traces persisted admin changes into storefront behavior and marks anything that is still code-trace-only, missing, or blocked by the environment.

## 1. Executive Summary

Overall alignment status: mostly complete for core commerce, with a few important gaps left in variant purchasing, account recovery, coupons, and reporting depth.

Release recommendation: conditional GO for core catalog, checkout, and content sync. Not a feature-complete parity release yet.

Counts by status:
- Complete: 5
- Mostly complete: 6
- Partial: 4
- Missing: 3
- Blocked: 0

What I verified dynamically:
- `npm run lint` passed.
- `npm run build` passed.
- `npm test -- tests/contact-footer.test.tsx tests/site-analytics.test.ts tests/order-tracking.test.ts` passed with 2 files / 4 tests.
- `npm test` full run failed one suite because `DATABASE_URL` is not set in this environment.
- `docker compose up -d postgres redis` failed because the Docker daemon is not available here.

What I verified by code trace only:
- Product CRUD, bulk import, categories, brands, inventory reservation/release, checkout, payment callback handling, landing pages, and settings propagation.
- Variant metadata storage and the absence of a storefront variant purchase model.
- Missing account recovery flows.

Blocked external integrations:
- Database-backed suite execution through Docker.
- Live gateway verification for external payment providers.

Top launch gaps:
- Product variants are stored in admin metadata but are not a storefront purchasing model.
- Customer address management, password reset, and email verification are still missing.
- Coupon controls are basic and do not include usage limits or product/category restrictions.

## 2. Alignment Matrix

| ID | Admin capability | Storefront effect | Status | Verification | Evidence | Defect | Priority |
|---|---|---|---|---|---|---|---|
| A1 | Products CRUD | Shop listing, product detail, cart, and checkout consume product name, slug, price, stock, category, brand, images, active state, and sale price. | Mostly complete | Code trace | `src/app/admin/actions.ts`, `src/server/store.ts`, `src/server/storefront-catalog.ts`, `src/app/product/[slug]/page.tsx` | Variant-level purchasing is still missing. | P1 |
| A2 | Variant metadata | Admin can store variant groups and import them from CSV, but the shop does not let shoppers pick variants or price/stock them separately. | Partial | Code trace | `src/components/admin/product-variant-editor.tsx`, `src/app/admin/actions.ts`, `src/lib/product-import.ts`, `src/app/product/[slug]/page.tsx` | Variant groups remain metadata-only. | P1 |
| A3 | Bulk product import | Imported rows become normal products and image records, then revalidate the shop product routes. | Complete | Code trace + existing test coverage | `src/app/admin/actions.ts`, `src/lib/product-import.ts`, `src/server/store.ts` | No current defect found. | P2 |
| A4 | Categories and brands | Admin category/brand records drive shop collection rails and category/brand filtering. | Complete | Code trace | `src/app/admin/actions.ts`, `src/server/storefront-catalog.ts`, `src/app/shop/page.tsx`, `src/components/site-footer.tsx` | No current defect found. | P2 |
| A5 | Inventory | Stock is reserved on order creation and released on payment failure, order cancellation, and delivery cancellation. | Complete | Code trace + existing test coverage | `src/server/store.ts`, `src/app/actions.ts`, `src/app/admin/actions.ts`, `tests/persistence.test.ts` | No current defect found. | P0 |
| A6 | Orders | Checkout creates orders, payment success routes to order tracking, and the admin can update order status and delivery state. | Mostly complete | Code trace + targeted test coverage | `src/app/actions.ts`, `src/app/payments/[provider]/success/page.tsx`, `src/app/track-order/page.tsx`, `src/server/store.ts` | Customer order-history depth is limited, but the core path works. | P1 |
| A7 | Coupons and discounts | Checkout applies admin-created coupon codes server-side and recalculates totals. | Partial | Code trace | `src/app/admin/actions.ts`, `src/server/store.ts`, `src/app/checkout/page.tsx` | No usage limits, per-customer caps, or product/category restrictions. | P2 |
| A8 | Payments | Admin payment settings control checkout visibility and the payment callback updates order/payment state. | Mostly complete | Code trace + security test coverage | `src/app/admin/settings/page.tsx`, `src/server/integration-config.ts`, `src/app/actions.ts`, `src/app/api/payments/[provider]/callback/route.ts`, `tests/payment-replay.test.ts`, `tests/security.test.ts` | Live gateway verification is still externally blocked. | P0 |
| A9 | Shipping and delivery settings | Shipping charges and COD availability are driven by admin settings and checked again in checkout. | Mostly complete | Code trace | `src/app/admin/settings/page.tsx`, `src/app/checkout/page.tsx`, `src/app/cart/page.tsx`, `src/server/store.ts` | Address validation and zone UX are still basic. | P2 |
| A10 | Store settings and branding | Shell, header, footer, checkout, terms, and contact surfaces read the same settings object. | Mostly complete | Code trace + targeted test coverage | `src/components/public-shell.tsx`, `src/components/site-header.tsx`, `src/components/site-footer.tsx`, `src/app/contact-us/page.tsx`, `src/app/terms/page.tsx`, `tests/contact-footer.test.tsx` | No current defect after the contact-data fix. | P2 |
| A11 | Landing pages and content | Homepage and `/l/[slug]` render admin-managed landing page sections, including carousel slides and attached products. | Complete | Code trace | `src/app/page.tsx`, `src/app/l/[slug]/page.tsx`, `src/app/admin/landing-pages/page.tsx`, `src/lib/homepage-carousel.ts` | No current defect found. | P2 |
| A12 | Search, filtering, sorting, pagination | Shop search and filters are wired, but the long lists are still shallow and unpaginated. | Partial | Code trace | `src/app/shop/page.tsx`, `src/server/storefront-catalog.ts`, `src/app/admin/products/page.tsx`, `src/app/admin/orders/page.tsx` | Pagination and richer filtering are still missing. | P2 |
| A13 | Customer address management | No saved-address flow is present for the customer account or checkout. | Missing | Code trace | `src/app/account/page.tsx`, `src/app/checkout/page.tsx` | No address CRUD or saved-address selection found in codebase. | P1 |
| A14 | Password reset | No reset flow is present. | Missing | Code trace | Not found in codebase | No reset token, email flow, or reset route found. | P1 |
| A15 | Email verification | No verification flow is present. | Missing | Code trace | Not found in codebase | No verification token, email flow, or verification route found. | P1 |
| A16 | Reports and dashboard metrics | Admin dashboard and reports use real store data, but the reporting surface is still basic. | Partial | Code trace | `src/app/admin/page.tsx`, `src/app/admin/reports/page.tsx`, `src/server/store.ts` | No trend charts, exports, or fixture-based reconciliation. | P2 |
| A17 | Authorization boundaries | Admin routes and actions enforce role checks and same-origin / rate-limit guards. | Complete | Code trace + build | `src/app/admin/layout.tsx`, `src/server/auth.ts`, `src/app/admin/actions.ts`, `src/server/security.ts` | No current defect found. | P0 |
| A18 | Responsive and UX alignment | The admin and shop surfaces are responsive, but the denser tables and forms still have room for polish. | Mostly complete | Code trace + build | `src/components/admin-shell.tsx`, `src/app/admin/settings/page.tsx`, `src/app/admin/products/page.tsx`, `src/components/site-footer.tsx` | Visual consistency is still uneven in a few long forms and tables. | P2 |

## 3. Detailed Findings

1. Resolved contact-data drift on the customer-facing contact surfaces.
   - Severity: P2
   - Affected admin screen: `src/app/admin/settings/page.tsx`
   - Affected storefront screens: `src/app/contact-us/page.tsx`, `src/components/site-footer.tsx`
   - Root cause: the contact page and mobile footer still used hardcoded phone text while the admin settings already owned the live contact number.
   - Fix applied: the contact page now builds its body from `getSettings()`, and the mobile footer phone link now uses `settings.contactNumber`.
   - Regression coverage: `tests/contact-footer.test.tsx`
   - Verification: targeted test pass.

2. Product variants are not yet a storefront purchasing model.
   - Severity: P1
   - Affected admin screen: `src/components/admin/product-editor-form.tsx`, `src/components/admin/product-variant-editor.tsx`
   - Affected storefront screen: `src/app/product/[slug]/page.tsx`, `src/app/checkout/page.tsx`, cart/order flows
   - Root cause: variant groups are stored in product metadata, but the storefront only sells the base product record and never selects variant option, variant price, or variant stock.
   - Expected behavior: admin-defined size/color/variant changes should show up in the product page and checkout and should enforce variant-specific stock.
   - Actual behavior: the storefront uses a single product price and single product stock value.
   - Fix status: recommended, not implemented in this batch.
   - Automated test coverage: no dedicated storefront variant test found.

3. Coupon controls are still basic.
   - Severity: P2
   - Affected admin screen: `src/app/admin/coupons/page.tsx`, `src/app/admin/actions.ts`
   - Affected storefront screen: `src/app/checkout/page.tsx`
   - Root cause: the coupon model only carries code, description, type, value, minimum order amount, and active state.
   - Expected behavior: usage limits, per-customer limits, and product/category restrictions should be enforceable server-side.
   - Actual behavior: only code normalization, value, minimum amount, and active state are enforced.
   - Fix status: recommended, not implemented in this batch.
   - Automated test coverage: no dedicated restriction test found.

4. Customer recovery flows are missing.
   - Severity: P1
   - Affected storefront screens: account/login flows
   - Affected admin screen: customer lookup only; there is no recovery workflow to consume.
   - Root cause: no reset token or verification token routes, and no address-management routes, were found in the codebase.
   - Expected behavior: password reset, email verification, and saved-address management should exist if the shop is meant to support customer accounts.
   - Actual behavior: the account area remains read-only and recovery flows are absent.
   - Fix status: missing, not implemented in this batch.
   - Automated test coverage: none found.

5. Reporting is real-data backed but still shallow.
   - Severity: P2
   - Affected admin screens: `src/app/admin/page.tsx`, `src/app/admin/reports/page.tsx`
   - Affected storefront screen: indirect, via the order/product/customer data the shop creates
   - Root cause: the dashboards summarize live counts, but there is no richer trend, export, or reconciliation layer.
   - Expected behavior: reporting should compare calculated fixtures against displayed metrics and support useful operational views.
   - Actual behavior: the dashboard is mostly summary cards and basic totals.
   - Fix status: recommended, not implemented in this batch.
   - Automated test coverage: no dedicated report-reconciliation test found.

## 4. Test Inventory

Existing tests found:
- `tests/health-ready-route.test.ts`
- `tests/health-route.test.ts`
- `tests/order-tracking.test.ts`
- `tests/payment-replay.test.ts`
- `tests/persistence.test.ts`
- `tests/readiness-helper.test.ts`
- `tests/security.test.ts`
- `tests/site-analytics.test.ts`

Tests added:
- `tests/contact-footer.test.tsx`

Tests repaired:
- None.

Tests still missing:
- Variant selection and variant-specific pricing/stock coverage.
- Coupon restriction coverage.
- Customer address, password reset, and email verification coverage.
- Pagination and search fixture coverage for large admin/customer catalogs.

Commands executed:
- `npx eslint src/components/site-footer.tsx src/app/contact-us/page.tsx src/lib/bornohin-storefront.ts tests/contact-footer.test.tsx`
- `npm test -- tests/contact-footer.test.tsx tests/site-analytics.test.ts tests/order-tracking.test.ts`
- `npm run lint`
- `npm run build`
- `npm test`
- `docker compose up -d postgres redis`

Exact pass/fail counts:
- Focused test run: 2 files passed, 0 failed, 4 tests passed, 0 failed.
- Full test run: 7 files passed, 1 failed, 16 tests passed, 0 failed in the passing suites; `tests/persistence.test.ts` failed before running because `DATABASE_URL` is not set.
- Docker start attempt: failed because the Docker daemon is unavailable in this environment.

## 5. Release Blockers

P0 security or data-integrity blockers:
- None newly confirmed in this batch.

P1 broken core-commerce flows:
- Variant purchasing is not a real storefront model yet.
- Customer address management, password reset, and email verification are missing.

P2 operational or UX gaps:
- Coupon restriction engine is too limited.
- Reports are basic.
- Search/filter/pagination is shallow on larger catalogs.
- Some admin tables and forms still need polish.

Later enhancements:
- Trend charts.
- Exportable reports.
- Stronger list controls.
- Richer storefront personalization.

## 6. Change Summary

Modified files:
- `src/app/contact-us/page.tsx` - switched the contact page to live settings data.
- `src/components/site-footer.tsx` - removed the hardcoded mobile phone link and tied it to settings.
- `src/lib/bornohin-storefront.ts` - replaced the stale hardcoded contact block with neutral copy.
- `tests/contact-footer.test.tsx` - added regression coverage for the contact page and footer rendering.

Intentionally left unchanged:
- `src/server/store.ts` - the core commerce logic already traces correctly for the current scope.
- `src/app/actions.ts` - checkout and auth flows were already using the correct persisted data paths.
- `src/app/admin/actions.ts` - admin mutations already revalidate the relevant storefront routes.
- `src/app/product/[slug]/page.tsx` - no variant-purchase implementation exists here yet, so changing it without a broader model change would be misleading.
- `src/app/track-order/page.tsx` - order tracking already resolves from order code and settings-backed state.
- `src/app/payments/[provider]/success/page.tsx` - the success route already points to `/track-order`.

## 7. Verification Record

Lint:
- Command: `npm run lint`
- Result: passed.

Type checking and production build:
- Command: `npm run build`
- Result: passed. Next.js compiled successfully and listed the expected shop/admin routes.

Unit and focused regression tests:
- Command: `npm test -- tests/contact-footer.test.tsx tests/site-analytics.test.ts tests/order-tracking.test.ts`
- Result: passed, 2 files / 4 tests.

Full test suite:
- Command: `npm test`
- Result: partial pass. 7 files passed, 1 file failed, 16 tests passed. The failing suite was `tests/persistence.test.ts` because `DATABASE_URL` was not set in this environment.

Runtime smoke:
- Not run in this batch.

Readiness checks:
- Not run in this batch.

Docker-backed local execution:
- Attempted `docker compose up -d postgres redis`
- Failed because the Docker Desktop Linux engine was not reachable from this environment.

