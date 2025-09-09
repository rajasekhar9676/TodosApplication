import React, { useEffect, useState } from 'react';
import { Plan, PlanStatus } from '../../models/orgModels';
import { validatePlan } from '../../models/orgMappers';
import { companyOrgEntitiesService } from '../../services/companyOrgEntitiesService';
import { storageService } from '../../services/storageService';

interface Props {
  folderId: string;
  fileId: string;
  createMode?: boolean;
  onSaved?: () => void;
  onToast?: (msg: string) => void;
}

const statuses: PlanStatus[] = ['draft','active','on_hold','completed','cancelled'];

const PlanForm: React.FC<Props> = ({ folderId, fileId, createMode = false, onSaved, onToast }) => {
  const [docId, setDocId] = useState<string>('');
  const [form, setForm] = useState<Plan>({
    plan_id: '',
    name: '',
    description: '',
    owner: '',
    start_date: '',
    end_date: '',
    status: 'draft',
    tasks: [],
    progress: 0,
    notes: ''
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (createMode) {
      // start empty for create flow
      setDocId('');
      setForm({ plan_id: '', name: '', description: '', owner: '', start_date: '', end_date: '', status: 'draft', tasks: [], progress: 0, notes: '' });
      return;
    }
    (async () => {
      const found = await companyOrgEntitiesService.getPlanDocByFile(fileId);
      if (found) {
        setDocId(found.docId);
        setForm(found.plan);
      } else {
        setDocId('');
      }
    })();
  }, [fileId, createMode]);

  const update = (k: keyof Plan, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    try {
      const withId = { ...form, plan_id: form.plan_id || `p_${Date.now()}` } as Plan;
      validatePlan(withId);
      if (!docId) {
        const id = await companyOrgEntitiesService.createPlan(folderId, fileId, withId);
        setDocId(id);
      } else {
        await companyOrgEntitiesService.updatePlan(docId, withId);
      }
      onToast && onToast('Plan created successfully');
      onSaved && onSaved();
    } catch (e) {
      onToast && onToast('Failed to save plan');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    try {
      setUploading(true);
      const file = e.target.files[0];
      const info = await storageService.uploadFile(file, `org/plans/${fileId}`);
      setForm(prev => ({ ...prev, notes: `${prev.notes || ''}\nDocument: ${info.url}`.trim() }));
      onToast && onToast('Document uploaded');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input className="px-3 py-2 border rounded-lg" placeholder="Plan ID (auto if blank)" value={form.plan_id} onChange={e => update('plan_id', e.target.value)} />
        <input className="px-3 py-2 border rounded-lg" placeholder="Name" value={form.name} onChange={e => update('name', e.target.value)} />
        <input className="px-3 py-2 border rounded-lg" placeholder="Owner" value={form.owner} onChange={e => update('owner', e.target.value)} />
        <input className="px-3 py-2 border rounded-lg" placeholder="Start Date (YYYY-MM-DD)" value={form.start_date || ''} onChange={e => update('start_date', e.target.value)} />
        <input className="px-3 py-2 border rounded-lg" placeholder="End Date (YYYY-MM-DD)" value={form.end_date || ''} onChange={e => update('end_date', e.target.value)} />
        <select className="px-3 py-2 border rounded-lg" value={form.status} onChange={e => update('status', e.target.value as PlanStatus)}>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <textarea className="w-full px-3 py-2 border rounded-lg" placeholder="Description" value={form.description || ''} onChange={e => update('description', e.target.value)} />
      <input className="w-full px-3 py-2 border rounded-lg" placeholder="Tasks (comma separated task_ids)" value={(form.tasks || []).join(', ')} onChange={e => update('tasks', e.target.value.split(',').map(s=>s.trim()).filter(Boolean))} />
      <input className="w-full px-3 py-2 border rounded-lg" type="number" placeholder="Progress (0-100)" value={form.progress ?? 0} onChange={e => update('progress', Number(e.target.value))} />
      <textarea className="w-full px-3 py-2 border rounded-lg" placeholder="Notes" value={form.notes || ''} onChange={e => update('notes', e.target.value)} />
      <div className="flex items-center justify-between">
        <label className="px-3 py-2 border rounded-lg cursor-pointer">
          {uploading ? 'Uploading...' : 'Upload Document'}
          <input type="file" className="hidden" onChange={handleUpload} />
        </label>
        <button className="px-3 py-2 bg-blue-600 text-white rounded-lg" onClick={handleSave}>Save Plan</button>
      </div>
    </div>
  );
};

export default PlanForm;
