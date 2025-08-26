import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { invitationService } from '../services/invitationService';
import { gmailService } from '../services/gmailService';

interface Props {
  teamId: string;
  teamName: string;
  onInvitationSent?: () => void;
}

const InviteUserForm: React.FC<Props> = ({ teamId, teamName, onInvitationSent }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const { user } = useAuth();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !user) return;

    setIsSending(true);
    setMessage(null);

    try {
      console.log('📧 Sending invitation from user:', user.email);
      console.log('📧 Team:', teamName);
      console.log('📧 Invitee email:', email);
      console.log('📧 Role:', role);

      // Check if user has connected Gmail
      const hasGmail = gmailService.hasUserGmail(user.uid);
      console.log('🔐 User has connected Gmail:', hasGmail);

      const result = await invitationService.sendInvitation(
        teamId,
        teamName,
        email.trim(),
        role,
        user.uid,
        user.displayName || user.email || 'Team Member',
        user.email || '' // 🔧 NEW: Pass inviter's email
      );

      if (result.success) {
        setMessage({ 
          text: `✅ Invitation sent successfully to ${email}! ${
            hasGmail 
              ? `Email sent from your Gmail account (${user.email})` 
              : 'Email sent from system account'
          }`, 
          type: 'success' 
        });
        setEmail('');
        onInvitationSent?.();
      } else {
        setMessage({ 
          text: `❌ Failed to send invitation: ${result.error}`, 
          type: 'error' 
        });
      }
    } catch (error) {
      console.error('❌ Error sending invitation:', error);
      setMessage({ 
        text: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`, 
        type: 'error' 
      });
    } finally {
      setIsSending(false);
    }
  };

  const clearMessage = () => {
    setMessage(null);
  };

  return (
    <div className="bg-white dark:bg-slate-800 shadow-lg rounded-xl p-6 border border-gray-200 dark:border-slate-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        📧 Invite Team Member
      </h3>
      
      <form onSubmit={handleInvite} className="space-y-4">
        {/* Email Input */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            placeholder="Enter email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
            required
          />
        </div>

        {/* Role Selection */}
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Team Role
          </label>
          <select
            id="role"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* Gmail Connection Status */}
        {user && (
          <div className={`p-3 rounded-lg border ${
            gmailService.hasUserGmail(user.uid)
              ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
              : 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800'
          }`}>
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${
                gmailService.hasUserGmail(user.uid) ? 'bg-green-500' : 'bg-yellow-500'
              }`}></div>
              <span className={`text-sm ${
                gmailService.hasUserGmail(user.uid) 
                  ? 'text-green-800 dark:text-green-200' 
                  : 'text-yellow-800 dark:text-yellow-200'
              }`}>
                {gmailService.hasUserGmail(user.uid)
                  ? `✅ Invitation will be sent from your Gmail (${user.email})`
                  : `⚠️ Connect your Gmail to send invitations from your own email address`
                }
              </span>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSending || !email.trim()}
          className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
            isSending || !email.trim()
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {isSending ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Sending Invitation...
            </span>
          ) : (
            '📧 Send Invitation'
          )}
        </button>
      </form>

      {/* Message Display */}
      {message && (
        <div className={`mt-4 p-3 rounded-lg border ${
          message.type === 'success'
            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
            : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
        }`}>
          <div className="flex items-center justify-between">
            <p className={`text-sm ${
              message.type === 'success'
                ? 'text-green-700 dark:text-green-300'
                : 'text-red-700 dark:text-red-300'
            }`}>
              {message.text}
            </p>
            <button
              onClick={clearMessage}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default InviteUserForm;
