<#
.SYNOPSIS
Build and deploy the Bornohin standalone Next.js application through cPanel.

.DESCRIPTION
Uses a cPanel API token over verified HTTPS. It does not use FTP, publish a web
extractor, disable TLS verification, delete domains, or delete databases.
#>

param(
    [string]$ProjectRoot,
    [string]$DeployDir,
    [string]$CpanelHost = "bd10.exonhost.com",
    [string]$CpanelUser = "bornohin",
    [string]$CpanelHome = "/home/bornohin",
    [string]$CpanelApiToken = $env:CPANEL_API_TOKEN,
    [string]$AppRoot = "bornohin_app",
    [string]$AppUrl = "https://bornohin.com",
    [string]$ConfirmAppRoot,
    [string]$RestartToken = $env:DEPLOY_RESTART_TOKEN,
    [switch]$SkipBuild,
    [switch]$DryRun,
    [switch]$SelfTestReaper
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# A shell started before the variable was persisted keeps the old environment,
# so fall back to the stored user value rather than silently deploying without
# the ability to stop a stale process.
if (-not $RestartToken -and $IsWindows) {
    $RestartToken = [Environment]::GetEnvironmentVariable("DEPLOY_RESTART_TOKEN", "User")
}

if (-not $ProjectRoot) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $ProjectRoot = Split-Path -Parent $scriptDir
}
if (-not $DeployDir) {
    $DeployDir = Join-Path $env:TEMP "bornohin-cpanel-deploy"
}

function Write-Step { param([string]$Text) Write-Host "`n==> $Text" -ForegroundColor Cyan }
function Write-OK { param([string]$Text) Write-Host "    $Text" -ForegroundColor Green }
function Write-Warn { param([string]$Text) Write-Host "    $Text" -ForegroundColor Yellow }
function Stop-Deploy { param([string]$Text) throw $Text }

# Every observation the verification phase makes, so a failed deploy can say
# exactly what it saw rather than only that it gave up.
$script:DeployLog = [System.Collections.Generic.List[object]]::new()
function Add-DeployLog {
    # Not $Event: that is a PowerShell automatic variable.
    param([string]$EventName, [hashtable]$Data = @{})
    $entry = [ordered]@{ at = (Get-Date).ToUniversalTime().ToString("o"); event = $EventName }
    foreach ($key in $Data.Keys) { $entry[$key] = $Data[$key] }
    $script:DeployLog.Add([pscustomobject]$entry) | Out-Null
}

