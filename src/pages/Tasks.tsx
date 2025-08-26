import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, updateDoc, doc, deleteDoc, getDoc, getDocs } from 'firebase/firestore';
import { db } from '../config';
import { useAuth } from '../context/AuthContext';
import { Task } from '../types/task';
import TaskListManager from '../components/TaskListManager';
import AddTaskForm from '../components/AddTaskForm';

const Tasks: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTab, setActiveTab] = useState<'individual' | 'team'>('individual');
  const [currentView, setCurrentView] = useState<'list' | 'grid' | 'calendar'>('list');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userTeams, setUserTeams] = useState<any[]>([]);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
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
        where('taskType', '==', 'individual')
      );
    } else {
      // Team tasks - get tasks from user's teams
      const teamIds = userTeams.map(team => team.id);
      if (teamIds.length > 0) {
        tasksQuery = query(
          collection(db, 'tasks'),
          where('teamId', 'in', teamIds),
          where('taskType', '==', 'team')
        );
      }
    }

    if (tasksQuery) {
      let isMounted = true;
      
      const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
        if (!isMounted) return;
        
        try {
          const tasksData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Task[];
          setTasks(tasksData);
        } catch (error) {
          console.error('Error processing tasks:', error);
        }
      }, (error) => {
        console.error('Error listening to tasks:', error);
      });

      return () => {
        isMounted = false;
        unsubscribe();
      };
    }
  }, [user, activeTab, userTeams]);

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
    } catch (error) {
      console.error('Error deleting task:', error);
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
      case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200';
      case 'IN-PROGRESS': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'TO-DO': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'individual') {
      return task.taskType === 'individual';
    } else {
      return task.taskType === 'team';
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

      {/* Task List Manager */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <TaskListManager
          tasks={filteredTasks}
          viewType={activeTab}
          onViewChange={setCurrentView}
          currentView={currentView}
        />
      </div>

      {/* Tasks Grid View */}
      {currentView === 'grid' && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
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
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setViewingTask(task)}
                          className="text-gray-400 hover:text-green-500 transition-colors"
                          title="View task details"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setEditingTask(task)}
                          className="text-gray-400 hover:text-blue-500 transition-colors"
                          title="Edit task"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => task.id && handleDeleteTask(task.id)}
                          className="text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete task"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
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
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border-gray-200">
                        {task.category}
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

                    {/* Attachments */}
                    {task.attachments && task.attachments.length > 0 && (
                      <div className="mb-4">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-sm font-medium text-gray-700">📎 Attachments ({task.attachments.length})</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {task.attachments.slice(0, 2).map((attachment, index) => (
                            <div key={index} className="flex items-center space-x-1 bg-gray-50 rounded px-2 py-1">
                              <span className="text-xs">📎</span>
                              <span className="text-xs text-gray-600 truncate max-w-16">
                                {attachment.name}
                              </span>
                            </div>
                          ))}
                          {task.attachments.length > 2 && (
                            <span className="text-xs text-gray-500">
                              +{task.attachments.length - 2} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between">
                      <select
                        value={task.status}
                        onChange={(e) => task.id && handleUpdateTaskStatus(task.id, e.target.value as Task['status'])}
                        className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="TO-DO">To Do</option>
                        <option value="IN-PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
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
      )}

      {/* Create Task Modal */}
      {showCreateModal && (
        <AddTaskForm
          taskToEdit={null}
          onClose={() => setShowCreateModal(false)}
          userTeams={userTeams}
        />
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <AddTaskForm
          taskToEdit={editingTask}
          onClose={() => setEditingTask(null)}
          userTeams={userTeams}
        />
      )}

      {/* View Task Modal */}
      {viewingTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl w-11/12 sm:w-3/4 lg:w-2/3 xl:w-1/2 max-h-[90vh] overflow-y-auto relative">
            <button onClick={() => setViewingTask(null)} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
            
            <h2 className="text-2xl font-bold mb-6 text-gray-800">Task Details</h2>
            
            <div className="space-y-6">
              {/* Task Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Task Type</label>
                <div className="flex items-center space-x-2">
                  <span className={`px-3 py-2 rounded-lg text-sm font-medium ${
                    viewingTask.taskType === 'individual' 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {viewingTask.taskType === 'individual' ? 'Individual Task' : 'Team Task'}
                  </span>
                </div>
              </div>

              {/* Title and Priority */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Task Title</label>
                  <p className="text-gray-900 font-medium">{viewingTask.title}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    viewingTask.priority === 'high' ? 'bg-red-100 text-red-800' :
                    viewingTask.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {viewingTask.priority.charAt(0).toUpperCase() + viewingTask.priority.slice(1)} Priority
                  </span>
                </div>
              </div>

              {/* Description */}
              {viewingTask.description && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <p className="text-gray-900">{viewingTask.description}</p>
                </div>
              )}

              {/* Category and Status */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {viewingTask.category}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    viewingTask.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    viewingTask.status === 'IN-PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {viewingTask.status.replace('-', ' ')}
                  </span>
                </div>
              </div>

              {/* Due Date */}
              {viewingTask.dueDate && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <p className="text-gray-900">{new Date(viewingTask.dueDate).toLocaleDateString()}</p>
                </div>
              )}

              {/* Attachments */}
              {viewingTask.attachments && viewingTask.attachments.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Attachments ({viewingTask.attachments.length})</label>
                  <div className="space-y-2">
                    {viewingTask.attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">📎</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                            <p className="text-xs text-gray-500">
                              {attachment.size > 1024 * 1024 
                                ? `${(attachment.size / (1024 * 1024)).toFixed(2)} MB` 
                                : `${(attachment.size / 1024).toFixed(2)} KB`
                              } • {new Date(attachment.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            // Handle both base64 and regular URLs
                            if (attachment.url.startsWith('data:')) {
                              // Base64 data URL - open in new window
                              const newWindow = window.open();
                              if (newWindow) {
                                newWindow.document.write(`
                                  <html>
                                    <head><title>${attachment.name}</title></head>
                                    <body style="margin:0;padding:20px;">
                                      <h2>${attachment.name}</h2>
                                      <p>File type: ${attachment.type}</p>
                                      <p>Size: ${attachment.size > 1024 * 1024 
                                        ? `${(attachment.size / (1024 * 1024)).toFixed(2)} MB` 
                                        : `${(attachment.size / 1024).toFixed(2)} KB`
                                      }</p>
                                      <hr>
                                      ${attachment.type.startsWith('image/') 
                                        ? `<img src="${attachment.url}" style="max-width:100%;height:auto;" alt="${attachment.name}">`
                                        : `<p>This file type cannot be previewed. <a href="${attachment.url}" download="${attachment.name}">Download</a> to view.</p>`
                                      }
                                    </body>
                                  </html>
                                `);
                                newWindow.document.close();
                              }
                            } else {
                              // Regular URL - open in new tab
                              window.open(attachment.url, '_blank');
                            }
                          }}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-4">
                <button
                  onClick={() => setViewingTask(null)}
                  className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setEditingTask(viewingTask);
                    setViewingTask(null);
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  Edit Task
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