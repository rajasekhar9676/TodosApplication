export interface Task {
  id?: string;
  title: string;
  description?: string;
  dueDate: string;
  status: 'TO-DO' | 'IN-PROGRESS' | 'COMPLETED';
  category: string;
  priority: 'low' | 'medium' | 'high';
  taskType: 'individual' | 'team';
  teamId?: string;
  assignedTo?: string;
  activityLog?: { message: string; timestamp: string }[];
  attachments?: Array<{
    name: string;
    url: string;
    type: string;
    size: number;
    uploadedAt: string;
  }>;
  createdBy: string;
  createdAt: any;
}

export interface Team {
  id: string;
  name: string;
  members: Array<{ uid: string; role: string }>;
}



