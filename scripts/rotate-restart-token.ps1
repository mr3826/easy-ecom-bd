<#
.SYNOPSIS
Rotates DEPLOY_RESTART_TOKEN across all three places that hold it, without ever
producing a 401.

.DESCRIPTION
The token lives in three stores and there is no single owner:

  1. this workstation's user environment, which deploy-cpanel.ps1 reads
  2. SetEnv DEPLOY_RESTART_TOKEN in the server's public_html/.htaccess, which is
     what the running process was spawned with
  3. the DEPLOY_RESTART_TOKEN secret on the repository's production environment,
     which the GitHub Actions deploy reads

Both deploy paths write store 2 from their own copy, so whichever deploys last
wins and the other's next deploy is rejected. Rotating only one of the three
re-creates exactly the drift being fixed, which is why this writes all three.

Ordering is what avoids a failed restart. The running process holds the value it
was spawned with, so the new token cannot restart it — only the old one can.
Writing .htaccess first and then restarting with the OLD token means Passenger
respawns and reads the new value, and no request is ever rejected. Rotating by
running a deploy instead would deliberately trigger the 401 and fall through to
the orphan reaper, which is the fragile path this exists to stop depending on.

Additional SetEnv values can be passed with -AlsoSet so they land in the same
.htaccess write and the same restart, rather than costing production a second
respawn.

No token value is printed. Lengths and sha256 prefixes are shown instead, which
is enough to confirm the three stores agree.

.PARAMETER AlsoSet
Extra SetEnv values to write in the same operation, e.g. @{ SMTP_PORT = "465" }.

.PARAMETER SkipGitHubSecret
Leave store 3 alone. The next Actions deploy will then be rejected until the
secret is updated by hand, so use this only when there is no gh CLI available.

.EXAMPLE
.\scripts\rotate-restart-token.ps1 -Confirm

.EXAMPLE
.\scripts\rotate-restart-token.ps1 -AlsoSet @{ SMTP_PORT = "465" } -Confirm
#>
param(
    [hashtable]$AlsoSet = @{},
    [string]$CpanelHost,
    [string]$CpanelUser,
    [string]$CpanelHome,
    [string]$AppUrl,
    [string]$CpanelApiToken = $env:CPANEL_API_TOKEN,
    [string]$Repo = "mr3826/easy-ecom-bd",
    [string]$EnvironmentName = "production",
    [switch]$SkipGitHubSecret,
    [switch]$Confirm
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "deploy-settings.ps1")

$CpanelHost = Resolve-DeploySetting $CpanelHost "CPANEL_HOST"
$CpanelUser = Resolve-DeploySetting $CpanelUser "CPANEL_USER"
$CpanelHome = Resolve-DeploySetting $CpanelHome "CPANEL_HOME"
$AppUrl     = Resolve-DeploySetting $AppUrl     "APP_URL"
if (-not $CpanelApiToken) { $CpanelApiToken = Get-PersistedEnv "CPANEL_API_TOKEN" }
if (-not $CpanelApiToken) { throw "Set CPANEL_API_TOKEN locally. Do not put the token in source control or chat." }

function Write-Step { param([string]$Message) Write-Host "==> $Message" -ForegroundColor Cyan }
function Write-OK { param([string]$Message) Write-Host "    $Message" -ForegroundColor Green }
function Write-Warn { param([string]$Message) Write-Host "    $Message" -ForegroundColor Yellow }

function Get-TokenFingerprint {
    <# Enough to compare two copies, useless to anyone who reads the log. #>
    param([string]$Value)
    if (-not $Value) { return "<unset>" }
    $sha = [System.Security.Cryptography.SHA256]::Create()
    try {
        $hash = $sha.ComputeHash([System.Text.Encoding]::UTF8.GetBytes($Value))
        return "len=$($Value.Length) sha256=$([System.BitConverter]::ToString($hash).Replace('-','').Substring(0,12))"
    } finally { $sha.Dispose() }
}

