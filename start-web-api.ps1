# Start Web API Speech Backend
Write-Host "🚀 Starting Web API Speech Backend..." -ForegroundColor Green

# Check if Python 3.11 is available
Write-Host "🔍 Checking Python versions..." -ForegroundColor Yellow
py --list

Write-Host "`n📋 IMPORTANT: Make sure you're using Python 3.11!" -ForegroundColor Cyan
Write-Host "   If you see Python 3.13 only, install Python 3.11 first!" -ForegroundColor Red

# Navigate to backend directory
Set-Location "TodosApplication\backend"

# Check if requirements are installed
Write-Host "`n📦 Checking dependencies..." -ForegroundColor Yellow
py -3.11 -m pip list | Select-String -Pattern "flask|speech|pyttsx3"

Write-Host "`n🚀 Starting the Web API backend (app_web_api.py)..." -ForegroundColor Green
Write-Host "   This will use Python 3.11 and work properly!" -ForegroundColor Cyan
Write-Host "   Web API endpoints will be available!" -ForegroundColor Yellow

# Start the web API backend
py -3.11 app_web_api.py

Write-Host "`n✅ Web API Backend should now be running at http://localhost:5000" -ForegroundColor Green
Write-Host "   API Endpoints:" -ForegroundColor Cyan
Write-Host "   - POST /api/speech/transcribe" -ForegroundColor Yellow
Write-Host "   - POST /api/speech/tts" -ForegroundColor Yellow
Write-Host "   - GET /api/speech/languages" -ForegroundColor Yellow
Write-Host "   - GET /health" -ForegroundColor Yellow
Write-Host "   🎉 Speech features should work perfectly!" -ForegroundColor Green























