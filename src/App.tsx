import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import SignIn from './pages/auth/SignIn';
import SimpleAuth from './components/SimpleAuth';
import ManualLogin from './components/ManualLogin';
import ManualRegistration from './components/ManualRegistration';
import TypeSafeDashboard from './components/TypeSafeDashboard';
import MinimalDashboard from './components/MinimalDashboard';
import SimpleDashboard from './components/SimpleDashboard';
import Dashboard from './pages/Dashboard';
import Teams from './pages/Teams';
import TeamDetail from './pages/TeamDetail';
import Tasks from './pages/Tasks';
import Calendar from './pages/Calendar';
import VoiceRecordings from './pages/VoiceRecordings';
import InviteAccept from './pages/InviteAccept';
import SimpleWhatsAppReminder from './components/SimpleWhatsAppReminder';

import AdminDashboard from './components/AdminDashboard';
import AdminLogin from './components/AdminLogin';
import DebugPage from './components/DebugPage';
import TemplateTest from './components/TemplateTest';
import ErrorLogger from './components/ErrorLogger';
import ErrorBoundary from './components/ErrorBoundary';
import UserManagement from './components/UserManagement';

const AppContent: React.FC = () => {
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-blue-700 dark:text-blue-200">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      {/* Admin routes - completely separate from Layout and authentication */}
      <Route path="/admin_login" element={<AdminLogin />} />
      <Route path="/admin_dashboard" element={<AdminDashboard />} />
      
      {/* Public routes - accessible without authentication */}
      <Route path="/login" element={<SimpleAuth />} />
      <Route path="/signin" element={<SignIn />} />
      <Route path="/manual-login" element={<ManualLogin />} />
      <Route path="/register" element={<ManualRegistration />} />
      <Route path="/invite/accept/:invitationId" element={<InviteAccept />} />
      
      {/* Protected routes - require authentication */}
      {user ? (
        <Route path="*" element={
          <Layout>
            <Routes>
              <Route path="/dashboard" element={<TypeSafeDashboard />} />
              <Route path="/teams" element={<Teams />} />
              <Route path="/teams/:teamId" element={<TeamDetail />} />
              <Route path="/tasks" element={<Tasks />} />
              <Route path="/calendar" element={<Calendar />} />
              <Route path="/voice-recordings" element={<VoiceRecordings />} />
              <Route path="/whatsapp-reminders" element={<SimpleWhatsAppReminder />} />
              <Route path="/template-test" element={<TemplateTest />} />
              <Route path="/debug" element={<DebugPage />} />
              {role === 'superadmin' && (
                <Route path="/user-management" element={<UserManagement />} />
              )}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Layout>
        } />
      ) : (
        /* Redirect all other routes to login if not authenticated */
        <Route path="*" element={<Navigate to="/login" replace />} />
      )}
    </Routes>
  );
};

const App: React.FC = () => {
  // Initialize WhatsApp service when app starts
  React.useEffect(() => {
    // Initialize WhatsApp service with environment variables or default values
    const apiKey = process.env.REACT_APP_DOUBLE_TICK_API_KEY || 'key_XAKKhG3Xdz';
    
    if (apiKey) {
      const whatsAppService = require('./services/WhatsAppService').whatsAppService;
      const initialized = whatsAppService.initialize(apiKey);
      if (initialized) {
        console.log('✅ WhatsApp Service initialized successfully');
        console.log(`📱 API Key: ${apiKey.substring(0, 10)}...`);
      } else {
        console.warn('⚠️ WhatsApp Service: Failed to initialize');
      }
    } else {
      console.warn('⚠️ WhatsApp Service: Missing API credentials');
    }
  }, []);

  return (
    <ErrorBoundary>
      <ErrorLogger>
        <AuthProvider>
          <Router>
            <AppContent />
          </Router>
        </AuthProvider>
      </ErrorLogger>
    </ErrorBoundary>
  );
};

export default App;

