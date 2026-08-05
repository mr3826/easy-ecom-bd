# Final Release Agent Plan

Current branch baseline: `codex/bangladesh-ecommerce`
Target integration branch: `codex/final-ecommerce-release`

This plan keeps the remaining release work split by domain so shared files are edited in one place and the storefront/admin/runtime changes do not fight each other.

| Agent | Branch | Scope | Owned files or modules | Shared dependencies | Required tests | Status |
| --- | --- | --- | --- | --- | --- | --- |
| A | `codex/variants-catalog` | Make product variants purchasable end-to-end | `src/app/product/[slug]`, `src/components/admin/product-variant-editor.tsx`, variant helpers, order item snapshot logic | Product schema, cart/checkout, order creation | Variant unit tests, checkout regression, build | Pending |
| B | `codex/customer-account-flows` | Add saved addresses, password reset, and email verification | Auth routes, account routes, email helpers, token storage, related schema | Auth/session layer, mail integration | Auth flow tests, token lifecycle tests, build | Pending |
| C | `codex/bkash-payment` | Keep the app on bKash as the only online gateway and finish payment handling | Payment config, callback route, payment flow helpers, payment tests | Order state, inventory, payment logs | Payment tests, replay tests, build | In progress |
| D | `codex/commerce-core` | Strengthen checkout, inventory, coupon, and order state rules | `src/server/store.ts`, checkout action, coupon helpers, order transitions | Variant data, payment state, settings | Persistence tests, concurrency checks, build | Pending |
| E | `codex/admin-operations` | Improve operational dashboards and settings ergonomics | Admin pages, filters, reports, settings layout | Shared admin actions and store queries | Admin UI tests, lint, build | Pending |
| F | `codex/storefront-ux` | Keep storefront aligned with admin content and settings | Public pages, shell components, content copy, cache invalidation | Landing pages, settings, catalog queries | Frontend regression tests, build | In progress |
| G | `codex/security-integrity` | Keep auth, ownership, and stored content safe | Auth guards, API checks, input validation, analytics safety | Shared actions and server helpers | Security tests, lint, build | Pending |
| H | `codex/release-infrastructure` | Make tests, deployment, and readiness operationally sound | Docker, cPanel deploy scripts, readiness routes, smoke tooling | Build output, database config, deployment scripts | Lint, build, integration tests, smoke tests | In progress |

## High-conflict ownership

| File or module | Owner |
| --- | --- |
| `prisma/schema.prisma` | Agent A or B only, depending on the data model change |
| `src/server/store.ts` | Agent D |
| `src/app/actions.ts` | Agent D and C only through agreed interfaces |
| `src/app/admin/actions.ts` | Agent E |
| `src/app/admin/settings/page.tsx` | Agent E |
| `src/app/checkout/page.tsx` | Agent F |
| `src/server/integration-config.ts` | Agent C |
| `scripts/deploy-cpanel.ps1` | Agent H |

## Shared dependency order

1. Shared schema and payment-order interfaces
2. Security and auth guards
3. Commerce core order and inventory rules
4. bKash payment flow
5. Customer account recovery flows
6. Storefront alignment
7. Admin ergonomics and reports
8. Deployment and readiness validation

## Release gate

The release stays blocked until the integrated branch passes lint, tests, build, and live deployment smoke checks on the production domain.
