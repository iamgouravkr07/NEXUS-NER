# ==============================================================================
# NEXUS-NER — UNIFIED SIH 2026 DEMO LAUNCHER (Windows PowerShell)
# ==============================================================================
# Usage:
#   .\run_demo.ps1                  # Seed demo fixtures & display instructions
#   .\run_demo.ps1 -WithSimulator   # Seed fixtures and start GPS simulator
#   .\run_demo.ps1 -SkipSeed        # Skip DB seeding, display status
# ==============================================================================

[CmdletBinding()]
param(
    [switch]$SkipSeed = $false,
    [switch]$WithSimulator = $false,
    [double]$Interval = 2.0,
    [string]$ApiUrl = "http://127.0.0.1:8000"
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

Write-Host ""
Write-Host "======================================================================" -ForegroundColor Cyan
Write-Host "          NEXUS-NER - SMART INDIA HACKATHON 2026 DEMO HARNESS          " -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Cyan

# 1. Verify Prerequisites
Write-Host "[1/4] Verifying development environment..." -ForegroundColor Yellow

try {
    $pyVer = python --version 2>&1
    Write-Host "  * Python: $pyVer" -ForegroundColor Green
} catch {
    Write-Error "Python is not installed or not in PATH."
    exit 1
}

try {
    $nodeVer = node --version 2>&1
    Write-Host "  * Node.js: $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "  ! Node.js not detected in current PATH (frontend runtime)" -ForegroundColor DarkYellow
}

# 2. Execute Demo Seeding
if (-not $SkipSeed) {
    Write-Host "`n[2/4] Seeding deterministic SIH 2026 demonstration fixtures..." -ForegroundColor Yellow
    python backend/scripts/seed_demo_flow.py
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Demo seeding failed with exit code $LASTEXITCODE."
        exit $LASTEXITCODE
    }
} else {
    Write-Host "`n[2/4] Skipping database seeding (-SkipSeed passed)..." -ForegroundColor Yellow
}

# 3. Read Stored Demo State
$stateFile = Join-Path $ScriptDir "backend\scripts\demo_state.json"
$vehicleId = 1
if (Test-Path $stateFile) {
    try {
        $stateJson = Get-Content -Raw $stateFile | ConvertFrom-Json
        $vehicleId = $stateJson.vehicle.id
        $tripId = $stateJson.trip.id
        $incidentId = $stateJson.incident.id
        $roadId = $stateJson.road.id
    } catch {
        Write-Host "  ! Warning: Could not parse demo_state.json; using default IDs." -ForegroundColor DarkYellow
    }
}

# 4. Operator Dashboard & Demo Instructions
Write-Host "`n[3/4] Demonstration Quick Reference Guide:" -ForegroundColor Yellow
Write-Host "----------------------------------------------------------------------" -ForegroundColor DarkGray
Write-Host " CONTROL TOWER WEB UI : http://localhost:5173" -ForegroundColor White
Write-Host " FASTAPI BACKEND DOCS : http://localhost:8000/docs" -ForegroundColor White
Write-Host ""
Write-Host " DEMONSTRATION CREDENTIALS (RBAC):" -ForegroundColor Cyan
Write-Host "  * Control Operator : operator / Operator@Nexus2026   [Primary Presenter]" -ForegroundColor White
Write-Host "  * Administrator    : admin / Admin@Nexus2026         [System Control]" -ForegroundColor White
Write-Host "  * Field Officer    : field_officer / Field@Nexus2026 [Offline Field App]" -ForegroundColor White
Write-Host "  * Fleet Driver     : driver / Driver@Nexus2026       [Telemetry Ingest]" -ForegroundColor White
Write-Host "----------------------------------------------------------------------" -ForegroundColor DarkGray

Write-Host " HOW TO START SERVICES (in separate terminal windows):" -ForegroundColor Cyan
Write-Host "  Backend  : cd backend && python -m uvicorn app.main:app --reload --port 8000" -ForegroundColor White
Write-Host "  Frontend : cd frontend && npm run dev" -ForegroundColor White
Write-Host "  Simulator: python scripts/simulate_vehicle.py --vehicle-id $vehicleId --interval $Interval" -ForegroundColor White

# 5. Optional Simulator Launch
if ($WithSimulator) {
    Write-Host "`n[4/4] Starting live GPS Vehicle Simulator (Vehicle #$vehicleId)..." -ForegroundColor Green
    python scripts/simulate_vehicle.py --vehicle-id $vehicleId --interval $Interval --api-url $ApiUrl
} else {
    Write-Host "`n[4/4] Demo harness ready. Launch your frontend/backend and present!" -ForegroundColor Green
}
Write-Host "======================================================================`n" -ForegroundColor Cyan
