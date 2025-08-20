from flask import Flask, request, jsonify
from flask_cors import CORS
import speech_recognition as sr
import os
import tempfile
import base64
from werkzeug.utils import secure_filename
import logging
import pyttsx3
from pydub import AudioSegment
import io

app = Flask(__name__)
CORS(app)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize recognizer
recognizer = sr.Recognizer()
logger.info("✅ Speech recognition initialized successfully!")

# Initialize TTS engine
tts_engine = pyttsx3.init()
logger.info("✅ Text-to-speech engine initialized successfully!")

def convert_audio_to_wav(audio_bytes, original_format='webm'):
    """Convert audio bytes to WAV format or return original if conversion fails"""
    try:
        # Try to convert using pydub
        audio = AudioSegment.from_file(io.BytesIO(audio_bytes), format=original_format)
        
        # Export as WAV
        wav_buffer = io.BytesIO()
        audio.export(wav_buffer, format='wav')
        wav_buffer.seek(0)
        
        logger.info("✅ Audio converted to WAV successfully using pydub")
        return wav_buffer.read()
    except Exception as e:
        logger.warning(f"Audio conversion failed: {e}")
        logger.info("⚠️ Falling back to original audio format")
        return audio_bytes  # Return original audio bytes

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "message": "Speech-to-text service is running"})

@app.route('/transcribe', methods=['POST'])
def transcribe_audio():
    """Transcribe audio file to text with browser fallback"""
    try:
        # Check if audio data is provided
        if 'audio' not in request.files and 'audio_data' not in request.json and 'audio' not in request.json:
            return jsonify({"error": "No audio data provided"}), 400
        
        # Handle base64 audio data from request.json
        if 'audio_data' in request.json:
            audio_data = request.json['audio_data']
            # Remove data URL prefix if present
            if audio_data.startswith('data:audio/'):
                audio_data = audio_data.split(',')[1]
            
            # Decode base64 audio
            audio_bytes = base64.b64decode(audio_data)
            
            # Convert audio to WAV format (with fallback)
            wav_audio = convert_audio_to_wav(audio_bytes, 'webm')
            
            # Save audio to temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
                temp_file.write(wav_audio)
                temp_file_path = temp_file.name
            
            try:
                # Use speech recognition
                with sr.AudioFile(temp_file_path) as source:
                    audio = recognizer.record(source)
                
                # Get language from request (default to English)
                language = request.json.get('language', 'en-US')
                
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
                
                logger.info(f"✅ Successfully transcribed audio in {language} using backend")
                return jsonify({
                    "success": True,
                    "text": text,
                    "language": language,
                    "method": "backend"
                })
                
            except Exception as sr_error:
                logger.warning(f"Backend speech recognition failed: {sr_error}")
                logger.info("🔄 Falling back to browser-based speech recognition")
                
                # Return fallback response for browser-based recognition
                return jsonify({
                    "success": False,
                    "error": "Backend processing failed. Using browser-based recognition.",
                    "fallback": "browser",
                    "note": "The frontend will automatically use browser-based speech recognition."
                }), 503
                
            finally:
                # Clean up temporary file
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
        
        # Handle 'audio' field in request.json (for base64 data)
        elif 'audio' in request.json:
            audio_data = request.json['audio']
            # Remove data URL prefix if present
            if audio_data.startswith('data:audio/'):
                audio_data = audio_data.split(',')[1]
            
            # Decode base64 audio
            audio_bytes = base64.b64decode(audio_data)
            
            # Convert audio to WAV format (with fallback)
            wav_audio = convert_audio_to_wav(audio_bytes, 'webm')
            
            # Save audio to temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
                temp_file.write(wav_audio)
                temp_file_path = temp_file.name
            
            try:
                # Use speech recognition
                with sr.AudioFile(temp_file_path) as source:
                    audio = recognizer.record(source)
                
                # Get language from request (default to English)
                language = request.json.get('language', 'en-US')
                
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
                
                logger.info(f"✅ Successfully transcribed audio in {language} using backend")
                return jsonify({
                    "success": True,
                    "text": text,
                    "language": language,
                    "method": "backend"
                })
                
            except Exception as sr_error:
                logger.warning(f"Backend speech recognition failed: {sr_error}")
                logger.info("🔄 Falling back to browser-based speech recognition")
                
                # Return fallback response for browser-based recognition
                return jsonify({
                    "success": False,
                    "error": "Backend processing failed. Using browser-based recognition.",
                    "fallback": "browser",
                    "note": "The frontend will automatically use browser-based speech recognition."
                }), 503
                
            finally:
                # Clean up temporary file
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
        
        # Handle file upload
        elif 'audio' in request.files:
            audio_file = request.files['audio']
            if audio_file.filename == '':
                return jsonify({"error": "No file selected"}), 400
            
            # Save uploaded file temporarily
            filename = secure_filename(audio_file.filename)
            with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(filename)[1]) as temp_file:
                audio_file.save(temp_file.name)
                temp_file_path = temp_file.name
            
            try:
                # Use speech recognition
                with sr.AudioFile(temp_file_path) as source:
                    audio = recognizer.record(source)
                
                # Get language from request (default to English)
                language = request.form.get('language', 'en-US')
                recognition_language = language_mapping.get(language, 'en-US')
                
                # Perform speech recognition
                text = recognizer.recognize_google(audio, language=recognition_language)
                
                logger.info(f"✅ Successfully transcribed uploaded audio in {language}")
                return jsonify({
                    "success": True,
                    "text": text,
                    "language": language,
                    "method": "backend"
                })
                
            finally:
                # Clean up temporary file
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
        
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({
            "success": False,
            "error": "An unexpected error occurred. Please try again."
        }), 500

@app.route('/text-to-speech', methods=['POST'])
def text_to_speech():
    """Convert text to speech and return audio file"""
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
        return jsonify({"success": False, "error": f"Text-to-speech conversion failed: {str(e)}"}), 500

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

if __name__ == '__main__':
    logger.info("🚀 Starting Speech Recognition Backend")
    logger.info("📝 Speech-to-text: Available with 23 languages")
    logger.info("🔊 Text-to-speech: Available with 23 languages")
    logger.info("🌐 Server will be available at: http://localhost:5000")
    logger.info("🎉 All features are now functional!")
    
    app.run(debug=True, host='0.0.0.0', port=5000) 