function New-RestartToken {
    # 32 random bytes rendered base64url: 43 characters, no padding, and safe in
    # an Apache directive and an HTTP header without quoting.
    $bytes = [byte[]]::new(32)
    [System.Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
    return [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')
}

$htaccessDir = "$($CpanelHome.TrimEnd('/'))/public_html"
$authHeader = @{ Authorization = "cpanel ${CpanelUser}:$CpanelApiToken" }

Write-Step "Reading the token the running process was spawned with"
$readResponse = Invoke-RestMethod `
    -Uri "https://${CpanelHost}:2083/execute/Fileman/get_file_content?dir=$([Uri]::EscapeDataString($htaccessDir))&file=.htaccess" `
    -Headers $authHeader -Method Get
if ($readResponse.status -ne 1 -or -not $readResponse.data.content) {
    throw "Could not read the live .htaccess; refusing to rotate a token that cannot be replaced."
}

$oldToken = $null
if ([string]$readResponse.data.content -match '(?m)^SetEnv\s+DEPLOY_RESTART_TOKEN\s+(\S+)\s*$') {
    $oldToken = $Matches[1]
}
$workstationToken = if ($env:DEPLOY_RESTART_TOKEN) { $env:DEPLOY_RESTART_TOKEN } else { Get-PersistedEnv "DEPLOY_RESTART_TOKEN" }

Write-OK "server       : $(Get-TokenFingerprint $oldToken)"
Write-OK "workstation  : $(Get-TokenFingerprint $workstationToken)"
if ($oldToken -and $workstationToken -and $oldToken -eq $workstationToken) {
    Write-OK "These already match, so the current deploy path is not being rejected."
} else {
    Write-Warn "These differ, which is why every scripted restart is answered with 401."
}

if (-not $oldToken) {
    # Without the old value the running process cannot be asked to exit, so the
    # rotation would leave a process holding a token nobody has until something
    # else restarts it.
    Write-Warn "No DEPLOY_RESTART_TOKEN is set on the server, so the running process cannot be restarted by this script."
    Write-Warn "After this writes the new value, restart from cPanel > Setup Node.js App to pick it up."
}

$newToken = New-RestartToken
Write-Step "Generated a replacement"
Write-OK "new          : $(Get-TokenFingerprint $newToken)"

if (-not $Confirm) {
    Write-Warn "Dry run. Nothing was written. Re-run with -Confirm to rotate."
    Write-Warn "Would write: DEPLOY_RESTART_TOKEN$(if ($AlsoSet.Count) { ', ' + ($AlsoSet.Keys -join ', ') })"
    return
}

Write-Step "Writing the new token to the server"
$values = @{ DEPLOY_RESTART_TOKEN = $newToken }
foreach ($key in $AlsoSet.Keys) { $values[$key] = [string]$AlsoSet[$key] }
& (Join-Path $PSScriptRoot "set-passenger-env.ps1") `
    -Values $values -CpanelHost $CpanelHost -CpanelUser $CpanelUser -CpanelHome $CpanelHome `
    -CpanelApiToken $CpanelApiToken -Confirm

$pidBefore = $null
try { $pidBefore = (Invoke-RestMethod -Uri "$($AppUrl.TrimEnd('/'))/api/version" -TimeoutSec 30).pid } catch { }

if ($oldToken) {
    Write-Step "Restarting with the OLD token, which is the one the running process accepts"
    $restart = Request-AppRestart -AppUrl $AppUrl -RestartToken $oldToken
    switch ($restart.Outcome) {
        "restarted"   { Write-OK $restart.Message }
        "no_response" { Write-Host "    $($restart.Message)" }
        default       { Write-Warn $restart.Message }
    }

    Write-Step "Waiting for the new process"
    $newPid = $null
    foreach ($attempt in 1..24) {
        Start-Sleep -Seconds 5
        try {
            $now = (Invoke-RestMethod -Uri "$($AppUrl.TrimEnd('/'))/api/version" -TimeoutSec 30).pid
            if ($now -and $now -ne $pidBefore) { $newPid = $now; break }
        } catch { }
    }
    if ($newPid) {
        Write-OK "New process serving (pid $pidBefore -> $newPid)"
    } else {
        # The server now holds a token no running process knows. Say so plainly
        # rather than letting the operator discover it at the next deploy.
        Write-Warn "The process did not change. It is still running with the previous token."
        Write-Warn "Restart from cPanel > Setup Node.js App before the next deploy, or it will be rejected."
    }
}

Write-Step "Updating this workstation"
if (Test-OnWindows) {
    [Environment]::SetEnvironmentVariable("DEPLOY_RESTART_TOKEN", $newToken, "User")
    # Persisted variables do not reach an already-running shell, and this one is
    # about to be used for a deploy.
    $env:DEPLOY_RESTART_TOKEN = $newToken
    Write-OK "User environment updated, and this session now holds it too."
    # deploy-cpanel.ps1 resolves the token as parameter, then process environment,
    # then persisted value. Any shell opened before this rotation still carries the
    # OLD token in its process environment, and that stale copy outranks the fresh
    # persisted one — so the next deploy from such a shell is answered 401 and falls
    # back to the reaper, which is exactly the drift this script just repaired.
    Write-Warn "Shells opened before now still hold the old token in their environment."
    Write-Warn "Deploy from a new shell, or pass -RestartToken explicitly."
} else {
    $env:DEPLOY_RESTART_TOKEN = $newToken
    Write-Warn "Only this session was updated; persist DEPLOY_RESTART_TOKEN yourself on this platform."
}

if ($SkipGitHubSecret) {
    Write-Warn "Skipped the GitHub secret. The next Actions deploy will be rejected until it is updated."
} elseif (Get-Command gh -ErrorAction SilentlyContinue) {
    Write-Step "Updating the GitHub Actions secret"
    # Piped through stdin so the value is never visible as a process argument.
    $newToken | gh secret set DEPLOY_RESTART_TOKEN --env $EnvironmentName --repo $Repo
    if ($LASTEXITCODE -ne 0) { throw "gh secret set DEPLOY_RESTART_TOKEN failed (exit $LASTEXITCODE)." }
    Write-OK "Set DEPLOY_RESTART_TOKEN on $EnvironmentName"
} else {
    Write-Warn "gh is not on PATH, so the GitHub secret was not updated."
    Write-Warn "The next Actions deploy will be rejected until it is set to the new value."
}

Write-Step "Confirming all three agree"
# The only way to prove the running process holds the new token is to use it.
$verify = Request-AppRestart -AppUrl $AppUrl -RestartToken $newToken
if ($verify.Outcome -eq "restarted" -or $verify.Outcome -eq "no_response") {
    Write-OK "The running process accepted the new token."
    Write-OK "Rotation complete: workstation, server and GitHub now hold $(Get-TokenFingerprint $newToken)"
} else {
    Write-Warn "The new token was not accepted: $($verify.Message)"
    Write-Warn "The server file holds the new value but the running process does not."
    Write-Warn "Restart from cPanel > Setup Node.js App, then re-run this check."
}
