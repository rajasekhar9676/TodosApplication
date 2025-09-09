import { db } from '../config';
import { addDoc, collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { deleteDoc } from 'firebase/firestore';

export type OrgCategory = 'magazine' | 'event' | 'project' | 'other';
export type OrgStatus = 'planned' | 'in_progress' | 'completed' | 'blocked' | 'cancelled';
export type OrgPriority = 'low' | 'medium' | 'high';
export type OrgFileKind = 'tasks' | 'plans' | 'blueprints' | 'docs' | 'notes' | 'targets';

export interface OrgFolder {
  id?: string;
  name: string;
  description?: string;
  createdAt?: any;
}

export interface OrgFile {
  id?: string;
  folderId: string;
  name: string;
  description?: string;
  kind?: OrgFileKind;
  createdAt?: any;
}

export interface OrgTaskAttachment { id: string; name: string; url: string; mime_type?: string; size_bytes?: number }
export interface OrgTaskComment { id: string; author: string; message: string; created_at: string }

export interface OrgTask {
  id?: string;
  folderId: string;
  fileId: string;
  title: string;
  assignedTo?: string;
  category: OrgCategory;
  status: OrgStatus;
  priority: OrgPriority;
  dueDate?: string;
  startDate?: string;
  completionDate?: string;
  description?: string;
  attachments?: OrgTaskAttachment[];
  comments?: OrgTaskComment[];
  dependencies?: string[];
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface OrgBlueprint {
  id?: string;
  name: string;
  description?: string;
  folderName?: string;
  fileName?: string;
  categoryHint?: OrgCategory;
  tasks: Array<Omit<OrgTask, 'id' | 'createdAt' | 'updatedAt'>>;
  createdAt?: any;
}

export type CreateTaskInput = Omit<OrgTask, 'id' | 'createdAt' | 'updatedAt'>;

export const companyOrgService = {
  async createFolder(name: string, description?: string) {
    const ref = await addDoc(collection(db, 'orgFolders'), {
      name,
      description: description || '',
      createdAt: serverTimestamp(),
    });
    return ref.id;
  },

  async listFolders(): Promise<OrgFolder[]> {
    const qy = query(collection(db, 'orgFolders'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(qy);
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  },

  async createFile(folderId: string, name: string, description?: string, kind: OrgFileKind = 'docs') {
    const ref = await addDoc(collection(db, 'orgFiles'), {
      folderId,
      name,
      description: description || '',
      kind,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  },

  async renameFolder(folderId: string, name: string) {
    await updateDoc(doc(db, 'orgFolders', folderId), { name });
  },

  async renameFile(fileId: string, name: string) {
    await updateDoc(doc(db, 'orgFiles', fileId), { name });
  },

  async listFilesByFolder(folderId: string): Promise<OrgFile[]> {
    const qy = query(collection(db, 'orgFiles'), where('folderId', '==', folderId));
    const snap = await getDocs(qy);
    const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as OrgFile));
    return list.sort((a, b) => {
      const at = (a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0);
      const bt = (b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0);
      return bt - at;
    });
  },

  async createTask(task: CreateTaskInput) {
    const ref = await addDoc(collection(db, 'orgTasks'), {
      ...task,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  },

  async updateTask(taskId: string, data: Partial<OrgTask>) {
    await updateDoc(doc(db, 'orgTasks', taskId), {
      ...data,
      updatedAt: serverTimestamp(),
    } as any);
  },

  async listTasksByFile(fileId: string): Promise<OrgTask[]> {
    const qy = query(collection(db, 'orgTasks'), where('fileId', '==', fileId));
    const snap = await getDocs(qy);
    const list = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) } as OrgTask));
    return list.sort((a, b) => {
      const at = (a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0);
      const bt = (b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0);
      return bt - at;
    });
  },

  async deleteFileDeep(fileId: string) {
    const tSnap = await getDocs(query(collection(db, 'orgTasks'), where('fileId', '==', fileId)));
    await Promise.all(tSnap.docs.map(d => deleteDoc(d.ref)));
    const pSnap = await getDocs(query(collection(db, 'orgPlans'), where('fileId', '==', fileId)));
    await Promise.all(pSnap.docs.map(d => deleteDoc(d.ref)));
    const bSnap = await getDocs(query(collection(db, 'orgBlueprintFiles'), where('fileId', '==', fileId)));
    await Promise.all(bSnap.docs.map(d => deleteDoc(d.ref)));
    await deleteDoc(doc(db, 'orgFiles', fileId));
  },

  async deleteFolderDeep(folderId: string) {
    const files = await this.listFilesByFolder(folderId);
    for (const f of files) {
      if (f.id) await this.deleteFileDeep(f.id);
    }
    const pSnap = await getDocs(query(collection(db, 'orgPlans'), where('folderId', '==', folderId)));
    await Promise.all(pSnap.docs.map(d => deleteDoc(d.ref)));
    const bSnap = await getDocs(query(collection(db, 'orgBlueprintFiles'), where('folderId', '==', folderId)));
    await Promise.all(bSnap.docs.map(d => deleteDoc(d.ref)));
    await deleteDoc(doc(db, 'orgFolders', folderId));
  },

  // Blueprints
  async saveBlueprintFromFile(folder: OrgFolder, file: OrgFile, tasks: OrgTask[], name?: string, description?: string) {
    const payload: Omit<OrgBlueprint, 'id'> = {
      name: name || `${file.name} Blueprint`,
      description: description || '',
      folderName: folder.name,
      fileName: file.name,
      categoryHint: undefined,
      tasks: tasks.map(t => ({ ...t, id: undefined, createdAt: undefined, updatedAt: undefined } as any)),
      createdAt: serverTimestamp()
    };
    const ref = await addDoc(collection(db, 'orgBlueprints'), payload as any);
    return ref.id;
  },

  async listBlueprints(): Promise<OrgBlueprint[]> {
    const snap = await getDocs(collection(db, 'orgBlueprints'));
    return snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }));
  },

  async instantiateBlueprint(blueprintId: string, targetFolderId: string, newFileName: string, description?: string) {
    const bpDoc = await getDoc(doc(db, 'orgBlueprints', blueprintId));
    if (!bpDoc.exists()) throw new Error('Blueprint not found');
    const bp = bpDoc.data() as OrgBlueprint;
    const fileId = await this.createFile(targetFolderId, newFileName, description, 'blueprints');

    const tasks = bp.tasks || [];
    for (const t of tasks) {
      await this.createTask({
        ...t,
        folderId: targetFolderId,
        fileId
      });
    }
    return fileId;
  },

  // Exports
  exportTasksToCSV(tasks: OrgTask[]): string {
    const headers = ['Task Name','Assigned To','Status','Due Date','Priority','Notes'];
    const rows = tasks.map(t => [
      t.title,
      t.assignedTo || '',
      t.status,
      t.dueDate || '',
      t.priority,
      (t.notes || '').replace(/\n/g, ' ')
    ]);
    const csv = [headers, ...rows]
      .map(r => r.map(field => `"${String(field).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    return csv;
  },

  exportTasksToExcelHTML(tasks: OrgTask[]): string {
    const head = '<tr><th>Task Name</th><th>Assigned To</th><th>Status</th><th>Due Date</th><th>Priority</th><th>Notes</th></tr>';
    const body = tasks.map(t => `<tr>
      <td>${t.title}</td>
      <td>${t.assignedTo || ''}</td>
      <td>${t.status}</td>
      <td>${t.dueDate || ''}</td>
      <td>${t.priority}</td>
      <td>${(t.notes || '').replace(/</g,'&lt;')}</td>
    </tr>`).join('');
    return `<table>${head}${body}</table>`;
  },

  exportTasksToPDFHTML(tasks: OrgTask[]): string {
    const table = this.exportTasksToExcelHTML(tasks);
    return `<!doctype html><html><head><meta charset="utf-8" /><title>Tasks PDF</title>
      <style>table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:8px;text-align:left}th{background:#f3f4f6}</style>
      </head><body>${table}<script>window.print();</script></body></html>`;
  }
};
