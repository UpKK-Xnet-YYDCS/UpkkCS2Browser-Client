[CmdletBinding()]
param(
    [ValidateSet("all", "msi", "nsis")]
    [string]$Bundle = "all",
    [switch]$SkipInstall,
    [switch]$SkipChecks
)

$ErrorActionPreference = "Stop"
$desktopRoot = (Resolve-Path -LiteralPath $PSScriptRoot).Path
Set-Location -LiteralPath $desktopRoot

function Invoke-Step {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $false)][string[]]$Arguments = @()
    )

    Write-Host "> $Command $($Arguments -join ' ')" -ForegroundColor DarkGray
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed with exit code $LASTEXITCODE`: $Command"
    }
}

function Require-Command {
    param([Parameter(Mandatory = $true)][string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command '$Name' was not found. Install Node.js, Rust, and Tauri prerequisites first."
    }
}

Write-Host "=== Upkk Server Browser Windows build ===" -ForegroundColor Cyan
Write-Host "Desktop directory: $desktopRoot"
Write-Host "Bundle: $Bundle"

Require-Command "npm"
Require-Command "cargo"
Require-Command "rustc"

if (-not $SkipInstall) {
    Invoke-Step "npm" @("ci")
}

if (-not $SkipChecks) {
    Invoke-Step "npm" @("run", "lint")
    Invoke-Step "npm" @("run", "typecheck")
    Invoke-Step "npm" @("test")
}

$bundleTargets = if ($Bundle -eq "all") { "msi,nsis" } else { $Bundle }
Invoke-Step "npm" @("exec", "--", "tauri", "build", "--bundles", $bundleTargets)

$bundleRoot = Join-Path $desktopRoot "src-tauri\target\release\bundle"
Write-Host ""
Write-Host "Windows desktop build completed." -ForegroundColor Green
Write-Host "Artifacts: $bundleRoot"

if ($Bundle -eq "all" -or $Bundle -eq "msi") {
    $directory = "msi"
    $path = Join-Path $bundleRoot $directory
    if (Test-Path -LiteralPath $path) {
        Get-ChildItem -LiteralPath $path -File -Filter "*.msi" | ForEach-Object {
            Write-Host "  $($_.FullName)"
        }
    }
}

if ($Bundle -eq "all" -or $Bundle -eq "nsis") {
    $directory = "nsis"
    $path = Join-Path $bundleRoot $directory
    if (Test-Path -LiteralPath $path) {
        Get-ChildItem -LiteralPath $path -File -Filter "*.exe" | ForEach-Object {
            Write-Host "  $($_.FullName)"
        }
    }
}
