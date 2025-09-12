import React, { useState } from 'react';
import { companyTargetsService, OrgTarget, TargetStatus } from '../../services/companyTargetsService';
import { fileStorageService, FileInfo } from '../../services/fileStorageService';
import BulkUpload from '../BulkUpload';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

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
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<FileInfo[]>([]);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  const update = (k: keyof OrgTarget, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date);
    update('startDate', date ? date.toISOString().split('T')[0] : '');
  };

  const handleEndDateChange = (date: Date | null) => {
    setEndDate(date);
    update('endDate', date ? date.toISOString().split('T')[0] : '');
  };

  const handleSingleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    
    try {
      setUploading(true);
      console.log('📁 Starting file upload...');
      
      const fileInfo = await fileStorageService.uploadFile(
        file,
        `org/targets/${fileId}/attachments`,
        (progress) => {
          console.log(`Upload progress: ${progress.percentage}%`);
        }
      );
      
      setAttachedFiles(prev => [...prev, fileInfo]);
      onToast && onToast('Document uploaded successfully');
      console.log('✅ File uploaded successfully');
      setUploading(false);
      e.target.value = '';
    } catch (error) {
      console.error('❌ Upload error:', error);
      onToast && onToast('Upload failed');
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleBulkUpload = (files: FileInfo[]) => {
    setAttachedFiles(prev => [...prev, ...files]);
    setShowBulkUpload(false);
  };

  const save = async () => {
    if (!form.title || !form.targetType) { onToast && onToast('Title and Target Type are required'); return; }
    setSaving(true);
    try {
      const targetWithAttachments = {
        ...form,
        attachments: attachedFiles.map(file => ({
          id: file.id,
          name: file.name,
          url: file.url,
          mime_type: file.type,
          size_bytes: file.size
        }))
      };
      await companyTargetsService.createTarget(targetWithAttachments);
      onToast && onToast('Target created successfully');
      onSaved && onSaved();
      setForm({ ...form, title: '', targetType: '', targetValue: undefined, progress: undefined, notes: '' });
      setAttachedFiles([]);
    } finally {
      setSaving(false);
    }
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
        <DatePicker
          selected={startDate}
          onChange={handleStartDateChange}
          dateFormat="yyyy-MM-dd"
          placeholderText="Start Date"
          className="px-3 py-2 border rounded-lg w-full"
          showYearDropdown
          showMonthDropdown
          dropdownMode="select"
        />
        <DatePicker
          selected={endDate}
          onChange={handleEndDateChange}
          dateFormat="yyyy-MM-dd"
          placeholderText="End Date"
          className="px-3 py-2 border rounded-lg w-full"
          showYearDropdown
          showMonthDropdown
          dropdownMode="select"
          minDate={startDate || undefined}
        />
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
      
      {/* File Upload Section */}
      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <label className="px-3 py-2 border rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100">
            {uploading ? 'Uploading...' : 'Single Upload'}
            <input type="file" className="hidden" onChange={handleSingleUpload} />
          </label>
          <button 
            onClick={() => setShowBulkUpload(true)}
            className="px-3 py-2 border rounded-lg bg-green-50 hover:bg-green-100"
          >
            Bulk Upload
          </button>
        </div>
        
        {/* Attached Files Display */}
        {attachedFiles.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Attached Files:</h4>
            <div className="space-y-1">
              {attachedFiles.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm text-gray-600">{file.name}</span>
                  <div className="flex space-x-1">
                    <button
                      onClick={() => window.open(file.url, '_blank')}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      View
                    </button>
                    <button
                      onClick={() => setAttachedFiles(prev => prev.filter((_, i) => i !== index))}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-end">
        <button 
          className={`px-3 py-2 rounded-lg text-white ${saving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`} 
          onClick={save} 
          disabled={saving}
        >
          {saving ? 'Saving...' : 'Save Target'}
        </button>
      </div>
      
      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <BulkUpload
          onFilesUploaded={handleBulkUpload}
          pathPrefix={`org/targets/${fileId}/attachments`}
        />
      )}
    </div>
  );
};

export default TargetForm;




