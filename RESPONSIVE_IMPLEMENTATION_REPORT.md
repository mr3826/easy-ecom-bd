# Responsive Implementation Report — Easy e-Com

**Date:** 2026-07-28 · **Branch:** `codex/mobile-first-responsive` · **Baseline:** `0ec5f65`

## Executive summary

The mobile-first sweep already live on `bornohin.com` did real work, but an audit against the responsive-craft failure patterns found that **three of its central mechanisms did not function at runtime** — safe-area padding, modal semantics, and (after the first fix attempt) the 16px input floor. None of these were visible in source review; all three needed a rendered browser to catch.

The root cause of the class of defect was structural: the sweep applied fixes as copy-pasted utility strings across ~40 call sites rather than building a shared primitive layer, so anything it missed was missed everywhere simultaneously. This pass fixed the non-functioning foundations, added a deliberately small primitive layer (three components), and put automated guards under each finding.

**Result: 3 P0 and 5 of 6 P1 findings fixed and verified; 50 Playwright assertions passing; zero horizontal overflow across 15 routes × 9 widths.** One P1 (`F14`, login rate-limit error surfacing) is documented and deliberately left open as an auth concern rather than a responsive one.

## Findings fixed

Full matrix in `RESPONSIVE_DESIGN_AUDIT.md`. Headlines:

| | Finding | Why it mattered |
|---|---|---|
| **P0** | F1 — missing `viewport-fit=cover` | Made the previous sweep's entire safe-area implementation a no-op on every notched device |
| **P0** | F2 — no double-submit guard on checkout | Duplicate orders on slow mobile connections |
| **P0** | F3 — 5 fake modals | `aria-modal="true"` with no focus trap; page scrolled behind every open drawer |
| **P1** | F4 — 14px inputs | iOS Safari zoomed on focus and never zoomed back |
| **P1** | F5 — wrong mobile keyboards | Checkout phone field opened QWERTY, not a numpad |
| **P1** | F6 — `100vh` shells | Content overflowed behind mobile browser chrome |
| **P1** | F7 — no reduced-motion support | Accessibility preference ignored app-wide |
| **P1** | F8 — tablet table overflow | Two-axis scroll on the admin products list from 768px |
| **P1** | F13 — duplicate `<h1>` | Every admin page announced branding above its own title |

## Shared-component improvements

New `src/components/ui/` — three primitives plus a hook, kept deliberately small:

| File | What it carries |
|---|---|
| `use-overlay.ts` | Focus trap, **ref-counted** body scroll lock (so two overlays can't clobber each other's restore value), Escape, focus restore to the opener. The lock was **extracted from the one already-correct implementation** in `products-filter-drawer.tsx` rather than written fresh. |
| `drawer.tsx` | The single modal surface. `h-dvh`, `.safe-bottom` footer, `role="dialog"` + `aria-modal` that are now *true*. Replaced 6 hand-rolled overlays. |
| `button.tsx` | `variant × size`, `touch-target`/`h-11` built in, `useFormStatus`-aware `pending` state. Carries F2's fix and gives destructive actions a distinct `danger` variant. |
| `field.tsx` | Wires label/hint/error via `id`/`aria-describedby`/`aria-invalid`; passes `type`/`inputMode`/`autoComplete` through. Makes F5 a prop rather than a repo-wide audit. |

## Storefront improvements

- Checkout: pending-state submit; `type="tel" inputMode="numeric" autoComplete="tel"` on phone; `autoComplete` on name/email/district/address.
- Header: cart, wishlist, mobile nav and search drawers all migrated to `Drawer` — real focus traps, real scroll locks.
- Account dropdown: removed a false `aria-modal="true"`. It is a disclosure popover, not a modal; the trigger's `aria-expanded`/`aria-controls` is the correct contract. Bolting a focus trap onto a 3-link menu would have been the wrong fix.
- Login/track-order: `autoComplete`, `inputMode`, `enterKeyHint`, `autoCapitalize`.

## Admin improvements

- Products list: cards now serve to `lg`; the table starts at `lg` where its width fits (F8).
- Filter drawer: rebuilt on `Drawer` + `Field`; the pinned footer uses `form="…"` so Apply stays reachable while the form scrolls.
- Product editor: save bar made **sticky** with `.safe-bottom`, so Save survives scrolling a 569-line form; both submits now show pending state.
- Shell: duplicate `<h1>` demoted to `<p>` (F13).

## Accessibility improvements

Focus trapped in all six modals · focus restored to the opener on close · `aria-modal` now truthful · exactly one `<h1>` per admin page · `prefers-reduced-motion` honoured · 16px minimum on every form control · label/error wiring via `aria-describedby`/`aria-invalid` · icon-only controls carry `aria-label` and their icons `aria-hidden`.

## Tests added

`@playwright/test` 1.62 — Chromium 1234 installed (the cached 1228 build did not match). Two projects: `mobile-375` (375×667, touch, DPR 2) and `desktop-1280`.

