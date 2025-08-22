import React, { useEffect } from 'react';

interface ErrorLoggerProps {
  children: React.ReactNode;
}

const ErrorLogger: React.FC<ErrorLoggerProps> = ({ children }) => {
  useEffect(() => {
    // Global error handler
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('🚨 Global Error Caught:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href
      });
      
      // Store error in sessionStorage for debugging
      const errors = JSON.parse(sessionStorage.getItem('app_errors') || '[]');
      errors.push({
        type: 'global',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        timestamp: new Date().toISOString(),
        url: window.location.href
      });
      sessionStorage.setItem('app_errors', JSON.stringify(errors.slice(-10))); // Keep last 10 errors
    };

    // Unhandled promise rejection handler
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('🚨 Unhandled Promise Rejection:', {
        reason: event.reason,
        timestamp: new Date().toISOString(),
        url: window.location.href
      });
      
      const errors = JSON.parse(sessionStorage.getItem('app_errors') || '[]');
      errors.push({
        type: 'promise',
        reason: event.reason,
        timestamp: new Date().toISOString(),
        url: window.location.href
      });
      sessionStorage.setItem('app_errors', JSON.stringify(errors.slice(-10)));
    };

    // React error boundary fallback
    const handleReactError = (error: Error, errorInfo: any) => {
      console.error('🚨 React Error:', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href
      });
      
      const errors = JSON.parse(sessionStorage.getItem('app_errors') || '[]');
      errors.push({
        type: 'react',
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        timestamp: new Date().toISOString(),
        url: window.location.href
      });
      sessionStorage.setItem('app_errors', JSON.stringify(errors.slice(-10)));
    };

    // Add event listeners
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    // Override console.error to capture more details
    const originalConsoleError = console.error;
    console.error = (...args) => {
      originalConsoleError.apply(console, args);
      
      const errors = JSON.parse(sessionStorage.getItem('app_errors') || '[]');
      errors.push({
        type: 'console',
        args: args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ),
        timestamp: new Date().toISOString(),
        url: window.location.href
      });
      sessionStorage.setItem('app_errors', JSON.stringify(errors.slice(-10)));
    };

    // Cleanup function
    return () => {
      window.removeEventListener('error', handleGlobalError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      console.error = originalConsoleError;
    };
  }, []);

  return <>{children}</>;
};

export default ErrorLogger;
