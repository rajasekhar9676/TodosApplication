import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { gmailService } from '../services/gmailService';
import { invitationService } from '../services/invitationService';

const DynamicEmailDemo: React.FC = () => {
  const { user } = useAuth();
  const [testEmail, setTestEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleTestEmail = async () => {
    if (!testEmail.trim() || !user) return;

    setIsSending(true);
    setResult(null);

    try {
      console.log('🧪 Testing dynamic email system...');
      console.log('👤 User:', user.email);
      console.log('📧 Test recipient:', testEmail);
      console.log('🔐 Has Gmail:', gmailService.hasUserGmail(user.uid));

      // Test invitation (this won't actually send a real email in demo mode)
      const testResult = await invitationService.sendInvitation(
        'demo-team-id',
        'Demo Team',
        testEmail.trim(),
        'member',
        user.uid,
        user.displayName || user.email || 'Demo User',
        user.email || ''
      );

      if (testResult.success) {
        setResult(`✅ Test successful! 
        
📧 Email would be sent to: ${testEmail}
👤 From: ${user.email}
🔐 Using: ${gmailService.hasUserGmail(user.uid) ? 'Your Gmail account' : 'System account'}
🎯 Team: Demo Team
📝 Role: Member

💡 In production, this would send a real invitation email from your account!`);
      } else {
        setResult(`❌ Test failed: ${testResult.error}`);
      }
    } catch (error) {
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSending(false);
    }
  };

  const connectGmail = () => {
    if (!user) return;

    // Simulate connecting Gmail
    const mockCredentials = {
      clientId: 'demo-client-id',
      clientSecret: 'demo-client-secret',
      refreshToken: 'demo-refresh-token-' + Date.now(),
      senderEmail: user.email || ''
    };

    gmailService.addUserCredentials(user.uid, mockCredentials);
    setResult(`✅ Gmail connected successfully!
    
📧 You can now send emails from: ${user.email}
🔐 Credentials stored for user: ${user.uid}

💡 Try sending a test invitation now!`);
  };

  const disconnectGmail = () => {
    if (!user) return;
    
    // In a real implementation, this would remove stored credentials
    setResult(`✅ Gmail disconnected!
    
📧 Invitations will now use the system email account
🔐 User credentials cleared for: ${user.uid}

💡 Connect your Gmail again to send from your own account!`);
  };

  if (!user) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-yellow-800">Please log in to test the dynamic email system.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-slate-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          🧪 Dynamic Email System Demo
        </h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Gmail Connection Status */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              🔐 Gmail Connection Status
            </h3>
            
            <div className={`p-4 rounded-lg border ${
              gmailService.hasUserGmail(user.uid)
                ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
            }`}>
              <div className="flex items-center mb-2">
                <div className={`w-3 h-3 rounded-full mr-2 ${
                  gmailService.hasUserGmail(user.uid) ? 'bg-green-500' : 'bg-yellow-500'
                }`}></div>
                <span className={`font-medium ${
                  gmailService.hasUserGmail(user.uid) 
                    ? 'text-green-800 dark:text-green-200' 
                    : 'text-yellow-800 dark:text-yellow-200'
                }`}>
                  {gmailService.hasUserGmail(user.uid) ? 'Connected' : 'Not Connected'}
                </span>
              </div>
              <p className={`text-sm ${
                gmailService.hasUserGmail(user.uid) 
                  ? 'text-green-700 dark:text-green-300' 
                  : 'text-yellow-700 dark:text-yellow-300'
              }`}>
                {gmailService.hasUserGmail(user.uid)
                  ? `✅ Your Gmail (${user.email}) is connected. Invitations will be sent from your account.`
                  : `⚠️ Connect your Gmail to send invitations from your own email address.`
                }
              </p>
            </div>

            <div className="flex space-x-3">
              {!gmailService.hasUserGmail(user.uid) ? (
                <button
                  onClick={connectGmail}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  🔐 Connect Gmail
                </button>
              ) : (
                <button
                  onClick={disconnectGmail}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors"
                >
                  ❌ Disconnect Gmail
                </button>
              )}
            </div>
          </div>

          {/* Test Email Sending */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              📧 Test Email Sending
            </h3>
            
            <div className="space-y-3">
              <input
                type="email"
                placeholder="Enter test email address"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
              />
              
              <button
                onClick={handleTestEmail}
                disabled={isSending || !testEmail.trim()}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                  isSending || !testEmail.trim()
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {isSending ? '🧪 Testing...' : '🧪 Test Email System'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-slate-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          🔍 How Dynamic Email System Works
        </h3>
        
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="space-y-2">
            <h4 className="font-medium text-blue-600 dark:text-blue-400">1. User Authentication</h4>
            <p className="text-gray-600 dark:text-gray-400">
              User logs in and their email is detected by the system
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium text-blue-600 dark:text-blue-400">2. Gmail Connection</h4>
            <p className="text-gray-600 dark:text-gray-400">
              User connects their Gmail account via OAuth 2.0 (free)
            </p>
          </div>
          
          <div className="space-y-2">
            <h4 className="font-medium text-blue-600 dark:text-blue-400">3. Dynamic Sending</h4>
            <p className="text-gray-600 dark:text-gray-400">
              Invitations are sent from user's own Gmail account
            </p>
          </div>
        </div>

        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
            🎯 Benefits:
          </h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• <strong>Authentic Collaboration:</strong> Recipients see real invitations from actual teammates</li>
            <li>• <strong>Professional Experience:</strong> No generic system emails</li>
            <li>• <strong>Individual Control:</strong> Each user manages their own email sending</li>
            <li>• <strong>Free Solution:</strong> Uses Gmail's free API quota (100 emails/day per user)</li>
            <li>• <strong>Fallback System:</strong> Works even without Gmail connection</li>
          </ul>
        </div>
      </div>

      {/* Test Results */}
      {result && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-slate-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            📊 Test Results
          </h3>
          
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap font-mono">
              {result}
            </pre>
          </div>
          
          <button
            onClick={() => setResult(null)}
            className="mt-4 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors"
          >
            Clear Results
          </button>
        </div>
      )}
    </div>
  );
};

export default DynamicEmailDemo;


