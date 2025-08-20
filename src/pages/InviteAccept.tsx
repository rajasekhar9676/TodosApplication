import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { invitationService } from '../services/invitationService';
import { useAuth } from '../context/AuthContext';

const InviteAccept: React.FC = () => {
  const { invitationId } = useParams<{ invitationId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (invitationId) {
      fetchInvitation();
    }
  }, [invitationId]);

  const fetchInvitation = async () => {
    try {
      // For now, we'll just set a mock invitation
      // In a real app, you'd fetch this from Firestore
      setInvitation({
        teamName: 'Sample Team',
        invitedByName: 'Team Member',
        role: 'member'
      });
    } catch (error) {
      setError('Failed to load invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!user || !invitationId) return;
    
    setProcessing(true);
    try {
      const result = await invitationService.acceptInvitation(invitationId, user.uid);
      
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Failed to accept invitation');
      }
    } catch (error) {
      setError('Failed to accept invitation');
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!invitationId) return;
    
    setProcessing(true);
    try {
      const result = await invitationService.declineInvitation(invitationId);
      
      if (result.success) {
        navigate('/dashboard');
      } else {
        setError(result.error || 'Failed to decline invitation');
      }
    } catch (error) {
      setError('Failed to decline invitation');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-blue-700 dark:text-blue-200">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Team Invitation</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-6">
            You've been invited to join <strong>{invitation?.teamName}</strong> by <strong>{invitation?.invitedByName}</strong>
          </p>
          
          <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600 dark:text-gray-300">
              <strong>Role:</strong> {invitation?.role}
            </p>
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={handleAccept}
              disabled={processing}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium disabled:opacity-50"
            >
              {processing ? 'Accepting...' : 'Accept Invitation'}
            </button>
            <button
              onClick={handleDecline}
              disabled={processing}
              className="flex-1 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-200 py-2 rounded-lg font-medium disabled:opacity-50"
            >
              {processing ? 'Declining...' : 'Decline'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InviteAccept; 