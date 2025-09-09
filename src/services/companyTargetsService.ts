import { addDoc, collection, doc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { db } from '../config';

export type TargetStatus = 'on_track' | 'at_risk' | 'delayed' | 'achieved' | 'cancelled';

export interface OrgTarget {
  id?: string;
  folderId: string;
  fileId: string;
  title: string; // Target Name / Title
  targetType: string; // Category (Revenue, Sales, ...)
  targetValue?: number; // numeric value
  targetUnit?: string; // ₹, $, Crores, %, etc.
  startDate?: string;
  endDate?: string;
  department?: string; // Sales, Marketing, etc.
  owner?: string; // Responsible person
  progress?: number; // percentage or amount achieved
  status?: TargetStatus;
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

export const companyTargetsService = {
  async createTarget(payload: Omit<OrgTarget, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const cleaned: any = Object.fromEntries(Object.entries(payload).filter(([, v]) => v !== undefined));
    const ref = await addDoc(collection(db, 'orgTargets'), {
      ...cleaned,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return ref.id;
  },

  async updateTarget(docId: string, partial: Partial<OrgTarget>): Promise<void> {
    const cleaned: any = Object.fromEntries(Object.entries(partial).filter(([, v]) => v !== undefined));
    await updateDoc(doc(db, 'orgTargets', docId), { ...cleaned, updatedAt: serverTimestamp() } as any);
  },

  async listTargetsByFile(fileId: string): Promise<Array<OrgTarget & { docId: string }>> {
    const qy = query(collection(db, 'orgTargets'), where('fileId', '==', fileId));
    const snap = await getDocs(qy);
    return snap.docs.map(d => ({ docId: d.id, ...(d.data() as any) }));
  },

  async listTargetsByFolder(folderId: string): Promise<Array<OrgTarget & { docId: string }>> {
    const qy = query(collection(db, 'orgTargets'), where('folderId', '==', folderId));
    const snap = await getDocs(qy);
    return snap.docs.map(d => ({ docId: d.id, ...(d.data() as any) }));
  }
};


