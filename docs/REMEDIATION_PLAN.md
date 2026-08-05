# Remediation Plan — post-audit

Derived from [AUDIT-2026-08-05.md](AUDIT-2026-08-05.md). Branch
`chore/dead-code-audit` @ `a96bf26`, 62 commits ahead of `main`.

Seven packets, ordered by what blocks a deploy. Each is independently landable
and independently revertable. **P0–P2 are the release gate: the current tree
must not go to production until they land**, because the audit found four ways a
customer can set their own order total and one way the pre-migration backup can
be empty.

Convention follows [archive/](archive/README.md)'s predecessor plan: a packet is
done when its checklist is ticked *and* its verification command passes.

---

## P0 · Money path — blocks release

Four defects, all in `src/server/store.ts`, all reachable by an ordinary
customer. Audit §2.

- [ ] **C1** Clamp quantity at the boundary. `addToCart` (`store.ts:1226`) and `updateCartQuantity` (`store.ts:1323`): `quantity = Math.max(1, Math.trunc(quantity))`. Do it in the store, not in the action — `asNumber` has three callers and the guard belongs where every path converges.
- [ ] **C2** `store.ts:1544` — `where: { code: couponCode, isActive: true }`.
- [ ] **C3** `store.ts:1557` — clamp the discount: `Math.min(subtotal, computed)`. Validate `value` in `saveCouponAction` (`admin/actions.ts:485`): `1..100` for percentage, `> 0` for fixed.
- [ ] **C4** Replace read-then-write stock with a conditional atomic update in all four sites (`store.ts:1607`, `:1450`, `:1482`, `:560`):
  ```ts
  const { count } = await tx.product.updateMany({
    where: { id: item.productId, stock: { gte: item.quantity } },
    data: { stock: { decrement: item.quantity } },
  });
  if (count !== 1) throw new Error(`Insufficient stock for ${item.product.name}`);
  ```

**Verify:** a test per defect in `tests/persistence.test.ts` — negative quantity
rejected, inactive coupon ignored, over-value coupon clamped, two concurrent
checkouts of one unit produce one order and one failure. These cannot pass
without P1.

## P1 · Make the tests actually run — blocks release

The suite reports green while skipping the only tests that touch the layer P0
fixes. Audit §1, §6.

- [ ] `vitest.config.ts` — load `.env` so `hasDatabase` is true locally (`import "dotenv/config"` in the config, or `setupFiles`).
- [ ] `.github/workflows/ci.yml` — add a `postgres:16` service, set `DATABASE_URL`, run `prisma migrate deploy` before `npm test`.
- [ ] Add `npx tsc --noEmit` as its own CI step. `next build` typechecks, but it runs last and costs minutes.
- [ ] Add a schema-drift gate: `prisma migrate diff --from-migrations --to-schema-datamodel --exit-code`. This drift already reached `main` once (`7a76df3`).
- [ ] `tsconfig.json:25` — stop excluding `e2e/` from the TypeScript program.

**Verify:** CI log shows `Tests 62 passed` with zero skipped, and the drift gate
runs.

## P2 · Production safety — blocks release

Audit §6. The deploy path can destroy data with no recoverable backup.

- [ ] `scripts/apply-production-migration.ps1:347` and the equivalent in `wipe-production-db.ps1` — add `set -o pipefail` to the remote command so a `pg_dump` failure is not masked by `gzip` succeeding on empty input. Assert a minimum byte count on the resulting dump, not just a zero exit.
- [ ] `.github/workflows/deploy-production.yml:16` — build the Linux bundle on `ubuntu-latest`, or install platform-correct `sharp`. It currently ships win32 binaries to a Linux host.
- [ ] Gate `deploy-production.yml` on a green CI run for the same SHA. Today `workflow_dispatch` can ship any ref, untested.
- [ ] Keep one previous release directory on the host so a bad deploy has somewhere to roll back to (`deploy-cpanel.ps1:615` overwrites in place).

**Verify:** a dry-run deploy against a scratch app root; confirm the backup file
is non-trivially sized and the previous release survives.

---

## P3 · User-visible breakage

Audit §3, §4. Each is small and independently shippable.

- [ ] **F1** `profile-form.tsx:28-53` — `value` → `defaultValue` on all three fields. `/account/profile` is currently impossible to edit.
- [ ] **F3** `store.ts:2002` — filter `getLandingPage` on `published`, or check it in `l/[slug]/page.tsx`. Drafts are publicly readable.
- [ ] **F4** `admin/landing-pages/page.tsx:17` — drop the `?? pages[0]` fallback and add a "New page" affordance. The builder cannot create a second page.
- [ ] **F5** Pass `codEnabled`/`bkashEnabled` into `CheckoutForm`; render each radio conditionally and default to the first enabled one.
- [ ] **F6** Remove the delivery-fee row from `cart/page.tsx` and `checkout/page.tsx`, or move it into `CheckoutForm` where the district actually lives. Both currently price from the *store's* address.
- [ ] **F7** Redirect cancelled bKash payments to `/track-order?code=…` the way the success page resolves it; drop the two dead CTAs.
- [ ] **H1** `resetPasswordAction` — `deleteMany({ where: { userId } })` on sessions and on the user's other reset tokens.
- [ ] **H3** `sendEmail` — return `{ success: false }` when SMTP is unconfigured. It currently lies to every caller.
- [ ] **H11** Validate `customerName`/`customerPhone`/`district`/`shippingAddress` in `checkoutAction`. `createManualOrder` already does; the customer path is the less-defended one.
- [ ] **H9** Make District a `<select>` from `domain.ts`'s zone list and delete the substring matching in `deriveDeliveryZone`.
- [ ] Surface the real error in `checkoutAction`'s catch instead of flattening every rejection to "Something went wrong."

