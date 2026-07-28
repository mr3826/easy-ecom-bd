# Responsive Implementation Report — Easy e-Com

**Date:** 2026-07-28 · **Branch:** `codex/mobile-first-responsive` · **Baseline:** `0ec5f65`

## Executive summary

The mobile-first sweep already live on `bornohin.com` did real work, but an audit against the responsive-craft failure patterns found that **three of its central mechanisms did not function at runtime** — safe-area padding, modal semantics, and (after the first fix attempt) the 16px input floor. None of these were visible in source review; all three needed a rendered browser to catch.

The root cause of the class of defect was structural: the sweep applied fixes as copy-pasted utility strings across ~40 call sites rather than building a shared primitive layer, so anything it missed was missed everywhere simultaneously. This pass fixed the non-functioning foundations, added a deliberately small primitive layer (three components), and put automated guards under each finding.

**Result: 3 P0 and 7 P1 findings fixed and verified; 57 unit tests and 62 Playwright assertions passing; zero horizontal overflow across 15 routes × 9 widths.** A follow-up batch then closed the last open P1 (`F14`, login error surfacing), made deployment prove which build is actually live, and validated the COD path with a real order. No finding is left open.

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
 Test Files  14 passed (14)
      Tests  57 passed (57)
   Duration  27.04s
  (includes 12 DB-backed tests/persistence.test.ts cases)

$ npx playwright test
  27 skipped
  62 passed (5.4m)

$ E2E_VISUAL=1 npx playwright test e2e/visual.spec.ts --project=desktop-1280 --no-deps
  4 passed (1.5m)          # 20 baselines, re-run clean against themselves

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

## Deployment

Deployed to `https://bornohin.com`. The first release of this work went out as `fa6089c`; the follow-up batch as `6124598`.

**The `fa6089c` deploy failed its own liveness check** — the correct outcome. Files uploaded and extracted, but the site kept serving the previous build. The verification step caught it instead of reporting a false success. Root cause: two `next-server` processes orphaned to PPID 1 (~7.5h uptime), invisible to Passenger, so `restart.txt`, the cPanel Restart button and `cloudlinux-selector restart` all reported success without recycling anything. Cleared by killing the orphans by hand.

That manual step is what the follow-up batch removed. The `6124598` deploy ran start to finish without intervention:

```
==> Recording what production is serving right now
    Live: commit 4ca6583… pid 62320 up since 19:07:11
==> Stopping the old build and waiting for the new one
    pid 62320 still on commit 4ca6583… (status stale)
    asked pid 62320 to exit (attempt 1, http 404)
    That build has no restart endpoint; going straight to the reaper.
    Orphan reaper removed and its absence confirmed
    New build answering after reap: pid 226271
==> Confirming every process serves the new build
    All 1 sampled response(s) on commit 6124598…, pid(s) 226271
==> Verifying the new static assets are reachable
    New build is serving (3ty-gl3kx_p_1.css)
```

Along the way `/api/version` reported exactly the condition it exists to catch, on a run that would previously have looked fine:

```json
{"status":"stale","commit":"4ca6583…","extractedCommit":"1242b30…","pid":62320}
```

A process running one commit, with a newer release already extracted beside it, answering `409`.

Two host-specific traps worth recording, both of which cost time previously:

- `Cron` is missing from UAPI on this host; the legacy API2 endpoint works. `Fileman` also lacks `trash_files`/`unlink_files` — use API2 `fileop&op=unlink`.
- **An unescaped `%` in a crontab command terminates the line**, silently turning the remainder into stdin. Every probe command here is `%`-free for that reason.

Cleanup completed: cron entry removed (crontab back to its original single `MAILTO=` line), both probe logs deleted from `/home/bornohin/`.

### Production verification (post-deploy, against `https://bornohin.com`)

```
$ E2E_BASE_URL=https://bornohin.com npx playwright test \
    e2e/foundations.spec.ts e2e/overflow.spec.ts --project=desktop-1280 --no-deps
  22 passed (1.4m)

$ E2E_BASE_URL=https://bornohin.com npx playwright test \
    e2e/admin.spec.ts e2e/storefront.spec.ts --project=mobile-375
  12 passed (18.7s)

$ E2E_BASE_URL=https://bornohin.com npx playwright test \
    e2e/admin.spec.ts --project=desktop-1280
  6 passed, 1 skipped (10.5s)
```

Smoke: `/`, `/shop`, `/cart`, `/checkout`, `/login`, `/track-order`, `/api/health`, `/api/health/ready` → all 200.

Live CSS chunk confirmed to contain the 16px input rule, the reduced-motion block and the z-index scale, and to no longer contain the dead `.scroll-pad-bottom`. Live `<meta name="viewport">` includes `viewport-fit=cover`. Live checkout phone input carries `type="tel" inputMode="numeric" autoComplete="tel"`.

