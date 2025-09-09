# PowerShell script to start Python 3.13 compatible backend
# Run this script from the TodosApplication directory

Write-Host "🚀 Starting Python 3.13 Compatible Backend" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Check if Python 3.13 is available
Write-Host "Checking Python 3.13..." -ForegroundColor Yellow
try {
    $pythonVersion = python --version 2>&1
    if ($pythonVersion -like "*3.13*") {
        Write-Host "✅ Python 3.13 found: $pythonVersion" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Python version: $pythonVersion (Expected 3.13)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Python not found. Please install Python 3.13" -ForegroundColor Red
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

# Install Python 3.13 compatible requirements
Write-Host "Installing Python 3.13 compatible requirements..." -ForegroundColor Yellow
try {
    pip install -r requirements_python313.txt
    Write-Host "✅ Requirements installed successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ Error installing requirements. Trying individual packages..." -ForegroundColor Red
    
    # Try installing packages individually
    $packages = @("Flask==2.3.3", "Flask-CORS==4.0.0", "pyttsx3==2.90", "requests==2.31.0")
    
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

# Test the installation
Write-Host "Testing installation..." -ForegroundColor Yellow
try {
    python -c "import flask; print('✅ Flask imported successfully')"
    Write-Host "✅ Flask test passed!" -ForegroundColor Green
} catch {
    Write-Host "❌ Flask test failed" -ForegroundColor Red
}

try {
    python -c "import pyttsx3; print('✅ pyttsx3 imported successfully')"
    Write-Host "✅ pyttsx3 test passed!" -ForegroundColor Green
} catch {
    Write-Host "❌ pyttsx3 test failed" -ForegroundColor Red
}

# Start the Python 3.13 compatible backend
Write-Host "`n🎉 Setup completed!" -ForegroundColor Green
Write-Host "`nStarting Python 3.13 compatible backend..." -ForegroundColor Cyan
Write-Host "Note: Speech-to-text will use browser-based recognition" -ForegroundColor Yellow
Write-Host "Text-to-speech: Fully functional" -ForegroundColor Green

# Start the server
python app_python313.py
























