import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { db } from '../config';
import { doc, getDoc, collection, addDoc, updateDoc, serverTimestamp, query, orderBy, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { gmailService } from '../services/gmailService';

interface Team {
  id: string;
  name: string;
  description: string;
  members: Array<{ uid: string; role: string; email?: string; displayName?: string }>;
  invitations?: Array<{ id: string; email: string; role: string; status: string; createdAt: Date }>;
  createdAt: any;
  createdBy: string;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate: any;
  assignedTo: string;
  createdAt: any;
}

const TeamDetail: React.FC = () => {
  const { teamId } = useParams<{ teamId: string }>();
  const { user } = useAuth();
  const [team, setTeam] = useState<Team | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showInviteMember, setShowInviteMember] = useState(false);
  const [creating, setCreating] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
    dueDate: '',
    assignedTo: ''
  });
  const [inviteForm, setInviteForm] = useState({
    email: '',
    role: 'member' as 'admin' | 'member'
  });

  useEffect(() => {
    if (teamId) {
      fetchTeamData();
    }
  }, [teamId]);

  const fetchTeamData = async () => {
    try {
      const teamRef = doc(db, 'teams', teamId!);
      const teamSnap = await getDoc(teamRef);
      
      if (teamSnap.exists()) {
        const teamData = { id: teamSnap.id, ...teamSnap.data() } as Team;
        setTeam(teamData);

        // Fetch team tasks
        const tasksQuery = query(
          collection(db, 'teams', teamId!, 'tasks'),
          orderBy('createdAt', 'desc')
        );
        const tasksSnap = await getDocs(tasksQuery);
        const tasksData = tasksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
        setTasks(tasksData);
      }
    } catch (error) {
      console.error('Error fetching team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !taskForm.title.trim() || !teamId) return;

    setCreating(true);
    try {
      const taskData = {
        title: taskForm.title.trim(),
        description: taskForm.description.trim(),
        status: 'todo' as const,
        priority: taskForm.priority,
        dueDate: taskForm.dueDate ? new Date(taskForm.dueDate) : null,
        assignedTo: taskForm.assignedTo || user.uid,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'teams', teamId, 'tasks'), taskData);
      
      setTaskForm({
        title: '',
        description: '',
        priority: 'medium',
        dueDate: '',
        assignedTo: ''
      });
      setShowCreateTask(false);
      fetchTeamData();
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setCreating(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamId || !inviteForm.email.trim()) return;

    setInviting(true);
    try {
      // Store invitation in Firestore
      const invitationData = {
        teamId,
        teamName: team?.name || 'Unknown Team',
        email: inviteForm.email.trim(),
        role: inviteForm.role,
        status: 'pending',
        invitedBy: user?.uid,
        invitedByName: user?.displayName || user?.email?.split('@')[0] || 'Team Member',
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      };

      const invitationRef = await addDoc(collection(db, 'invitations'), invitationData);

      // Add to team's invitations array
      const teamRef = doc(db, 'teams', teamId);
      const teamSnap = await getDoc(teamRef);
      
      if (teamSnap.exists()) {
        const teamData = teamSnap.data();
        const currentInvitations = Array.isArray(teamData.invitations) ? teamData.invitations : [];
        
        await updateDoc(teamRef, {
          invitations: [...currentInvitations, {
            id: invitationRef.id,
            email: inviteForm.email.trim(),
            role: inviteForm.role,
            status: 'pending',
            createdAt: new Date(),
          }]
        });
      }

      // Send email via Gmail API
      await sendGmailInvitation(
        inviteForm.email.trim(),
        team?.name || 'Unknown Team',
        user?.displayName || user?.email?.split('@')[0] || 'Team Member',
        inviteForm.role,
        invitationRef.id
      );

      setInviteForm({ email: '', role: 'member' });
      setShowInviteMember(false);
      fetchTeamData();
    } catch (error) {
      console.error('Error inviting member:', error);
    } finally {
      setInviting(false);
    }
  };

  const sendGmailInvitation = async (
    email: string,
    teamName: string,
    inviterName: string,
    role: string,
    invitationId: string
  ): Promise<boolean> => {
    try {
      console.log('📧 Attempting to send invitation email via Gmail API...');
      console.log('📧 To:', email);
      console.log('📧 Team:', teamName);
      console.log('📧 Inviter:', inviterName);
      console.log('📧 Role:', role);

      // Use the Gmail service to send the actual email
      const success = await gmailService.sendInvitationEmail(
        email,
        teamName,
        inviterName,
        role,
        invitationId
      );

      if (success) {
        console.log('✅ Email sent successfully via Gmail API');
        return true;
      } else {
        console.error('❌ Failed to send email via Gmail API');
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending email via Gmail API:', error);
      return false;
    }
  };

  const handleStatusUpdate = async (taskId: string, newStatus: 'todo' | 'in-progress' | 'completed') => {
    try {
      const taskRef = doc(db, 'teams', teamId!, 'tasks', taskId);
      await updateDoc(taskRef, { status: newStatus });
      fetchTeamData();
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Team not found</h2>
        <Link to="/teams" className="text-blue-600 dark:text-blue-400 hover:underline">
          Back to Teams
        </Link>
      </div>
    );
  }

  const userRole = team.members.find(m => m.uid === user?.uid)?.role || 'member';
  const isAdmin = userRole === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link to="/teams" className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{team.name}</h1>
            <p className="text-gray-600 dark:text-gray-300">{team.description}</p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {isAdmin && (
            <button
              onClick={() => setShowInviteMember(true)}
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-2 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Invite Member
            </button>
          )}
          <button
            onClick={() => setShowCreateTask(true)}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-4 py-2 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            Create Task
          </button>
        </div>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-xl">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Members</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{team.members.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 dark:bg-green-900 rounded-xl">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tasks</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{tasks.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-700/50 p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-xl">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{tasks.filter(t => t.status === 'completed').length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-700/50">
        <div className="p-6 border-b border-gray-200/50 dark:border-slate-700/50">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Team Members</h2>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {team.members.map((member, index) => (
              <div key={index} className="flex items-center space-x-3 p-4 border border-gray-200/50 dark:border-slate-700/50 rounded-xl">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {member.displayName?.charAt(0) || member.email?.charAt(0) || 'U'}
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-white">
                    {member.displayName || member.email?.split('@')[0] || 'Unknown User'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{member.email}</p>
                </div>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  member.role === 'admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                  'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                }`}>
                  {member.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Team Tasks */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-700/50">
        <div className="p-6 border-b border-gray-200/50 dark:border-slate-700/50">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Team Tasks</h2>
        </div>
        <div className="p-6">
          {tasks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No tasks yet. Create the first task!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between p-4 border border-gray-200/50 dark:border-slate-700/50 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-white mb-1">{task.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">{task.description}</p>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      {task.dueDate && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Due: {new Date(task.dueDate.toDate()).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusUpdate(task.id, e.target.value as 'todo' | 'in-progress' | 'completed')}
                      className="text-xs border border-gray-300 dark:border-slate-600 rounded px-2 py-1 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-200"
                    >
                      <option value="todo">To Do</option>
                      <option value="in-progress">In Progress</option>
                      <option value="completed">Completed</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Task Modal */}
      {showCreateTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Create New Task</h2>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                  placeholder="Enter task title"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Description
                </label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                  placeholder="Enter task description"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Priority
                  </label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, priority: e.target.value as 'low' | 'medium' | 'high' }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Due Date
                  </label>
                  <input
                    type="date"
                    value={taskForm.dueDate}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, dueDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                  />
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Task'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateTask(false)}
                  className="flex-1 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-200 py-2 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {showInviteMember && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Invite Team Member</h2>
            <form onSubmit={handleInviteMember} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={inviteForm.email}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                  placeholder="Enter email address"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Role
                </label>
                <select
                  value={inviteForm.role}
                  onChange={(e) => setInviteForm(prev => ({ ...prev, role: e.target.value as 'admin' | 'member' }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white"
                >
                  <option value="member">Member</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-medium disabled:opacity-50"
                >
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowInviteMember(false)}
                  className="flex-1 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-200 py-2 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamDetail; 