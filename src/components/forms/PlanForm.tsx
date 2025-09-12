import React, { useEffect, useState } from 'react';
import { Plan, PlanStatus } from '../../models/orgModels';
import { validatePlan } from '../../models/orgMappers';
import { companyOrgEntitiesService } from '../../services/companyOrgEntitiesService';
import { fileStorageService, FileInfo } from '../../services/fileStorageService';
import DocumentViewer from '../DocumentViewer';
import BulkUpload from '../BulkUpload';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

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
  const [viewingDocument, setViewingDocument] = useState<{url: string, name: string} | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<FileInfo[]>([]);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  useEffect(() => {
    if (createMode) {
      // start empty for create flow
      setDocId('');
      setForm({ plan_id: '', name: '', description: '', owner: '', start_date: '', end_date: '', status: 'draft', tasks: [], progress: 0, notes: '' });
      setStartDate(null);
      setEndDate(null);
      return;
    }
    (async () => {
      const found = await companyOrgEntitiesService.getPlanDocByFile(fileId);
      if (found) {
        setDocId(found.docId);
        setForm(found.plan);
        // Initialize date pickers with existing dates
        setStartDate(found.plan.start_date ? new Date(found.plan.start_date) : null);
        setEndDate(found.plan.end_date ? new Date(found.plan.end_date) : null);
      } else {
        setDocId('');
      }
    })();
  }, [fileId, createMode]);

  const update = (k: keyof Plan, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const handleStartDateChange = (date: Date | null) => {
    setStartDate(date);
    update('start_date', date ? date.toISOString().split('T')[0] : '');
  };

  const handleEndDateChange = (date: Date | null) => {
    setEndDate(date);
    update('end_date', date ? date.toISOString().split('T')[0] : '');
  };

  const handleSave = async () => {
    try {
      const withId = { 
        ...form, 
        plan_id: form.plan_id || `p_${Date.now()}`,
        attachments: attachedFiles.map(file => ({
          id: file.id,
          name: file.name,
          url: file.url,
          mime_type: file.type,
          size_bytes: file.size
        }))
      } as Plan;
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

  const handleSingleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    
    try {
      setUploading(true);
      console.log('📁 Starting file upload...');
      
      const fileInfo = await fileStorageService.uploadFile(
        file,
        `org/plans/${fileId}/attachments`,
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

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input className="px-3 py-2 border rounded-lg" placeholder="Plan ID (auto if blank)" value={form.plan_id} onChange={e => update('plan_id', e.target.value)} />
        <input className="px-3 py-2 border rounded-lg" placeholder="Name" value={form.name} onChange={e => update('name', e.target.value)} />
        <input className="px-3 py-2 border rounded-lg" placeholder="Owner" value={form.owner} onChange={e => update('owner', e.target.value)} />
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
        <select className="px-3 py-2 border rounded-lg" value={form.status} onChange={e => update('status', e.target.value as PlanStatus)}>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <textarea className="w-full px-3 py-2 border rounded-lg" placeholder="Description" value={form.description || ''} onChange={e => update('description', e.target.value)} />
      <input className="w-full px-3 py-2 border rounded-lg" placeholder="Tasks (comma separated task_ids)" value={(form.tasks || []).join(', ')} onChange={e => update('tasks', e.target.value.split(',').map(s=>s.trim()).filter(Boolean))} />
      <input className="w-full px-3 py-2 border rounded-lg" type="number" placeholder="Progress (0-100)" value={form.progress ?? 0} onChange={e => update('progress', Number(e.target.value))} />
      <textarea className="w-full px-3 py-2 border rounded-lg" placeholder="Notes" value={form.notes || ''} onChange={e => update('notes', e.target.value)} />
      
      {/* Show uploaded documents */}
      {form.notes && form.notes.includes('Document: data:') && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Uploaded Documents:</h4>
          {form.notes.split('\n').filter(line => line.startsWith('Document: data:')).map((docLine, index) => {
            const url = docLine.replace('Document: ', '');
            const fileName = `Document ${index + 1}`;
            return (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <span className="text-sm text-gray-700">📄 {fileName}</span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setViewingDocument({url, name: fileName})}
                    className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    View
                  </button>
                  <a
                    href={url}
                    download={fileName}
                    className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                  >
                    Download
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
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
        <button className="px-3 py-2 bg-blue-600 text-white rounded-lg" onClick={handleSave}>Save Plan</button>
      </div>
      
      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <BulkUpload
          onFilesUploaded={handleBulkUpload}
          pathPrefix={`org/plans/${fileId}/attachments`}
        />
      )}
      
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

export default PlanForm;
