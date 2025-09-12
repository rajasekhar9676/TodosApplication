import React, { useEffect, useState } from 'react';
import { companyOrgEntitiesService } from '../services/companyOrgEntitiesService';
import { Plan } from '../models/orgModels';

interface Props {
  fileId: string;
}

const PlanDetails: React.FC<Props> = ({ fileId }) => {
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const found = await companyOrgEntitiesService.getPlanDocByFile(fileId);
      setPlan(found ? found.plan : null);
      setLoading(false);
    })();
  }, [fileId]);

  if (loading) return <div className="p-4">Loading...</div>;
  if (!plan) return <div className="p-4 text-gray-500">No plan data</div>;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div><span className="font-semibold">Plan ID:</span> {plan.plan_id}</div>
        <div><span className="font-semibold">Name:</span> {plan.name}</div>
        <div><span className="font-semibold">Owner:</span> {plan.owner}</div>
        <div><span className="font-semibold">Start Date:</span> {plan.start_date || '-'}</div>
        <div><span className="font-semibold">End Date:</span> {plan.end_date || '-'}</div>
        <div><span className="font-semibold">Status:</span> {plan.status}</div>
        <div><span className="font-semibold">Progress:</span> {typeof plan.progress === 'number' ? `${plan.progress}%` : '-'}</div>
      </div>
      <div>
        <div className="font-semibold mb-1">Description</div>
        <div className="p-3 border rounded-lg bg-white whitespace-pre-wrap">{plan.description || '-'}</div>
      </div>
      <div>
        <div className="font-semibold mb-1">Notes</div>
        <div className="p-3 border rounded-lg bg-white whitespace-pre-wrap">{plan.notes || '-'}</div>
      </div>
      <div>
        <div className="font-semibold mb-1">Tasks (IDs)</div>
        <div className="p-3 border rounded-lg bg-white">{(plan.tasks || []).length ? (plan.tasks || []).join(', ') : '-'}</div>
      </div>
    </div>
  );
};

export default PlanDetails;






