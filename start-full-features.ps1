# PowerShell script to start backend with ALL features working
# Run this script from the TodosApplication directory

Write-Host "🚀 Starting Full-Featured Speech Backend" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Check if Python is available
Write-Host "Checking Python..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Please install Python" -ForegroundColor Red
    exit 1
}

# Navigate to backend directory
Write-Host "Navigating to backend directory..." -ForegroundColor Yellow
if (Test-Path "backend") {
    Set-Location "backend"
    Write-Host "✅ Backend directory found" -ForegroundColor Green
} else {
    Write-Host "❌ Backend directory not found. Please run this script from the TodosApplication directory." -ForegroundColor Red
    exit 1
}

# Try to install all requirements
Write-Host "Installing all requirements..." -ForegroundColor Yellow
try {
    pip install -r requirements_full.txt
    Write-Host "✅ All requirements installed successfully!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  Some packages failed to install. Trying individual packages..." -ForegroundColor Yellow
    
    # Try installing packages individually
    $packages = @(
        "Flask==2.3.3",
        "Flask-CORS==4.0.0", 
        "pyttsx3==2.90",
        "requests==2.31.0"
    )
    
    foreach ($package in $packages) {
        Write-Host "Installing $package..." -ForegroundColor Yellow
        try {
            pip install $package
            Write-Host "✅ $package installed" -ForegroundColor Green
        } catch {
            Write-Host "❌ Failed to install $package" -ForegroundColor Red
        }
    }
    
    # Try speech recognition separately
    Write-Host "Trying to install SpeechRecognition..." -ForegroundColor Yellow
    try {
        pip install SpeechRecognition==3.10.0
        Write-Host "✅ SpeechRecognition installed" -ForegroundColor Green
    } catch {
        Write-Host "⚠️  SpeechRecognition failed - will use fallback" -ForegroundColor Yellow
    }
}

# Test the installation
Write-Host "Testing installation..." -ForegroundColor Yellow

# Test Flask
try {
    python -c "import flask; print('✅ Flask imported successfully')"
    Write-Host "✅ Flask test passed!" -ForegroundColor Green
} catch {
    Write-Host "❌ Flask test failed" -ForegroundColor Red
}

# Test pyttsx3
try {
    python -c "import pyttsx3; print('✅ pyttsx3 imported successfully')"
    Write-Host "✅ pyttsx3 test passed!" -ForegroundColor Green
} catch {
    Write-Host "❌ pyttsx3 test failed" -ForegroundColor Red
}

# Test speech recognition
try {
    python -c "import speech_recognition; print('✅ SpeechRecognition imported successfully')"
    Write-Host "✅ SpeechRecognition test passed!" -ForegroundColor Green
    Write-Host "🎉 Full speech features will be available!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  SpeechRecognition test failed - will use fallback" -ForegroundColor Yellow
    Write-Host "📝 Speech-to-text will use browser-based recognition" -ForegroundColor Yellow
}

# Start the backend
Write-Host "`n🎉 Setup completed!" -ForegroundColor Green
Write-Host "`nStarting backend with full features..." -ForegroundColor Cyan

# Try to start the fixed version first
if (Test-Path "app_fixed.py") {
    Write-Host "Starting app_fixed.py (full features with fallbacks)..." -ForegroundColor Cyan
    python app_fixed.py
} else {
    Write-Host "Starting app_python313.py (limited features)..." -ForegroundColor Cyan
    python app_python313.py
}



















