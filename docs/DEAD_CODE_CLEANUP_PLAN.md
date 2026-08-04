# Dead Code & Redundancy Cleanup — `chore/dead-code-audit`

> **Status: executed and shipped 2026-08-04.** All six packets are committed
> (`2c67232`…`0cb802a`), plus `64aeac9` fixing four defects the packets
> themselves introduced and `7a76df3` adding the migrations P3 changed the
> schema without. Kept for the reasoning — the packet list below is history, not
> a to-do. What was deliberately left alone is still live and still worth
> reading: see **Explicitly out of scope** at the end.
>
> Two things P1.4 asked for were never done and remain open:
> `tests/product-import.test.ts` (`parseCsv` is an untested hand-rolled RFC4180
> parser) and the P4.1 regression test for the template-price fallback.

## Context

The app just went through a production wipe and a fresh deploy. With the demo catalogue gone, a
layer of code that only ever served the old hardcoded storefront is now provably unreachable — and
removing it exposed three live bugs that were previously masked by that same template data.

A full audit of `src/`, `prisma/`, `scripts/`, `package.json` and `.env.example` found:

- **Zero unreferenced files.** Every file under `src/` has an importer or is a Next.js convention
  entry point. The rot is at the *symbol* level, not the file level.
- **~35 unreferenced exports**, including an abandoned half-built address book that still compiles
  into POST-able server-action endpoints.
- **Three severe bugs** that the audit surfaced: email delivery is silently disabled, real products
  render fake struck-through sale prices, and the delivery charge shown at checkout is computed from
  a different field than the one the order is actually charged.
- **Three npm packages with zero imports**, six dead database columns, and three `.env.example`
  entries no code reads.

Intended outcome: roughly 600 LOC removed, three customer-facing bugs fixed, and every remaining
`export` earning its place — with a green test suite at every step.

**Scope decisions already made** (do not relitigate):

- Fix the three severe bugs; leave the lower-severity ones documented but untouched.
- Safe deletes and cheap merges only. **Do not restructure `store.ts`.**
- Delete the abandoned address book rather than finishing it.

---

## Ground rules for whoever executes this

1. **Branch:** `git checkout -b chore/dead-code-audit` off `codex/mobile-first-responsive`.
2. **Baseline is green — keep it green.** `npm test` currently reports **14 passed / 1 skipped
   files, 49 passed / 13 skipped tests**. Run it after every packet. A newly-skipped test is a
   regression, not a pass.
3. **One packet per commit.** The packets below are ordered so each is independently landable and
   revertable. P1–P3 are behaviour-preserving; P4 deliberately changes behaviour.
4. **Deleting an export is not enough.** When a symbol goes, its private helpers usually die with it
   — check for now-unused imports and local functions in the same file, and let `npm run lint`
   confirm.
5. **Prove each delete.** Before removing symbol `X`, run
   `git grep -nw X -- 'src/**' 'tests/**' 'e2e/**' 'scripts/**' 'prisma/**'` and confirm the only
   hits are its own definition. Paste that into the commit body.

---

## P1 — Delete unreferenced code

Behaviour-preserving. ~260 LOC out.

### P1.1 The abandoned address book

`src/app/actions.ts` lines 431–585 — delete the whole block:

| Line | Symbol |
|---|---|
| 431 | `addressSchema` (private) |
| 445 | `getUserContext` (private) |
| 451 | `createAddressAction` |
| 488 | `updateAddressAction` |
| 539 | `deleteAddressAction` |
| 563 | `setDefaultAddressAction` |

All four actions `revalidatePath("/account/addresses")` — **that route does not exist**; only
`/account` and `/account/profile` are present under `src/app/`. Nothing imports them. They are
reachable over HTTP today as compiled server actions, so this is an attack-surface reduction.

