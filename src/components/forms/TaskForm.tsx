import React, { useState } from 'react';
import { Task, TaskPriority, TaskStatus } from '../../models/orgModels';
import { validateTask } from '../../models/orgMappers';
import { companyOrgService } from '../../services/companyOrgService';
import { storageService } from '../../services/storageService';

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

  const update = (k: keyof Task, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      setUploading(true);
      const file = e.target.files[0];
      const info = await storageService.uploadFile(file, `org/${folderId}/${fileId}/attachments`);
      setForm(prev => ({
        ...prev,
        attachments: [
          ...(prev.attachments || []),
          { id: `${Date.now()}`, name: info.name, url: info.url }
        ]
      }));
    } catch (err) {
      onError && onError('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
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
        attachments: (toValidate.attachments as any) || [],
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
      <div className="flex items-center justify-between">
        <label className="px-3 py-2 border rounded-lg cursor-pointer">
          {uploading ? 'Uploading...' : 'Upload Attachment'}
          <input type="file" className="hidden" onChange={handleUpload} />
        </label>
        <button className="px-3 py-2 border rounded-lg" onClick={onDownload}>Download</button>
      </div>
      <div className="space-y-1">
        {(form.attachments || []).map(att => (
          <a key={att.id} className="block text-sm text-blue-600" href={att.url} target="_blank" rel="noreferrer">📎 {att.name}</a>
        ))}
      </div>
      <div className="flex items-center justify-end">
        <button className="px-3 py-2 bg-blue-600 text-white rounded-lg" onClick={handleSubmit}>Create Task</button>
      </div>
    </div>
  );
};

export default TaskForm;
