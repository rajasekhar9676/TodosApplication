import React, { useState } from 'react';
import { User } from 'firebase/auth';
import { gmailService } from '../services/gmailService';

interface Props {
  currentUser: User;
}

const GoogleWorkspaceSetup: React.FC<Props> = ({ currentUser }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState('');
  
  // Get Google Workspace recommendations
  const recommendations = gmailService.getDynamicEmailRecommendations(currentUser.email || '');
  const workspaceOptions = gmailService.getGoogleWorkspaceOptions(currentUser.email || '');
  
  // Check if this is a Google Workspace account
  const isGoogleWorkspace = gmailService.getDynamicEmailRecommendations(currentUser.email || '').type === 'workspace';

  if (!isGoogleWorkspace) {
    return null; // Don't show for regular Gmail users
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl shadow-lg p-6 border border-purple-200 dark:border-purple-800">
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-xl flex items-center justify-center mr-3">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            🏢 Google Workspace Dynamic Email Setup
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Configure your business domain for dynamic email sending
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Current Status */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
            📊 Current Configuration
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Account Type:</span>
              <span className="ml-2 font-medium text-purple-600 dark:text-purple-400">Google Workspace</span>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Domain:</span>
              <span className="ml-2 font-medium text-blue-600 dark:text-blue-400">
                {currentUser.email?.split('@')[1]}
              </span>
            </div>
          </div>
        </div>

        {/* Available Email Options */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
            📧 Available Email Addresses
          </h4>
          <div className="space-y-2">
            {workspaceOptions.map((email, index) => (
              <div key={index} className="flex items-center space-x-3">
                <input
                  type="radio"
                  id={`email-${index}`}
                  name="selectedEmail"
                  value={email}
                  checked={selectedEmail === email}
                  onChange={(e) => setSelectedEmail(e.target.value)}
                  className="text-purple-600 focus:ring-purple-500"
                />
                <label htmlFor={`email-${index}`} className="text-sm text-gray-700 dark:text-gray-300">
                  {email}
                </label>
                {index === 0 && (
                  <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                    Primary
                  </span>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            💡 These email addresses can be used for sending team invitations
          </p>
        </div>

        {/* Setup Instructions */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
          <h4 className="font-medium text-gray-900 dark:text-white mb-3">
            🔧 Setup Instructions
          </h4>
          
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-purple-600 dark:text-purple-400">1</span>
              </div>
              <div>
                <h5 className="font-medium text-gray-900 dark:text-white text-sm">Gmail SendAs Setup</h5>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Go to Gmail Settings → Accounts and Import → Add another email address
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-purple-600 dark:text-purple-400">2</span>
              </div>
              <div>
                <h5 className="font-medium text-gray-900 dark:text-white text-sm">Admin Console Setup</h5>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Create email aliases in Google Admin Console for team members
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-medium text-purple-600 dark:text-purple-400">3</span>
              </div>
              <div>
                <h5 className="font-medium text-gray-900 dark:text-white text-sm">Email Routing</h5>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Set up email forwarding rules for dynamic team addresses
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Advanced Options */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-4 border border-gray-200 dark:border-slate-700">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className="font-medium text-gray-900 dark:text-white">
              ⚙️ Advanced Configuration
            </h4>
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {showAdvanced && (
            <div className="mt-3 space-y-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h5 className="font-medium text-gray-900 dark:text-white text-sm mb-2">
                  🎯 Custom Email Templates
                </h5>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Create personalized email templates for different team roles and departments
                </p>
              </div>
              
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h5 className="font-medium text-gray-900 dark:text-white text-sm mb-2">
                  📊 Email Analytics
                </h5>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Track email delivery, open rates, and team member responses
                </p>
              </div>
              
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h5 className="font-medium text-gray-900 dark:text-white text-sm mb-2">
                  🔄 Automated Workflows
                </h5>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Set up automatic follow-up emails and reminder systems
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <button className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition-colors">
            🏢 Setup Google Workspace
          </button>
          <button className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-colors">
            📚 View Docs
          </button>
        </div>

        {/* Info */}
        <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
          <p>💡 <strong>Note:</strong> Google Workspace accounts have domain restrictions for email sending.</p>
          <p>📧 Dynamic email addresses must be within your domain: <strong>{currentUser.email?.split('@')[1]}</strong></p>
        </div>
      </div>
    </div>
  );
};

export default GoogleWorkspaceSetup;











