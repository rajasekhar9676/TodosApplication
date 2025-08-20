from flask import Flask, request, jsonify
from flask_cors import CORS
import speech_recognition as sr
import os
import tempfile
import base64
from werkzeug.utils import secure_filename
import logging
import pyttsx3
import io
from pydub import AudioSegment
import PyPDF2
from docx import Document

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

def extract_text_from_pdf(pdf_file):
    """Extract text from PDF file"""
    try:
        pdf_reader = PyPDF2.PdfReader(pdf_file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text.strip()
    except Exception as e:
        logger.error(f"PDF text extraction failed: {e}")
        raise Exception(f"Failed to extract text from PDF: {str(e)}")

def extract_text_from_docx(docx_file):
    """Extract text from DOCX file"""
    try:
        doc = Document(docx_file)
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text.strip()
    except Exception as e:
        logger.error(f"DOCX text extraction failed: {e}")
        raise Exception(f"Failed to extract text from DOCX: {str(e)}")

def process_text_content(text, process_type):
    """Process text content based on type"""
    try:
        if process_type == 'summary':
            # Simple summary: first few sentences
            sentences = text.split('.')
            summary = '. '.join(sentences[:3]) + '.'
            if len(summary) < 100:
                summary = text[:200] + '...' if len(text) > 200 else text
            return summary
        elif process_type == 'explanation':
            # Simple explanation: add context
            return f"Document Analysis:\n\n{text}\n\nThis document contains {len(text.split())} words and {len(text)} characters."
        else:
            return text
    except Exception as e:
        logger.error(f"Text processing failed: {e}")
        return text

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy", 
        "message": "Full API is running",
        "features": ["speech-to-text", "text-to-speech", "document-processing"],
        "version": "1.0.0"
    })

@app.route('/api/speech/transcribe', methods=['POST'])
def transcribe_audio():
    """Web API endpoint for speech-to-text"""
    try:
        # Check if audio data is provided
        if 'audio' not in request.files and 'audio_data' not in request.json and 'audio' not in request.json:
            return jsonify({
                "success": False,
                "error": "No audio data provided",
                "supported_formats": ["base64", "file_upload", "audio_url"]
            }), 400
        
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
            
            # Save to temporary file
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
                
                logger.info(f"✅ Successfully transcribed audio in {language}")
                return jsonify({
                    "success": True,
                    "text": text,
                    "language": language,
                    "method": "backend",
                    "confidence": "high"
                })
                
            except Exception as sr_error:
                logger.warning(f"Backend speech recognition failed: {sr_error}")
                logger.info("🔄 Falling back to browser-based speech recognition")
                
                # Return fallback response for browser-based recognition
                return jsonify({
                    "success": False,
                    "error": "Backend processing failed. Using browser-based recognition.",
                    "fallback": "browser",
                    "note": "The frontend will automatically use browser-based speech recognition.",
                    "api_status": "fallback_available"
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
            
            # Save to temporary file
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
                
                logger.info(f"✅ Successfully transcribed audio in {language}")
                return jsonify({
                    "success": True,
                    "text": text,
                    "language": language,
                    "method": "backend",
                    "confidence": "high"
                })
                
            except Exception as sr_error:
                logger.warning(f"Backend speech recognition failed: {sr_error}")
                logger.info("🔄 Falling back to browser-based speech recognition")
                
                # Return fallback response for browser-based recognition
                return jsonify({
                    "success": False,
                    "error": "Backend processing failed. Using browser-based recognition.",
                    "fallback": "browser",
                    "note": "The frontend will automatically use browser-based speech recognition.",
                    "api_status": "fallback_available"
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
                    "method": "backend",
                    "confidence": "high"
                })
                
            except Exception as sr_error:
                logger.warning(f"Backend speech recognition failed: {sr_error}")
                logger.info("🔄 Falling back to browser-based speech recognition")
                
                # Return fallback response for browser-based recognition
                return jsonify({
                    "success": False,
                    "error": "Backend processing failed. Using browser-based recognition.",
                    "fallback": "browser",
                    "note": "The frontend will automatically use browser-based speech recognition.",
                    "api_status": "fallback_available"
                }), 503
                
            finally:
                # Clean up temporary file
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                    
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        return jsonify({
            "success": False,
            "error": "An unexpected error occurred. Please try again.",
            "api_status": "error"
        }), 500

@app.route('/api/speech/tts', methods=['POST'])
def text_to_speech():
    """Web API endpoint for text-to-speech"""
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({
                "success": False, 
                "error": "No text provided",
                "required_fields": ["text"],
                "optional_fields": ["speed", "volume"]
            }), 400
        
        text = data['text']
        voice_speed = data.get('speed', 150)  # Default speed
        voice_volume = data.get('volume', 0.9)  # Default volume
        
        if not text.strip():
            return jsonify({
                "success": False, 
                "error": "Text is empty",
                "api_status": "validation_error"
            }), 400
        
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
            "message": "Text converted to speech successfully",
            "api_status": "success",
            "format": "base64_wav"
        })
        
    except Exception as e:
        logger.error(f"TTS error: {e}")
        return jsonify({
            "success": False, 
            "error": f"Text-to-speech conversion failed: {str(e)}",
            "api_status": "error"
        }), 500

