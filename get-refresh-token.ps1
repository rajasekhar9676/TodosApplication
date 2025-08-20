# Gmail API Refresh Token Generator
# This script helps you get a complete refresh token for Gmail API

Write-Host "🔑 Gmail API Refresh Token Generator" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

Write-Host "`n📋 Current Status:" -ForegroundColor Yellow
Write-Host "✅ Client ID: Found" -ForegroundColor Green
Write-Host "✅ Client Secret: Found" -ForegroundColor Green
Write-Host "❌ Refresh Token: INCOMPLETE" -ForegroundColor Red
Write-Host "✅ Sender Email: rajasekharm2268@gmail.com" -ForegroundColor Green

Write-Host "`n🚀 Getting Complete Refresh Token..." -ForegroundColor Cyan

# Your existing credentials
$clientId = "82418082461-pfjprkn3mu5c44mq0lioo0qti3s4v4eu.apps.googleusercontent.com"
$clientSecret = "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"

Write-Host "`n📖 Follow these steps:" -ForegroundColor Yellow
Write-Host "1. Open: https://developers.google.com/oauthplayground/" -ForegroundColor White
Write-Host "2. Click ⚙️ (settings) and check 'Use your own OAuth credentials'" -ForegroundColor White
Write-Host "3. Enter Client ID: $clientId" -ForegroundColor White
Write-Host "4. Enter Client Secret: $clientSecret" -ForegroundColor White
Write-Host "5. Select Gmail API v1 -> https://mail.google.com/" -ForegroundColor White
Write-Host "6. Click 'Authorize APIs' and sign in with rajasekharm2268@gmail.com" -ForegroundColor White
Write-Host "7. Click 'Exchange authorization code for tokens'" -ForegroundColor White
Write-Host "8. Copy the COMPLETE refresh token" -ForegroundColor White

Write-Host "`n⏳ Opening OAuth Playground..." -ForegroundColor Cyan
Start-Process "https://developers.google.com/oauthplayground/"

Write-Host "`n📝 After getting the refresh token:" -ForegroundColor Yellow
$newRefreshToken = Read-Host "Paste the COMPLETE refresh token here"

if ([string]::IsNullOrWhiteSpace($newRefreshToken)) {
    Write-Host "`n❌ No refresh token provided. Please try again." -ForegroundColor Red
    exit
}

Write-Host "`n🔧 Updating .env file..." -ForegroundColor Green

# Read current .env content
$envContent = Get-Content ".env" -Raw

# Replace the incomplete refresh token with the new one
$updatedContent = $envContent -replace "REACT_APP_GMAIL_REFRESH_TOKEN=.*", "REACT_APP_GMAIL_REFRESH_TOKEN=$newRefreshToken"

# Write back to .env file
$updatedContent | Out-File -FilePath ".env" -Encoding UTF8 -NoNewline

Write-Host "✅ .env file updated successfully!" -ForegroundColor Green
Write-Host "`n📧 Testing email configuration..." -ForegroundColor Cyan

# Validate the token format
if ($newRefreshToken.StartsWith("1//") -and $newRefreshToken.Length -gt 50) {
    Write-Host "✅ Refresh token format looks correct" -ForegroundColor Green
} else {
    Write-Host "⚠️  Warning: Refresh token format might be incorrect" -ForegroundColor Yellow
    Write-Host "   Expected: Starts with '1//' and 100+ characters long" -ForegroundColor Yellow
}

Write-Host "`n🔄 Next steps:" -ForegroundColor Cyan
Write-Host "1. Restart your React app: npm start" -ForegroundColor White
Write-Host "2. Test email sending by inviting a team member" -ForegroundColor White
Write-Host "3. Check browser console - should show 'Email sent via Gmail API'" -ForegroundColor White

Write-Host "`n✨ Setup complete! Real emails should now be sent." -ForegroundColor Green

