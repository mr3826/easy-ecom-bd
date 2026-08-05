<#
.SYNOPSIS
Applies one Prisma migration to the production PostgreSQL database on the cPanel
host, or inspects that database's live schema without changing anything.

.DESCRIPTION
docs/OPERATIONS.md records "deploy-cpanel.ps1 does not apply migrations" as an
open gap: nothing in the repo could run schema SQL against production. This is
that missing path, built on the same primitives as wipe-production-db.ps1 rather
than a second mechanism - production's PostgreSQL listens on the cPanel host's
loopback, so the work has to happen where the database is.

DATABASE_URL never leaves the server. The cron command reads it from the
Passenger configuration in public_html/.htaccess, which is where the running
application gets it, and refuses unless that URL names the confirmed database. It
deliberately does NOT read bornohin_app/.env, a stale development copy pointing
at localhost/ecommerce.

-InspectOnly runs a read-only report and exits. Use it before every migration:
this host's schema history has drifted from prisma/migrations more than once, and
the report is the only way to see what production actually has.

Ordering matters and this script cannot enforce it for you:

  * ADDITIVE migrations (new tables, new columns) go BEFORE the deploy. The old
    build ignores what it does not know about.
  * DROP migrations go AFTER the deploy. Prisma names every scalar of a model in
    every SELECT, so dropping a column the running build still knows about turns
    each read into P2022 ColumnNotFound.

.EXAMPLE
$env:CPANEL_API_TOKEN = "<short-lived token>"
.\scripts\apply-production-migration.ps1 -ConfirmDatabase bornohin_ecom -InspectOnly

.EXAMPLE
.\scripts\apply-production-migration.ps1 -ConfirmDatabase bornohin_ecom `
    -MigrationDir prisma/migrations/20260804000000_remove_payment_provider_and_smtp_settings
#>
param(
    [string]$ProjectRoot,
    [string]$CpanelHost = "bd10.exonhost.com",
    [string]$CpanelUser = "bornohin",
    [string]$CpanelHome = "/home/bornohin",
    [string]$CpanelApiToken = $env:CPANEL_API_TOKEN,
    [string]$AppRoot = "bornohin_app",
    [string]$AppUrl = "https://bornohin.com",
    # Typed back by the operator. Nothing runs until it matches the live database.
    [Parameter(Mandatory = $true)][string]$ConfirmDatabase,
    # A prisma/migrations/<timestamp>_<name> directory containing migration.sql.
    [string]$MigrationDir,
    [switch]$InspectOnly,
    [switch]$SkipBackup,
    [switch]$SkipRestart
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $ProjectRoot) { $ProjectRoot = Split-Path -Parent $PSScriptRoot }
if (-not $CpanelApiToken) { throw "Set CPANEL_API_TOKEN locally. Do not put the token in source control or chat." }
if (-not $InspectOnly -and -not $MigrationDir) { throw "Pass -MigrationDir, or -InspectOnly to only read the schema." }

$absoluteAppRoot = "$($CpanelHome.TrimEnd('/'))/$($AppRoot.Trim('/'))"
$workDir = "$($CpanelHome.TrimEnd('/'))/db-maintenance"
$marker = "bornohin-db-migrate"
# Stamped into the completion line so a log left by an earlier run can never be
# mistaken for this one's result.
$runId = [guid]::NewGuid().ToString("N").Substring(0, 8)

function Write-Step { param([string]$Text) Write-Host "`n==> $Text" -ForegroundColor Cyan }
function Write-OK   { param([string]$Text) Write-Host "    $Text" -ForegroundColor Green }
function Write-Warn { param([string]$Text) Write-Host "    $Text" -ForegroundColor Yellow }

$authHeader = @{ Authorization = "cpanel ${CpanelUser}:$CpanelApiToken" }

function Invoke-Uapi {
    param([string]$Path, [hashtable]$Query = @{}, [string]$Method = "GET")
    $queryString = ($Query.GetEnumerator() | ForEach-Object {
        "$([Uri]::EscapeDataString($_.Key))=$([Uri]::EscapeDataString([string]$_.Value))"
    }) -join "&"
    $uri = "https://${CpanelHost}:2083/execute/$Path"
    if ($queryString) { $uri = "$uri`?$queryString" }
    return Invoke-RestMethod -Uri $uri -Headers $authHeader -Method $Method -TimeoutSec 180
}

