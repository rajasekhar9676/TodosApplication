// Company Organization Data Models

export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type PlanStatus = 'draft' | 'active' | 'on_hold' | 'completed' | 'cancelled';
export type TargetStatus = 'not_started' | 'in_progress' | 'at_risk' | 'achieved' | 'missed';
export type TargetType = 'revenue' | 'growth' | 'engagement' | 'quality' | 'custom';

// 1) Tasks
export interface Task {
  task_id: string;
  title: string;
  description?: string;
  assigned_to?: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date?: string;            // ISO date
  start_date?: string;          // ISO date
  completion_date?: string;     // ISO date
  attachments?: Array<{
    id: string;
    name: string;
    url: string;
    mime_type?: string;
    size_bytes?: number;
  }>;
  comments?: Array<{
    id: string;
    author: string;
    message: string;
    created_at: string;         // ISO datetime
  }>;
  dependencies?: string[];      // task_id[]
}

// 2) Plans
export interface Plan {
  plan_id: string;
  name: string;
  description?: string;
  owner: string;
  start_date?: string;          // ISO date
  end_date?: string;            // ISO date
  status: PlanStatus;
  tasks: string[];              // task_id[]
  progress?: number;            // 0..100
  notes?: string;
}

// 3) Blueprints
export interface Blueprint {
  blueprint_id: string;
  name: string;
  category?: string;            // e.g., 'magazine', 'event', 'project'
  description?: string;
  default_tasks: Array<Pick<Task,
    'title' | 'description' | 'priority' | 'dependencies'
  > & {
    relative_due_days?: number; // offset from instantiation date
  }>;
  created_by: string;
  created_date: string;         // ISO datetime
  last_updated?: string;        // ISO datetime
  version: string;
}

// 4) Targets
export interface Target {
  target_id: string;
  name: string;
  description?: string;
  owner: string;                // user_id or team_id
  target_type: TargetType;
  start_date?: string;          // ISO date
  end_date?: string;            // ISO date
  progress?: number;            // 0..100
  status: TargetStatus;
  linked_plans?: string[];      // plan_id[]
  metrics?: Array<{
    key: string;               // e.g., 'Revenue', 'NPS'
    target_value: number;
    current_value?: number;
    unit?: string;             // 'USD', '%', 'count'
    last_updated?: string;     // ISO datetime
  }>;
}



