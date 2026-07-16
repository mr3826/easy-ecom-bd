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
Copy-Item -Recurse -Force "$ProjectRoot\.next\standalone\*" "$DeployDir\" | Out-Null
Copy-Item -Recurse -Force "$ProjectRoot\.next\static" "$DeployDir\.next\static" | Out-Null
Copy-Item -Recurse -Force "$ProjectRoot\public" "$DeployDir\public" | Out-Null
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
    if (Test-Path $LocalPath -PathType Container) {
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
    $relative = $LocalPath.Substring($DeployDir.Length + 1)
    $targetPath = "$RemotePath/$relative".Replace('\', '/')
    $targetDir = Split-Path -Parent $targetPath
    if ($targetDir -notmatch '^/$') { Ensure-FtpDirectory -Path $targetDir }
    $uri = "ftp://${FtpHost}:${FtpPort}$targetPath"
    $bytes = [System.IO.File]::ReadAllBytes($LocalPath)
    $maxAttempts = 3
    $attempt = 0
    while ($attempt -lt $maxAttempts) {
        try {
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
                Write-Host "    FAILED upload after $attempt attempts: $relative -> $($_.Exception.Message)" -ForegroundColor Red
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
if ($rootRemote -ne '/') { Ensure-FtpDirectory -Path $rootRemote }
Get-ChildItem -LiteralPath $DeployDir -Force | ForEach-Object {
    Upload-FtpItem -LocalPath $_.FullName -RemotePath $rootRemote
}
Write-OK "Upload complete"

Write-Step "Restarting Passenger app"
if ($rootRemote -eq '/') { $restartPath = '/tmp/restart.txt' } else { $restartPath = "$rootRemote/tmp/restart.txt" }
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
Write-OK "Cleaned deploy-package"

Write-Host "`nDeployment finished." -ForegroundColor Green
