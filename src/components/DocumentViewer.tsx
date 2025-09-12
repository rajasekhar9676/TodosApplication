import React, { useState } from 'react';

interface DocumentViewerProps {
  documentUrl: string;
  fileName: string;
  onClose: () => void;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({ documentUrl, fileName, onClose }) => {
  const [isLoading, setIsLoading] = useState(true);

  const getFileType = (url: string) => {
    if (url.startsWith('data:')) {
      const mimeType = url.split(';')[0].split(':')[1];
      return mimeType;
    }
    return 'unknown';
  };

  const getFileExtension = (fileName: string) => {
    return fileName.split('.').pop()?.toLowerCase() || '';
  };

  const fileType = getFileType(documentUrl);
  const fileExtension = getFileExtension(fileName);

  const renderDocument = () => {
    if (fileType.startsWith('image/')) {
      return (
        <img
          src={documentUrl}
          alt={fileName}
          className="max-w-full max-h-full object-contain"
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
        />
      );
    } else if (fileType === 'application/pdf') {
      return (
        <iframe
          src={documentUrl}
          className="w-full h-full border-0"
          onLoad={() => setIsLoading(false)}
          onError={() => setIsLoading(false)}
        />
      );
    } else if (fileType === 'text/plain' || fileType === 'text/csv') {
      return (
        <div className="w-full h-full p-4">
          <pre className="whitespace-pre-wrap text-sm font-mono bg-gray-50 p-4 rounded">
            {atob(documentUrl.split(',')[1])}
          </pre>
        </div>
      );
    } else {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <div className="text-6xl mb-4">📄</div>
          <p className="text-lg mb-2">Document Preview Not Available</p>
          <p className="text-sm mb-4">File type: {fileType}</p>
          <a
            href={documentUrl}
            download={fileName}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Download File
          </a>
        </div>
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-11/12 h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-800 truncate">
            {fileName}
          </h3>
          <div className="flex items-center space-x-2">
            <a
              href={documentUrl}
              download={fileName}
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            >
              Download
            </a>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
            >
              Close
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 relative">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading document...</p>
              </div>
            </div>
          )}
          
          <div className="w-full h-full">
            {renderDocument()}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 text-sm text-gray-600">
          <div className="flex items-center justify-between">
            <span>File Type: {fileType}</span>
            <span>Size: {Math.round(documentUrl.length * 0.75 / 1024)} KB (base64)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentViewer;

