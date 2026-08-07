# Land the uncommitted P3/P4/P5 batch

> **Executed 2026-08-07.** Everything below shipped across PRs #14–#17 and is
> live on production as `ff686b9`. This document is kept as the record of what
> the working tree contained and how it was classified — correct, inert, or
> wrong. Current status lives in [REMEDIATION_PLAN.md](REMEDIATION_PLAN.md).
>
> Three things it did not anticipate, all found by *running* rather than reading:
>
> - `robots.ts` needed `force-dynamic` too, not just `sitemap.ts`. The build
>   shipped `Host: http://localhost:3000` until it was added.
> - The rollback net in the tree could not work: its `-Rollback` block ran above
>   every definition it referenced, pruning sorted archives by commit SHA
>   (lexically random), the releases directory could never be created, and
>   `Get-ReleasesList` filtered on a field the cPanel API does not return.
> - The batch broke two existing e2e specs, and one of those specs had only
>   ever passed *because* of the bug F5 fixed.
>
> The deferred list below is still accurate except for H2, H6 and H7, which
> shipped in PR #15, and the P2 rollback item, which shipped in PR #16.

## Context

Production is at `b7fd334` and healthy — the server-action body-limit fix is live.
But the working tree holds **~440 uncommitted lines** across 15 modified and 4 new
files: a partial implementation of packets P3, P4 and P5 from
[REMEDIATION_PLAN.md](REMEDIATION_PLAN.md). It typechecks (`tsc --noEmit` exits 0),
which is why it looks finished. It is not.

Reviewed line by line, it splits three ways: work that is correct and worth
shipping, work that is present but **inert** (an API nobody calls), and work that
is **wrong** — including a canonical domain that points search engines at the
wrong site and an admin page that will throw on render.

Uncommitted is the worst place for it to sit: no review, no CI, no test, and one
`git checkout` from gone. The goal is to repair it, prove it, and get it to
production the same way `b7fd334` got there.

**Decisions taken:** canonical domain is `bornohin.com`, read from `APP_URL`
(never hardcoded). Scope is the tree plus its half-wired items — no P6/P7/P8.
Repo stays public, so production topology moves out of the deploy script.

---

## State of the working tree

| | Item | Status |
|---|---|---|
| **P3** | F1 profile `defaultValue`, F3 draft landing pages, F5 payment radios, F7 bKash cancel redirect, H1 session revocation, H3 `sendEmail` honesty, H11 checkout validation | correct |
| | F4 "New page" affordance | **throws at render** |
| | F6 delivery fee moved to the form | **quotes a different fee than it charges** |
| | H9 district `<select>` | not started |
| **P4** | H10 indexes (schema + migration `20260806013539_add_indexes_p4`) | correct |
| | H8 audit-log `client` param | **inert** — 0 of 31 call sites pass it |
| | pagination `take`/`skip` | **inert** — 0 callers, and incompatible with the admin page |
| | H2 `customerId`, H6 `confirmPayment` txn, H7 status guard | not started |
| **P5** | `generateMetadata` on product / shop / landing, JSON-LD, robots, sitemap | present, **wrong domain** |
| | `metadataBase` | **inert** — wrong export shape |

---

## PR 1 — Storefront and account fixes (P3)

Everything customer-facing. Ship first; it is the only batch a shopper feels.

**Defects to repair:**

- **`src/app/admin/landing-pages/page.tsx:122-125`** — `<Button asChild>` wraps a
  `<Link>` *and* a sibling `<span>`. Radix `Slot` calls `React.Children.only`; this
  throws and takes the whole admin landing-pages screen with it. Move the `<span>`
  inside the `<Link>`.
- **`src/components/checkout-form.tsx:58-60`** — the form quotes
  `getDeliveryChargeForZone(settings, zone, subtotal)` while `src/server/store.ts:1674`
  charges on `subtotal - discountAmount`. With a coupon applied the customer is shown
  one fee and billed another. Pass the discounted subtotal, or drop the coupon field's
  effect from the quote and say so.
- **`src/lib/delivery.ts`** duplicates `src/server/store.ts:1520-1533` verbatim. Two
  copies of the zone rules, and `tests/persistence.test.ts:555` only covers the store
  copy. Make `delivery.ts` the single home — it is pure and client-safe — and have
  `store.ts` import from it. `Settings` structurally satisfies `DeliverySettings`, so
  no call site changes.