**Admin was verified through a real browser, not curl.** A curl form POST returns 200 without authenticating, because the login form is a React server action and curl bypasses the RSC action path entirely — it would have reported success either way. Playwright drives the real path; all four admin routes render, each with exactly one `<h1>`.

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

## Follow-up batch

Requested after the responsive work landed. All five items plus both cleanup items were taken on.

### 1. F14 — login error handling

The finding was narrower than the symptom. `loginAction` threw on **every** failure, so a mistyped password was as fatal as a tripped limiter: a server action that throws reaches the client as an unhandled runtime error. It now returns state through `useActionState`.

| Path | Behaviour |
|---|---|
| Wrong password / unknown address | Identical message, so the form cannot enumerate registered addresses |
| Rate limited | "Too many login attempts. Please try again later." |
| Unexpected failure | One generic line; the cause goes to the server log only |
| Dropped connection | Caught by the new `app/error.tsx` with a working retry |
| Success | Redirects by role — `redirect()` is called **outside** the try, because it signals by throwing and catching it would turn every login into a failure |

The address survives a rejected attempt (React resets uncontrolled fields once an action settles, so the field is controlled); the password never does. Submit re-enables on its own via `useFormStatus`.

Two further defects surfaced while testing this: no route-level error boundary at all (F15), and `global-error.tsx` rendering without the `<html>`/`<body>` Next requires of it (F16).

**One rate-limit claim from the previous report was wrong.** It recorded the limiter as an app defect. It is not: driven correctly it blocks exactly on attempt 11, verified by instrumenting the running server. The earlier e2e loop asserted on a *stale* error banner and so raced ahead of the responses, never actually sending 11 requests. `attemptAndSettle()` now waits for each action's own response.

### 2–3. Deployment determinism

The operational risk was that a successful-looking deploy keeps serving the old build. Two new endpoints and a rewritten verification phase:

| Piece | What it does |
|---|---|
| `GET /api/version` | Reports the commit **inlined into the running bundle** at build time, next to the commit in the `RELEASE.json` on disk. A process older than the files answers `409 {"status":"stale"}` — it cannot claim the release that was extracted underneath it. Also returns `pid` and a real `startedAt` derived from `process.uptime()`. |
| `POST /api/deploy/restart` | Asks the process answering the request to exit. This is the only restart path that reaches a process orphaned to PPID 1, which `restart.txt`, the cPanel button and `cloudlinux-selector` all silently fail to recycle. Requires `DEPLOY_RESTART_TOKEN`; returns 404 when unset, so it is off by default. |

The deploy script now records the pre-deploy commit and pid, extracts, then **polls `/api/version` and asks any stale process to exit** — up to six times — rather than trusting a restart command's exit code. It then samples the endpoint ten times to catch two processes serving different builds, fails if any pre-deploy pid still answers, corroborates with the static-asset probe, and appends every observation to `deploy-log.jsonl` with old/new commits, pids, timestamps and results. A failure states plainly that nothing was rolled back and the old build is still healthy.

**The orphan reaper.** `/api/deploy/restart` only reaches a process that still answers HTTP, which leaves two gaps: a build predating the endpoint, and one wedged enough to serve requests but ignore the shutdown. Both are covered by installing a once-a-minute cron that kills the old process, polling until the new commit answers, then removing itself and **proving its own absence**. Removal re-reads the linekey rather than trusting the one from installation — the key changes whenever the crontab is rewritten.

**It selects by process age, not by parent.** The first version filtered on `PPID==1` on the theory that orphaning was the problem. It is not the whole problem: this host ignores `tmp/restart.txt` for healthy Passenger-parented processes too, so the filter skipped the ordinary case entirely and the deploy failed with the old build still serving. Anything older than two minutes predates the deploy; a freshly spawned process is far younger, and the reaper is removed within seconds of one answering.

**This was earned the hard way.** Two runs crashed *inside the reaper's own cleanup* and left a kill-every-minute cron on production until it was removed by hand. Both were the same family of PowerShell fault under `Set-StrictMode`: cron environment lines such as `MAILTO=` come back with no `command` property at all, and a one-element array unwraps to a scalar on return so `.Count` is fatal. `-SelfTestReaper` now exercises the entire install → detect → remove → confirm-absence path with a command that touches nothing, so the most dangerous code here can be verified without pointing it at a live application.

### 4. One controlled COD order

`e2e/cod-order.spec.ts` drives a real order through the UI end to end, then cancels it. Verified in one run: stock 24 → 23 on creation → 24 after cancellation; subtotal ৳1550 + delivery ৳80 = total ৳1630 consistent across checkout, tracking and admin; `pending → confirmed → cancelled` transitions accepted; the order visible in `/admin/orders` and on `/track-order`. Confirmed against the database afterwards, not just the UI.

