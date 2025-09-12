import React, { useEffect, useState } from 'react';
import { companyOrgEntitiesService } from '../services/companyOrgEntitiesService';
import { companyOrgService } from '../services/companyOrgService';
import { fileStorageService } from '../services/fileStorageService';
import { Blueprint } from '../models/orgModels';
import ItemDetailView from './ItemDetailView';

interface Props {
  folderId: string;
  refreshToken?: number;
}

const BlueprintTable: React.FC<Props> = ({ folderId, refreshToken = 0 }) => {
  const [list, setList] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const entries: Array<{ docId: string; blueprint: Blueprint }> = [];
        // Scan all blueprint files in this folder and get every blueprint per file
        const files = await companyOrgService.listFilesByFolder(folderId);
        const bpFiles = files.filter((f: any) => f.kind === 'blueprints');
        for (const f of bpFiles) {
          const byFile = await companyOrgEntitiesService.listBlueprintsByFile(f.id!);
          byFile.forEach(x => entries.push(x));
        }
        // Also include any docs saved directly with folderId
        const byFolder = await companyOrgEntitiesService.listBlueprintsByFolder(folderId);
        byFolder.forEach(x => entries.push(x));
        // Dedupe by Firestore docId so every saved doc is shown
        const map = new Map<string, Blueprint>();
        for (const it of entries) {
          if (it && it.docId) map.set(it.docId, it.blueprint);
        }
        setList(Array.from(map.values()));
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

  const handleViewDetails = async (blueprint: Blueprint) => {
    const blueprintWithAttachments = await loadAttachmentsData(blueprint);
    setSelectedBlueprint(blueprintWithAttachments);
    setShowDetailView(true);
  };

  const handleCloseDetailView = () => {
    setShowDetailView(false);
    setSelectedBlueprint(null);
  };

  // Function to load actual file data for attachments
  const loadAttachmentsData = async (blueprint: Blueprint): Promise<Blueprint> => {
    if (!blueprint.attachments || blueprint.attachments.length === 0) {
      return blueprint;
    }

    console.log('🔍 Loading attachments for blueprint:', blueprint.name);
    console.log('📎 Attachments found:', blueprint.attachments);

    try {
      const loadedAttachments = await Promise.all(
        blueprint.attachments.map(async (attachment) => {
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
        ...blueprint,
        attachments: validAttachments
      };
    } catch (error) {
      console.error('Error loading attachments:', error);
      return blueprint; // Return original blueprint if loading fails
    }
  };

  const exportCSV = () => {
    if (!list.length) return;
    const headers = ['Name','Category','Version','Created By','Description','Default Tasks'];
    const rows = list.map(bp => [
      bp.name,
      bp.category || '',
      bp.version,
      bp.created_by,
      (bp.description||'').replace(/\n/g,' '),
      (bp.default_tasks||[]).join(' | ')
    ]);
    const csv = [headers, ...rows].map(r => r.map(f => `"${String(f).replace(/"/g,'""')}"`).join(',')).join('\n');
    download(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), 'blueprints.csv');
  };

  const tableHTML = () => {
    const head = '<tr><th>Name</th><th>Category</th><th>Version</th><th>Created By</th><th>Description</th><th>Default Tasks</th></tr>';
    const body = list.map(bp => `<tr>
      <td>${bp.name}</td>
      <td>${bp.category||''}</td>
      <td>${bp.version}</td>
      <td>${bp.created_by}</td>
      <td>${(bp.description||'').replace(/</g,'&lt;')}</td>
      <td>${(bp.default_tasks||[]).join(', ')}</td>
    </tr>`).join('');
    return `<table border="1" cellspacing="0" cellpadding="6">${head}${body}</table>`;
  };

  const exportExcel = () => {
    download(new Blob([tableHTML()], { type: 'application/vnd.ms-excel' }), 'blueprints.xls');
  };

  const exportPDF = () => {
    const html = `<!doctype html><html><head><meta charset=\"utf-8\" /><title>Blueprints</title>
      <style>table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f3f4f6}</style>
      </head><body>${tableHTML()}<script>window.print();</script></body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  };

  const exportWord = () => {
    download(new Blob([`<!doctype html><html><head><meta charset=\"utf-8\" /></head><body>${tableHTML()}</body></html>`], { type: 'application/msword' }), 'blueprints.doc');
  };

  const shareCSV = async () => {
    if (!list.length) return;
    const headers = ['Name','Category','Version','Created By','Description','Default Tasks'];
    const rows = list.map(bp => [
      bp.name, bp.category||'', bp.version, bp.created_by, (bp.description||'').replace(/\n/g,' '), (bp.default_tasks||[]).join(' | ')
    ]);
    const csv = [headers, ...rows].map(r => r.map(f => `"${String(f).replace(/"/g,'""')}"`).join(',')).join('\n');
    
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Blueprints Export',
          text: `Blueprints data (${list.length} records):\n\n${csv.substring(0, 1000)}${csv.length > 1000 ? '...' : ''}`,
          url: window.location.href
        });
        return;
      }
    } catch (err) {
      console.log('Web Share failed, falling back to email');
    }
    
    const subject = encodeURIComponent('Blueprints Export');
    const body = encodeURIComponent(`Please find the blueprints data attached.\n\nTotal records: ${list.length}\n\nCSV Data:\n${csv}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (!list.length) return <div className="p-4 text-gray-500">No blueprint data</div>;

  return (
    <div className="border rounded-xl bg-white">
      <div className="flex items-center justify-between p-4 border-b bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-800">Blueprints</h3>
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
            <th className="px-3 py-2 text-left w-1/4">Name</th>
            <th className="px-3 py-2 text-left w-1/4">Category</th>
            <th className="px-3 py-2 text-left w-1/4">Version</th>
            <th className="px-3 py-2 text-left w-1/4">Created By</th>
          </tr>
        </thead>
        <tbody>
          {list.map((bp, idx) => (
            <tr key={idx} className="border-t align-top hover:bg-gray-50 cursor-pointer" onClick={() => handleViewDetails(bp)}>
              <td className="px-3 py-2 truncate">{bp.name}</td>
              <td className="px-3 py-2 truncate">{bp.category || ''}</td>
              <td className="px-3 py-2 truncate">{bp.version}</td>
              <td className="px-3 py-2 truncate">
                <div className="flex justify-between items-center">
                  <span>{bp.created_by}</span>
                  <button 
                    className="ml-2 px-2 py-1 bg-blue-600 text-white rounded text-xs" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDetails(bp);
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
      {showDetailView && selectedBlueprint && (
        <ItemDetailView
          item={{
            ...selectedBlueprint,
            title: selectedBlueprint.name,
            createdBy: selectedBlueprint.created_by,
            version: selectedBlueprint.version,
            description: selectedBlueprint.description,
            attachedFiles: selectedBlueprint.attachments || [],
            attachments: selectedBlueprint.attachments || []
          }}
          itemType="blueprint"
          onClose={handleCloseDetailView}
          onEdit={() => {
            console.log('Edit blueprint:', selectedBlueprint);
          }}
          onDelete={() => {
            console.log('Delete blueprint:', selectedBlueprint);
          }}
        />
      )}
    </div>
  );
};

export default BlueprintTable;
