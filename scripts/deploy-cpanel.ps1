<#
.SYNOPSIS
Local cPanel deploy script for easy-ecom-bd.
Builds the Next.js standalone app and uploads it to cPanel via explicit FTPS.
#>

param(
    [string]$ProjectRoot,
    [string]$DeployDir,
    [string]$FtpHost = "ftp.bornohinbd.com",
    [int]$FtpPort = 21,
    [string]$FtpUser = "github-deploy@admin.bornohinbd.com",
    [string]$FtpPassword = "Admin@12345!",
    [string]$RemoteDir = "/",
    [switch]$SkipBuild,
    [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'
[System.Net.ServicePointManager]::ServerCertificateValidationCallback = { $true }

if (-not $ProjectRoot) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $ProjectRoot = Split-Path -Parent $scriptDir
}
if (-not $DeployDir) {
    $DeployDir = Join-Path $ProjectRoot "deploy-package"
}

function Write-Step { param([string]$Text) Write-Host "`n==> $Text" -ForegroundColor Cyan }
function Write-OK { param([string]$Text) Write-Host "    $Text" -ForegroundColor Green }
function Write-Fail { param([string]$Text) Write-Host "FAIL: $Text" -ForegroundColor Red; exit 1 }

if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Write-Fail "Node.js is not installed or not in PATH." }
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) { Write-Fail "npm is not installed or not in PATH." }

if (-not $SkipBuild) {
    Write-Step "Installing dependencies"
    Push-Location $ProjectRoot
    try { npm ci | Write-Output } catch { Write-Fail "npm ci failed: $_" }
    Write-OK "Dependencies installed"

    Write-Step "Generating Prisma client"
    try { npx prisma generate | Write-Output } catch { Write-Fail "prisma generate failed: $_" }
    Write-OK "Prisma client generated"

    Write-Step "Running lint"
    try { npm run lint | Write-Output } catch { Write-Fail "lint failed: $_" }
    Write-OK "Lint passed"

    Write-Step "Building standalone app"
    try { npm run build | Write-Output } catch { Write-Fail "build failed: $_" }
    Write-OK "Build completed"
    Pop-Location
} else {
    Write-Step "Skipping build steps"
}

Write-Step "Preparing deploy bundle"
if (Test-Path $DeployDir) { Remove-Item -Recurse -Force $DeployDir }
New-Item -ItemType Directory -Path "$DeployDir\.next" | Out-Null
Get-ChildItem -LiteralPath "$ProjectRoot\.next\standalone" -Force | Copy-Item -Destination "$DeployDir\" -Recurse -Force
Copy-Item -LiteralPath "$ProjectRoot\.next\static" -Destination "$DeployDir\.next\static" -Recurse -Force
Copy-Item -LiteralPath "$ProjectRoot\public" -Destination "$DeployDir\public" -Recurse -Force
Write-OK "Deploy bundle prepared at: $DeployDir"

function New-FtpRequest {
    param(
        [string]$Uri,
        [string]$Method,
        [byte[]]$Body
    )
    $req = [System.Net.FtpWebRequest]::Create($Uri)
    $req.Method = $Method
    $req.EnableSsl = $true
    $req.UseBinary = $true
    $req.UsePassive = $true
    $req.KeepAlive = $false
    $req.Timeout = 600000
    $req.ReadWriteTimeout = 600000
    $req.Credentials = [System.Net.NetworkCredential]::new($FtpUser, $FtpPassword)
    if ($Body) { $req.ContentLength = $Body.Length }
    return $req
}

