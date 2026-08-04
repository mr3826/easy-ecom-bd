<#
.SYNOPSIS
Prompts locally (masked input) for CPANEL_API_TOKEN and DEPLOY_RESTART_TOKEN and
stores them as GitHub Actions secrets on the 'production' environment.

.DESCRIPTION
Values are typed into a masked console prompt (or a GUI dialog with -UseGuiPrompt)
on this machine and piped directly into `gh secret set`. They are never echoed,
never written to disk, and never appear in shell history or in chat.

.EXAMPLE
.\scripts\set-deploy-secrets.ps1

.EXAMPLE
.\scripts\set-deploy-secrets.ps1 -UseGuiPrompt
#>
param(
    [string]$Repo = "mr3826/easy-ecom-bd",
    [string]$EnvironmentName = "production",
    [switch]$UseGuiPrompt
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    throw "GitHub CLI (gh) is not on PATH."
}

function Read-SecretGui {
    param([string]$Title)
    Add-Type -AssemblyName Microsoft.VisualBasic
    $value = [Microsoft.VisualBasic.Interaction]::InputBox("Enter value for $Title (input is not masked in this dialog):", $Title, "")
    if (-not $value) { throw "$Title was empty; aborting." }
    return (ConvertTo-SecureString -String $value -AsPlainText -Force)
}

function Read-SecretConsole {
    param([string]$Title)
    $secure = Read-Host -Prompt "Enter value for $Title (input hidden)" -AsSecureString
    if ($secure.Length -eq 0) { throw "$Title was empty; aborting." }
    return $secure
}

function Set-GhSecret {
    param([string]$Name, [System.Security.SecureString]$SecureValue)

    $bstr = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureValue)
    try {
        $plain = [System.Runtime.InteropServices.Marshal]::PtrToStringBSTR($bstr)
        # Piped via stdin so the value never appears as a process argument
        # (which would be visible to other processes / in a process list).
        $plain | gh secret set $Name --env $EnvironmentName --repo $Repo
        if ($LASTEXITCODE -ne 0) { throw "gh secret set $Name failed (exit $LASTEXITCODE)." }
    } finally {
        [System.Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
        $plain = $null
    }
    Write-Host "    Set $Name on $EnvironmentName" -ForegroundColor Green
}

Write-Host "==> Setting deploy secrets for $Repo (environment: $EnvironmentName)" -ForegroundColor Cyan
Write-Host "    Values are sent straight to 'gh secret set' on this machine and are never displayed, logged, or saved."

$reader = if ($UseGuiPrompt) { Get-Item Function:\Read-SecretGui } else { Get-Item Function:\Read-SecretConsole }

$cpanelToken = & $reader "CPANEL_API_TOKEN"
Set-GhSecret -Name "CPANEL_API_TOKEN" -SecureValue $cpanelToken

$restartToken = & $reader "DEPLOY_RESTART_TOKEN"
Set-GhSecret -Name "DEPLOY_RESTART_TOKEN" -SecureValue $restartToken

Write-Host "`nDone. Verify with:" -ForegroundColor Cyan
Write-Host "  gh secret list --env $EnvironmentName --repo $Repo"
