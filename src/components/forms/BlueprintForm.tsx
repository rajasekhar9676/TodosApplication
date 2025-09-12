import React, { useEffect, useState } from 'react';
import { Blueprint } from '../../models/orgModels';
import { validateBlueprint } from '../../models/orgMappers';
import { companyOrgEntitiesService } from '../../services/companyOrgEntitiesService';
import { fileStorageService, FileInfo } from '../../services/fileStorageService';
import DocumentViewer from '../DocumentViewer';
import BulkUpload from '../BulkUpload';

interface Props {
  fileId: string;
  folderId?: string;
  createMode?: boolean;
  onSaved?: () => void;
  onToast?: (msg: string) => void;
}

const BlueprintForm: React.FC<Props> = ({ fileId, folderId, createMode = false, onSaved, onToast }) => {
  const [docId, setDocId] = useState<string>('');
  const [form, setForm] = useState<Blueprint>({
    blueprint_id: '',
    name: '',
    category: '',
    description: '',
    default_tasks: [],
    created_by: '',
    created_date: new Date().toISOString(),
    last_updated: new Date().toISOString(),
    version: '1.0.0'
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<{url: string, name: string} | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<FileInfo[]>([]);
  const [showBulkUpload, setShowBulkUpload] = useState(false);

  useEffect(() => {
    if (createMode) {
      // start with empty form for creation
      setDocId('');
      setForm({
        blueprint_id: '', name: '', category: '', description: '', default_tasks: [], created_by: '',
        created_date: new Date().toISOString(), last_updated: new Date().toISOString(), version: '1.0.0'
      });
      return;
    }
    (async () => {
      const found = await companyOrgEntitiesService.getBlueprintDocByFile(fileId);
      if (found) {
        setDocId(found.docId);
        setForm(found.blueprint);
      } else {
        setDocId('');
      }
    })();
  }, [fileId, createMode]);

  const update = (k: keyof Blueprint, v: any) => setForm(prev => ({ ...prev, [k]: v }));

  const addDefaultTask = () => {
    setForm(prev => ({
      ...prev,
      default_tasks: [...prev.default_tasks, { title: '', description: '', priority: 'medium', dependencies: [] } as any]
    }));
  };

  const updateDefaultTask = (idx: number, key: string, value: any) => {
    setForm(prev => {
      const copy = [...prev.default_tasks];
      const item: any = { ...copy[idx], [key]: value };
      copy[idx] = item;
      return { ...prev, default_tasks: copy };
    });
  };

  const handleSingleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    
    try {
      setUploading(true);
      console.log('📁 Starting file upload...');
      
      const fileInfo = await fileStorageService.uploadFile(
        file,
        `org/blueprints/${fileId}/attachments`,
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

  const resolveFolderId = async (): Promise<string> => {
    if (folderId) return folderId;
    try {
      const org = (await import('../../services/companyOrgService')).companyOrgService;
      const allFolders = await org.listFolders();
      for (const f of allFolders) {
        const files = await org.listFilesByFolder(f.id!);
        if (files.find(fl => fl.id === fileId)) return f.id!;
      }
    } catch {}
    return '';
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const withId = { 
        ...form, 
        blueprint_id: form.blueprint_id || `bp_${Date.now()}`,
        attachments: attachedFiles.map(file => ({
          id: file.id,
          name: file.name,
          url: file.url,
          mime_type: file.type,
          size_bytes: file.size
        }))
      } as Blueprint;
      validateBlueprint(withId);
      if (!docId) {
        const fld = await resolveFolderId();
        const id = await companyOrgEntitiesService.createBlueprint(fld, fileId, withId);
        setDocId(id);
      } else {
        await companyOrgEntitiesService.updateBlueprint(docId, withId);
      }
      onToast && onToast('Blueprint created successfully');
      onSaved && onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input className="px-3 py-2 border rounded-lg" placeholder="Blueprint ID (auto if blank)" value={form.blueprint_id} onChange={e => update('blueprint_id', e.target.value)} />
        <input className="px-3 py-2 border rounded-lg" placeholder="Name" value={form.name} onChange={e => update('name', e.target.value)} />
        <input className="px-3 py-2 border rounded-lg" placeholder="Category" value={form.category || ''} onChange={e => update('category', e.target.value)} />
        <input className="px-3 py-2 border rounded-lg" placeholder="Created By" value={form.created_by} onChange={e => update('created_by', e.target.value)} />
        <input className="px-3 py-2 border rounded-lg" placeholder="Version" value={form.version} onChange={e => update('version', e.target.value)} />
      </div>
      <textarea className="w-full px-3 py-2 border rounded-lg" placeholder="Description" value={form.description || ''} onChange={e => update('description', e.target.value)} />

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="font-semibold">Default Tasks</div>
          <button className="px-3 py-2 border rounded-lg" onClick={addDefaultTask}>+ Add Task</button>
        </div>
        {form.default_tasks.map((t, idx) => (
          <div key={idx} className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input className="px-3 py-2 border rounded-lg" placeholder="Title" value={(t as any).title || ''} onChange={e => updateDefaultTask(idx, 'title', e.target.value)} />
            <input className="px-3 py-2 border rounded-lg" placeholder="Priority (low/medium/high/urgent)" value={(t as any).priority || ''} onChange={e => updateDefaultTask(idx, 'priority', e.target.value)} />
            <input className="px-3 py-2 border rounded-lg" placeholder="Dependencies (comma IDs)" onChange={e => updateDefaultTask(idx, 'dependencies', e.target.value.split(',').map((s:string)=>s.trim()).filter(Boolean))} />
            <input className="px-3 py-2 border rounded-lg" placeholder="Relative Due Days" type="number" onChange={e => updateDefaultTask(idx, 'relative_due_days', Number(e.target.value))} />
          </div>
        ))}
      </div>

      {/* Show uploaded documents */}
      {form.description && form.description.includes('Document: data:') && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-700">Uploaded Documents:</h4>
          {form.description.split('\n').filter(line => line.startsWith('Document: data:')).map((docLine, index) => {
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
        <button className={`px-3 py-2 rounded-lg text-white ${saving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save Blueprint'}
        </button>
      </div>
      
      {/* Bulk Upload Modal */}
      {showBulkUpload && (
        <BulkUpload
          onFilesUploaded={handleBulkUpload}
          pathPrefix={`org/blueprints/${fileId}/attachments`}
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

export default BlueprintForm;