function Ensure-FtpDirectory {
    param([string]$Path)
    if ([string]::IsNullOrEmpty($Path) -or $Path -eq '/' -or $Path -eq '\') { return }
    $segments = ($Path.Trim('/').Trim('\') -split '[\\/]') | Where-Object { $_ }
    $current = ''
    foreach ($segment in $segments) {
        $current = "$current/$segment"
        $uri = "ftp://${FtpHost}:${FtpPort}${current}/"
        try {
            $req = New-FtpRequest -Uri $uri -Method 'MKD'
            $resp = $req.GetResponse()
            $resp.Close()
        } catch [System.Net.WebException] {
            $ex = $_.Exception
            if ($ex.Response -and $ex.Response.StatusDescription -match '550|File exists') {
            } else {
                Write-Host "    MKD $current -> $($ex.Message)" -ForegroundColor DarkGray
            }
        }
    }
}

function Upload-FtpItem {
    param(
        [string]$LocalPath,
        [string]$RemotePath
    )
    if ($DryRun) {
        Write-Host "    [dry-run] $LocalPath -> $RemotePath"
        return
    }
    if (-not (Test-Path -LiteralPath $LocalPath)) {
        Write-Host "    skip missing: $LocalPath" -ForegroundColor DarkGray
        return
    }
    if (Test-Path -LiteralPath $LocalPath -PathType Container) {
        $items = Get-ChildItem -LiteralPath $LocalPath -Force
        foreach ($item in $items) {
            $name = $item.Name
            if ($RemotePath -eq '/') {
                $childRemote = "/$name"
            } else {
                $childRemote = "$RemotePath/$name"
            }
            Upload-FtpItem -LocalPath $item.FullName -RemotePath $childRemote
        }
        return
    }
    if (-not (Test-Path -LiteralPath $LocalPath -PathType Leaf)) {
        Write-Host "    skip non-file: $LocalPath" -ForegroundColor DarkGray
        return
    }
    $relative = $LocalPath.Substring($DeployDir.Length + 1)
    $targetPath = "$RemotePath/$relative".Replace('\', '/')
    $targetDir = Split-Path -Parent $targetPath
    if ($targetDir -notmatch '^/$') { Ensure-FtpDirectory -Path $targetDir }
    $uri = "ftp://${FtpHost}:${FtpPort}$targetPath"
    $maxAttempts = 3
    $attempt = 0
    while ($attempt -lt $maxAttempts) {
        try {
            $bytes = [System.IO.File]::ReadAllBytes($LocalPath)
            $req = New-FtpRequest -Uri $uri -Method 'STOR' -Body $bytes
            $stream = $req.GetRequestStream()
            $stream.Write($bytes, 0, $bytes.Length)
            $stream.Close()
            $resp = $req.GetResponse()
            $resp.Close()
            Write-Host "    uploaded: $relative"
            return
        } catch [System.Net.WebException] {
            $attempt++
            if ($attempt -ge $maxAttempts) {
                Write-Host "    FAILED upload after $attempt attempts: ${relative}: $($_.Exception.Message)" -ForegroundColor Red
                throw
            }
            Write-Host "    retry $attempt/$maxAttempts for ${relative}: $($_.Exception.Message)" -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        } catch {
            $attempt++
            if ($attempt -ge $maxAttempts) {
                Write-Host "    FAILED upload after $attempt attempts: ${relative}: $($_.Exception.Message)" -ForegroundColor Red
                throw
            }
            Write-Host "    retry $attempt/$maxAttempts for ${relative}: $($_.Exception.Message)" -ForegroundColor Yellow
            Start-Sleep -Seconds 2
        }
    }
}

Write-Step "Uploading deploy bundle to cPanel via FTPS"
$rootRemote = $RemoteDir.TrimEnd('/')
if ([string]::IsNullOrEmpty($rootRemote)) { $rootRemote = '/' }

$zipPath = Join-Path $env:TEMP "deploy-package.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath }
Compress-Archive -Path (Join-Path $DeployDir '*') -DestinationPath $zipPath -Force
Write-OK "Created deploy zip: $zipPath"

$cred = "$FtpUser`:$FtpPassword"
$ftpZipUri = "ftp://${FtpHost}:${FtpPort}${rootRemote}/deploy-package.zip"
curl.exe -T $zipPath $ftpZipUri --user $cred --ssl-reqd --insecure
Write-OK "Uploaded deploy-package.zip"

$phpExtract = @'
<?php
$zip = new ZipArchive();
$res = $zip->open('deploy-package.zip');
if ($res === TRUE) {
    $zip->extractTo('.');
    $zip->close();
    echo 'OK';
} else {
    echo 'FAIL';
}
?>
'@
$phpPath = Join-Path $env:TEMP "extract-deploy.php"
Set-Content -Path $phpPath -Value $phpExtract -Encoding ASCII
$ftpPhpUri = "ftp://${FtpHost}:${FtpPort}${rootRemote}/extract-deploy.php"
curl.exe -T $phpPath $ftpPhpUri --user $cred --ssl-reqd --insecure
Write-OK "Uploaded extract-deploy.php"

$protocol = "https"
$hostForUrl = $FtpHost
if ($rootRemote -ne '/') {
    $targetDir = $rootRemote.TrimStart('/')
} else {
    $targetDir = ''
}
$extractUrl = "${protocol}://$hostForUrl/extract-deploy.php"
if (-not [string]::IsNullOrEmpty($targetDir)) {
    $extractUrl = "${protocol}://$hostForUrl/$targetDir/extract-deploy.php"
}
Write-Host "    Visit this URL to extract the deployment package:"
Write-Host "    $extractUrl" -ForegroundColor Yellow

$restartPath = '/tmp/restart.txt'
if ($rootRemote -ne '/') { $restartPath = "$rootRemote/tmp/restart.txt" }
try {
    $uri = "ftp://${FtpHost}:${FtpPort}$restartPath"
    $req = New-FtpRequest -Uri $uri -Method 'STOR'
    $stream = $req.GetRequestStream()
    $stream.Close()
    $resp = $req.GetResponse()
    $resp.Close()
    Write-OK "Restart triggered via $restartPath"
} catch {
    Write-Host "    restart not triggered via FTP: $($_.Exception.Message)" -ForegroundColor DarkGray
}

Write-Step "Cleaning up"
Remove-Item -Recurse -Force $DeployDir | Out-Null
if (Test-Path $zipPath) { Remove-Item $zipPath }
Write-OK "Cleaned deploy-package and zip"

Write-Host "`nDeployment finished." -ForegroundColor Green
