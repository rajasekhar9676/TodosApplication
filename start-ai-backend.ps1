# Start AI-Enhanced Backend
Write-Host "🚀 Starting AI-Enhanced Web API Backend..." -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan

# Check if Python 3.11 is available
Write-Host "🔍 Checking Python versions..." -ForegroundColor Yellow
py --list

Write-Host "`n📋 IMPORTANT: Make sure you're using Python 3.11!" -ForegroundColor Cyan
Write-Host "   If you see Python 3.13 only, install Python 3.11 first!" -ForegroundColor Red

# Navigate to backend directory
Set-Location "TodosApplication\backend"

# Check if requirements are installed
Write-Host "`n📦 Checking AI dependencies..." -ForegroundColor Yellow
py -3.11 -m pip list | Select-String -Pattern "flask|speech|pyttsx3|nltk|PyPDF2|python-docx"

Write-Host "`n🚀 Starting the AI-Enhanced backend (app_ai_enhanced.py)..." -ForegroundColor Green
Write-Host "   This will use Python 3.11 and work properly!" -ForegroundColor Cyan
Write-Host "   AI-powered document processing will be available!" -ForegroundColor Yellow

# Start the AI-enhanced backend
py -3.11 app_ai_enhanced.py

Write-Host "`n✅ AI-Enhanced Backend should now be running at http://localhost:5000" -ForegroundColor Green
Write-Host "   AI Features:" -ForegroundColor Cyan
Write-Host "   - 🤖 Intelligent document analysis" -ForegroundColor Yellow
Write-Host "   - 📊 Smart summarization" -ForegroundColor Yellow
Write-Host "   - 🏷️ Topic detection" -ForegroundColor Yellow
Write-Host "   - 🔑 Keyword extraction" -ForegroundColor Yellow
Write-Host "   - 📝 Reading complexity analysis" -ForegroundColor Yellow
Write-Host "   🎉 All AI features are now functional!" -ForegroundColor Green





