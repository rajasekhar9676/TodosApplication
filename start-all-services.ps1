# Start All Services - Frontend + Backend
Write-Host "🚀 Starting All Services..." -ForegroundColor Green
Write-Host "=" * 50 -ForegroundColor Cyan

# Check Python versions
Write-Host "🔍 Checking Python versions..." -ForegroundColor Yellow
py --list

Write-Host "`n📋 IMPORTANT: Make sure you're using Python 3.11!" -ForegroundColor Cyan
Write-Host "   If you see Python 3.13 only, install Python 3.11 first!" -ForegroundColor Red

# Check if backend dependencies are installed
Write-Host "`n📦 Checking backend dependencies..." -ForegroundColor Yellow
Set-Location "TodosApplication\backend"
py -3.11 -m pip list | Select-String -Pattern "flask|speech|pyttsx3" | Out-Null

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Backend dependencies not found!" -ForegroundColor Red
    Write-Host "   Installing dependencies..." -ForegroundColor Yellow
    py -3.11 -m pip install -r requirements.txt
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies!" -ForegroundColor Red
        Write-Host "   Please check your Python 3.11 installation." -ForegroundColor Yellow
        exit 1
    }
}

Write-Host "✅ Backend dependencies are ready!" -ForegroundColor Green

# Start backend in background
Write-Host "`n🚀 Starting Web API Backend..." -ForegroundColor Green
Start-Process -FilePath "py" -ArgumentList "-3.11", "app_web_api.py" -WorkingDirectory "TodosApplication\backend" -WindowStyle Minimized

# Wait for backend to start
Write-Host "⏳ Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Test backend health
Write-Host "🏥 Testing backend health..." -ForegroundColor Yellow
try {
    $response = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method Get -TimeoutSec 10
    Write-Host "✅ Backend is healthy: $($response.message)" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend health check failed: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "   Backend may still be starting up..." -ForegroundColor Yellow
}

# Start frontend
Write-Host "`n🌐 Starting Frontend..." -ForegroundColor Green
Set-Location "TodosApplication"
Start-Process -FilePath "npm" -ArgumentList "start" -WindowStyle Minimized

Write-Host "`n" + "=" * 50 -ForegroundColor Cyan
Write-Host "🎉 All services are starting!" -ForegroundColor Green
Write-Host "`n📱 Frontend: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔗 Backend: http://localhost:5000" -ForegroundColor Cyan
Write-Host "🔗 API Docs: http://localhost:5000/health" -ForegroundColor Cyan
Write-Host "`n🎤 Speech Features:" -ForegroundColor Yellow
Write-Host "   ✅ Text-to-Speech: Fully functional" -ForegroundColor Green
Write-Host "   ✅ Speech-to-Text: Backend + browser fallback" -ForegroundColor Green
Write-Host "   ✅ 23 Languages supported" -ForegroundColor Green
Write-Host "`n💡 Tips:" -ForegroundColor Cyan
Write-Host "   - Backend will show detailed logs in its terminal" -ForegroundColor White
Write-Host "   - Frontend will open in your browser automatically" -ForegroundColor White
Write-Host "   - Speech features work immediately!" -ForegroundColor White
Write-Host "`n🔧 Troubleshooting:" -ForegroundColor Yellow
Write-Host "   - Check both terminal windows for errors" -ForegroundColor White
Write-Host "   - Run test: py -3.11 test_web_api.py" -ForegroundColor White
Write-Host "   - See WEB_API_SETUP.md for detailed help" -ForegroundColor White

Write-Host "`n🎯 Your Todos Application with Speech Features is Ready!" -ForegroundColor Green



















