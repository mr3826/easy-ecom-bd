# Remaining Work Verification

Repository: Easy e-Com
Branch: `codex/bangladesh-ecommerce`
Verified against: current working tree at `69e2d28` and the live `bornohin.com` origin on 2026-07-27.

The repo-level audit items that were already fixed remain fixed in the current build. The only live blocker I could not clear is the Passenger runtime still serving `404` for `/api/health/ready` even though the route exists in the local build and in the deployed manifest.

| ID | Candidate Finding | Verified Status | Evidence | Severity | In Scope | Recommended Action |
| -- | ----------------- | --------------- | -------- | -------- | -------- | ------------------ |
| R-01 | Payment success page linked to a dead `/track` route | Already fixed | `src/app/payments/[provider]/success/page.tsx` resolves the tracking href from `orderCode`, `invoice`, `orderId`, or `paymentId` and links through `buildOrderTrackingHref()` | P0 | Yes | No code change |
| R-02 | Delivery cancellation did not release reserved inventory | Already fixed | `src/server/store.ts` now includes the inventory-release path, and the cancellation flow is part of the current remediation batch history | P0 | Yes | No code change |
| R-03 | Analytics IDs were injected into inline scripts without strict validation | Already fixed | `src/components/site-analytics.tsx` is still the injection point, but the remediation review and current build indicate the IDs are now validated before rendering | P1 | Yes | No code change |
| R-04 | Product image replacement left orphaned files on disk | Already fixed | `src/server/storage.ts` and the image update path in `src/server/store.ts` were updated in the prior remediation batch to clean up removed uploads | P1 | Yes | No code change |
| R-05 | Dependency-aware readiness endpoint was missing or too shallow | Partially confirmed | `src/app/api/health/ready/route.ts` calls `buildReadinessReport()` from `src/server/readiness.ts`; `npm run build` includes `/api/health/ready`; live `curl` to `https://bornohin.com/api/health/ready` still returns `404` after redeploy and Passenger disable/enable attempts; `PassengerApps/list_applications` shows the app name/path as `bornohin` / `/home/bornohin/bornohin_app` | P1 | Yes | Treat as an operational blocker until Passenger serves the route that is already on disk |
| R-06 | Customer address management is missing | Confirmed missing | `prisma/schema.prisma` has `Order.shippingAddress`, but no `Address` model exists; `src/app/account/page.tsx` is read-only and only lists orders; source search found no address CRUD routes or actions | P1 | Yes | Defer to a customer-account batch |
| R-07 | Customer profile editing is missing | Confirmed missing | `src/app/account/page.tsx` only displays the current user and order history; no edit form or profile action exists in the route tree | P1 | Yes | Defer to a customer-account batch |
| R-08 | Password reset is missing | Confirmed missing | Source search across `src`, `prisma`, and `tests` found no reset-token model, reset route, or reset test | P1 | Yes | Defer to the auth-recovery batch |
| R-09 | Email verification is missing | Confirmed missing | Source search across `src`, `prisma`, and `tests` found no verification-token model, verification route, or verification test | P1 | Yes | Defer to the auth-recovery batch |
| R-10 | Rate limiting is missing on sensitive flows | Confirmed missing | Source search across `src`, `prisma`, and `tests` found no rate-limit middleware or route-level limiter on auth, checkout, or callback surfaces | P1 | Yes | Defer to the security-hardening batch |
| R-11 | CSRF hardening is missing on sensitive POST/server-action surfaces | Confirmed missing | Source search across `src` found no explicit CSRF guard; sensitive actions remain mostly protected only by session/role checks | P1 | Yes | Defer to the security-hardening batch |
| R-12 | Payment callback replay protection is missing | Partially confirmed | `src/app/api/payments/[provider]/callback/route.ts` verifies an HMAC signature, but `src/server/integrations.ts` only confirms by payment/transaction lookup and upserts the payment without an event-id or replay-key lock | P0 | Yes | Add provider event IDs or deterministic idempotency keys before confirming payment |
| R-13 | Static-page CMS management is missing | Confirmed missing | Static pages still exist as code routes (`src/app/about-us`, `src/app/contact-us`, `src/app/faq`, `src/app/privacy`, `src/app/terms`, `src/app/cookie-policy`); they are not admin-managed content | P2 | Yes | Defer to a CMS batch |
| R-14 | Server-persisted wishlist is missing | Confirmed missing | `src/lib/wishlist.ts` stores wishlist state in `localStorage`; `src/components/site-header.tsx` only mirrors browser events; no wishlist model exists in `prisma/schema.prisma` | P3 | Yes | Defer to a wishlist batch |
| R-15 | Production domain cutover is not fully green | Partially confirmed | Live `https://bornohin.com/` returns `200`, `https://www.bornohin.com/` redirects to the apex, and `https://bornohin.com/admin` redirects to login, but the readiness route remains `404` live | P1 | Yes | Keep the current apex/admin layout, but do not call production fully green until the readiness route is served correctly |

## Notes

- Out-of-scope systems remain out of scope: Messenger/chatbot, courier integration, subscriptions, and merchant billing.
- The verified live blocker is operational, not a code-level syntax failure. The route exists in the repo and in the build output, but the deployed Passenger runtime is still not serving it.
- The current codebase is therefore in a better state than the older audit text, but it is not fully production-clear.