<#
Returns the running application's own identity, or $null when the endpoint is
unreachable or absent. /api/version reports the commit inlined into the running
bundle, so a process still serving an old release cannot answer with the release
that was just extracted onto disk beside it.
#>
function Get-LiveVersion {
    try {
        $response = Invoke-WebRequest -Uri "$($AppUrl.TrimEnd('/'))/api/version" `
            -Headers @{ "Cache-Control" = "no-cache" } -TimeoutSec 20 -SkipHttpErrorCheck
        # 200 = ready, 409 = files newer than the process. Both carry a body.
        if ($response.StatusCode -notin @(200, 409)) { return $null }
        return $response.Content | ConvertFrom-Json
    } catch {
        return $null
    }
}

function Invoke-CpanelApi2 {
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
        -Headers @{ Authorization = "cpanel ${CpanelUser}:$CpanelApiToken" } -TimeoutSec 120
}

# Selects by age, not by parent. Orphaning was only ever half the problem: this
# host ignores tmp/restart.txt for healthy Passenger-parented processes too, so
# filtering on PPID==1 left the common case untouched. Anything older than two
# minutes predates this deploy; a freshly spawned process is far younger, and
# the reaper is removed within seconds of one answering. The age guard also
# stops the awk process matching its own command line. No '%': an unescaped
# percent sign truncates a crontab command at that character.
$script:ReapCommand = 'ps -eo pid,etimes,args | awk ''$2 > 120 && /next-server/ {print $1}'' | xargs -r kill'

function Get-ReaperLineKeys {
    $response = Invoke-CpanelApi2 -Module "Cron" -Function "fetchcron"
    return @($response.cpanelresult.data |
        # Environment lines such as MAILTO= come back with no 'command' property
        # at all, and Set-StrictMode turns a bare $_.command on those into a
        # terminating error — which once left the reaper running.
        Where-Object { $_.PSObject.Properties['command'] -and "$($_.command)".Contains("next-server") } |
        ForEach-Object { $_.linekey })
}

function Remove-Reaper {
    # The linekey changes whenever the crontab is rewritten, so it is re-read
    # here rather than remembered from when the entry was added. Trusting a
    # stale key is how a kill-every-minute cron once survived a deploy.
    # Every call site wraps in @(): PowerShell unwraps a one-element array on
    # return, and .Count on the resulting scalar is fatal under StrictMode.
    foreach ($attempt in 1..3) {
        $keys = @(Get-ReaperLineKeys)
        if (-not $keys.Count) { return $true }
        foreach ($key in $keys) {
            Invoke-CpanelApi2 -Module "Cron" -Function "remove_line" -Arguments @{ linekey = $key } | Out-Null
        }
    }
    return -not @(Get-ReaperLineKeys).Count
}

<#
Last-resort restart for a process that cannot be asked to exit over HTTP —
either it predates /api/deploy/restart or it is wedged. Runs the reaper once a
minute for as long as it takes, then removes itself and proves it is gone.
#>
function Invoke-OrphanReaper {
    param([scriptblock]$IsLive, [int]$TimeoutSeconds = 240)

    Write-Warn "Falling back to the orphan reaper (the app cannot restart itself)."
    Add-DeployLog "reaper_installed" @{}

    $installed = Invoke-CpanelApi2 -Module "Cron" -Function "add_line" -Arguments @{
        command = $script:ReapCommand
        minute  = "*"
        hour    = "*"
        day     = "*"
        month   = "*"
        weekday = "*"
    }
    # Confirm by reading it back. A truthy API response is not proof the entry
    # exists, and an unnoticed failure here would strand the deploy waiting on a
    # reaper that was never running.
    if (-not $installed -or -not @(Get-ReaperLineKeys).Count) {
        Remove-Reaper | Out-Null
        Stop-Deploy "Could not install the orphan reaper cron entry."
    }

    $live = $false
    try {
        $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
        while ((Get-Date) -lt $deadline) {
            Start-Sleep -Seconds 10
            if (& $IsLive) { $live = $true; break }
        }
    } finally {
        # Runs even on Ctrl-C or a throw above. Leaving this cron behind would
        # kill the application every minute, forever.
        $removed = Remove-Reaper
        Add-DeployLog "reaper_removed" @{ confirmed = $removed }
        if ($removed) {
            Write-OK "Orphan reaper removed and its absence confirmed"
        } else {
            Write-Host @"

    !! THE ORPHAN REAPER COULD NOT BE REMOVED AUTOMATICALLY !!
    A cron entry is still killing the application every minute. Remove it now:
      cPanel > Cron Jobs > delete the entry containing 'next-server'
    Command: $($script:ReapCommand)
"@ -ForegroundColor Red
        }
    }

    return $live
}

# Asks the process that answers this request to exit. It is the only restart
# path that still reaches a process orphaned to PPID 1.
function Request-AppRestart {
    if (-not $RestartToken) { return 0 }
    try {
        $response = Invoke-WebRequest -Uri "$($AppUrl.TrimEnd('/'))/api/deploy/restart" `
            -Method Post -Headers @{ "x-deploy-token" = $RestartToken } `
            -TimeoutSec 20 -SkipHttpErrorCheck
        return [int]$response.StatusCode
    } catch {
        # The process can die before the response is written, which is a success.
        return 0
    }
}

if ($ConfirmAppRoot -ne $AppRoot) {
    Stop-Deploy "Pass -ConfirmAppRoot '$AppRoot' after verifying the Passenger app root in cPanel."
}
if (-not $DryRun -and -not $CpanelApiToken) {
    Stop-Deploy "Set CPANEL_API_TOKEN locally. Do not put the token in source control or chat."
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Stop-Deploy "Node.js is not available." }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { Stop-Deploy "npm is not available." }
if (-not (Get-Command curl.exe -ErrorAction SilentlyContinue)) { Stop-Deploy "curl.exe is not available." }

<#
Exercises the cron install / detect / remove path with a command that touches
nothing. That path has the worst failure mode in this script — a crash between
installing the reaper and removing it leaves a cron killing the application
every minute — so it gets a way to be tested without pointing it at production.
#>
if ($SelfTestReaper) {
    Write-Step "Reaper self-test — harmless command, no process is touched"
    $script:ReapCommand = "echo next-server-selftest > /dev/null"

    $before = @(Get-ReaperLineKeys).Count
    if ($before) { Stop-Deploy "A reaper-like cron entry already exists; clear it before self-testing." }

    $result = Invoke-OrphanReaper -IsLive { $true } -TimeoutSeconds 30
    $after = @(Get-ReaperLineKeys).Count

    if (-not $result) { Stop-Deploy "Self-test failed: the reaper never reported success." }
    if ($after) { Stop-Deploy "Self-test FAILED: $after reaper entr(y/ies) left behind. Remove them in cPanel > Cron Jobs." }

    Write-OK "Self-test passed: entry installed, detected, removed, and absence confirmed."
    exit 0
}

$releaseCommit = (& git -C $ProjectRoot rev-parse HEAD 2>$null)
if (-not $releaseCommit) { Stop-Deploy "Could not resolve the release commit with git rev-parse HEAD." }

# Compiled into the bundle so /api/version reports the identity of the code a
# process loaded, not whatever RELEASE.json happens to be on disk at read time.
# It must be set before the build or the endpoint reports null forever.
$env:NEXT_PUBLIC_RELEASE_COMMIT = $releaseCommit

if (-not $SkipBuild) {
    # eslint exhausts the default V8 heap on this project and exits 134, which
    # aborts the deploy below. Raise it unless the caller already tuned it.
    if ($env:NODE_OPTIONS -notmatch "max-old-space-size") {
        $env:NODE_OPTIONS = "$($env:NODE_OPTIONS) --max-old-space-size=8192".Trim()
    }

    Push-Location $ProjectRoot
    try {
        Write-Step "Installing locked dependencies"
        npm ci
        if ($LASTEXITCODE -ne 0) { Stop-Deploy "npm ci failed." }

        Write-Step "Generating Prisma client"
        npm run prisma:generate
        if ($LASTEXITCODE -ne 0) { Stop-Deploy "Prisma generation failed." }

        Write-Step "Running lint"
        npm run lint
        if ($LASTEXITCODE -ne 0) { Stop-Deploy "Lint failed." }

        Write-Step "Building standalone application"
        npm run build
        if ($LASTEXITCODE -ne 0) { Stop-Deploy "Build failed." }
    } finally {
        Pop-Location
    }
}

$standaloneDir = Join-Path $ProjectRoot ".next\standalone"
$serverEntry = Join-Path $standaloneDir "server.js"
if (-not (Test-Path -LiteralPath $serverEntry -PathType Leaf)) {
    Stop-Deploy "Standalone server.js was not found. Run a successful production build first."
}

Write-Step "Preparing release bundle"
if (Test-Path -LiteralPath $DeployDir) {
    $resolvedDeployDir = (Resolve-Path -LiteralPath $DeployDir).Path
    $resolvedTemp = (Resolve-Path -LiteralPath $env:TEMP).Path
    if (-not $resolvedDeployDir.StartsWith($resolvedTemp, [System.StringComparison]::OrdinalIgnoreCase)) {
        Stop-Deploy "Refusing to clean a deploy directory outside the current temporary directory."
    }
    Remove-Item -LiteralPath $resolvedDeployDir -Recurse -Force
}

New-Item -ItemType Directory -Path (Join-Path $DeployDir ".next") -Force | Out-Null
<#
Next's file tracing copies the whole project into .next/standalone — src, tests,
e2e, docs, docker-compose, package-lock and, worst of all, .env. Shipping that
put the developer's own AUTH_SECRET and ADMIN_PASSWORD in the production app root
on every deploy, and the stale DATABASE_URL in that .env (naming a database that
does not exist on the host) later aimed a maintenance script at the wrong target.
Only server.js, .next, public, package.json and node_modules are runtime.
Production takes its environment from the Passenger SetEnv directives in
public_html/.htaccess, never from a deployed file.
#>
$notRuntime = @(
    ".env", ".env.local", ".env.production", ".kilo", "deploy-package",
    "src", "tests", "e2e", "docs", "scripts",
    "docker-compose.yml", "docker-compose.override.yml",
    "package-lock.json", "cpanel-preflight.json", "deploy-log.jsonl"
)
Get-ChildItem -LiteralPath $standaloneDir -Force |
    Where-Object { $_.Name -notin $notRuntime -and $_.Name -notlike "dev-*.log" } |
    Copy-Item -Destination $DeployDir -Recurse -Force

# A .env reaching the server would silently outrank nothing but would still be a
# credential sitting in a web account, so fail loudly rather than ship one.
$leaked = Get-ChildItem -LiteralPath $DeployDir -Force -Recurse -Depth 0 |
    Where-Object { $_.Name -like ".env*" }
if ($leaked) { Stop-Deploy "Refusing to deploy: $($leaked.Name -join ', ') is in the release bundle." }
Copy-Item -LiteralPath (Join-Path $ProjectRoot ".next\static") -Destination (Join-Path $DeployDir ".next\static") -Recurse -Force
Copy-Item -LiteralPath (Join-Path $ProjectRoot "public") -Destination (Join-Path $DeployDir "public") -Recurse -Force
New-Item -ItemType Directory -Path (Join-Path $DeployDir "tmp") -Force | Out-Null

$absoluteAppRoot = "$($CpanelHome.TrimEnd("/"))/$($AppRoot.Trim("/"))"

# RELEASE.json is not part of the standalone output, so without this it survives
# every extraction untouched and keeps describing whatever shipped first. Write it
# into the bundle so the rollback commit recorded on the server is real.
$buildIdPath = Join-Path $ProjectRoot ".next\BUILD_ID"
$previousRelease = $null
if (-not $DryRun) {
    try {
        $releaseUri = "https://${CpanelHost}:2083/execute/Fileman/get_file_content" +
            "?dir=$([Uri]::EscapeDataString($absoluteAppRoot))&file=RELEASE.json"
        $existing = Invoke-RestMethod -Uri $releaseUri -Headers @{ Authorization = "cpanel ${CpanelUser}:$CpanelApiToken" } -TimeoutSec 60
        if ($existing.status -eq 1 -and $existing.data.content) {
            $previousRelease = ($existing.data.content | ConvertFrom-Json).releaseCommit
        }
    } catch {
        Write-Host "    Could not read the previous RELEASE.json; rollbackCommit will be null." -ForegroundColor Yellow
    }
}
@{
    releaseCommit  = $releaseCommit
    rollbackCommit = $previousRelease
    buildId        = if (Test-Path -LiteralPath $buildIdPath) { (Get-Content -LiteralPath $buildIdPath -Raw).Trim() } else { $null }
    nextVersion    = (Get-Content -LiteralPath (Join-Path $ProjectRoot "package.json") -Raw | ConvertFrom-Json).dependencies.next
    deployedAt     = (Get-Date).ToUniversalTime().ToString("o")
} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $DeployDir "RELEASE.json") -Encoding UTF8

# Remembered before the bundle is cleaned up, to probe after the restart.
$probeAsset = Get-ChildItem -LiteralPath (Join-Path $DeployDir ".next\static\chunks") -Filter "*.css" -File -ErrorAction SilentlyContinue |
    Select-Object -First 1
$probeAssetName = if ($probeAsset) { $probeAsset.Name } else { $null }

$archivePath = Join-Path $env:TEMP "bornohin-release.zip"
if (Test-Path -LiteralPath $archivePath) { Remove-Item -LiteralPath $archivePath -Force }
Compress-Archive -Path (Join-Path $DeployDir "*") -DestinationPath $archivePath -Force
Write-OK "Release archive created at $archivePath"

if ($DryRun) {
    Write-Host "    [dry-run] upload $archivePath to $absoluteAppRoot/bornohin-release.zip"
    Write-Host "    [dry-run] extract archive and touch $absoluteAppRoot/tmp/restart.txt"
    Remove-Item -LiteralPath $archivePath -Force
    Remove-Item -LiteralPath $DeployDir -Recurse -Force
    exit 0
}

$authorization = "Authorization: cpanel ${CpanelUser}:$CpanelApiToken"
$uploadUrl = "https://${CpanelHost}:2083/execute/Fileman/upload_files"

Write-Step "Recording what production is serving right now"
$previousVersion = Get-LiveVersion
$previousPids = @()
if ($previousVersion) {
    $previousPids = @($previousVersion.pid)
    Write-OK "Live: commit $($previousVersion.commit) pid $($previousVersion.pid) up since $($previousVersion.startedAt)"
    Add-DeployLog "pre_deploy_state" @{
        commit = $previousVersion.commit; processId = $previousVersion.pid; startedAt = $previousVersion.startedAt
    }
} else {
    Write-Warn "/api/version did not answer. The running build predates it, so the"
    Write-Warn "old process cannot be identified or asked to exit — this deploy falls"
    Write-Warn "back to the static-asset probe and may need a manual restart."
    Add-DeployLog "pre_deploy_state" @{ commit = $null; note = "version endpoint unavailable" }
}
if (-not $RestartToken) {
    Write-Warn "DEPLOY_RESTART_TOKEN is not set; the deploy cannot stop a stale process itself."
}

Write-Step "Uploading release through cPanel UAPI"
$uploadResponse = curl.exe --fail-with-body --silent --show-error `
    -H $authorization `
    -F "file-1=@$archivePath;filename=bornohin-release.zip" `
    -F "dir=$AppRoot" `
    $uploadUrl
if ($LASTEXITCODE -ne 0 -or $uploadResponse -notmatch '"status"\s*:\s*1') {
    Stop-Deploy "cPanel upload failed: $($uploadResponse.Substring(0, [Math]::Min(500, $uploadResponse.Length)))"
}
Write-OK "Release uploaded"

function Invoke-CpanelFileOperation {
    param(
        [string]$Operation,
        [string]$Source,
        [string]$Destination = ""
    )

    $query = @{
        cpanel_jsonapi_user = $CpanelUser
        cpanel_jsonapi_apiversion = "2"
        cpanel_jsonapi_module = "Fileman"
        cpanel_jsonapi_func = "fileop"
        filelist = "1"
        multiform = "1"
        doubledecode = "0"
        op = $Operation
        sourcefiles = $Source
    }
    if ($Destination) { $query.destfiles = $Destination }

    $queryString = ($query.GetEnumerator() | ForEach-Object {
        "$([Uri]::EscapeDataString($_.Key))=$([Uri]::EscapeDataString($_.Value))"
    }) -join "&"
    $response = Invoke-WebRequest `
        -Uri "https://${CpanelHost}:2083/json-api/cpanel?$queryString" `
        -Headers @{ Authorization = "cpanel ${CpanelUser}:$CpanelApiToken" } `
        -TimeoutSec 300

    if ($response.StatusCode -notin 200..299 -or $response.Content -notmatch '"result"\s*:\s*1') {
        Stop-Deploy "cPanel file operation '$Operation' failed."
    }
}

function Sync-CpanelAppPassengerConfig {
    param(
        [string]$DesiredApiUrl,
        [string]$DesiredAppRoot
    )

    $htaccessDir = "/home/bornohin/public_html"
    $readResponse = Invoke-RestMethod `
        -Uri "https://${CpanelHost}:2083/execute/Fileman/get_file_content?dir=$([Uri]::EscapeDataString($htaccessDir))&file=.htaccess" `
        -Headers @{ Authorization = "cpanel ${CpanelUser}:$CpanelApiToken" } `
        -Method Get

    if ($readResponse.status -ne 1 -or -not $readResponse.data.content) {
        Stop-Deploy "Failed to read the live cPanel .htaccess file."
    }

    $updatedContent = $readResponse.data.content
    $updatedContent = [regex]::Replace(
        $updatedContent,
        '(?m)^PassengerAppRoot\s+".*"$',
        "PassengerAppRoot `"$DesiredAppRoot`""
    )
    $updatedContent = [regex]::Replace(
        $updatedContent,
        '(?m)^SetEnv API_URL\s+.*$',
        "SetEnv API_URL $DesiredApiUrl"
    )

    # The app reads DEPLOY_RESTART_TOKEN from the environment; SetEnv here is how
    # every other secret on this host reaches Passenger. Without it in sync the
    # restart endpoint 404s and the next deploy has to fall back to the reaper.
    if ($RestartToken) {
        $tokenLine = "SetEnv DEPLOY_RESTART_TOKEN $RestartToken"
        if ($updatedContent -match '(?m)^SetEnv DEPLOY_RESTART_TOKEN\s+.*$') {
            $updatedContent = [regex]::Replace($updatedContent, '(?m)^SetEnv DEPLOY_RESTART_TOKEN\s+.*$', $tokenLine)
        } else {
            $updatedContent = [regex]::Replace(
                $updatedContent,
                '(?m)^SetEnv API_URL\s+.*$',
                "SetEnv API_URL $DesiredApiUrl`n$tokenLine"
            )
        }
    }

    if ($updatedContent -eq $readResponse.data.content) {
        return
    }

    $saveResponse = Invoke-RestMethod `
        -Uri "https://${CpanelHost}:2083/execute/Fileman/save_file_content" `
        -Headers @{ Authorization = "cpanel ${CpanelUser}:$CpanelApiToken" } `
        -Method Post `
        -Body @{
            dir = $htaccessDir
            file = ".htaccess"
            content = $updatedContent
        }

    if ($saveResponse.status -ne 1) {
        Stop-Deploy "Failed to synchronize the live API_URL in cPanel."
    }

    Write-OK "Live PassengerAppRoot and API_URL synced"
}

