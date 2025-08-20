from flask import Flask, request, jsonify
from flask_cors import CORS
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy", 
        "message": "Simple API is running",
        "features": ["health-check", "document-processing"],
        "version": "1.0.0"
    })

@app.route('/upload-document', methods=['POST'])
def upload_document():
    """Simple document processing endpoint"""
    try:
        if 'file' not in request.files:
            return jsonify({"success": False, "error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"success": False, "error": "No file selected"}), 400
        
        filename = file.filename
        file_extension = filename.lower().split('.')[-1]
        
        if file_extension not in ['pdf', 'docx', 'doc', 'txt']:
            return jsonify({"success": False, "error": "Unsupported file type. Please upload PDF, Word, or text files."}), 400
        
        logger.info(f"Processing document: {filename}")
        
        # For now, just return success message
        # We'll add text extraction later once basic backend is working
        
        return jsonify({
            "success": True,
            "filename": filename,
            "message": "Document received successfully",
            "file_type": file_extension,
            "note": "Text extraction will be added once backend is stable"
        })
        
    except Exception as e:
        logger.error(f"Document processing error: {e}")
        return jsonify({
            "success": False,
            "error": f"Document processing failed: {str(e)}"
        }), 500

@app.route('/process-text', methods=['POST'])
def process_text():
    """Simple text processing endpoint"""
    try:
        data = request.get_json()
        if not data or 'text' not in data:
            return jsonify({"success": False, "error": "No text provided"}), 400
        
        text = data['text'].strip()
        if not text:
            return jsonify({"success": False, "error": "Text is empty"}), 400
        
        logger.info(f"Processing text: {len(text)} characters")
        
        # Simple text analysis
        word_count = len(text.split())
        char_count = len(text)
        
        return jsonify({
            "success": True,
            "processed_content": f"Text processed: {word_count} words, {char_count} characters",
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

if __name__ == '__main__':
    logger.info("🚀 Starting Simple Flask Backend")
    logger.info("🌐 Server will be available at: http://localhost:5000")
    logger.info("🔗 API endpoints:")
    logger.info("   - GET /health")
    logger.info("   - POST /upload-document")
    logger.info("   - POST /process-text")
    logger.info("🎉 Starting server...")
    
    app.run(debug=False, host='127.0.0.1', port=5000)
