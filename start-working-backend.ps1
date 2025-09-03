# Start Working Speech Backend
Write-Host "🚀 Starting Working Speech Backend..." -ForegroundColor Green

# Check if Python 3.11 is available
Write-Host "🔍 Checking Python versions..." -ForegroundColor Yellow
py --list

Write-Host "`n📋 IMPORTANT: Make sure you're using Python 3.11!" -ForegroundColor Cyan
Write-Host "   If you see Python 3.13 only, install Python 3.11 first!" -ForegroundColor Red

# Navigate to backend directory
Set-Location "TodosApplication\backend"

# Check if requirements are installed
Write-Host "`n📦 Checking dependencies..." -ForegroundColor Yellow
py -3.11 -m pip list | Select-String -Pattern "flask|speech|pyttsx3|pydub"

Write-Host "`n🚀 Starting the WORKING backend (app.py)..." -ForegroundColor Green
Write-Host "   This will use Python 3.11 and work properly!" -ForegroundColor Cyan

# Start the working backend
py -3.11 app.py

Write-Host "`n✅ Backend should now be running at http://localhost:5000" -ForegroundColor Green
Write-Host "   Speech-to-text and text-to-speech should work!" -ForegroundColor Cyan



















