# Responsive Design Audit — Easy e-Com

**Date:** 2026-07-28
**Branch:** `codex/mobile-first-responsive`
**Baseline:** `0ec5f65` (the mobile-first sweep already live on `bornohin.com`)
**Method:** static audit of `src/` against the responsive-craft failure patterns, then verification against genuinely rendered routes on a local Docker stack (Next dev server + seeded Postgres, 51 products / 3 users / 1 order).

## Scope

Agreed with the requester before work began:

- **In scope:** fix P0/P1 findings at the shared-component level; Playwright smoke tests at 375×667 and 1280×800; this document plus `RESPONSIVE_IMPLEMENTATION_REPORT.md`; deploy after verification.
- **Out of scope:** the full ~30-flow E2E suite, 5-viewport visual-regression diffing, `RESPONSIVE_COMPONENT_INVENTORY.md`, `RESPONSIVE_TEST_MATRIX.md`.

## What the previous sweep got right

Stated so this reads as an audit and not a rewrite pitch. Commits `fe63496` / `c44c64a` genuinely delivered: no hardcoded `slate/neutral/gray/zinc/stone` classes anywhere in `src/`; `.touch-target` applied at 61 call sites; a working mobile card variant for the admin products list; `h-dvh` used correctly in the header drawers; and element resets correctly scoped to `@layer base`.

Two claims in the brief were already satisfied and needed no work:

- **bKash is the only online payment provider.** `nagad` survives as a dormant Prisma enum value and three `nagadEnabled/AccountNumber/Instructions` settings columns defaulting to disabled, but appears **nowhere in `src/`** — no storefront or admin surface offers it. Verified by test, not just by grep (`storefront.spec.ts` asserts the rendered payment radios are exactly `cod` + `bkash`).
- **Dense tables are nearly absent.** Only `admin/products` renders a `<table>`; every other admin list is already card-based.

## Findings

Severity uses the brief's scale. **Evidence** is what proves the finding; **Test** is the automated guard that now prevents regression.

