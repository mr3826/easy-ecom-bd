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
Write-OK "Read $($original.Length) bytes"

<#
Edited as a list of lines rather than with regex replacement over the whole
file. The regex version inserted a new key with

    [regex]::Replace($text, $anchor, { ... }, 1)

intending the 1 to cap the replacement count. No such overload exists: the
four-argument form is Replace(String, String, MatchEvaluator, RegexOptions), so
the 1 was read as RegexOptions.IgnoreCase and every SetEnv line in the file
matched. Each added key was appended after all of them, doubling the count per
key and growing a 1.4 KB file to 16 KB. Indexing lines cannot over-match.
#>
$newline = if ($original -match "`r`n") { "`r`n" } else { "`n" }
$lines = [System.Collections.Generic.List[string]]::new()
foreach ($line in ($original -split "`r?`n")) { $lines.Add($line) | Out-Null }

function Find-SetEnvIndex {
    param([System.Collections.Generic.List[string]]$Lines, [string]$Name)
    for ($i = 0; $i -lt $Lines.Count; $i++) {
        if ($Lines[$i] -match "^\s*SetEnv\s+$([regex]::Escape($Name))(\s|$)") { return $i }
    }
    return -1
}

Write-Step "Applying $($Values.Count) SetEnv value(s)"
foreach ($name in $Values.Keys) {
    if ($name -notmatch '^[A-Za-z_][A-Za-z0-9_]*$') { throw "'$name' is not a valid environment variable name." }
    $value = [string]$Values[$name]
    # A newline would end the SetEnv directive and let the rest of the value be
    # parsed as its own Apache directive.
    if ($value -match '[\r\n]') { throw "The value for $name contains a line break, which cannot go in a SetEnv directive." }

    $line = "SetEnv $name $value"
    $index = Find-SetEnvIndex -Lines $lines -Name $name

    if ($index -ge 0) {
        $lines[$index] = $line
        # A key already present more than once would otherwise keep whichever
        # stale copy sits last, which is the value Passenger actually reads.
        for ($i = $lines.Count - 1; $i -gt $index; $i--) {
            if ($lines[$i] -match "^\s*SetEnv\s+$([regex]::Escape($name))(\s|$)") { $lines.RemoveAt($i) }
        }
        Write-OK "update $name ($($value.Length) chars)"
    } else {
        # Placed directly after the last existing SetEnv so the block stays
        # together, matching where deploy-cpanel.ps1 inserts DEPLOY_RESTART_TOKEN.
        $last = -1
        for ($i = 0; $i -lt $lines.Count; $i++) { if ($lines[$i] -match '^\s*SetEnv\s+\S+') { $last = $i } }
        if ($last -ge 0) { $lines.Insert($last + 1, $line) } else { $lines.Add($line) | Out-Null }
        Write-OK "add    $name ($($value.Length) chars)"
    }
}

$updated = $lines -join $newline

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
