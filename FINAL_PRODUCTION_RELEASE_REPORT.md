# Final Production Release Report

## Executive summary

- Release status: `NO-GO`
- Deployed commit: not captured as a release commit in this session
- Production URL: `https://bornohin.com`
- Deployment date: 2026-07-27
- Migration result: not rerun in this session
- Seed result: not rerun in this session
- Rollback point: previous live cPanel deployment already known to be reachable through the same app root

## What changed in this batch

- Removed Nagad and Rocket from the public checkout payment choices.
- Removed Nagad and Rocket from the admin settings surface.
- Removed Nagad and Rocket from the admin payments dashboard surface.
- Restricted checkout and manual-order submission to COD and bKash only.
- Updated shared storefront copy and README payment wording to COD plus bKash.
- Added a regression test that locks the payment-provider list to COD and bKash.
- Added `FINAL_RELEASE_AGENT_PLAN.md`.

## Validation record

Passed locally:

```bash
npm run lint
npm test -- tests/contact-footer.test.tsx tests/payment-providers.test.ts tests/order-tracking.test.ts tests/site-analytics.test.ts tests/payment-replay.test.ts
npm run build
```

Full test suite:

```bash
npm test
```

Result:

- 8 test files passed
- 1 test file failed
- Failure: `tests/persistence.test.ts`
- Cause: `DATABASE_URL is not set` in the local shell

Docker status:

- `docker compose up -d postgres redis` was not available because the Docker Desktop Linux engine was not running in this session.

## Deployment record

- cPanel preflight completed successfully against `bd10.exonhost.com`
- The production app root is `bornohin_app`
- The deploy script completed successfully:

```powershell
.\scripts\deploy-cpanel.ps1 -AppRoot bornohin_app -ConfirmAppRoot bornohin_app
```

## Production smoke results

Verified:

- `https://bornohin.com/` returns `200`
- `https://bornohin.com/api/health` returns `200`
- `https://bornohin.com/api/health/ready` returns `200`
- `https://bornohin.com/admin` redirects to `/login?next=/admin`
- Cloudflare zone for `bornohin.com` exists and points the apex A record at `103.159.36.211`

Blocked / inconsistent:

- `https://bornohin.com/checkout` still rendered the older provider surface during smoke checks
- Cache-busted checkout probing returned `503`
- That means the live checkout surface did not prove the newly deployed payment cleanup end to end

## Remaining blocker

The release is blocked by live production inconsistency on the checkout route. The codebase and local build are clean, but the public checkout smoke does not yet match the current source tree.

Impact:

- I cannot certify the release as production-ready.
- The payment-surface cleanup is not yet proven live.

Smallest next action:

- Reconcile the live checkout origin with the newly deployed cPanel bundle, then rerun the checkout smoke against `https://bornohin.com/checkout` and a cache-busted checkout URL.

## Rollback instructions

1. Redeploy the previous known-good cPanel bundle.
2. Keep the current DNS record unless a separate origin cutover is confirmed.
3. Re-run `https://bornohin.com/api/health`, `https://bornohin.com/api/health/ready`, and `https://bornohin.com/checkout`.

## Files intentionally left unchanged

- `prisma/schema.prisma`
- `src/lib/domain.ts` payment-provider enum still includes historical values for database compatibility
- `src/server/seed.ts` historical payment-setting fields remain for compatibility
- `docs/remaining-integration-execution-plan.md`
- `docs/REMAINING_WORK_EXECUTION_PLAN.md`