| ID | Route / Component | User | Viewport | Finding | Sev | Evidence | Change made | Status | Test |
|---|---|---|---|---|---|---|---|---|---|
| F1 | `app/layout.tsx`, `globals.css` | Both | Notched mobile | **Safe-area handling was dead code.** No `viewport` export, so Next emitted the default meta without `viewport-fit=cover`. Per spec `env(safe-area-inset-*)` then returns `0`, making `--safe-bottom`, `.safe-bottom` and `.scroll-pad-bottom` silent no-ops — the previous sweep's safe-area work could never have run. | **P0** | No `viewport-fit` match in `src/`; served meta was `width=device-width, initial-scale=1` | Added `export const viewport` with `viewportFit: "cover"` | ✅ Fixed | `foundations.spec.ts` ×2 |
| F2 | `app/checkout` | Customer | All | **"Place order" had no pending guard** — a double-tap on a slow connection submits twice and creates duplicate orders. The correct `useFormStatus` pattern already existed in `settings-submit-button.tsx`, unused here. | **P0** | `checkout/page.tsx:158` was a bare `<button>` | Replaced with `<Button pendingWhileSubmitting>`, which disables and relabels for the action's duration | ✅ Fixed | `storefront.spec.ts` |
| F3 | `site-header.tsx` ×5, `products-filter-drawer.tsx` | Both | Mobile | **Five overlays declared `role="dialog" aria-modal="true"` with no focus trap and no body scroll lock.** `aria-modal` without trapping actively lies to assistive tech, and the page scrolled behind every open drawer. | **P0** | `site-header.tsx:219,284,440,523,627`; only the admin filter drawer locked scroll | New `ui/drawer.tsx` + `useOverlay` (trap, ref-counted scroll lock, Escape, focus restore). All six overlays migrated. | ✅ Fixed | `storefront.spec.ts`, `admin.spec.ts` |
| F4 | Repo-wide (135 inputs) | Both | iOS | **iOS Safari auto-zoomed on every form field** and never zoomed back out — controls rendered at `text-sm` (14px). | **P1** | 302 `text-sm` sites; `site-header.tsx:133` | One CSS rule for all 135 inputs. **First attempt failed:** placed in `@layer base`, which loses to Tailwind's `text-sm` in `@layer utilities`. Corrected to a deliberately unlayered rule scoped to `font-size` on form controls only. | ✅ Fixed | `foundations.spec.ts`, `admin.spec.ts` |
| F5 | checkout, login, track-order | Customer | Mobile | **Wrong mobile keyboards everywhere.** 135 inputs but only 4 `autoComplete`, 2 `inputMode`, and the checkout phone field had no `type="tel"` — it opened QWERTY, not a numpad, on the most-typed field in the funnel. | **P1** | Repo-wide grep | `type="tel" inputMode="numeric" autoComplete="tel"` on phone; `autoComplete` on name/email/address/password; `autoCapitalize`/`enterKeyHint` on code fields | ✅ Fixed | `foundations.spec.ts` |
| F6 | 5 files, 7 sites | Both | Mobile | **`min-h-screen` (`100vh`) overflowed behind mobile browser chrome.** The same codebase already used `h-dvh` correctly in drawers, so this was inconsistency rather than oversight. | **P1** | `admin-shell`, `public-shell`, both `payments/*`, `global-error` | → `min-h-svh` | ✅ Fixed | `foundations.spec.ts` |
| F7 | Repo-wide | Both | All | **No `prefers-reduced-motion` support**, despite `hover:-translate-y-0.5`, transitions and a hero slider throughout — plus an unconditional `scroll-behavior: smooth`. | **P1** | 0 matches repo-wide | Reduced-motion block in `@layer base`; `scroll-behavior` moved inside it | ✅ Fixed | `foundations.spec.ts` ×2 (incl. a real `reducedMotion: "reduce"` context) |
| F8 | `admin/products` | Admin | 768–1023px | **Table forced `min-w-[900px]` inside `overflow-x-auto` from `md` up**, giving every tablet a two-axis scroll. | **P1** | `products/page.tsx:210` | Cards now serve up to `lg`; table starts at `lg` where its width fits; `min-w` reduced to `820px` | ✅ Fixed | `admin.spec.ts` |
| F13 | `admin-shell.tsx` | Admin | All | **Every admin page shipped two `<h1>`s.** The shell rendered the store name as `<h1>` in both the mobile topbar and the desktop sidebar, so screen readers announced branding as the top-level heading before the actual page title. *Found by a Playwright assertion, not by the static audit.* | **P1** | `admin-shell.tsx:57,96` + an `<h1>` on all 10 admin pages | Demoted both to `<p>`; the page title is now the only `<h1>` | ✅ Fixed | `admin.spec.ts` (asserts exactly 1 `h1`) |
| F9 | Repo-wide | Both | All | **No `src/components/ui/` layer.** The same ~14-class button string was duplicated ~40×, and admin input styling was a descendant-selector hack in `globals.css`. This is the root cause of F2–F7 being repo-wide instead of one-line. | **P2** | `globals.css:113-136`; 61 `touch-target` sites | Added `ui/button.tsx`, `ui/field.tsx`, `ui/drawer.tsx`, `ui/use-overlay.ts` — three primitives, not a design system | ◐ Partial — primitives exist and the highest-traffic call sites use them; the long tail of admin buttons still carries inline strings | — |
| F10 | `site-header`, filter drawer | Both | All | **Ad-hoc z-index** (`z-40`, `z-50`, `z-[60]`, `z-[1]`, `z-0`) with no scale — bare `z-[60]` being the escalation smell. | **P2** | Both components | `--z-raised/header/scrim/drawer` tokens in `@layer base`; drawers consume them | ✅ Fixed | — |
| F11 | `globals.css` | — | — | `.scroll-pad-bottom` had **zero consumers** — dead CSS shipped by the previous sweep. | **P2** | 0 matches in `.tsx` | Deleted | ✅ Fixed | — |
| F12 | `.env.example` | — | — | Stale `NAGAD_*` keys implied a second payment provider that does not exist in `src/`. | **P2** | `.env.example` | Removed 4 keys | ✅ Fixed | `payment-providers.test.ts` (pre-existing) |
| F14 | `app/login` | Customer | All | **Every login failure threw out of the server action**, including an ordinary wrong password — a thrown server action reaches the client as an unhandled runtime error, so the page died rather than showing a message. The rate limit was simply the most visible case. | **P1** | Reproduced while running the admin suite; `actions.ts` threw on both the limiter and the credential check | `loginAction` now returns `{ error, email }` through `useActionState` instead of throwing; distinct copy for rate limiting, identical copy for unknown-address vs wrong-password, generic copy for anything unexpected. `redirect()` is called outside the try so its control-flow throw is not caught. | ✅ Fixed | `login-action.test.ts` ×6, `login.spec.ts` ×6 |
| F15 | `app/` | Both | All | **No route-level error boundary.** Any client-side failure — including a server action whose request never completes — escalated straight to `global-error`, which replaces the whole document and offered no way back. | **P1** | Reproduced by aborting the action POST; the page rendered global-error | Added `app/error.tsx` with a working `reset()` retry | ✅ Fixed | `login.spec.ts` |
| F16 | `app/global-error.tsx` | Both | All | **`global-error` rendered no `<html>`/`<body>`.** Next requires them because this boundary replaces the root layout; without them the last-resort fallback is malformed markup. | **P2** | `global-error.tsx` | Added the required elements | ✅ Fixed | — |
| F17 | `app/checkout` | Customer | All | A disabled payment option still carried `cursor-pointer`, so an unavailable method invited a tap that could not work. | **P3** | `checkout/page.tsx:144` | `cursor-not-allowed` + reduced opacity when disabled | ✅ Fixed | — |

