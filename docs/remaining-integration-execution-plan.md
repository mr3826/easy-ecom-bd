# Bornohin Production Cutover Plan

Updated: 2026-07-26

## Target Topology

- `https://bornohin.com/` is the canonical customer shop.
- `https://www.bornohin.com/` redirects to `https://bornohin.com/`.
- `https://bornohin.com/admin` is the admin dashboard in the same Next.js app.
- `https://api.bornohin.com/api/*` serves public backend routes from the same Passenger app.
- `bornohinbd.com`, `shop.bornohinbd.com`, and `admin.bornohinbd.com` do not host separate applications.

The application still requires PostgreSQL. A cPanel MySQL/MariaDB database is not a compatible substitute for the Prisma datasource.

## Current Verified State

- The repository already combines the shop, admin dashboard, authentication, server actions, and public API route handlers in one Next.js application.
- Admin and storefront operations share the Prisma-backed data layer in `src/server/store.ts`.
- Product, category, brand, inventory, order, coupon, settings, landing page, carousel, and upload changes flow from admin to the storefront.
- The old delivery gateway integration has been removed. Delivery zones, fees, and order delivery statuses remain first-party order data.
- The payment simulator has been removed. bKash must be fully configured before its checkout option is used.
- `bornohin.com` currently delegates DNS to Cloudflare and serves the Zatiq Easy storefront.
- The old `bornohinbd.com` host resolves to the ExonHost cPanel server and still contains separate legacy applications.

## Gate 1: Access and Backup

1. Rotate any account password exposed in chat or another shared channel.
2. Create a short-lived cPanel API token with the cPanel account.
3. Store the token only in the local `CPANEL_API_TOKEN` environment variable.
4. Obtain Cloudflare access or a scoped token with DNS edit access for `bornohin.com`.
5. Run the read-only inventory:

   ```powershell
   $env:CPANEL_API_TOKEN = "<short-lived token>"
   .\scripts\cpanel-preflight.ps1
   ```

6. Review `cpanel-preflight.json` for domains, document roots, Passenger apps, FTP accounts, and databases.
7. Request a full cPanel backup before deletion:

   ```powershell
   .\scripts\cpanel-preflight.ps1 -StartFullBackup
   ```

Do not delete `mail`, DNS zone data, SSL keys, account configuration, or an unidentified database.

## Gate 2: Production Services

Configure these values in the Passenger application environment:

```dotenv
NODE_ENV=production
DATABASE_URL=postgresql://...
AUTH_SECRET=...
NEXT_PUBLIC_APP_URL=https://bornohin.com
APP_URL=https://bornohin.com
API_URL=https://api.bornohin.com
UPLOAD_DIR=/home/bornohin/bornohin_uploads
BKASH_USERNAME=...
BKASH_PASSWORD=...
BKASH_APP_KEY=...
BKASH_APP_SECRET=...
BKASH_BASE_URL=...
BKASH_WEBHOOK_SECRET=...
```

Production cannot proceed until:

- PostgreSQL is reachable from the cPanel host.
- Prisma migrations have completed against that database.
- The admin user and settings row exist.
- `AUTH_SECRET` is a new production secret.
- The persistent upload directory exists and is writable.
- bKash is disabled in admin unless all live credentials and callback verification are ready.

## Gate 3: Clean cPanel Application Layout

After the backup is complete and the preflight paths are reviewed:

1. Put the old root, shop, and admin applications into maintenance mode.
2. Unregister only the confirmed legacy Passenger/Node and Laravel applications.
3. Delete only their confirmed application roots and obsolete deployment FTP user.
4. Delete a legacy database only after mapping it to one of those applications and confirming the backup.
5. Keep the old domains registered long enough to return controlled redirects.
6. Create one Node.js/Passenger app:
   - application root: `/home/bornohin/bornohin_app`
   - startup file: `server.js`
   - Node.js: 20.9 or newer
   - application URL: `bornohin.com`
7. Add `www.bornohin.com` and `api.bornohin.com` as aliases/subdomains routed to the same application.
8. Configure the canonical redirect from `www` to the apex domain.

Changing the cPanel account's primary domain may require ExonHost support. The public site can still use `bornohin.com` as an addon domain/application URL without changing the account username or home path.

## Gate 4: Deploy Before DNS Cutover

Build, validate, and upload only after confirming the app root:

```powershell
$env:CPANEL_API_TOKEN = "<short-lived token>"
.\scripts\deploy-cpanel.ps1 -AppRoot bornohin_app -ConfirmAppRoot bornohin_app
```

The script:

- uses verified HTTPS and a cPanel API token;
- creates a standalone Next.js release;
- uploads and extracts it into the confirmed app root;
- removes the remote release archive;
- triggers a Passenger restart;
- never deletes domains or databases.

Test the cPanel origin before changing DNS using a local hosts override or an ExonHost preview URL. Verify `/`, `/admin`, `/api/health`, login, product CRUD, upload rendering, cart, and COD checkout.

## Gate 5: Cloudflare Cutover

Because `bornohin.com` currently uses Cloudflare nameservers, update DNS in Cloudflare rather than Namecheap:

1. Preserve all existing MX, SPF, DKIM, DMARC, and verification records.
2. Replace the Zatiq Easy apex record with the cPanel origin target.
3. Point `www` to the apex domain.
4. Point `api` to the cPanel origin.
5. Start with DNS-only records while validating the origin certificate.
6. Enable Cloudflare proxying after the origin is healthy.
7. Use SSL/TLS mode `Full (strict)`.
8. Remove Zatiq-specific DNS records only after the new storefront passes live verification.

Changing nameservers at Namecheap is the fallback, not the preferred path. It risks losing Cloudflare-managed mail and verification records unless the complete zone is copied first.

## Gate 6: Legacy Domain Behavior

After the new domain is stable:

- `bornohinbd.com/*` should return a permanent redirect to `https://bornohin.com/$1`.
- `shop.bornohinbd.com/*` should return a permanent redirect to `https://bornohin.com/$1`.
- `admin.bornohinbd.com/*` should return a permanent redirect to `https://bornohin.com/admin`.
- No legacy Next.js, Auth.js, or Laravel application should remain active.

## Final Verification

1. `npm run lint`
2. `npm test`
3. `npm run build`
4. `https://bornohin.com/` returns `200`.
5. `https://www.bornohin.com/` redirects to the apex domain.
6. `https://bornohin.com/admin` requires admin authentication.
7. `https://api.bornohin.com/api/health` returns a successful JSON response.
8. Admin-created products, images, settings, and carousel sections appear on the storefront.
9. Cart, coupon, COD checkout, inventory reservation, order tracking, and admin order updates work.
10. bKash callbacks without a valid signature are rejected.
11. TLS is valid on apex, `www`, and `api`.
12. The old domains serve redirects only.

## Hard Stop Conditions

- No cPanel inventory or completed backup.
- No scoped cPanel or Cloudflare access.
- No production PostgreSQL.
- Failing lint, tests, or build.
- Origin fails before DNS cutover.
- Unknown mail/DNS dependencies on the old account.
