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
      sessionStorage.setItem('app_errors', JSON.stringify(errors.slice(-5))); // Keep last 5 errors
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
      sessionStorage.setItem('app_errors', JSON.stringify(errors.slice(-5)));
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
      sessionStorage.setItem('app_errors', JSON.stringify(errors.slice(-5)));
    };

    // Add event listeners
    window.addEventListener('error', handleGlobalError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    
    // Override console.error to capture more details (with size limit)
    const originalConsoleError = console.error;
    console.error = (...args) => {
      originalConsoleError.apply(console, args);
      
      try {
        const errors = JSON.parse(sessionStorage.getItem('app_errors') || '[]');
        const errorData = {
          type: 'console',
          args: args.map(arg => {
            if (typeof arg === 'object') {
              // Limit object size to prevent storage overflow
              const str = JSON.stringify(arg, null, 2);
              return str.length > 1000 ? str.substring(0, 1000) + '...' : str;
            }
            const str = String(arg);
            return str.length > 500 ? str.substring(0, 500) + '...' : str;
          }),
          timestamp: new Date().toISOString(),
          url: window.location.href
        };
        
        errors.push(errorData);
        const limitedErrors = errors.slice(-3); // Keep only last 3 errors
        
        // Check if the data is too large before storing
        const dataString = JSON.stringify(limitedErrors);
        if (dataString.length < 50000) { // 50KB limit
          sessionStorage.setItem('app_errors', dataString);
        }
      } catch (storageError) {
        // If storage fails, just log to console
        console.warn('Failed to store error in sessionStorage:', storageError);
      }
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













