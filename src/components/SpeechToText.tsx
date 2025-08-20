import React, { useState, useRef, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config';
import { useAuth } from '../context/AuthContext';
import MicrophonePermission from './MicrophonePermission';

interface VoiceNote {
  id: string;
  text: string;
  language: string;
  createdAt: any;
  userId: string;
}

interface SpeechToTextProps {
  onClose?: () => void;
}

const SpeechToText: React.FC<SpeechToTextProps> = ({ onClose }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showModal, setShowModal] = useState(onClose ? true : false); // Auto-show if used as modal
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [microphoneReady, setMicrophoneReady] = useState(false);
  const [showPermissionCheck, setShowPermissionCheck] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { user } = useAuth();

  // Backend URL - Imported from config
  const BACKEND_URL = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '';

  // Load available languages from backend
  useEffect(() => {
    const loadLanguages = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/languages`);
        if (response.ok) {
          const data = await response.json();
          setAvailableLanguages(data.languages);
          console.log(`✅ Loaded ${data.total_languages} languages including ${data.south_indian_languages} South Indian languages`);
        }
      } catch (error) {
        console.warn('Failed to load languages from backend, using defaults:', error);
      }
    };
    
    loadLanguages();
  }, [BACKEND_URL]);

  const [availableLanguages, setAvailableLanguages] = useState([
    // Default languages while loading from backend
    { code: 'en-US', name: 'English (US)', category: 'English' },
    { code: 'hi-IN', name: 'हिन्दी (Hindi)', category: 'North Indian' },
    { code: 'te-IN', name: 'తెలుగు (Telugu)', category: 'South Indian' },
    { code: 'ta-IN', name: 'தமிழ் (Tamil)', category: 'South Indian' },
    { code: 'kn-IN', name: 'ಕನ್ನಡ (Kannada)', category: 'South Indian' },
    { code: 'ml-IN', name: 'മലയാളം (Malayalam)', category: 'South Indian' },
    { code: 'tcy-IN', name: 'ತುಳು (Tulu)', category: 'South Indian' },
  ]);

  const handleMicrophonePermission = () => {
    setMicrophoneReady(true);
    setShowPermissionCheck(false);
    setPermissionChecked(true);
  };

  const handleMicrophoneError = () => {
    setMicrophoneReady(false);
    setShowPermissionCheck(false);
    setPermissionChecked(true);
  };

  // Check microphone permission when modal opens
  useEffect(() => {
    if (showModal && !permissionChecked) {
      checkMicrophonePermissionOnLoad();
    }
  }, [showModal, permissionChecked]);

  const checkMicrophonePermissionOnLoad = async () => {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setMicrophoneReady(false);
        setPermissionChecked(true);
        return;
      }

      // Try to get microphone permission silently
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      // Permission granted
      setMicrophoneReady(true);
      setPermissionChecked(true);
      
      // Stop the stream immediately (we just needed to check permission)
      stream.getTracks().forEach(track => track.stop());

    } catch (error: any) {
      console.log('Microphone permission not granted, will request on recording:', error.name);
      setMicrophoneReady(false);
      setPermissionChecked(true);
    }
  };

  const startRecording = async () => {
    try {
      console.log('🎤 Starting recording process...');
      
      // Enhanced audio constraints for better quality
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 48000,  // Higher sample rate for better quality
          channelCount: 1,    // Mono
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      
      console.log('✅ Microphone access granted');
      
      // Update permission state if this is the first successful access
      if (!microphoneReady) {
        setMicrophoneReady(true);
        setPermissionChecked(true);
      }
      
      // Try multiple MIME types for better compatibility
      let mimeType = 'audio/webm;codecs=opus';
      const supportedTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4',
        'audio/wav'
      ];
      
      for (const type of supportedTypes) {
        if (MediaRecorder.isTypeSupported(type)) {
          mimeType = type;
          console.log(`📼 Using MIME type: ${mimeType}`);
          break;
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: mimeType,
        audioBitsPerSecond: 128000  // Good quality for speech
      });
      
      mediaRecorderRef.current = mediaRecorder;
      const chunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
          console.log(`📊 Audio chunk: ${event.data.size} bytes`);
        }
      };

      mediaRecorder.onstop = () => {
        console.log(`🎵 Recording stopped. Total chunks: ${chunks.length}`);
        const blob = new Blob(chunks, { type: mimeType });
        console.log(`📁 Audio blob size: ${blob.size} bytes`);
        
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
        console.log('🛑 Audio tracks stopped');
        
        // Auto-transcribe if we have audio data
        if (blob.size > 0) {
          transcribeWithPythonBackend(blob);
        } else {
          console.error('❌ Empty audio blob');
          alert('Recording failed: No audio data captured. Please try again.');
        }
      };

      mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        alert('Recording error occurred. Please try again.');
      };

      // Start recording with data collection every second
      mediaRecorder.start(1000);
      console.log('▶️ MediaRecorder started');
      
      setIsRecording(true);
      setShowModal(true);
      setTranscript('');
      setRecordingTime(0);
      
      // Start recording timer
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error accessing microphone:', error);
      setIsRecording(false);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          // Show permission request dialog instead of alert
          setShowPermissionCheck(true);
          setMicrophoneReady(false);
          setPermissionChecked(true);
          return;
        }
      }
      
      let errorMessage = 'Error accessing microphone. ';
      if (error instanceof Error) {
        if (error.name === 'NotFoundError') {
          errorMessage += 'No microphone found. Please connect a microphone and try again.';
        } else {
          errorMessage += `${error.message}`;
        }
      }
      alert(errorMessage);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      // Stop recording timer
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const transcribeWithBrowserRecognition = async (audioBlob: Blob): Promise<string | null> => {
    return new Promise((resolve, reject) => {
      try {
        // Check if browser supports speech recognition
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
          reject(new Error('Browser speech recognition not supported'));
          return;
        }

        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
        const recognition = new SpeechRecognition();

        // Configure recognition settings
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = selectedLanguage;

        // Convert audio blob to audio element for recognition
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        recognition.onstart = () => {
          console.log('🎤 Browser speech recognition started');
          setIsProcessing(true);
        };

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          console.log('✅ Browser recognition result:', transcript);
          setTranscript(transcript);
          resolve(transcript);
        };

        recognition.onerror = (event: any) => {
          console.error('❌ Browser recognition error:', event.error);
          reject(new Error(`Browser recognition failed: ${event.error}`));
        };

        recognition.onend = () => {
          console.log('🔚 Browser recognition ended');
          setIsProcessing(false);
          URL.revokeObjectURL(audioUrl);
        };

        // Start recognition
        recognition.start();
        
        // Play audio to trigger recognition
        audio.play().catch((error) => {
          console.warn('⚠️ Audio play failed, trying recognition without audio:', error);
        });

      } catch (error) {
        console.error('❌ Browser recognition setup error:', error);
        reject(error);
      }
    });
  };

  const transcribeWithPythonBackend = async (audioBlob: Blob, retryCount = 0): Promise<string | null> => {
    const maxRetries = 3;
    
    try {
      setIsProcessing(true);
      console.log(`🔄 Transcription attempt ${retryCount + 1}/${maxRetries + 1}`);
      console.log(`📂 Audio blob: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
      
      // Convert audio to base64
      const arrayBuffer = await audioBlob.arrayBuffer();
      const base64Audio = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      console.log(`📦 Base64 audio: ${base64Audio.length} characters`);

      const requestData = {
        audio: base64Audio,
        language: selectedLanguage
      };

      console.log(`🌐 Sending request to ${BACKEND_URL}/api/speech/transcribe`);
      const response = await fetch(`${BACKEND_URL}/api/speech/transcribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log(`📡 Response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: `HTTP ${response.status}: ${errorText}` };
        }
        
        // Check if this is a fallback response (503 status)
        if (response.status === 503 && errorData.fallback === 'browser') {
          console.log('🔄 Backend failed, switching to browser-based recognition...');
          return await transcribeWithBrowserRecognition(audioBlob);
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('📋 Response data:', data);
      
      if (data.success && data.text && data.text.trim()) {
        console.log('✅ Transcription successful:', data.text);
        setTranscript(data.text);
        return data.text;
      } else {
        throw new Error(data.error || 'Transcription returned empty result');
      }
    } catch (error) {
      console.error(`❌ Transcription error (attempt ${retryCount + 1}):`, error);
      
      // Auto-retry for certain errors
      if (retryCount < maxRetries) {
        const retryableErrors = [
          'Could not understand the audio',
          'service error',
          'network',
          'timeout'
        ];
        
        const errorMessage = error instanceof Error ? error.message.toLowerCase() : '';
        const shouldRetry = retryableErrors.some(retryError => errorMessage.includes(retryError));
        
        if (shouldRetry) {
          console.log(`🔄 Auto-retrying in 2 seconds... (${retryCount + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          return transcribeWithPythonBackend(audioBlob, retryCount + 1);
        }
      }
      
      // Final error handling
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Final transcription error:', errorMessage);
      
      // Try browser-based recognition as final fallback
      if (audioBlob && audioBlob.size > 0) {
        console.log('🔄 Trying browser-based recognition as final fallback...');
        try {
          const browserResult = await transcribeWithBrowserRecognition(audioBlob);
          if (browserResult) {
            return browserResult;
          }
        } catch (browserError) {
          console.error('❌ Browser recognition also failed:', browserError);
        }
      }
      
      // Show user-friendly error with retry option
      const shouldShowRetryButton = audioBlob && audioBlob.size > 0;
      if (shouldShowRetryButton) {
        setTranscript(`⚠️ Transcription failed: ${errorMessage}. Try speaking again or check microphone.`);
      } else {
        alert(`Error: ${errorMessage}. Please check that the microphone is working and try again.`);
      }
      
      return null;
    } finally {
      setIsProcessing(false);
    }
  };

  const saveVoiceNote = async (text: string) => {
    if (!user || !text.trim()) return;

    try {
      setIsProcessing(true);
      
      const voiceNote: Omit<VoiceNote, 'id'> = {
        text: text.trim(),
        language: selectedLanguage,
        createdAt: serverTimestamp(),
        userId: user.uid,
      };

      await addDoc(collection(db, 'voiceNotes'), voiceNote);
      setTranscript('');
      setAudioBlob(null);
      if (onClose) {
        onClose();
      } else {
        setShowModal(false);
      }
      setRecordingTime(0);
      
      // Show success message
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast('Voice note saved successfully!', 'success');
      } else {
        alert('Voice note saved successfully!');
      }
    } catch (error) {
      console.error('Error saving voice note:', error);
      alert('Error saving voice note. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (audioBlob && !transcript) {
      const text = await transcribeWithPythonBackend(audioBlob);
      if (text) {
        await saveVoiceNote(text);
      }
    } else if (transcript) {
      await saveVoiceNote(transcript);
    }
  };

  const handleRetry = async () => {
    if (audioBlob) {
      const text = await transcribeWithPythonBackend(audioBlob);
      if (text) {
        setTranscript(text);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  // If onClose is provided, render only the modal (used from VoiceRecordings page)
  if (onClose) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">🎤 Voice to Text</h2>
              <button
                onClick={() => onClose()}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            {/* Enhanced Language selector with categories */}
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">🌐 Select Language:</label>
              <select
                value={selectedLanguage}
                onChange={(e) => setSelectedLanguage(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-white bg-opacity-20 text-white border border-white border-opacity-30 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                disabled={isRecording}
              >
                {/* Group languages by category */}
                {['English', 'South Indian', 'North Indian', 'East Indian', 'West Indian', 'International'].map(category => {
                  const categoryLangs = availableLanguages.filter(lang => lang.category === category);
                  if (categoryLangs.length === 0) return null;
                  
                  return (
                    <optgroup key={category} label={`${category} Languages`} className="text-gray-800">
                      {categoryLangs.map((lang) => (
                        <option key={lang.code} value={lang.code} className="text-gray-800">
                          {lang.name}
                          {lang.code === 'tcy-IN' ? ' 🧪' : ''}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
              
              {selectedLanguage === 'tcy-IN' && (
                <div className="mt-2 p-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm">
                  🧪 Tulu support is experimental and uses Kannada as base recognition with post-processing
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Microphone Permission Check */}
            {showPermissionCheck && (
              <MicrophonePermission
                onPermissionGranted={handleMicrophonePermission}
                onPermissionDenied={handleMicrophoneError}
              />
            )}
            
            {/* Recording status */}
            {!showPermissionCheck && (
              <div className="text-center mb-6">
              {isRecording ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-lg font-medium text-gray-700">
                    Recording... {formatTime(recordingTime)}
                  </span>
                  <button
                    onClick={stopRecording}
                    className="ml-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                  >
                    Stop Recording
                  </button>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <button
                    onClick={startRecording}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    🎙️ Start Recording
                  </button>
                  <div className="text-sm text-gray-600">
                    💡 Tip: If backend fails, try browser recognition
                  </div>
                </div>
              )}
            </div>
            )}

            {/* Processing status */}
            {isProcessing && !showPermissionCheck && (
              <div className="text-center mb-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                <p className="text-gray-600">Processing your speech...</p>
              </div>
            )}

            {/* Transcript */}
            {transcript && !showPermissionCheck && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-2">Transcript:</h3>
                <div className="bg-gray-50 rounded-lg p-4 min-h-[100px]">
                  {transcript.startsWith('⚠️') ? (
                    <div className="text-center">
                      <p className="text-red-600 mb-4">{transcript}</p>
                      {audioBlob && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => transcribeWithPythonBackend(audioBlob)}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            disabled={isProcessing}
                          >
                            {isProcessing ? '🔄 Retrying...' : '🔄 Retry Backend'}
                          </button>
                          <button
                            onClick={() => transcribeWithBrowserRecognition(audioBlob)}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            disabled={isProcessing}
                          >
                            🌐 Use Browser Recognition
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-800 leading-relaxed">{transcript}</p>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            {!showPermissionCheck && (
              <div className="flex space-x-3">
                {transcript && (
                  <button
                    onClick={() => saveVoiceNote(transcript)}
                    className="flex-1 bg-gradient-to-r from-green-600 to-green-700 text-white py-3 px-4 rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200"
                  >
                    💾 Save Voice Note
                  </button>
                )}
                
                <button
                  onClick={() => onClose()}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Floating microphone button */}
      <button
        onClick={() => setShowModal(true)}
        className="fixed bottom-6 right-6 w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 z-50 flex items-center justify-center group"
        title="Start voice recording"
      >
        <svg
          className={`w-8 h-8 transition-all duration-300 ${isRecording ? 'animate-pulse' : ''}`}
          fill="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
          <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
        </svg>
        {isRecording && (
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75"></div>
        )}
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Voice to Text</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Enhanced Language selector with categories */}
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">🌐 Select Language:</label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-white bg-opacity-20 text-white border border-white border-opacity-30 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50"
                  disabled={isRecording}
                >
                  {/* Group languages by category */}
                  {['English', 'South Indian', 'North Indian', 'East Indian', 'West Indian', 'International'].map(category => {
                    const categoryLangs = availableLanguages.filter(lang => lang.category === category);
                    if (categoryLangs.length === 0) return null;
                    
                    return (
                      <optgroup key={category} label={`${category} Languages`} className="text-gray-800">
                        {categoryLangs.map((lang) => (
                          <option key={lang.code} value={lang.code} className="text-gray-800">
                            {lang.name}
                            {lang.code === 'tcy-IN' ? ' 🧪' : ''}
                          </option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
                
                {selectedLanguage === 'tcy-IN' && (
                  <div className="mt-2 p-2 bg-yellow-100 text-yellow-800 rounded-lg text-sm">
                    🧪 Tulu support is experimental and uses Kannada as base recognition with post-processing
                  </div>
                )}
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Recording status */}
              <div className="text-center mb-6">
                {isRecording ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                    <span className="text-lg font-medium text-gray-700">
                      Recording... {formatTime(recordingTime)}
                    </span>
                    <button
                      onClick={stopRecording}
                      className="ml-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      Stop Recording
                    </button>
                  </div>
                ) : (
                  <div className="text-center">
                    <button
                      onClick={startRecording}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Start Recording
                    </button>
                  </div>
                )}
              </div>

              {/* Transcript */}
              {transcript && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transcribed Text:
                  </label>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 min-h-[120px] max-h-[300px] overflow-y-auto">
                    <p className="text-gray-800 whitespace-pre-wrap">{transcript}</p>
                  </div>
                </div>
              )}

              {/* Processing indicator */}
              {isProcessing && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <span className="text-gray-600">Processing audio with Python backend...</span>
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex space-x-3">
                {audioBlob && !transcript && !isProcessing && (
                  <button
                    onClick={handleRetry}
                    className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                  >
                    Transcribe Audio
                  </button>
                )}
                
                {transcript && (
                  <button
                    onClick={handleSave}
                    disabled={isProcessing}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    Save Voice Note
                  </button>
                )}
                
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SpeechToText; 