function Sync-CpanelReadinessFallback {
    $publicHtmlDir = "/home/bornohin/public_html"

    $readinessPhp = @'
<?php
header('Content-Type: application/json');
header('Cache-Control: no-store');

function respond($status, $ok, $state, $reason = null) {
    http_response_code($status);
    $payload = [
        'ok' => $ok,
        'state' => $state,
        'service' => 'bornohin-api',
        'timestamp' => gmdate('c'),
        'checks' => [
            $reason === null
                ? [
                    'name' => 'postgresql',
                    'required' => true,
                    'status' => 'pass',
                ]
                : [
                    'name' => 'postgresql',
                    'required' => true,
                    'status' => 'fail',
                    'reason' => $reason,
                ],
        ],
    ];

    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

$databaseUrl = getenv('DATABASE_URL') ?: '';
if (trim($databaseUrl) === '') {
    respond(503, false, 'not_ready', 'DATABASE_URL is not configured');
}

$connectionString = preg_replace('/\?schema=[^&]+$/', '', $databaseUrl);
if (!is_string($connectionString) || trim($connectionString) === '') {
    respond(503, false, 'not_ready', 'DATABASE_URL is not configured');
}

$command = 'psql ' . escapeshellarg($connectionString) . ' -tAc ' . escapeshellarg('SELECT 1') . ' 2>&1';
$output = [];
$exitCode = 0;
exec($command, $output, $exitCode);

if ($exitCode !== 0 || !in_array('1', array_map('trim', $output), true)) {
    respond(503, false, 'not_ready', 'PostgreSQL is unavailable');
}

respond(200, true, 'ready');
'@

    $readResponse = Invoke-RestMethod `
        -Uri "https://${CpanelHost}:2083/execute/Fileman/get_file_content?dir=$([Uri]::EscapeDataString($publicHtmlDir))&file=ready.php" `
        -Headers @{ Authorization = "cpanel ${CpanelUser}:$CpanelApiToken" } `
        -Method Get

    if ($readResponse.status -ne 1 -or $readResponse.data.content -ne $readinessPhp) {
        $saveResponse = Invoke-RestMethod `
            -Uri "https://${CpanelHost}:2083/execute/Fileman/save_file_content" `
            -Headers @{ Authorization = "cpanel ${CpanelUser}:$CpanelApiToken" } `
            -Method Post `
            -Body @{
                dir = $publicHtmlDir
                file = "ready.php"
                content = $readinessPhp
            }

        if ($saveResponse.status -ne 1) {
            Stop-Deploy "Failed to synchronize the live readiness fallback."
        }

        Write-OK "Live readiness fallback synced"
    }

    $htaccessResponse = Invoke-RestMethod `
        -Uri "https://${CpanelHost}:2083/execute/Fileman/get_file_content?dir=$([Uri]::EscapeDataString($publicHtmlDir))&file=.htaccess" `
        -Headers @{ Authorization = "cpanel ${CpanelUser}:$CpanelApiToken" } `
        -Method Get

    if ($htaccessResponse.status -ne 1 -or -not $htaccessResponse.data.content) {
        Stop-Deploy "Failed to read the live cPanel .htaccess file for readiness sync."
    }

    $updatedContent = $htaccessResponse.data.content
    if ($updatedContent -notmatch '(?m)^RewriteRule \^api/health/ready/\?\$ /ready.php \[L\]$') {
        if ($updatedContent -match '(?m)^RewriteEngine On$') {
            $updatedContent = [regex]::Replace(
                $updatedContent,
                '(?m)^RewriteEngine On$',
                "RewriteEngine On`nRewriteRule ^api/health/ready/?$ /ready.php [L]"
            )
        } else {
            $updatedContent = "RewriteEngine On`nRewriteRule ^api/health/ready/?$ /ready.php [L]`n$updatedContent"
        }
    }

    if ($updatedContent -ne $htaccessResponse.data.content) {
        $saveResponse = Invoke-RestMethod `
            -Uri "https://${CpanelHost}:2083/execute/Fileman/save_file_content" `
            -Headers @{ Authorization = "cpanel ${CpanelUser}:$CpanelApiToken" } `
            -Method Post `
            -Body @{
                dir = $publicHtmlDir
                file = ".htaccess"
                content = $updatedContent
            }

        if ($saveResponse.status -ne 1) {
            Stop-Deploy "Failed to synchronize the live readiness rewrite."
        }

        Write-OK "Live readiness rewrite synced"
    }
}

Write-Step "Extracting release into the confirmed Passenger app root"
$remoteArchive = "$absoluteAppRoot/bornohin-release.zip"
Invoke-CpanelFileOperation -Operation "extract" -Source $remoteArchive -Destination $absoluteAppRoot
Invoke-CpanelFileOperation -Operation "unlink" -Source $remoteArchive
Write-OK "Release extracted and archive removed"

Sync-CpanelAppPassengerConfig -DesiredApiUrl "https://bornohin.com/api" -DesiredAppRoot $absoluteAppRoot
Sync-CpanelReadinessFallback

Write-Step "Restarting Passenger"
$restartFile = Join-Path $env:TEMP "restart.txt"
Set-Content -LiteralPath $restartFile -Value (Get-Date -Format o) -Encoding ASCII
$remoteRestartFile = "$absoluteAppRoot/tmp/restart.txt"
try {
    Invoke-CpanelFileOperation -Operation "unlink" -Source $remoteRestartFile
} catch {
    # The marker is often missing on the first deploy, which is fine.
}
$restartResponse = curl.exe --fail-with-body --silent --show-error `
    -H $authorization `
    -F "file-1=@$restartFile;filename=restart.txt" `
    -F "dir=$AppRoot/tmp" `
    $uploadUrl
if ($LASTEXITCODE -ne 0 -or $restartResponse -notmatch '"status"\s*:\s*1') {
    Stop-Deploy "Passenger restart trigger failed."
}
Write-OK "Passenger restart requested"
Add-DeployLog "restart_requested" @{ mechanism = "tmp/restart.txt" }

Remove-Item -LiteralPath $restartFile -Force
Remove-Item -LiteralPath $archivePath -Force
Remove-Item -LiteralPath $DeployDir -Recurse -Force

# tmp/restart.txt is Phusion Passenger's mechanism. This host runs LiteSpeed with
# the CloudLinux Node.js selector, which ignores it, and a process orphaned to
# PPID 1 is invisible to every other restart path the host offers. So the deploy
# does not trust any restart command's exit code: it asks the running process
# what commit it is, and keeps asking it to exit until the answer changes.
Write-Step "Stopping the old build and waiting for the new one"
$deadline = (Get-Date).AddMinutes(6)
$restartRequests = 0
$liveVersion = $null
$sawVersionEndpoint = $false

$startedWaiting = Get-Date
while ((Get-Date) -lt $deadline) {
    Start-Sleep -Seconds 5
    $version = Get-LiveVersion
    if (-not $version) {
        # A build without /api/version will never answer. Stop waiting on it and
        # let the reaper handle it rather than burning the whole deadline.
        if (-not $sawVersionEndpoint -and ((Get-Date) - $startedWaiting).TotalSeconds -gt 60) { break }
        continue
    }
    $sawVersionEndpoint = $true

    if ($version.commit -eq $releaseCommit -and $version.status -eq "ready") {
        $liveVersion = $version
        Add-DeployLog "new_build_answering" @{ commit = $version.commit; processId = $version.pid; startedAt = $version.startedAt }
        break
    }

    Add-DeployLog "stale_process_observed" @{
        commit = $version.commit; status = $version.status; processId = $version.pid; startedAt = $version.startedAt
    }
    Write-Warn "pid $($version.pid) still on commit $($version.commit) (status $($version.status))"

    if (-not $RestartToken -or $restartRequests -ge 6) { continue }

    $restartRequests += 1
    $status = Request-AppRestart
    Add-DeployLog "self_restart_requested" @{ attempt = $restartRequests; httpStatus = $status; targetPid = $version.pid }
    Write-Warn "asked pid $($version.pid) to exit (attempt $restartRequests, http $status)"

    if ($status -eq 404) {
        # The running build has no restart endpoint — retrying cannot help, and
        # waiting out the deadline only delays the reaper that will fix it.
        Write-Warn "That build has no restart endpoint; going straight to the reaper."
        break
    }
    if ($status -eq 401) {
        Write-Warn "Restart rejected: the running build holds a different DEPLOY_RESTART_TOKEN."
        break
    }
    Start-Sleep -Seconds 5
}

if (-not $liveVersion) {
    # Either the running build predates /api/version and cannot be asked to
    # exit, or it answered and refused to. Both end the same way: kill it.
    if (-not $sawVersionEndpoint) {
        Write-Warn "The running build has no /api/version, so it cannot be asked to exit."
    }

    $reaped = Invoke-OrphanReaper -IsLive {
        $probe = Get-LiveVersion
        $probe -and $probe.commit -eq $releaseCommit -and $probe.status -eq "ready"
    }

    if ($reaped) {
        $liveVersion = Get-LiveVersion
        Add-DeployLog "new_build_answering" @{
            commit = $liveVersion.commit; processId = $liveVersion.pid; via = "reaper"
        }
        Write-OK "New build answering after reap: pid $($liveVersion.pid)"
    } else {
        $lastSeen = Get-LiveVersion
        Stop-Deploy @"
The release uploaded and extracted, but production is still serving the previous
build.

  expected commit : $releaseCommit
  serving commit  : $(if ($lastSeen) { $lastSeen.commit } else { "unknown (no /api/version)" })
  serving pid     : $(if ($lastSeen) { "$($lastSeen.pid)  (up since $($lastSeen.startedAt))" } else { "unknown" })
  self-restarts   : $restartRequests requested$(if (-not $RestartToken) { "  [DEPLOY_RESTART_TOKEN not set]" })
  orphan reaper   : ran and timed out

Nothing was rolled back and no data was touched. The previous build is still
running and healthy, so the site is up — the deploy is incomplete, not broken.

Finish it by restarting the application:
  cPanel > Setup Node.js App > $AppRoot > Restart
or over SSH:
  cloudlinux-selector restart --json --interpreter nodejs --user $CpanelUser --app-root $AppRoot
"@
    }
}

# One process answering correctly does not prove the fleet is consistent: an old
# and a new process can serve alternate requests. Sample repeatedly.
if ($liveVersion) {
    Write-Step "Confirming every process serves the new build"
    $commits = @{}
    $pids = @{}
    foreach ($sample in 1..10) {
        $version = Get-LiveVersion
        if (-not $version) { continue }
        $commits[[string]$version.commit] = $true
        $pids[[string]$version.pid] = $true
        Start-Sleep -Milliseconds 400
    }
    Add-DeployLog "fleet_sample" @{ commits = @($commits.Keys); processIds = @($pids.Keys) }

    $stalePids = @($pids.Keys | Where-Object { $previousPids -contains $_ })
    if ($commits.Keys.Count -gt 1) {
        Stop-Deploy "Production is serving more than one build at once: $($commits.Keys -join ', '). Restart the application and re-run the verification."
    }
    if ($stalePids.Count -gt 0) {
        Stop-Deploy "A process from before this deploy is still answering (pid $($stalePids -join ', ')). Restart the application and re-run the verification."
    }
    Write-OK "All $($pids.Keys.Count) sampled response(s) on commit $releaseCommit, pid(s) $($pids.Keys -join ', ')"
}

# Independent of the version endpoint: a stale process 404s the new static
# chunks, so their reachability corroborates what the app reports about itself.
Write-Step "Verifying the new static assets are reachable"
if (-not $probeAssetName) {
    Write-Warn "No CSS chunk available to probe; skipping the asset check."
} else {
    $probeUrl = "$($AppUrl.TrimEnd('/'))/_next/static/chunks/$probeAssetName"
    $assetLive = $false
    foreach ($attempt in 1..12) {
        try {
            if ((Invoke-WebRequest -Uri $probeUrl -TimeoutSec 30 -SkipHttpErrorCheck).StatusCode -eq 200) {
                $assetLive = $true
                break
            }
        } catch {
            # Keep polling; the app may still be coming back up.
        }
        Start-Sleep -Seconds 5
    }
    Add-DeployLog "asset_probe" @{ asset = $probeAssetName; reachable = $assetLive }
    if (-not $assetLive) {
        Stop-Deploy @"
The application reports the new build but $probeUrl is still unreachable, so the
new static assets are not being served. Treat this as a partial deployment:
restart the application and re-run the verification before announcing the release.
"@
    }
    Write-OK "New build is serving ($probeAssetName)"
}

$logPath = Join-Path $ProjectRoot "deploy-log.jsonl"
Add-DeployLog "deploy_complete" @{
    releaseCommit = $releaseCommit
    rollbackCommit = $previousRelease
    previousPids = $previousPids
}
$script:DeployLog | ForEach-Object { $_ | ConvertTo-Json -Compress -Depth 6 } |
    Add-Content -LiteralPath $logPath -Encoding UTF8
Write-OK "Deploy log appended to $logPath"

Write-Host "`nDeployment completed. Run the live smoke checks before DNS cutover." -ForegroundColor Green
