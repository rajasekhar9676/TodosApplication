# Gmail API Setup Script for TodoPro
# This script helps you set up Gmail API credentials for email sending

Write-Host "🚀 Gmail API Setup for TodoPro" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

Write-Host "`n📋 You need to gather the following credentials:" -ForegroundColor Yellow
Write-Host "1. Gmail Client ID" -ForegroundColor White
Write-Host "2. Gmail Client Secret" -ForegroundColor White  
Write-Host "3. Gmail Refresh Token" -ForegroundColor White
Write-Host "4. Your Gmail Address" -ForegroundColor White

Write-Host "`n📖 Follow these steps to get credentials:" -ForegroundColor Cyan
Write-Host "1. Go to https://console.cloud.google.com/" -ForegroundColor White
Write-Host "2. Create/select project" -ForegroundColor White
Write-Host "3. Enable Gmail API" -ForegroundColor White
Write-Host "4. Create OAuth 2.0 credentials" -ForegroundColor White
Write-Host "5. Use OAuth Playground to get refresh token" -ForegroundColor White
Write-Host "`n📚 Detailed instructions: See GMAIL_SETUP.md" -ForegroundColor Cyan

Write-Host "`n🔧 Setting up .env file..." -ForegroundColor Green

# Prompt for credentials
$clientId = Read-Host "`nEnter Gmail Client ID (or press Enter to skip and use demo mode)"
$clientSecret = Read-Host "Enter Gmail Client Secret (or press Enter to skip)"
$refreshToken = Read-Host "Enter Gmail Refresh Token (or press Enter to skip)"
$senderEmail = Read-Host "Enter your Gmail address (default: rajasekharm2268@gmail.com)"

if ([string]::IsNullOrWhiteSpace($senderEmail)) {
    $senderEmail = "rajasekharm2268@gmail.com"
}

# Create .env file content
$envContent = @"
# Gmail API Configuration
REACT_APP_GMAIL_CLIENT_ID=$clientId
REACT_APP_GMAIL_CLIENT_SECRET=$clientSecret
REACT_APP_GMAIL_REFRESH_TOKEN=$refreshToken
REACT_APP_SENDER_EMAIL=$senderEmail

# Backend URL
REACT_APP_BACKEND_URL=http://localhost:5000

# Note: Add your Firebase credentials here if needed
# REACT_APP_FIREBASE_API_KEY=your_firebase_api_key
# REACT_APP_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
# REACT_APP_FIREBASE_PROJECT_ID=your_project_id
# REACT_APP_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
# REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
# REACT_APP_FIREBASE_APP_ID=your_app_id
"@

# Write to .env file
$envContent | Out-File -FilePath ".env" -Encoding UTF8

if ([string]::IsNullOrWhiteSpace($clientId)) {
    Write-Host "`n⚠️  Gmail credentials not provided - emails will run in DEMO MODE" -ForegroundColor Yellow
    Write-Host "   Check the browser console to see email content" -ForegroundColor Yellow
    Write-Host "   To enable real email sending, run this script again with credentials" -ForegroundColor Yellow
} else {
    Write-Host "`n✅ Gmail API configured successfully!" -ForegroundColor Green
    Write-Host "   Emails will be sent from: $senderEmail" -ForegroundColor Green
}

Write-Host "`n📁 Created .env file with your configuration" -ForegroundColor Green
Write-Host "🔄 Please restart your development server: npm start" -ForegroundColor Cyan

Write-Host "`n🧪 To test email sending:" -ForegroundColor Yellow
Write-Host "1. Start the app: npm start" -ForegroundColor White
Write-Host "2. Create a team" -ForegroundColor White
Write-Host "3. Invite a member" -ForegroundColor White
Write-Host "4. Check browser console for results" -ForegroundColor White

Write-Host "`n✨ Setup complete!" -ForegroundColor Green

