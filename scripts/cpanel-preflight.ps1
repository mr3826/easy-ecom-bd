<#
.SYNOPSIS
Read-only cPanel inventory with an optional full-account backup request.
#>

param(
    [string]$CpanelHost = "bd10.exonhost.com",
    [string]$CpanelUser = "bornohin",
    [string]$CpanelApiToken = $env:CPANEL_API_TOKEN,
    [string]$OutputPath = (Join-Path $PWD "cpanel-preflight.json"),
    [switch]$StartFullBackup
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

if (-not $CpanelApiToken) {
    throw "Set CPANEL_API_TOKEN locally. Do not put the token in source control or chat."
}

$headers = @{ Authorization = "cpanel ${CpanelUser}:$CpanelApiToken" }

function Invoke-CpanelUapi {
    param(
        [string]$Module,
        [string]$Function,
        [hashtable]$Query = @{}
    )

    $queryString = ($Query.GetEnumerator() | ForEach-Object {
        "$([Uri]::EscapeDataString($_.Key))=$([Uri]::EscapeDataString([string]$_.Value))"
    }) -join "&"
    $uri = "https://${CpanelHost}:2083/execute/$Module/$Function"
    if ($queryString) { $uri = "$uri`?$queryString" }

    $response = Invoke-RestMethod -Uri $uri -Headers $headers -TimeoutSec 120
    $hasWrappedResult = $response.PSObject.Properties.Name -contains "result"
    $result = if ($hasWrappedResult) { $response.result } else { $response }
    if ($result.status -ne 1) {
        $errors = ($result.errors | Where-Object { $_ }) -join "; "
        throw "$Module/$Function failed: $errors"
    }
    return $result.data
}

function Get-InventoryItem {
    param([string]$Name, [string]$Module, [string]$Function, [hashtable]$Query = @{})
    try {
        return [ordered]@{ name = $Name; ok = $true; data = Invoke-CpanelUapi $Module $Function $Query }
    } catch {
        return [ordered]@{ name = $Name; ok = $false; error = $_.Exception.Message }
    }
}

$inventory = [ordered]@{
    generatedAt = (Get-Date).ToUniversalTime().ToString("o")
    host = $CpanelHost
    user = $CpanelUser
    domains = Get-InventoryItem "domains" "DomainInfo" "list_domains" @{ hide_temporary_domains = 1 }
    virtualHosts = Get-InventoryItem "virtual-hosts" "WebVhosts" "list_domains"
    passengerApps = Get-InventoryItem "passenger-apps" "PassengerApps" "list_applications"
    publicHtml = Get-InventoryItem "public-html" "Fileman" "list_files" @{ dir = "public_html"; show_hidden = 1 }
    ftpAccounts = Get-InventoryItem "ftp-accounts" "Ftp" "list_ftp"
    mysqlDatabases = Get-InventoryItem "mysql-databases" "Mysql" "list_databases"
    postgresqlDatabases = Get-InventoryItem "postgresql-databases" "Postgresql" "list_databases"
}

if ($StartFullBackup) {
    $inventory.backup = Get-InventoryItem "full-backup" "Backup" "fullbackup_to_homedir" @{ homedir = "include" }
}

$inventory | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $OutputPath -Encoding UTF8
Write-Host "cPanel preflight saved to $OutputPath"
if (-not $StartFullBackup) {
    Write-Host "No changes were made. Re-run with -StartFullBackup before destructive cleanup."
}
