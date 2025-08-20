# PowerShell script to set up Python Speech-to-Text Backend
# Run this script from the TodosApplication directory

Write-Host "🎤 Setting up Python Speech-to-Text Backend" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# Check if Python is installed
Write-Host "Checking Python installation..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    Write-Host "✅ Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Python not found. Please install Python 3.7+ from https://python.org" -ForegroundColor Red
    exit 1
}

# Check if pip is available
Write-Host "Checking pip installation..." -ForegroundColor Yellow
try {
    $pipVersion = pip --version 2>&1
    Write-Host "✅ pip found: $pipVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ pip not found. Please install pip" -ForegroundColor Red
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

# Install Python requirements
Write-Host "Installing Python requirements..." -ForegroundColor Yellow
try {
    pip install -r requirements.txt
    Write-Host "✅ Requirements installed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Error installing requirements. Trying individual packages..." -ForegroundColor Red
    
    # Try installing packages individually
    $packages = @("Flask==2.3.3", "Flask-CORS==4.0.0", "SpeechRecognition==3.10.0", "Werkzeug==2.3.7")
    
    foreach ($package in $packages) {
        Write-Host "Installing $package..." -ForegroundColor Yellow
        try {
            pip install $package
            Write-Host "✅ $package installed" -ForegroundColor Green
        } catch {
            Write-Host "❌ Failed to install $package" -ForegroundColor Red
        }
    }
}

# Try to install PyAudio
Write-Host "Installing PyAudio..." -ForegroundColor Yellow
try {
    pip install PyAudio
    Write-Host "✅ PyAudio installed successfully!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  PyAudio installation failed. This is common on Windows." -ForegroundColor Yellow
    Write-Host "Trying alternative installation methods..." -ForegroundColor Yellow
    
    # Try installing from wheel
    try {
        pip install pipwin
        pipwin install pyaudio
        Write-Host "✅ PyAudio installed via pipwin!" -ForegroundColor Green
    } catch {
        Write-Host "❌ PyAudio installation failed. Please install manually:" -ForegroundColor Red
        Write-Host "1. Download PyAudio wheel from: https://www.lfd.uci.edu/~gohlke/pythonlibs/#pyaudio" -ForegroundColor Yellow
        Write-Host "2. Install with: pip install PyAudio-0.1.23-cp39-cp39-win_amd64.whl" -ForegroundColor Yellow
        Write-Host "   (Choose the correct version for your Python version)" -ForegroundColor Yellow
    }
}

# Test the installation
Write-Host "Testing installation..." -ForegroundColor Yellow
try {
    python -c "import speech_recognition; print('✅ SpeechRecognition imported successfully')"
    Write-Host "✅ SpeechRecognition test passed!" -ForegroundColor Green
} catch {
    Write-Host "❌ SpeechRecognition test failed" -ForegroundColor Red
}

try {
    python -c "import pyaudio; print('✅ PyAudio imported successfully')"
    Write-Host "✅ PyAudio test passed!" -ForegroundColor Green
} catch {
    Write-Host "⚠️  PyAudio test failed - you may need to install it manually" -ForegroundColor Yellow
}

# Start the server
Write-Host "`n🎉 Setup completed!" -ForegroundColor Green
Write-Host "`nTo start the backend server, run:" -ForegroundColor Cyan
Write-Host "  cd backend" -ForegroundColor White
Write-Host "  python app.py" -ForegroundColor White
Write-Host "`nThe server will be available at: http://localhost:5000" -ForegroundColor Cyan
Write-Host "`nMake sure to start the React app in a separate terminal:" -ForegroundColor Yellow
Write-Host "  npm start" -ForegroundColor White

# Ask if user wants to start the server now
$startServer = Read-Host "`nDo you want to start the server now? (y/n)"
if ($startServer -eq "y" -or $startServer -eq "Y") {
    Write-Host "Starting Python backend server..." -ForegroundColor Cyan
    python app.py
} 