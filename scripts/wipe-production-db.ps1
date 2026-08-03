<#
.SYNOPSIS
Empties the production PostgreSQL database on the cPanel host and recreates the
administrator, without ever exposing a reset endpoint or moving credentials.

.DESCRIPTION
Production's PostgreSQL listens on the cPanel host's loopback, so nothing on a
developer machine can reach it. This script therefore does the work where the
database is: it uploads prisma/wipe.sql plus a generated admin INSERT, then runs
them with the host's own psql from a one-shot cron entry that removes itself.

DATABASE_URL never leaves the server - the cron command sources the application's
own .env. The administrator password is hashed locally and only its bcrypt digest
is uploaded.

pg_dump runs first. The dump stays on the server; nothing here can undo a wipe
without it.

.EXAMPLE
$env:CPANEL_API_TOKEN = "<short-lived token>"
.\scripts\wipe-production-db.ps1 -ConfirmDatabase bornohin_ecom
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
    [switch]$SkipBackup
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $ProjectRoot) { $ProjectRoot = Split-Path -Parent $PSScriptRoot }
if (-not $CpanelApiToken) { throw "Set CPANEL_API_TOKEN locally. Do not put the token in source control or chat." }

$absoluteAppRoot = "$($CpanelHome.TrimEnd('/'))/$($AppRoot.Trim('/'))"
$workDir = "$($CpanelHome.TrimEnd('/'))/db-maintenance"
$marker = "bornohin-db-wipe"

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

function Save-RemoteFile {
    param([string]$Dir, [string]$Name, [string]$Content)
    $response = Invoke-RestMethod -Uri "https://${CpanelHost}:2083/execute/Fileman/save_file_content" `
        -Headers $authHeader -Method Post -TimeoutSec 180 -Body @{
            dir = $Dir; file = $Name; content = $Content; from_charset = "UTF-8"; to_charset = "UTF-8"
        }
    if ($response.status -ne 1) { throw "Could not write $Dir/$Name : $($response.errors -join '; ')" }
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
    if (@(Get-JobKeys).Count) { throw "A '$marker' cron entry already exists; clear it in cPanel > Cron Jobs first." }

    $outPath = "$workDir/$OutputName"
    $wrapped = "{ $Command ; echo ${marker}-exit=`$? ; } > $outPath 2>&1"

    Invoke-Api2 -Module "Cron" -Function "add_line" -Arguments @{
        command = $wrapped; minute = "*"; hour = "*"; day = "*"; month = "*"; weekday = "*"
    } | Out-Null
    if (-not @(Get-JobKeys).Count) { Remove-Job | Out-Null; throw "Could not install the '$marker' cron entry." }

    try {
        $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
        while ((Get-Date) -lt $deadline) {
            Start-Sleep -Seconds 10
            $content = Read-RemoteFile -Dir $workDir -Name $OutputName
            if ($content -and $content.Contains("$marker-exit=")) { return $content }
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
    if ($Output -notmatch "$marker-exit=0(\s|$)") {
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
Invoke-Uapi -Path "Fileman/mkdir" -Query @{ path = $CpanelHome.TrimEnd('/'); name = "db-maintenance" } -Method Post | Out-Null
$wipeSql = Get-Content -LiteralPath (Join-Path $ProjectRoot "prisma\wipe.sql") -Raw

# Single-quoted SQL literals: double any quote in the values before embedding.
function Quote-Sql { param([string]$Value) return "'" + $Value.Replace("'", "''") + "'" }
$adminSql = @"
-- Generated by scripts/wipe-production-db.ps1. The wipe leaves no users behind,
-- so the administrator is inserted straight back to avoid a lockout.
INSERT INTO public."User" (id, name, email, "passwordHash", role, "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, $(Quote-Sql $adminName), $(Quote-Sql $adminEmail), $(Quote-Sql $adminHash), 'super_admin', now(), now())
ON CONFLICT (email) DO UPDATE
   SET name = EXCLUDED.name, "passwordHash" = EXCLUDED."passwordHash", role = 'super_admin', "updatedAt" = now();
"@

Save-RemoteFile -Dir $workDir -Name "wipe.sql" -Content $wipeSql
Save-RemoteFile -Dir $workDir -Name "admin.sql" -Content $adminSql
Write-OK "wipe.sql and admin.sql staged in $workDir"

# `set -a` exports every assignment so psql picks up DATABASE_URL as libpq's URI.
$loadEnv = "set -a && . $absoluteAppRoot/.env && set +a"

if (-not $SkipBackup) {
    Write-Step "Backing up before anything is deleted"
    $stamp = (Get-Date).ToUniversalTime().ToString("yyyyMMdd-HHmmss")
    $dumpPath = "$workDir/pre-wipe-$stamp.sql.gz"
    $output = Invoke-RemoteCommand `
        -Command "$loadEnv && pg_dump `"`$DATABASE_URL`" | gzip -9 > $dumpPath && ls -l $dumpPath" `
        -OutputName "backup.log" -TimeoutSeconds 600
    Assert-RemoteSuccess -Output $output -What "pg_dump"
    Write-OK "Backup written to $dumpPath"
    Write-Host $output.Trim()
} else {
    Write-Warn "-SkipBackup was passed. A wipe without a dump cannot be undone."
}

Write-Step "Wiping $liveDatabase and recreating the administrator"
# ON_ERROR_STOP so a failed TRUNCATE cannot fall through to reporting success.
$output = Invoke-RemoteCommand `
    -Command "$loadEnv && psql -v ON_ERROR_STOP=1 `"`$DATABASE_URL`" -f $workDir/wipe.sql -f $workDir/admin.sql && psql -t `"`$DATABASE_URL`" -c 'SELECT count(*) FROM public.`"User`"' -c 'SELECT count(*) FROM public.`"Product`"' -c 'SELECT count(*) FROM public.`"Order`"'" `
    -OutputName "wipe.log" -TimeoutSeconds 600
Assert-RemoteSuccess -Output $output -What "The wipe"
Write-OK "Database wiped"
Write-Host $output.Trim()

Write-Step "Restarting the application so no request reuses cached rows"
$restartTouch = Invoke-RemoteCommand -Command "touch $absoluteAppRoot/tmp/restart.txt && echo restarted" -OutputName "restart.log" -TimeoutSeconds 300
Assert-RemoteSuccess -Output $restartTouch -What "The restart"
Write-OK "Passenger asked to restart"

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