- **`src/app/actions.ts:568`** — the new catch returns `error.message` filtered by a
  *blacklist* regex (`/prisma|SQL|database|.../i`). Anything not on the list leaks.
  Invert it: add `class CheckoutError extends Error` to `store.ts`, throw it at the six
  checkout-reachable sites (`Your cart is empty` :1638, `Insufficient stock for …`
  :1815, `Product … is unavailable` :1658, `COD is not enabled for this delivery zone`
  :1542, `bKash is disabled` :1545, `Store settings are missing` :1642), and show the
  message only when `error instanceof CheckoutError`.
- Restore the trailing newline on `layout.tsx`, `cart/page.tsx`, `checkout/page.tsx`,
  `payments/[provider]/cancelled/page.tsx`; fix the lost indent at
  `src/components/profile-form.tsx:41`.

**Then finish H9**, the one P3 item with nothing in the tree: make District a
`<select>` fed by the existing `deliveryZones` export in `delivery.ts` (currently
exported and imported by nobody — it was added for exactly this), and delete the
substring matching in `deriveDeliveryZone`. This closes the F6 mismatch at the
source: an enum can't be typo'd into the wrong zone.

**Tests:**
- `tests/` — one unit test asserting the form's quote and the store's charge agree
  for the same district and discounted subtotal. This is the test that would have
  caught F6.
- `tests/persistence.test.ts` — `resetPasswordAction` deletes sessions and sibling
  tokens (H1); `getLandingPage` returns null for an unpublished slug (F3).
- `e2e/storefront.spec.ts` — checkout renders one radio when `codEnabled` is false;
  a bKash cancellation lands on `/track-order`.

## PR 2 — Data integrity (P4, scoped)

- Commit the schema change and the `20260806013539_add_indexes_p4` migration as-is.
  Eight indexes, all correct, matching the H10 list.
- **Finish H8.** The `client?: Prisma.TransactionClient` param on `src/server/audit.ts:13`
  is dead until callers use it. Thread `tx` through the `recordAuditLog` calls inside
  `$transaction` blocks in `store.ts`. Until then, audit rows still survive rolled-back
  transactions and every mutation still opens a second connection — the two things H8
  exists to fix.
- **Delete the `take`/`skip` params** from `listCategories` / `listBrands` /
  `listProducts` / `listCoupons`. Nothing calls them, and they cannot be wired to the
  admin list as written: `src/app/admin/products/page.tsx:43` loads everything and
  filters *in memory*, so paginating the query would paginate before filtering and drop
  rows. Real pagination means pushing the filters into the query first — its own packet,
  not this one.

**Verify:** `npx prisma migrate deploy` then the CI drift gate
(`prisma migrate diff --from-config-datasource --to-schema --exit-code`) reports clean;
`EXPLAIN` on the cart and order-list queries shows index scans.

## PR 3 — SEO (P5)

The domain is the whole story here. Six hardcoded `https://bornohinlifestyle.com`
literals ship canonical tags, a sitemap and JSON-LD pointing at a domain that is not
the live storefront — which tells Google the real site is the duplicate. Worse than
having shipped nothing.

- **New `src/lib/site-url.ts`** exporting the origin from
  `APP_URL || NEXT_PUBLIC_APP_URL || "http://localhost:3000"`. This is not a new
  convention — it is the one already inlined at `src/app/actions.ts:604`,
  `src/app/actions.ts:682`, `src/server/integrations.ts:41` and
  `src/server/security.ts:45`. Collapse those four into it too. `APP_URL` is provably
  set in production: `requireActionOrigin` rejects every server action without it, and
  the store takes orders.
- Replace all six literals: `src/app/layout.tsx:6`, `src/app/product/[slug]/page.tsx:76`
  and `:83`, `src/app/robots.ts:4`, `src/app/shop/page.tsx:58`, `src/app/sitemap.ts:4`.
  Drop the guessed `@bornohinlifestyle` Twitter handle at `src/app/layout.tsx:21` unless
  the account exists.
