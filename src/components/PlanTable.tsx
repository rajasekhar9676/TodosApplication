import React, { useEffect, useState } from 'react';
import { companyOrgEntitiesService } from '../services/companyOrgEntitiesService';
import { companyOrgService } from '../services/companyOrgService';
import { fileStorageService } from '../services/fileStorageService';
import { Plan } from '../models/orgModels';
import ItemDetailView from './ItemDetailView';

interface Props {
  folderId: string;
  refreshToken?: number;
}

const PlanTable: React.FC<Props> = ({ folderId, refreshToken = 0 }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const union: Plan[] = [];
        const files = await companyOrgService.listFilesByFolder(folderId);
        const planFiles = files.filter((f: any) => f.kind === 'plans');
        for (const f of planFiles) {
          const list = await companyOrgEntitiesService.listPlansByFile(f.id!);
          list.forEach(x => union.push(x.plan));
        }
        const byFolder = await companyOrgEntitiesService.listPlansByFolder(folderId);
        byFolder.forEach(x => union.push(x.plan));
        // Dedupe by plan_id
        const map = new Map<string, Plan>();
        for (const p of union) {
          if (p && p.plan_id) map.set(p.plan_id, p);
        }
        setPlans(Array.from(map.values()));
      } finally {
        setLoading(false);
      }
    })();
  }, [folderId, refreshToken]);

  const download = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  const handleViewDetails = async (plan: Plan) => {
    const planWithAttachments = await loadAttachmentsData(plan);
    setSelectedPlan(planWithAttachments);
    setShowDetailView(true);
  };

  const handleCloseDetailView = () => {
    setShowDetailView(false);
    setSelectedPlan(null);
  };

  // Function to load actual file data for attachments
  const loadAttachmentsData = async (plan: Plan): Promise<Plan> => {
    if (!plan.attachments || plan.attachments.length === 0) {
      return plan;
    }

    console.log('🔍 Loading attachments for plan:', plan.name);
    console.log('📎 Attachments found:', plan.attachments);

    try {
      const loadedAttachments = await Promise.all(
        plan.attachments.map(async (attachment) => {
          console.log('📄 Processing attachment:', attachment.name, 'URL:', attachment.url);
          
          // Skip placeholder URLs
          if (attachment.url && attachment.url.includes('via.placeholder.com')) {
            console.log('⚠️ Skipping placeholder URL:', attachment.url);
            return null; // Filter out placeholder attachments
          }
          
          try {
            // Try to get the file from fileStorage
            const fileInfo = await fileStorageService.getFileUrl({
              id: attachment.id,
              name: attachment.name,
              url: attachment.url,
              size: attachment.size_bytes || 0,
              type: attachment.mime_type || 'application/octet-stream',
              uploadedAt: new Date().toISOString(),
              path: '',
              base64Data: ''
            });
            
            console.log('✅ Loaded file URL:', fileInfo);
            return {
              ...attachment,
              url: fileInfo
            };
          } catch (error) {
            console.warn(`Failed to load attachment ${attachment.name}:`, error);
            return attachment; // Return original if loading fails
          }
        })
      );

      // Filter out null values (placeholder attachments) and ensure proper typing
      const validAttachments = loadedAttachments.filter((att): att is NonNullable<typeof att> => att !== null);

      console.log('📋 Final attachments:', validAttachments);

      return {
        ...plan,
        attachments: validAttachments
      };
    } catch (error) {
      console.error('Error loading attachments:', error);
      return plan; // Return original plan if loading fails
    }
  };


  const exportCSV = () => {
    if (!plans.length) return;
    const headers = ['Name','Owner','Status','Start Date','End Date','Progress','Description','Notes','Tasks'];
    const rows = plans.map(p => [
      p.name,
      p.owner,
      p.status,
      p.start_date || '',
      p.end_date || '',
      typeof p.progress==='number' ? `${p.progress}%` : '',
      (p.description||'').replace(/\n/g,' '),
      (p.notes||'').replace(/\n/g,' '),
      (p.tasks||[]).join(' | ')
    ]);
    const csv = [headers, ...rows].map(r => r.map(f => `"${String(f).replace(/"/g,'""')}"`).join(',')).join('\n');
    download(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), 'plans.csv');
  };

  const tableHTML = () => {
    const head = '<tr><th>Name</th><th>Owner</th><th>Status</th><th>Start Date</th><th>End Date</th><th>Progress</th><th>Description</th><th>Notes</th><th>Tasks</th></tr>';
    const body = plans.map(p => `<tr>
      <td>${p.name}</td>
      <td>${p.owner}</td>
      <td>${p.status}</td>
      <td>${p.start_date||''}</td>
      <td>${p.end_date||''}</td>
      <td>${typeof p.progress==='number'?`${p.progress}%`:''}</td>
      <td>${(p.description||'').replace(/</g,'&lt;')}</td>
      <td>${(p.notes||'').replace(/</g,'&lt;')}</td>
      <td>${(p.tasks||[]).join(', ')}</td>
    </tr>`).join('');
    return `<table border="1" cellspacing="0" cellpadding="6">${head}${body}</table>`;
  };

  const exportExcel = () => {
    download(new Blob([tableHTML()], { type: 'application/vnd.ms-excel' }), 'plans.xls');
  };

  const exportPDF = () => {
    const html = `<!doctype html><html><head><meta charset=\"utf-8\" /><title>Plans</title>
      <style>table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f3f4f6}</style>
      </head><body>${tableHTML()}<script>window.print();</script></body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  };

  const exportWord = () => {
    download(new Blob([`<!doctype html><html><head><meta charset=\"utf-8\" /></head><body>${tableHTML()}</body></html>`], { type: 'application/msword' }), 'plans.doc');
  };

  const shareCSV = async () => {
    if (!plans.length) return;
    const headers = ['Name','Owner','Status','Start Date','End Date','Progress','Description','Notes','Tasks'];
    const rows = plans.map(p => [
      p.name, p.owner, p.status, p.start_date||'', p.end_date||'', typeof p.progress==='number'?`${p.progress}%`:'', (p.description||'').replace(/\n/g,' '), (p.notes||'').replace(/\n/g,' '), (p.tasks||[]).join(' | ')
    ]);
    const csv = [headers, ...rows].map(r => r.map(f => `"${String(f).replace(/"/g,'""')}"`).join(',')).join('\n');
    
    try {
      // Try Web Share API with text first (more reliable)
      if (navigator.share) {
        await navigator.share({
          title: 'Plans Export',
          text: `Plans data (${plans.length} records):\n\n${csv.substring(0, 1000)}${csv.length > 1000 ? '...' : ''}`,
          url: window.location.href
        });
        return;
      }
    } catch (err) {
      console.log('Web Share failed, falling back to email');
    }
    
    // Fallback: Email with CSV as attachment
    const subject = encodeURIComponent('Plans Export');
    const body = encodeURIComponent(`Please find the plans data attached.\n\nTotal records: ${plans.length}\n\nCSV Data:\n${csv}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (!plans.length) return <div className="p-4 text-gray-500">No plan data</div>;

  return (
    <div className="border rounded-xl bg-white">
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-800">Plans</h3>
        <div className="flex items-center space-x-2">
          <button className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50" onClick={exportCSV}>CSV</button>
          <button className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50" onClick={exportExcel}>Excel</button>
          <button className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50" onClick={exportPDF}>PDF</button>
          <button className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50" onClick={exportWord}>Word</button>
        </div>
      </div>
      <div className="overflow-auto">
      <table className="min-w-full text-sm table-fixed">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left w-1/6">Name</th>
            <th className="px-3 py-2 text-left w-1/12">Owner</th>
            <th className="px-3 py-2 text-left w-1/12">Status</th>
            <th className="px-3 py-2 text-left w-1/12">Start Date</th>
            <th className="px-3 py-2 text-left w-1/12">End Date</th>
            <th className="px-3 py-2 text-left w-1/12">Progress</th>
            <th className="px-3 py-2 text-left w-1/6">Description</th>
            <th className="px-3 py-2 text-left w-1/6">Notes</th>
            <th className="px-3 py-2 text-left w-1/6">Tasks (IDs)</th>
          </tr>
        </thead>
        <tbody>
          {plans.map((plan, idx) => (
            <tr key={idx} className="border-t align-top hover:bg-gray-50 cursor-pointer" onClick={() => handleViewDetails(plan)}>
              <td className="px-3 py-2 truncate">
                <div className="flex items-center space-x-2">
                  <span>{plan.name}</span>
                  {plan.attachments && plan.attachments.length > 0 && (
                    <span className="text-blue-500" title={`${plan.attachments.length} attachment(s)`}>📎</span>
                  )}
                </div>
              </td>
              <td className="px-3 py-2 truncate">{plan.owner}</td>
              <td className="px-3 py-2 capitalize truncate">{plan.status}</td>
              <td className="px-3 py-2 truncate">{plan.start_date || ''}</td>
              <td className="px-3 py-2 truncate">{plan.end_date || ''}</td>
              <td className="px-3 py-2 truncate">{typeof plan.progress === 'number' ? `${plan.progress}%` : ''}</td>
              <td className="px-3 py-2">
                <div className="max-w-xs truncate" title={plan.description || ''}>
                  {plan.description || ''}
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="max-w-xs truncate" title={plan.notes || ''}>
                  {plan.notes || ''}
                </div>
              </td>
              <td className="px-3 py-2 whitespace-pre-wrap">
                <div className="flex justify-between items-center">
                  <span>{(plan.tasks || []).join(', ')}</span>
                  <button 
                    className="ml-2 px-2 py-1 bg-blue-600 text-white rounded text-xs" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDetails(plan);
                    }}
                    title="View Details"
                  >
                    👁️
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
      
      {/* Detail View Modal */}
      {showDetailView && selectedPlan && (
        <ItemDetailView
          item={{
            ...selectedPlan,
            title: selectedPlan.name,
            startDate: selectedPlan.start_date,
            endDate: selectedPlan.end_date,
            progress: selectedPlan.progress,
            owner: selectedPlan.owner,
            description: selectedPlan.description,
            notes: selectedPlan.notes,
            attachedFiles: selectedPlan.attachments || [],
            attachments: selectedPlan.attachments || []
          }}
          itemType="plan"
          onClose={handleCloseDetailView}
          onEdit={() => {
            console.log('Edit plan:', selectedPlan);
          }}
          onDelete={() => {
            console.log('Delete plan:', selectedPlan);
          }}
        />
      )}
    </div>
  );
};

export default PlanTable;
