# Speech Features Troubleshooting Guide

## 🚨 Common Issues and Solutions

### 1. Backend Not Running
**Symptoms:** 
- "Failed to fetch" errors in browser console
- Speech-to-text and text-to-speech not working
- Network errors when trying to use speech features

**Solution:**
1. Open a terminal/PowerShell in the `TodosApplication` directory
2. Run the setup script: `.\setup-python-backend.ps1`
3. Or manually start the backend:
   ```bash
   cd backend
   python app.py
   ```
4. Verify the backend is running at `http://localhost:5000`

### 2. Python Dependencies Missing
**Symptoms:**
- Import errors when starting the backend
- ModuleNotFoundError for speech_recognition, pyttsx3, etc.

**Solution:**
1. Install dependencies:
   ```bash
   cd backend
   pip install -r requirements.txt
   ```
2. If PyAudio fails on Windows, try:
   ```bash
   pip install pipwin
   pipwin install pyaudio
   ```

### 3. Microphone Permission Issues
**Symptoms:**
- "Permission denied" errors
- Microphone not working in browser

**Solution:**
1. Check browser microphone permissions
2. Allow microphone access when prompted
3. Refresh the page after granting permissions

### 4. Audio Format Issues
**Symptoms:**
- Recording works but transcription fails
- "Could not understand the audio" errors

**Solution:**
1. Speak clearly and avoid background noise
2. Ensure microphone is working properly
3. Try different languages if available

## 🔧 Testing Your Setup

### Test Backend Endpoints
1. Start the backend: `python backend/app.py`
2. Run the test script: `python backend/test_backend.py`
3. Check browser console for any errors

### Test Frontend
1. Start React app: `npm start`
2. Open browser console (F12)
3. Try recording audio and check for errors
4. Try text-to-speech and check for errors

## 📋 Required Services

### Backend (Python Flask)
- **Port:** 5000
- **URL:** http://localhost:5000
- **Endpoints:**
  - `/health` - Health check
  - `/transcribe` - Speech-to-text
  - `/text-to-speech` - Text-to-speech
  - `/languages` - Supported languages

### Frontend (React)
- **Port:** 3000 (default)
- **Backend URL:** http://localhost:5000

## 🐛 Debug Steps

1. **Check Backend Status:**
   ```bash
   curl http://localhost:5000/health
   ```

2. **Check Browser Console:**
   - Open DevTools (F12)
   - Look for network errors
   - Check for JavaScript errors

3. **Check Backend Logs:**
   - Look at the terminal running `python app.py`
   - Check for Python errors or exceptions

4. **Test Individual Endpoints:**
   ```bash
   # Test text-to-speech
   curl -X POST http://localhost:5000/text-to-speech \
     -H "Content-Type: application/json" \
     -d '{"text":"Hello world","speed":150,"volume":0.9}'
   ```

## 🆘 Still Having Issues?

1. **Restart Everything:**
   - Stop both frontend and backend
   - Clear browser cache
   - Restart both services

2. **Check Port Conflicts:**
   - Ensure port 5000 is not used by another service
   - Try changing the backend port in `app.py`

3. **Verify Python Version:**
   - Use Python 3.7 or higher
   - Check with: `python --version`

4. **Check Firewall/Antivirus:**
   - Ensure localhost connections are allowed
   - Check if antivirus is blocking Python processes

## 📞 Getting Help

If you're still experiencing issues:
1. Check the browser console for specific error messages
2. Check the backend terminal for Python errors
3. Run the test script: `python backend/test_backend.py`
4. Share the error messages and logs







