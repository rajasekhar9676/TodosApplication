import React, { useState, useRef } from 'react';
import TextToSpeech from './TextToSpeech';

interface ProcessedDocument {
  filename: string;
  extractedText: string;
  processedContent: string;
  processType: string;
  wordCount: number;
  charCount: number;
}

const DocumentProcessor: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processType, setProcessType] = useState<'summary' | 'explanation'>('summary');
  const [userText, setUserText] = useState('');
  const [processedDoc, setProcessedDoc] = useState<ProcessedDocument | null>(null);
  const [showTTS, setShowTTS] = useState(false);
  const [ttsText, setTtsText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Backend URL - Automatically detects environment
  const BACKEND_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '';

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Check file type
    const allowedTypes = ['.pdf', '.docx', '.doc', '.txt'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      alert('Please upload a PDF, Word document, or text file.');
      return;
    }

    try {
      setIsUploading(true);
      console.log('📁 Uploading document...');

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', processType);

      const response = await fetch(`${BACKEND_URL}/upload-document`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Document upload failed');
      }

      const data = await response.json();

      if (data.success) {
        console.log('✅ Document processed successfully');
        setProcessedDoc({
          filename: data.filename,
          extractedText: data.extracted_text,
          processedContent: data.processed_content,
          processType: data.process_type,
          wordCount: data.word_count,
          charCount: data.char_count,
        });
      } else {
        throw new Error(data.error || 'Document processing failed');
      }

    } catch (error) {
      console.error('❌ Upload Error:', error);
      alert(`Document upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleTextProcessing = async () => {
    if (!userText.trim()) {
      alert('Please enter some text to process.');
      return;
    }

    try {
      setIsProcessing(true);
      console.log('📝 Processing text...');

      const response = await fetch(`${BACKEND_URL}/process-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: userText.trim(),
          type: processType,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Text processing failed');
      }

      const data = await response.json();

      if (data.success) {
        console.log('✅ Text processed successfully');
        setProcessedDoc({
          filename: 'User Input',
          extractedText: data.original_text,
          processedContent: data.processed_content,
          processType: data.process_type,
          wordCount: data.word_count,
          charCount: data.char_count,
        });
      } else {
        throw new Error(data.error || 'Text processing failed');
      }

    } catch (error) {
      console.error('❌ Processing Error:', error);
      alert(`Text processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePlayText = (text: string) => {
    setTtsText(text);
    setShowTTS(true);
  };

  const clearResults = () => {
    setProcessedDoc(null);
    setUserText('');
  };

  return (
    <>
      {/* Floating Document Button */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-36 right-6 w-14 h-14 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-40"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-green-600 to-teal-600 text-white p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">📄 Document Processor</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Processing Type:</label>
                <select
                  value={processType}
                  onChange={(e) => setProcessType(e.target.value as 'summary' | 'explanation')}
                  className="bg-white text-gray-800 px-3 py-2 rounded-lg border-0 focus:ring-2 focus:ring-white"
                  disabled={isUploading || isProcessing}
                >
                  <option value="summary">📋 Generate Summary</option>
                  <option value="explanation">💡 Explain Content</option>
                </select>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Document Upload Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">📁 Upload Document</h3>
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-green-500 transition-colors">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".pdf,.docx,.doc,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                      disabled={isUploading}
                    />
                    
                    <div className="space-y-2">
                      <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div className="text-sm text-gray-600">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="font-medium text-green-600 hover:text-green-500"
                          disabled={isUploading}
                        >
                          {isUploading ? 'Uploading...' : 'Upload a file'}
                        </button>
                        <span> or drag and drop</span>
                      </div>
                      <p className="text-xs text-gray-500">PDF, Word, or Text files</p>
                    </div>
                  </div>
                </div>

                {/* Text Input Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800">✍️ Enter Text</h3>
                  
                  <textarea
                    value={userText}
                    onChange={(e) => setUserText(e.target.value)}
                    placeholder="Enter or paste your text here..."
                    className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none"
                    disabled={isProcessing}
                  />
                  
                  <div className="text-sm text-gray-500">
                    Words: {userText.trim().split(/\s+/).filter(word => word.length > 0).length} | Characters: {userText.length}
                  </div>
                  
                  <button
                    onClick={handleTextProcessing}
                    disabled={!userText.trim() || isProcessing}
                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? (
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing...
                      </div>
                    ) : (
                      `${processType === 'summary' ? '📋 Generate Summary' : '💡 Explain Text'}`
                    )}
                  </button>
                </div>
              </div>

              {/* Results Section */}
              {processedDoc && (
                <div className="mt-8 border-t pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800">📊 Results</h3>
                    <button
                      onClick={clearResults}
                      className="text-red-600 hover:text-red-700 text-sm"
                    >
                      Clear Results
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Original Content */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-700">📄 Original Content</h4>
                        <button
                          onClick={() => handlePlayText(processedDoc.extractedText)}
                          className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                        >
                          🔊 Play
                        </button>
                      </div>
                      <div className="text-sm text-gray-500 mb-2">
                        Source: {processedDoc.filename} | {processedDoc.wordCount} words
                      </div>
                      <div className="text-sm text-gray-800 max-h-32 overflow-y-auto">
                        {processedDoc.extractedText}
                      </div>
                    </div>

                    {/* Processed Content */}
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-700">
                          {processedDoc.processType === 'summary' ? '📋 Summary' : '💡 Explanation'}
                        </h4>
                        <button
                          onClick={() => handlePlayText(processedDoc.processedContent)}
                          className="text-blue-600 hover:text-blue-700 text-sm flex items-center"
                        >
                          🔊 Play
                        </button>
                      </div>
                      <div className="text-sm text-gray-800 max-h-32 overflow-y-auto whitespace-pre-line">
                        {processedDoc.processedContent}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Text-to-Speech Modal */}
      {showTTS && (
        <TextToSpeech
          text={ttsText}
          onClose={() => setShowTTS(false)}
        />
      )}
    </>
  );
};

export default DocumentProcessor;

