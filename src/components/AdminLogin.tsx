import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminAuthService } from '../services/adminAuthService';

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Ensure admin account exists on component mount
  useEffect(() => {
    AdminAuthService.ensureAdminAccount().catch((error) => {
      console.error('Failed to ensure admin account on mount:', error);
      // Don't show error to user here, they can still try to login
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Use AdminAuthService for proper authentication
      const result = await AdminAuthService.loginAdmin(email, password);
      
      if (result.success) {
        navigate('/admin_dashboard');
      } else {
        setError(result.message);
      }
    } catch (error: any) {
      setError(error.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <div className="mx-auto h-24 w-24 bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 rounded-full flex items-center justify-center shadow-2xl">
            <svg className="h-14 w-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h2 className="mt-6 text-4xl font-extrabold text-white">🔐 Admin Access</h2>
          <p className="mt-2 text-lg text-gray-300">
            Secure admin dashboard access
          </p>
          <div className="mt-4 p-3 bg-red-900/30 border border-red-500/30 rounded-lg">
            <p className="text-red-200 text-sm">
              ⚠️ Restricted Area - Admin Only
            </p>
          </div>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Admin Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="appearance-none relative block w-full px-4 py-4 border border-gray-600 placeholder-gray-400 text-white bg-gray-800/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:z-10 text-lg backdrop-blur-sm"
              placeholder="Enter admin email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
              Admin Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              autoComplete="off"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="appearance-none relative block w-full px-4 py-4 border border-gray-600 placeholder-gray-400 text-white bg-gray-800/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 focus:z-10 text-lg backdrop-blur-sm"
              placeholder="Enter admin password"
            />
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-4 px-6 border border-transparent text-lg font-bold rounded-xl text-white bg-gradient-to-r from-red-600 via-orange-500 to-yellow-500 hover:from-red-700 hover:via-orange-600 hover:to-yellow-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:scale-105"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              ) : (
                '🚀 Access Admin Dashboard'
              )}
            </button>
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="text-gray-400 hover:text-white text-sm font-medium transition-colors duration-200"
            >
              ← Back to User Dashboard
            </button>
          </div>
        </form>

        {/* <div className="text-center p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
          <p className="text-yellow-200 text-sm font-medium">
            🔑 Default Admin Credentials:
          </p>
          <div className="mt-2 space-y-1">
            <p className="text-yellow-200 text-xs">
              Email: <code className="bg-yellow-900/50 px-2 py-1 rounded text-yellow-100">mrajasekhar9676@gmail.com</code>
            </p>
            <p className="text-yellow-200 text-xs">
              Password: <code className="bg-yellow-900/50 px-2 py-1 rounded text-yellow-100">admin123</code>
            </p>
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default AdminLogin;
