import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { gmailService } from '../services/gmailService';

interface Props {
  currentUser: User;
  onConnectionChange?: (connected: boolean) => void;
}

const GmailConnection: React.FC<Props> = ({ currentUser, onConnectionChange }) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Check if user has connected Gmail
  React.useEffect(() => {
    const checkConnection = () => {
      const hasGmail = gmailService.hasUserGmail(currentUser.uid);
      setIsConnected(hasGmail);
      onConnectionChange?.(hasGmail);
    };
    
    checkConnection();
  }, [currentUser.uid, onConnectionChange]);

  const handleConnectGmail = async () => {
    setIsConnecting(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('🔐 Starting Gmail connection process for user:', currentUser.uid);
      
      // For demo purposes, we'll simulate connecting Gmail
      // In a real implementation, this would open OAuth flow
      
      // Simulate OAuth consent screen
      const userEmail = currentUser.email;
      if (!userEmail) {
        throw new Error('User email not available');
      }

      // Simulate successful connection
      const mockCredentials = {
        clientId: process.env.REACT_APP_GMAIL_CLIENT_ID || 'demo-client-id',
        clientSecret: process.env.REACT_APP_GMAIL_CLIENT_SECRET || 'demo-client-secret',
        refreshToken: 'demo-refresh-token-' + Date.now(),
        senderEmail: userEmail
      };

      // Add user's Gmail credentials to the service
      gmailService.addUserCredentials(currentUser.uid, mockCredentials);
      
      setIsConnected(true);
      setSuccess(`✅ Gmail connected successfully! You can now send invitations from ${userEmail}`);
      onConnectionChange?.(true);
      
      console.log('✅ Gmail connection simulated successfully for:', userEmail);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect Gmail';
      setError(`❌ ${errorMessage}`);
      console.error('❌ Gmail connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectGmail = () => {
    // In a real implementation, this would remove stored credentials
    setIsConnected(false);
    setSuccess('✅ Gmail disconnected. Invitations will use the default system email.');
    onConnectionChange?.(false);
    
    // Clear any stored success/error messages
    setTimeout(() => {
      setSuccess(null);
      setError(null);
    }, 3000);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            📧 Gmail Connection
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Connect your Gmail to send team invitations from your own email address
          </p>
        </div>
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}></div>
      </div>

      <div className="space-y-4">
        {/* Connection Status */}
        <div className={`p-3 rounded-lg border ${
          isConnected 
            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800' 
            : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700'
        }`}>
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              isConnected ? 'bg-green-500' : 'bg-gray-400'
            }`}></div>
            <span className={`text-sm font-medium ${
              isConnected ? 'text-green-800 dark:text-green-200' : 'text-gray-600 dark:text-gray-400'
            }`}>
              {isConnected 
                ? `Connected to ${currentUser.email}` 
                : 'Not connected to Gmail'
              }
            </span>
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
            🎯 Benefits of connecting Gmail:
          </h4>
          <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1">
            <li>• Send invitations from your own email address</li>
            <li>• Recipients see real collaboration invitations</li>
            <li>• More professional team building experience</li>
            <li>• No shared email accounts</li>
          </ul>
        </div>

        {/* SendAs Setup Instructions */}
        {isConnected && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-2">
              ⚠️ Important: Gmail SendAs Setup Required
            </h4>
            <p className="text-xs text-yellow-700 dark:text-yellow-300 mb-2">
              To send emails from your own email address, you need to set up Gmail's "Send As" feature:
            </p>
            <details className="text-xs text-yellow-700 dark:text-yellow-300">
              <summary className="cursor-pointer font-medium">📋 Click to see setup steps</summary>
              <div className="mt-2 space-y-1">
                <p>1. Go to Gmail Settings → Accounts and Import</p>
                <p>2. Under "Send mail as" → "Add another email address"</p>
                <p>3. Enter your email: <strong>{currentUser.email}</strong></p>
                <p>4. Check "Treat as an alias" and verify</p>
                <p>5. After setup, invitations will come from your email!</p>
              </div>
            </details>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {!isConnected ? (
            <button
              onClick={handleConnectGmail}
              disabled={isConnecting}
              className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                isConnecting
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isConnecting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Connecting...
                </span>
              ) : (
                '🔐 Connect Gmail'
              )}
            </button>
          ) : (
            <button
              onClick={handleDisconnectGmail}
              className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
            >
              ❌ Disconnect Gmail
            </button>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
            <p className="text-sm text-green-700 dark:text-green-300">{success}</p>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          <p>💡 <strong>Note:</strong> This is a demo implementation. In production, users would go through Google OAuth flow.</p>
          <p>📧 Invitations will be sent from your connected Gmail account.</p>
        </div>
      </div>
    </div>
  );
};

export default GmailConnection;