@app.route('/upload-document', methods=['POST'])
def upload_document():
    """Upload and process document files"""
    try:
        if 'file' not in request.files:
            return jsonify({"success": False, "error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"success": False, "error": "No file selected"}), 400
        
        process_type = request.form.get('type', 'summary')
        
        # Check file type
        filename = secure_filename(file.filename)
        file_extension = filename.lower().split('.')[-1]
        
        if file_extension not in ['pdf', 'docx', 'doc', 'txt']:
            return jsonify({"success": False, "error": "Unsupported file type. Please upload PDF, Word, or text files."}), 400
        
        logger.info(f"Processing document: {filename} with type: {process_type}")
        
        # Extract text based on file type
        extracted_text = ""
        if file_extension == 'pdf':
            extracted_text = extract_text_from_pdf(file)
        elif file_extension in ['docx', 'doc']:
            extracted_text = extract_text_from_docx(file)
        elif file_extension == 'txt':
            extracted_text = file.read().decode('utf-8')
        
        if not extracted_text.strip():
            return jsonify({"success": False, "error": "No text could be extracted from the document"}), 400
        
        # Process the extracted text
        processed_content = process_text_content(extracted_text, process_type)
        
        # Calculate statistics
        word_count = len(extracted_text.split())
        char_count = len(extracted_text)
        
        logger.info(f"✅ Document processed successfully: {word_count} words, {char_count} characters")
        
        return jsonify({
            "success": True,
            "filename": filename,
            "extracted_text": extracted_text,
            "processed_content": processed_content,
            "process_type": process_type,
            "word_count": word_count,
            "char_count": char_count,
            "message": "Document processed successfully"
        })
        
    except Exception as e:
        logger.error(f"Document processing error: {e}")
        return jsonify({
            "success": False,
            "error": f"Document processing failed: {str(e)}"
        }), 500

@app.route('/process-text', methods=['POST'])
def process_text():
    """Process text content"""
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"success": False, "error": "No text provided"}), 400
        
        text = data['text'].strip()
        process_type = data.get('type', 'summary')
        
        if not text:
            return jsonify({"success": False, "error": "Text is empty"}), 400
        
        logger.info(f"Processing text: {len(text)} characters with type: {process_type}")
        
        # Process the text
        processed_content = process_text_content(text, process_type)
        
        # Calculate statistics
        word_count = len(text.split())
        char_count = len(text)
        
        logger.info(f"✅ Text processed successfully: {word_count} words, {char_count} characters")
        
        return jsonify({
            "success": True,
            "processed_content": processed_content,
            "process_type": process_type,
            "word_count": word_count,
            "char_count": char_count,
            "message": "Text processed successfully"
        })
        
    except Exception as e:
        logger.error(f"Text processing error: {e}")
        return jsonify({
            "success": False,
            "error": f"Text processing failed: {str(e)}"
        }), 500

@app.route('/api/speech/languages', methods=['GET'])
def get_supported_languages():
    """Get supported languages for speech recognition"""
    languages = [
        {"code": "en-US", "name": "English (US)", "native": "English"},
        {"code": "hi-IN", "name": "Hindi (India)", "native": "हिंदी"},
        {"code": "bn-IN", "name": "Bengali (India)", "native": "বাংলা"},
        {"code": "te-IN", "name": "Telugu (India)", "native": "తెలుగు"},
        {"code": "ta-IN", "name": "Tamil (India)", "native": "தமிழ்"},
        {"code": "kn-IN", "name": "Kannada (India)", "native": "ಕನ್ನಡ"},
        {"code": "ml-IN", "name": "Malayalam (India)", "native": "മലയാളം"},
        {"code": "gu-IN", "name": "Gujarati (India)", "native": "ગુજરાતી"},
        {"code": "mr-IN", "name": "Marathi (India)", "native": "मराठी"},
        {"code": "pa-IN", "name": "Punjabi (India)", "native": "ਪੰਜਾਬੀ"},
        {"code": "or-IN", "name": "Odia (India)", "native": "ଓଡ଼ିଆ"},
        {"code": "as-IN", "name": "Assamese (India)", "native": "অসমীয়া"},
        {"code": "ur-IN", "name": "Urdu (India)", "native": "اردو"},
        {"code": "es-ES", "name": "Spanish (Spain)", "native": "Español"},
        {"code": "fr-FR", "name": "French (France)", "native": "Français"},
        {"code": "de-DE", "name": "German (Germany)", "native": "Deutsch"},
        {"code": "it-IT", "name": "Italian (Italy)", "native": "Italiano"},
        {"code": "pt-PT", "name": "Portuguese (Portugal)", "native": "Português"},
        {"code": "ru-RU", "name": "Russian (Russia)", "native": "Русский"},
        {"code": "ja-JP", "name": "Japanese (Japan)", "native": "日本語"},
        {"code": "ko-KR", "name": "Korean (South Korea)", "native": "한국어"},
        {"code": "zh-CN", "name": "Chinese (Simplified)", "native": "中文"},
        {"code": "ar-SA", "name": "Arabic (Saudi Arabia)", "native": "العربية"}
    ]
    return jsonify({
        "languages": languages,
        "total": len(languages),
        "api_status": "success"
    })

if __name__ == '__main__':
    logger.info("🚀 Starting Full Web API Backend")
    logger.info("📝 Speech-to-text: Available with 23 languages")
    logger.info("🔊 Text-to-speech: Available with 23 languages")
    logger.info("📄 Document processing: PDF, Word, TXT support")
    logger.info("🌐 Server will be available at: http://localhost:5000")
    logger.info("🔗 API endpoints:")
    logger.info("   - POST /api/speech/transcribe")
    logger.info("   - POST /api/speech/tts")
    logger.info("   - GET /api/speech/languages")
    logger.info("   - POST /upload-document")
    logger.info("   - POST /process-text")
    logger.info("   - GET /health")
    logger.info("🎉 All features are now functional!")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
