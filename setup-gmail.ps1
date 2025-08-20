# PowerShell script to set up Gmail API credentials
Write-Host "🔧 Gmail API Setup for TodoPro" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "This script will help you set up Gmail API credentials for sending invitation emails." -ForegroundColor Yellow
Write-Host ""

Write-Host "📋 Prerequisites:" -ForegroundColor Green
Write-Host "1. Gmail API enabled in Google Cloud Console" -ForegroundColor White
Write-Host "2. OAuth 2.0 Client ID and Client Secret" -ForegroundColor White
Write-Host "3. Refresh Token from OAuth Playground" -ForegroundColor White
Write-Host ""

Write-Host "📝 Please enter your Gmail API credentials:" -ForegroundColor Yellow
Write-Host ""

$gmailApiKey = Read-Host "Gmail API Key (optional, can be empty)"
$gmailClientId = Read-Host "OAuth 2.0 Client ID"
$gmailClientSecret = Read-Host "OAuth 2.0 Client Secret"
$gmailRefreshToken = Read-Host "Refresh Token"
$senderEmail = Read-Host "Sender Email (your Gmail address)"

if ($gmailClientId -and $gmailClientSecret -and $gmailRefreshToken -and $senderEmail) {
    # Create .env content
    $envContent = @"
# Resend Email Configuration (Alternative)
REACT_APP_RESEND_API_KEY=your_resend_api_key_here

# Gmail API Configuration (Primary - for sending from logged-in Gmail)
REACT_APP_GMAIL_API_KEY=$gmailApiKey
REACT_APP_GMAIL_CLIENT_ID=$gmailClientId
REACT_APP_GMAIL_CLIENT_SECRET=$gmailClientSecret
REACT_APP_GMAIL_REFRESH_TOKEN=$gmailRefreshToken
REACT_APP_SENDER_EMAIL=$senderEmail

# Firebase Configuration (already configured in config.ts)
# These are for reference only - actual config is in config.ts
# REACT_APP_FIREBASE_API_KEY=AIzaSyBGjoRRDjXLsmX-hxdQEKez4CxHkIbCcWU
# REACT_APP_FIREBASE_AUTH_DOMAIN=steam-outlet-425507-t1.firebaseapp.com
# REACT_APP_FIREBASE_PROJECT_ID=steam-outlet-425507-t1
# REACT_APP_FIREBASE_STORAGE_BUCKET=steam-outlet-425507-t1.firebasestorage.app
# REACT_APP_FIREBASE_MESSAGING_SENDER_ID=925599253452
# REACT_APP_FIREBASE_APP_ID=1:925599253452:web:d4abc6968b07bb95131369
"@

    # Write to .env file
    Set-Content -Path ".env" -Value $envContent
    
    Write-Host ""
    Write-Host "✅ .env file updated successfully!" -ForegroundColor Green
    Write-Host "📧 Gmail API credentials have been saved." -ForegroundColor Green
    Write-Host ""
    Write-Host "🔄 Please restart your development server:" -ForegroundColor Yellow
    Write-Host "   1. Stop the current server (Ctrl+C)" -ForegroundColor White
    Write-Host "   2. Run: npm start" -ForegroundColor White
    Write-Host ""
    Write-Host "🎯 After restarting, try sending an invitation from a team page!" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📚 For detailed setup instructions, see: GMAIL_SETUP.md" -ForegroundColor Blue
} else {
    Write-Host ""
    Write-Host "❌ Missing required credentials!" -ForegroundColor Red
    Write-Host "   Please provide all required Gmail API credentials." -ForegroundColor Red
    Write-Host ""
    Write-Host "📚 See GMAIL_SETUP.md for detailed setup instructions." -ForegroundColor Yellow
} 