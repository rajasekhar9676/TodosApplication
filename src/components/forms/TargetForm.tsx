import React, { useState } from 'react';
import { companyTargetsService, OrgTarget, TargetStatus } from '../../services/companyTargetsService';

interface Props {
  folderId: string;
  fileId: string;
  onSaved?: () => void;
  onToast?: (m: string) => void;
}

const statuses: TargetStatus[] = ['on_track','at_risk','delayed','achieved','cancelled'];
const units = ['₹','$','Crores','Millions','Units','%'];
const departments = ['Sales','Marketing','Finance','Operations','All'];
const categories = ['Revenue','Sales','Profit','Customers','Projects'];
const owners = ['MD','Admin','Sales Head','Operations Head','Finance Head'];

const TargetForm: React.FC<Props> = ({ folderId, fileId, onSaved, onToast }) => {
  const [form, setForm] = useState<OrgTarget>({
    folderId,
    fileId,
    title: '',
    targetType: '',
    targetValue: undefined,
    targetUnit: '',
    startDate: '',
    endDate: '',
    department: '',
    owner: '',
    progress: undefined,
    status: 'on_track',
    notes: ''
  });

  const update = (k: keyof OrgTarget, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const save = async () => {
    if (!form.title || !form.targetType) { onToast && onToast('Title and Target Type are required'); return; }
    await companyTargetsService.createTarget({ ...form });
    onToast && onToast('Target created successfully');
    onSaved && onSaved();
    setForm({ ...form, title: '', targetType: '', targetValue: undefined, progress: undefined, notes: '' });
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input className="px-3 py-2 border rounded-lg" placeholder="Target Name / Title" value={form.title} onChange={e=>update('title', e.target.value)} />
        <select className="px-3 py-2 border rounded-lg" value={form.targetType} onChange={e=>update('targetType', e.target.value)}>
          <option value="">Target Type / Category</option>
          {categories.map(c=> <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="flex gap-2">
          <input className="px-3 py-2 border rounded-lg flex-1" type="number" placeholder="Target Value" value={form.targetValue ?? ''} onChange={e=>update('targetValue', e.target.value ? Number(e.target.value) : undefined)} />
          <select className="px-3 py-2 border rounded-lg" value={form.targetUnit || ''} onChange={e=>update('targetUnit', e.target.value)}>
            <option value="">Unit</option>
            {units.map(u=> <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
        <input className="px-3 py-2 border rounded-lg" placeholder="Start Date (YYYY-MM-DD)" value={form.startDate || ''} onChange={e=>update('startDate', e.target.value)} />
        <input className="px-3 py-2 border rounded-lg" placeholder="End Date (YYYY-MM-DD)" value={form.endDate || ''} onChange={e=>update('endDate', e.target.value)} />
        <select className="px-3 py-2 border rounded-lg" value={form.department || ''} onChange={e=>update('department', e.target.value)}>
          <option value="">Assigned Department / Team</option>
          {departments.map(d=> <option key={d} value={d}>{d}</option>)}
        </select>
        <select className="px-3 py-2 border rounded-lg" value={form.owner || ''} onChange={e=>update('owner', e.target.value)}>
          <option value="">Responsible Person / Owner</option>
          {owners.map(o=> <option key={o} value={o}>{o}</option>)}
        </select>
        <input className="px-3 py-2 border rounded-lg" type="number" placeholder="Current Progress (%)" value={form.progress ?? ''} onChange={e=>update('progress', e.target.value ? Number(e.target.value) : undefined)} />
        <select className="px-3 py-2 border rounded-lg" value={form.status || 'on_track'} onChange={e=>update('status', e.target.value as TargetStatus)}>
          {statuses.map(s=> <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
      </div>
      <textarea className="w-full px-3 py-2 border rounded-lg" placeholder="Notes / Remarks" value={form.notes || ''} onChange={e=>update('notes', e.target.value)} />
      <div className="flex items-center justify-end">
        <button className="px-3 py-2 bg-blue-600 text-white rounded-lg" onClick={save}>Save Target</button>
      </div>
    </div>
  );
};

export default TargetForm;


