import React, { useEffect, useMemo, useState } from 'react';
import { companyOrgService, OrgFolder, OrgTask, OrgCategory, OrgStatus, OrgPriority, OrgFile } from '../services/companyOrgService';
import OrganizeContentEditor from './OrganizeContentEditor';
import TaskForm from './forms/TaskForm';
import PlanForm from './forms/PlanForm';
import BlueprintForm from './forms/BlueprintForm';
import PlanDetails from './PlanDetails';
import BlueprintDetails from './BlueprintDetails';
import PlanTable from './PlanTable';
import BlueprintTable from './BlueprintTable';
import { useNavigate } from 'react-router-dom';

const categories: OrgCategory[] = ['magazine','event','project','other'];
const statuses: OrgStatus[] = ['planned','in_progress','completed','blocked','cancelled'];
const priorities: OrgPriority[] = ['low','medium','high'];

const OrganizePanel: React.FC = () => {
  const [folders, setFolders] = useState<OrgFolder[]>([]);
  const [filesByFolder, setFilesByFolder] = useState<Record<string, OrgFile[]>>({});
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [tasks, setTasks] = useState<OrgTask[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFileName, setNewFileName] = useState('');

  const [newTask, setNewTask] = useState<Omit<OrgTask,'id'|'createdAt'|'updatedAt'>>({
    folderId: '',
    fileId: '',
    title: '',
    assignedTo: '',
    category: 'project',
    status: 'planned',
    priority: 'medium',
    dueDate: '',
    notes: ''
  });

  const [filterStatus, setFilterStatus] = useState<string>('');
  const [filterDueDate, setFilterDueDate] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const [toast, setToast] = useState<string>('');
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showBlueprintForm, setShowBlueprintForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);

  // NEW: load all tasks across folder when in tasks view
  const [allTasks, setAllTasks] = useState<OrgTask[]>([]);
  const navigate = useNavigate();
  const [planRefresh, setPlanRefresh] = useState(0);
  const [blueprintRefresh, setBlueprintRefresh] = useState(0);

  useEffect(() => {
    (async () => {
      const f = await companyOrgService.listFolders();
      setFolders(f);
      const map: Record<string, OrgFile[]> = {};
      for (const folder of f) {
        const fl = await companyOrgService.listFilesByFolder(folder.id!);
        map[folder.id!] = fl;
      }
      setFilesByFolder(map);
      // Start with overview (no file selected)
      setSelectedFolderId('');
      setSelectedFileId('');
    })();
  }, []);

  useEffect(() => {
    if (!selectedFileId) return;
    setLoading(true);
    (async () => {
      const list = await companyOrgService.listTasksByFile(selectedFileId);
      setTasks(list);
      setLoading(false);
      setNewTask(prev => ({ ...prev, folderId: selectedFolderId, fileId: selectedFileId }));
    })();
  }, [selectedFileId, selectedFolderId]);

  useEffect(() => {
    // when viewing tasks section, load all tasks from all task files in the folder
    const loadAllTasks = async () => {
      if (!selectedFolderId) return;
      // find task files in this folder
      const files = await companyOrgService.listFilesByFolder(selectedFolderId);
      const taskFiles = (files || []).filter((f: any) => f.kind === 'tasks');
      const aggregated: OrgTask[] = [];
      for (const f of taskFiles) {
        const list = await companyOrgService.listTasksByFile(f.id!);
        aggregated.push(...list);
      }
      // sort by createdAt desc if present
      aggregated.sort((a, b) => {
        const at = (a.createdAt?.toMillis?.() || a.createdAt?.seconds * 1000 || 0);
        const bt = (b.createdAt?.toMillis?.() || b.createdAt?.seconds * 1000 || 0);
        return bt - at;
      });
      setAllTasks(aggregated);
    };
    // detect if current section is tasks
    const current = (filesByFolder[selectedFolderId]||[]).find(f=>f.id===selectedFileId);
    const kind = current?.kind || 'docs';
    if (kind === 'tasks') {
      loadAllTasks();
    }
  }, [selectedFolderId, selectedFileId, filesByFolder]);

  const refreshFolders = async () => {
    const f = await companyOrgService.listFolders();
    setFolders(f);
    const map: Record<string, OrgFile[]> = {};
    for (const folder of f) {
      const fl = await companyOrgService.listFilesByFolder(folder.id!);
      map[folder.id!] = fl;
    }
    setFilesByFolder(map);
  };

  const toggleFolder = (id: string) => {
    setExpandedFolders(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    const id = await companyOrgService.createFolder(newFolderName.trim());
    await refreshFolders();
    setExpandedFolders(prev => ({ ...prev, [id]: true }));
    setSelectedFolderId(id);
    setShowNewFolderModal(false);
    setNewFolderName('');
  };

  const handleCreateFile = async () => {
    if (!selectedFolderId || !newFileName.trim()) return;
    const id = await companyOrgService.createFile(selectedFolderId, newFileName.trim());
    await refreshFolders();
    setSelectedFileId(id);
    setShowNewFileModal(false);
    setNewFileName('');
  };

  const quickCreateFolder = async (name: string) => {
    const id = await companyOrgService.createFolder(name);
    await refreshFolders();
    setExpandedFolders(prev => ({ ...prev, [id]: true }));
  };

  const handleCreateTask = async () => {
    if (!newTask.folderId || !newTask.fileId || !newTask.title) return;
    await companyOrgService.createTask(newTask);
    const updated = await companyOrgService.listTasksByFile(newTask.fileId);
    setTasks(updated);
    setNewTask(prev => ({ ...prev, title: '', notes: '' }));
  };

  const handleUpdateTask = async (taskId: string, data: Partial<OrgTask>) => {
    await companyOrgService.updateTask(taskId, data);
    const updated = await companyOrgService.listTasksByFile(selectedFileId);
    setTasks(updated);
  };

  // Filters now work on allTasks when in tasks section
  const filteredTasks = useMemo(() => {
    const current = (filesByFolder[selectedFolderId]||[]).find(f=>f.id===selectedFileId);
    const kind = current?.kind || 'docs';
    const source = kind === 'tasks' ? allTasks : tasks;
    return source.filter(t => {
      if (filterStatus && t.status !== (filterStatus as any)) return false;
      if (filterDueDate && t.dueDate && t.dueDate < filterDueDate) return false;
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [allTasks, tasks, filterStatus, filterDueDate, search, selectedFolderId, selectedFileId, filesByFolder]);

  const downloadCSV = () => {
    const csv = companyOrgService.exportTasksToCSV(filteredTasks);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasks.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadExcel = () => {
    const html = companyOrgService.exportTasksToExcelHTML(filteredTasks);
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasks.xls';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPDF = () => {
    const html = companyOrgService.exportTasksToPDFHTML(filteredTasks);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
    }
  };

  const [blueprints, setBlueprints] = useState<any[]>([]);
  useEffect(() => {
    (async () => {
      const list = await companyOrgService.listBlueprints();
      setBlueprints(list);
    })();
  }, []);

  const saveBlueprint = async () => {
    if (!selectedFolderId || !selectedFileId) return;
    const folder = folders.find(f => f.id === selectedFolderId)!;
    const file = (filesByFolder[selectedFolderId] || []).find(f => f.id === selectedFileId)!;
    await companyOrgService.saveBlueprintFromFile(folder, file, tasks);
    const list = await companyOrgService.listBlueprints();
    setBlueprints(list);
  };

  const applyBlueprint = async (blueprintId: string) => {
    if (!selectedFolderId) return;
    const newFileId = await companyOrgService.instantiateBlueprint(blueprintId, selectedFolderId, `From Blueprint ${Date.now()}`);
    await refreshFolders();
    setSelectedFileId(newFileId);
  };

  const table = useMemo(() => (
    <div className="overflow-auto border rounded-xl bg-white">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left">Task Name</th>
            <th className="px-3 py-2 text-left">Assigned To</th>
            <th className="px-3 py-2 text-left">Status</th>
            <th className="px-3 py-2 text-left">Due Date</th>
            <th className="px-3 py-2 text-left">Priority</th>
            <th className="px-3 py-2 text-left">Notes</th>
            <th className="px-3 py-2 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredTasks.map(t => (
            <tr key={t.id} className="border-t">
              <td className="px-3 py-2">
                <input className="w-full" defaultValue={t.title} onBlur={e => handleUpdateTask(t.id!, { title: e.target.value })} />
              </td>
              <td className="px-3 py-2">
                <input className="w-full" defaultValue={t.assignedTo || ''} onBlur={e => handleUpdateTask(t.id!, { assignedTo: e.target.value })} />
              </td>
              <td className="px-3 py-2">
                <select defaultValue={t.status} onChange={e => handleUpdateTask(t.id!, { status: e.target.value as OrgStatus })}>
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td className="px-3 py-2">
                <input className="w-full" defaultValue={t.dueDate || ''} onBlur={e => handleUpdateTask(t.id!, { dueDate: e.target.value })} />
              </td>
              <td className="px-3 py-2">
                <select defaultValue={t.priority} onChange={e => handleUpdateTask(t.id!, { priority: e.target.value as OrgPriority })}>
                  {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </td>
              <td className="px-3 py-2">
                <input className="w-full" defaultValue={t.notes || ''} onBlur={e => handleUpdateTask(t.id!, { notes: e.target.value })} />
              </td>
              <td className="px-3 py-2">
                <button className="px-2 py-1 bg-green-600 text-white rounded" onClick={() => handleUpdateTask(t.id!, { status: 'completed' })}>Complete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {filteredTasks.length === 0 && (
        <div className="p-4 text-gray-500">No tasks yet</div>
      )}
    </div>
  ), [filteredTasks]);

  const overview = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Organize</h2>
          <p className="text-gray-500">Create folders to group your company work (e.g., any name you choose). Then add files inside a folder for Tasks, Plans, Blueprints, Docs, or Notes.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button className="px-3 py-2 bg-blue-600 text-white rounded-lg" onClick={() => setShowNewFolderModal(true)}>New Folder</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {folders.map(folder => {
          const files = filesByFolder[folder.id!] || [];
          return (
            <div key={folder.id} className="rounded-2xl border bg-white p-5 hover:shadow-md transition cursor-pointer" onClick={() => { setSelectedFolderId(folder.id!); setSelectedFileId(''); }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">📁</div>
                  <div>
                    <div className="font-semibold text-lg">{folder.name}</div>
                    <div className="text-xs text-gray-500">{files.length} file{files.length!==1?'s':''}</div>
                  </div>
                </div>
                <button className="px-2 py-1 text-sm border rounded-lg" onClick={(e) => { e.stopPropagation(); setSelectedFolderId(folder.id!); setShowNewFileModal(true); }}>New File</button>
              </div>
            </div>
          );
        })}
        {folders.length === 0 && (
          <div className="col-span-full text-center text-gray-500 py-10">No folders yet. Create one to get started.</div>
        )}
      </div>
    </div>
  );

  // Folder hub: shown when a folder is selected but no file yet
  const folderHub = selectedFolderId && !selectedFileId && (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">{folders.find(f => f.id===selectedFolderId)?.name}</h2>
          <p className="text-gray-500">Choose a section to manage. Click a section to open it.</p>
        </div>
        <div className="flex items-center space-x-2">
          <button className="px-3 py-2 bg-indigo-600 text-white rounded-lg" onClick={() => setShowNewFileModal(true)}>New File</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {label:'Tasks', desc:'Manage actionable items', kind:'tasks'},
          {label:'Plans', desc:'High-level planning docs', kind:'plans'},
          {label:'Blueprints', desc:'Reusable workflow templates', kind:'blueprints'},
          {label:'Docs', desc:'Specifications, briefs, SOPs', kind:'docs'},
          {label:'Notes', desc:'Meeting notes, ideas', kind:'notes'}
        ].map(card => (
          <div
            key={card.label}
            className="rounded-2xl border bg-white p-5 hover:shadow-md transition cursor-pointer"
            onClick={async () => {
              const existing = (filesByFolder[selectedFolderId]||[]).find(f => (f as any).kind === card.kind);
              if (existing) {
                setSelectedFileId(existing.id!);
              } else {
                const id = await companyOrgService.createFile(selectedFolderId, `${card.label}`, '', card.kind as any);
                await refreshFolders();
                setSelectedFileId(id);
              }
            }}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-lg">{card.label}</div>
                <div className="text-sm text-gray-500">{card.desc}</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">📁</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <button className="px-3 py-2 border rounded-lg" onClick={() => navigate('/admin_dashboard')}>Back</button>
        <div />
      </div>
      {/* Render: no folder → overview; folder no file → folderHub; folder+file → section content */}
      {!selectedFolderId ? (
        overview
      ) : (!selectedFileId ? (
        folderHub
      ) : (
        <>
          {/* Header / toolbar */}
          <div className="flex items-center justify-between">
            <div className="text-xl font-bold">{folders.find(f => f.id===selectedFolderId)?.name} / {(filesByFolder[selectedFolderId]||[]).find(f=>f.id===selectedFileId)?.name}</div>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-2 border rounded-lg" onClick={() => setSelectedFileId('')}>Back to Folder</button>
              <button className="px-3 py-2 bg-indigo-600 text-white rounded-lg" onClick={() => selectedFolderId && setShowNewFileModal(true)} disabled={!selectedFolderId}>New File</button>
            </div>
          </div>

          {(() => {
            const current = (filesByFolder[selectedFolderId]||[]).find(f=>f.id===selectedFileId);
            const kind = current?.kind || 'docs';
            if (kind === 'tasks') {
              // task export helpers
              const exportTasksExcel = () => {
                const html = companyOrgService.exportTasksToExcelHTML(filteredTasks);
                const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'tasks.xls'; a.click();
                URL.revokeObjectURL(url);
              };
              const exportTasksPDF = () => {
                const html = companyOrgService.exportTasksToPDFHTML(filteredTasks);
                const win = window.open('', '_blank');
                if (win) { win.document.write(html); win.document.close(); }
              };
              const exportTasksWord = () => {
                const html = companyOrgService.exportTasksToExcelHTML(filteredTasks);
                const blob = new Blob([`<!doctype html><html><head><meta charset=\"utf-8\" /></head><body>${html}</body></html>`], { type: 'application/msword' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = 'tasks.doc'; a.click();
                URL.revokeObjectURL(url);
              };

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold">Tasks</div>
                    <div className="flex items-center space-x-2">
                      <button className="px-2 py-1 border rounded" onClick={downloadCSV}>CSV</button>
                      <button className="px-2 py-1 border rounded" onClick={exportTasksExcel}>Excel</button>
                      <button className="px-2 py-1 border rounded" onClick={exportTasksPDF}>PDF</button>
                      <button className="px-2 py-1 border rounded" onClick={exportTasksWord}>Word</button>
                      <button className="px-3 py-2 bg-blue-600 text-white rounded-lg" onClick={() => setShowTaskForm(true)}>Create Task</button>
                    </div>
                  </div>
                  {showTaskForm && (
                    <div className="p-4 bg-white rounded-xl border">
                      <TaskForm
                        folderId={selectedFolderId}
                        fileId={selectedFileId}
                        onDownload={downloadCSV}
                        onCreated={() => { showToast('Task created successfully'); setShowTaskForm(false); }}
                        onError={(m)=>showToast(m)}
                      />
                    </div>
                  )}
                  <div className="bg-white border rounded-xl overflow-x-hidden">
                    {/* Ensure a cohesive, wrapped table */}
                    {loading ? <div className="p-4">Loading...</div> : (
                      <div className="overflow-auto">
                        <table className="min-w-full text-sm table-fixed">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left w-2/6">Task Name</th>
                              <th className="px-3 py-2 text-left w-1/6">Assigned To</th>
                              <th className="px-3 py-2 text-left w-1/6">Status</th>
                              <th className="px-3 py-2 text-left w-1/6">Due Date</th>
                              <th className="px-3 py-2 text-left w-1/6">Priority</th>
                              <th className="px-3 py-2 text-left w-2/6">Notes</th>
                              <th className="px-3 py-2 text-left w-1/6">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredTasks.map(t => (
                              <tr key={t.id} className="border-t align-top">
                                <td className="px-3 py-2 truncate whitespace-pre-wrap">{t.title}</td>
                                <td className="px-3 py-2 truncate">{t.assignedTo || ''}</td>
                                <td className="px-3 py-2 capitalize truncate">{t.status}</td>
                                <td className="px-3 py-2 truncate">{t.dueDate || ''}</td>
                                <td className="px-3 py-2 truncate">{t.priority}</td>
                                <td className="px-3 py-2 whitespace-pre-wrap">{t.notes || ''}</td>
                                <td className="px-3 py-2">
                                  <button className="px-2 py-1 bg-green-600 text-white rounded" onClick={() => handleUpdateTask(t.id!, { status: 'completed' as any })}>Complete</button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {filteredTasks.length === 0 && (
                          <div className="p-4 text-gray-500">No tasks yet</div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            }

            if (kind === 'plans') {
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold">Plans</div>
                    <button className="px-3 py-2 bg-blue-600 text-white rounded-lg" onClick={() => setShowPlanForm(true)}>Create Plan</button>
                  </div>
                  {showPlanForm && (
                    <div className="p-4 bg-white rounded-xl border">
                      <PlanForm
                        folderId={selectedFolderId}
                        fileId={selectedFileId}
                        createMode={true}
                        onSaved={() => { showToast('Plan created successfully'); setShowPlanForm(false); setPlanRefresh(v=>v+1); }}
                        onToast={(m)=>showToast(m)}
                      />
                    </div>
                  )}
                  <div className="bg-white border rounded-xl">
                    <PlanTable folderId={selectedFolderId} refreshToken={planRefresh} />
                  </div>
                </div>
              );
            }

            if (kind === 'blueprints') {
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold">Blueprints</div>
                    <button className="px-3 py-2 bg-blue-600 text-white rounded-lg" onClick={() => setShowBlueprintForm(true)}>Create Blueprint</button>
                  </div>
                  {showBlueprintForm && (
                    <div className="p-4 bg-white rounded-xl border">
                      <BlueprintForm
                        folderId={selectedFolderId}
                        fileId={selectedFileId}
                        createMode={true}
                        onSaved={() => { showToast('Blueprint created successfully'); setShowBlueprintForm(false); setBlueprintRefresh(v=>v+1); }}
                        onToast={(m)=>showToast(m)}
                      />
                    </div>
                  )}
                  <div className="bg-white border rounded-xl">
                    <BlueprintTable folderId={selectedFolderId} refreshToken={blueprintRefresh} />
                  </div>
                </div>
              );
            }

            return (
              <div className="p-4 bg-white border rounded-xl">
                <OrganizeContentEditor fileId={selectedFileId} initialKind={kind as any} />
              </div>
            );
          })()}
        </>
      ))}

      {/* Modals */}
      {showNewFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6">
            <h3 className="text-lg font-semibold mb-4">New Folder</h3>
            <input placeholder="Folder name" className="w-full px-3 py-2 border rounded-lg mb-4" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} />
            <div className="flex justify-end space-x-2">
              <button onClick={() => setShowNewFolderModal(false)} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800">Cancel</button>
              <button onClick={handleCreateFolder} className="px-4 py-2 rounded-lg bg-blue-600 text-white">Create</button>
            </div>
          </div>
        </div>
      )}
      {showNewFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6">
            <h3 className="text-lg font-semibold mb-4">New File</h3>
            <div className="space-y-3">
              <input placeholder="File name" className="w-full px-3 py-2 border rounded-lg" value={newFileName} onChange={e => setNewFileName(e.target.value)} />
              <select className="w-full px-3 py-2 border rounded-lg" id="new-file-kind">
                <option value="tasks">Tasks</option>
                <option value="plans">Plans</option>
                <option value="blueprints">Blueprints</option>
                <option value="docs">Docs</option>
                <option value="notes">Notes</option>
              </select>
            </div>
            <div className="flex justify-end space-x-2 mt-4">
              <button onClick={() => setShowNewFileModal(false)} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800">Cancel</button>
              <button onClick={async () => {
                const kind = (document.getElementById('new-file-kind') as HTMLSelectElement).value as any;
                if (!selectedFolderId || !newFileName.trim()) return;
                const id = await companyOrgService.createFile(selectedFolderId, newFileName.trim(), '', kind);
                await refreshFolders();
                setSelectedFileId(id);
                setShowNewFileModal(false);
                setNewFileName('');
              }} className="px-4 py-2 rounded-lg bg-indigo-600 text-white">Create</button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-black text-white px-4 py-2 rounded-lg shadow-lg">{toast}</div>
      )}
    </div>
  );
};

export default OrganizePanel;