**Verify:** `npm run test:e2e` plus a manual pass over profile edit, checkout
with COD disabled, and a bKash cancellation.

## P4 · Data integrity

Audit §3.

- [ ] **H2** Set `Order.customerId` in `createOrderFromCart`. The column exists and nothing writes it, so no signed-in customer's orders are linked to their account.
- [ ] **H6** Wrap `confirmPayment`'s three writes in one `$transaction` (`integrations.ts:205`), keeping the outbound HTTP call outside it.
- [ ] **H7** Add a legal-transition check before the payment status write — nothing may leave `paid` except to `refunded`.
- [ ] **H8** Give `recordAuditLog` an optional `client` param and pass `tx` at all eleven call sites. Fixes rollback-surviving audit rows and the double connection per mutation.
- [ ] **H10** Add `@@index` for `CartItem.cartId`, `OrderItem.orderId`, `Order.customerId`, `Payment.orderId`, `OrderStatusHistory.orderId`, `InventoryLog.productId`, `Product.categoryId`, `Product.brandId`. One migration.
- [ ] Add pagination to `listProducts` and the admin list queries — `take`/`skip` appear zero times in `store.ts` today.

**Verify:** migration applies cleanly; `EXPLAIN` on the cart and order-list
queries shows index scans.

## P5 · SEO

Audit §9. Untouched, mechanical, and the only packet with a direct revenue
effect. ~150 lines.

- [ ] `generateMetadata` on `/product/[slug]`, `/shop`, `/l/[slug]` and the content pages. 35 of 36 pages currently inherit one generic title.
- [ ] `metadataBase` in the root layout.
- [ ] `src/app/sitemap.ts` driven by `listProducts()` / `listCategories()`.
- [ ] `src/app/robots.ts`.
- [ ] JSON-LD `Product` + `Offer` on the product page — price and availability in search results.
- [ ] Canonical URLs on the faceted `/shop` routes.

**Verify:** `curl` the built product page and confirm a distinct `<title>`, an
`og:` block, and a parseable JSON-LD script.

## P6 · Finish or delete the half-built features

Audit §4. The pattern behind C2, F3 and eight more: an admin control writes a
column no reader consults. Each needs a decision, not a fix — **finish the
reader, or delete the writer.** Do not leave them.

- [ ] Saved addresses — offer them at checkout, or remove the page's promise.
- [ ] Product variants — build the storefront selector, or drop the admin editor.
- [ ] `minOrderQuantity` / `maxOrderQuantity` — enforce at cart, or delete the fields.
- [ ] `taxEnabled` / `discountEnabled` — apply to totals, or delete.
- [ ] Email verification — send the link, or drop the token machinery.
- [ ] Landing-page section editing (`admin/actions.ts:648` never receives an `id`).
- [ ] Homepage renders only `carousel`; the other seven section types vanish.
- [ ] `Brand.logoUrl`, `Setting.deliveryCharge`, `Cart.couponCode`, `WishlistItem.sku` — writable or validated, never set or never read.

## P7 · Dead code — do last, and verify first

Audit §7. **These 36 findings were never adversarially verified.** Grep for
callers before deleting anything.

- [ ] Confirm and remove the in-memory demo-state layer — 38 `isDatabaseConfigured()` branches and 44 `getDemoState()` references inside `store.ts` alone. It also owns the hardcoded `"easy-ecom-demo-session"` auth fallback, so removing it closes a security finding.
- [ ] `getState()` loads 16 whole tables for one page's two numbers.
- [ ] Confirmed dead and safe: the two `generateStaticParams() { return [] }` beside `force-dynamic`; Redis in `docker-compose`; the `/api/health/ready` rewrite shadowed by its own route handler.
- [ ] **Rejected — do not action:** replacing `useOverlay` with `<dialog showModal>`. The hand-rolled version is correct, documented and load-bearing (§9).

## P8 · Documentation

- [ ] Document the bKash callback wire contract — field names, `x-signature` derivation, expected statuses. The integration cannot be brought up from the docs today.
- [ ] A short architecture note: `store.ts` is the data layer, `src/server/*` is server-only, mutations are server actions rather than API routes.
- [ ] Document `E2E_VISUAL` and `E2E_ALLOW_REMOTE_ORDER`, and the seeded admin the e2e suite needs.
- [ ] Add a test for `parseCsv` in `product-import.ts` — a hand-rolled RFC4180 parser with 452 lines and no coverage, open since the previous plan.

---

## Release gate

Do not deploy until all of these hold:

1. P0, P1, P2 landed and merged to `main`.
2. CI green on the merge commit **with the persistence suite running** — `62 passed, 0 skipped`.
3. `prisma migrate diff` reports no drift.
4. A pre-migration backup taken with the `pipefail` fix in place, verified non-empty by byte count.
5. Deploy dispatched against the SHA that CI went green on, not a branch name.

Deploying before then ships C1–C4 to a live store: a crafted request sets its own
order total, a deactivated coupon still discounts, and concurrent checkouts
oversell stock — with a backup that may be empty if a rollback is needed.