**Counts:** P0 3 · P1 7 (all fixed) · P2 5 · P3 1. No open findings.

## Deliberately not changed

- **`checkoutAction` still throws.** Its failure modes — empty cart, rate limit, bKash unconfigured — take the same throwing path `loginAction` used to. `app/error.tsx` (F15) now catches them with a retry instead of a dead document, but converting checkout to a returned-state action is a larger change on the money path and was not in this batch.
- **Dormant Nagad schema** — the enum value and three settings columns remain. Removing them is a destructive migration with no responsive benefit; the product surface already offers only COD + bKash, and a test now enforces that.
- **Storefront variant purchasing** — the admin variant editor exists but checkout does not consume variants. No UI was added implying variant purchasing works.
- **Long tail of F9** — roughly 30 admin buttons still carry inline class strings. The primitives exist and the risky paths (checkout, drawers, product editor) are migrated; converting the rest is mechanical follow-up with no behavioural change.

## Verification

All commands run against the local stack; see `RESPONSIVE_IMPLEMENTATION_REPORT.md` for exact output.

| Check | Result |
|---|---|
| `npx eslint` | exit 0, clean |
| `npx tsc --noEmit` | exit 0, clean |
| `npm run test` (vitest) | **57/57 passed**, incl. 12 DB-backed persistence tests |
| `npx playwright test` | **62 passed, 0 failed** (27 skipped by design) |
| `npm run build` | succeeded; postbuild standalone patch applied |
| Horizontal overflow | **15 public routes × 9 widths (320→1440) — zero overflow** |

### Re-verified against production after deploy

Deployed as `fa6089c` (BUILD_ID `OltvbT2HjQcApouQfFBrT`) and re-run against `https://bornohin.com`:

| Suite | Result |
|---|---|
| foundations + overflow (desktop) | **22 passed** |
| admin + storefront (mobile-375) | **12 passed** |
| admin (desktop-1280) | **6 passed**, 1 skipped |

The deploy's own liveness check initially **failed** — files landed but two `next-server` processes orphaned to PPID 1 kept serving the previous build, so no restart mechanism could recycle them. Killing only the orphans let Passenger respawn on the new build. Details in `RESPONSIVE_IMPLEMENTATION_REPORT.md`.

### One caveat on how verification was done

This project's Next dev server keeps a persistent filesystem cache on a bind mount. **Three separate source changes (the `viewport` export, the checkout input attributes, and the `@layer` correction) did not appear in served HTML until the container was restarted** — the files were correct on both host and container the whole time. Any future verification here must restart `easy-ecom-app-1` before trusting rendered output, or it will confirm stale markup.
