from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import tempfile
import base64
import logging
import pyttsx3

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize TTS engine
try:
    tts_engine = pyttsx3.init()
    logger.info("✅ TTS engine initialized successfully")
except Exception as e:
    logger.error(f"❌ Failed to initialize TTS engine: {e}")
    tts_engine = None

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    tts_status = "working" if tts_engine else "failed"
    return jsonify({
        "status": "healthy", 
        "message": "Speech service is running",
        "tts_engine": tts_status,
        "python_version": "3.13",
        "note": "Speech-to-text uses browser-based recognition"
    })

@app.route('/text-to-speech', methods=['POST'])
def text_to_speech():
    """Convert text to speech and return audio file"""
    if not tts_engine:
        return jsonify({
            "success": False, 
            "error": "TTS engine not available"
        }), 500
    
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"success": False, "error": "No text provided"}), 400
        
        text = data['text']
        voice_speed = data.get('speed', 150)  # Default speed
        voice_volume = data.get('volume', 0.9)  # Default volume
        
        if not text.strip():
            return jsonify({"success": False, "error": "Text is empty"}), 400
        
        logger.info(f"Converting text to speech: {len(text)} characters")
        
        # Configure TTS settings
        tts_engine.setProperty('rate', voice_speed)
        tts_engine.setProperty('volume', voice_volume)
        
        # Generate speech audio file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_audio:
            tts_engine.save_to_file(text, temp_audio.name)
            tts_engine.runAndWait()
            
            # Convert to base64 for easy transfer
            with open(temp_audio.name, 'rb') as audio_file:
                audio_data = base64.b64encode(audio_file.read()).decode('utf-8')
            
            # Clean up temp file
            os.unlink(temp_audio.name)
            
        return jsonify({
            "success": True,
            "audio_data": audio_data,
            "text_length": len(text),
            "message": "Text converted to speech successfully"
        })
        
    except Exception as e:
        logger.error(f"TTS error: {e}")
        return jsonify({
            "success": False, 
            "error": f"Text-to-speech conversion failed: {str(e)}"
        }), 500

@app.route('/languages', methods=['GET'])
def get_supported_languages():
    """Get list of supported languages"""
    languages = [
        {"code": "en-US", "name": "English (US)"},
        {"code": "hi-IN", "name": "Hindi"},
        {"code": "bn-IN", "name": "Bengali"},
        {"code": "te-IN", "name": "Telugu"},
        {"code": "ta-IN", "name": "Tamil"},
        {"code": "kn-IN", "name": "Kannada"},
        {"code": "ml-IN", "name": "Malayalam"},
        {"code": "gu-IN", "name": "Gujarati"},
        {"code": "mr-IN", "name": "Marathi"},
        {"code": "pa-IN", "name": "Punjabi"},
        {"code": "or-IN", "name": "Odia"},
        {"code": "as-IN", "name": "Assamese"},
        {"code": "ur-IN", "name": "Urdu"},
        {"code": "es-ES", "name": "Spanish"},
        {"code": "fr-FR", "name": "French"},
        {"code": "de-DE", "name": "German"},
        {"code": "it-IT", "name": "Italian"},
        {"code": "pt-PT", "name": "Portuguese"},
        {"code": "ru-RU", "name": "Russian"},
        {"code": "ja-JP", "name": "Japanese"},
        {"code": "ko-KR", "name": "Korean"},
        {"code": "zh-CN", "name": "Chinese (Simplified)"},
        {"code": "ar-SA", "name": "Arabic"}
    ]
    return jsonify({"languages": languages})

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    """Note: This endpoint is disabled in Python 3.13 version"""
    return jsonify({
        "success": False,
        "error": "Speech-to-text is not available in this Python 3.13 version. Use browser-based speech recognition instead.",
        "note": "The frontend will automatically use browser-based speech recognition when this endpoint is unavailable."
    }), 501

@app.route('/status', methods=['GET'])
def get_status():
    """Get detailed service status"""
    return jsonify({
        "python_version": "3.13",
        "tts_engine": "working" if tts_engine else "failed",
        "speech_recognition": "disabled (Python 3.13 compatibility)",
        "available_endpoints": [
            "/health",
            "/text-to-speech", 
            "/languages",
            "/status"
        ],
        "frontend_speech_recognition": "browser-based (Web Speech API)"
    })

if __name__ == '__main__':
    logger.info("🚀 Starting Python 3.13 Compatible Speech Backend")
    logger.info("📝 Note: Speech-to-text uses browser-based recognition")
    logger.info("🔊 Text-to-speech: Available")
    logger.info("🌐 Server will be available at: http://localhost:5000")
    
    app.run(debug=True, host='0.0.0.0', port=5000)




