function Invoke-Api2 {
    param([string]$Module, [string]$Function, [hashtable]$Arguments = @{})
    $query = @{
        cpanel_jsonapi_user = $CpanelUser
        cpanel_jsonapi_apiversion = "2"
        cpanel_jsonapi_module = $Module
        cpanel_jsonapi_func = $Function
    }
    foreach ($key in $Arguments.Keys) { $query[$key] = $Arguments[$key] }
    $queryString = ($query.GetEnumerator() | ForEach-Object {
        "$([Uri]::EscapeDataString($_.Key))=$([Uri]::EscapeDataString([string]$_.Value))"
    }) -join "&"
    return Invoke-RestMethod -Uri "https://${CpanelHost}:2083/json-api/cpanel?$queryString" `
        -Headers $authHeader -TimeoutSec 180
}

<#
Uploaded rather than written with Fileman::save_file_content, which on this host
only overwrites files that already exist.
#>
function Save-RemoteFile {
    param([string]$Dir, [string]$Name, [string]$Content)

    $staging = Join-Path ([System.IO.Path]::GetTempPath()) $Name
    # LF and no BOM: psql reads these, and a BOM ahead of the first statement is
    # a syntax error.
    [System.IO.File]::WriteAllText($staging, ($Content -replace "`r`n", "`n"), (New-Object System.Text.UTF8Encoding $false))
    try {
        $response = curl.exe --fail-with-body --silent --show-error `
            -H "Authorization: cpanel ${CpanelUser}:$CpanelApiToken" `
            -F "file-1=@$staging;filename=$Name" `
            -F "dir=$Dir" `
            -F "overwrite=1" `
            "https://${CpanelHost}:2083/execute/Fileman/upload_files"
        if ($LASTEXITCODE -ne 0 -or $response -notmatch '"succeeded"\s*:\s*1') {
            throw "Could not upload $Dir/$Name : $response"
        }
    } finally {
        Remove-Item -LiteralPath $staging -Force -ErrorAction SilentlyContinue
    }
}

function Read-RemoteFile {
    param([string]$Dir, [string]$Name)
    try {
        $response = Invoke-Uapi -Path "Fileman/get_file_content" -Query @{ dir = $Dir; file = $Name }
        if ($response.status -eq 1) { return [string]$response.data.content }
    } catch { }
    return $null
}

# --- The cron entry is the only way to execute anything on this host, so its
# --- removal is guarded the same way wipe-production-db.ps1 guards its own.
function Get-JobKeys {
    $response = Invoke-Api2 -Module "Cron" -Function "fetchcron"
    return @($response.cpanelresult.data |
        Where-Object { $_.PSObject.Properties['command'] -and "$($_.command)".Contains($marker) } |
        ForEach-Object { $_.linekey })
}

function Remove-Job {
    foreach ($attempt in 1..3) {
        $keys = @(Get-JobKeys)
        if (-not $keys.Count) { return $true }
        foreach ($key in $keys) {
            Invoke-Api2 -Module "Cron" -Function "remove_line" -Arguments @{ linekey = $key } | Out-Null
        }
    }
    return -not @(Get-JobKeys).Count
}

<#
Runs one shell command on the host and returns what it printed. cron is the only
execution primitive cPanel exposes here, so the command writes to a file, this
polls for it, and the entry is removed in a finally block - leaving a per-minute
cron behind is the worst failure mode this script has.
No '%' may appear in $Command: an unescaped percent truncates a crontab line.
That is also why every query below is uploaded as a .sql file and run with
psql -f rather than inlined with -c.
#>
function Invoke-RemoteCommand {
    param([string]$Command, [string]$OutputName, [int]$TimeoutSeconds = 300)

    if ($Command.Contains('%')) { throw "Remote command contains '%', which cron truncates." }
    if ($Command -match "[`r`n]") { throw "Remote command contains a newline; cron cannot store it." }
    if (@(Get-JobKeys).Count) { throw "A '$marker' cron entry already exists; clear it in cPanel > Cron Jobs first." }

    $outPath = "$workDir/$OutputName"
    $done = "$marker-$runId-exit"
    $wrapped = "{ $Command ; echo $done=`$? ; } > $outPath 2>&1"

    Invoke-Api2 -Module "Fileman" -Function "fileop" -Arguments @{
        op = "unlink"; sourcefiles = $outPath; doubledecode = "0"; metadata = ""
    } | Out-Null

    Invoke-Api2 -Module "Cron" -Function "add_line" -Arguments @{
        command = $wrapped; minute = "*"; hour = "*"; day = "*"; month = "*"; weekday = "*"
    } | Out-Null
    if (-not @(Get-JobKeys).Count) { Remove-Job | Out-Null; throw "Could not install the '$marker' cron entry." }

    try {
        $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
        while ((Get-Date) -lt $deadline) {
            Start-Sleep -Seconds 10
            $content = Read-RemoteFile -Dir $workDir -Name $OutputName
            if ($content -and $content.Contains("$done=")) { return $content }
        }
        throw "The remote command did not finish within $TimeoutSeconds seconds."
    } finally {
        if (Remove-Job) {
            Write-OK "Cron entry removed and absence confirmed"
        } else {
            Write-Host @"
    A '$marker' cron entry is still installed and will run every minute.
    Remove it now: cPanel > Cron Jobs > delete the entry containing '$marker'
"@ -ForegroundColor Red
        }
    }
}

