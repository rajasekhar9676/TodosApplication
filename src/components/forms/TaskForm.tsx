import React, { useState } from 'react';
import { Task, TaskPriority, TaskStatus } from '../../models/orgModels';
import { validateTask } from '../../models/orgMappers';
import { companyOrgService } from '../../services/companyOrgService';
import { fileStorageService, FileInfo } from '../../services/fileStorageService';
import DocumentViewer from '../DocumentViewer';
import BulkUpload from '../BulkUpload';

interface Props {
  folderId: string;
  fileId: string;
  onCreated?: (taskId: string) => void;
  onError?: (message: string) => void;
  onDownload?: () => void;
}

const statuses: TaskStatus[] = ['todo','in_progress','blocked','completed','cancelled'];
const priorities: TaskPriority[] = ['low','medium','high','urgent'];

const TaskForm: React.FC<Props> = ({ folderId, fileId, onCreated, onError, onDownload }) => {
  const [form, setForm] = useState<Task>({
    task_id: '',
    title: '',
    description: '',
    assigned_to: '',
    status: 'todo',
    priority: 'medium',
    due_date: '',
    start_date: '',
    completion_date: '',
    attachments: [],
    comments: [],
    dependencies: []
  });
  const [depsText, setDepsText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<{url: string, name: string} | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<FileInfo[]>([]);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  const update = (k: keyof Task, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSingleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    
    try {
      setUploading(true);
      console.log('📁 Starting file upload...');
      
      const fileInfo = await fileStorageService.uploadFile(
        file, 
        `org/${folderId}/${fileId}/attachments`,
        (progress) => {
          console.log(`Upload progress: ${progress.percentage}%`);
        }
      );
      
      setAttachedFiles(prev => [...prev, fileInfo]);
      console.log('✅ File uploaded successfully:', fileInfo.url);
      
    } catch (err) {
      console.error('❌ Upload error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      onError && onError(errorMessage);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleBulkUpload = (files: FileInfo[]) => {
    setAttachedFiles(prev => [...prev, ...files]);
    setShowBulkUpload(false);
  };

  const handleSubmit = async () => {
    try {
      const id = form.task_id || `t_${Date.now()}`;
      const dependencies = depsText ? depsText.split(',').map(s=>s.trim()).filter(Boolean) : [];
      const toValidate = { ...form, task_id: id, dependencies } as Task;
      validateTask(toValidate);
      await companyOrgService.createTask({
        folderId,
        fileId,
        title: toValidate.title,
        description: toValidate.description || '',
        assignedTo: toValidate.assigned_to,
        category: 'project',
        status: toValidate.status as any,
        priority: (toValidate.priority === 'urgent' ? 'high' : toValidate.priority) as any,
        dueDate: toValidate.due_date || undefined,
        startDate: toValidate.start_date || undefined,
        completionDate: toValidate.completion_date || undefined,
        attachments: [
          ...(toValidate.attachments as any) || [],
          ...attachedFiles.map(file => ({
            id: file.id,
            name: file.name,
            url: file.url,
            mime_type: file.type,
            size_bytes: file.size
          }))
        ],
        dependencies,
        notes: toValidate.description || ''
      });
      onCreated && onCreated(id);
      setForm({
        task_id: '', title: '', description: '', assigned_to: '', status: 'todo', priority: 'medium',
        due_date: '', start_date: '', completion_date: '', attachments: [], comments: [], dependencies: []
      });
      setDepsText('');
    } catch (e: any) {
      onError && onError(e?.message || 'Failed to create task');
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input className="px-3 py-2 border rounded-lg" placeholder="Task ID (auto if blank)" value={form.task_id} onChange={e => update('task_id', e.target.value)} />
        <input className="px-3 py-2 border rounded-lg" placeholder="Title" value={form.title} onChange={e => update('title', e.target.value)} />
        <input className="px-3 py-2 border rounded-lg" placeholder="Assigned To" value={form.assigned_to || ''} onChange={e => update('assigned_to', e.target.value)} />
        <select className="px-3 py-2 border rounded-lg" value={form.status} onChange={e => update('status', e.target.value as TaskStatus)}>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="px-3 py-2 border rounded-lg" value={form.priority} onChange={e => update('priority', e.target.value as TaskPriority)}>
          {priorities.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <input className="px-3 py-2 border rounded-lg" placeholder="Due Date (YYYY-MM-DD)" value={form.due_date || ''} onChange={e => update('due_date', e.target.value)} />
        <input className="px-3 py-2 border rounded-lg" placeholder="Start Date (YYYY-MM-DD)" value={form.start_date || ''} onChange={e => update('start_date', e.target.value)} />
        <input className="px-3 py-2 border rounded-lg" placeholder="Completion Date (YYYY-MM-DD)" value={form.completion_date || ''} onChange={e => update('completion_date', e.target.value)} />
      </div>
      <textarea className="w-full px-3 py-2 border rounded-lg" placeholder="Description" value={form.description || ''} onChange={e => update('description', e.target.value)} />
      <input className="w-full px-3 py-2 border rounded-lg" placeholder="Dependencies (comma separated task_ids)" value={depsText} onChange={e => setDepsText(e.target.value)} />
      <div className="space-y-4">
        {/* Upload Options */}
        <div className="flex items-center justify-between">
          <div className="flex space-x-2">
            <label className="px-3 py-2 border rounded-lg cursor-pointer">
              {uploading ? 'Uploading...' : 'Single Upload'}
              <input type="file" className="hidden" onChange={handleSingleUpload} />
            </label>
            <button
              onClick={() => setShowBulkUpload(!showBulkUpload)}
              className="px-3 py-2 border rounded-lg hover:bg-gray-50"
            >
              {showBulkUpload ? 'Hide Bulk Upload' : 'Bulk Upload'}
            </button>
          </div>
          <button className="px-3 py-2 border rounded-lg" onClick={onDownload}>Download All</button>
        </div>

        {/* Bulk Upload Component */}
        {showBulkUpload && (
          <BulkUpload
            pathPrefix={`org/${folderId}/${fileId}/attachments`}
            onFilesUploaded={handleBulkUpload}
            onError={onError}
            maxFiles={20}
            maxFileSize={100}
          />
        )}

        {/* Attached Files */}
        <div className="space-y-2">
          <h4 className="font-medium text-gray-700">Attached Files ({attachedFiles.length})</h4>
          {attachedFiles.map(file => (
            <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="text-2xl">
                  {file.type.startsWith('image/') ? '🖼️' : 
                   file.type === 'application/pdf' ? '📄' :
                   file.type.startsWith('text/') ? '📝' : '📎'}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">{file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB • {new Date(file.uploadedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setViewingDocument({url: file.url, name: file.name})}
                  className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                >
                  View
                </button>
                <a
                  href={file.url}
                  download={file.name}
                  className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                >
                  Download
                </a>
                <button
                  onClick={async () => {
                    try {
                      await fileStorageService.deleteFile(file);
                      setAttachedFiles(prev => prev.filter(f => f.id !== file.id));
                    } catch (error) {
                      onError && onError('Failed to delete file');
                    }
                  }}
                  className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-end">
        <button className="px-3 py-2 bg-blue-600 text-white rounded-lg" onClick={handleSubmit}>Create Task</button>
      </div>
      
      {/* Document Viewer Modal */}
      {viewingDocument && (
        <DocumentViewer
          documentUrl={viewingDocument.url}
          fileName={viewingDocument.name}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </div>
  );
};

export default TaskForm;
