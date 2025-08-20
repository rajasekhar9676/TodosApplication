import React, { useState, useEffect } from 'react';
import { collection, addDoc, query, where, onSnapshot, updateDoc, doc, deleteDoc, serverTimestamp, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../config';
import { useAuth } from '../context/AuthContext';

interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in-progress' | 'done';
  dueDate: string;
  assignedTo?: string;
  teamId?: string;
  createdBy: string;
  createdAt: any;
  isIndividual: boolean;
}

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<'individual' | 'team'>('individual');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as const,
    dueDate: '',
    assignedTo: '',
    teamId: '',
  });
  const [userTeams, setUserTeams] = useState<any[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const fetchUserTeams = async () => {
      try {
        // First, get user's teams from user document
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();

        if (userData?.teams && userData.teams.length > 0) {
          // Fetch team details for each team ID
          const teamPromises = userData.teams.map(async (teamId: string) => {
            const teamRef = doc(db, 'teams', teamId);
            const teamSnap = await getDoc(teamRef);
            if (teamSnap.exists()) {
              return { id: teamId, ...teamSnap.data() };
            }
            return null;
          });
          
          const teamsData = (await Promise.all(teamPromises)).filter(Boolean);
          setUserTeams(teamsData);
        } else {
          // Fallback: try to find teams where user is a member
          const teamsQuery = query(
            collection(db, 'teams'),
            where('members', 'array-contains-any', [user.uid, { uid: user.uid }])
          );

          const snapshot = await getDocs(teamsQuery);
          const teams = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setUserTeams(teams);
        }
      } catch (error) {
        console.error('Error fetching user teams:', error);
        setUserTeams([]);
      }
    };

    fetchUserTeams();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    // Fetch tasks based on active tab
    let tasksQuery;
    
    if (activeTab === 'individual') {
      tasksQuery = query(
        collection(db, 'tasks'),
        where('createdBy', '==', user.uid),
        where('isIndividual', '==', true)
      );
    } else {
      // Team tasks - get tasks from user's teams
      const teamIds = userTeams.map(team => team.id);
      if (teamIds.length > 0) {
        tasksQuery = query(
          collection(db, 'tasks'),
          where('teamId', 'in', teamIds),
          where('isIndividual', '==', false)
        );
      }
    }

    if (tasksQuery) {
      const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
        const tasksData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Task[];
        setTasks(tasksData);
      });

      return () => unsubscribe();
    }
  }, [user, activeTab, userTeams]);

  const handleCreateTask = async () => {
    if (!user || !newTask.title.trim()) return;

    try {
      const taskData = {
        ...newTask,
        status: 'todo' as const,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
        isIndividual: activeTab === 'individual',
        teamId: activeTab === 'individual' ? null : newTask.teamId,
      };

      await addDoc(collection(db, 'tasks'), taskData);
      
      // Reset form
      setNewTask({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: '',
        assignedTo: '',
        teamId: '',
      });
      setShowCreateModal(false);
      
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast('Task created successfully!', 'success');
      }
    } catch (error) {
      console.error('Error creating task:', error);
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast('Error creating task', 'error');
      }
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: Task['status']) => {
    try {
      await updateDoc(doc(db, 'tasks', taskId), {
        status: newStatus
      });
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteDoc(doc(db, 'tasks', taskId));
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast('Task deleted successfully!', 'success');
      }
    } catch (error) {
      console.error('Error deleting task:', error);
      if (typeof window !== 'undefined' && (window as any).showToast) {
        (window as any).showToast('Error deleting task', 'error');
      }
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'todo': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'in-progress': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'done': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'individual') {
      return task.isIndividual;
    } else {
      return !task.isIndividual;
    }
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
              <p className="mt-1 text-sm text-gray-500">
                Manage your {activeTab === 'individual' ? 'personal' : 'team'} tasks
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create Task
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8">
            <button
              onClick={() => setActiveTab('individual')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'individual'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Individual Tasks
            </button>
            <button
              onClick={() => setActiveTab('team')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'team'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              Team Tasks
            </button>
          </div>
        </div>
      </div>

      {/* Tasks Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No tasks</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating a new {activeTab === 'individual' ? 'personal' : 'team'} task.
            </p>
            <div className="mt-6">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Task
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTasks.map((task) => (
              <div key={task.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{task.title}</h3>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                  
                  {task.description && (
                    <p className="text-gray-600 mb-4 line-clamp-3">{task.description}</p>
                  )}
                  
                  <div className="flex flex-wrap gap-2 mb-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
                      {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
                    </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
                      {task.status.replace('-', ' ').charAt(0).toUpperCase() + task.status.replace('-', ' ').slice(1)}
                    </span>
                  </div>
                  
                  {task.dueDate && (
                    <div className="flex items-center text-sm text-gray-500 mb-4">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <select
                      value={task.status}
                      onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value as Task['status'])}
                      className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="done">Done</option>
                    </select>
                    
                    <div className="text-xs text-gray-400">
                      {task.createdAt?.toDate ? 
                        task.createdAt.toDate().toLocaleDateString() : 
                        new Date().toLocaleDateString()
                      }
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Create New Task</h2>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Task Title *
                  </label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter task title"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter task description"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      value={newTask.priority}
                      onChange={(e) => setNewTask({ ...newTask, priority: e.target.value as any })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Due Date
                    </label>
                    <input
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                {activeTab === 'team' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Team
                    </label>
                    <select
                      value={newTask.teamId}
                      onChange={(e) => setNewTask({ ...newTask, teamId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select a team</option>
                      {userTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={handleCreateTask}
                  disabled={!newTask.title.trim()}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create Task
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tasks; 