import React, { useEffect, useState } from 'react';
import { companyOrgEntitiesService } from '../services/companyOrgEntitiesService';
import { companyOrgService } from '../services/companyOrgService';
import { Plan } from '../models/orgModels';

interface Props {
  folderId: string;
  refreshToken?: number;
}

const PlanTable: React.FC<Props> = ({ folderId, refreshToken = 0 }) => {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="p-4">Loading...</div>;
  if (!plans.length) return <div className="p-4 text-gray-500">No plan data</div>;

  return (
    <div className="overflow-auto border rounded-xl bg-white">
      <div className="flex items-center justify-end p-2 space-x-2">
        <button className="px-2 py-1 border rounded" onClick={exportCSV}>CSV</button>
        <button className="px-2 py-1 border rounded" onClick={exportExcel}>Excel</button>
        <button className="px-2 py-1 border rounded" onClick={exportPDF}>PDF</button>
        <button className="px-2 py-1 border rounded" onClick={exportWord}>Word</button>
      </div>
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
            <tr key={idx} className="border-t align-top">
              <td className="px-3 py-2 truncate">{plan.name}</td>
              <td className="px-3 py-2 truncate">{plan.owner}</td>
              <td className="px-3 py-2 capitalize truncate">{plan.status}</td>
              <td className="px-3 py-2 truncate">{plan.start_date || ''}</td>
              <td className="px-3 py-2 truncate">{plan.end_date || ''}</td>
              <td className="px-3 py-2 truncate">{typeof plan.progress === 'number' ? `${plan.progress}%` : ''}</td>
              <td className="px-3 py-2 whitespace-pre-wrap">{plan.description || ''}</td>
              <td className="px-3 py-2 whitespace-pre-wrap">{plan.notes || ''}</td>
              <td className="px-3 py-2 whitespace-pre-wrap">{(plan.tasks || []).join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default PlanTable;
