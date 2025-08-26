import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, provider } from '../../config';
import { signInWithPopup } from 'firebase/auth';
import { userPhoneService } from '../../services/userPhoneService';
import { db } from '../../config';
import { doc, setDoc } from 'firebase/firestore';

const SignIn: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  
  // Check if there's a pending invitation
  useEffect(() => {
    const pendingInvitationId = sessionStorage.getItem('pendingInvitationId');
    if (pendingInvitationId && location.state?.from === 'invitation') {
      console.log('📧 SignIn: Found pending invitation:', pendingInvitationId);
    }
  }, [location.state]);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // 🚀 AUTO-SAVE USER DATA TO FIRESTORE
      await setDoc(doc(db, 'users', user.uid), {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        createdAt: new Date(),
        updatedAt: new Date()
      }, { merge: true });
      
      // 🚀 AUTO-SAVE PHONE NUMBER FROM GOOGLE LOGIN (if available)
      if (user.phoneNumber) {
        console.log('📱 SignIn: Found phone number in Google profile:', user.phoneNumber);
        await userPhoneService.getPhoneFromGoogleLogin(user);
        console.log('✅ SignIn: Phone number automatically saved from Google login!');
      } else {
        console.log('ℹ️ SignIn: No phone number found in Google profile');
      }
      
      // Check if there's a pending invitation to redirect to
      const pendingInvitationId = sessionStorage.getItem('pendingInvitationId');
      if (pendingInvitationId) {
        console.log('📧 SignIn: Redirecting to pending invitation after login');
        sessionStorage.removeItem('pendingInvitationId');
        navigate(`/invite/accept/${pendingInvitationId}`);
      } else {
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Sign-in error:', error);
      setError(error.message || 'Failed to sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-8">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Welcome to TodoPro</h1>
            <p className="text-gray-600 dark:text-gray-300">The collaborative task management platform for modern teams</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Invitation Message */}
          {location.state?.from === 'invitation' && (
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-blue-600 dark:text-blue-400 text-sm">
                {location.state.message || 'Please sign in to accept your team invitation'}
              </p>
            </div>
          )}

          {/* Sign In Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
          >
            {loading ? (
              <div className="flex items-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                Signing in...
              </div>
            ) : (
              <>
                <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {/* Divider */}
          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300 dark:border-gray-600" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-slate-800 text-gray-500 dark:text-gray-400">Or continue with</span>
              </div>
            </div>
          </div>

          {/* Manual Login Options */}
          <div className="mt-6 space-y-3">
            <button
              onClick={() => navigate('/manual-login')}
              className="w-full flex items-center justify-center px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl shadow-sm bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-3 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Sign in with Email
            </button>
            
            <button
              onClick={() => navigate('/register')}
              className="w-full flex items-center justify-center px-6 py-3 border border-blue-300 dark:border-blue-600 rounded-xl shadow-sm bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-200"
            >
              <svg className="w-5 h-5 mr-3 text-blue-500 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Create New Account
            </button>
          </div>

          {/* Footer */}
          <div className="mt-8 text-center">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              By signing in, you agree to our Terms of Service and Privacy Policy
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignIn; 