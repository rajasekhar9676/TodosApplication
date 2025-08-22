# Firebase Security Rules Deployment Script
# This script deploys Firestore security rules to fix invitation permission issues

Write-Host "🚀 Deploying Firebase Security Rules..." -ForegroundColor Green

# Check if Firebase CLI is installed
try {
    $firebaseVersion = firebase --version
    Write-Host "✅ Firebase CLI found: $firebaseVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Firebase CLI not found. Installing..." -ForegroundColor Red
    
    # Install Firebase CLI globally
    Write-Host "📦 Installing Firebase CLI..." -ForegroundColor Yellow
    npm install -g firebase-tools
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Firebase CLI installed successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to install Firebase CLI" -ForegroundColor Red
        exit 1
    }
}

# Login to Firebase (if not already logged in)
Write-Host "🔐 Checking Firebase login status..." -ForegroundColor Yellow
firebase login --no-localhost

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Firebase login failed" -ForegroundColor Red
    exit 1
}

# Initialize Firebase project (if not already initialized)
if (-not (Test-Path ".firebaserc")) {
    Write-Host "🏗️ Initializing Firebase project..." -ForegroundColor Yellow
    firebase init firestore --project steam-outlet-425507-t1 --yes
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Firebase initialization failed" -ForegroundColor Red
        exit 1
    }
}

# Deploy Firestore security rules
Write-Host "📋 Deploying Firestore security rules..." -ForegroundColor Yellow
firebase deploy --only firestore:rules

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Firebase security rules deployed successfully!" -ForegroundColor Green
    Write-Host "🎯 Invitation acceptance should now work properly" -ForegroundColor Green
} else {
    Write-Host "❌ Failed to deploy Firebase security rules" -ForegroundColor Red
    exit 1
}

Write-Host "🚀 Deployment complete! Try accepting an invitation now." -ForegroundColor Green

