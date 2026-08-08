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

function Test-OnWindows {
    <#
    User-scoped environment variables exist only on Windows; on other platforms
    GetEnvironmentVariable(name, "User") is a no-op that returns null.

    PowerShell 6+ exposes $PSVersionTable.Platform ('Win32NT' on Windows) and an
    $IsWindows automatic variable. Windows PowerShell 5.1 has neither, but it
    only ships on Windows, so a missing Platform means Windows by definition.

    Two earlier attempts got this wrong in opposite directions: reading the bare
    $IsWindows automatic returned $null under 5.1 and skipped the lookup on the
    one host that needed it, and $PSVersionTable.PSPlatform -eq 'Win32' names a
    member that does not exist, which left the -or against
    Is64BitOperatingSystem answering true on every 64-bit OS including Linux.
    #>
    if ($null -ne $PSVersionTable.Platform) { return $PSVersionTable.Platform -eq 'Win32NT' }
    return $true
}

function Get-PersistedEnv {
    param([string]$Name)
    if (Test-OnWindows) {
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

function Request-AppRestart {
    <#
    .SYNOPSIS
    Asks the process currently serving traffic to exit, and says plainly what
    happened.

    .DESCRIPTION
    On this host a Next process can end up orphaned to PPID 1, at which point
    Passenger can no longer see it: restart.txt, the cPanel Restart button and
    cloudlinux-selector all report success while the old build keeps answering.
    An HTTP request is the one thing that still reaches such a process, so it is
    asked to exit itself and the platform respawns on the new build.

    This lived in deploy-cpanel.ps1, where it correctly distinguished 401 from
    404 from success. apply-production-migration.ps1 and wipe-production-db.ps1
    each hand-rolled the same call instead, passed -SkipHttpErrorCheck and piped
    the result to Out-Null inside an empty catch — so a 401 from a token
    mismatch was indistinguishable from a restart that worked, and both scripts
    could only report "the process did not change" without ever saying why. That
    is how a stale build served production for 14 hours on 2026-08-07.

    One implementation, so every caller inherits the diagnosis. Callers print
    .Message with their own logging helpers rather than this writing directly,
    which keeps this file free of dependencies on any single script's output
    functions.

    .OUTPUTS
    StatusCode - the HTTP status, or 0 when no response was read
    Outcome    - restarted | rejected | not_configured | no_token | no_response | unexpected
    Message    - a caller-printable explanation
    #>
    param(
        [Parameter(Mandatory = $true)][string]$AppUrl,
        [string]$RestartToken
    )

    if (-not $RestartToken) {
        return [pscustomobject]@{
            StatusCode = 0
            Outcome    = "no_token"
            Message    = "DEPLOY_RESTART_TOKEN is not set on this machine, so the running process cannot be asked to exit."
        }
    }

    try {
        $response = Invoke-WebRequest -Uri "$($AppUrl.TrimEnd('/'))/api/deploy/restart" `
            -Method Post -Headers @{ "x-deploy-token" = $RestartToken } `
            -TimeoutSec 20 -SkipHttpErrorCheck
        $code = [int]$response.StatusCode
    } catch {
        # Two very different things land here and cannot be told apart at this
        # layer: the process exiting before it wrote a response (the outcome
        # being asked for) and never reaching the host at all. Claiming success
        # for both would report a restart that never happened, so this stays
        # deliberately undecided and the caller's pid check settles it.
        return [pscustomobject]@{
            StatusCode = 0
            Outcome    = "no_response"
            Message    = ("No response was read ($($_.Exception.Message.Trim())). The process may have exited " +
                "before replying, or the host may be unreachable — the pid check decides which.")
        }
    }

    $outcome, $message = switch ($code) {
        200 { "restarted", "The running process accepted the request and is exiting." }
        401 {
            "rejected", ("Restart rejected (401): the running build holds a different DEPLOY_RESTART_TOKEN " +
                "than this machine. Re-sync all three copies with scripts/rotate-restart-token.ps1.")
        }
        404 {
            "not_configured", ("That build has no usable restart endpoint (404): DEPLOY_RESTART_TOKEN is unset " +
                "on the server, or the build predates the endpoint. Retrying cannot help.")
        }
        default { "unexpected", "The restart endpoint answered $code, which is not a status this deploy path expects." }
    }

    return [pscustomobject]@{ StatusCode = $code; Outcome = $outcome; Message = $message }
}
