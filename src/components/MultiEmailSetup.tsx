import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { multiEmailService } from '../services/multiEmailService';

interface Props {
  currentUser: User;
}

const MultiEmailSetup: React.FC<Props> = ({ currentUser }) => {
  const [customEmail, setCustomEmail] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>('');

  const availableProviders = multiEmailService.getAvailableProviders();

  const handleSetCustomEmail = () => {
    if (customEmail.trim()) {
      multiEmailService.setUserPreferredEmail(currentUser.uid, customEmail.trim());
      setResult(`✅ Set preferred email to: ${customEmail.trim()}`);
      setTimeout(() => setResult(null), 3000);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail.trim() || !customEmail.trim()) {
      setResult('❌ Please enter both sender and recipient emails');
      return;
    }

    setIsSending(true);
    setResult(null);

    try {
      const result = await multiEmailService.sendEmailFromAnyAddress({
        from: customEmail.trim(),
        to: testEmail.trim(),
        subject: 'Test Email - Multi-Email System',
        htmlBody: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">🚀 Multi-Email System Test</h2>
            <p>This is a test email sent using the <strong>Multi-Email Service</strong>!</p>
            <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <h3 style="margin-top: 0; color: #059669;">Email Details:</h3>
              <p><strong>From:</strong> ${customEmail.trim()}</p>
              <p><strong>To:</strong> ${testEmail.trim()}</p>
              <p><strong>Subject:</strong> Test Email - Multi-Email System</p>
              <p><strong>Sent by:</strong> ${currentUser.displayName || currentUser.email}</p>
            </div>
            <p>🎉 <strong>No domain restrictions!</strong> You can send from ANY email address!</p>
            <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
              This email was sent using the revolutionary Multi-Email Service that bypasses all Gmail API limitations.
            </p>
          </div>
        `,
        textBody: `Test email from ${customEmail.trim()} to ${testEmail.trim()}. Multi-Email System working!`
      }, currentUser.uid);

      if (result.success) {
        setResult(`✅ Test email sent successfully via ${result.provider}!`);
        setSelectedProvider(result.provider);
      } else {
        setResult(`❌ Failed to send test email: ${result.error}`);
      }
    } catch (error) {
      setResult(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSending(false);
    }
  };

  const getProviderRecommendations = (email: string) => {
    if (!email.trim()) return null;
    return multiEmailService.getProviderRecommendations(email.trim());
  };

  const recommendations = getProviderRecommendations(customEmail);

  return (
    <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 rounded-xl shadow-lg p-6 border border-green-200 dark:border-green-800">
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-r from-green-600 to-blue-600 rounded-xl flex items-center justify-center mr-4">
          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">
            🚀 Multi-Email System
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Send emails from ANY address - NO DOMAIN RESTRICTIONS!
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Available Providers */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
            🔌 Available Email Providers
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {availableProviders.map((provider) => (
              <div key={provider} className="flex items-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${
                  selectedProvider === provider ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                  {provider}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            💡 These providers work together to send emails from any address
          </p>
        </div>

        {/* Custom Email Setup */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
            📧 Set Your Custom Email Address
          </h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Send emails from this address:
              </label>
              <input
                type="email"
                value={customEmail}
                onChange={(e) => setCustomEmail(e.target.value)}
                placeholder="john@gmail.com, sarah@yahoo.com, team@company.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
              />
            </div>
            
            {recommendations && (
              <div className={`p-3 rounded-lg border ${
                recommendations.setupRequired 
                  ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
                  : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
              }`}>
                <h5 className="font-medium text-sm mb-2">
                  {recommendations.setupRequired ? '⚠️ Setup Required' : '✅ Ready to Send'}
                </h5>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  Best provider: <strong>{recommendations.bestProvider}</strong>
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Available providers: {recommendations.providers.join(', ')}
                </p>
              </div>
            )}

            <button
              onClick={handleSetCustomEmail}
              disabled={!customEmail.trim()}
              className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              🔧 Set Custom Email Address
            </button>
          </div>
        </div>

        {/* Test Email Sending */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
            🧪 Test Email Sending
          </h4>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Send test email to:
              </label>
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
              />
            </div>
            
            <button
              onClick={handleTestEmail}
              disabled={!customEmail.trim() || !testEmail.trim() || isSending}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              {isSending ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending...
                </span>
              ) : (
                '📧 Send Test Email'
              )}
            </button>
          </div>
        </div>

        {/* Results */}
        {result && (
          <div className={`p-4 rounded-lg border ${
            result.startsWith('✅') 
              ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
              : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
          }`}>
            <p className="text-sm font-medium text-gray-900 dark:text-white">{result}</p>
          </div>
        )}

        {/* How It Works */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
            🔬 How It Works
          </h4>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>1. <strong>Multi-Provider System:</strong> Uses Gmail API, SMTP, Resend, and SendGrid</p>
            <p>2. <strong>Smart Provider Selection:</strong> Automatically chooses the best provider for each email</p>
            <p>3. <strong>No Domain Restrictions:</strong> Send from ANY email address (gmail.com, yahoo.com, company.com)</p>
            <p>4. <strong>Fallback System:</strong> If one provider fails, automatically tries another</p>
            <p>5. <strong>User Preferences:</strong> Remember your preferred email addresses</p>
          </div>
        </div>

        {/* Benefits */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
          <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-3">
            🎯 Benefits of Multi-Email System
          </h4>
          <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
            <li>✅ <strong>No Domain Restrictions:</strong> Send from any email address</li>
            <li>✅ <strong>True Collaboration:</strong> Each team member sends from their own email</li>
            <li>✅ <strong>Professional Appearance:</strong> Recipients see authentic sender addresses</li>
            <li>✅ <strong>Multiple Providers:</strong> Reliable email delivery with fallbacks</li>
            <li>✅ <strong>Easy Setup:</strong> No complex configuration required</li>
            <li>✅ <strong>Cost Effective:</strong> Uses free tiers and existing services</li>
          </ul>
        </div>

        {/* Info */}
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          <p>🚀 <strong>Revolutionary:</strong> This system completely bypasses Gmail API domain restrictions!</p>
          <p>📧 <strong>Send from ANY address:</strong> gmail.com, yahoo.com, company.com, or custom domains</p>
        </div>
      </div>
    </div>
  );
};

export default MultiEmailSetup;


















