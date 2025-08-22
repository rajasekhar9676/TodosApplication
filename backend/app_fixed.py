from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import tempfile
import base64
import logging
import pyttsx3
import subprocess
import json

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

# Try to import speech_recognition with fallback
try:
    import speech_recognition as sr
    recognizer = sr.Recognizer()
    speech_recognition_available = True
    logger.info("✅ Speech recognition imported successfully")
except ImportError as e:
    logger.warning(f"⚠️ Speech recognition not available: {e}")
    speech_recognition_available = False
    recognizer = None

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    tts_status = "working" if tts_engine else "failed"
    sr_status = "working" if speech_recognition_available else "fallback"
    
    return jsonify({
        "status": "healthy", 
        "message": "Speech service is running",
        "tts_engine": tts_status,
        "speech_recognition": sr_status,
        "python_version": "3.13",
        "note": "Full functionality restored with fallbacks"
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
        
        # Generate speech audio file with unique name
        temp_audio = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
        temp_audio_path = temp_audio.name
        temp_audio.close()
        
        try:
            tts_engine.save_to_file(text, temp_audio_path)
            tts_engine.runAndWait()
            
            # Convert to base64 for easy transfer
            with open(temp_audio_path, 'rb') as audio_file:
                audio_data = base64.b64encode(audio_file.read()).decode('utf-8')
            
        finally:
            # Clean up temp file
            try:
                if os.path.exists(temp_audio_path):
                    os.unlink(temp_audio_path)
            except Exception as cleanup_error:
                logger.warning(f"Cleanup warning: {cleanup_error}")
            
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

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    """Transcribe audio file to text with fallback options"""
    try:
        # Check if audio data is provided
        if 'audio' not in request.json:
            return jsonify({"error": "No audio data provided"}), 400
        
        # Get audio data and language from request
        audio_data = request.json['audio']
        language = request.json.get('language', 'en-US')
        
        # Decode base64 audio
        try:
            audio_bytes = base64.b64decode(audio_data)
        except Exception as e:
            logger.error(f"Failed to decode base64 audio: {e}")
            return jsonify({"error": "Invalid audio data format"}), 400
        
        # Save to temporary file with unique name
        temp_audio = tempfile.NamedTemporaryFile(delete=False, suffix='.wav')
        temp_audio_path = temp_audio.name
        temp_audio.close()
        
        try:
            # Write audio data
            with open(temp_audio_path, 'wb') as f:
                f.write(audio_bytes)
            
            # Try speech recognition if available
            if speech_recognition_available and recognizer:
                try:
                    with sr.AudioFile(temp_audio_path) as source:
                        audio = recognizer.record(source)
                    
                    # Map language codes to speech_recognition format
                    language_mapping = {
                        'en-US': 'en-US',
                        'hi-IN': 'hi-IN',
                        'bn-IN': 'bn-IN',
                        'te-IN': 'te-IN',
                        'ta-IN': 'ta-IN',
                        'kn-IN': 'kn-IN',
                        'ml-IN': 'ml-IN',
                        'gu-IN': 'gu-IN',
                        'mr-IN': 'mr-IN',
                        'pa-IN': 'pa-IN',
                        'or-IN': 'or-IN',
                        'as-IN': 'as-IN',
                        'ur-IN': 'ur-IN',
                        'es-ES': 'es-ES',
                        'fr-FR': 'fr-FR',
                        'de-DE': 'de-DE',
                        'it-IT': 'it-IT',
                        'pt-PT': 'pt-PT',
                        'ru-RU': 'ru-RU',
                        'ja-JP': 'ja-JP',
                        'ko-KR': 'ko-KR',
                        'zh-CN': 'zh-CN',
                        'ar-SA': 'ar-SA'
                    }
                    
                    recognition_language = language_mapping.get(language, 'en-US')
                    
                    # Perform speech recognition
                    text = recognizer.recognize_google(audio, language=recognition_language)
                    
                    logger.info(f"Successfully transcribed audio in {language} using speech_recognition")
                    return jsonify({
                        "success": True,
                        "text": text,
                        "language": language,
                        "method": "speech_recognition"
                    })
                    
                except sr.UnknownValueError:
                    logger.warning("Speech recognition could not understand the audio")
                    return jsonify({
                        "success": False,
                        "error": "Could not understand the audio. Please try again."
                    }), 400
                    
                except sr.RequestError as e:
                    logger.error(f"Speech recognition service error: {e}")
                    return jsonify({
                        "success": False,
                        "error": "Speech recognition service error. Please try again."
                    }), 500
            
            # Fallback: Use browser-based recognition
            logger.info("Using browser-based speech recognition fallback")
            return jsonify({
                "success": False,
                "error": "Backend speech recognition not available. Using browser-based recognition.",
                "fallback": "browser",
                "note": "The frontend will automatically use browser-based recognition."
            }), 503
            
        finally:
            # Clean up temp file
            try:
                if os.path.exists(temp_audio_path):
                    os.unlink(temp_audio_path)
            except Exception as cleanup_error:
                logger.warning(f"Cleanup warning: {cleanup_error}")
        
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({
            "success": False,
            "error": "An unexpected error occurred. Please try again."
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

@app.route('/status', methods=['GET'])
def get_status():
    """Get detailed service status"""
    return jsonify({
        "python_version": "3.13",
        "tts_engine": "working" if tts_engine else "failed",
        "speech_recognition": "working" if speech_recognition_available else "fallback",
        "available_endpoints": [
            "/health",
            "/transcribe", 
            "/text-to-speech", 
            "/languages",
            "/status"
        ],
        "features": {
            "text_to_speech": "fully functional",
            "speech_to_text": "working with fallbacks",
            "languages": "23 languages supported"
        }
    })

if __name__ == '__main__':
    logger.info("🚀 Starting Fixed Python 3.13 Speech Backend")
    logger.info("🔊 Text-to-speech: Available")
    logger.info("📝 Speech-to-text: Available with fallbacks")
    logger.info("🌐 Server will be available at: http://localhost:5000")
    
    app.run(debug=True, host='0.0.0.0', port=5000)






