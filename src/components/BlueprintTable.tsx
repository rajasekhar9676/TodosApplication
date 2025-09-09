import React, { useEffect, useState } from 'react';
import { companyOrgEntitiesService } from '../services/companyOrgEntitiesService';
import { companyOrgService } from '../services/companyOrgService';
import { Blueprint } from '../models/orgModels';

interface Props {
  folderId: string;
  refreshToken?: number;
}

const BlueprintTable: React.FC<Props> = ({ folderId, refreshToken = 0 }) => {
  const [list, setList] = useState<Blueprint[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="p-4">Loading...</div>;
  if (!list.length) return <div className="p-4 text-gray-500">No blueprint data</div>;

  return (
    <div className="overflow-auto border rounded-xl bg-white">
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
            <tr key={idx} className="border-t align-top">
              <td className="px-3 py-2 truncate">{bp.name}</td>
              <td className="px-3 py-2 truncate">{bp.category || ''}</td>
              <td className="px-3 py-2 truncate">{bp.version}</td>
              <td className="px-3 py-2 truncate">{bp.created_by}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default BlueprintTable;
