# 🎤 Speech Features Setup Guide

## Quick Start

### 1. Start Everything with One Script
```powershell
# Run this from the TodosApplication directory
.\start-services.ps1
```

This script will:
- ✅ Check if Python dependencies are installed
- ✅ Start the Python backend server
- ✅ Start the React frontend
- ✅ Verify both services are running

### 2. Manual Setup (if needed)

#### Backend Setup
```powershell
# Install Python dependencies
cd backend
pip install -r requirements.txt

# Start the backend server
python app.py
```

#### Frontend Setup
```powershell
# Install npm dependencies (if not already done)
npm install

# Start React app
npm start
```

## 🧪 Testing

### Test Backend
```powershell
cd backend
python test_backend.py
```

### Test Frontend
1. Open http://localhost:3000
2. Navigate to a page with speech features
3. Try recording audio or converting text to speech
4. Check browser console (F12) for any errors

## 🔧 What's Fixed

1. **TypeScript Error**: Added proper return type `Promise<string | null>` to `transcribeWithPythonBackend`
2. **Missing TTS Endpoint**: Added text-to-speech endpoint to the main `app.py`
3. **Dependencies**: Added `requests` library for testing
4. **Error Handling**: Improved error handling and logging

## 📍 Service URLs

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## 🚨 Common Issues

1. **"Failed to fetch" errors**: Backend not running
2. **Import errors**: Python dependencies not installed
3. **Port conflicts**: Another service using port 5000 or 3000

## 📞 Need Help?

1. Check the `TROUBLESHOOTING.md` file
2. Run the test script: `python backend/test_backend.py`
3. Check browser console and backend terminal for errors
4. Ensure both services are running on the correct ports