It refuses to run anywhere but localhost unless `E2E_ALLOW_REMOTE_ORDER=1`, and marks its customer `SMOKE TEST — do not fulfil`. All three smoke orders created during development are cancelled and stock is back to its seeded value.

### 5. bKash — what could and could not be verified

**No live or sandbox bKash call was made, and no sandbox credentials exist in this environment.** Nothing here validates bKash's own API.

What *was* validated is our half of the contract, via `tests/bkash-callback-route.test.ts` — 11 cases against the real callback handler with real HMAC signing: signed paid/failed/cancelled/refunded routing, unsigned and wrongly-signed rejection, **tampered-body rejection** (valid signature, altered amount), non-bKash provider refusal, unknown status, missing reference, unconfigured secret, unknown payment, and duplicate-callback idempotency.

**Material finding: bKash is not live in production.** `https://bornohin.com/checkout` renders its radio as `disabled`, so COD is currently the only usable method. The gate is `settings.bkashEnabled && getBkashIntegrationConfig().enabled` — check both the admin setting and the `BKASH_*` environment before assuming online payment works. The server-side guard is correct: an order is never created when bKash is unconfigured.

### Cleanup items

Destructive and save controls migrated to the shared `Button`: brand/category **Delete** now use the `danger` variant instead of looking identical to the Edit link beside them, and all three order status controls got pending guards. `e2e/visual.spec.ts` adds a 20-shot baseline (4 routes × 320/375/768/1024/1440), verified reproducible on a clean re-run. It is opt-in via `E2E_VISUAL=1` because baselines are per-platform and these are Windows/Chromium.

## Remaining limitations

Stated plainly rather than omitted:

1. **`checkoutAction` still throws.** Empty cart, rate limit and unconfigured-bKash all take the path `loginAction` just left. `app/error.tsx` now catches them with a retry rather than a dead document, but the money path deserves the same returned-state treatment login got.
2. **F9 is partial.** The destructive and order-status controls are migrated; roughly 25 admin buttons still carry inline class strings.
3. **The visual baseline is opt-in and Windows-only.** It will not protect anyone who does not run it, and needs regenerating on another platform.
4. **Not verified on physical hardware.** All mobile results come from Chromium emulation at 375×667 with touch and DPR 2. Real iOS Safari behaviour for the F4 zoom fix is inferred from the 16px rule being provably applied, not observed on a device.
5. **bKash is unverified end to end** — see above. It is also switched off in production.
6. **`/api/deploy/restart` is a self-shutdown endpoint.** It is off unless `DEPLOY_RESTART_TOKEN` is set, compares digests in constant time, and returns 404 when unconfigured — but it is still a documented way to drop a process. Use a long random token and rotate it with the rest. **The token must stay stable across deploys:** the running process holds the value it was spawned with, so changing it means the next deploy gets a 401 and falls back to the reaper.
7. **The reaper is a blunt instrument.** It kills any `next-server` older than two minutes, so it must not run while an unrelated long-lived Next process shares the account. It only ever runs when the app cannot restart itself, and always removes itself afterwards.
8. **`@layer` is load-bearing in two directions.** The input rule is *deliberately unlayered* to beat Tailwind utilities, while the element resets are *deliberately layered* to lose to them. Both are commented in `globals.css`; read them before editing that file.
9. **Dormant Nagad schema retained** — enum value plus three settings columns, all disabled and unreferenced by `src/`.
10. **Dev-server caching** — a container restart is required before rendered output can be trusted. New route files in particular are invisible until then.

## Changed files

**New:** `src/components/ui/{button,field,drawer}.tsx`, `src/components/ui/use-overlay.ts`, `e2e/{foundations,overflow,storefront,admin}.spec.ts`, `e2e/{auth.setup,paths}.ts`, `playwright.config.ts`, `RESPONSIVE_DESIGN_AUDIT.md`, this file.

**New in the follow-up batch:** `src/components/login-form.tsx`, `src/app/error.tsx`, `src/app/api/version/route.ts`, `src/app/api/deploy/restart/route.ts`, `e2e/{login,cod-order,visual}.spec.ts` (+ 20 baseline PNGs), `tests/{login-action,version-route,deploy-restart-route,bkash-callback-route}.test.ts`.

**Modified:** `src/app/layout.tsx`, `src/app/globals.css`, `src/app/checkout/page.tsx`, `src/app/login/page.tsx`, `src/app/track-order/page.tsx`, `src/app/admin/products/page.tsx`, `src/app/global-error.tsx`, `src/app/payments/[provider]/{success,cancelled}/page.tsx`, `src/components/site-header.tsx`, `src/components/admin-shell.tsx`, `src/components/public-shell.tsx`, `src/components/admin/{product-editor-form,products-filter-drawer}.tsx`, `.env.example`, `.gitignore`, `package.json`.

18 modified, 353 insertions / 337 deletions, plus new files.
