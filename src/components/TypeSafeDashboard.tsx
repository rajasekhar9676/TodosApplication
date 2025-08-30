import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db } from '../config';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';

// Define proper types
interface TeamData {
  id: string;
  name: string;
  description?: string;
  createdAt?: any;
  role?: string;
}

interface TaskData {
  id: string;
  title: string;
  teamId: string;
  teamName?: string;
  assignedTo?: string;
  status?: string;
  priority?: string;
  dueDate?: any;
}

interface UserData {
  teams?: string[];
  joinedTeams?: string[];
  displayName?: string;
  email?: string;
}

interface DashboardStats {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  teamsCount: number;
}

const TypeSafeDashboard: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    teamsCount: 0
  });

  useEffect(() => {
    if (!user) return;
    
    const loadData = async () => {
      try {
        setLoading(true);
        
        // Load user data
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserData;
          const userTeams = userData.teams || userData.joinedTeams || [];
          
          // Load teams
          const teamsData: TeamData[] = [];
          for (const teamId of userTeams) {
            try {
              const teamDoc = await getDoc(doc(db, 'teams', teamId));
              if (teamDoc.exists()) {
                const teamData = teamDoc.data();
                teamsData.push({ 
                  id: teamId, 
                  name: teamData.name || 'Unnamed Team',
                  description: teamData.description,
                  createdAt: teamData.createdAt,
                  role: teamData.role || 'member'
                });
              }
            } catch (error) {
              console.warn('Team not found:', teamId);
            }
          }
          setTeams(teamsData);
          
          // Load tasks
          const tasksQuery = await getDocs(collection(db, 'tasks'));
          const allTasks: TaskData[] = tasksQuery.docs
            .map(doc => {
              const data = doc.data();
              return {
                id: doc.id,
                title: data.title || 'Untitled Task',
                teamId: data.teamId || '',
                teamName: data.teamName,
                assignedTo: data.assignedTo,
                status: data.status || 'pending',
                priority: data.priority || 'medium',
                dueDate: data.dueDate
              };
            })
            .filter(task => userTeams.includes(task.teamId));
          
          setTasks(allTasks);
          
          // Calculate stats
          const userTasks = allTasks.filter(task => task.assignedTo === user.uid);
          setStats({
            totalTasks: userTasks.length,
            completedTasks: userTasks.filter(task => task.status === 'completed').length,
            pendingTasks: userTasks.filter(task => task.status !== 'completed').length,
            teamsCount: teamsData.length
          });
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDarkTheme ? 'bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900' : 'bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200'}`}>
        <div className="text-center">
          <div className={`animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4 ${isDarkTheme ? 'border-purple-500' : 'border-blue-600'}`}></div>
          <p className={isDarkTheme ? 'text-purple-300' : 'text-blue-700'}>Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-7xl mx-auto space-y-6 ${isDarkTheme ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Dark Theme Toggle */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsDarkTheme(!isDarkTheme)}
          className={`p-3 rounded-lg transition-all duration-200 ${
            isDarkTheme 
              ? 'bg-purple-700 hover:bg-purple-600 text-white shadow-lg' 
              : 'bg-blue-100 hover:bg-blue-200 text-blue-700 shadow-lg'
          }`}
        >
          {isDarkTheme ? '🌞' : '🌙'}
        </button>
      </div>
      
      {/* Welcome Banner */}
      <div className={`${isDarkTheme ? 'bg-gradient-to-r from-purple-900 via-pink-800 to-purple-800' : 'bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700'} rounded-2xl shadow-xl p-8 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2">Welcome back!</h1>
            <p className="text-blue-100 text-xl">Here's what's happening with your personal tasks today.</p>
            
            {/* User Profile Section */}
            <div className="mt-4 flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                  {user?.photoURL ? (
                    <img 
                      src={user.photoURL} 
                      alt="Profile" 
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  )}
                </div>
                <div>
                  <p className="text-lg font-semibold text-white">
                    {user?.displayName || user?.email?.split('@')[0] || 'User'}
                  </p>
                  <p className="text-blue-200 text-sm">
                    {user?.email || 'No email available'}
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-blue-200">Today</p>
              <p className="text-2xl font-semibold">{new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* User Profile Card */}
      <div className={`${isDarkTheme ? 'bg-gray-800 border-purple-500' : 'bg-white border-blue-500'} rounded-xl shadow-lg p-6 border-l-4`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isDarkTheme ? 'bg-purple-900 text-purple-400' : 'bg-blue-100 text-blue-600'}`}>
              {user?.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Profile" 
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              )}
            </div>
            <div>
              <h3 className={`text-xl font-bold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
                {user?.displayName || user?.email?.split('@')[0] || 'User'}
              </h3>
              <p className={`text-sm ${isDarkTheme ? 'text-purple-300' : 'text-gray-600'}`}>
                {user?.email || 'No email available'}
              </p>
              <p className={`text-xs ${isDarkTheme ? 'text-purple-400' : 'text-blue-600'}`}>
                User ID: {user?.uid?.slice(0, 8)}...
              </p>
            </div>
          </div>
          <div className={`text-right ${isDarkTheme ? 'text-purple-300' : 'text-blue-600'}`}>
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className={`${isDarkTheme ? 'bg-gray-800 border-purple-500' : 'bg-white border-blue-500'} rounded-xl shadow-lg p-6 border-l-4`}>
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${isDarkTheme ? 'bg-purple-900 text-purple-400' : 'bg-blue-100 text-blue-600'}`}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${isDarkTheme ? 'text-purple-300' : 'text-gray-600'}`}>My Tasks</p>
              <p className={`text-3xl font-bold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>{stats.totalTasks}</p>
            </div>
          </div>
        </div>

        <div className={`${isDarkTheme ? 'bg-gray-800 border-green-400' : 'bg-white border-green-500'} rounded-xl shadow-lg p-6 border-l-4`}>
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${isDarkTheme ? 'bg-green-900 text-green-400' : 'bg-green-100 text-green-600'}`}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${isDarkTheme ? 'text-green-300' : 'text-gray-600'}`}>Completed</p>
              <p className={`text-3xl font-bold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>{stats.completedTasks}</p>
            </div>
          </div>
        </div>

        <div className={`${isDarkTheme ? 'bg-gray-800 border-yellow-400' : 'bg-white border-orange-500'} rounded-xl shadow-lg p-6 border-l-4`}>
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${isDarkTheme ? 'bg-yellow-900 text-yellow-400' : 'bg-orange-100 text-orange-600'}`}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${isDarkTheme ? 'text-yellow-300' : 'text-gray-600'}`}>Pending</p>
              <p className={`text-3xl font-bold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>{stats.pendingTasks}</p>
            </div>
          </div>
        </div>

        <div className={`${isDarkTheme ? 'bg-gray-800 border-pink-400' : 'bg-white border-purple-500'} rounded-xl shadow-lg p-6 border-l-4`}>
          <div className="flex items-center">
            <div className={`p-3 rounded-full ${isDarkTheme ? 'bg-pink-900 text-pink-400' : 'bg-purple-100 text-purple-600'}`}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className={`text-sm font-medium ${isDarkTheme ? 'text-pink-300' : 'text-gray-600'}`}>Teams</p>
              <p className={`text-3xl font-bold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>{stats.teamsCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/tasks" className={`${isDarkTheme ? 'bg-gray-800 hover:border-purple-400' : 'bg-white hover:border-blue-200'} rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 hover:scale-105 border-2 border-transparent`}>
          <div className="text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkTheme ? 'bg-purple-900 text-purple-400' : 'bg-blue-100 text-blue-600'}`}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className={`text-xl font-semibold mb-2 ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>Create Task</h3>
            <p className={`mb-4 ${isDarkTheme ? 'text-purple-300' : 'text-gray-600'}`}>Add a new task to your team</p>
            <div className={`flex items-center justify-center ${isDarkTheme ? 'text-purple-400' : 'text-blue-600'}`}>
              <span className="text-sm font-medium">Get Started</span>
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>

        <Link to="/teams" className={`${isDarkTheme ? 'bg-gray-800 hover:border-pink-400' : 'bg-white hover:border-green-200'} rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 hover:scale-105 border-2 border-transparent`}>
          <div className="text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkTheme ? 'bg-pink-900 text-pink-400' : 'bg-green-100 text-green-600'}`}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className={`text-xl font-semibold mb-2 ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>Manage Teams</h3>
            <p className={`mb-4 ${isDarkTheme ? 'text-pink-300' : 'text-gray-600'}`}>Create and manage your teams</p>
            <div className={`flex items-center justify-center ${isDarkTheme ? 'text-pink-400' : 'text-green-600'}`}>
              <span className="text-sm font-medium">Get Started</span>
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>

        <Link to="/calendar" className={`${isDarkTheme ? 'bg-gray-800 hover:border-purple-400' : 'bg-white hover:border-purple-200'} rounded-xl shadow-lg p-6 hover:shadow-xl transition-all duration-200 hover:scale-105 border-2 border-transparent`}>
          <div className="text-center">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDarkTheme ? 'bg-purple-900 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className={`text-xl font-semibold mb-2 ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>View Calendar</h3>
            <p className={`mb-4 ${isDarkTheme ? 'text-purple-300' : 'text-gray-600'}`}>See your tasks in calendar view</p>
            <div className={`flex items-center justify-center ${isDarkTheme ? 'text-purple-400' : 'text-purple-600'}`}>
              <span className="text-sm font-medium">Get Started</span>
              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          </div>
        </Link>
      </div>

      {/* My Teams Section */}
      <div className={`${isDarkTheme ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <h2 className={`text-2xl font-bold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>My Teams</h2>
            <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${isDarkTheme ? 'bg-purple-900 text-purple-300' : 'bg-blue-100 text-blue-800'}`}>
              {teams.length} teams
            </span>
          </div>
          <Link to="/teams" className={`font-medium flex items-center ${isDarkTheme ? 'text-purple-400 hover:text-purple-300' : 'text-blue-600 hover:text-blue-700'}`}>
            View all teams
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>
        
        {teams.length === 0 ? (
          <p className={`text-center py-8 ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`}>No teams yet. Create your first team to get started!</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map((team) => (
              <Link
                key={team.id}
                to={`/teams/${team.id}`}
                className={`block rounded-lg p-6 transition-all duration-200 border-2 border-transparent ${
                  isDarkTheme 
                    ? 'bg-gray-700 hover:bg-gray-600 hover:border-purple-400' 
                    : 'bg-gray-50 hover:bg-blue-50 hover:border-blue-300'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className={`font-semibold text-lg ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>{team.name}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full ${isDarkTheme ? 'bg-purple-900 text-purple-300' : 'bg-blue-100 text-blue-800'}`}>
                    {team.role}
                  </span>
                </div>
                <p className={`text-sm mb-3 ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                  {team.description || 'No description provided'}
                </p>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Created {team.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown date'}</span>
                  <span className={isDarkTheme ? 'text-purple-400' : 'text-blue-600'}>→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Recent Tasks */}
      <div className={`${isDarkTheme ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-2xl font-bold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>Recent Tasks</h2>
          <Link to="/tasks" className={`font-medium flex items-center ${isDarkTheme ? 'text-purple-400 hover:text-purple-300' : 'text-blue-600 hover:text-blue-700'}`}>
            View all tasks
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>
        
        {tasks.length === 0 ? (
          <p className={`text-center py-8 ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`}>No tasks yet. Create your first task to get started!</p>
        ) : (
          <div className="space-y-4">
            {tasks.slice(0, 5).map((task) => (
              <div key={task.id} className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                isDarkTheme ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
              }`}>
                <div className="flex-1">
                  <h3 className={`font-medium ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>{task.title}</h3>
                  <p className={`text-sm ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                    {task.teamName || 'Unknown Team'} • {task.assignedTo === user?.uid ? 'You' : 'Team'}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    task.status === 'completed' ? (isDarkTheme ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800') :
                    task.status === 'in-progress' ? (isDarkTheme ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-800') :
                    (isDarkTheme ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-800')
                  }`}>
                    {task.status}
                  </span>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    task.priority === 'high' ? (isDarkTheme ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800') :
                    task.priority === 'medium' ? (isDarkTheme ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-800') :
                    (isDarkTheme ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800')
                  }`}>
                    {task.priority}
                  </span>
                  {task.dueDate && (
                    <span className={`text-xs ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`}>
                      Due: {task.dueDate?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Assigned Tasks */}
      <div className={`${isDarkTheme ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-6`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-2xl font-bold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>My Assigned Tasks</h2>
          <Link to="/tasks" className={`font-medium flex items-center ${isDarkTheme ? 'text-purple-400 hover:text-purple-300' : 'text-blue-600 hover:text-blue-700'}`}>
            View all tasks
            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
        </div>
        
        {tasks.filter(task => task.assignedTo === user?.uid).length === 0 ? (
          <p className={`text-center py-8 ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`}>No tasks assigned to you yet. Check back later!</p>
        ) : (
          <div className="space-y-4">
            {tasks.filter(task => task.assignedTo === user?.uid).slice(0, 8).map((task) => (
              <div key={task.id} className={`flex items-center justify-between p-4 rounded-lg transition-colors border-l-4 ${
                isDarkTheme ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-50 hover:bg-gray-100'
              } ${
                task.status === 'completed' ? (isDarkTheme ? 'border-green-500' : 'border-green-400') :
                task.status === 'in-progress' ? (isDarkTheme ? 'border-yellow-500' : 'border-yellow-400') :
                (isDarkTheme ? 'border-blue-500' : 'border-blue-400')
              }`}>
                <div className="flex-1">
                  <h3 className={`font-medium ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>{task.title}</h3>
                  <p className={`text-sm ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                    {task.teamName || 'Unknown Team'} • Assigned to you
                  </p>
                  {task.dueDate && (
                    <p className={`text-xs mt-1 ${isDarkTheme ? 'text-gray-400' : 'text-gray-500'}`}>
                      Due: {task.dueDate?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                    </p>
                  )}
                </div>
                <div className="flex items-center space-x-3">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    task.status === 'completed' ? (isDarkTheme ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800') :
                    task.status === 'in-progress' ? (isDarkTheme ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-800') :
                    (isDarkTheme ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-800')
                  }`}>
                    {task.status}
                  </span>
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                    task.priority === 'high' ? (isDarkTheme ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-800') :
                    task.priority === 'medium' ? (isDarkTheme ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-800') :
                    (isDarkTheme ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-800')
                  }`}>
                    {task.priority}
                  </span>
                  <Link 
                    to={`/tasks?view=${task.id}`}
                    className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
                      isDarkTheme ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Buttons */}
      <div className="fixed right-6 bottom-6 flex flex-col space-y-4">
        <button className="w-14 h-14 bg-green-500 hover:bg-green-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
        <button className="w-14 h-14 bg-blue-500 hover:bg-blue-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        </button>
        <button className="w-14 h-14 bg-purple-500 hover:bg-purple-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TypeSafeDashboard;
