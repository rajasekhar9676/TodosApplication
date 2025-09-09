import { db } from '../config';
import { addDoc, collection, doc, getDoc, getDocs, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { Plan, Blueprint } from '../models/orgModels';
import { planToDoc, docToPlan, blueprintToDoc, docToBlueprint } from '../models/orgMappers';

export const companyOrgEntitiesService = {
  async getPlanByFile(fileId: string): Promise<Plan | null> {
    const qy = query(collection(db, 'orgPlans'), where('fileId', '==', fileId));
    const snap = await getDocs(qy);
    if (snap.empty) return null;
    const d = snap.docs[0];
    const data: any = d.data();
    return docToPlan(d.id, data);
  },

  async getPlanDocByFile(fileId: string): Promise<{ docId: string; plan: Plan } | null> {
    const qy = query(collection(db, 'orgPlans'), where('fileId', '==', fileId));
    const snap = await getDocs(qy);
    if (snap.empty) return null;
    const d = snap.docs[0];
    const data: any = d.data();
    return { docId: d.id, plan: docToPlan(d.id, data) };
  },

  async listPlansByFile(fileId: string): Promise<Array<{ docId: string; plan: Plan }>> {
    const qy = query(collection(db, 'orgPlans'), where('fileId', '==', fileId));
    const snap = await getDocs(qy);
    return snap.docs.map(d => ({ docId: d.id, plan: docToPlan(d.id, d.data()) }));
  },

  async listPlansByFolder(folderId: string): Promise<Array<{ docId: string; plan: Plan }>> {
    const qy = query(collection(db, 'orgPlans'), where('folderId', '==', folderId));
    const snap = await getDocs(qy);
    return snap.docs.map(d => ({ docId: d.id, plan: docToPlan(d.id, d.data()) }));
  },

  async createPlan(folderId: string, fileId: string, plan: Plan): Promise<string> {
    const ref = await addDoc(collection(db, 'orgPlans'), {
      folderId,
      fileId,
      ...planToDoc(plan),
      createdAt: serverTimestamp()
    });
    return ref.id;
  },

  async updatePlan(docId: string, partial: Partial<Plan>): Promise<void> {
    await updateDoc(doc(db, 'orgPlans', docId), { ...partial, updatedAt: serverTimestamp() } as any);
  },

  async getBlueprintByFile(fileId: string): Promise<Blueprint | null> {
    const qy = query(collection(db, 'orgBlueprintFiles'), where('fileId', '==', fileId));
    const snap = await getDocs(qy);
    if (snap.empty) return null;
    const d = snap.docs[0];
    const data: any = d.data();
    return docToBlueprint(d.id, data);
  },

  async getBlueprintDocByFile(fileId: string): Promise<{ docId: string; blueprint: Blueprint } | null> {
    const qy = query(collection(db, 'orgBlueprintFiles'), where('fileId', '==', fileId));
    const snap = await getDocs(qy);
    if (snap.empty) return null;
    const d = snap.docs[0];
    const data: any = d.data();
    return { docId: d.id, blueprint: docToBlueprint(d.id, data) };
  },

  async listBlueprintsByFile(fileId: string): Promise<Array<{ docId: string; blueprint: Blueprint }>> {
    const qy = query(collection(db, 'orgBlueprintFiles'), where('fileId', '==', fileId));
    const snap = await getDocs(qy);
    return snap.docs.map(d => ({ docId: d.id, blueprint: docToBlueprint(d.id, d.data()) }));
  },

  async listBlueprintsByFolder(folderId: string): Promise<Array<{ docId: string; blueprint: Blueprint }>> {
    const qy = query(collection(db, 'orgBlueprintFiles'), where('folderId', '==', folderId));
    const snap = await getDocs(qy);
    return snap.docs.map(d => ({ docId: d.id, blueprint: docToBlueprint(d.id, d.data()) }));
  },

  async createBlueprint(folderId: string, fileId: string, blueprint: Blueprint): Promise<string> {
    const ref = await addDoc(collection(db, 'orgBlueprintFiles'), {
      folderId,
      fileId,
      ...blueprintToDoc(blueprint),
      createdAt: serverTimestamp()
    });
    return ref.id;
  },

  async updateBlueprint(docId: string, partial: Partial<Blueprint>): Promise<void> {
    await updateDoc(doc(db, 'orgBlueprintFiles', docId), { ...partial, last_updated: new Date().toISOString(), updatedAt: serverTimestamp() } as any);
  }
};
