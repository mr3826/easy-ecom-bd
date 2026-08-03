# Operations

How Bornohin is deployed, reset, and recovered. Everything operational lives
here; [README.md](../README.md) covers what the application *is*.

There is exactly one supported path for each operation below. If you find a
second script that does the same job, delete it — duplicated deploy and wipe
scripts are what caused the incidents in [History](#history).

---

## 1. Environments

| | Local | Production |
| --- | --- | --- |
| URL | `http://localhost:3000` | `https://bornohin.com` |
| Host | your machine / Docker | cPanel `bd10.exonhost.com`, user `bornohin` |
| App root | repo | `/home/bornohin/bornohin_app` |
| Runtime | `npm run dev` | Phusion Passenger + LiteSpeed, behind Cloudflare |
| Database | `postgresql://…@localhost:5432/ecommerce` | PostgreSQL 13 `bornohin_ecom`, user `bornohin_ecomapp` |
| Uploads | `public/uploads` | `/home/bornohin/bornohin_uploads` |

**The production database is only reachable from the cPanel host.** It listens on
that machine's loopback; no developer machine can connect to it. Every production
database operation therefore runs *on the server* — see [§4](#4-database).

Facts about the production host, verified 2026-08-03:

- `psql` 13.23 and `pg_dump` are at `/usr/bin`.
- `node` is **not** on the cron `PATH` (Passenger supplies its own).
- cPanel exposes no shell; the only way to execute a command is a cron entry.

### Required environment

Local: copy `.env.example` to `.env`. Production: set in cPanel's Node.js
application environment, which writes `/home/bornohin/bornohin_app/.env`.

```dotenv
NODE_ENV=production
DATABASE_URL=postgresql://...
AUTH_SECRET=...
ADMIN_NAME=Bornohin Admin
ADMIN_EMAIL=admin@bornohin.com
ADMIN_PASSWORD=...            # 12 characters minimum
NEXT_PUBLIC_APP_URL=https://bornohin.com
APP_URL=https://bornohin.com
UPLOAD_DIR=/home/bornohin/bornohin_uploads
DEPLOY_RESTART_TOKEN=...      # lets the deploy stop a stale process
```

bKash stays disabled unless every provider credential and `BKASH_WEBHOOK_SECRET`
is configured. There is no production payment simulator.

Two secrets live only in your shell, never in a file or in chat:

```powershell
$env:CPANEL_API_TOKEN     = "<short-lived cPanel API token>"
$env:DEPLOY_RESTART_TOKEN = "<same value as the server's>"
```

---

## 2. Deployment

**[`scripts/deploy-cpanel.ps1`](../scripts/deploy-cpanel.ps1) is the only way to
deploy.** It installs dependencies, generates the Prisma client, lints, builds
the standalone bundle, uploads it over the cPanel HTTPS API, extracts it,
restarts Passenger, and verifies that the new commit is answering — rolling the
symptoms into `deploy-log.jsonl` on the server as it goes.

```powershell
$env:CPANEL_API_TOKEN = "<short-lived token>"
.\scripts\cpanel-preflight.ps1                  # inspect the host first
.\scripts\cpanel-preflight.ps1 -StartFullBackup # optional full cPanel backup
.\scripts\deploy-cpanel.ps1 -AppRoot bornohin_app -ConfirmAppRoot bornohin_app
```

`-ConfirmAppRoot` must repeat `-AppRoot`. That is deliberate: verify the
Passenger application root in cPanel before typing it twice.

Useful switches:

| Switch | Effect |
| --- | --- |
| `-DryRun` | Builds and packages, prints what would be uploaded, uploads nothing |
| `-SkipBuild` | Reuses the existing `.next/standalone` — only for redeploying an identical build |
| `-SelfTestReaper` | Exercises the cron install/detect/remove path with a harmless command |

The script uses cPanel HTTPS APIs only. It never uses FTP, never disables
certificate verification, never publishes a PHP extractor, and never deletes
domains or databases.

### What "deployed" means

`/api/version` reports the commit compiled into the running bundle:

```powershell
curl.exe -s https://bornohin.com/api/version
```

```json
{"status":"ready","commit":"<sha>","pid":1311208,"startedAt":"..."}
```

`RELEASE.json` in the app root records the same commit plus `rollbackCommit`.
If the two disagree, a deploy half-finished — see [§5](#5-when-a-deploy-goes-wrong).

### Rollback

```powershell
git checkout <rollbackCommit from RELEASE.json>
.\scripts\deploy-cpanel.ps1 -AppRoot bornohin_app -ConfirmAppRoot bornohin_app
```

There is no server-side rollback. The previous release is not kept on the host;
the recorded commit plus a redeploy is the rollback.

---

## 3. Validation

```powershell
npm run lint
npm test                    # vitest
npm run build
npx playwright test         # E2E against $env:E2E_BASE_URL, default localhost:3000
```

To point E2E at a deployed environment, supply real credentials — the valid-login
test skips itself off localhost without them:

```powershell
$env:E2E_BASE_URL      = "https://bornohin.com"
$env:E2E_ADMIN_EMAIL   = "admin@bornohin.com"
$env:E2E_ADMIN_PASSWORD = "<real password>"
npx playwright test e2e/login.spec.ts
```

Login is rate limited to 10 attempts per 15 minutes per IP+email
([`src/app/actions.ts`](../src/app/actions.ts)), so repeated E2E runs against
production will start failing with *"Too many login attempts"*. That message is
distinct from *"The email or password is not correct."* — do not confuse the two
when diagnosing.

---

## 4. Database

One definition of "wipe" serves both environments:
[`prisma/wipe.sql`](../prisma/wipe.sql). It reads the table list from the
PostgreSQL catalogue instead of naming tables, so adding a Prisma model needs no
edit and there is no delete-ordering to keep correct. `_prisma_migrations` is
left intact so the schema stays migrated.

### Local

```powershell
npm run db:reset              # empty every table, recreate the admin from .env
npm run db:reset -- --seed    # ... and load the demo catalogue (51 products)
npm run db:admin              # only create/rotate the admin, no wipe
npm run prisma:seed           # Prisma's own hook; wipe + demo data
```

The administrator is recreated after every wipe, so a reset can never lock you
out. It is an upsert, which makes `db:admin` the password-rotation command too.

Any non-localhost `DATABASE_URL` is refused until you type the database name
back:

```powershell
npm run db:reset -- --confirm bornohin_ecom
```

A stray production `DATABASE_URL` in your shell is otherwise all it takes to
empty production. The guard is covered by [`tests/db-reset.test.ts`](../tests/db-reset.test.ts).

### Production

**[`scripts/wipe-production-db.ps1`](../scripts/wipe-production-db.ps1) is the
only way to wipe production.**

```powershell
$env:CPANEL_API_TOKEN = "<short-lived token>"
$env:ADMIN_PASSWORD   = "<password the wiped database is left with>"
.\scripts\wipe-production-db.ps1 -ConfirmDatabase bornohin_ecom
```

What it does, in order:

1. Asks cPanel for the live database name and refuses unless `-ConfirmDatabase` matches.
2. Hashes `ADMIN_PASSWORD` **locally** with bcrypt — the plaintext never leaves your machine.
3. Uploads `prisma/wipe.sql` and a generated admin `INSERT` to `/home/bornohin/db-maintenance`.
4. Runs `pg_dump | gzip` on the server into that directory. Pass `-SkipBackup` to skip, and understand a wipe without a dump cannot be undone.
5. Runs both SQL files through `psql -v ON_ERROR_STOP=1`, then prints row counts.
6. Restarts the application over `POST /api/deploy/restart` and confirms the `pid` changed, so no request reuses cached rows. Warns loudly if it did not.
7. Probes `/api/health/ready`.

`DATABASE_URL` never leaves the server. Every step runs through a one-shot cron
entry that is removed in a `finally` block and whose absence is confirmed — the
same pattern `deploy-cpanel.ps1` uses for the orphan reaper. If removal ever
fails the script says so in red; delete the entry containing `bornohin-db-wipe`
under **cPanel > Cron Jobs** immediately, or it runs every minute.

Delete the dump and staged SQL from `/home/bornohin/db-maintenance` once you are
satisfied — `admin.sql` contains the administrator's bcrypt hash.

#### Four traps this host sets

Each cost a failed run; the script now handles all four, but they bite anything
else you write against this server.

1. **`bornohin_app/.env` is a lie.** It is a stale copy of a development `.env`
   with `DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ecommerce`.
   No `ecommerce` database exists on this host. The running application gets its
   environment from `SetEnv` directives in `/home/bornohin/public_html/.htaccess`
   — read `DATABASE_URL` from there, never from that `.env`. Sourcing the `.env`
   pointed an early run of the wipe at the wrong database; only a missing
   `pg_hba.conf` entry stopped it.
2. **libpq rejects Prisma's URL.** `?schema=public` fails with
   `invalid URI query parameter: "schema"`. Strip the query string before handing
   the URL to `psql` — with `cut -d'?' -f1`, not the shell's `${VAR%%\?*}`, since
   a `%` truncates a crontab command.
3. **Table names are snake_case.** Every model carries an `@@map`, so it is
   `public.users`, not `public."User"`. Column names keep their camelCase field
   names and must stay double-quoted: `"passwordHash"`, `"createdAt"`.
4. **`touch tmp/restart.txt` does not restart anything** for a healthy
   Passenger-parented process on this host. The application caches query results
   in-process, so after a wipe it keeps serving deleted rows until it actually
   restarts. Use `POST /api/deploy/restart` with `DEPLOY_RESTART_TOKEN` and
   confirm the `pid` from `/api/version` changed.

### What survives a wipe

Nothing, by design — every application table is truncated. Two rows are then put
back so the result is a usable store rather than a broken one:

- **The administrator**, from `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Recreated by both
  the local and the production path.
- **The store settings row**, created on demand by `getSettingsRow()`
  ([`src/server/store.ts`](../src/server/store.ts)) the first time anything reads
  settings. Delivery charges, COD/bKash toggles and store identity all revert to
  the defaults in that function, so **re-enter them in the admin dashboard after
  a production wipe.**

Checkout and manual order creation used to throw *"Store settings are missing"*
on a database that had never had that row — they read it inside their
transaction instead of going through `getSettingsRow()`. Both now ensure the row
first. Uploaded media under `UPLOAD_DIR` is not touched by a wipe; the rows
referencing it are, so orphaned files are left behind on disk.

**An empty catalogue now renders as an empty shop.** Until 2026-08-03,
`resolveBackendCollections()` in
[`src/server/storefront-catalog.ts`](../src/server/storefront-catalog.ts) ended
with `return resolved.length ? resolved : storefrontCollections`, so a store with
no products advertised the 51 template products from
`src/lib/bornohin-storefront.ts` — with prices, to real customers, on a checkout
that could not fulfil them. The site footer sliced the same template directly.
Both now read the real catalogue. `storefrontCollections` remains a presentation
template (tone, badges) for products that genuinely exist; it is not a fallback
catalogue. If the shop looks empty after a wipe, that is correct — add products
in the admin dashboard.

### Restoring a backup

```sh
gunzip -c /home/bornohin/db-maintenance/pre-wipe-<stamp>.sql.gz | psql "$DATABASE_URL"
```

Run it the same way — through a cron entry, sourcing the app's `.env`.

### Migrations

```powershell
npm run prisma:migrate        # local, creates the migration
```

**`deploy-cpanel.ps1` does not apply migrations.** Nothing in the deploy path
runs `prisma migrate deploy`, so a release whose schema changed will ship code
that queries columns the production database does not have. Until that gap is
closed, apply the migration to production *before* deploying the code that needs
it, by running the generated SQL through `psql` on the host — the same cron
mechanism `wipe-production-db.ps1` uses. Take a `pg_dump` first.

This is an open gap, not a design decision. See [Known gaps](#known-gaps).

---

## 5. When a deploy goes wrong

### Symptom: some routes return 500, others work

The extraction was incomplete — files are missing from the server's `.next`
while the route manifest still lists the route, so Next tries to load a
`route.js` that is not there. LiteSpeed returns a plain-text `500`.

Distinguish it from a genuinely unknown route:

| Response | Meaning |
| --- | --- |
| `404` | The route is not in the build at all |
| `405` | The route loaded; wrong HTTP method (healthy) |
| `500` plain text, `content-type: text/plain` | The route is in the manifest but its file is missing |

Confirm by listing the directory on the server:

```powershell
$h = @{ Authorization = "cpanel bornohin:$env:CPANEL_API_TOKEN" }
$d = '/home/bornohin/bornohin_app/.next/server/app/api/<route>'
Invoke-RestMethod -Headers $h -Uri "https://bd10.exonhost.com:2083/execute/Fileman/list_files?dir=$([Uri]::EscapeDataString($d))&types=file%7Cdir" |
  ForEach-Object { $_.data } | Format-Table file, size
```

An empty directory, or `route.js` absent, confirms it. Redeploy through
`deploy-cpanel.ps1`. Check disk and inode quota first — a truncated extract is
what a quota wall looks like:

```powershell
Invoke-RestMethod -Headers $h -Uri "https://bd10.exonhost.com:2083/execute/Quota/get_quota_info" |
  ForEach-Object { $_.data }
```

### Symptom: the old build keeps answering

`/api/version` still reports the previous commit after a deploy. The deploy
script handles this itself — it asks the process to exit over
`/api/deploy/restart`, then falls back to an age-based cron reaper. If you are
doing it by hand, touch `tmp/restart.txt` in the app root and wait a minute.

### Symptom: the app restarts every couple of minutes

Check the crontab for the orphan reaper:

```sh
ps -eo pid,etimes,args | awk '$2 > 120 && /next-server/ {print $1}' | xargs -r kill
```

That entry kills any `next-server` process older than two minutes, **every
minute**. `deploy-cpanel.ps1` installs it only as a last resort and removes it in
a `finally` block, but a deploy interrupted at the wrong moment leaves it
running, and it survived one deploy on 2026-08-03 — production was being killed
roughly every two minutes until it was found. Symptom: the `pid` from
`/api/version` keeps changing while `startedAt` stays under two minutes.

Delete it under **cPanel > Cron Jobs**, then confirm the crontab is clean:

```powershell
$h = @{ Authorization = "cpanel bornohin:$env:CPANEL_API_TOKEN" }
$q = "cpanel_jsonapi_user=bornohin&cpanel_jsonapi_apiversion=2&cpanel_jsonapi_module=Cron&cpanel_jsonapi_func=fetchcron"
(Invoke-RestMethod -Uri "https://bd10.exonhost.com:2083/json-api/cpanel?$q" -Headers $h).cpanelresult.data |
  Where-Object { $_.PSObject.Properties['command'] } | ForEach-Object { $_.command }
```

### Symptom: a cron entry is left behind

Both `deploy-cpanel.ps1` and `wipe-production-db.ps1` install temporary cron
entries and remove them in a `finally` block. If one survives, it runs **every
minute**. Delete it under **cPanel > Cron Jobs**; the markers are `next-server`
(deploy reaper) and `bornohin-db-wipe` (database maintenance).

---

## 6. Security rules

These are not style preferences. Each one has already been violated once.

- **No database-reset endpoint in the application.** A `POST /api/admin/db-reset`
  route with a hardcoded token existed briefly; anyone who read the repository
  could have emptied production. Database maintenance runs over SSH-less cron
  through `wipe-production-db.ps1`, never over HTTP.
- **No credentials in source, in logs, or in chat.** `CPANEL_API_TOKEN`,
  `DEPLOY_RESTART_TOKEN`, `ADMIN_PASSWORD` and `AUTH_SECRET` live in your shell
  and in cPanel. A debug line that printed the cPanel API token to the console
  shipped once — do not add `Write-Host` calls that interpolate a token.
- **Never deploy the working tree.** Only `.next/standalone`, `.next/static`,
  `public/`, and `RELEASE.json` belong on the server. Uploading `src/`, `tests/`,
  and scratch scripts leaks source and wastes inodes.
- **Take the dump before the destructive step**, not after.

---

## Known gaps

Open as of 2026-08-03. Listed because a gap nobody wrote down is a gap that gets
rediscovered during an incident.

- **Migrations are not part of the deploy.** See [§4](#migrations). Highest-risk
  item here: a schema change ships with no way for the release to apply it.
- **Extraction is not verified.** `deploy-cpanel.ps1` probes `/api/version` and
  one static asset after extracting, which does not catch a partial extract of
  files those two do not touch — exactly the failure in [History](#history). The
  cheap check would be comparing a manifest of the uploaded zip against the
  server after extraction.
- **`RELEASE.json` can disagree with the running process.** `/api/version`
  reports the commit compiled into the bundle; `RELEASE.json` reports what the
  deploy script wrote. A half-finished deploy leaves them inconsistent, and
  nothing alerts on it.

## History

Recorded so the same failure is recognised the second time.

**2026-08-03 — a production wipe that never ran.** The wipe was attempted through
a `POST /api/admin/db-reset` route added for the purpose. It returned `500` on
every call. The cause was an incomplete extraction: on the server,
`.next/server/app/api/admin/db-reset/` and `debug-env/` were empty directories
and `simple-test/` and `test-route/` were absent, while the local build had
`route.js` for all four. (`node_modules/bcryptjs/` is also missing on the server,
but that is normal — the standalone build inlines it into the server chunks
rather than tracing it as a package. It is not a truncation symptom.) A second
deploy script (`deploy-simple.ps1`) had uploaded the entire
working tree — `src/`, `tests/`, `docs/`, and nine scratch `test-*.ps1` files —
into the application root, and `deploy-log.jsonl` recorded nothing for that day.
Disk and inode quota were not the constraint (1.09 GB of 4.88 GB, inodes
unlimited). No data was wiped.

Resolved by: deleting the reset endpoint and the second deploy script; folding
five near-identical wipe/seed scripts (~565 duplicated lines) into
`scripts/db-reset.ts` plus one `prisma/wipe.sql`; and adding
`wipe-production-db.ps1`, which does the work through `psql` on the host rather
than through the application.