function Assert-RemoteSuccess {
    param([string]$Output, [string]$What)
    if ($Output -notmatch "$marker-$runId-exit=0(\s|$)") {
        throw "$What failed on the server:`n$Output"
    }
}

# ---------------------------------------------------------------------------

Write-Step "Checking the target"
$databases = Invoke-Uapi -Path "Postgresql/list_databases"
$liveDatabase = @($databases.data | ForEach-Object { $_.database }) | Select-Object -First 1
if (-not $liveDatabase) { throw "cPanel reported no PostgreSQL database for $CpanelUser." }
if ($ConfirmDatabase -ne $liveDatabase) {
    throw "-ConfirmDatabase '$ConfirmDatabase' does not match the live database '$liveDatabase'."
}
Write-OK "Target: $liveDatabase on $CpanelHost"

# UAPI has no Fileman::mkdir on this cPanel build; API2 does. Succeeds silently
# when the directory is already there.
Invoke-Api2 -Module "Fileman" -Function "mkdir" -Arguments @{
    path = $CpanelHome.TrimEnd('/'); name = "db-maintenance"
} | Out-Null

<#
Reads DATABASE_URL from the Passenger configuration, which is where the running
application actually gets it - NOT from $absoluteAppRoot/.env, a stale copy of
somebody's development .env pointing at localhost/ecommerce. The value is never
echoed. The second line is the guard: the URL must name the database the
operator confirmed, or nothing runs.
#>
$passengerConf = "/home/bornohin/public_html/.htaccess"
# Built as one line on purpose: a crontab command cannot contain a newline.
$loadEnv = (@(
    "DATABASE_URL=`$(sed -nE 's/^[[:space:]]*SetEnv[[:space:]]+DATABASE_URL[[:space:]]+`"?([^`"]+)`"?[[:space:]]*`$/\1/p' $passengerConf | head -1)"
    "[ -n `"`$DATABASE_URL`" ] || { echo 'DATABASE_URL not found in $passengerConf'; exit 1; }"
    "case `"`$DATABASE_URL`" in *`"/$ConfirmDatabase`"*) : ;; *) echo 'Passenger DATABASE_URL does not name the confirmed database; refusing.'; exit 1 ;; esac"
    # Prisma appends ?schema=public; libpq rejects it as "invalid URI query
    # parameter". cut, not the shell's own suffix removal, because that needs a
    # '%' and cron truncates the command there.
    "PSQL_URL=`$(echo `"`$DATABASE_URL`" | cut -d'?' -f1)"
    "export DATABASE_URL PSQL_URL"
) -join " && ")
if ($loadEnv -match "[`r`n]") { throw "The DATABASE_URL prelude contains a newline; cron would reject it." }

# --- Read-only schema report -------------------------------------------------
# Everything this needs to answer: does production have the tables and columns
# the incoming build's Prisma client will name, and does it still hold rows that
# would block an enum narrowing.
$inspectSql = @'
\echo == tables ==
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

\echo == users columns ==
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'users'
 ORDER BY ordinal_position;

\echo == settings columns ==
SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
 WHERE table_schema = 'public' AND table_name = 'settings'
 ORDER BY ordinal_position;

\echo == enums ==
SELECT t.typname, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS values
  FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
 GROUP BY t.typname ORDER BY t.typname;

\echo == foreign key delete rules ==
SELECT c.conname, confdeltype
  FROM pg_constraint c
 WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace
 ORDER BY c.conname;

\echo == recorded migrations ==
SELECT migration_name, finished_at, rolled_back_at
  FROM _prisma_migrations ORDER BY started_at;

\echo == rows blocking the PaymentProviderKey narrowing ==
SELECT 'payments' AS source, count(*) FROM payments WHERE provider::text NOT IN ('cod', 'bkash')
UNION ALL
SELECT 'orders', count(*) FROM orders WHERE "paymentProvider" IS NOT NULL AND "paymentProvider"::text NOT IN ('cod', 'bkash');

\echo == row counts ==
SELECT 'users' AS t, count(*) FROM users
UNION ALL SELECT 'products', count(*) FROM products
UNION ALL SELECT 'orders', count(*) FROM orders
UNION ALL SELECT 'settings', count(*) FROM settings;

\echo == accounts ==
-- Who can actually sign in. Never selects passwordHash: this report is printed
-- to a terminal and pasted into tickets.
SELECT email, role, "emailVerified", "createdAt"::date AS created FROM users ORDER BY "createdAt";
'@

Write-Step "Reading the live schema"
Save-RemoteFile -Dir $workDir -Name "inspect.sql" -Content $inspectSql
# No ON_ERROR_STOP: a missing table is exactly what this is looking for, and
# should be reported rather than aborting the report.
$report = Invoke-RemoteCommand `
    -Command "$loadEnv && psql `"`$PSQL_URL`" -f $workDir/inspect.sql" `
    -OutputName "inspect.log" -TimeoutSeconds 300
Assert-RemoteSuccess -Output $report -What "The schema report"
Write-Host $report.Trim()

if ($InspectOnly) {
    Write-Host "`n-InspectOnly: nothing was changed." -ForegroundColor Green
    return
}

# --- Apply the migration -----------------------------------------------------
$resolvedMigrationDir = Resolve-Path -LiteralPath (Join-Path $ProjectRoot $MigrationDir) -ErrorAction SilentlyContinue
if (-not $resolvedMigrationDir) { $resolvedMigrationDir = Resolve-Path -LiteralPath $MigrationDir }
$migrationName = Split-Path -Leaf $resolvedMigrationDir
$migrationFile = Join-Path $resolvedMigrationDir "migration.sql"
if (-not (Test-Path -LiteralPath $migrationFile -PathType Leaf)) {
    throw "No migration.sql in $resolvedMigrationDir."
}
$migrationSql = Get-Content -LiteralPath $migrationFile -Raw

# Prisma records the sha256 of migration.sql. Computed over the same LF-normalised
# bytes that get uploaded, or `prisma migrate status` reports a checksum mismatch.
$normalised = $migrationSql -replace "`r`n", "`n"
$sha = [System.Security.Cryptography.SHA256]::Create()
try {
    $checksum = [System.BitConverter]::ToString(
        $sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($normalised))
    ).Replace("-", "").ToLowerInvariant()
} finally { $sha.Dispose() }

Write-Step "Applying $migrationName"
Write-Host $migrationSql.Trim()
Write-Warn "This is about to run against $liveDatabase."

if (-not $SkipBackup) {
    Write-Step "Backing up before anything changes"
    $stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
    $dumpPath = "$workDir/pre-migration-$stamp.sql.gz"
    $output = Invoke-RemoteCommand `
        -Command "$loadEnv && pg_dump `"`$PSQL_URL`" | gzip -9 > $dumpPath && ls -l $dumpPath" `
        -OutputName "backup.log" -TimeoutSeconds 600
    Assert-RemoteSuccess -Output $output -What "pg_dump"
    Write-OK "Backup written to $dumpPath"
    Write-Host $output.Trim()
} else {
    Write-Warn "-SkipBackup was passed. A migration without a dump cannot be undone."
}

<#
The migration and its _prisma_migrations row go in as ONE transaction. Recording
a migration that did not apply, or applying one that was not recorded, both leave
the history lying about the schema - and this repo has already been bitten by a
schema change that no migration describes.
#>
function ConvertTo-SqlLiteral { param([string]$Value) return "'" + $Value.Replace("'", "''") + "'" }
$recordSql = @"
-- Generated by scripts/apply-production-migration.ps1.
BEGIN;

\i $workDir/migration.sql

INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
VALUES (gen_random_uuid()::text, $(ConvertTo-SqlLiteral $checksum), now(), $(ConvertTo-SqlLiteral $migrationName), now(), 1)
ON CONFLICT (id) DO NOTHING;

COMMIT;
"@

Save-RemoteFile -Dir $workDir -Name "migration.sql" -Content $migrationSql
Save-RemoteFile -Dir $workDir -Name "apply.sql" -Content $recordSql
Write-OK "migration.sql and apply.sql staged in $workDir"

# ON_ERROR_STOP so a failed statement cannot fall through to reporting success.
$output = Invoke-RemoteCommand `
    -Command "$loadEnv && psql -v ON_ERROR_STOP=1 `"`$PSQL_URL`" -f $workDir/apply.sql" `
    -OutputName "migrate.log" -TimeoutSeconds 600
Assert-RemoteSuccess -Output $output -What "The migration"
Write-OK "$migrationName applied and recorded"
Write-Host $output.Trim()

<#
The application caches query results in-process, and Prisma caches prepared
statements keyed to the old column list. Touching tmp/restart.txt is not enough:
this host ignores it for a healthy Passenger-parented process, which is why
deploy-cpanel.ps1 asks the app to exit over HTTP instead.
#>
if (-not $SkipRestart) {
    Write-Step "Restarting the application"
    $restartToken = $env:DEPLOY_RESTART_TOKEN
    if (-not $restartToken) { $restartToken = [Environment]::GetEnvironmentVariable("DEPLOY_RESTART_TOKEN", "User") }

    $pidBefore = $null
    try { $pidBefore = (Invoke-RestMethod -Uri "$($AppUrl.TrimEnd('/'))/api/version" -TimeoutSec 30).pid } catch { }

    Invoke-RemoteCommand -Command "touch $absoluteAppRoot/tmp/restart.txt && echo touched" -OutputName "restart.log" -TimeoutSeconds 300 | Out-Null

    if ($restartToken) {
        try {
            # A dead connection here means the process exited before replying,
            # which is the outcome being asked for.
            Invoke-WebRequest -Uri "$($AppUrl.TrimEnd('/'))/api/deploy/restart" -Method Post `
                -Headers @{ "x-deploy-token" = $restartToken } -TimeoutSec 20 -SkipHttpErrorCheck | Out-Null
        } catch { }
    } else {
        Write-Warn "DEPLOY_RESTART_TOKEN is not set; the old process cannot be asked to exit."
    }

    $restarted = $false
    foreach ($attempt in 1..12) {
        Start-Sleep -Seconds 5
        try {
            $now = (Invoke-RestMethod -Uri "$($AppUrl.TrimEnd('/'))/api/version" -TimeoutSec 30).pid
            if ($now -and $now -ne $pidBefore) { Write-OK "New process serving (pid $pidBefore -> $now)"; $restarted = $true; break }
        } catch { }
    }
    if (-not $restarted) {
        Write-Warn "The process did not change. It may still hold prepared statements for the old schema."
        Write-Warn "Restart the application from cPanel > Setup Node.js App."
    }
}

Write-Step "Verifying"
Start-Sleep -Seconds 10
try {
    $ready = Invoke-RestMethod -Uri "$AppUrl/api/health/ready" -TimeoutSec 60
    Write-OK "/api/health/ready -> $($ready.state)"
} catch {
    Write-Warn "/api/health/ready did not answer yet: $($_.Exception.Message)"
}

Write-Host @"

Done. $migrationName is applied and recorded in _prisma_migrations.
  Backup and staged SQL remain in $workDir - delete them once you are satisfied.
"@ -ForegroundColor Green