Then delete their now-orphaned callees in [src/server/store.ts](../src/server/store.ts): `getAddress`
(:1972), `upsertAddress` (:1980), `deleteAddress` (:2041), `setDefaultAddress`, and `listAddresses`
(:1955). Remove the `// eslint-disable-next-line @typescript-eslint/no-unused-vars` at
[src/app/actions.ts:21](../src/app/actions.ts#L21) that was suppressing the unused `listAddresses`
import — the codebase already knew this was dead.

**Leave the `Address` model and its table alone.** No migration. The data stays so the feature can be
rebuilt.

### P1.2 Remaining dead exports

Delete outright — zero references anywhere, including inside their own file:

| File | Line | Symbol | Note |
|---|---|---|---|
| [src/server/db.ts](../src/server/db.ts#L25) | 25 | `export const prisma = getPrisma;` | Exports the **factory**, not a client. Any future `prisma.user.findMany()` would throw "not a function". Delete the line, not the function. |
| [src/app/admin/actions.ts](../src/app/admin/actions.ts#L477) | 477 | `adjustInventoryAction` | Revalidates `/admin/inventory`, which does not exist. Mutates stock. Keep its callee `setProductStock` — used by `saveProductAction` and `tests/persistence.test.ts`. |
| [src/server/store.ts](../src/server/store.ts) | 635, 927, 1931, 1947 | `deleteCoupon`, `getCartByKey`, `listPaymentsForOrder`, `listInventoryLogs` | `getOrCreateCart` supersedes `getCartByKey`; `/admin/reports` reads `getState()` instead of `listInventoryLogs`. |
| [src/server/auth.ts](../src/server/auth.ts) | 164, 292 | `getUserFromToken`, `isEmailVerified` | The verification flow only calls `markEmailVerified`. |
| [src/lib/wishlist.ts](../src/lib/wishlist.ts#L54) | 54 | `upsertWishlistItem` | `toggleWishlistItem` covers the UI. |
| [src/server/seed.ts](../src/server/seed.ts#L328) | 328 | `defaultLandingSlug` | A one-line passthrough to `slugify`. |
| [src/components/profile-form.tsx](../src/components/profile-form.tsx#L8) | 8 | `ProfileFormState` | Zero refs even internally. Duplicates `UpdateProfileState`. |
| [src/lib/product-import.ts](../src/lib/product-import.ts#L54) | 54 | `ProductUploadColumnKey` | Type, zero refs. |

### P1.3 Orphaned storefront template exports

In [src/lib/bornohin-storefront.ts](../src/lib/bornohin-storefront.ts), delete lines 293–412: the
consts `storefrontQuickTopics` (:293), `storefrontServices` (:301), `storefrontHighlights` (:308),
and the four functions `getCollectionBySlug` (:389), `getProductBySlug` (:393), `getRelatedProducts`
(:397), `searchStorefrontProducts` (:403).

All four functions are superseded by DB-backed equivalents in
[src/server/storefront-catalog.ts](../src/server/storefront-catalog.ts) (:146, :151, :161, :171).
`searchStorefrontProducts` is the dangerous one — **same name, different file**;
[src/app/search/page.tsx:4](../src/app/search/page.tsx#L4) imports the catalog version. Confirm the
import path after deleting.

Keep everything else in that file. `storefrontCollections`, `storefrontProducts`,
`storefrontPrimaryNav`, `storefrontPolicyPages` and the two types are all still read at runtime.

### P1.4 Downgrade export-only symbols

Used inside their own file but never imported — drop the `export` keyword, keep the symbol:

- [src/server/readiness.ts](../src/server/readiness.ts) :3, :5, :12, :20 (4 of its 5 exports)
- [src/server/storage.ts](../src/server/storage.ts) :5 `StoredFile`, :13 `FileStorage`, :61 `getStoredUploadKey`
- [src/server/auth.ts](../src/server/auth.ts) :110 `createSession`, :169 `requireAuth`
- [src/server/store.ts](../src/server/store.ts) :329 `getProductBySlug`, :1226 `deriveDeliveryZone`
- [src/lib/domain.ts](../src/lib/domain.ts) :1 `UserRole`, :30 `LandingSectionType`, :176 `OrderItem`, :230 `LandingSectionItem`
- [src/lib/homepage-carousel.ts](../src/lib/homepage-carousel.ts#L24) :24 `fallbackHomeHeroSlides`
- [src/components/ui/button.tsx](../src/components/ui/button.tsx#L26) :26 `ButtonProps`
- [src/app/actions.ts](../src/app/actions.ts#L244) :244 `UpdateProfileState`

**Exception — do not touch [src/lib/product-import.ts](../src/lib/product-import.ts) yet.** Seven of its
nine exports are export-only, which normally means "exported for tests" — but **there is no test file
for it**. `parseCsv` (:148) is a hand-rolled RFC4180 parser with quote escaping feeding 35 typed
columns. Stripping its exports would lock an untested parser behind a closed door.

**Do this instead:** write `tests/product-import.test.ts` covering `parseCsv` (quoted fields, escaped
`""`, embedded commas and newlines, CRLF, trailing empty cell) and one `normalizeProductUploadRow`
round-trip through `buildProductUploadTemplateCsv` → `parseProductUploadCsv`. Then leave the exports
alone — they are now genuinely test entry points.

---

## P2 — Unused dependencies and env hygiene

### P2.1 Drop three packages

In [package.json](../package.json): remove `jose` (:27), `tailwind-merge` (:33), `clsx` (:25). Verified
zero imports — `cn()` at [src/lib/utils.ts:1](../src/lib/utils.ts#L1) is hand-rolled
(`parts.filter(Boolean).join(" ")`) and session signing uses node `crypto` via `createHmac` at
[src/server/auth.ts:49](../src/server/auth.ts#L49), not JWTs.

Move `dotenv` (:26) and `@types/nodemailer` (:23) from `dependencies` to `devDependencies` — `dotenv`
is imported only by `prisma.config.ts`, `prisma/seed.ts` and `scripts/db-reset.ts`, never under
`src/`. Also bump `@types/nodemailer` to `^9` to match the `nodemailer` `^9.0.3` runtime; the current
`^8` types are a major version behind.

Run `npm install`, commit the `package-lock.json` change, then `npm run build` to confirm nothing
was resolving transitively.

### P2.2 `.env.example`

Remove — no `process.env` reader exists for any of them:

- `META_PIXEL_ID` (:9) and `GTM_CONTAINER_ID` (:10) — the app reads these from the `Setting` table via
  [src/lib/analytics-ids.ts](../src/lib/analytics-ids.ts), not the environment.
- `API_URL` (:8) — a Passenger `.htaccess` directive that `scripts/deploy-cpanel.ps1` manages. Its
  presence here implies the app consumes it. Move the note to `docs/OPERATIONS.md`.

Add `UPLOAD_DIR` (read at [src/server/storage.ts:19](../src/server/storage.ts#L19), documented in
OPERATIONS but missing from the example file).

Delete the `NEXTAUTH_SECRET` fallback at [src/server/auth.ts:45](../src/server/auth.ts#L45). It is an
undeclared, undocumented second auth secret sitting on the session-signing path — a silent way for
sessions to be signed with an unexpected key. `AUTH_SECRET` is the documented one.

---

## P3 — Prune config that lives in the wrong place

Two schema changes, one migration. Follow the existing removal-migration pattern in
`prisma/migrations/20260721170000_remove_delivery_gateway/`.

### P3.1 Delete the nagad/rocket columns

[prisma/schema.prisma](../prisma/schema.prisma) lines 384–389: `nagadEnabled`, `nagadAccountNumber`,
`nagadInstructions`, `rocketEnabled`, `rocketAccountNumber`, `rocketInstructions`.

Never created (`setting.create` at [store.ts:84](../src/server/store.ts#L84) omits them), never updated
(the `setting.update` data block at :887–914 omits them), never seeded, never rendered in the admin
settings form. They exist only on their SQL defaults.

Also drop the unreachable `nagad` (:18) and `rocket` (:19) values from the `PaymentProviderKey` enum —
[src/lib/domain.ts:3](../src/lib/domain.ts#L3) already narrows the TypeScript type to `"cod" | "bkash"`,
so no call site can produce them.

**This breaks one test.** [tests/contact-footer.test.tsx:36-41](../tests/contact-footer.test.tsx#L36-L41)
sets all six fields in a fixture — delete those six lines.

### P3.2 Move SMTP config to the environment — this fixes email

`Setting.smtpHost/smtpPort/smtpUser/smtpPass/fromEmail/fromName`
([schema.prisma:396-401](../prisma/schema.prisma#L396-L401)) are **read** at
[src/server/email.ts:121-143](../src/server/email.ts#L121-L143) but **written nowhere** — absent from
`setting.create`, absent from the `setting.update` data block, absent from the seed, and there are no
inputs for them in the admin settings page. They are nullable with no default, so the guard at
[email.ts:128](../src/server/email.ts#L128) always short-circuits. **Every real email the app tries to
send is silently dropped**, including password reset and email verification.

Fix by reading them from `process.env` instead of the database, and dropping the six columns plus the
six optional fields from the `Settings` interface at
[src/lib/domain.ts:303-308](../src/lib/domain.ts#L303-L308).

Rationale for env over adding admin form inputs: every other secret in this app already lives in the
environment (`DATABASE_URL`, `AUTH_SECRET`, all nine `BKASH_*`), production reads them from Passenger
`SetEnv`, and an SMTP password does not belong in a table that an admin form renders. It is also the
smaller diff — six env reads versus six form inputs, six validators, and a write path.

Add `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL`, `FROM_NAME` to `.env.example`
and to the environment table in `docs/OPERATIONS.md`. Keep the existing short-circuit so a missing
config still degrades to the current no-op rather than throwing.

**Verify:** set the six vars locally against any SMTP catcher (Mailpit, Ethereal) and confirm a
password-reset request actually delivers. This is the one packet where a passing test suite is not
sufficient evidence — the tests never exercised the send path.

---

## P4 — Fix the two remaining severe bugs

### P4.1 Real products render fake sale prices

[src/server/storefront-catalog.ts:29-33](../src/server/storefront-catalog.ts#L29-L33):

```ts
const templateProduct =
  templateProducts.find((entry) => entry.slug === product.slug) ??
  templateProducts[fallbackIndex % Math.max(templateProducts.length, 1)] ??
  templateProducts[0];
```

The `find` only matches a database seeded from this exact template file. For a real store, it misses
— and the second arm then picks an **arbitrary template product by array index**. Line 44 copies that
stranger's `compareAtPrice` onto the real product and line 45 copies its `badge`.

Result: a real product with no sale price renders a struck-through fake original price and a
discount badge. This is the last surviving piece of the "template prices in front of customers"
problem that the comment at :106-112 says was removed.

**Fix:** delete the two fallback arms. Keep only the exact-slug `find`, so an unmatched product gets
`undefined` and falls through to the real values. `tone` (:47) already has a literal default; keep
it. `compareAtPrice` (:44) must become `product.compareAtPrice ?? undefined` — never a template
value. `badge` (:45) keeps the `isSoldOut` branch and otherwise goes `undefined`.

**Test:** add a case asserting a product with `compareAtPrice: null` whose slug matches no template
entry renders no compare-at price and no badge. This is the check that fails if the fallback ever
comes back.

### P4.2 Delivery charge computed four ways

One number, four representations, and the one shown to the customer is not the one they are charged:

| Location | Expression |
|---|---|
| [src/server/store.ts:1233](../src/server/store.ts#L1233) `getDeliveryChargeForZone` | zone-aware — **what the order actually charges** |
| [src/app/cart/page.tsx:81](../src/app/cart/page.tsx#L81) | `settings.deliveryCharge` |
| [src/app/checkout/page.tsx:21](../src/app/checkout/page.tsx#L21) | `settings.insideDhakaDeliveryCharge` |
| [src/components/site-header.tsx:297](../src/components/site-header.tsx#L297) | hardcoded `"৳70 - ৳150"` |

With the current defaults (`deliveryCharge: 80`, `insideDhakaDeliveryCharge: 80`) these agree by
coincidence. But the admin settings form exposes the zone charges and **not** `deliveryCharge`, and
`updateSettings` never writes `deliveryCharge` — so the moment an admin edits delivery pricing, the
cart page silently keeps quoting the stale bootstrap value.

**Fix:** make `getDeliveryChargeForZone` the single source. Export it, have cart and checkout call it
with the same default zone the order will use, and replace the hardcoded header string with a range
derived from the three zone settings. Keep the `freeDeliveryThreshold` short-circuit — it is correct
in both pages today.

---

## P5 — Cheap merges

Behaviour-preserving. Stop here; do not extend into `store.ts` restructuring.

1. **Two identical hash functions in one file.** [src/server/auth.ts:18](../src/server/auth.ts#L18)
   `tokenHash` and :191 `hashToken` have byte-identical bodies
   (`createHash("sha256").update(token).digest("hex")`). Keep one. 3 LOC.

2. **One predicate, two spellings, 37 sites.** [src/server/store.ts](../src/server/store.ts) uses bare
   `!process.env.DATABASE_URL` at 20 sites and `!isDatabaseConfigured()` at 17.
   `isDatabaseConfigured()` ([db.ts:8](../src/server/db.ts#L8)) *is* `Boolean(process.env.DATABASE_URL)`.
   Replace all 20 bare reads with the helper. Mechanical; `npm test` is sufficient proof.

3. **Byte-identical admin pages.** [src/app/admin/brands/page.tsx](../src/app/admin/brands/page.tsx) and
   [src/app/admin/categories/page.tsx](../src/app/admin/categories/page.tsx) differ only in the nouns —
   verified by structural diff, the sole differences are the imported action names, the list function
   and the label text. Extract one `<AdminTaxonomyPage>` component taking the list function, action
   pair, labels and route. ~65 LOC out.

4. **Two admin dashboard pages run 17 queries for one field.**
   [src/app/admin/page.tsx:9](../src/app/admin/page.tsx#L9) and
   [src/app/admin/payments/page.tsx:6](../src/app/admin/payments/page.tsx#L6) both call `getState()`,
   which issues 17 queries, and then use only `state.settings`. Swap to `getSettings()`. Zero LOC
   change, large latency win.

5. **`slugify` written out inline.** [src/lib/bornohin-storefront.ts:63-64](../src/lib/bornohin-storefront.ts#L63-L64)
   repeats the regex chain from [src/lib/utils.ts:5](../src/lib/utils.ts#L5) twice on adjacent lines.
   Import the real one.

6. **Two one-line passthrough wrappers.** [src/app/actions.ts:59](../src/app/actions.ts#L59)
   `requireActionOrigin` → `requireSameOrigin`, and
   [src/app/admin/actions.ts:44](../src/app/admin/actions.ts#L44) `guard()` → `requireAdmin()`. Inline
   both.

7. **Lazy-init the demo state.** [src/server/store.ts:38](../src/server/store.ts#L38) —
   `const demoState = createSeedState();` runs at **module scope, unconditionally, in every process
   including production**. It builds the entire 51-product state and runs `bcryptjs.hashSync` twice
   ([seed.ts:91](../src/server/seed.ts#L91), :101) at import time, before a single request is served.
   Change to a lazily-initialised getter. One-line-ish change, removes measurable cold-start cost from
   a production path that never reads the result.

---

## P6 — Repo hygiene

- **`.gitignore` gap.** Line 50 is `/deploy-package/` — root-anchored, so it does **not** cover
  `scripts/deploy-package/`, which exists on disk as a leftover build artifact. It is invisible to git
  today only because git ignores empty directories; the moment anything lands in it, it gets staged.
  Change to `deploy-package/`, delete the directory.
- Delete the empty untracked residue directories `.agents/` and `.codex/`.
- **Delete five orphaned audit documents** — tracked, with zero inbound references from anywhere in
  the repo: `ADMIN_STOREFRONT_ALIGNMENT_AUDIT.md`, `FINAL_PRODUCTION_RELEASE_REPORT.md`,
  `docs/PROJECT_AUDIT_REMEDIATION_REVIEW.md`, `docs/admin-dashboard-frontend-remaining-audit.md`,
  `docs/admin-frontend-feature-gap-audit.md`. Note that several *other* docs are kept alive only by
  links from these, so re-check the `FINAL_*` / `RESPONSIVE_*` / `PROJECT_*` cluster after deleting —
  it may collapse into one deletable unit. `docs/OPERATIONS.md`, `README.md` and
  `docs/remaining-integration-execution-plan.md` stay.
- **`.github/workflows/deploy.yml` misrepresents itself.** It hardcodes `echo "enabled=false"` at the
  *Check cPanel FTP secrets* step, so the *Deploy with FTP* job it gates can never fire. It is a CI
  job named as a deploy job — and the real deploy path is `scripts/deploy-cpanel.ps1`, per
  `docs/OPERATIONS.md`. Delete the dead FTP branch and rename the workflow to `ci.yml`. While there,
  add `npm test` — the workflow currently runs lint and build but **no tests**.
- **Wire up the e2e suite.** `playwright.config.ts` and 8 specs under `e2e/` exist, but no npm script
  runs them and CI never invokes them. Add `"test:e2e": "playwright test"` to `package.json` so the
  suite is discoverable. Do not add it to CI — it needs a live server and seeded admin credentials.
- Commit the pending `docs/OPERATIONS.md` edit (the `.env`/working-tree security rule under
  §6 Security rules) that is currently uncommitted in the working tree.

---

## Explicitly out of scope

Documented here so nobody re-derives them mid-task:

- **`store.ts` restructuring.** The 37 duplicated demo-fallback branches, the 8 near-identical
  `upsert*` + `recordAuditLog` blocks, the 6-copy cart-where predicate, and the duplicated order
  pricing math are all real duplication — but `demoState` is a *mutable in-memory store* in no-DB
  mode, written at 10+ sites with per-entity logic. A generic `readOrDemo()` helper works for the
  reads and breaks the writes. Deferred deliberately.
- **`ProductCard` / `StorefrontCard` merge.** They share ~60% of their markup, but the star rating,
  description clamp and `compact` prop are `StorefrontCard`-only while the "Sale" pill and
  `categoryName` are `ProductCard`-only. Merging yields one component with four more props — not
  obviously cheaper. Separately, `ProductCard` is fed a **raw Prisma `Product`** at
  [src/app/l/[slug]/page.tsx:93](../src/app/l/[slug]/page.tsx#L93) and :171, which has no `tone`,
  `imageUrl`, `soldOut` or `collectionSlug` — so landing-page cards can never show an image or "Sold
  Out". That is a live bug worth its own ticket; fixing it first would change the merge.
- **Lower-severity bugs**, to be filed as issues, not fixed here: a fixed-value coupon larger than the
  subtotal produces a negative total ([store.ts:1373-1378](../src/server/store.ts#L1373-L1378) has no
  clamp while the manual-order path at :1527 does); `toggleOrderPaymentAction` revalidates `/orders`,
  a route that does not exist; cart quantity changes do not revalidate the product page.
- **The `Address` table**, kept so the address book can be rebuilt.
- **Root `Dockerfile`.** `docker-compose.yml` uses `Dockerfile.dev` for both services, so the root one
  has no consumer in-repo — but it may be built by hand on a host. Not provable from the repo; leave it.

---

## Verification

Per packet: `npm run lint && npm test`, and confirm the count stays at **49 passed / 13 skipped**.

After P3 and P4, before merging:

```bash
npm run lint
npm test
npm run build          # catches type errors the test suite misses
npx prisma migrate dev # applies the P3 migration locally
npm run db:reset -- --seed
npm run dev
```

Then walk the app against a **seeded** local database, since P4 is invisible on an empty one:

1. `/shop` and `/product/[slug]` — a product with no `compareAtPrice` must show **no** struck-through
   price and **no** discount badge. This is the P4.1 regression check.
2. Add to cart → `/cart` → `/checkout` — the delivery charge must be identical on both pages and must
   match the total on the created order. Then change a zone charge in `/admin/settings` and confirm
   both pages follow it. This is the P4.2 check.
3. Request a password reset with the six `SMTP_*` vars pointed at a local catcher and confirm the mail
   actually arrives. This is the P3.2 check and **the test suite does not cover it**.
4. `/admin/brands` and `/admin/categories` — create, edit and delete on both, since P5.3 replaced them
   with a shared component.
5. `npx playwright test` for the full e2e sweep (needs `E2E_BASE_URL`, `E2E_ADMIN_EMAIL`,
   `E2E_ADMIN_PASSWORD`).

Do **not** deploy to production from this branch until the local walkthrough passes. When you do, use
the single deploy path — `scripts/deploy-cpanel.ps1`, per `docs/OPERATIONS.md`.
