<#
.SYNOPSIS
Creates one new, empty administrator account on the production database. Adds
a row; touches nothing else.

.DESCRIPTION
Reuses wipe-production-db.ps1's proven remote-execution plumbing (Invoke-Uapi,
Invoke-Api2, Save-RemoteFile, Invoke-RemoteCommand, Assert-RemoteSuccess) rather
than inventing a second mechanism. Unlike that script, this one is purely
additive: one INSERT, no TRUNCATE, no pg_dump backup (nothing is at risk), no
Passenger restart (a new row is visible on the next query - no in-process cache
to invalidate for a user that doesn't exist yet).

DATABASE_URL is read from the Passenger configuration in public_html/.htaccess,
never from bornohin_app/.env, and never leaves the server or this process's
memory in printable form. The password is hashed locally with bcryptjs; only
the digest is uploaded.

.EXAMPLE
$env:CPANEL_API_TOKEN = "<short-lived token>"
$env:NEW_ADMIN_PASSWORD = "<strong password>"
.\scripts\create-production-admin.ps1 -ConfirmDatabase bornohin_ecom -AdminEmail dev@bornohin.com
#>
param(
    [string]$ProjectRoot,
    [string]$CpanelHost = "bd10.exonhost.com",
    [string]$CpanelUser = "bornohin",
    [string]$CpanelHome = "/home/bornohin",
    [string]$CpanelApiToken = $env:CPANEL_API_TOKEN,
    [string]$AppUrl = "https://bornohin.com",
    # Typed back by the operator. Nothing runs until it matches the live database.
    [Parameter(Mandatory = $true)][string]$ConfirmDatabase,
    [Parameter(Mandatory = $true)][string]$AdminEmail,
    [string]$AdminName = "Bornohin Admin"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $ProjectRoot) { $ProjectRoot = Split-Path -Parent $PSScriptRoot }
if (-not $CpanelApiToken) { throw "Set CPANEL_API_TOKEN locally. Do not put the token in source control or chat." }

$workDir = "$($CpanelHome.TrimEnd('/'))/db-maintenance"
$marker = "bornohin-admin-create"
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

function Save-RemoteFile {
    param([string]$Dir, [string]$Name, [string]$Content)
    $staging = Join-Path ([System.IO.Path]::GetTempPath()) $Name
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

Write-Step "Preparing the new administrator credential"
$adminEmail = $AdminEmail.Trim().ToLowerInvariant()
$newPassword = $env:NEW_ADMIN_PASSWORD
if (-not $newPassword) {
    $bytes = New-Object byte[] 18
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    $newPassword = [Convert]::ToBase64String($bytes) -replace '[+/=]', '' | ForEach-Object { $_.Substring(0, 20) }
}
if ($newPassword.Length -lt 12) { throw "NEW_ADMIN_PASSWORD must contain at least 12 characters." }

Push-Location $ProjectRoot
try {
    $adminHash = (node -e "process.stdout.write(require('bcryptjs').hashSync(process.env.NEW_ADMIN_PASSWORD, 12))" `
        --% 2>$null)
    $env:NEW_ADMIN_PASSWORD_FOR_NODE = $newPassword
    $adminHash = (cmd /c "set NEW_ADMIN_PASSWORD=%NEW_ADMIN_PASSWORD_FOR_NODE% && node -e ""process.stdout.write(require('bcryptjs').hashSync(process.env.NEW_ADMIN_PASSWORD, 12))""" 2>$null)
} finally { Pop-Location }
if ($adminHash -notmatch '^\$2[aby]\$') { throw "Could not generate the administrator password hash." }
Write-OK "New administrator: $adminEmail"

Write-Step "Confirming the email is not already in use"
# Fails loudly rather than silently overwriting an existing account -
# ON CONFLICT DO NOTHING below is the second layer of the same guard.
$passengerConf = "/home/bornohin/public_html/.htaccess"
$loadEnv = (@(
    "DATABASE_URL=`$(sed -nE 's/^[[:space:]]*SetEnv[[:space:]]+DATABASE_URL[[:space:]]+`"?([^`"]+)`"?[[:space:]]*`$/\1/p' $passengerConf | head -1)"
    "[ -n `"`$DATABASE_URL`" ] || { echo 'DATABASE_URL not found in $passengerConf'; exit 1; }"
    "case `"`$DATABASE_URL`" in *`"/$ConfirmDatabase`"*) : ;; *) echo 'Passenger DATABASE_URL does not name the confirmed database; refusing.'; exit 1 ;; esac"
    "PSQL_URL=`$(echo `"`$DATABASE_URL`" | cut -d'?' -f1)"
    "export DATABASE_URL PSQL_URL"
) -join " && ")
if ($loadEnv -match "[`r`n]") { throw "The DATABASE_URL prelude contains a newline; cron would reject it." }

function ConvertTo-SqlLiteral { param([string]$Value) return "'" + $Value.Replace("'", "''") + "'" }

$existingCheckSql = "SELECT count(*) FROM public.users WHERE email = $(ConvertTo-SqlLiteral $adminEmail);"
Save-RemoteFile -Dir $workDir -Name "check-admin.sql" -Content $existingCheckSql
$checkOutput = Invoke-RemoteCommand `
    -Command "$loadEnv && psql -t `"`$PSQL_URL`" -f $workDir/check-admin.sql" `
    -OutputName "check-admin.log" -TimeoutSeconds 300
Assert-RemoteSuccess -Output $checkOutput -What "The email check"
if ($checkOutput -match "(?m)^\s*1\s*$") {
    throw "$adminEmail already exists on production. Choose a different email or use the existing account."
}
Write-OK "$adminEmail is free"

Write-Step "Creating the administrator"
# ON CONFLICT DO NOTHING as a second guard: if the email won the race between
# the check above and here, this is a no-op instead of an overwrite.
$adminSql = @"
INSERT INTO public.users (id, name, email, "passwordHash", role, "emailVerified", "createdAt", "updatedAt")
VALUES (gen_random_uuid()::text, $(ConvertTo-SqlLiteral $AdminName), $(ConvertTo-SqlLiteral $adminEmail), $(ConvertTo-SqlLiteral $adminHash), 'super_admin', true, now(), now())
ON CONFLICT (email) DO NOTHING;
"@
Save-RemoteFile -Dir $workDir -Name "create-admin.sql" -Content $adminSql
$createOutput = Invoke-RemoteCommand `
    -Command "$loadEnv && psql -v ON_ERROR_STOP=1 `"`$PSQL_URL`" -f $workDir/create-admin.sql -c `"SELECT id, email, role FROM public.users WHERE email = $(ConvertTo-SqlLiteral $adminEmail)`"" `
    -OutputName "create-admin.log" -TimeoutSeconds 300
Assert-RemoteSuccess -Output $createOutput -What "The admin creation"
Write-OK "Administrator row created"
Write-Host $createOutput.Trim()

Write-Host @"

Done. dev@bornohin.com-style admin account created with zero business data.
  Login URL: $AppUrl/login
  Email:     $adminEmail
  Password:  $newPassword
  Role:      super_admin
Store this password now - it is not saved anywhere and was never written to disk in plaintext.
"@ -ForegroundColor Green
