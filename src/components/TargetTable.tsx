import React, { useEffect, useState } from 'react';
import { companyTargetsService, OrgTarget } from '../services/companyTargetsService';
import { fileStorageService } from '../services/fileStorageService';
import ItemDetailView from './ItemDetailView';

interface Props {
  folderId: string;
}

const TargetTable: React.FC<Props> = ({ folderId }) => {
  const [rows, setRows] = useState<Array<OrgTarget & { docId: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState<(OrgTarget & { docId: string }) | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const list = await companyTargetsService.listTargetsByFolder(folderId);
      setRows(list);
      setLoading(false);
    })();
  }, [folderId]);

  const download = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  };

  const handleViewDetails = async (target: OrgTarget & { docId: string }) => {
    const targetWithAttachments = await loadAttachmentsData(target);
    setSelectedTarget(targetWithAttachments);
    setShowDetailView(true);
  };

  const handleCloseDetailView = () => {
    setShowDetailView(false);
    setSelectedTarget(null);
  };

  // Function to load actual file data for attachments
  const loadAttachmentsData = async (target: OrgTarget & { docId: string }): Promise<OrgTarget & { docId: string }> => {
    if (!target.attachments || target.attachments.length === 0) {
      return target;
    }

    console.log('🔍 Loading attachments for target:', target.title);
    console.log('📎 Attachments found:', target.attachments);

    try {
      const loadedAttachments = await Promise.all(
        target.attachments.map(async (attachment) => {
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
        ...target,
        attachments: validAttachments
      };
    } catch (error) {
      console.error('Error loading attachments:', error);
      return target; // Return original target if loading fails
    }
  };

  const exportCSV = () => {
    if (!rows.length) return;
    const headers = ['Title','Type','Value','Unit','Start Date','End Date','Department','Owner','Progress','Status','Notes'];
    const csvRows = rows.map(r => [
      r.title, r.targetType, r.targetValue ?? '', r.targetUnit || '', r.startDate || '', r.endDate || '', 
      r.department || '', r.owner || '', r.progress ?? '', r.status || '', (r.notes || '').replace(/\n/g,' ')
    ]);
    const csv = [headers, ...csvRows].map(r => r.map(f => `"${String(f).replace(/"/g,'""')}"`).join(',')).join('\n');
    download(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), 'targets.csv');
  };

  const tableHTML = () => {
    const head = '<tr><th>Title</th><th>Type</th><th>Value</th><th>Unit</th><th>Start Date</th><th>End Date</th><th>Department</th><th>Owner</th><th>Progress</th><th>Status</th><th>Notes</th></tr>';
    const body = rows.map(r => `<tr>
      <td>${r.title}</td>
      <td>${r.targetType}</td>
      <td>${r.targetValue ?? ''}</td>
      <td>${r.targetUnit || ''}</td>
      <td>${r.startDate || ''}</td>
      <td>${r.endDate || ''}</td>
      <td>${r.department || ''}</td>
      <td>${r.owner || ''}</td>
      <td>${r.progress ?? ''}</td>
      <td>${r.status || ''}</td>
      <td>${(r.notes || '').replace(/</g,'&lt;')}</td>
    </tr>`).join('');
    return `<table border="1" cellspacing="0" cellpadding="6">${head}${body}</table>`;
  };

  const exportExcel = () => {
    download(new Blob([tableHTML()], { type: 'application/vnd.ms-excel' }), 'targets.xls');
  };

  const exportPDF = () => {
    const html = `<!doctype html><html><head><meta charset=\"utf-8\" /><title>Targets</title>
      <style>table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f3f4f6}</style>
      </head><body>${tableHTML()}<script>window.print();</script></body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  };

  const exportWord = () => {
    download(new Blob([`<!doctype html><html><head><meta charset=\"utf-8\" /></head><body>${tableHTML()}</body></html>`], { type: 'application/msword' }), 'targets.doc');
  };

  const shareCSV = async () => {
    if (!rows.length) return;
    const headers = ['Title','Type','Value','Unit','Start Date','End Date','Department','Owner','Progress','Status','Notes'];
    const csvRows = rows.map(r => [
      r.title, r.targetType, r.targetValue ?? '', r.targetUnit || '', r.startDate || '', r.endDate || '', 
      r.department || '', r.owner || '', r.progress ?? '', r.status || '', (r.notes || '').replace(/\n/g,' ')
    ]);
    const csv = [headers, ...csvRows].map(r => r.map(f => `"${String(f).replace(/"/g,'""')}"`).join(',')).join('\n');
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Targets Export',
          text: `Targets data (${rows.length} records):\n\n${csv.substring(0, 1000)}${csv.length > 1000 ? '...' : ''}`,
          url: window.location.href
        });
        return;
      }
    } catch (err) {
      console.log('Web Share failed, falling back to email');
    }
    
    const subject = encodeURIComponent('Targets Export');
    const body = encodeURIComponent(`Please find the targets data attached.\n\nTotal records: ${rows.length}\n\nCSV Data:\n${csv}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  return (
    <div className="border rounded-xl bg-white">
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-800">Targets</h3>
        <div className="flex items-center space-x-2">
          <button className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50" onClick={exportCSV}>CSV</button>
          <button className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50" onClick={exportExcel}>Excel</button>
          <button className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50" onClick={exportPDF}>PDF</button>
          <button className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50" onClick={exportWord}>Word</button>
        </div>
      </div>
      <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left">Title</th>
            <th className="px-3 py-2 text-left">Type</th>
            <th className="px-3 py-2 text-left">Value</th>
            <th className="px-3 py-2 text-left">Start</th>
            <th className="px-3 py-2 text-left">End</th>
            <th className="px-3 py-2 text-left">Department</th>
            <th className="px-3 py-2 text-left">Owner</th>
            <th className="px-3 py-2 text-left">Progress</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-left">Notes</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.docId} className="border-t align-top hover:bg-gray-50 cursor-pointer" onClick={() => handleViewDetails(r)}>
              <td className="px-3 py-2">
                <div className="max-w-xs truncate" title={r.title}>
                  {r.title}
                </div>
              </td>
              <td className="px-3 py-2">{r.targetType}</td>
              <td className="px-3 py-2">{r.targetValue ?? ''} {r.targetUnit || ''}</td>
              <td className="px-3 py-2">{r.startDate || ''}</td>
              <td className="px-3 py-2">{r.endDate || ''}</td>
              <td className="px-3 py-2">{r.department || ''}</td>
              <td className="px-3 py-2">{r.owner || ''}</td>
              <td className="px-3 py-2">{r.progress ?? ''}</td>
              <td className="px-3 py-2 capitalize">{r.status || ''}</td>
              <td className="px-3 py-2 whitespace-pre-wrap">
                <div className="flex justify-between items-center">
                  <span>{r.notes || ''}</span>
                  <button 
                    className="ml-2 px-2 py-1 bg-blue-600 text-white rounded text-xs" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDetails(r);
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
      {loading && <div className="p-4">Loading...</div>}
      {!loading && rows.length === 0 && <div className="p-4 text-gray-500">No targets yet</div>}
      
      {/* Detail View Modal */}
      {showDetailView && selectedTarget && (
        <ItemDetailView
          item={{
            ...selectedTarget,
            title: selectedTarget.title,
            targetDate: selectedTarget.endDate,
            progress: selectedTarget.progress,
            assignedTo: selectedTarget.owner,
            description: selectedTarget.notes,
            attachedFiles: selectedTarget.attachments || [],
            attachments: selectedTarget.attachments || []
          }}
          itemType="target"
          onClose={handleCloseDetailView}
          onEdit={() => {
            console.log('Edit target:', selectedTarget);
          }}
          onDelete={() => {
            console.log('Delete target:', selectedTarget);
          }}
        />
      )}
    </div>
  );
};

export default TargetTable;