- **`metadataBase` is currently a no-op.** `src/app/layout.tsx:6` exports it as a
  standalone const; Next only reads it *inside* the `metadata` object. Move it in —
  relative OG image URLs do not resolve until it is there.
- **Fix the `/shop` canonical.** `src/app/shop/page.tsx:57` builds
  `` `/shop${[...].join("&")}` `` with no `?`, yielding `/shopcategory=saree&brand=x`.
  Only the faceted routes are affected — the exact routes the item exists to fix.
- **`sitemap.ts` needs `export const dynamic = "force-dynamic"`.** It calls
  `listProducts()` with no dynamic marker, so Next renders it at *build* time against
  whatever `.env` the build machine has — baking local dev products into the shipped
  sitemap. Every other route in this app is already `force-dynamic`.
- Reconcile robots and sitemap: `robots.ts` disallows `/cart` and `/checkout` while
  `sitemap.ts` lists them, alongside `/login`, `/register`, `/reset-password` and
  `/verify-email`. Drop the auth and funnel routes from the sitemap.
- Add `generateMetadata` to the content pages P5 also asks for: `/about-us`,
  `/contact-us`, `/faq`, `/privacy`, `/terms`, `/cookie-policy`, `/track-order`.

## PR 4 — Deploy script topology (repo is public)

`scripts/deploy-cpanel.ps1:13-18` hardcodes `bd10.exonhost.com`, cPanel user
`bornohin`, `/home/bornohin`, `bornohin_app` and the app URL as parameter defaults.
No credentials — the token already comes from the environment — but it is a public map
of the production host. Move the five defaults to environment variables alongside the
existing `CPANEL_API_TOKEN` / `DEPLOY_RESTART_TOKEN` reads, and have
`scripts/set-deploy-secrets.ps1` prompt for them.

---

## Explicitly deferred

Named so they are not mistaken for done:

- **P4 H2** — `Order.customerId` is written nowhere (`customerId` appears zero times in
  `store.ts`). No signed-in customer's orders link to their account.
- **P4 H6/H7** — `confirmPayment`'s three writes are still untransacted; nothing stops a
  `paid` order moving to a non-`refunded` status.
- **P4 pagination** — blocked on moving the admin list's in-memory filters into the query.
- **P2 rollback directory** — still the one release-gate item marked NOT DONE. A bad
  deploy has nowhere to roll back to; recovery means rebuilding the previous commit.
- **P6, P7, P8** — untouched by choice.
- **`DEPLOY_RESTART_TOKEN` mismatch** — the running build holds a different token than the
  local one, so deploys fall back to the orphan reaper. Reconcile with
  `scripts/set-deploy-secrets.ps1` before the next release.

---

## Verification

Per PR, before merge:

```
npx tsc --noEmit          # passes today; must stay passing
npm run lint
npm test                  # 67 passed, 0 skipped — needs DATABASE_URL
npm run build
npx prisma migrate deploy && npx prisma migrate diff \
  --from-config-datasource --to-schema prisma/schema.prisma --exit-code
npm run test:e2e          # against localhost; admin specs write rows
```

After deploy, against production:

```
curl https://bornohin.com/robots.txt                  # host + sitemap on bornohin.com
curl https://bornohin.com/sitemap.xml | head -40      # real product slugs, no localhost
curl -s https://bornohin.com/product/<slug> | grep -o '<title>[^<]*'   # distinct title
curl -s https://bornohin.com/product/<slug> | grep -A5 'application/ld+json'
curl -s "https://bornohin.com/shop?category=<slug>" | grep 'rel="canonical"'  # has the ?
```

Plus a manual pass: edit `/account/profile`, load `/admin/landing-pages`, check out with
COD disabled, cancel a bKash payment.

## How this ships

GitHub Actions creates runs but never assigns runners, so no PR will get a green `ci`
check and `deploy-production.yml`'s gate will refuse every SHA. Same as last release:
merge to `main`, then deploy from a **clean detached worktree** at the merge commit via
`scripts/deploy-cpanel.ps1` — the script builds from the working tree, so running it from
this repo would ship the uncommitted files under a lying commit hash. Dry-run first
(`-DryRun`), then the real run, then confirm `/api/version` reports the new SHA. Record
the release in `deploy-log.jsonl` with the rollback commit.
