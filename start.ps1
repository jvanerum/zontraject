# Start ZonTraject: bouwt de frontend als dat nog niet gebeurd is, start de server en opent de browser.
# Gebruik: rechtsklik > "Uitvoeren met PowerShell", of in PowerShell: .\start.ps1
Set-Location $PSScriptRoot

foreach ($tool in "uv", "npm") {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        Write-Host "$tool ontbreekt. Installeer het en open daarna een nieuw venster:" -ForegroundColor Red
        if ($tool -eq "uv") { Write-Host "  winget install astral-sh.uv" } else { Write-Host "  winget install OpenJS.NodeJS.LTS" }
        Read-Host "Druk op Enter om te sluiten"
        exit 1
    }
}

if (-not (Test-Path "web\static\app.css")) {
    Write-Host "Frontend bouwen (eenmalig)..."
    Push-Location web
    npm install --no-fund --no-audit
    npm run build
    Pop-Location
}

Write-Host "ZonTraject draait op http://127.0.0.1:8000 (stoppen: Ctrl+C)"
Start-Process "http://127.0.0.1:8000"
uv run uvicorn zontraject.main:app --port 8000
