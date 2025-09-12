import { Task, Plan, Blueprint, Target, TaskStatus, TaskPriority, PlanStatus, TargetStatus, TargetType } from './orgModels';

// Lightweight validation helpers (non-throwing + throwing versions)
export const isISODate = (v?: string) => !v || /^\d{4}-\d{2}-\d{2}/.test(v) || /T\d{2}:\d{2}/.test(v);

export function validateTask(t: Partial<Task>): asserts t is Task {
  if (!t.task_id) throw new Error('task.task_id required');
  if (!t.title) throw new Error('task.title required');
  if (!t.status) throw new Error('task.status required');
  if (!t.priority) throw new Error('task.priority required');
  if (!isISODate(t.due_date)) throw new Error('task.due_date must be ISO if provided');
  if (!isISODate(t.start_date)) throw new Error('task.start_date must be ISO if provided');
  if (!isISODate(t.completion_date)) throw new Error('task.completion_date must be ISO if provided');
}

export function validatePlan(p: Partial<Plan>): asserts p is Plan {
  if (!p.plan_id) throw new Error('plan.plan_id required');
  if (!p.name) throw new Error('plan.name required');
  if (!p.owner) throw new Error('plan.owner required');
  if (!p.status) throw new Error('plan.status required');
  if (!Array.isArray(p.tasks)) throw new Error('plan.tasks must be an array');
  if (!isISODate(p.start_date)) throw new Error('plan.start_date must be ISO if provided');
  if (!isISODate(p.end_date)) throw new Error('plan.end_date must be ISO if provided');
}

export function validateBlueprint(b: Partial<Blueprint>): asserts b is Blueprint {
  if (!b.blueprint_id) throw new Error('blueprint.blueprint_id required');
  if (!b.name) throw new Error('blueprint.name required');
  if (!b.default_tasks) throw new Error('blueprint.default_tasks required');
  if (!b.created_by) throw new Error('blueprint.created_by required');
  if (!b.created_date) throw new Error('blueprint.created_date required');
  if (!b.version) throw new Error('blueprint.version required');
}

export function validateTarget(t: Partial<Target>): asserts t is Target {
  if (!t.target_id) throw new Error('target.target_id required');
  if (!t.name) throw new Error('target.name required');
  if (!t.owner) throw new Error('target.owner required');
  if (!t.target_type) throw new Error('target.target_type required');
  if (!t.status) throw new Error('target.status required');
  if (!isISODate(t.start_date)) throw new Error('target.start_date must be ISO if provided');
  if (!isISODate(t.end_date)) throw new Error('target.end_date must be ISO if provided');
}

// Firestore mappers (normalize snake_case fields to Firestore documents and back)
export const taskToDoc = (t: Task) => ({
  task_id: t.task_id,
  title: t.title,
  description: t.description || '',
  assigned_to: t.assigned_to || '',
  status: t.status as TaskStatus,
  priority: t.priority as TaskPriority,
  due_date: t.due_date || null,
  start_date: t.start_date || null,
  completion_date: t.completion_date || null,
  attachments: t.attachments || [],
  comments: t.comments || [],
  dependencies: t.dependencies || [],
  createdAt: new Date(),
});

export const docToTask = (id: string, d: any): Task => ({
  task_id: d.task_id || id,
  title: d.title,
  description: d.description || undefined,
  assigned_to: d.assigned_to || undefined,
  status: d.status,
  priority: d.priority,
  due_date: d.due_date || undefined,
  start_date: d.start_date || undefined,
  completion_date: d.completion_date || undefined,
  attachments: Array.isArray(d.attachments) ? d.attachments : [],
  comments: Array.isArray(d.comments) ? d.comments : [],
  dependencies: Array.isArray(d.dependencies) ? d.dependencies : [],
});

export const planToDoc = (p: Plan) => ({
  plan_id: p.plan_id,
  name: p.name,
  description: p.description || '',
  owner: p.owner,
  start_date: p.start_date || null,
  end_date: p.end_date || null,
  status: p.status as PlanStatus,
  tasks: p.tasks || [],
  progress: typeof p.progress === 'number' ? p.progress : null,
  notes: p.notes || '',
  attachments: Array.isArray(p.attachments) ? p.attachments : [],
  createdAt: new Date(),
});

export const docToPlan = (id: string, d: any): Plan => ({
  plan_id: d.plan_id || id,
  name: d.name,
  description: d.description || undefined,
  owner: d.owner,
  start_date: d.start_date || undefined,
  end_date: d.end_date || undefined,
  status: d.status,
  tasks: Array.isArray(d.tasks) ? d.tasks : [],
  progress: typeof d.progress === 'number' ? d.progress : undefined,
  notes: d.notes || undefined,
  attachments: Array.isArray(d.attachments) ? d.attachments : [],
});

export const blueprintToDoc = (b: Blueprint) => ({
  blueprint_id: b.blueprint_id,
  name: b.name,
  category: b.category || '',
  description: b.description || '',
  default_tasks: b.default_tasks || [],
  created_by: b.created_by,
  created_date: b.created_date,
  last_updated: b.last_updated || null,
  version: b.version,
  attachments: Array.isArray(b.attachments) ? b.attachments : [],
  createdAt: new Date(),
});

export const docToBlueprint = (id: string, d: any): Blueprint => ({
  blueprint_id: d.blueprint_id || id,
  name: d.name,
  category: d.category || undefined,
  description: d.description || undefined,
  default_tasks: Array.isArray(d.default_tasks) ? d.default_tasks : [],
  created_by: d.created_by,
  created_date: d.created_date,
  last_updated: d.last_updated || undefined,
  version: d.version,
  attachments: Array.isArray(d.attachments) ? d.attachments : [],
});

export const targetToDoc = (t: Target) => ({
  target_id: t.target_id,
  name: t.name,
  description: t.description || '',
  owner: t.owner,
  target_type: t.target_type,
  start_date: t.start_date || null,
  end_date: t.end_date || null,
  progress: typeof t.progress === 'number' ? t.progress : null,
  status: t.status,
  linked_plans: t.linked_plans || [],
  metrics: t.metrics || [],
  attachments: Array.isArray(t.attachments) ? t.attachments : [],
  createdAt: new Date(),
});

export const docToTarget = (id: string, d: any): Target => ({
  target_id: d.target_id || id,
  name: d.name,
  description: d.description || undefined,
  owner: d.owner,
  target_type: d.target_type,
  start_date: d.start_date || undefined,
  end_date: d.end_date || undefined,
  progress: typeof d.progress === 'number' ? d.progress : undefined,
  status: d.status,
  linked_plans: Array.isArray(d.linked_plans) ? d.linked_plans : [],
  metrics: Array.isArray(d.metrics) ? d.metrics : [],
  attachments: Array.isArray(d.attachments) ? d.attachments : [],
});





