import React, { useState, useEffect } from 'react';

interface MicrophonePermissionProps {
  onPermissionGranted: () => void;
  onPermissionDenied: () => void;
}

const MicrophonePermission: React.FC<MicrophonePermissionProps> = ({
  onPermissionGranted,
  onPermissionDenied
}) => {
  const [permissionState, setPermissionState] = useState<'checking' | 'denied' | 'granted' | 'error'>('checking');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    checkMicrophonePermission();
  }, []);

  const checkMicrophonePermission = async () => {
    try {
      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setPermissionState('error');
        setErrorMessage('Your browser does not support microphone access. Please use a modern browser like Chrome, Firefox, or Edge.');
        return;
      }

      // Try to get microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      // Permission granted
      setPermissionState('granted');
      
      // Stop the stream immediately (we just needed to check permission)
      stream.getTracks().forEach(track => track.stop());
      
      onPermissionGranted();

    } catch (error: any) {
      console.error('Microphone permission error:', error);
      
      if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
        setPermissionState('denied');
        setErrorMessage('Microphone access was denied. Please allow microphone access and try again.');
      } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
        setPermissionState('error');
        setErrorMessage('No microphone found. Please connect a microphone and try again.');
      } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
        setPermissionState('error');
        setErrorMessage('Microphone is being used by another application. Please close other apps and try again.');
      } else {
        setPermissionState('error');
        setErrorMessage(`Microphone error: ${error.message || 'Unknown error'}`);
      }
      
      onPermissionDenied();
    }
  };

  const requestPermissionAgain = () => {
    setPermissionState('checking');
    checkMicrophonePermission();
  };

  if (permissionState === 'checking') {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Checking Microphone Access</h3>
        <p className="text-gray-600">Please allow microphone access when prompted...</p>
      </div>
    );
  }

  if (permissionState === 'granted') {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-green-800">Microphone Ready!</h3>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      </div>
      
      <h3 className="text-lg font-medium text-red-800 mb-4">Microphone Access Issue</h3>
      <p className="text-gray-700 mb-6 max-w-md mx-auto leading-relaxed">{errorMessage}</p>
      
      {permissionState === 'denied' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 max-w-md mx-auto">
          <h4 className="font-medium text-blue-800 mb-2">🔧 How to Fix:</h4>
          <ol className="text-sm text-blue-700 text-left space-y-1">
            <li>1. Click the 🔒 or 🛡️ icon in your browser's address bar</li>
            <li>2. Select "Allow" for microphone access</li>
            <li>3. Refresh the page and try again</li>
          </ol>
        </div>
      )}
      
      <div className="space-y-3">
        <button
          onClick={requestPermissionAgain}
          className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          🎤 Try Again
        </button>
        
        <div className="text-sm text-gray-500">
          <p>Supported browsers: Chrome, Firefox, Safari, Edge</p>
        </div>
      </div>
    </div>
  );
};

export default MicrophonePermission;

