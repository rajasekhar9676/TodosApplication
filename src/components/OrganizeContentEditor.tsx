import React, { useEffect, useState } from 'react';
import { companyOrgContentService, ContentKind, ContentStatus } from '../services/companyOrgContentService';

interface Props {
  fileId: string;
  initialKind?: ContentKind;
}

const statuses: ContentStatus[] = ['draft','in_review','approved','archived'];

const OrganizeContentEditor: React.FC<Props> = ({ fileId, initialKind = 'docs' }) => {
  const [contentId, setContentId] = useState<string>('');
  const [kind, setKind] = useState<ContentKind>(initialKind);
  const [title, setTitle] = useState<string>('');
  const [body, setBody] = useState<string>('');
  const [owner, setOwner] = useState<string>('');
  const [approver, setApprover] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>('');
  const [reviewDate, setReviewDate] = useState<string>('');
  const [status, setStatus] = useState<ContentStatus>('draft');
  const [tags, setTags] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const existing = await companyOrgContentService.getContentByFile(fileId);
      if (existing) {
        setContentId(existing.id || '');
        setKind(existing.kind);
        setTitle(existing.title);
        setBody(existing.body);
        setOwner(existing.owner || '');
        setApprover(existing.approver || '');
        setTargetDate(existing.targetDate || '');
        setReviewDate(existing.reviewDate || '');
        setStatus(existing.status || 'draft');
        setTags((existing.tags || []).join(', '));
      } else {
        setContentId('');
        setKind(initialKind);
        setTitle('');
        setBody('');
        setOwner('');
        setApprover('');
        setTargetDate('');
        setReviewDate('');
        setStatus('draft');
        setTags('');
      }
      setLoading(false);
    })();
  }, [fileId, initialKind]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        fileId,
        kind,
        title: title || 'Untitled',
        body: body || '',
        owner: owner || undefined,
        approver: approver || undefined,
        targetDate: targetDate || undefined,
        reviewDate: reviewDate || undefined,
        status: status || 'draft',
        tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : []
      };

      if (!contentId) {
        const id = await companyOrgContentService.createContent(payload);
        setContentId(id);
      } else {
        await companyOrgContentService.updateContent(contentId, payload);
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input className="w-full px-3 py-2 border rounded-lg" placeholder="Title" value={title} onChange={e => setTitle(e.target.value)} />
        <select className="w-full px-3 py-2 border rounded-lg" value={status} onChange={e => setStatus(e.target.value as ContentStatus)}>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input className="w-full px-3 py-2 border rounded-lg" placeholder="Owner" value={owner} onChange={e => setOwner(e.target.value)} />
        <input className="w-full px-3 py-2 border rounded-lg" placeholder="Approver" value={approver} onChange={e => setApprover(e.target.value)} />
        <input className="w-full px-3 py-2 border rounded-lg" placeholder="Tags (comma separated)" value={tags} onChange={e => setTags(e.target.value)} />
        {kind === 'plans' && (
          <input className="w-full px-3 py-2 border rounded-lg" placeholder="Target Date (YYYY-MM-DD)" value={targetDate} onChange={e => setTargetDate(e.target.value)} />
        )}
        {kind === 'docs' && (
          <input className="w-full px-3 py-2 border rounded-lg" placeholder="Review Date (YYYY-MM-DD)" value={reviewDate} onChange={e => setReviewDate(e.target.value)} />
        )}
      </div>
      <textarea className="w-full px-3 py-2 border rounded-lg h-64" placeholder="Write here..." value={body} onChange={e => setBody(e.target.value)} />
      <div className="flex items-center justify-end">
        <button className={`px-3 py-2 rounded-lg text-white ${saving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
};

export default OrganizeContentEditor;
