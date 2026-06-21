# Continuous (live) indexing runner for the Sui indexer.
#
# Unlike a bounded backfill (which passes --last-checkpoint), this follows the
# chain tip indefinitely, resuming from the per-pipeline watermark stored in
# Postgres, and auto-restarts with exponential backoff on transient failures
# (e.g. RPC 429 / network blips).
#
# Config (env vars, or apps/indexer/.env):
#   SUI_RPC_URL          Fullnode gRPC/JSON-RPC URL. Default: public testnet.
#                        Swap in a dedicated provider URL here to avoid 429s.
#   SUI_FIRST_CHECKPOINT Optional start checkpoint for the very first bootstrap.
#                        Once a watermark exists the framework resumes from it.
#   RUST_LOG             Log filter. Default keeps output readable.
#
# Usage:
#   cd apps/indexer
#   ./run-live.ps1
#   # or, to bootstrap from a specific checkpoint the first time:
#   $env:SUI_FIRST_CHECKPOINT = 342807490; ./run-live.ps1

$ErrorActionPreference = 'Stop'
Set-Location -Path $PSScriptRoot

# Load apps/indexer/.env so it is the single source of truth. Existing process
# env vars take precedence (allowing ad-hoc overrides), matching dotenv behavior.
$envFile = Join-Path $PSScriptRoot '.env'
if (Test-Path $envFile) {
    foreach ($line in Get-Content $envFile) {
        $trimmed = $line.Trim()
        if ($trimmed -eq '' -or $trimmed.StartsWith('#')) { continue }
        $eq = $trimmed.IndexOf('=')
        if ($eq -lt 1) { continue }
        $key = $trimmed.Substring(0, $eq).Trim()
        $val = $trimmed.Substring($eq + 1).Trim().Trim('"')
        if ([string]::IsNullOrWhiteSpace([System.Environment]::GetEnvironmentVariable($key))) {
            Set-Item -Path "env:$key" -Value $val
        }
    }
}

if ([string]::IsNullOrWhiteSpace($env:SUI_RPC_URL)) {
    $env:SUI_RPC_URL = 'https://fullnode.testnet.sui.io:443'
}
if ([string]::IsNullOrWhiteSpace($env:RUST_LOG)) {
    $env:RUST_LOG = 'info,sui_indexer_alt_framework::metrics=error'
}

Write-Host "Building release binary (one-time, ~minutes on first run)..." -ForegroundColor Cyan
cargo build --release

$exe = Join-Path $PSScriptRoot 'target\release\revalio-indexer.exe'
if (-not (Test-Path $exe)) {
    throw "Built binary not found at $exe"
}

# --first-checkpoint is only a lower bound for the very first run; on restart the
# framework resumes from the committed watermark, so it is safe to keep passing.
$baseArgs = @('--rpc-api-url', $env:SUI_RPC_URL)
if (-not [string]::IsNullOrWhiteSpace($env:SUI_FIRST_CHECKPOINT)) {
    $baseArgs += @('--first-checkpoint', $env:SUI_FIRST_CHECKPOINT)
}

Write-Host "RPC:     $($env:SUI_RPC_URL)" -ForegroundColor DarkGray
Write-Host "RUST_LOG: $($env:RUST_LOG)" -ForegroundColor DarkGray

$delay = 2
while ($true) {
    Write-Host "Starting live indexer..." -ForegroundColor Green
    & $exe @baseArgs
    $code = $LASTEXITCODE

    if ($code -eq 0) {
        Write-Host "Indexer exited cleanly (code 0). Stopping." -ForegroundColor Yellow
        break
    }

    Write-Host "Indexer exited with code $code. Restarting in $delay s..." -ForegroundColor Red
    Start-Sleep -Seconds $delay
    $delay = [Math]::Min($delay * 2, 60)  # exponential backoff, capped at 60s
}
