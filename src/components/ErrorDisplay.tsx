import React, { useState, useEffect } from 'react';

const ErrorDisplay: React.FC = () => {
  const [errors, setErrors] = useState<any[]>([]);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    const loadErrors = () => {
      try {
        const storedErrors = sessionStorage.getItem('app_errors');
        if (storedErrors) {
          setErrors(JSON.parse(storedErrors));
        }
      } catch (error) {
        console.error('Error loading stored errors:', error);
      }
    };

    loadErrors();
    
    // Check for new errors every 2 seconds
    const interval = setInterval(loadErrors, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const clearErrors = () => {
    sessionStorage.removeItem('app_errors');
    setErrors([]);
  };

  if (errors.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={() => setShowErrors(!showErrors)}
        className="bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-red-700 transition-colors"
      >
        🚨 {errors.length} Error{errors.length > 1 ? 's' : ''}
      </button>
      
      {showErrors && (
        <div className="absolute bottom-full right-0 mb-2 w-96 max-h-96 overflow-y-auto bg-white border border-red-200 rounded-lg shadow-xl">
          <div className="p-4 border-b border-red-200 bg-red-50">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-red-800">Recent Errors</h3>
              <button
                onClick={clearErrors}
                className="text-red-600 hover:text-red-800 text-sm"
              >
                Clear All
              </button>
            </div>
          </div>
          
          <div className="p-4 space-y-3">
            {errors.map((error, index) => (
              <div key={index} className="border border-red-200 rounded p-3 bg-red-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-red-800 mb-1">
                      {error.type?.toUpperCase()} Error
                    </div>
                    <div className="text-xs text-red-600 mb-2">
                      {error.timestamp ? new Date(error.timestamp).toLocaleTimeString() : 'Unknown time'}
                    </div>
                    <div className="text-sm text-red-700">
                      {error.message || error.reason || 'Unknown error'}
                    </div>
                    {error.filename && (
                      <div className="text-xs text-red-500 mt-1">
                        File: {error.filename}:{error.lineno}:{error.colno}
                      </div>
                    )}
                    {error.url && (
                      <div className="text-xs text-red-500 mt-1">
                        URL: {error.url}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => {
                      const newErrors = errors.filter((_, i) => i !== index);
                      sessionStorage.setItem('app_errors', JSON.stringify(newErrors));
                      setErrors(newErrors);
                    }}
                    className="text-red-400 hover:text-red-600 text-sm ml-2"
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ErrorDisplay;





















