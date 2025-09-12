import React from 'react';
import { FileInfo } from '../services/fileStorageService';

interface ItemDetailViewProps {
  item: any; // Can be task, plan, blueprint, or target
  itemType: 'task' | 'plan' | 'blueprint' | 'target';
  onClose: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const ItemDetailView: React.FC<ItemDetailViewProps> = ({
  item,
  itemType,
  onClose,
  onEdit,
  onDelete
}) => {
  const handleDownloadFile = async (fileInfo: FileInfo) => {
    try {
      const response = await fetch(fileInfo.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileInfo.name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please try again.');
    }
  };

  const renderItemDetails = () => {
    switch (itemType) {
      case 'task':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <p className="mt-1 text-sm text-gray-900">{item.title || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Assigned To</label>
                <p className="mt-1 text-sm text-gray-900">{item.assignedTo || 'Unassigned'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  item.status === 'completed' ? 'bg-green-100 text-green-800' :
                  item.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  item.status === 'blocked' ? 'bg-red-100 text-red-800' :
                  item.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {item.status || 'Not set'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Priority</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  item.priority === 'high' ? 'bg-red-100 text-red-800' :
                  item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {item.priority || 'Not set'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Due Date</label>
                <p className="mt-1 text-sm text-gray-900">{item.dueDate || 'Not set'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <p className="mt-1 text-sm text-gray-900">{item.category || 'Not set'}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                {item.notes && !item.notes.includes('Document: data:') ? item.notes : 'No notes'}
              </p>
            </div>
          </div>
        );

      case 'plan':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <p className="mt-1 text-sm text-gray-900">{item.title || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  item.status === 'completed' ? 'bg-green-100 text-green-800' :
                  item.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  item.status === 'blocked' ? 'bg-red-100 text-red-800' :
                  item.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {item.status || 'Not set'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <p className="mt-1 text-sm text-gray-900">{item.startDate || 'Not set'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Date</label>
                <p className="mt-1 text-sm text-gray-900">{item.endDate || 'Not set'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Progress</label>
                <p className="mt-1 text-sm text-gray-900">{item.progress || '0'}%</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Owner</label>
                <p className="mt-1 text-sm text-gray-900">{item.owner || 'Not set'}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                {item.description && !item.description.includes('Document: data:') ? item.description : 'No description'}
              </p>
            </div>
          </div>
        );

      case 'blueprint':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <p className="mt-1 text-sm text-gray-900">{item.title || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  item.status === 'completed' ? 'bg-green-100 text-green-800' :
                  item.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  item.status === 'blocked' ? 'bg-red-100 text-red-800' :
                  item.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {item.status || 'Not set'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Version</label>
                <p className="mt-1 text-sm text-gray-900">{item.version || '1.0'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Created By</label>
                <p className="mt-1 text-sm text-gray-900">{item.createdBy || 'Not set'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                <p className="mt-1 text-sm text-gray-900">{item.updatedAt || 'Not set'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <p className="mt-1 text-sm text-gray-900">{item.category || 'Not set'}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                {item.description && !item.description.includes('Document: data:') ? item.description : 'No description'}
              </p>
            </div>
          </div>
        );

      case 'target':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Title</label>
                <p className="mt-1 text-sm text-gray-900">{item.title || 'N/A'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  item.status === 'completed' ? 'bg-green-100 text-green-800' :
                  item.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                  item.status === 'blocked' ? 'bg-red-100 text-red-800' :
                  item.status === 'cancelled' ? 'bg-gray-100 text-gray-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {item.status || 'Not set'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Target Date</label>
                <p className="mt-1 text-sm text-gray-900">{item.targetDate || 'Not set'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Progress</label>
                <p className="mt-1 text-sm text-gray-900">{item.progress || '0'}%</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Priority</label>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  item.priority === 'high' ? 'bg-red-100 text-red-800' :
                  item.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {item.priority || 'Not set'}
                </span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Assigned To</label>
                <p className="mt-1 text-sm text-gray-900">{item.assignedTo || 'Not set'}</p>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <p className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                {item.description && !item.description.includes('Document: data:') ? item.description : 'No description'}
              </p>
            </div>
          </div>
        );

      default:
        return <div>Unknown item type</div>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {itemType.charAt(0).toUpperCase() + itemType.slice(1)} Details
          </h2>
          <div className="flex space-x-2">
            {onEdit && (
              <button
                onClick={onEdit}
                className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
              >
                Edit
              </button>
            )}
            {onDelete && (
              <button
                onClick={onDelete}
                className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100"
              >
                Delete
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 rounded-md hover:bg-gray-100"
            >
              Close
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* Item Details */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h3>
              {renderItemDetails()}
            </div>

            {/* Attached Documents */}
            {((item.attachedFiles && item.attachedFiles.length > 0) || (item.attachments && item.attachments.length > 0)) && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Attached Documents</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {(item.attachedFiles || item.attachments || []).map((file: any, index: number) => {
                    // Normalize file data to FileInfo format
                    const fileInfo: FileInfo = {
                      id: file.id || `file_${index}`,
                      name: file.name || 'Unknown File',
                      url: file.url || '',
                      size: file.size_bytes || file.size || 0,
                      type: file.mime_type || file.type || 'application/octet-stream',
                      uploadedAt: file.uploadedAt || new Date().toISOString(),
                      path: file.path || '',
                      base64Data: file.base64Data
                    };
                    return (
                    <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-gray-900 truncate" title={fileInfo.name}>
                          {fileInfo.name}
                        </h4>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => window.open(fileInfo.url, '_blank')}
                            className="p-1 text-blue-600 hover:text-blue-800"
                            title="View"
                          >
                            👁️
                          </button>
                          <button
                            onClick={() => handleDownloadFile(fileInfo)}
                            className="p-1 text-green-600 hover:text-green-800"
                            title="Download"
                          >
                            📥
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500">
                        <p>Size: {(fileInfo.size / 1024).toFixed(1)} KB</p>
                        <p>Type: {fileInfo.type}</p>
                        <p>Uploaded: {new Date(fileInfo.uploadedAt).toLocaleDateString()}</p>
                      </div>
                      
                      {/* Document Preview */}
                      <div className="mt-3">
                        <div className="border rounded p-2 bg-white">
                          {fileInfo.type.startsWith('image/') ? (
                            <img
                              src={fileInfo.url}
                              alt={fileInfo.name}
                              className="max-w-full h-32 object-contain mx-auto"
                              onClick={() => window.open(fileInfo.url, '_blank')}
                            />
                          ) : fileInfo.type === 'application/pdf' ? (
                            <div className="text-center">
                              <div className="text-4xl mb-2">📄</div>
                              <p className="text-sm text-gray-600">PDF Document</p>
                              <button
                                onClick={() => window.open(fileInfo.url, '_blank')}
                                className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                              >
                                View PDF
                              </button>
                            </div>
                          ) : (
                            <div className="text-center">
                              <div className="text-4xl mb-2">📄</div>
                              <p className="text-sm text-gray-600">{fileInfo.type}</p>
                              <button
                                onClick={() => window.open(fileInfo.url, '_blank')}
                                className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                              >
                                View Document
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Metadata */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Metadata</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Created At</label>
                  <p className="mt-1 text-gray-900">{item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Not available'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Updated At</label>
                  <p className="mt-1 text-gray-900">{item.updatedAt ? new Date(item.updatedAt).toLocaleString() : 'Not available'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">ID</label>
                  <p className="mt-1 text-gray-900 font-mono text-xs">{item.id || 'Not available'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Folder ID</label>
                  <p className="mt-1 text-gray-900 font-mono text-xs">{item.folderId || 'Not available'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ItemDetailView;
