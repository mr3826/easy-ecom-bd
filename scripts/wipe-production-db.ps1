<#
.SYNOPSIS
Empties the production PostgreSQL database on the cPanel host and recreates the
administrator, without ever exposing a reset endpoint or moving credentials.

.DESCRIPTION
Production's PostgreSQL listens on the cPanel host's loopback, so nothing on a
developer machine can reach it. This script therefore does the work where the
database is: it uploads prisma/wipe.sql plus a generated admin INSERT, then runs
them with the host's own psql from a one-shot cron entry that removes itself.

DATABASE_URL never leaves the server - the cron command reads it from the
Passenger configuration in public_html/.htaccess, which is where the running
application gets it. It deliberately does NOT read the app root's .env: that file
is a stale copy of a development .env pointing at localhost/ecommerce. The
administrator password is hashed locally and only its bcrypt digest is uploaded.

pg_dump runs first unless -SkipBackup is passed. The dump stays on the server;
nothing here can undo a wipe without it.

.EXAMPLE
$env:CPANEL_API_TOKEN = "<short-lived token>"
.\scripts\wipe-production-db.ps1 -ConfirmDatabase bornohin_ecom
#>
param(
    [string]$ProjectRoot,
    [string]$CpanelHost,
    [string]$CpanelUser,
    [string]$CpanelHome,
    [string]$CpanelApiToken = $env:CPANEL_API_TOKEN,
    [string]$AppRoot,
    [string]$AppUrl,
    # Typed back by the operator. Nothing runs until it matches the live database.
    [Parameter(Mandatory = $true)][string]$ConfirmDatabase,
    [switch]$SkipBackup
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "deploy-settings.ps1")
$CpanelHost = Resolve-DeploySetting $CpanelHost "CPANEL_HOST"
$CpanelUser = Resolve-DeploySetting $CpanelUser "CPANEL_USER"
$CpanelHome = Resolve-DeploySetting $CpanelHome "CPANEL_HOME"
$AppRoot    = Resolve-DeploySetting $AppRoot    "APP_ROOT"
$AppUrl     = Resolve-DeploySetting $AppUrl     "APP_URL"

if (-not $ProjectRoot) { $ProjectRoot = Split-Path -Parent $PSScriptRoot }
if (-not $CpanelApiToken) { throw "Set CPANEL_API_TOKEN locally. Do not put the token in source control or chat." }

