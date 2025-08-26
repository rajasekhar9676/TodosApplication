# PowerShell script to start both backend and frontend services
# Run this script from the TodosApplication directory

Write-Host "🚀 Starting Todos Application Services" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan

# Function to check if a port is in use
function Test-Port {
    param([int]$Port)
    try {
        $connection = Test-NetConnection -ComputerName localhost -Port $Port -InformationLevel Quiet
        return $connection.TcpTestSucceeded
    } catch {
        return $false
    }
}

# Check if ports are available
Write-Host "Checking port availability..." -ForegroundColor Yellow

if (Test-Port -Port 5000) {
    Write-Host "❌ Port 5000 is already in use. Please stop the service using that port." -ForegroundColor Red
    Write-Host "You can check what's using it with: netstat -ano | findstr :5000" -ForegroundColor Yellow
    exit 1
}

if (Test-Port -Port 3000) {
    Write-Host "⚠️  Port 3000 is already in use. React app might not start properly." -ForegroundColor Yellow
}

# Check if Python backend is ready
Write-Host "Checking Python backend..." -ForegroundColor Yellow
if (-not (Test-Path "backend\app.py")) {
    Write-Host "❌ Backend directory not found. Please run this script from the TodosApplication directory." -ForegroundColor Red
    exit 1
}

# Check if requirements are installed
Write-Host "Checking Python dependencies..." -ForegroundColor Yellow
try {
    $null = python -c "import flask, speech_recognition, pyttsx3" 2>$null
    Write-Host "✅ Python dependencies are installed" -ForegroundColor Green
} catch {
    Write-Host "❌ Python dependencies missing. Please run: .\setup-python-backend.ps1" -ForegroundColor Red
    exit 1
}

# Start Python backend in a new window
Write-Host "Starting Python backend..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD\backend'; python app.py"

# Wait a moment for backend to start
Write-Host "Waiting for backend to start..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

# Test if backend is responding
$maxAttempts = 10
$attempt = 0
$backendReady = $false

while ($attempt -lt $maxAttempts -and -not $backendReady) {
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method Get -TimeoutSec 5
        if ($response.status -eq "healthy") {
            $backendReady = $true
            Write-Host "✅ Backend is running and healthy!" -ForegroundColor Green
        }
    } catch {
        $attempt++
        Write-Host "Waiting for backend... (attempt $attempt/$maxAttempts)" -ForegroundColor Yellow
        Start-Sleep -Seconds 2
    }
}

if (-not $backendReady) {
    Write-Host "❌ Backend failed to start properly. Check the backend window for errors." -ForegroundColor Red
    Write-Host "You can still try to start the frontend manually." -ForegroundColor Yellow
}

# Start React frontend
Write-Host "Starting React frontend..." -ForegroundColor Cyan
if (Test-Path "package.json") {
    Write-Host "✅ Package.json found, starting React app..." -ForegroundColor Green
    
    # Check if node_modules exists
    if (-not (Test-Path "node_modules")) {
        Write-Host "Installing npm dependencies..." -ForegroundColor Yellow
        npm install
    }
    
    # Start React app
    Write-Host "Starting React development server..." -ForegroundColor Cyan
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm start"
    
    Write-Host "`n🎉 Services are starting up!" -ForegroundColor Green
    Write-Host "`n📱 Frontend will be available at: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "🔧 Backend is available at: http://localhost:5000" -ForegroundColor Cyan
    Write-Host "`n💡 Keep both terminal windows open to see the logs." -ForegroundColor Yellow
    Write-Host "💡 Press Ctrl+C in each window to stop the services." -ForegroundColor Yellow
    
} else {
    Write-Host "❌ Package.json not found. Please run this script from the TodosApplication directory." -ForegroundColor Red
}

Write-Host "`nPress any key to exit this script..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")







