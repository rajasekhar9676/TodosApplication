import React, { useState, useRef } from 'react';

interface TextToSpeechProps {
  text?: string;
  onClose?: () => void;
}

const TextToSpeech: React.FC<TextToSpeechProps> = ({ text: initialText = '', onClose }) => {
  const [text, setText] = useState(initialText);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [speed, setSpeed] = useState(150);
  const [volume, setVolume] = useState(0.9);
  const [showModal, setShowModal] = useState(onClose ? true : false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Backend URL - Automatically detects environment
  const BACKEND_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '';

  const handleTextToSpeech = async () => {
    if (!text.trim()) {
      alert('Please enter some text to convert to speech.');
      return;
    }

    try {
      setIsLoading(true);
      console.log('🔊 Converting text to speech...');

      const response = await fetch(`${BACKEND_URL}/api/speech/tts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text.trim(),
          speed: speed,
          volume: volume
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Text-to-speech conversion failed');
      }

      const data = await response.json();
      
      if (data.success && data.audio_data) {
        console.log('✅ TTS conversion successful');
        
        // Convert base64 to audio and play
        const audioBlob = new Blob([
          Uint8Array.from(atob(data.audio_data), c => c.charCodeAt(0))
        ], { type: 'audio/wav' });
        
        const audioUrl = URL.createObjectURL(audioBlob);
        
        if (audioRef.current) {
          audioRef.current.pause();
        }
        
        audioRef.current = new Audio(audioUrl);
        audioRef.current.onplay = () => setIsPlaying(true);
        audioRef.current.onpause = () => setIsPlaying(false);
        audioRef.current.onended = () => {
          setIsPlaying(false);
          URL.revokeObjectURL(audioUrl);
        };
        
        await audioRef.current.play();
        
      } else {
        throw new Error(data.error || 'Unexpected response format');
      }
      
    } catch (error) {
      console.error('❌ TTS Error:', error);
      alert(`Text-to-speech failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsPlaying(false);
    }
  };

  const renderContent = () => (
    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">🔊 Text to Speech</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Text Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Text to Convert:
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Enter text here to convert to speech..."
            className="w-full h-32 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            disabled={isLoading || isPlaying}
          />
          <div className="text-sm text-gray-500 mt-1">
            Characters: {text.length} | Words: {text.trim().split(/\s+/).filter(word => word.length > 0).length}
          </div>
        </div>

        {/* Voice Settings */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Speech Speed: {speed} WPM
            </label>
            <input
              type="range"
              min="50"
              max="300"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              disabled={isLoading || isPlaying}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Slow</span>
              <span>Fast</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Volume: {Math.round(volume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              disabled={isLoading || isPlaying}
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Quiet</span>
              <span>Loud</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex space-x-3">
          <button
            onClick={handleTextToSpeech}
            disabled={!text.trim() || isLoading || isPlaying}
            className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-4 rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Converting...
              </div>
            ) : isPlaying ? (
              '🔊 Playing...'
            ) : (
              '🎤 Convert to Speech'
            )}
          </button>

          {isPlaying && (
            <button
              onClick={stopAudio}
              className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              ⏹️ Stop
            </button>
          )}

          {!onClose && (
            <button
              onClick={() => setShowModal(false)}
              className="px-6 py-3 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (onClose) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        {renderContent()}
      </div>
    );
  }

  return (
    <>
      {/* Floating TTS Button */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-20 right-6 w-14 h-14 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center z-40"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M9 12H3m6 0V9m0 3v3" />
        </svg>
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          {renderContent()}
        </div>
      )}
    </>
  );
};

export default TextToSpeech;

