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
import TargetForm from './forms/TargetForm';
import TargetTable from './TargetTable';
import ItemDetailView from './ItemDetailView';
import { useNavigate } from 'react-router-dom';
import { companyOrgEntitiesService } from '../services/companyOrgEntitiesService';
import { companyTargetsService } from '../services/companyTargetsService';

const categories: OrgCategory[] = ['magazine','event','project','other'];
const statuses: OrgStatus[] = ['planned','in_progress','completed','blocked','cancelled'];
const priorities: OrgPriority[] = ['low','medium','high'];

const OrganizePanel: React.FC = () => {
  const [folders, setFolders] = useState<OrgFolder[]>([]);
  const [filesByFolder, setFilesByFolder] = useState<Record<string, OrgFile[]>>({});
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [selectedFolderId, setSelectedFolderId] = useState<string>('');
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [showTasksShareDropdown, setShowTasksShareDropdown] = useState(false);
  const [showPlansShareDropdown, setShowPlansShareDropdown] = useState(false);
  const [showTargetsShareDropdown, setShowTargetsShareDropdown] = useState(false);
  const [showBlueprintsShareDropdown, setShowBlueprintsShareDropdown] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<string>('');
  const [showFormatOptions, setShowFormatOptions] = useState(false);
  
  // Detail view state
  const [showDetailView, setShowDetailView] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [selectedItemType, setSelectedItemType] = useState<'task' | 'plan' | 'blueprint' | 'target'>('task');

  // Close dropdown when clicking outside (but not inside dropdown items)
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Check if clicking outside any dropdown
      const isOutsideTasks = showTasksShareDropdown && !document.querySelector('[data-tasks-share-dropdown]')?.contains(target);
      const isOutsidePlans = showPlansShareDropdown && !document.querySelector('[data-plans-share-dropdown]')?.contains(target);
      const isOutsideTargets = showTargetsShareDropdown && !document.querySelector('[data-targets-share-dropdown]')?.contains(target);
      const isOutsideBlueprints = showBlueprintsShareDropdown && !document.querySelector('[data-blueprints-share-dropdown]')?.contains(target);
      
      // Close format options if clicking outside any active dropdown
      if (showFormatOptions && (isOutsideTasks || isOutsidePlans || isOutsideTargets || isOutsideBlueprints)) {
        setShowFormatOptions(false);
      }
      
      // Close main dropdowns if clicking outside
      if (isOutsideTasks) {
        setShowTasksShareDropdown(false);
      }
      if (isOutsidePlans) {
        setShowPlansShareDropdown(false);
      }
      if (isOutsideTargets) {
        setShowTargetsShareDropdown(false);
      }
      if (isOutsideBlueprints) {
        setShowBlueprintsShareDropdown(false);
      }
    };
    
    if (showTasksShareDropdown || showPlansShareDropdown || showTargetsShareDropdown || showBlueprintsShareDropdown || showFormatOptions) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showTasksShareDropdown, showPlansShareDropdown, showTargetsShareDropdown, showBlueprintsShareDropdown, showFormatOptions]);
  const [tasks, setTasks] = useState<OrgTask[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showNewFileModal, setShowNewFileModal] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState<{
    kind: 'folder'|'file'|''; id: string; name: string;
  }>({ kind: '', id: '', name: '' });
  const [confirmDelete, setConfirmDelete] = useState<{
    kind: 'folder'|'file'|''; id: string; name: string;
  }>({ kind: '', id: '', name: '' });
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

  // Detail view handlers
  const handleViewDetails = (item: any, itemType: 'task' | 'plan' | 'blueprint' | 'target') => {
    console.log('🔍 handleViewDetails called with:', { item, itemType });
    
    // Map the item data to ensure proper field structure for ItemDetailView
    let mappedItem = { ...item };
    
    if (itemType === 'task') {
      // Ensure task has all required fields for ItemDetailView
      mappedItem = {
        ...item,
        title: item.title || 'Untitled Task',
        assignedTo: item.assignedTo || 'Unassigned',
        status: item.status || 'planned',
        priority: item.priority || 'medium',
        dueDate: item.dueDate || '',
        category: item.category || 'other',
        description: item.description || '',
        notes: item.notes || '',
        attachments: item.attachments || []
      };
    }
    
    console.log('🔍 Mapped item:', mappedItem);
    console.log('🔍 Setting showDetailView to true');
    
    setSelectedItem(mappedItem);
    setSelectedItemType(itemType);
    setShowDetailView(true);
  };

  const handleCloseDetailView = () => {
    setShowDetailView(false);
    setSelectedItem(null);
  };

  const [toast, setToast] = useState<string>('');
  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2000);
  };

  const [showPlanForm, setShowPlanForm] = useState(false);
  const [showBlueprintForm, setShowBlueprintForm] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [showTargetForm, setShowTargetForm] = useState(false);

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

  const shareCSV = () => {
    console.log('shareCSV called - filteredTasks:', filteredTasks.length);
    if (filteredTasks.length === 0) {
      alert('No tasks to share');
      return;
    }
    const csv = companyOrgService.exportTasksToCSV(filteredTasks);
    
    // Create CSV blob for email attachment
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const reader = new FileReader();
    reader.onload = function() {
      const subject = encodeURIComponent('Tasks Export - CSV');
      const body = encodeURIComponent(`Please find the tasks data attached.\n\nTotal records: ${filteredTasks.length}\n\nThis CSV file contains all task details including names, assignments, status, dates, and priorities.`);
      
      // Try Web Share API first
      if (navigator.share) {
        navigator.share({
          title: 'Tasks Export - CSV',
          text: `Tasks data (${filteredTasks.length} records)`,
          files: [new File([blob], 'tasks.csv', { type: 'text/csv' })]
        }).catch(() => {
          // Fallback to email
          window.open(`mailto:?subject=${subject}&body=${body}`);
        });
      } else {
        // Fallback to email
        window.open(`mailto:?subject=${subject}&body=${body}`);
      }
    };
    reader.readAsDataURL(blob);
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

  const shareExcel = () => {
    console.log('shareExcel called - filteredTasks:', filteredTasks.length);
    if (filteredTasks.length === 0) {
      alert('No tasks to share');
      return;
    }
    const html = companyOrgService.exportTasksToExcelHTML(filteredTasks);
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    
    const reader = new FileReader();
    reader.onload = function() {
      const subject = encodeURIComponent('Tasks Export - Excel');
      const body = encodeURIComponent(`Please find the tasks data attached.\n\nTotal records: ${filteredTasks.length}\n\nThis Excel file contains all task details in a formatted table.`);
      
      // Try Web Share API first
      if (navigator.share) {
        navigator.share({
          title: 'Tasks Export - Excel',
          text: `Tasks data (${filteredTasks.length} records)`,
          files: [new File([blob], 'tasks.xls', { type: 'application/vnd.ms-excel' })]
        }).catch(() => {
          // Fallback to email
          window.open(`mailto:?subject=${subject}&body=${body}`);
        });
      } else {
        // Fallback to email
        window.open(`mailto:?subject=${subject}&body=${body}`);
      }
    };
    reader.readAsDataURL(blob);
  };

  const sharePDF = () => {
    console.log('sharePDF called - filteredTasks:', filteredTasks.length);
    if (filteredTasks.length === 0) {
      alert('No tasks to share');
      return;
    }
    const html = companyOrgService.exportTasksToPDFHTML(filteredTasks);
    const blob = new Blob([html], { type: 'text/html' });
    
    const reader = new FileReader();
    reader.onload = function() {
      const subject = encodeURIComponent('Tasks Export - PDF');
      const body = encodeURIComponent(`Please find the tasks data attached.\n\nTotal records: ${filteredTasks.length}\n\nThis PDF file contains all task details in a formatted document.`);
      
      // Try Web Share API first
      if (navigator.share) {
        navigator.share({
          title: 'Tasks Export - PDF',
          text: `Tasks data (${filteredTasks.length} records)`,
          files: [new File([blob], 'tasks.html', { type: 'text/html' })]
        }).catch(() => {
          // Fallback to email
          window.open(`mailto:?subject=${subject}&body=${body}`);
        });
      } else {
        // Fallback to email
        window.open(`mailto:?subject=${subject}&body=${body}`);
      }
    };
    reader.readAsDataURL(blob);
  };

  const shareWord = () => {
    console.log('shareWord called - filteredTasks:', filteredTasks.length);
    if (filteredTasks.length === 0) {
      alert('No tasks to share');
      return;
    }
    
    // Create a proper Word document with table formatting
    const html = companyOrgService.exportTasksToExcelHTML(filteredTasks);
    const wordContent = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="Microsoft Word 15">
<meta name="Originator" content="Microsoft Word 15">
<!--[if gte mso 9]><xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>90</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml><![endif]-->
<style>
table { border-collapse: collapse; width: 100%; }
th, td { border: 1px solid #000; padding: 8px; text-align: left; }
th { background-color: #f2f2f2; font-weight: bold; }
</style>
</head>
<body>
<h1>Tasks Export</h1>
<p>Total Records: ${filteredTasks.length}</p>
${html}
</body>
</html>`;
    
    const blob = new Blob([wordContent], { type: 'application/msword' });
    
    const reader = new FileReader();
    reader.onload = function() {
      const subject = encodeURIComponent('Tasks Export - Word Document');
      const body = encodeURIComponent(`Please find the tasks data attached.\n\nTotal records: ${filteredTasks.length}\n\nThis Word document contains all task details in a formatted table.`);
      
      // Try Web Share API first
      if (navigator.share) {
        navigator.share({
          title: 'Tasks Export - Word',
          text: `Tasks data (${filteredTasks.length} records)`,
          files: [new File([blob], 'tasks.doc', { type: 'application/msword' })]
        }).catch(() => {
          // Fallback to email
          window.open(`mailto:?subject=${subject}&body=${body}`);
        });
      } else {
        // Fallback to email
        window.open(`mailto:?subject=${subject}&body=${body}`);
      }
    };
    reader.readAsDataURL(blob);
  };

  const shareTasks = async () => {
    console.log('shareTasks called - tasks:', tasks.length, 'allTasks:', allTasks.length);
    const sourceTasks = tasks.length > 0 ? tasks : allTasks;
    if (!sourceTasks.length) return;
    const csv = companyOrgService.exportTasksToCSV(sourceTasks);
    
    try {
      // Try Web Share API with text first (more reliable)
      if (navigator.share) {
        await navigator.share({
          title: 'Tasks Export',
          text: `Tasks data (${sourceTasks.length} records):\n\n${csv.substring(0, 1000)}${csv.length > 1000 ? '...' : ''}`,
          url: window.location.href
        });
        return;
      }
    } catch (err) {
      console.log('Web Share failed, falling back to email');
    }
    
    // Fallback: Email with CSV as attachment
    const subject = encodeURIComponent('Tasks Export');
    const body = encodeURIComponent(`Please find the tasks data attached.\n\nTotal records: ${sourceTasks.length}\n\nCSV Data:\n${csv}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  // Folder sharing functions
  const generateFolderData = async (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return null;

    const files = filesByFolder[folderId] || [];
    let allTasks: OrgTask[] = [];
    let allPlans: any[] = [];
    let allBlueprints: any[] = [];
    let allTargets: any[] = [];

    // Collect all data from the folder
    for (const file of files) {
      if (file.kind === 'tasks') {
        const tasks = await companyOrgService.listTasksByFile(file.id!);
        allTasks = [...allTasks, ...tasks];
      } else if (file.kind === 'plans') {
        const plans = await companyOrgEntitiesService.listPlansByFile(file.id!);
        allPlans = [...allPlans, ...plans.map(p => p.plan)];
      } else if (file.kind === 'blueprints') {
        const blueprints = await companyOrgEntitiesService.listBlueprintsByFile(file.id!);
        allBlueprints = [...allBlueprints, ...blueprints.map(b => b.blueprint)];
      } else if (file.kind === 'targets') {
        const targets = await companyTargetsService.listTargetsByFile(file.id!);
        allTargets = [...allTargets, ...targets];
      }
    }

    return {
      folder,
      files,
      tasks: allTasks,
      plans: allPlans,
      blueprints: allBlueprints,
      targets: allTargets
    };
  };

  const shareFolderAsCSV = async (folderId: string) => {
    const data = await generateFolderData(folderId);
    if (!data) return;

    const { folder, tasks, plans, blueprints, targets } = data;
    
    let csvContent = `Folder: ${folder.name}\n`;
    csvContent += `Created: ${folder.createdAt}\n`;
    csvContent += `Files: ${data.files.length}\n\n`;

    if (tasks.length > 0) {
      csvContent += `TASKS (${tasks.length} records)\n`;
      csvContent += 'Task Name,Assigned To,Status,Due Date,Priority,Notes\n';
      tasks.forEach(task => {
        csvContent += `"${task.title}","${task.assignedTo || ''}","${task.status}","${task.dueDate || ''}","${task.priority}","${(task.notes || '').replace(/"/g, '""')}"\n`;
      });
      csvContent += '\n';
    }

    if (plans.length > 0) {
      csvContent += `PLANS (${plans.length} records)\n`;
      csvContent += 'Name,Owner,Status,Start Date,End Date,Progress,Description,Notes\n';
      plans.forEach(plan => {
        csvContent += `"${plan.name}","${plan.owner}","${plan.status}","${plan.start_date || ''}","${plan.end_date || ''}","${plan.progress || ''}","${(plan.description || '').replace(/"/g, '""')}","${(plan.notes || '').replace(/"/g, '""')}"\n`;
      });
      csvContent += '\n';
    }

    if (blueprints.length > 0) {
      csvContent += `BLUEPRINTS (${blueprints.length} records)\n`;
      csvContent += 'Name,Category,Version,Created By,Description,Default Tasks\n';
      blueprints.forEach(bp => {
        csvContent += `"${bp.name}","${bp.category || ''}","${bp.version}","${bp.created_by}","${(bp.description || '').replace(/"/g, '""')}","${(bp.default_tasks || []).join(' | ')}"\n`;
      });
      csvContent += '\n';
    }

    if (targets.length > 0) {
      csvContent += `TARGETS (${targets.length} records)\n`;
      csvContent += 'Title,Type,Value,Unit,Start Date,End Date,Department,Owner,Progress,Status,Notes\n';
      targets.forEach(target => {
        csvContent += `"${target.title}","${target.targetType}","${target.targetValue || ''}","${target.targetUnit || ''}","${target.startDate || ''}","${target.endDate || ''}","${target.department || ''}","${target.owner || ''}","${target.progress || ''}","${target.status || ''}","${(target.notes || '').replace(/"/g, '""')}"\n`;
      });
    }

    const subject = encodeURIComponent(`Folder Export: ${folder.name}`);
    const body = encodeURIComponent(`Please find the folder data attached.\n\nFolder: ${folder.name}\nTotal Files: ${data.files.length}\nTasks: ${tasks.length}\nPlans: ${plans.length}\nBlueprints: ${blueprints.length}\nTargets: ${targets.length}\n\nCSV Data:\n${csvContent}`);
    
    // Try WhatsApp first
    const whatsappText = encodeURIComponent(`📁 *${folder.name}* Folder Export\n\nFiles: ${data.files.length}\nTasks: ${tasks.length}\nPlans: ${plans.length}\nBlueprints: ${blueprints.length}\nTargets: ${targets.length}\n\nView full data: ${window.location.href}`);
    window.open(`https://wa.me/?text=${whatsappText}`);
  };

  const shareFolderAsPDF = async (folderId: string) => {
    const data = await generateFolderData(folderId);
    if (!data) return;

    const { folder, tasks, plans, blueprints, targets } = data;
    
    let htmlContent = `
      <html>
        <head>
          <title>Folder Export: ${folder.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #2563eb; }
            h2 { color: #374151; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>📁 ${folder.name}</h1>
          <p><strong>Created:</strong> ${folder.createdAt}</p>
          <p><strong>Total Files:</strong> ${data.files.length}</p>
          <p><strong>Summary:</strong> Tasks: ${tasks.length}, Plans: ${plans.length}, Blueprints: ${blueprints.length}, Targets: ${targets.length}</p>
    `;

    if (tasks.length > 0) {
      htmlContent += `<h2>TASKS (${tasks.length} records)</h2><table><tr><th>Task Name</th><th>Assigned To</th><th>Status</th><th>Due Date</th><th>Priority</th><th>Notes</th></tr>`;
      tasks.forEach(task => {
        htmlContent += `<tr><td>${task.title}</td><td>${task.assignedTo || ''}</td><td>${task.status}</td><td>${task.dueDate || ''}</td><td>${task.priority}</td><td>${task.notes || ''}</td></tr>`;
      });
      htmlContent += '</table>';
    }

    if (plans.length > 0) {
      htmlContent += `<h2>PLANS (${plans.length} records)</h2><table><tr><th>Name</th><th>Owner</th><th>Status</th><th>Start Date</th><th>End Date</th><th>Progress</th><th>Description</th><th>Notes</th></tr>`;
      plans.forEach(plan => {
        htmlContent += `<tr><td>${plan.name}</td><td>${plan.owner}</td><td>${plan.status}</td><td>${plan.start_date || ''}</td><td>${plan.end_date || ''}</td><td>${plan.progress || ''}</td><td>${plan.description || ''}</td><td>${plan.notes || ''}</td></tr>`;
      });
      htmlContent += '</table>';
    }

    if (blueprints.length > 0) {
      htmlContent += `<h2>BLUEPRINTS (${blueprints.length} records)</h2><table><tr><th>Name</th><th>Category</th><th>Version</th><th>Created By</th><th>Description</th><th>Default Tasks</th></tr>`;
      blueprints.forEach(bp => {
        htmlContent += `<tr><td>${bp.name}</td><td>${bp.category || ''}</td><td>${bp.version}</td><td>${bp.created_by}</td><td>${bp.description || ''}</td><td>${(bp.default_tasks || []).join(', ')}</td></tr>`;
      });
      htmlContent += '</table>';
    }

    if (targets.length > 0) {
      htmlContent += `<h2>TARGETS (${targets.length} records)</h2><table><tr><th>Title</th><th>Type</th><th>Value</th><th>Unit</th><th>Start Date</th><th>End Date</th><th>Department</th><th>Owner</th><th>Progress</th><th>Status</th><th>Notes</th></tr>`;
      targets.forEach(target => {
        htmlContent += `<tr><td>${target.title}</td><td>${target.targetType}</td><td>${target.targetValue || ''}</td><td>${target.targetUnit || ''}</td><td>${target.startDate || ''}</td><td>${target.endDate || ''}</td><td>${target.department || ''}</td><td>${target.owner || ''}</td><td>${target.progress || ''}</td><td>${target.status || ''}</td><td>${target.notes || ''}</td></tr>`;
      });
      htmlContent += '</table>';
    }

    htmlContent += '</body></html>';

    const win = window.open('', '_blank');
    if (win) {
      win.document.write(htmlContent);
      win.document.close();
    }
  };

  const shareFolderAsWord = async (folderId: string) => {
    const data = await generateFolderData(folderId);
    if (!data) return;

    const { folder, tasks, plans, blueprints, targets } = data;
    
    let htmlContent = `
      <html>
        <head>
          <title>Folder Export: ${folder.name}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #2563eb; }
            h2 { color: #374151; margin-top: 30px; }
            table { width: 100%; border-collapse: collapse; margin: 10px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; }
          </style>
        </head>
        <body>
          <h1>📁 ${folder.name}</h1>
          <p><strong>Created:</strong> ${folder.createdAt}</p>
          <p><strong>Total Files:</strong> ${data.files.length}</p>
          <p><strong>Summary:</strong> Tasks: ${tasks.length}, Plans: ${plans.length}, Blueprints: ${blueprints.length}, Targets: ${targets.length}</p>
    `;

    if (tasks.length > 0) {
      htmlContent += `<h2>TASKS (${tasks.length} records)</h2><table><tr><th>Task Name</th><th>Assigned To</th><th>Status</th><th>Due Date</th><th>Priority</th><th>Notes</th></tr>`;
      tasks.forEach(task => {
        htmlContent += `<tr><td>${task.title}</td><td>${task.assignedTo || ''}</td><td>${task.status}</td><td>${task.dueDate || ''}</td><td>${task.priority}</td><td>${task.notes || ''}</td></tr>`;
      });
      htmlContent += '</table>';
    }

    if (plans.length > 0) {
      htmlContent += `<h2>PLANS (${plans.length} records)</h2><table><tr><th>Name</th><th>Owner</th><th>Status</th><th>Start Date</th><th>End Date</th><th>Progress</th><th>Description</th><th>Notes</th></tr>`;
      plans.forEach(plan => {
        htmlContent += `<tr><td>${plan.name}</td><td>${plan.owner}</td><td>${plan.status}</td><td>${plan.start_date || ''}</td><td>${plan.end_date || ''}</td><td>${plan.progress || ''}</td><td>${plan.description || ''}</td><td>${plan.notes || ''}</td></tr>`;
      });
      htmlContent += '</table>';
    }

    if (blueprints.length > 0) {
      htmlContent += `<h2>BLUEPRINTS (${blueprints.length} records)</h2><table><tr><th>Name</th><th>Category</th><th>Version</th><th>Created By</th><th>Description</th><th>Default Tasks</th></tr>`;
      blueprints.forEach(bp => {
        htmlContent += `<tr><td>${bp.name}</td><td>${bp.category || ''}</td><td>${bp.version}</td><td>${bp.created_by}</td><td>${bp.description || ''}</td><td>${(bp.default_tasks || []).join(', ')}</td></tr>`;
      });
      htmlContent += '</table>';
    }

    if (targets.length > 0) {
      htmlContent += `<h2>TARGETS (${targets.length} records)</h2><table><tr><th>Title</th><th>Type</th><th>Value</th><th>Unit</th><th>Start Date</th><th>End Date</th><th>Department</th><th>Owner</th><th>Progress</th><th>Status</th><th>Notes</th></tr>`;
      targets.forEach(target => {
        htmlContent += `<tr><td>${target.title}</td><td>${target.targetType}</td><td>${target.targetValue || ''}</td><td>${target.targetUnit || ''}</td><td>${target.startDate || ''}</td><td>${target.endDate || ''}</td><td>${target.department || ''}</td><td>${target.owner || ''}</td><td>${target.progress || ''}</td><td>${target.status || ''}</td><td>${target.notes || ''}</td></tr>`;
      });
      htmlContent += '</table>';
    }

    htmlContent += '</body></html>';

    const blob = new Blob([htmlContent], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${folder.name}_export.doc`;
    a.click();
    URL.revokeObjectURL(url);
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
            <tr key={t.id} className="border-t hover:bg-gray-50">
              <td className="px-3 py-2">
                <div className="flex items-center">
                  <input className="w-full" defaultValue={t.title} onBlur={e => handleUpdateTask(t.id!, { title: e.target.value })} onClick={(e) => e.stopPropagation()} />
                  <button 
                    className="ml-2 px-2 py-1 bg-blue-600 text-white rounded text-xs" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDetails(t, 'task');
                    }}
                    title="View Details"
                  >
                    👁️
                  </button>
                </div>
              </td>
              <td className="px-3 py-2">
                <input className="w-full" defaultValue={t.assignedTo || ''} onBlur={e => handleUpdateTask(t.id!, { assignedTo: e.target.value })} onClick={(e) => e.stopPropagation()} />
              </td>
              <td className="px-3 py-2">
                <select defaultValue={t.status} onChange={e => handleUpdateTask(t.id!, { status: e.target.value as OrgStatus })} onClick={(e) => e.stopPropagation()}>
                  {statuses.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td className="px-3 py-2">
                <input className="w-full" defaultValue={t.dueDate || ''} onBlur={e => handleUpdateTask(t.id!, { dueDate: e.target.value })} onClick={(e) => e.stopPropagation()} />
              </td>
              <td className="px-3 py-2">
                <select defaultValue={t.priority} onChange={e => handleUpdateTask(t.id!, { priority: e.target.value as OrgPriority })} onClick={(e) => e.stopPropagation()}>
                  {priorities.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </td>
              <td className="px-3 py-2">
                <div className="max-w-xs truncate" title={t.notes || ''}>
                  <input className="w-full" defaultValue={t.notes || ''} onBlur={e => handleUpdateTask(t.id!, { notes: e.target.value })} onClick={(e) => e.stopPropagation()} />
                </div>
              </td>
              <td className="px-3 py-2">
                <div className="flex space-x-1">
                  <button 
                    className="px-2 py-1 bg-green-600 text-white rounded text-xs" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDetails(t, 'task');
                    }}
                    title="View Details"
                  >
                    📋
                  </button>
                  <button 
                    className="px-2 py-1 bg-green-600 text-white rounded text-xs" 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleUpdateTask(t.id!, { status: 'completed' });
                    }}
                    title="Mark Complete"
                  >
                    ✓
                  </button>
                </div>
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
      <div className="mb-6">
        <div className="mb-3">
          <h2 className="text-2xl font-bold">Organize</h2>
          <p className="text-gray-500">Create folders to group your company work (e.g., any name you choose). Then add files inside a folder for Tasks, Plans, Blueprints, Docs, or Notes.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700" onClick={() => setShowNewFolderModal(true)}>Create Folder</button>
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
                <div className="flex items-center space-x-2">
                  <button className="px-2 py-1 text-sm border rounded-lg whitespace-nowrap" onClick={(e) => { e.stopPropagation(); setSelectedFolderId(folder.id!); setShowNewFileModal(true); }}>Create File</button>
                </div>
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
      <div className="mb-6">
        <div className="mb-3">
          <h2 className="text-2xl font-bold">{folders.find(f => f.id===selectedFolderId)?.name}</h2>
          <p className="text-gray-500">Choose a section to manage. Click a section to open it.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50" onClick={() => setShowRenameModal({ kind: 'folder', id: selectedFolderId, name: folders.find(f=>f.id===selectedFolderId)?.name || '' })}>Rename Folder</button>
          <button className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm bg-white hover:bg-red-50" onClick={() => setConfirmDelete({ kind: 'folder', id: selectedFolderId, name: folders.find(f=>f.id===selectedFolderId)?.name || '' })}>Delete Folder</button>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700" onClick={() => setShowNewFileModal(true)}>Create File</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {label:'Tasks', desc:'Manage actionable items', kind:'tasks'},
          {label:'Plans', desc:'High-level planning docs', kind:'plans'},
          {label:'Blueprints', desc:'Reusable workflow templates', kind:'blueprints'},
          {label:'Targets', desc:'Goals and KPIs tracking', kind:'targets'}
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
    <div className="space-y-6 max-h-[calc(100vh-110px)] overflow-y-auto">
      <div className="flex items-center justify-between">
        <button
          className="px-3 py-2 border rounded-lg"
          onClick={() => {
            if (selectedFolderId || selectedFileId) {
              setSelectedFileId('');
              setSelectedFolderId('');
              setShowTaskForm(false);
              setShowPlanForm(false);
              setShowBlueprintForm(false);
            } else {
              navigate('/admin_dashboard');
            }
          }}
        >
          Back
        </button>
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
          <div className="mb-6">
            <div className="text-xl font-bold mb-3">{folders.find(f => f.id===selectedFolderId)?.name} / {(filesByFolder[selectedFolderId]||[]).find(f=>f.id===selectedFileId)?.name}</div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50" onClick={() => setSelectedFileId('')}>Back to Folder</button>
              <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm bg-white hover:bg-gray-50" onClick={() => setShowRenameModal({ kind: 'file', id: selectedFileId, name: (filesByFolder[selectedFolderId]||[]).find(f=>f.id===selectedFileId)?.name || '' })}>Rename File</button>
              <button className="px-4 py-2 border border-red-300 text-red-600 rounded-lg text-sm bg-white hover:bg-red-50" onClick={() => setConfirmDelete({ kind: 'file', id: selectedFileId, name: (filesByFolder[selectedFolderId]||[]).find(f=>f.id===selectedFileId)?.name || '' })}>Delete File</button>
              <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700" onClick={() => selectedFolderId && setShowNewFileModal(true)} disabled={!selectedFolderId}>Create File</button>
            </div>
          </div>

          {(() => {
            const current = (filesByFolder[selectedFolderId]||[]).find(f=>f.id===selectedFileId);
            const kind = current?.kind || 'docs';
            if (kind === 'tasks') {

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold">Tasks</div>
                    <div className="flex items-center space-x-2">
                      <button className="px-2 py-1 border rounded" onClick={shareCSV}>CSV</button>
                      {/* Test Email Button */}
                      <button 
                        className="px-2 py-1 bg-green-500 text-white rounded text-sm"
                        onClick={() => {
                          console.log('Test email button clicked');
                          const testLink = 'mailto:?subject=Test Email&body=This is a test email from the app';
                          console.log('Test mailto link:', testLink);
                          window.open(testLink);
                        }}
                      >
                        Test Email
                      </button>
                      
                      <div className="relative" data-tasks-share-dropdown>
                        <button 
                          className="px-2 py-1 border rounded flex items-center space-x-1"
                          onClick={() => setShowTasksShareDropdown(!showTasksShareDropdown)}
                        >
                          <span>Share</span>
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {showTasksShareDropdown && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10 border">
                            <div className="py-1">
                              <button 
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedFormat('CSV');
                                  setShowFormatOptions(true);
                                }}
                              >
                                📊 Share as CSV
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                              <button 
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedFormat('PDF');
                                  setShowFormatOptions(true);
                                }}
                              >
                                📄 Share as PDF
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                              <button 
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedFormat('Word');
                                  setShowFormatOptions(true);
                                }}
                              >
                                📝 Share as Word
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                        {showFormatOptions && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-20 border ml-48">
                            <div className="py-1">
                              <button 
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('Download button clicked for format:', selectedFormat);
                                  
                                  if (filteredTasks.length === 0) {
                                    alert('No tasks to download');
                                    return;
                                  }
                                  
                                  if (selectedFormat === 'CSV') {
                                    const csv = [['Task Name','Assigned To','Status','Due Date','Priority','Notes'].join(',')].concat(filteredTasks.map(t=>[
                                      t.title||'', t.assignedTo||'', t.status||'', t.dueDate||'', t.priority||'', (t.notes||'').replace(/\n/g,' ')
                                    ].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','))).join('\n');
                                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'tasks.csv';
                                    a.click();
                                    URL.revokeObjectURL(url);
                                  } else if (selectedFormat === 'PDF') {
                                    const html = `<h2>TASKS (${filteredTasks.length} records)</h2><table><tr><th>Task Name</th><th>Assigned To</th><th>Status</th><th>Due Date</th><th>Priority</th><th>Notes</th></tr>${filteredTasks.map(t=>`<tr><td>${t.title||''}</td><td>${t.assignedTo||''}</td><td>${t.status||''}</td><td>${t.dueDate||''}</td><td>${t.priority||''}</td><td>${(t.notes||'').replace(/\n/g,' ')}</td></tr>`).join('')}</table>`;
                                    const blob = new Blob([html], { type: 'text/html' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'tasks.html';
                                    a.click();
                                    URL.revokeObjectURL(url);
                                  } else if (selectedFormat === 'Word') {
                                    const html = `<h2>TASKS (${filteredTasks.length} records)</h2><table><tr><th>Task Name</th><th>Assigned To</th><th>Status</th><th>Due Date</th><th>Priority</th><th>Notes</th></tr>${filteredTasks.map(t=>`<tr><td>${t.title||''}</td><td>${t.assignedTo||''}</td><td>${t.status||''}</td><td>${t.dueDate||''}</td><td>${t.priority||''}</td><td>${(t.notes||'').replace(/\n/g,' ')}</td></tr>`).join('')}</table>`;
                                    const wordContent = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><meta name="ProgId" content="Word.Document"><style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #000; padding: 8px; text-align: left; } th { background-color: #f2f2f2; font-weight: bold; }</style></head><body><h1>Tasks Export</h1><p>Total Records: ${filteredTasks.length}</p>${html}</body></html>`;
                                    const blob = new Blob([wordContent], { type: 'application/msword' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'tasks.doc';
                                    a.click();
                                    URL.revokeObjectURL(url);
                                  }
                                  
                                  setShowFormatOptions(false);
                                  setShowTasksShareDropdown(false);
                                }}
                              >
                                📤 Download {selectedFormat}
                              </button>
                              <button 
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('=== EMAIL SHARE BUTTON CLICKED ===');
                                  console.log('Email share clicked for format:', selectedFormat);
                                  console.log('Filtered tasks count:', filteredTasks.length);
                                  console.log('Show format options:', showFormatOptions);
                                  
                                  if (filteredTasks.length === 0) {
                                    alert('No tasks to share');
                                    return;
                                  }
                                  
                                  // Simple email sharing - test with basic data first
                                  try {
                                    const subject = `Tasks Data Export - ${selectedFormat}`;
                                    const body = `Please find the tasks data below:\n\nTotal records: ${filteredTasks.length}\n\n${filteredTasks.map((t, i) => `${i+1}. ${t.title||'Unnamed'}\n   Assigned to: ${t.assignedTo||'Unassigned'}\n   Status: ${t.status||'Not set'}\n   Due Date: ${t.dueDate||'Not set'}\n   Priority: ${t.priority||'Not set'}\n   Notes: ${(t.notes||'').replace(/\n/g,' ')}\n`).join('\n')}`;
                                    
                                    console.log('Opening email with subject:', subject);
                                    console.log('Opening email with body length:', body.length);
                                    console.log('Filtered tasks:', filteredTasks);
                                    
                                    // Try different approaches
                                    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                                    console.log('Mailto link:', mailtoLink);
                                    
                                    // Method 1: Direct window.open
                                    const newWindow = window.open(mailtoLink, '_blank');
                                    if (!newWindow) {
                                      console.log('Window blocked, trying alternative method');
                                      // Method 2: Create temporary link
                                      const link = document.createElement('a');
                                      link.href = mailtoLink;
                                      link.click();
                                    }
                                    
                                    console.log('Email sharing completed');
                                  } catch (error) {
                                    console.error('Error opening email:', error);
                                    alert('Error opening email client. Please check your browser settings.');
                                  }
                                  
                                  // Add small delay to prevent dropdown from closing prematurely
                                  setTimeout(() => {
                                    setShowFormatOptions(false);
                                    setShowTasksShareDropdown(false);
                                  }, 100);
                                }}
                              >
                                📧 Share via Email
                              </button>
                              <button 
                                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('WhatsApp share clicked for format:', selectedFormat);
                                  console.log('Filtered tasks count:', filteredTasks.length);
                                  
                                  if (filteredTasks.length === 0) {
                                    alert('No tasks to share');
                                    return;
                                  }
                                  
                                  console.log('=== WHATSAPP SHARE BUTTON CLICKED ===');
                                  console.log('WhatsApp share clicked for format:', selectedFormat);
                                  console.log('Filtered tasks count:', filteredTasks.length);
                                  
                                  try {
                                    const subject = `Tasks Data Export - ${selectedFormat}`;
                                    const body = `Please find the tasks data below:\n\nTotal records: ${filteredTasks.length}\n\n${filteredTasks.map((t, i) => `${i+1}. ${t.title||'Unnamed'}\n   Assigned to: ${t.assignedTo||'Unassigned'}\n   Status: ${t.status||'Not set'}\n   Due Date: ${t.dueDate||'Not set'}\n   Priority: ${t.priority||'Not set'}\n   Notes: ${(t.notes||'').replace(/\n/g,' ')}\n`).join('\n')}`;
                                    
                                    console.log('Opening WhatsApp with subject:', subject);
                                    console.log('Opening WhatsApp with body length:', body.length);
                                    
                                    // Use WhatsApp Web URL instead of mailto
                                    const whatsappText = `${subject}\n\n${body}`;
                                    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
                                    console.log('WhatsApp link:', whatsappLink);
                                    
                                    const newWindow = window.open(whatsappLink, '_blank');
                                    if (!newWindow) {
                                      console.log('Window blocked, trying alternative method for WhatsApp');
                                      const link = document.createElement('a');
                                      link.href = whatsappLink;
                                      link.target = '_blank';
                                      link.click();
                                    }
                                    
                                    console.log('WhatsApp sharing completed');
                                  } catch (error) {
                                    console.error('Error opening WhatsApp:', error);
                                    alert('Error opening WhatsApp. Please check your browser settings.');
                                  }
                                  
                                  // Add small delay to prevent dropdown from closing prematurely
                                  setTimeout(() => {
                                    setShowFormatOptions(false);
                                    setShowTasksShareDropdown(false);
                                  }, 100);
                                }}
                              >
                                📱 Share via WhatsApp
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      {!showTaskForm ? (
                        <button className="px-3 py-2 bg-blue-600 text-white rounded-lg" onClick={() => setShowTaskForm(true)}>Create Task</button>
                      ) : (
                        <button className="px-3 py-2 bg-gray-200 text-gray-800 rounded-lg" onClick={() => setShowTaskForm(false)}>Cancel</button>
                      )}
                    </div>
                  </div>
                  {showTaskForm && (
                    <div className="p-4 bg-white rounded-xl border">
                      <TaskForm
                        folderId={selectedFolderId}
                        fileId={selectedFileId}
                        onDownload={shareCSV}
                        onCreated={() => { showToast('Task created successfully'); setShowTaskForm(false); }}
                        onError={(m)=>showToast(m)}
                      />
                    </div>
                  )}
                  {!showTaskForm && (
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
                                  <span className="inline-block px-2 py-1 text-xs rounded bg-gray-100 capitalize">{t.status}</span>
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
                  )}
                </div>
              );
            }

            if (kind === 'plans') {
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold">Plans</div>
                    <div className="flex items-center space-x-2">
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700" onClick={() => setShowPlanForm(true)}>Create Plan</button>
                      <div className="relative" data-plans-share-dropdown>
                        <button
                          className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                          onClick={() => setShowPlansShareDropdown(!showPlansShareDropdown)}
                        >
                          <span>Share</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {showPlansShareDropdown && (
                          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                            <div className="py-1">
                              <button
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedFormat('CSV');
                                  setShowFormatOptions(true);
                                }}
                              >
                                📊 Share as CSV
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                              <button
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedFormat('PDF');
                                  setShowFormatOptions(true);
                                }}
                              >
                                📄 Share as PDF
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                              <button
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedFormat('Word');
                                  setShowFormatOptions(true);
                                }}
                              >
                                📝 Share as Word
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                        {showFormatOptions && (
                          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 ml-48">
                            <div className="py-1">
                              <button
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const list = await companyOrgEntitiesService.listPlansByFile(selectedFileId);
                                  const rows = list || [];
                                  if (rows.length === 0) {
                                    alert('No plans to share');
                                    return;
                                  }
                                  if (selectedFormat === 'CSV') {
                                    const csv = [['Name','Owner','Status','Start Date','End Date','Progress','Description','Notes'].join(',')].concat(rows.map((p:any)=>[
                                      p.name||'', p.owner||'', p.status||'', p.startDate||'', p.endDate||'', p.progress||'', (p.description||'').replace(/\n/g,' '), (p.notes||'').replace(/\n/g,' ')
                                    ].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','))).join('\n');
                                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'plans.csv';
                                    a.click();
                                    URL.revokeObjectURL(url);
                                  } else if (selectedFormat === 'PDF') {
                                    const html = `<h2>PLANS (${rows.length} records)</h2><table><tr><th>Name</th><th>Owner</th><th>Status</th><th>Start Date</th><th>End Date</th><th>Progress</th><th>Description</th><th>Notes</th></tr>${rows.map((p:any)=>`<tr><td>${p.name||''}</td><td>${p.owner||''}</td><td>${p.status||''}</td><td>${p.startDate||''}</td><td>${p.endDate||''}</td><td>${p.progress||''}</td><td>${(p.description||'').replace(/\n/g,' ')}</td><td>${(p.notes||'').replace(/\n/g,' ')}</td></tr>`).join('')}</table>`;
                                    const blob = new Blob([html], { type: 'text/html' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'plans.html';
                                    a.click();
                                    URL.revokeObjectURL(url);
                                  } else if (selectedFormat === 'Word') {
                                    const html = `<h2>PLANS (${rows.length} records)</h2><table><tr><th>Name</th><th>Owner</th><th>Status</th><th>Start Date</th><th>End Date</th><th>Progress</th><th>Description</th><th>Notes</th></tr>${rows.map((p:any)=>`<tr><td>${p.name||''}</td><td>${p.owner||''}</td><td>${p.status||''}</td><td>${p.startDate||''}</td><td>${p.endDate||''}</td><td>${p.progress||''}</td><td>${(p.description||'').replace(/\n/g,' ')}</td><td>${(p.notes||'').replace(/\n/g,' ')}</td></tr>`).join('')}</table>`;
                                    const wordContent = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><meta name="ProgId" content="Word.Document"><style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #000; padding: 8px; text-align: left; } th { background-color: #f2f2f2; font-weight: bold; }</style></head><body><h1>Plans Export</h1><p>Total Records: ${rows.length}</p>${html}</body></html>`;
                                    const blob = new Blob([wordContent], { type: 'application/msword' });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement('a');
                                    a.href = url;
                                    a.download = 'plans.doc';
                                    a.click();
                                    URL.revokeObjectURL(url);
                                  }
                                  setShowFormatOptions(false);
                                  setShowPlansShareDropdown(false);
                                }}
                              >
                                📤 Download {selectedFormat}
                              </button>
                              <button
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('=== PLANS EMAIL SHARE BUTTON CLICKED ===');
                                  console.log('Plans email share clicked for format:', selectedFormat);
                                  
                                  const list = await companyOrgEntitiesService.listPlansByFile(selectedFileId);
                                  const rows = list || [];
                                  console.log('Plans count:', rows.length);
                                  
                                  if (rows.length === 0) {
                                    alert('No plans to share');
                                    return;
                                  }
                                  
                                  try {
                                    const subject = `Plans Data Export - ${selectedFormat}`;
                                    const body = `Please find the plans data below:\n\nTotal records: ${rows.length}\n\n${rows.map((p:any, i:number) => `${i+1}. ${p.name||'Unnamed'} - ${p.status||'No Status'}\n   Owner: ${p.owner||'Unknown'}\n   Progress: ${p.progress||'0%'}\n   Start: ${p.startDate||'Not set'} - End: ${p.endDate||'Not set'}\n   Description: ${(p.description||'').replace(/\n/g,' ')}\n   Notes: ${(p.notes||'').replace(/\n/g,' ')}\n`).join('\n')}`;
                                    
                                    console.log('Opening plans email with subject:', subject);
                                    console.log('Opening plans email with body length:', body.length);
                                    
                                    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                                    console.log('Plans mailto link:', mailtoLink);
                                    
                                    const newWindow = window.open(mailtoLink, '_blank');
                                    if (!newWindow) {
                                      console.log('Window blocked, trying alternative method for plans');
                                      const link = document.createElement('a');
                                      link.href = mailtoLink;
                                      link.click();
                                    }
                                    
                                    console.log('Plans email sharing completed');
                                  } catch (error) {
                                    console.error('Error opening plans email:', error);
                                    alert('Error opening email client for plans. Please check your browser settings.');
                                  }
                                  
                                  // Add small delay to prevent dropdown from closing prematurely
                                  setTimeout(() => {
                                    setShowFormatOptions(false);
                                    setShowPlansShareDropdown(false);
                                  }, 100);
                                }}
                              >
                                📧 Share via Email
                              </button>
                              <button
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('=== PLANS WHATSAPP SHARE BUTTON CLICKED ===');
                                  console.log('Plans WhatsApp share clicked for format:', selectedFormat);
                                  
                                  const list = await companyOrgEntitiesService.listPlansByFile(selectedFileId);
                                  const rows = list || [];
                                  console.log('Plans count:', rows.length);
                                  
                                  if (rows.length === 0) {
                                    alert('No plans to share');
                                    return;
                                  }
                                  
                                  try {
                                    const subject = `Plans Data Export - ${selectedFormat}`;
                                    const body = `Please find the plans data below:\n\nTotal records: ${rows.length}\n\n${rows.map((p:any, i:number) => `${i+1}. ${p.name||'Unnamed'} - ${p.status||'No Status'}\n   Owner: ${p.owner||'Unknown'}\n   Progress: ${p.progress||'0%'}\n   Start: ${p.startDate||'Not set'} - End: ${p.endDate||'Not set'}\n   Description: ${(p.description||'').replace(/\n/g,' ')}\n   Notes: ${(p.notes||'').replace(/\n/g,' ')}\n`).join('\n')}`;
                                    
                                    console.log('Opening plans WhatsApp with subject:', subject);
                                    console.log('Opening plans WhatsApp with body length:', body.length);
                                    
                                    // Use WhatsApp Web URL instead of mailto
                                    const whatsappText = `${subject}\n\n${body}`;
                                    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
                                    console.log('Plans WhatsApp link:', whatsappLink);
                                    
                                    const newWindow = window.open(whatsappLink, '_blank');
                                    if (!newWindow) {
                                      console.log('Window blocked, trying alternative method for plans WhatsApp');
                                      const link = document.createElement('a');
                                      link.href = whatsappLink;
                                      link.target = '_blank';
                                      link.click();
                                    }
                                    
                                    console.log('Plans WhatsApp sharing completed');
                                  } catch (error) {
                                    console.error('Error opening plans WhatsApp:', error);
                                    alert('Error opening WhatsApp for plans. Please check your browser settings.');
                                  }
                                  
                                  // Add small delay to prevent dropdown from closing prematurely
                                  setTimeout(() => {
                                    setShowFormatOptions(false);
                                    setShowPlansShareDropdown(false);
                                  }, 100);
                                }}
                              >
                                📱 Share via WhatsApp
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      {!showPlanForm ? (
                        <button className="px-3 py-2 bg-blue-600 text-white rounded-lg" onClick={() => setShowPlanForm(true)}>Create Plan</button>
                      ) : (
                        <button className="px-3 py-2 bg-gray-200 text-gray-800 rounded-lg" onClick={() => setShowPlanForm(false)}>Cancel</button>
                      )}
                    </div>
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
                  {!showPlanForm && (
                    <div className="bg-white border rounded-xl">
                      <PlanTable folderId={selectedFolderId} refreshToken={planRefresh} />
                    </div>
                  )}
                </div>
              );
            }

            if (kind === 'blueprints') {
              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold">Blueprints</div>
                    <div className="flex items-center space-x-2">
                      <button className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700" onClick={() => setShowBlueprintForm(true)}>Create Blueprint</button>
                      <div className="relative" data-blueprints-share-dropdown>
                        <button
                          className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                          onClick={() => setShowBlueprintsShareDropdown(!showBlueprintsShareDropdown)}
                        >
                          <span>Share</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {showBlueprintsShareDropdown && (
                          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                            <div className="py-1">
                              <button
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedFormat('CSV');
                                  setShowFormatOptions(true);
                                }}
                              >
                                📊 Share as CSV
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                              <button
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedFormat('Excel');
                                  setShowFormatOptions(true);
                                }}
                              >
                                📈 Share as Excel
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                              <button
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedFormat('PDF');
                                  setShowFormatOptions(true);
                                }}
                              >
                                📄 Share as PDF
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                              <button
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedFormat('Word');
                                  setShowFormatOptions(true);
                                }}
                              >
                                📝 Share as Word
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                        {showFormatOptions && (
                          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 ml-48">
                            <div className="py-1">
                              <button
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  const list = await companyOrgEntitiesService.listBlueprintsByFile(selectedFileId);
                                  const rows = list || [];
                                  if (rows.length === 0) {
                                    alert('No blueprints to share');
                                    return;
                                  }
                                  if (selectedFormat === 'CSV') {
                                    const header = ['Name','Category','Version','Created By','Created Date','Last Updated','Description','Default Tasks'];
                                    const csv = [header.join(',')].concat(rows.map((b:any)=>[
                                      b.name||'', b.category||'', b.version||'', b.created_by||b.createdBy||'', b.created_date||b.createdDate||'', b.last_updated||b.lastUpdated||'',
                                      (b.description||'').replace(/\n/g,' '), Array.isArray(b.default_tasks||b.defaultTasks)?(b.default_tasks||b.defaultTasks).join('|'):''
                                    ].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','))).join('\n');
                                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                                    const reader = new FileReader();
                                    reader.onload = function() {
                                      const subject = encodeURIComponent('Blueprints Export - CSV');
                                      const body = encodeURIComponent(`Please find the blueprints data attached.\n\nTotal records: ${rows.length}\n\nThis CSV file contains all blueprint details.`);
                                      if (navigator.share) {
                                        navigator.share({
                                          title: 'Blueprints Export - CSV',
                                          text: `Blueprints data (${rows.length} records)`,
                                          files: [new File([blob], 'blueprints.csv', { type: 'text/csv' })]
                                        }).catch(() => window.open(`mailto:?subject=${subject}&body=${body}`));
                                      } else {
                                        window.open(`mailto:?subject=${subject}&body=${body}`);
                                      }
                                    };
                                    reader.readAsDataURL(blob);
                                  } else if (selectedFormat === 'Excel') {
                                    const makeTable = () => {
                                      const cells = (s:string)=>`<td style="border:1px solid #ddd;padding:6px;vertical-align:top;">${s}</td>`;
                                      const head = ['Name','Category','Version','Created By','Created Date','Last Updated','Description','Default Tasks']
                                        .map(h=>`<th style="border:1px solid #ddd;padding:6px;text-align:left;background:#f5f5f5;">${h}</th>`).join('');
                                      const body = rows.map((b:any)=>`<tr>
                                        ${cells(b.name||'')}${cells(b.category||'')}${cells(b.version||'')}${cells(b.created_by||b.createdBy||'')}
                                        ${cells(b.created_date||b.createdDate||'')}${cells(b.last_updated||b.lastUpdated||'')}
                                        ${cells((b.description||'').replace(/\n/g,'<br/>'))}
                                        ${cells(Array.isArray(b.default_tasks||b.defaultTasks)?(b.default_tasks||b.defaultTasks).join(', '):'')}
                                      </tr>`).join('');
                                      return `<table style="border-collapse:collapse;width:100%;">`+
                                        `<thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
                                    };
                                    const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body>${makeTable()}</body></html>`;
                                    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
                                    const reader = new FileReader();
                                    reader.onload = function() {
                                      const subject = encodeURIComponent('Blueprints Export - Excel');
                                      const body = encodeURIComponent(`Please find the blueprints data attached.\n\nTotal records: ${rows.length}\n\nThis Excel file contains all blueprint details.`);
                                      if (navigator.share) {
                                        navigator.share({
                                          title: 'Blueprints Export - Excel',
                                          text: `Blueprints data (${rows.length} records)`,
                                          files: [new File([blob], 'blueprints.xls', { type: 'application/vnd.ms-excel' })]
                                        }).catch(() => window.open(`mailto:?subject=${subject}&body=${body}`));
                                      } else {
                                        window.open(`mailto:?subject=${subject}&body=${body}`);
                                      }
                                    };
                                    reader.readAsDataURL(blob);
                                  } else if (selectedFormat === 'PDF') {
                                    const head = ['Name','Category','Version','Created By','Created Date','Last Updated','Description','Default Tasks'];
                                    const tableRows = rows.map((b:any)=>`
                                      <tr>
                                        <td>${b.name||''}</td><td>${b.category||''}</td><td>${b.version||''}</td><td>${b.created_by||b.createdBy||''}</td>
                                        <td>${b.created_date||b.createdDate||''}</td><td>${b.last_updated||b.lastUpdated||''}</td>
                                        <td>${(b.description||'').replace(/\n/g,'<br/>')}</td>
                                        <td>${Array.isArray(b.default_tasks||b.defaultTasks)?(b.default_tasks||b.defaultTasks).join(', '):''}</td>
                                      </tr>`).join('');
                                    const html = `<!doctype html><html><head><meta charset="utf-8" />
                                      <style>table{border-collapse:collapse;width:100%;}td,th{border:1px solid #ddd;padding:6px;text-align:left;}thead{background:#f5f5f5;}</style>
                                      </head><body><h1>Blueprints Export</h1><p>Total Records: ${rows.length}</p><table><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
                                    const blob = new Blob([html], { type: 'text/html' });
                                    const reader = new FileReader();
                                    reader.onload = function() {
                                      const subject = encodeURIComponent('Blueprints Export - PDF');
                                      const body = encodeURIComponent(`Please find the blueprints data attached.\n\nTotal records: ${rows.length}\n\nThis PDF file contains all blueprint details.`);
                                      if (navigator.share) {
                                        navigator.share({
                                          title: 'Blueprints Export - PDF',
                                          text: `Blueprints data (${rows.length} records)`,
                                          files: [new File([blob], 'blueprints.html', { type: 'text/html' })]
                                        }).catch(() => window.open(`mailto:?subject=${subject}&body=${body}`));
                                      } else {
                                        window.open(`mailto:?subject=${subject}&body=${body}`);
                                      }
                                    };
                                    reader.readAsDataURL(blob);
                                  } else if (selectedFormat === 'Word') {
                                    const head = ['Name','Category','Version','Created By','Created Date','Last Updated','Description','Default Tasks'];
                                    const tableRows = rows.map((b:any)=>`
                                      <tr>
                                        <td>${b.name||''}</td><td>${b.category||''}</td><td>${b.version||''}</td><td>${b.created_by||b.createdBy||''}</td>
                                        <td>${b.created_date||b.createdDate||''}</td><td>${b.last_updated||b.lastUpdated||''}</td>
                                        <td>${(b.description||'').replace(/\n/g,'<br/>')}</td>
                                        <td>${Array.isArray(b.default_tasks||b.defaultTasks)?(b.default_tasks||b.defaultTasks).join(', '):''}</td>
                                      </tr>`).join('');
                                    const html = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><meta name="ProgId" content="Word.Document"><style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #000; padding: 8px; text-align: left; } th { background-color: #f2f2f2; font-weight: bold; }</style></head><body><h1>Blueprints Export</h1><p>Total Records: ${rows.length}</p><table><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
                                    const blob = new Blob([html], { type: 'application/msword' });
                                    const reader = new FileReader();
                                    reader.onload = function() {
                                      const subject = encodeURIComponent('Blueprints Export - Word Document');
                                      const body = encodeURIComponent(`Please find the blueprints data attached.\n\nTotal records: ${rows.length}\n\nThis Word document contains all blueprint details.`);
                                      if (navigator.share) {
                                        navigator.share({
                                          title: 'Blueprints Export - Word',
                                          text: `Blueprints data (${rows.length} records)`,
                                          files: [new File([blob], 'blueprints.doc', { type: 'application/msword' })]
                                        }).catch(() => window.open(`mailto:?subject=${subject}&body=${body}`));
                                      } else {
                                        window.open(`mailto:?subject=${subject}&body=${body}`);
                                      }
                                    };
                                    reader.readAsDataURL(blob);
                                  }
                                  setShowFormatOptions(false);
                                  setShowBlueprintsShareDropdown(false);
                                }}
                              >
                                📤 Download {selectedFormat}
                              </button>
                              <button
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('=== BLUEPRINTS EMAIL SHARE BUTTON CLICKED ===');
                                  console.log('Blueprints email share clicked for format:', selectedFormat);
                                  
                                  const list = await companyOrgEntitiesService.listBlueprintsByFile(selectedFileId);
                                  const rows = list || [];
                                  console.log('Blueprints count:', rows.length);
                                  
                                  if (rows.length === 0) {
                                    alert('No blueprints to share');
                                    return;
                                  }
                                  
                                  try {
                                    const subject = `Blueprints Data Export - ${selectedFormat}`;
                                    const body = `Please find the blueprints data below:\n\nTotal records: ${rows.length}\n\n${rows.map((b:any, i:number) => `${i+1}. ${b.name||'Unnamed'} (${b.category||'No Category'}) - Version ${b.version||'1.0'}\n   Created by: ${b.created_by||b.createdBy||'Unknown'}\n   Description: ${(b.description||'').replace(/\n/g,' ')}\n   Default Tasks: ${Array.isArray(b.default_tasks||b.defaultTasks)?(b.default_tasks||b.defaultTasks).join(', '):'None'}\n`).join('\n')}`;
                                    
                                    console.log('Opening blueprints email with subject:', subject);
                                    console.log('Opening blueprints email with body length:', body.length);
                                    
                                    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                                    console.log('Blueprints mailto link:', mailtoLink);
                                    
                                    const newWindow = window.open(mailtoLink, '_blank');
                                    if (!newWindow) {
                                      console.log('Window blocked, trying alternative method for blueprints');
                                      const link = document.createElement('a');
                                      link.href = mailtoLink;
                                      link.click();
                                    }
                                    
                                    console.log('Blueprints email sharing completed');
                                  } catch (error) {
                                    console.error('Error opening blueprints email:', error);
                                    alert('Error opening email client for blueprints. Please check your browser settings.');
                                  }
                                  
                                  // Add small delay to prevent dropdown from closing prematurely
                                  setTimeout(() => {
                                    setShowFormatOptions(false);
                                    setShowBlueprintsShareDropdown(false);
                                  }, 100);
                                }}
                              >
                                📧 Share via Email
                              </button>
                              <button
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('=== BLUEPRINTS WHATSAPP SHARE BUTTON CLICKED ===');
                                  console.log('Blueprints WhatsApp share clicked for format:', selectedFormat);
                                  
                                  const list = await companyOrgEntitiesService.listBlueprintsByFile(selectedFileId);
                                  const rows = list || [];
                                  console.log('Blueprints count:', rows.length);
                                  
                                  if (rows.length === 0) {
                                    alert('No blueprints to share');
                                    return;
                                  }
                                  
                                  try {
                                    const subject = `Blueprints Data Export - ${selectedFormat}`;
                                    const body = `Please find the blueprints data below:\n\nTotal records: ${rows.length}\n\n${rows.map((b:any, i:number) => `${i+1}. ${b.name||'Unnamed'} (${b.category||'No Category'}) - Version ${b.version||'1.0'}\n   Created by: ${b.created_by||b.createdBy||'Unknown'}\n   Description: ${(b.description||'').replace(/\n/g,' ')}\n   Default Tasks: ${Array.isArray(b.default_tasks||b.defaultTasks)?(b.default_tasks||b.defaultTasks).join(', '):'None'}\n`).join('\n')}`;
                                    
                                    console.log('Opening blueprints WhatsApp with subject:', subject);
                                    console.log('Opening blueprints WhatsApp with body length:', body.length);
                                    
                                    // Use WhatsApp Web URL instead of mailto
                                    const whatsappText = `${subject}\n\n${body}`;
                                    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
                                    console.log('Blueprints WhatsApp link:', whatsappLink);
                                    
                                    const newWindow = window.open(whatsappLink, '_blank');
                                    if (!newWindow) {
                                      console.log('Window blocked, trying alternative method for blueprints WhatsApp');
                                      const link = document.createElement('a');
                                      link.href = whatsappLink;
                                      link.target = '_blank';
                                      link.click();
                                    }
                                    
                                    console.log('Blueprints WhatsApp sharing completed');
                                  } catch (error) {
                                    console.error('Error opening blueprints WhatsApp:', error);
                                    alert('Error opening WhatsApp for blueprints. Please check your browser settings.');
                                  }
                                  
                                  // Add small delay to prevent dropdown from closing prematurely
                                  setTimeout(() => {
                                    setShowFormatOptions(false);
                                    setShowBlueprintsShareDropdown(false);
                                  }, 100);
                                }}
                              >
                                📱 Share via WhatsApp
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      {!showBlueprintForm ? (
                        <button className="px-3 py-2 bg-blue-600 text-white rounded-lg" onClick={() => setShowBlueprintForm(true)}>Create Blueprint</button>
                      ) : (
                        <button className="px-3 py-2 bg-gray-200 text-gray-800 rounded-lg" onClick={() => setShowBlueprintForm(false)}>Cancel</button>
                      )}
                    </div>
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
                  {!showBlueprintForm && (
                    <div className="bg-white border rounded-xl">
                      <BlueprintTable folderId={selectedFolderId} refreshToken={blueprintRefresh} />
                    </div>
                  )}
                </div>
              );
            }

            if (kind === 'targets') {
              // export helpers for targets
              const exportTargets = async () => {
                const list = await (await import('../services/companyTargetsService')).companyTargetsService.listTargetsByFolder(selectedFolderId);
                return list;
              };
              const shareTargetsCSV = async () => {
                const rows = await exportTargets();
                if (rows.length === 0) {
                  alert('No targets to share');
                  return;
                }
                const header = ['Title','Type','Value','Unit','Start','End','Department','Owner','Progress','Status','Notes'];
                const csv = [header.join(',')].concat(rows.map((r:any)=>[
                  r.title||'', r.targetType||'', r.targetValue??'', r.targetUnit||'', r.startDate||'', r.endDate||'', r.department||'', r.owner||'', r.progress??'', r.status||'', (r.notes||'').replace(/\n/g,' ')
                ].map(v=>`"${String(v).replace(/"/g,'""')}"`).join(','))).join('\n');
                const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                const reader = new FileReader();
                reader.onload = function() {
                  const subject = encodeURIComponent('Targets Export - CSV');
                  const body = encodeURIComponent(`Please find the targets data attached.\n\nTotal records: ${rows.length}\n\nThis CSV file contains all target details.`);
                  if (navigator.share) {
                    navigator.share({
                      title: 'Targets Export - CSV',
                      text: `Targets data (${rows.length} records)`,
                      files: [new File([blob], 'targets.csv', { type: 'text/csv' })]
                    }).catch(() => window.open(`mailto:?subject=${subject}&body=${body}`));
                  } else {
                    window.open(`mailto:?subject=${subject}&body=${body}`);
                  }
                };
                reader.readAsDataURL(blob);
              };
              const shareTargetsExcel = async () => {
                const rows = await exportTargets();
                if (rows.length === 0) {
                  alert('No targets to share');
                  return;
                }
                const head = ['Title','Type','Value','Unit','Start','End','Department','Owner','Progress','Status','Notes']
                  .map(h=>`<th style="border:1px solid #ddd;padding:6px;text-align:left;background:#f5f5f5;">${h}</th>`).join('');
                const body = rows.map((r:any)=>`<tr>
                  <td style="border:1px solid #ddd;padding:6px;">${r.title||''}</td>
                  <td style="border:1px solid #ddd;padding:6px;">${r.targetType||''}</td>
                  <td style="border:1px solid #ddd;padding:6px;">${r.targetValue??''}</td>
                  <td style="border:1px solid #ddd;padding:6px;">${r.targetUnit||''}</td>
                  <td style="border:1px solid #ddd;padding:6px;">${r.startDate||''}</td>
                  <td style="border:1px solid #ddd;padding:6px;">${r.endDate||''}</td>
                  <td style="border:1px solid #ddd;padding:6px;">${r.department||''}</td>
                  <td style="border:1px solid #ddd;padding:6px;">${r.owner||''}</td>
                  <td style="border:1px solid #ddd;padding:6px;">${r.progress??''}</td>
                  <td style="border:1px solid #ddd;padding:6px;">${r.status||''}</td>
                  <td style="border:1px solid #ddd;padding:6px;">${(r.notes||'').replace(/</g,'&lt;')}</td>
                </tr>`).join('');
                const html = `<!doctype html><html><head><meta charset="utf-8" /></head><body><h1>Targets Export</h1><p>Total Records: ${rows.length}</p><table style="border-collapse:collapse;width:100%;"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></body></html>`;
                const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
                const reader = new FileReader();
                reader.onload = function() {
                  const subject = encodeURIComponent('Targets Export - Excel');
                  const body = encodeURIComponent(`Please find the targets data attached.\n\nTotal records: ${rows.length}\n\nThis Excel file contains all target details.`);
                  if (navigator.share) {
                    navigator.share({
                      title: 'Targets Export - Excel',
                      text: `Targets data (${rows.length} records)`,
                      files: [new File([blob], 'targets.xls', { type: 'application/vnd.ms-excel' })]
                    }).catch(() => window.open(`mailto:?subject=${subject}&body=${body}`));
                  } else {
                    window.open(`mailto:?subject=${subject}&body=${body}`);
                  }
                };
                reader.readAsDataURL(blob);
              };
              const shareTargetsPDF = async () => {
                const rows = await exportTargets();
                if (rows.length === 0) {
                  alert('No targets to share');
                  return;
                }
                const table = await (async ()=>{
                  const head = '<tr><th>Title</th><th>Type</th><th>Value</th><th>Unit</th><th>Start</th><th>End</th><th>Department</th><th>Owner</th><th>Progress</th><th>Status</th><th>Notes</th></tr>';
                  const body = rows.map((r:any)=>`<tr><td>${r.title||''}</td><td>${r.targetType||''}</td><td>${r.targetValue??''}</td><td>${r.targetUnit||''}</td><td>${r.startDate||''}</td><td>${r.endDate||''}</td><td>${r.department||''}</td><td>${r.owner||''}</td><td>${r.progress??''}</td><td>${r.status||''}</td><td>${(r.notes||'').replace(/</g,'&lt;')}</td></tr>`).join('');
                  return `<table>${head}${body}</table>`;
                })();
                const html = `<!doctype html><html><head><meta charset="utf-8" /><style>table{width:100%;border-collapse:collapse}th,td{border:1px solid #ddd;padding:6px;text-align:left}th{background:#f5f5f5}</style></head><body><h1>Targets Export</h1><p>Total Records: ${rows.length}</p>${table}</body></html>`;
                const blob = new Blob([html], { type: 'text/html' });
                const reader = new FileReader();
                reader.onload = function() {
                  const subject = encodeURIComponent('Targets Export - PDF');
                  const body = encodeURIComponent(`Please find the targets data attached.\n\nTotal records: ${rows.length}\n\nThis PDF file contains all target details.`);
                  if (navigator.share) {
                    navigator.share({
                      title: 'Targets Export - PDF',
                      text: `Targets data (${rows.length} records)`,
                      files: [new File([blob], 'targets.html', { type: 'text/html' })]
                    }).catch(() => window.open(`mailto:?subject=${subject}&body=${body}`));
                  } else {
                    window.open(`mailto:?subject=${subject}&body=${body}`);
                  }
                };
                reader.readAsDataURL(blob);
              };
              const shareTargetsWord = async () => {
                const rows = await exportTargets();
                if (rows.length === 0) {
                  alert('No targets to share');
                  return;
                }
                const head = ['Title','Type','Value','Unit','Start','End','Department','Owner','Progress','Status','Notes'];
                const tableRows = rows.map((r:any)=>`
                  <tr>
                    <td>${r.title||''}</td><td>${r.targetType||''}</td><td>${r.targetValue??''}</td><td>${r.targetUnit||''}</td>
                    <td>${r.startDate||''}</td><td>${r.endDate||''}</td><td>${r.department||''}</td><td>${r.owner||''}</td>
                    <td>${r.progress??''}</td><td>${r.status||''}</td><td>${(r.notes||'').replace(/</g,'&lt;')}</td>
                  </tr>`).join('');
                const html = `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><meta name="ProgId" content="Word.Document"><style>table { border-collapse: collapse; width: 100%; } th, td { border: 1px solid #000; padding: 8px; text-align: left; } th { background-color: #f2f2f2; font-weight: bold; }</style></head><body><h1>Targets Export</h1><p>Total Records: ${rows.length}</p><table><thead><tr>${head.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${tableRows}</tbody></table></body></html>`;
                const blob = new Blob([html], { type: 'application/msword' });
                const reader = new FileReader();
                reader.onload = function() {
                  const subject = encodeURIComponent('Targets Export - Word Document');
                  const body = encodeURIComponent(`Please find the targets data attached.\n\nTotal records: ${rows.length}\n\nThis Word document contains all target details.`);
                  if (navigator.share) {
                    navigator.share({
                      title: 'Targets Export - Word',
                      text: `Targets data (${rows.length} records)`,
                      files: [new File([blob], 'targets.doc', { type: 'application/msword' })]
                    }).catch(() => window.open(`mailto:?subject=${subject}&body=${body}`));
                  } else {
                    window.open(`mailto:?subject=${subject}&body=${body}`);
                  }
                };
                reader.readAsDataURL(blob);
              };

              return (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-lg font-semibold">Targets</div>
                    <div className="flex items-center space-x-2">
                      <div className="relative" data-targets-share-dropdown>
                        <button
                          className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                          onClick={() => setShowTargetsShareDropdown(!showTargetsShareDropdown)}
                        >
                          <span>Share</span>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {showTargetsShareDropdown && (
                          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                            <div className="py-1">
                              <button
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedFormat('CSV');
                                  setShowFormatOptions(true);
                                }}
                              >
                                📊 Share as CSV
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                              <button
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedFormat('Excel');
                                  setShowFormatOptions(true);
                                }}
                              >
                                📈 Share as Excel
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                              <button
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedFormat('PDF');
                                  setShowFormatOptions(true);
                                }}
                              >
                                📄 Share as PDF
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                              <button
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center justify-between"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setSelectedFormat('Word');
                                  setShowFormatOptions(true);
                                }}
                              >
                                📝 Share as Word
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        )}
                        {showFormatOptions && (
                          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 ml-48">
                            <div className="py-1">
                              <button
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (selectedFormat === 'CSV') await shareTargetsCSV();
                                  else if (selectedFormat === 'Excel') await shareTargetsExcel();
                                  else if (selectedFormat === 'PDF') await shareTargetsPDF();
                                  else if (selectedFormat === 'Word') await shareTargetsWord();
                                  setShowFormatOptions(false);
                                  setShowTargetsShareDropdown(false);
                                }}
                              >
                                📤 Download {selectedFormat}
                              </button>
                              <button
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('=== TARGETS EMAIL SHARE BUTTON CLICKED ===');
                                  console.log('Targets email share clicked for format:', selectedFormat);
                                  
                                  const rows = await (await import('../services/companyTargetsService')).companyTargetsService.listTargetsByFolder(selectedFolderId);
                                  console.log('Targets count:', rows.length);
                                  
                                  if (rows.length === 0) {
                                    alert('No targets to share');
                                    return;
                                  }
                                  
                                  try {
                                    const subject = `Targets Data Export - ${selectedFormat}`;
                                    const body = `Please find the targets data below:\n\nTotal records: ${rows.length}\n\n${rows.map((t:any, i:number) => `${i+1}. ${t.title||'Unnamed'} (${t.targetType||'No Type'}) - ${t.targetValue||'0'} ${t.targetUnit||''}\n   Owner: ${t.owner||'Unknown'}\n   Department: ${t.department||'Not specified'}\n   Progress: ${t.progress||'0'}%\n   Status: ${t.status||'Not set'}\n   Start: ${t.startDate||'Not set'} - End: ${t.endDate||'Not set'}\n   Notes: ${(t.notes||'').replace(/\n/g,' ')}\n`).join('\n')}`;
                                    
                                    console.log('Opening targets email with subject:', subject);
                                    console.log('Opening targets email with body length:', body.length);
                                    
                                    const mailtoLink = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                                    console.log('Targets mailto link:', mailtoLink);
                                    
                                    const newWindow = window.open(mailtoLink, '_blank');
                                    if (!newWindow) {
                                      console.log('Window blocked, trying alternative method for targets');
                                      const link = document.createElement('a');
                                      link.href = mailtoLink;
                                      link.click();
                                    }
                                    
                                    console.log('Targets email sharing completed');
                                  } catch (error) {
                                    console.error('Error opening targets email:', error);
                                    alert('Error opening email client for targets. Please check your browser settings.');
                                  }
                                  
                                  // Add small delay to prevent dropdown from closing prematurely
                                  setTimeout(() => {
                                    setShowFormatOptions(false);
                                    setShowTargetsShareDropdown(false);
                                  }, 100);
                                }}
                              >
                                📧 Share via Email
                              </button>
                              <button
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                                onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log('=== TARGETS WHATSAPP SHARE BUTTON CLICKED ===');
                                  console.log('Targets WhatsApp share clicked for format:', selectedFormat);
                                  
                                  const rows = await (await import('../services/companyTargetsService')).companyTargetsService.listTargetsByFolder(selectedFolderId);
                                  console.log('Targets count:', rows.length);
                                  
                                  if (rows.length === 0) {
                                    alert('No targets to share');
                                    return;
                                  }
                                  
                                  try {
                                    const subject = `Targets Data Export - ${selectedFormat}`;
                                    const body = `Please find the targets data below:\n\nTotal records: ${rows.length}\n\n${rows.map((r:any, i:number) => `${i+1}. ${r.title||'Unnamed'} - ${r.targetType||'No Type'}\n   Value: ${r.targetValue??'Not set'} ${r.targetUnit||''}\n   Period: ${r.startDate||'Not set'} to ${r.endDate||'Not set'}\n   Department: ${r.department||'Not specified'}\n   Owner: ${r.owner||'Unknown'}\n   Progress: ${r.progress??'0%'} - Status: ${r.status||'Not set'}\n   Notes: ${(r.notes||'').replace(/\n/g,' ')}\n`).join('\n')}`;
                                    
                                    console.log('Opening targets WhatsApp with subject:', subject);
                                    console.log('Opening targets WhatsApp with body length:', body.length);
                                    
                                    // Use WhatsApp Web URL instead of mailto
                                    const whatsappText = `${subject}\n\n${body}`;
                                    const whatsappLink = `https://wa.me/?text=${encodeURIComponent(whatsappText)}`;
                                    console.log('Targets WhatsApp link:', whatsappLink);
                                    
                                    const newWindow = window.open(whatsappLink, '_blank');
                                    if (!newWindow) {
                                      console.log('Window blocked, trying alternative method for targets WhatsApp');
                                      const link = document.createElement('a');
                                      link.href = whatsappLink;
                                      link.target = '_blank';
                                      link.click();
                                    }
                                    
                                    console.log('Targets WhatsApp sharing completed');
                                  } catch (error) {
                                    console.error('Error opening targets WhatsApp:', error);
                                    alert('Error opening WhatsApp for targets. Please check your browser settings.');
                                  }
                                  
                                  // Add small delay to prevent dropdown from closing prematurely
                                  setTimeout(() => {
                                    setShowFormatOptions(false);
                                    setShowTargetsShareDropdown(false);
                                  }, 100);
                                }}
                              >
                                📱 Share via WhatsApp
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      {!showTargetForm ? (
                        <button className="px-3 py-2 bg-blue-600 text-white rounded-lg" onClick={() => setShowTargetForm(true)}>Create Target</button>
                      ) : (
                        <button className="px-3 py-2 bg-gray-200 text-gray-800 rounded-lg" onClick={() => setShowTargetForm(false)}>Cancel</button>
                      )}
                    </div>
                  </div>
                  {showTargetForm && (
                    <div className="p-4 bg-white rounded-xl border">
                      <TargetForm
                        folderId={selectedFolderId}
                        fileId={selectedFileId}
                        onSaved={() => { showToast('Target created successfully'); setShowTargetForm(false); }}
                        onToast={(m)=>showToast(m)}
                      />
                    </div>
                  )}
                  {!showTargetForm && (
                    <div className="bg-white border rounded-xl">
                      <TargetTable folderId={selectedFolderId} />
                    </div>
                  )}
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
      {showRenameModal.kind && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Rename {showRenameModal.kind === 'folder' ? 'Folder' : 'File'}</h3>
            <input className="w-full px-3 py-2 border rounded-lg mb-4" value={showRenameModal.name} onChange={e=>setShowRenameModal(prev=>({...prev, name:e.target.value}))} />
            <div className="flex justify-end space-x-2">
              <button className="px-4 py-2 rounded-lg" onClick={()=>setShowRenameModal({kind:'', id:'', name:''})}>Cancel</button>
              <button className="px-4 py-2 rounded-lg bg-blue-600 text-white" onClick={async ()=>{
                if (showRenameModal.kind==='folder') { await companyOrgService.renameFolder(showRenameModal.id, showRenameModal.name); await refreshFolders(); }
                if (showRenameModal.kind==='file') { await companyOrgService.renameFile(showRenameModal.id, showRenameModal.name); await refreshFolders(); }
                setShowRenameModal({kind:'', id:'', name:''});
              }}>Save</button>
            </div>
          </div>
        </div>
      )}
      {confirmDelete.kind && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Delete {confirmDelete.kind === 'folder' ? 'Folder' : 'File'}</h3>
            <p className="mb-4">Are you sure you want to delete "{confirmDelete.name}"? This will remove all of its contents.</p>
            <div className="flex justify-end space-x-2">
              <button className="px-4 py-2 rounded-lg" onClick={()=>setConfirmDelete({kind:'', id:'', name:''})}>Cancel</button>
              <button className="px-4 py-2 rounded-lg bg-red-600 text-white" onClick={async ()=>{
                if (confirmDelete.kind==='folder') { await companyOrgService.deleteFolderDeep(confirmDelete.id); setSelectedFolderId(''); setSelectedFileId(''); await refreshFolders(); }
                if (confirmDelete.kind==='file') { await companyOrgService.deleteFileDeep(confirmDelete.id); setSelectedFileId(''); await refreshFolders(); }
                setConfirmDelete({kind:'', id:'', name:''});
              }}>Delete</button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className="fixed bottom-6 right-6 bg-black text-white px-4 py-2 rounded-lg shadow-lg">{toast}</div>
      )}
      
      {/* Detail View Modal */}
      {showDetailView && selectedItem && (
        <ItemDetailView
          item={selectedItem}
          itemType={selectedItemType}
          onClose={handleCloseDetailView}
          onEdit={() => {
            // TODO: Implement edit functionality
            console.log('Edit item:', selectedItem);
          }}
          onDelete={() => {
            // TODO: Implement delete functionality
            console.log('Delete item:', selectedItem);
          }}
        />
      )}
      
      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 right-4 bg-black text-white p-2 rounded text-xs">
          <div>showDetailView: {showDetailView ? 'true' : 'false'}</div>
          <div>selectedItem: {selectedItem ? 'exists' : 'null'}</div>
          <div>selectedItemType: {selectedItemType}</div>
        </div>
      )}
    </div>
  );
};

export default OrganizePanel;
