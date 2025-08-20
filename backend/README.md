# Speech-to-Text Backend

This is a Python Flask backend that provides speech-to-text functionality using Google's Speech Recognition API. It supports multiple languages including Indian languages.

## Features

- 🎤 Real-time speech recognition
- 🌍 Multi-language support (English, Hindi, Bengali, Telugu, Tamil, Kannada, Malayalam, and more)
- 🔧 Easy setup and configuration
- 📡 RESTful API endpoints
- 🔒 No API keys required (uses Google's free speech recognition service)

## Prerequisites

- Python 3.7 or higher
- pip (Python package installer)
- Microphone access

## Installation

### 1. Navigate to the backend directory
```bash
cd backend
```

### 2. Run the setup script
```bash
python setup.py
```

This will:
- Install all required Python packages
- Check if PyAudio is properly installed
- Provide setup instructions

### 3. Manual Installation (if setup script fails)

Install the required packages:
```bash
pip install -r requirements.txt
```

#### PyAudio Installation Issues

If you encounter issues installing PyAudio, try these platform-specific solutions:

**Windows:**
```bash
pip install PyAudio
```

**macOS:**
```bash
brew install portaudio
pip install PyAudio
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install python3-pyaudio
```

**Linux (CentOS/RHEL):**
```bash
sudo yum install python3-pyaudio
```

## Running the Server

### Start the backend server
```bash
python app.py
```

The server will start on `http://localhost:5000`

### Verify the server is running
```bash
curl http://localhost:5000/health
```

You should see:
```json
{"status": "healthy", "message": "Speech-to-text service is running"}
```

## API Endpoints

### 1. Health Check
- **URL:** `GET /health`
- **Description:** Check if the server is running
- **Response:**
```json
{
  "status": "healthy",
  "message": "Speech-to-text service is running"
}
```

### 2. Transcribe Audio
- **URL:** `POST /transcribe`
- **Description:** Convert audio to text
- **Request Body:**
```json
{
  "audio_data": "base64_encoded_audio_data",
  "language": "en-US"
}
```
- **Response:**
```json
{
  "success": true,
  "text": "Transcribed text here",
  "language": "en-US"
}
```

### 3. Get Supported Languages
- **URL:** `GET /languages`
- **Description:** Get list of supported languages
- **Response:**
```json
{
  "languages": [
    {"code": "en-US", "name": "English (US)"},
    {"code": "hi-IN", "name": "Hindi"},
    // ... more languages
  ]
}
```

## Supported Languages

The backend supports the following languages:

- **English (US)** - `en-US`
- **Hindi** - `hi-IN`
- **Bengali** - `bn-IN`
- **Telugu** - `te-IN`
- **Tamil** - `ta-IN`
- **Kannada** - `kn-IN`
- **Malayalam** - `ml-IN`
- **Gujarati** - `gu-IN`
- **Marathi** - `mr-IN`
- **Punjabi** - `pa-IN`
- **Odia** - `or-IN`
- **Assamese** - `as-IN`
- **Urdu** - `ur-IN`
- **Spanish** - `es-ES`
- **French** - `fr-FR`
- **German** - `de-DE`
- **Italian** - `it-IT`
- **Portuguese** - `pt-PT`
- **Russian** - `ru-RU`
- **Japanese** - `ja-JP`
- **Korean** - `ko-KR`
- **Chinese (Simplified)** - `zh-CN`
- **Arabic** - `ar-SA`

## Integration with React App

The React app is configured to connect to this backend at `http://localhost:5000`. Make sure:

1. The Python backend is running on port 5000
2. CORS is enabled (already configured in the backend)
3. The frontend is running on a different port (typically 3000)

## Troubleshooting

### Common Issues

1. **"No module named 'speech_recognition'"**
   - Run: `pip install SpeechRecognition`

2. **"No module named 'pyaudio'"**
   - Follow the PyAudio installation instructions above

3. **"Microphone access denied"**
   - Check browser permissions for microphone access
   - Make sure you're using HTTPS in production

4. **"Speech recognition could not understand the audio"**
   - Speak clearly and ensure good audio quality
   - Check if the selected language matches your speech
   - Try reducing background noise

5. **"Connection refused"**
   - Make sure the Python backend is running
   - Check if the port 5000 is available
   - Verify the backend URL in the React app

### Debug Mode

To run the server in debug mode with more detailed logs:
```bash
python app.py
```

The server will automatically run in debug mode and show detailed error messages.

## Production Deployment

For production deployment:

1. **Use a production WSGI server:**
```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

2. **Set up environment variables:**
```bash
export FLASK_ENV=production
```

3. **Configure CORS for your domain:**
Update the CORS configuration in `app.py` to allow only your production domain.

4. **Use HTTPS:**
Speech recognition requires HTTPS in production environments.

## License

This project is open source and available under the MIT License. 