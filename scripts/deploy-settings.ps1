<#
.SYNOPSIS
Resolves production topology (host, cPanel user, home, app root, app URL) from
the environment for every ops script in this directory.

.DESCRIPTION
This repository is public. A hostname, cPanel account and home directory
committed as parameter defaults are a map of the live host for anyone who reads
it, so no script here ships one — the values come from the environment and a
missing value is a loud failure, not a silent fallback to production.

Dot-source it and call Resolve-DeploySetting for each value the script needs:

    . (Join-Path $PSScriptRoot "deploy-settings.ps1")
    $CpanelHost = Resolve-DeploySetting $CpanelHost "CPANEL_HOST"

Resolution order is explicit parameter, then the process environment, then the
persisted Windows user environment (what set-deploy-secrets.ps1 writes). The
last step matters because a shell started before the variable was persisted
never inherits it, and resolving in a param default would run before this file
is even loaded.
#>

function Get-PersistedEnv {
    param([string]$Name)
    if ($IsWindows) {
        return [Environment]::GetEnvironmentVariable($Name, "User")
    }
    return $null
}

function Resolve-DeploySetting {
    param(
        [string]$Value,
        [Parameter(Mandatory = $true)][string]$EnvName
    )
    if ($Value) { return $Value }

    $fromProcess = [Environment]::GetEnvironmentVariable($EnvName)
    if ($fromProcess) { return $fromProcess }

    $persisted = Get-PersistedEnv $EnvName
    if ($persisted) { return $persisted }

    throw @"
$EnvName is not set, and no script in this repository ships a default for it.

Set the deployment topology once with:

  pwsh scripts/set-deploy-secrets.ps1

or for this shell only:

  `$env:$EnvName = '<value>'
"@
}
