# PowerShell script to update .env file with Resend API key
Write-Host "🔧 Resend API Key Setup" -ForegroundColor Cyan
Write-Host "=========================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Please enter your Resend API key (it should start with 're_'):" -ForegroundColor Yellow
$apiKey = Read-Host

if ($apiKey -and $apiKey.StartsWith("re_")) {
    # Update the .env file
    $envContent = "REACT_APP_RESEND_API_KEY=$apiKey"
    Set-Content -Path ".env" -Value $envContent
    
    Write-Host ""
    Write-Host "✅ .env file updated successfully!" -ForegroundColor Green
    Write-Host "📧 Your Resend API key has been saved." -ForegroundColor Green
    Write-Host ""
    Write-Host "🔄 Please restart your development server:" -ForegroundColor Yellow
    Write-Host "   1. Stop the current server (Ctrl+C)" -ForegroundColor White
    Write-Host "   2. Run: npm start" -ForegroundColor White
    Write-Host ""
    Write-Host "🎯 After restarting, try sending an invitation again!" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Invalid API key format!" -ForegroundColor Red
    Write-Host "   The API key should start with 're_'" -ForegroundColor Red
    Write-Host ""
    Write-Host "📝 Please run this script again with a valid API key." -ForegroundColor Yellow
} 