$absoluteAppRoot = "$($CpanelHome.TrimEnd('/'))/$($AppRoot.Trim('/'))"
$workDir = "$($CpanelHome.TrimEnd('/'))/db-maintenance"
$marker = "bornohin-db-wipe"
# Stamped into the completion line so a log left by an earlier run can never be
# mistaken for this one's result. Without it the poll below matched the previous
# invocation's output the instant it started, and reported its failure as ours.
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
only overwrites files that already exist ("The file X does not exist for the
account"). upload_files is the same primitive deploy-cpanel.ps1 uses for the
release archive, so it is known to work here.
#>
function Save-RemoteFile {
    param([string]$Dir, [string]$Name, [string]$Content)

    $staging = Join-Path ([System.IO.Path]::GetTempPath()) $Name
    # LF and no BOM: psql reads these, and a BOM ahead of the first statement is
    # a syntax error.
    [System.IO.File]::WriteAllText($staging, ($Content -replace "`r`n", "`n"), (New-Object System.Text.UTF8Encoding $false))
    try {
        # overwrite=1: without it a re-run fails with "The file X you uploaded
        # already exists" and leaves the previous run's SQL in place.
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
# --- removal is guarded the same way deploy-cpanel.ps1 guards the reaper.
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
#>
function Invoke-RemoteCommand {
    param([string]$Command, [string]$OutputName, [int]$TimeoutSeconds = 300)

    if ($Command.Contains('%')) { throw "Remote command contains '%', which cron truncates." }
    if ($Command -match "[`r`n]") { throw "Remote command contains a newline; cron cannot store it." }
    if (@(Get-JobKeys).Count) { throw "A '$marker' cron entry already exists; clear it in cPanel > Cron Jobs first." }

    $outPath = "$workDir/$OutputName"
    $done = "$marker-$runId-exit"
    $wrapped = "{ $Command ; echo $done=`$? ; } > $outPath 2>&1"

    # Belt and braces alongside the run id: clear the previous log so a partial
    # read cannot show stale text either.
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
Write-OK "Target: $liveDatabase on $CpanelHost ($([math]::Round(($databases.data | Select-Object -First 1).disk_usage / 1MB, 2)) MB)"

Write-Step "Preparing the administrator credential"
$adminEmail = ($env:ADMIN_EMAIL, "admin@bornohin.com" | Where-Object { $_ })[0].Trim().ToLowerInvariant()
$adminName = ($env:ADMIN_NAME, "Bornohin Admin" | Where-Object { $_ })[0].Trim()
$adminPassword = $env:ADMIN_PASSWORD
if (-not $adminPassword) { throw "Set ADMIN_PASSWORD locally - it is the password the wiped database will be left with." }
if ($adminPassword.Length -lt 12) { throw "ADMIN_PASSWORD must contain at least 12 characters." }

# Hashed here so the plaintext never reaches the server or the crontab.
Push-Location $ProjectRoot
try {
    $adminHash = (node -e "process.stdout.write(require('bcryptjs').hashSync(process.env.ADMIN_PASSWORD, 12))").Trim()
} finally { Pop-Location }
if ($adminHash -notmatch '^\$2[aby]\$') { throw "Could not generate the administrator password hash." }
Write-OK "Administrator after the wipe: $adminEmail"

Write-Step "Uploading the wipe definition"
# UAPI has no Fileman::mkdir on this cPanel build; API2 does. Succeeds silently
# when the directory is already there.
Invoke-Api2 -Module "Fileman" -Function "mkdir" -Arguments @{
    path = $CpanelHome.TrimEnd('/'); name = "db-maintenance"
} | Out-Null
$wipeSql = Get-Content -LiteralPath (Join-Path $ProjectRoot "prisma\wipe.sql") -Raw

# Single-quoted SQL literals: double any quote in the values before embedding.
function ConvertTo-SqlLiteral { param([string]$Value) return "'" + $Value.Replace("'", "''") + "'" }
# Table is "users", not "User": every model carries an @@map to a snake_case
# name (prisma/schema.prisma). Columns keep their camelCase field names, so they
# must stay double-quoted. 'super_admin' is a UserRole enum member.
$adminSql = @"
-- Generated by scripts/wipe-production-db.ps1. The wipe leaves no users behind,
-- so the administrator is inserted straight back to avoid a lockout.
INSERT INTO public.users (id, name, email, "passwordHash", role, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, $(ConvertTo-SqlLiteral $adminName), $(ConvertTo-SqlLiteral $adminEmail), $(ConvertTo-SqlLiteral $adminHash), 'super_admin', now(), now())
ON CONFLICT (email) DO UPDATE
   SET name = EXCLUDED.name, "passwordHash" = EXCLUDED."passwordHash", role = 'super_admin', "updatedAt" = now();
"@

Save-RemoteFile -Dir $workDir -Name "wipe.sql" -Content $wipeSql
Save-RemoteFile -Dir $workDir -Name "admin.sql" -Content $adminSql
Write-OK "wipe.sql and admin.sql staged in $workDir"

<#
Reads DATABASE_URL from the Passenger configuration, which is where the running
application actually gets it - NOT from $absoluteAppRoot/.env. That file is a
stale copy of somebody's development .env pointing at localhost/ecommerce;
sourcing it sent an earlier run of this script at the wrong database, and only
pg_hba.conf stopped it. The value is never echoed.

The second line is the guard that failure earned: the URL must name the database
the operator confirmed, or nothing runs.
#>
$passengerConf = "$($CpanelHome.TrimEnd('/'))/public_html/.htaccess"
# Built as one line on purpose: a crontab command cannot contain a newline, and
# a here-string that still holds them makes Cron::add_line fail with no detail.
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

if (-not $SkipBackup) {
    Write-Step "Backing up before anything is deleted"
    $stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
    $dumpPath = "$workDir/pre-wipe-$stamp.sql.gz"
    # See the identical note in apply-production-migration.ps1: piping pg_dump
    # into gzip hid pg_dump's exit status behind gzip's, so this backup — the
    # only thing standing between a wipe and permanent data loss — could be an
    # empty archive that passed the success check.
    $output = Invoke-RemoteCommand `
        -Command "$loadEnv && pg_dump -Z 9 -f $dumpPath `"`$PSQL_URL`" && [ `"`$(wc -c < $dumpPath)`" -gt 1000 ] && ls -l $dumpPath" `
        -OutputName "backup.log" -TimeoutSeconds 600
    Assert-RemoteSuccess -Output $output -What "pg_dump (or the backup was empty/truncated)"
    Write-OK "Backup written to $dumpPath"
    Write-Host $output.Trim()
} else {
    Write-Warn "-SkipBackup was passed. A wipe without a dump cannot be undone."
}

Write-Step "Wiping $liveDatabase and recreating the administrator"
# ON_ERROR_STOP so a failed TRUNCATE cannot fall through to reporting success.
$output = Invoke-RemoteCommand `
    -Command "$loadEnv && psql -v ON_ERROR_STOP=1 `"`$PSQL_URL`" -f $workDir/wipe.sql -f $workDir/admin.sql && psql -t `"`$PSQL_URL`" -c 'SELECT count(*) FROM public.users' -c 'SELECT count(*) FROM public.products' -c 'SELECT count(*) FROM public.orders'" `
    -OutputName "wipe.log" -TimeoutSeconds 600
Assert-RemoteSuccess -Output $output -What "The wipe"
Write-OK "Database wiped"
Write-Host $output.Trim()

<#
The application caches query results in-process, so until it restarts the
storefront keeps serving the rows that were just deleted. Touching
tmp/restart.txt is not enough - this host ignores it for a healthy
Passenger-parented process, which is why deploy-cpanel.ps1 asks the app to exit
over HTTP instead. Same approach here, with the touch kept as a nudge.
#>
Write-Step "Restarting the application so no request reuses cached rows"
$restartToken = $env:DEPLOY_RESTART_TOKEN
if (-not $restartToken) { $restartToken = [Environment]::GetEnvironmentVariable("DEPLOY_RESTART_TOKEN", "User") }

$pidBefore = $null
try { $pidBefore = (Invoke-RestMethod -Uri "$($AppUrl.TrimEnd('/'))/api/version" -TimeoutSec 30).pid } catch { }

Invoke-RemoteCommand -Command "touch $absoluteAppRoot/tmp/restart.txt && echo touched" -OutputName "restart.log" -TimeoutSeconds 300 | Out-Null

if ($restartToken) {
    try {
        # A dead connection here means the process exited before replying, which
        # is the outcome being asked for.
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
    Write-Warn "The process did not change. It is still serving pre-wipe cached data."
    Write-Warn "Restart the application from cPanel > Setup Node.js App, then re-check $AppUrl/shop."
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

Done. The database is empty apart from the administrator.
  Sign in at $AppUrl/login as $adminEmail
  Backup and staged SQL remain in $workDir - delete them once you are satisfied.
"@ -ForegroundColor Green
