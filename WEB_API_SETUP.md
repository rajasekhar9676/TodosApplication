# 🚀 Web API Speech Backend Setup Guide

## 📋 **Prerequisites**

### **Python Version**
- ✅ **Python 3.11** (Required - Python 3.13 has compatibility issues)
- ❌ Python 3.13 (Will cause `aifc` and `audioop` errors)

### **Install Python 3.11**
If you only have Python 3.13:
1. Download Python 3.11 from [python.org](https://www.python.org/downloads/)
2. Install with "Add to PATH" checked
3. Verify installation: `py --list`

## 🛠️ **Installation Steps**

### **Step 1: Install Dependencies**
```powershell
# Navigate to backend directory
cd TodosApplication\backend

# Install requirements with Python 3.11
py -3.11 -m pip install -r requirements.txt
```

### **Step 2: Verify Installation**
```powershell
# Check installed packages
py -3.11 -m pip list | Select-String -Pattern "flask|speech|pyttsx3"
```

**Expected output:**
```
Flask                   2.3.3
Flask-CORS             4.0.0
SpeechRecognition      3.10.0
pyttsx3                2.90
```

## 🚀 **Starting the Backend**

### **Option 1: Use the Script (Recommended)**
```powershell
# Run from project root
.\start-web-api.ps1
```

### **Option 2: Manual Start**
```powershell
# Navigate to backend
cd TodosApplication\backend

# Start with Python 3.11
py -3.11 app_web_api.py
```

## 🔗 **API Endpoints**

### **Health Check**
```
GET /health
```
**Response:**
```json
{
  "status": "healthy",
  "message": "Speech API is running",
  "features": ["speech-to-text", "text-to-speech"],
  "version": "1.0.0"
}
```

### **Get Supported Languages**
```
GET /api/speech/languages
```
**Response:**
```json
{
  "languages": [
    {"code": "en-US", "name": "English (US)", "native": "English"},
    {"code": "hi-IN", "name": "Hindi (India)", "native": "हिंदी"},
    // ... 23 total languages
  ],
  "total": 23,
  "api_status": "success"
}
```

### **Text-to-Speech**
```
POST /api/speech/tts
```
**Request Body:**
```json
{
  "text": "Hello, world!",
  "speed": 150,
  "volume": 0.9
}
```
**Response:**
```json
{
  "success": true,
  "audio_data": "base64_encoded_audio...",
  "text_length": 13,
  "message": "Text converted to speech successfully",
  "api_status": "success",
  "format": "base64_wav"
}
```

### **Speech-to-Text**
```
POST /api/speech/transcribe
```
**Request Body:**
```json
{
  "audio": "base64_encoded_audio...",
  "language": "en-US"
}
```
**Response (Success):**
```json
{
  "success": true,
  "text": "Hello, world!",
  "language": "en-US",
  "method": "backend",
  "confidence": "high"
}
```
**Response (Fallback):**
```json
{
  "success": false,
  "error": "Backend processing failed. Using browser-based recognition.",
  "fallback": "browser",
  "note": "The frontend will automatically use browser-based speech recognition.",
  "api_status": "fallback_available"
}
```

## 🧪 **Testing the API**

### **Run Test Script**
```powershell
# From backend directory
py -3.11 test_web_api.py
```

### **Manual Testing with curl**
```bash
# Health check
curl http://localhost:5000/health

# Get languages
curl http://localhost:5000/api/speech/languages

# Text-to-speech
curl -X POST http://localhost:5000/api/speech/tts \
  -H "Content-Type: application/json" \
  -d '{"text": "Hello, world!", "speed": 150, "volume": 0.9}'
```

## 🌐 **Frontend Integration**

### **Updated Endpoints**
Your frontend has been updated to use the new web API endpoints:

- **Speech-to-Text**: `/api/speech/transcribe`
- **Text-to-Speech**: `/api/speech/tts`

### **Error Handling**
The API provides graceful fallbacks:
- **503 Status**: Indicates fallback to browser-based recognition
- **Detailed Error Messages**: Help with debugging
- **API Status Codes**: Consistent response format

## 🔧 **Troubleshooting**

### **Common Issues**

#### **1. ModuleNotFoundError: No module named 'aifc'**
**Cause:** Using Python 3.13
**Solution:** Install Python 3.11

#### **2. ModuleNotFoundError: No module named 'flask'**
**Cause:** Dependencies not installed
**Solution:** Run `py -3.11 -m pip install -r requirements.txt`

#### **3. Port 5000 already in use**
**Cause:** Another service using the port
**Solution:** 
```powershell
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process
taskkill /PID <PID> /F
```

#### **4. Speech recognition fails**
**Cause:** Audio format issues or missing ffmpeg
**Solution:** The API automatically falls back to browser-based recognition

### **Logs and Debugging**
The backend provides detailed logging:
- ✅ Success messages
- ⚠️ Warning messages  
- ❌ Error messages
- 🔄 Fallback notifications

## 📱 **Features**

### **✅ What Works**
- **Text-to-Speech**: 100% functional
- **Speech-to-Text**: Backend + browser fallback
- **23 Languages**: Full international support
- **Web API**: RESTful endpoints
- **Error Handling**: Graceful fallbacks
- **CORS**: Cross-origin support

### **🔄 Fallback System**
- **Primary**: Backend speech recognition
- **Fallback**: Browser-based recognition
- **Seamless**: User experience maintained

## 🎯 **Next Steps**

1. **Start the backend**: `.\start-web-api.ps1`
2. **Test the API**: `py -3.11 test_web_api.py`
3. **Use in your app**: Speech features should work perfectly!
4. **Optional**: Install ffmpeg for native backend recognition

## 🆘 **Need Help?**

If you encounter issues:
1. Check Python version: `py --list`
2. Verify dependencies: `py -3.11 -m pip list`
3. Check logs in the terminal
4. Run the test script: `py -3.11 test_web_api.py`

---

**🎉 Your speech features are now fully functional with a professional web API!**