| Spec | Covers |
|---|---|
| `foundations.spec.ts` | F1 meta + `.safe-bottom` computed padding, F4 no control under 16px, F5 keypad attributes, F6 no raw `vh`, F7 rule present **and** honoured under a real `reducedMotion: "reduce"` context |
| `overflow.spec.ts` | 15 public routes × 9 widths (320/360/375/390/412/768/1024/1280/1440) |
| `storefront.spec.ts` | Mobile nav traps focus + locks scroll + releases on Escape; add-to-cart → checkout; COD present and bKash the only other provider; submit guard |
| `admin.spec.ts` | 4 admin routes render; cards below `lg` / table above; no admin overflow at 375 & 768; filter drawer is a real modal; no admin control under 16px; exactly one `<h1>` |
| `auth.setup.ts` | Authenticates once and reuses the session |

## Commands executed and exact results

```
$ npx eslint
(no output)                                              exit 0

$ npx tsc --noEmit
(no output)                                              exit 0

$ DATABASE_URL=…@127.0.0.1:5432/ecommerce npm run test
 Test Files  10 passed (10)
      Tests  30 passed (30)
   Duration  8.89s
  (includes 12 DB-backed tests/persistence.test.ts cases)

$ npx playwright test
  17 skipped
  50 passed (4.9m)

$ npm run build
  ✓ Compiled successfully
  > postbuild
  Patched standalone server.js to use APP_URL as the redirect origin
```

Overflow matrix — all passing:
```
/ · /shop · /search · /cart · /checkout · /login · /register · /track-order
/about-us · /contact-us · /faq · /privacy · /terms · /cookie-policy
/product/cotton-stitched-fariya-tf-white
      × 320, 360, 375, 390, 412, 768, 1024, 1280, 1440 px
```

## Before / after evidence

| Check | Before | After |
|---|---|---|
| `<meta name="viewport">` | `width=device-width, initial-scale=1` | `…, viewport-fit=cover` |
| `.safe-bottom` computed padding | invalid (env resolved to 0, token unusable) | `12px` floor, grows with the inset |
| Form controls under 16px on `/checkout` | 7 (`customerName`, `customerPhone`, `district`, `customerEmail`, `shippingAddress`, `couponCode`, `notes`) | 0 |
| `body.overflow` with cart drawer open | `visible` — page scrolled behind | `hidden`, restored on close |
| Tab out of an open drawer | escaped into the page behind | cycles inside (15 presses, still contained) |
| `<h1>` count per admin page | 2 | 1 |
| Checkout phone input | `<input name="customerPhone" required>` | `type="tel" inputMode="numeric" autoComplete="tel"` |

## Remaining limitations

Stated plainly rather than omitted:

1. **F14 — login rate-limit UX is unfixed.** Exceeding the limiter throws an unhandled error surfaced as a runtime overlay instead of a friendly message. Real P1, but an auth-flow concern; flagged for its owner.
2. **F9 is partial.** ~30 admin buttons still carry inline class strings. The primitives exist and every risky path is migrated; the rest is mechanical.
3. **No visual-regression baseline.** Out of the agreed scope. Overflow and layout are guarded mechanically, not pixel-wise.
4. **Not verified on physical hardware.** All mobile results come from Chromium emulation at 375×667 with touch and DPR 2. Real iOS Safari behaviour for the F4 zoom fix is inferred from the 16px rule being provably applied, not observed on a device.
5. **`@layer` is now load-bearing in two directions.** The input rule is *deliberately unlayered* to beat Tailwind utilities, while the element resets are *deliberately layered* to lose to them. Both are commented in `globals.css`; anyone editing that file should read the comments first.
6. **Dormant Nagad schema retained** — enum value plus three settings columns, all disabled and unreferenced by `src/`.
7. **Dev-server caching** — see the caveat in the audit; a container restart is required before rendered output can be trusted.

## Changed files

**New:** `src/components/ui/{button,field,drawer}.tsx`, `src/components/ui/use-overlay.ts`, `e2e/{foundations,overflow,storefront,admin}.spec.ts`, `e2e/{auth.setup,paths}.ts`, `playwright.config.ts`, `RESPONSIVE_DESIGN_AUDIT.md`, this file.

**Modified:** `src/app/layout.tsx`, `src/app/globals.css`, `src/app/checkout/page.tsx`, `src/app/login/page.tsx`, `src/app/track-order/page.tsx`, `src/app/admin/products/page.tsx`, `src/app/global-error.tsx`, `src/app/payments/[provider]/{success,cancelled}/page.tsx`, `src/components/site-header.tsx`, `src/components/admin-shell.tsx`, `src/components/public-shell.tsx`, `src/components/admin/{product-editor-form,products-filter-drawer}.tsx`, `.env.example`, `.gitignore`, `package.json`.

18 modified, 353 insertions / 337 deletions, plus new files.
