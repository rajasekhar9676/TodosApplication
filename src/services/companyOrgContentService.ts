import { db } from '../config';
import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';

export type ContentKind = 'plans' | 'docs' | 'notes';
export type ContentStatus = 'draft' | 'in_review' | 'approved' | 'archived';

export interface OrgContent {
  id?: string;
  fileId: string;
  kind: ContentKind;
  title: string;
  body: string; // markdown or plain text
  owner?: string;
  approver?: string;
  targetDate?: string; // for plans
  reviewDate?: string; // for docs
  status?: ContentStatus;
  tags?: string[];
  createdAt?: any;
  updatedAt?: any;
}

export interface OrgContentVersion {
  id?: string;
  fileId: string;
  contentId: string;
  version: number;
  snapshot: string; // JSON snapshot of content
  createdAt?: any;
}

export const companyOrgContentService = {
  async getContentByFile(fileId: string): Promise<OrgContent | null> {
    const qy = query(collection(db, 'orgContents'), where('fileId', '==', fileId));
    const snap = await getDocs(qy);
    if (snap.empty) return null;
    const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as OrgContent));
    list.sort((a, b) => {
      const at = (a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0);
      const bt = (b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0);
      return bt - at;
    });
    return list[0] || null;
  },

  async createContent(payload: Omit<OrgContent, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const ref = await addDoc(collection(db, 'orgContents'), {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    await addDoc(collection(db, 'orgContentVersions'), {
      fileId: payload.fileId,
      contentId: ref.id,
      version: 1,
      snapshot: JSON.stringify(payload),
      createdAt: serverTimestamp()
    });
    return ref.id;
  },

  async updateContent(contentId: string, partial: Partial<OrgContent>): Promise<void> {
    await updateDoc(doc(db, 'orgContents', contentId), { ...partial, updatedAt: serverTimestamp() });
    const contentDoc = await getDoc(doc(db, 'orgContents', contentId));
    if (contentDoc.exists()) {
      const data = contentDoc.data() as OrgContent;
      const q = query(collection(db, 'orgContentVersions'), where('contentId', '==', contentId));
      const snap = await getDocs(q);
      const next = (snap.size || 0) + 1;
      await addDoc(collection(db, 'orgContentVersions'), {
        fileId: data.fileId,
        contentId,
        version: next,
        snapshot: JSON.stringify({ ...data, ...partial }),
        createdAt: serverTimestamp()
      });
    }
  }
};
