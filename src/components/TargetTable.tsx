import React, { useEffect, useState } from 'react';
import { companyTargetsService, OrgTarget } from '../services/companyTargetsService';

interface Props {
  folderId: string;
}

const TargetTable: React.FC<Props> = ({ folderId }) => {
  const [rows, setRows] = useState<Array<OrgTarget & { docId: string }>>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const list = await companyTargetsService.listTargetsByFolder(folderId);
      setRows(list);
      setLoading(false);
    })();
  }, [folderId]);

  return (
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
            <tr key={r.docId} className="border-t align-top">
              <td className="px-3 py-2 whitespace-pre-wrap">{r.title}</td>
              <td className="px-3 py-2">{r.targetType}</td>
              <td className="px-3 py-2">{r.targetValue ?? ''} {r.targetUnit || ''}</td>
              <td className="px-3 py-2">{r.startDate || ''}</td>
              <td className="px-3 py-2">{r.endDate || ''}</td>
              <td className="px-3 py-2">{r.department || ''}</td>
              <td className="px-3 py-2">{r.owner || ''}</td>
              <td className="px-3 py-2">{r.progress ?? ''}</td>
              <td className="px-3 py-2 capitalize">{r.status || ''}</td>
              <td className="px-3 py-2 whitespace-pre-wrap">{r.notes || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {loading && <div className="p-4">Loading...</div>}
      {!loading && rows.length === 0 && <div className="p-4 text-gray-500">No targets yet</div>}
    </div>
  );
};

export default TargetTable;


