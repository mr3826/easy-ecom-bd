# Remediation Plan — post-audit

Derived from [AUDIT-2026-08-05.md](AUDIT-2026-08-05.md).


Seven packets, ordered by what blocks a deploy. Each is independently landable
and independently revertable.

> **P0, P1 and P2 shipped on 2026-08-05.** Merged to `main` and deployed to
> production as commit `b50e8b7` (PRs #5–#10). `/api/version` reports it live;
> the release gate at the end of this document was satisfied in full. One P2
> item was deliberately **not** done — see the note in that section. It has
> since been closed: releases are now retained on the host and
> `deploy-cpanel.ps1 -Rollback <sha>` restores one.
>
> **P3, P4 and P5 shipped on 2026-08-07** across PRs #14–#17, deployed as
> `ff686b9`. P4's pagination item is the one thing in those three packets still
> open, and it is blocked — see the note in that section. Two migrations are
> merged but **not yet applied to production**. P6, P7 and P8 remain untouched.

Convention follows [archive/](archive/README.md)'s predecessor plan: a packet is
done when its checklist is ticked *and* its verification command passes.

---

## P0 · Money path — blocks release

Four defects, all in `src/server/store.ts`, all reachable by an ordinary
customer. Audit §2.

- [x] **C1** Clamp quantity at the boundary. `addToCart` (`store.ts:1226`) and `updateCartQuantity` (`store.ts:1323`): `quantity = Math.max(1, Math.trunc(quantity))`. Do it in the store, not in the action — `asNumber` has three callers and the guard belongs where every path converges.
- [x] **C2** `store.ts:1544` — `where: { code: couponCode, isActive: true }`.
- [x] **C3** `store.ts:1557` — clamp the discount: `Math.min(subtotal, computed)`. Validate `value` in `saveCouponAction` (`admin/actions.ts:485`): `1..100` for percentage, `> 0` for fixed.
- [x] **C4** Replace read-then-write stock with a conditional atomic update in all four sites (`store.ts:1607`, `:1450`, `:1482`, `:560`):
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

- [x] `vitest.config.ts` — load `.env` so `hasDatabase` is true locally (`import "dotenv/config"` in the config, or `setupFiles`).
- [x] `.github/workflows/ci.yml` — add a `postgres:16` service, set `DATABASE_URL`, run `prisma migrate deploy` before `npm test`.
- [x] Add `npx tsc --noEmit` as its own CI step. `next build` typechecks, but it runs last and costs minutes.
- [x] Add a schema-drift gate. Shipped as `prisma migrate diff --from-config-datasource --to-schema --exit-code` after `migrate deploy` — the flags above are Prisma 6 and were removed in 7, and diffing the *migrated database* proves the same thing without needing a shadow database.
- [x] `tsconfig.json:25` — stop excluding `e2e/` from the TypeScript program. (It was never in `exclude`; it simply was not in `include`. `scripts/` had the same hole.)

**Verified 2026-08-05:** CI reports **67 passed, 0 skipped** (was 49 passed / 13
skipped). Both new gates earned their place immediately: the typecheck caught
`test.use({ reducedMotion })` in `visual.spec.ts`, which is not a Playwright
option and was silently ignored at runtime; the drift gate caught **real drift**
— the `DeliveryStatus` enum still carried `courier_created` in the database, and
two scalar-list columns carried defaults the schema did not declare. Closed by
migration `20260805000000_close_schema_drift`. Note a local database can hide
this: mine reported clean while CI failed, because earlier `migrate dev` runs had
already dragged it into agreement with the schema.

## P2 · Production safety — blocks release

Audit §6. The deploy path can destroy data with no recoverable backup.

- [x] `scripts/apply-production-migration.ps1:347` and the equivalent in `wipe-production-db.ps1` — add `set -o pipefail` to the remote command so a `pg_dump` failure is not masked by `gzip` succeeding on empty input. Assert a minimum byte count on the resulting dump, not just a zero exit.
- [x] `.github/workflows/deploy-production.yml:16` — build the Linux bundle on `ubuntu-latest`, or install platform-correct `sharp`. It currently ships win32 binaries to a Linux host.
- [x] Gate `deploy-production.yml` on a green CI run for the same SHA. Today `workflow_dispatch` can ship any ref, untested.
- [ ] **NOT DONE.** Keep one previous release directory on the host so a bad deploy has somewhere to roll back to (`deploy-cpanel.ps1:615` overwrites in place). The 2026-08-05 deploy went out without this. `RELEASE.json` records the previous commit, so a rollback today means rebuilding that commit and redeploying — minutes, not seconds, and it needs a working build of the old tree. **Carry this into P3.**

**Verified 2026-08-05:** `dry_run=true` exercised the whole pipeline — preflight,
`npm ci`, lint, typecheck, tests, build, bundle assembly, sharp bundling, archive
creation — and uploaded nothing. Three defects surfaced in the deploy path this
way and were fixed before the real run: a missing libvips companion package, a
`tar` invocation that broke under GNU tar, and an array splat that silently
dropped `-DryRun` (a "dry run" would have deployed for real). The real deploy
then reported *"Verified: linux sharp binary and libvips are in the bundle,
win32 is not"*, and `/_next/image` on production returns a genuinely resized
640px image at 71 KB against a 1.9 MB original — proof the Linux sharp runtime
loads.

---

## P3 · User-visible breakage

Audit §3, §4. Each is small and independently shippable.

**Shipped 2026-08-07 in `cf13fd8` (PR #14), live on production as `ff686b9`.**

- [x] **F1** `profile-form.tsx:28-53` — `value` → `defaultValue` on all three fields. `/account/profile` is currently impossible to edit.
- [x] **F3** `store.ts:2002` — filter `getLandingPage` on `published`, or check it in `l/[slug]/page.tsx`. Drafts are publicly readable. *Pinned by a persistence test that also proves publishing still works.*
- [x] **F4** `admin/landing-pages/page.tsx:17` — drop the `?? pages[0]` fallback and add a "New page" affordance. The builder cannot create a second page. *The first attempt wrapped a `<Link>` and a sibling `<span>` in `<Button asChild>`; Radix `Slot` calls `React.Children.only`, so the screen threw at render until the spans were nested inside the link.*
- [x] **F5** Pass `codEnabled`/`bkashEnabled` into `CheckoutForm`; render each radio conditionally and default to the first enabled one.
- [x] **F6** Remove the delivery-fee row from `cart/page.tsx` and `checkout/page.tsx`, or move it into `CheckoutForm` where the district actually lives. Both currently price from the *store's* address. *The form initially quoted on the raw subtotal while the store charged on `subtotal - discountAmount`, so any coupon showed one fee and billed another.*
- [x] **F7** Redirect cancelled bKash payments to `/track-order?code=…` the way the success page resolves it; drop the two dead CTAs.
- [x] **H1** `resetPasswordAction` — `deleteMany({ where: { userId } })` on sessions and on the user's other reset tokens.
- [x] **H3** `sendEmail` — return `{ success: false }` when SMTP is unconfigured. It currently lies to every caller.
- [x] **H11** Validate `customerName`/`customerPhone`/`district`/`shippingAddress` in `checkoutAction`. `createManualOrder` already does; the customer path is the less-defended one.
- [x] **H9** Make District a `<select>` from `domain.ts`'s zone list and delete the substring matching in `deriveDeliveryZone`. *The list lives in the new `src/lib/delivery.ts`, which is now the single home for the zone rules `store.ts` used to duplicate.*
- [x] Surface the real error in `checkoutAction`'s catch instead of flattening every rejection to "Something went wrong." *Done as an allowlist — a `CheckoutError` class thrown at the six checkout-reachable sites. The first attempt used a blacklist regex, which leaks anything not on the list.*

**Verify:** `npm run test:e2e` plus a manual pass over profile edit, checkout
with COD disabled, and a bKash cancellation.

## P4 · Data integrity

Audit §3.

**Shipped 2026-08-07 across `cf13fd8` (PR #14) and `91d806d` (PR #15).**

- [x] **H2** Set `Order.customerId` in `createOrderFromCart`. The column exists and nothing writes it, so no signed-in customer's orders are linked to their account. *Passed explicitly from `checkoutAction` as `user?.id`, not read from `actor` — an admin creating an order on someone's behalf is the actor, never the customer.*
- [x] **H6** Wrap `confirmPayment`'s three writes in one `$transaction` (`integrations.ts:205`), keeping the outbound HTTP call outside it. *`upsertPayment`, `addPaymentLog` and `updateOrderPayment` each took the same optional `client` H8 introduced, so `tx` is threaded down rather than their bodies copied.*
- [x] **H7** Add a legal-transition check before the payment status write — nothing may leave `paid` except to `refunded`. *Placed in `updateOrderPayment`, so it also covers the admin `toggleOrderPaymentAction`, not just the gateway callback.*
- [x] **H8** Give `recordAuditLog` an optional `client` param and pass `tx` at all eleven call sites. Fixes rollback-surviving audit rows and the double connection per mutation.
- [x] **H10** Add `@@index` for `CartItem.cartId`, `OrderItem.orderId`, `Order.customerId`, `Payment.orderId`, `OrderStatusHistory.orderId`, `InventoryLog.productId`, `Product.categoryId`, `Product.brandId`. One migration. *`20260806013539_add_indexes_p4`. **Not yet applied to production** — see the migration note below.*
- [ ] Add pagination to `listProducts` and the admin list queries — `take`/`skip` appear zero times in `store.ts` today. **Still open, and blocked.** `take`/`skip` params were written and then deleted: `admin/products/page.tsx:43` and `account/page.tsx:11` load every row and filter *in memory*, so paginating the query would paginate before filtering and silently drop rows. Real pagination means pushing those filters into the query first.

**Verify:** migration applies cleanly; `EXPLAIN` on the cart and order-list
queries shows index scans.

> **Production migration status.** Production is missing **two** migrations, not
> one: `20260805000000_close_schema_drift` (merged in an earlier release, never
> applied) and `20260806013539_add_indexes_p4`. Neither is urgent — production
> has 0 products and 0 orders, the indexes are additive, and the drift migration
> only narrows an enum value nothing has written since 2026-07-21 — but the P4
> index work has no effect until they are applied with
> `scripts/apply-production-migration.ps1`.

## P5 · SEO

Audit §9. Untouched, mechanical, and the only packet with a direct revenue
effect. ~150 lines.

**Shipped 2026-08-07 in `cf13fd8` (PR #14), verified live on production.**

Every origin comes from `APP_URL` via the new `src/lib/site-url.ts`, which also
absorbed the four places that already inlined the same fallback chain. Six
hardcoded `bornohinlifestyle.com` literals had been about to ship canonical
tags, a sitemap and JSON-LD pointing at a domain that is not the storefront —
which tells Google the real site is the duplicate, and is worse than shipping
nothing.

- [x] `generateMetadata` on `/product/[slug]`, `/shop`, `/l/[slug]` and the content pages. 35 of 36 pages currently inherit one generic title.
- [x] `metadataBase` in the root layout. *It was first exported as a standalone `const`, which Next ignores — it only reads it inside the `metadata` object, so relative OG image URLs never resolved.*
- [x] `src/app/sitemap.ts` driven by `listProducts()` / `listCategories()`.
- [x] `src/app/robots.ts`.
- [x] JSON-LD `Product` + `Offer` on the product page — price and availability in search results.
- [x] Canonical URLs on the faceted `/shop` routes. *The first version joined the params with no `?`, yielding `/shopcategory=saree&brand=x` on exactly the routes the tag exists to fix.*

**Both `robots.ts` and `sitemap.ts` need `export const dynamic = "force-dynamic"`.**
Without it Next renders them at *build* time against the build machine's
`APP_URL`; a developer build shipped `Host: http://localhost:3000` and a sitemap
pointing at localhost. Production reads `APP_URL` from Passenger `SetEnv`, which
does not exist until the app is running. `tsc` and `lint` pass either way — only
`npm run build` shows it.

**Verified against production**, not just the build:

```
Host: https://bornohin.com
Sitemap: https://bornohin.com/sitemap.xml
<loc>https://bornohin.com/shop</loc>
rel="canonical" href="https://bornohin.com/shop"
```

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

Superseded — P0–P5 have shipped. The original gate below is kept for the record,
followed by what the gate actually looks like now.

<details>
<summary>Original gate (written before P0 shipped)</summary>

Do not deploy until all of these hold:

1. P0, P1, P2 landed and merged to `main`.
2. CI green on the merge commit **with the persistence suite running** — `62 passed, 0 skipped`.
3. `prisma migrate diff` reports no drift.
4. A pre-migration backup taken with the `pipefail` fix in place, verified non-empty by byte count.
5. Deploy dispatched against the SHA that CI went green on, not a branch name.

Deploying before then ships C1–C4 to a live store: a crafted request sets its own
order total, a deactivated coupon still discounts, and concurrent checkouts
oversell stock — with a backup that may be empty if a rollback is needed.

</details>

### The gate as it stands

1. `npx tsc --noEmit`, `npm run lint`, `npm test` (**82 passed, 0 skipped**), `npm run build`.
2. `prisma migrate diff --from-config-datasource --to-schema --exit-code` reports no drift.
3. `npm run test:e2e` — **run it against a production build, not `next dev`.** This
   repo pins `cpus: 1`, so first-hit dev compiles run past Playwright's 60s
   navigation limit (`/login` took 107s) and produce timeouts that read as
   product failures. `npm run build && npm start` first.
4. Deploy from a **clean detached worktree** at the merge commit —
   `deploy-cpanel.ps1` builds from the working tree, so running it from a dirty
   checkout ships uncommitted files under a lying commit hash.
5. `-DryRun` first, then the real run, then confirm `/api/version` reports the
   new SHA and `/api/health/ready` passes.

**Item 3 is the one that has been skipped, twice.** CI has no runners and
`npm test` does not include e2e, so nothing caught that the P3 batch broke two
existing specs — H9's `<select>` and F6's relocated fee both invalidated
`cod-order.spec.ts`, and F5 invalidated a `storefront.spec.ts` assertion that
had only ever passed *because* of the bug F5 fixed. Running it also surfaced a
pre-existing login bug. Fixed in `c190ca9` (PR #17).

### Deploying and rolling back

Releases are retained on the host as
`$CpanelHome/releases/bornohin-<sha>.zip`, pruned to the two most recent.
`deploy-cpanel.ps1 -Rollback <sha>` re-extracts one and restarts.

Two caveats that are real:

- Extraction **overlays**, it does not wipe, so files a newer release added
  survive a rollback. Harmless for a Next standalone bundle.
- Rolling back code does **not** roll back migrations. Additive migrations go
  before a deploy; migrations that drop or change semantics go after.

Production topology (`CPANEL_HOST`, `CPANEL_USER`, `CPANEL_HOME`, `APP_ROOT`,
`APP_URL`) comes from the environment — this repository is public and no script
here ships a default. Set them once with `scripts/set-deploy-secrets.ps1`; a
missing value fails the deploy loudly rather than guessing.
