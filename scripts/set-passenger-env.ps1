<#
.SYNOPSIS
Adds or updates SetEnv directives in the live public_html/.htaccess through the
cPanel API.

.DESCRIPTION
Passenger reads the application's entire environment from SetEnv lines in
public_html/.htaccess — DATABASE_URL, AUTH_SECRET, UPLOAD_DIR and
DEPLOY_RESTART_TOKEN all reach the app that way, and the .env in the app root is
a stale development copy that Passenger never reads. Changing a production
setting therefore means editing that file, and until now the only code that
could do it was the inline block in deploy-cpanel.ps1, which handles exactly two
keys and only as part of a full deploy.

This is that edit on its own, for any key. Values are never printed: the log
records key names and value lengths so an operator can confirm the write landed
without the secret appearing in a terminal, a transcript, or a CI log.

The file being edited carries every credential the site has. A save built from a
partial read would blank it and take production down, so a read that does not
return content is a hard failure rather than something to recover from.

.PARAMETER Values
Hashtable of SetEnv name to value, e.g. @{ SMTP_PORT = "465" }.

.PARAMETER Confirm
Required to write. Without it the script reports what would change and exits.

.EXAMPLE
.\scripts\set-passenger-env.ps1 -Values @{ SMTP_PORT = "465" } -Confirm
#>
param(
    [Parameter(Mandatory = $true)][hashtable]$Values,
    [string]$CpanelHost,
    [string]$CpanelUser,
    [string]$CpanelHome,
    [string]$CpanelApiToken = $env:CPANEL_API_TOKEN,
    [switch]$Confirm
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

. (Join-Path $PSScriptRoot "deploy-settings.ps1")

$CpanelHost = Resolve-DeploySetting $CpanelHost "CPANEL_HOST"
$CpanelUser = Resolve-DeploySetting $CpanelUser "CPANEL_USER"
$CpanelHome = Resolve-DeploySetting $CpanelHome "CPANEL_HOME"
if (-not $CpanelApiToken) { $CpanelApiToken = Get-PersistedEnv "CPANEL_API_TOKEN" }
if (-not $CpanelApiToken) { throw "Set CPANEL_API_TOKEN locally. Do not put the token in source control or chat." }

function Write-Step { param([string]$Message) Write-Host "==> $Message" -ForegroundColor Cyan }
function Write-OK { param([string]$Message) Write-Host "    $Message" -ForegroundColor Green }
function Write-Warn { param([string]$Message) Write-Host "    $Message" -ForegroundColor Yellow }

$htaccessDir = "$($CpanelHome.TrimEnd('/'))/public_html"
$authHeader = @{ Authorization = "cpanel ${CpanelUser}:$CpanelApiToken" }

Write-Step "Reading $htaccessDir/.htaccess"
$readResponse = Invoke-RestMethod `
    -Uri "https://${CpanelHost}:2083/execute/Fileman/get_file_content?dir=$([Uri]::EscapeDataString($htaccessDir))&file=.htaccess" `
    -Headers $authHeader -Method Get

# Anything short of a confirmed read means the content below is not the live
# file. Saving from it would replace every credential on the host with nothing.
if ($readResponse.status -ne 1) { throw "cPanel refused the read: $($readResponse.errors -join '; ')" }
if (-not $readResponse.data.content) { throw "The .htaccess read came back empty. Refusing to write over the live file." }

$original = [string]$readResponse.data.content
$updated = $original
Write-OK "Read $($original.Length) bytes"

Write-Step "Applying $($Values.Count) SetEnv value(s)"
foreach ($name in $Values.Keys) {
    if ($name -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') { throw "'$name' is not a valid environment variable name." }
    $value = [string]$Values[$name]
    # A newline would end the SetEnv directive and let the rest of the value be
    # parsed as its own Apache directive.
    if ($value -match '[\r\n]') { throw "The value for $name contains a line break, which cannot go in a SetEnv directive." }

    $line = "SetEnv $name $value"
    $pattern = "(?m)^SetEnv\s+$([regex]::Escape($name))\s+.*$"
    if ($updated -match $pattern) {
        $updated = [regex]::Replace($updated, $pattern, { $line })
        Write-OK "update $name ($($value.Length) chars)"
    } else {
        # Placed beside the existing SetEnv block rather than appended, matching
        # where deploy-cpanel.ps1 inserts DEPLOY_RESTART_TOKEN.
        $anchor = '(?m)^SetEnv\s+\S+\s+.*$'
        if ($updated -match $anchor) {
            $updated = [regex]::Replace($updated, $anchor, { param($m) "$($m.Value)`n$line" }, 1)
        } else {
            $updated = $updated.TrimEnd() + "`n$line`n"
        }
        Write-OK "add    $name ($($value.Length) chars)"
    }
}

if ($updated -eq $original) {
    Write-OK "No change needed; every value already matches."
    return
}

if (-not $Confirm) {
    Write-Warn "Dry run. Re-run with -Confirm to write these $($Values.Count) key(s)."
    Write-Warn "Keys: $($Values.Keys -join ', ')"
    return
}

Write-Step "Saving .htaccess"
$saveResponse = Invoke-RestMethod `
    -Uri "https://${CpanelHost}:2083/execute/Fileman/save_file_content" `
    -Headers $authHeader -Method Post `
    -Body @{ dir = $htaccessDir; file = ".htaccess"; content = $updated }

if ($saveResponse.status -ne 1) { throw "cPanel refused the save: $($saveResponse.errors -join '; ')" }
Write-OK "Saved $($updated.Length) bytes (was $($original.Length))"
Write-Warn "Passenger reads this at process start, so the running process still holds the old values until it is restarted."
