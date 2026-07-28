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
    [switch]$SkipBuild,
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $ProjectRoot) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $ProjectRoot = Split-Path -Parent $scriptDir
}
if (-not $DeployDir) {
    $DeployDir = Join-Path $env:TEMP "bornohin-cpanel-deploy"
}

function Write-Step { param([string]$Text) Write-Host "`n==> $Text" -ForegroundColor Cyan }
function Write-OK { param([string]$Text) Write-Host "    $Text" -ForegroundColor Green }
function Stop-Deploy { param([string]$Text) throw $Text }

if ($ConfirmAppRoot -ne $AppRoot) {
    Stop-Deploy "Pass -ConfirmAppRoot '$AppRoot' after verifying the Passenger app root in cPanel."
}
if (-not $DryRun -and -not $CpanelApiToken) {
    Stop-Deploy "Set CPANEL_API_TOKEN locally. Do not put the token in source control or chat."
}
if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Stop-Deploy "Node.js is not available." }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { Stop-Deploy "npm is not available." }
if (-not (Get-Command curl.exe -ErrorAction SilentlyContinue)) { Stop-Deploy "curl.exe is not available." }

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
Get-ChildItem -LiteralPath $standaloneDir -Force |
    Where-Object { $_.Name -notin @("deploy-package", ".kilo") } |
    Copy-Item -Destination $DeployDir -Recurse -Force
Copy-Item -LiteralPath (Join-Path $ProjectRoot ".next\static") -Destination (Join-Path $DeployDir ".next\static") -Recurse -Force
Copy-Item -LiteralPath (Join-Path $ProjectRoot "public") -Destination (Join-Path $DeployDir "public") -Recurse -Force
New-Item -ItemType Directory -Path (Join-Path $DeployDir "tmp") -Force | Out-Null

$absoluteAppRoot = "$($CpanelHome.TrimEnd("/"))/$($AppRoot.Trim("/"))"

# RELEASE.json is not part of the standalone output, so without this it survives
# every extraction untouched and keeps describing whatever shipped first. Write it
# into the bundle so the rollback commit recorded on the server is real.
$buildIdPath = Join-Path $ProjectRoot ".next\BUILD_ID"
$releaseCommit = (& git -C $ProjectRoot rev-parse HEAD 2>$null)
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

Remove-Item -LiteralPath $restartFile -Force
Remove-Item -LiteralPath $archivePath -Force
Remove-Item -LiteralPath $DeployDir -Recurse -Force

# tmp/restart.txt is Phusion Passenger's mechanism. This host runs LiteSpeed with
# the CloudLinux Node.js selector, which ignores it: the old process keeps serving
# while the new release sits unused on disk, and the deploy reports success for a
# release the site never received. A stale process also 404s the new static
# chunks, so their reachability is a reliable liveness probe.
Write-Step "Verifying the new build is live"
if (-not $probeAssetName) {
    Write-Host "    No CSS chunk available to probe; skipping liveness check." -ForegroundColor Yellow
} else {
    $probeUrl = "$($AppUrl.TrimEnd('/'))/_next/static/chunks/$probeAssetName"
    $live = $false
    foreach ($attempt in 1..12) {
        Start-Sleep -Seconds 5
        try {
            if ((Invoke-WebRequest -Uri $probeUrl -TimeoutSec 30 -SkipHttpErrorCheck).StatusCode -eq 200) {
                $live = $true
                break
            }
        } catch {
            # Keep polling; the app may still be coming back up.
        }
    }
    if (-not $live) {
        Stop-Deploy @"
The release uploaded and extracted, but the running application is still serving
the previous build. $probeUrl never became reachable.

Restart the application to finish the deploy:
  cPanel > Setup Node.js App > $AppRoot > Restart
or over SSH:
  cloudlinux-selector restart --json --interpreter nodejs --user $CpanelUser --app-root $AppRoot

No rollback is needed. The previous build is still running and healthy.
"@
    }
    Write-OK "New build is serving ($probeAssetName)"
}

Write-Host "`nDeployment completed. Run the live smoke checks before DNS cutover." -ForegroundColor Green
