import React, { useState, useRef } from 'react';
import { fileStorageService, FileInfo, UploadProgress } from '../services/fileStorageService';

interface BulkUploadProps {
  pathPrefix: string;
  onFilesUploaded: (files: FileInfo[]) => void;
  onError?: (message: string) => void;
  maxFiles?: number;
  maxFileSize?: number; // in MB
  acceptedTypes?: string[];
}

const BulkUpload: React.FC<BulkUploadProps> = ({
  pathPrefix,
  onFilesUploaded,
  onError,
  maxFiles = 10,
  maxFileSize = 100,
  acceptedTypes = ['image/*', 'application/pdf', 'text/*', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: number]: UploadProgress }>({});
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (files: FileList) => {
    const fileArray = Array.from(files);
    
    // Validate file count
    if (fileArray.length > maxFiles) {
      onError?.(`Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate file types and sizes
    const validFiles: File[] = [];
    for (const file of fileArray) {
      // Check file size
      if (file.size > maxFileSize * 1024 * 1024) {
        onError?.(`File ${file.name} is too large. Maximum size is ${maxFileSize}MB`);
        continue;
      }

      // Check file type
      const isValidType = acceptedTypes.some(type => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.slice(0, -1));
        }
        return file.type === type;
      });

      if (!isValidType) {
        onError?.(`File ${file.name} type is not supported`);
        continue;
      }

      validFiles.push(file);
    }

    setSelectedFiles(validFiles);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress({});

    try {
      const fileList = new DataTransfer();
      selectedFiles.forEach(file => fileList.items.add(file));
      
      const results = await fileStorageService.uploadMultipleFiles(
        fileList.files,
        pathPrefix,
        (fileIndex, progress) => {
          setUploadProgress(prev => ({
            ...prev,
            [fileIndex]: progress
          }));
        }
      );

      onFilesUploaded(results);
      setSelectedFiles([]);
      setUploadProgress({});
    } catch (error) {
      console.error('Bulk upload failed:', error);
      onError?.(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <div className="space-y-2">
          <div className="text-4xl">📁</div>
          <p className="text-lg font-medium text-gray-700">
            Drop files here or click to select
          </p>
          <p className="text-sm text-gray-500">
            Maximum {maxFiles} files, {maxFileSize}MB each
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            disabled={isUploading}
          >
            Select Files
          </button>
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={acceptedTypes.join(',')}
          onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Selected Files ({selectedFiles.length})</h4>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="text-2xl">
                    {file.type.startsWith('image/') ? '🖼️' : 
                     file.type === 'application/pdf' ? '📄' :
                     file.type.startsWith('text/') ? '📝' : '📎'}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {uploadProgress[index] && (
                    <div className="text-xs text-gray-600">
                      {uploadProgress[index].percentage}%
                    </div>
                  )}
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-600 hover:text-red-800 text-sm"
                    disabled={isUploading}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setSelectedFiles([])}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
              disabled={isUploading}
            >
              Clear All
            </button>
            <button
              onClick={handleUpload}
              disabled={isUploading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
            >
              {isUploading ? 'Uploading...' : `Upload ${selectedFiles.length} Files`}
            </button>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {isUploading && Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Upload Progress</h4>
          {Object.entries(uploadProgress).map(([index, progress]) => (
            <div key={index} className="space-y-1">
              <div className="flex justify-between text-sm">
                <span>{selectedFiles[parseInt(index)]?.name}</span>
                <span>{progress.percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BulkUpload;

