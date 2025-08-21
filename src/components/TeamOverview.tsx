import React, { useState, useEffect } from 'react';
import { db } from '../config';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

interface TeamOverviewProps {
  teamId: string;
  teamName: string;
  description: string;
  members: Array<{ uid: string; role: string; email?: string; displayName?: string }>;
  createdAt: any;
  createdBy: string;
}

interface TaskStats {
  total: number;
  todo: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

interface RecentActivity {
  id: string;
  type: 'task_created' | 'task_updated' | 'member_joined' | 'invitation_sent';
  title: string;
  description: string;
  timestamp: any;
  userId: string;
  userName: string;
}

const TeamOverview: React.FC<TeamOverviewProps> = ({ 
  teamId, 
  teamName, 
  description, 
  members, 
  createdAt, 
  createdBy 
}) => {
  const { user } = useAuth();
  const [taskStats, setTaskStats] = useState<TaskStats>({
    total: 0,
    todo: 0,
    inProgress: 0,
    completed: 0,
    overdue: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamStats();
  }, [teamId]);

  const fetchTeamStats = async () => {
    try {
      // Fetch task statistics
      const tasksQuery = query(collection(db, 'teams', teamId, 'tasks'));
      const tasksSnap = await getDocs(tasksQuery);
      
      const tasks = tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));
      const now = new Date();
      
      const stats: TaskStats = {
        total: tasks.length,
        todo: tasks.filter((t: any) => t.status === 'todo').length,
        inProgress: tasks.filter((t: any) => t.status === 'in-progress').length,
        completed: tasks.filter((t: any) => t.status === 'completed').length,
        overdue: tasks.filter((t: any) => 
          t.dueDate && 
          t.status !== 'completed' && 
          new Date(t.dueDate.toDate ? t.dueDate.toDate() : t.dueDate) < now
        ).length
      };
      
      setTaskStats(stats);

      // Fetch recent activity (last 10 activities)
      const activityQuery = query(
        collection(db, 'teams', teamId, 'activity'),
        orderBy('timestamp', 'desc'),
        limit(10)
      );
      
      try {
        const activitySnap = await getDocs(activityQuery);
        const activities = activitySnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecentActivity));
        setRecentActivity(activities);
      } catch (error) {
        // Activity collection might not exist yet
        console.log('No activity collection found, creating sample data');
        setRecentActivity([]);
      }

    } catch (error) {
      console.error('Error fetching team stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'task_created': return '📝';
      case 'task_updated': return '✏️';
      case 'member_joined': return '👋';
      case 'invitation_sent': return '📧';
      default: return '📌';
    }
  };

  const formatDate = (date: any) => {
    if (!date) return 'Unknown';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString();
  };

  return (
    <div className="space-y-6">
      {/* Team Header */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-700/50">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {teamName}
            </h1>
            <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-sm font-medium">
              {members.length} member{members.length !== 1 ? 's' : ''}
            </span>
          </div>
          
          {description && (
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              {description}
            </p>
          )}
          
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            <span>Created on {formatDate(createdAt)}</span>
            <span className="mx-2">•</span>
            <span>Team ID: {teamId}</span>
          </div>
        </div>
      </div>

      {/* Task Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200/50 dark:border-slate-700/50 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <span className="text-2xl">📊</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Tasks</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{taskStats.total}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200/50 dark:border-slate-700/50 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <span className="text-2xl">📝</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">To Do</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{taskStats.todo}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200/50 dark:border-slate-700/50 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 dark:bg-yellow-900 rounded-lg">
              <span className="text-2xl">⏳</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">In Progress</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{taskStats.inProgress}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200/50 dark:border-slate-700/50 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">{taskStats.completed}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-gray-200/50 dark:border-slate-700/50 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 dark:bg-red-900 rounded-lg">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Overdue</p>
              <p className="text-2xl font-bold text-red-600 dark:text-red-400">{taskStats.overdue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-700/50">
        <div className="p-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            Recent Activity
          </h3>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-500 dark:text-gray-400">Loading activity...</p>
            </div>
          ) : recentActivity.length > 0 ? (
            <div className="space-y-3">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-slate-700 rounded-lg">
                  <span className="text-xl">{getActivityIcon(activity.type)}</span>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-medium">{activity.userName}</span>
                      {' '}
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(activity.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No recent activity</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
                Start creating tasks to see activity here
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeamOverview;
