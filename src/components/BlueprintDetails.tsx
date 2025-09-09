import React, { useEffect, useState } from 'react';
import { companyOrgEntitiesService } from '../services/companyOrgEntitiesService';
import { Blueprint } from '../models/orgModels';

interface Props {
  fileId: string;
}

const BlueprintDetails: React.FC<Props> = ({ fileId }) => {
  const [bp, setBp] = useState<Blueprint | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const found = await companyOrgEntitiesService.getBlueprintDocByFile(fileId);
      setBp(found ? found.blueprint : null);
      setLoading(false);
    })();
  }, [fileId]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (!bp) return <div className="p-4 text-gray-500">No blueprint data</div>;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div><span className="font-semibold">Blueprint ID:</span> {bp.blueprint_id}</div>
        <div><span className="font-semibold">Name:</span> {bp.name}</div>
        <div><span className="font-semibold">Category:</span> {bp.category || '-'}</div>
        <div><span className="font-semibold">Version:</span> {bp.version}</div>
        <div><span className="font-semibold">Created By:</span> {bp.created_by}</div>
        <div><span className="font-semibold">Created Date:</span> {bp.created_date}</div>
        <div><span className="font-semibold">Last Updated:</span> {bp.last_updated || '-'}</div>
      </div>
      <div>
        <div className="font-semibold mb-1">Description</div>
        <div className="p-3 border rounded-lg bg-white whitespace-pre-wrap">{bp.description || '-'}</div>
      </div>
      <div>
        <div className="font-semibold mb-1">Default Tasks</div>
        <div className="p-3 border rounded-lg bg-white">
          {(bp.default_tasks || []).length ? (
            <ul className="list-disc pl-6">
              {(bp.default_tasks || []).map((t:any, idx:number) => (
                <li key={idx}><span className="font-medium">{t.title || 'Untitled'}</span>{t.priority ? ` • ${t.priority}` : ''}{typeof t.relative_due_days==='number' ? ` • +${t.relative_due_days}d` : ''}</li>
              ))}
            </ul>
          ) : '-'}
        </div>
      </div>
    </div>
  );
};

export default BlueprintDetails;



