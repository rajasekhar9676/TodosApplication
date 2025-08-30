import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MultiAdminService, AdminUser } from '../services/multiAdminService';
import { adminWhatsAppService } from '../services/adminWhatsAppService';
import { db } from '../config';
import { collection, getDocs, doc, getDoc, updateDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import CreateUserForm from './CreateUserForm';
import AdminManagement from './AdminManagement';

// Admin interfaces
interface AdminStats {
  totalUsers: number;
  totalTeams: number;
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  overdueTasks: number;
}

interface UserData {
  id: string;
  displayName: string;
  email: string;
  phone?: string;
  phoneNumber?: string;
  teams: string[];
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  createdAt: any;
}

interface TeamData {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  totalTasks: number;
  completedTasks: number;
  createdAt: any;
}

interface TaskData {
  id: string;
  title: string;
  description: string;
  teamId: string | null;
  teamName: string;
  assignedTo: string;
  assignedToName: string;
  status: string;
  priority: string;
  dueDate: any;
  createdAt: any;
  document?: string;
  documentName?: string;
}

interface CreateTaskForm {
  title: string;
  description: string;
  teamId: string;
  assignedTo: string;
  priority: string;
  dueDate: string;
  document?: File | null;
  documentName?: string;
}

interface CreateTeamForm {
  name: string;
  description: string;
  members: string[];
}

type ViewMode = 'overview' | 'users' | 'teams' | 'tasks' | 'create-team' | 'create-individual-task' | 'create-group-task';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<TeamData | null>(null);
  const [stats, setStats] = useState<AdminStats>({
    totalUsers: 0,
    totalTeams: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    overdueTasks: 0
  });
  const [users, setUsers] = useState<UserData[]>([]);
  const [teams, setTeams] = useState<TeamData[]>([]);
  const [tasks, setTasks] = useState<TaskData[]>([]);
  const [createTaskForm, setCreateTaskForm] = useState<CreateTaskForm>({
    title: '',
    description: '',
    teamId: '',
    assignedTo: '',
    priority: 'medium',
    dueDate: '',
    document: null,
    documentName: ''
  });
  
  const [createTeamForm, setCreateTeamForm] = useState<CreateTeamForm>({
    name: '',
    description: '',
    members: []
  });
  const [availableTeams, setAvailableTeams] = useState<{id: string, name: string}[]>([]);
  const [availableUsers, setAvailableUsers] = useState<{id: string, name: string}[]>([]);
  
  // Success modal states
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Create user form modal state
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  
  // Dark theme state
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  
  // Current admin user state
  const [currentAdmin, setCurrentAdmin] = useState<AdminUser | null>(null);
  
  // Admin management modal state
  const [showAdminManagement, setShowAdminManagement] = useState(false);

  useEffect(() => {
    // Check admin status using the new service
    if (!MultiAdminService.isAdmin()) {
      navigate('/admin_login');
      return;
    }
    
    // Get current admin user
    const admin = MultiAdminService.getCurrentAdmin();
    setCurrentAdmin(admin);
    
    // Initialize WhatsApp service
    const apiKey = process.env.REACT_APP_DOUBLE_TICK_API_KEY || 'key_XAKKhG3Xdz';
    
    // Initialize WhatsApp service
    adminWhatsAppService.initialize(apiKey);
    
    // Load data when admin is authenticated
    loadAdminData();
  }, [navigate]);

  const loadAdminData = async () => {
    try {
      setLoading(true);
      
      // Check admin status
      if (!MultiAdminService.isAdmin()) {
        navigate('/admin_login');
        return;
      }
      
      const adminEmail = sessionStorage.getItem('adminEmail');
      
      if (!adminEmail) {
        console.log('⚠️ Admin: No admin session found');
        setLoading(false);
        return;
      }
      
      console.log('🔐 Admin: Loading data for admin dashboard...', adminEmail);
      
      // Try to load real data from Firestore first
      try {
        console.log('🔄 Admin: Attempting to fetch real data from Firestore...');
        
        // Load all users
        const usersQuery = await getDocs(collection(db, 'users'));
        const usersData: UserData[] = [];
        
        for (const userDoc of usersQuery.docs) {
          const userData = userDoc.data();
          usersData.push({
            id: userDoc.id,
            displayName: userData.displayName || userData.name || 'Unknown User',
            email: userData.email || 'No email',
            phone: userData.phone || null,
            phoneNumber: userData.phoneNumber || null,
            teams: userData.teams || userData.joinedTeams || [],
            totalTasks: 0,
            completedTasks: 0,
            pendingTasks: 0,
            createdAt: userData.createdAt
          });
        }
        console.log(`👥 Admin: Loaded ${usersData.length} real users from Firestore`);
        setUsers(usersData);
        setAvailableUsers(usersData.map(u => ({ id: u.id, name: u.displayName })));

        // Load all teams
        const teamsQuery = await getDocs(collection(db, 'teams'));
        const teamsData: TeamData[] = [];
        
        for (const teamDoc of teamsQuery.docs) {
          const teamData = teamDoc.data();
          teamsData.push({
            id: teamDoc.id,
            name: teamData.name || 'Unnamed Team',
            description: teamData.description || 'No description',
            memberCount: teamData.members?.length || 0,
            totalTasks: 0,
            completedTasks: 0,
            createdAt: teamData.createdAt
          });
        }
        console.log(`🏢 Admin: Loaded ${teamsData.length} real teams from Firestore`);
        setTeams(teamsData);
        setAvailableTeams(teamsData.map(t => ({ id: t.id, name: t.name })));

        // Load all tasks
        const tasksQuery = await getDocs(collection(db, 'tasks'));
        const tasksData: TaskData[] = [];
        const now = new Date();
        
        for (const taskDoc of tasksQuery.docs) {
          const taskData = taskDoc.data();
          const dueDate = taskData.dueDate?.toDate?.() || new Date();
          
          tasksData.push({
            id: taskDoc.id,
            title: taskData.title || 'Untitled Task',
            description: taskData.description || 'No description',
            teamId: taskData.teamId || '',
            teamName: taskData.teamName || 'Unknown Team',
            assignedTo: taskData.assignedTo || '',
            assignedToName: taskData.assignedToName || 'Unassigned',
            status: taskData.status || 'todo',
            priority: taskData.priority || 'medium',
            dueDate: taskData.dueDate,
            createdAt: taskData.createdAt
          });
        }
        console.log(`✅ Admin: Loaded ${tasksData.length} real tasks from Firestore`);
        setTasks(tasksData);

        // Calculate stats
        const totalUsers = usersData.length;
        const totalTeams = teamsData.length;
        const totalTasks = tasksData.length;
        const completedTasks = tasksData.filter(t => t.status === 'completed').length;
        const pendingTasks = tasksData.filter(t => t.status !== 'completed').length;
        const overdueTasks = tasksData.filter(t => {
          const dueDate = t.dueDate?.toDate?.() || new Date();
          return dueDate < now && t.status !== 'completed';
        }).length;

        setStats({
          totalUsers,
          totalTeams,
          totalTasks,
          completedTasks,
          pendingTasks,
          overdueTasks
        });

        // Update user task counts
        const updatedUsers = usersData.map(user => {
          const userTasks = tasksData.filter(t => t.assignedTo === user.id);
          return {
            ...user,
            totalTasks: userTasks.length,
            completedTasks: userTasks.filter(t => t.status === 'completed').length,
            pendingTasks: userTasks.filter(t => t.status !== 'completed').length
          };
        });
        setUsers(updatedUsers);

        // Update team task counts
        const updatedTeams = teamsData.map(team => {
          const teamTasks = tasksData.filter(t => t.teamId === team.id);
          return {
            ...team,
            totalTasks: teamTasks.length,
            completedTasks: teamTasks.filter(t => t.status === 'completed').length
          };
        });
        setTeams(updatedTeams);

        console.log('🎯 Admin: Real data loading completed successfully from Firestore!');
        return; // Exit early since we got real data
        
             } catch (firestoreError: any) {
         console.error('❌ Admin: Firestore access failed:', firestoreError);
         
         // Check if it's a permissions error
         if (firestoreError.code === 'permission-denied') {
          console.log('🔒 Admin: Permission denied - checking if we need to create admin account');
          // Try to initialize default admin accounts if they don't exist
          try {
            await MultiAdminService.initializeDefaultAdmins();
            // Retry loading data
            console.log('🔄 Admin: Retrying data load after admin initialization...');
            // Recursive call to retry
            setTimeout(() => loadAdminData(), 1000);
            return;
          } catch (createError) {
            console.error('❌ Admin: Failed to initialize admin accounts:', createError);
          }
        }
        
        // If all else fails, fall back to mock data
        console.log('🔄 Admin: Falling back to mock data due to Firestore access issues');
        loadMockData();
      }

    } catch (error) {
      console.error('❌ Admin: Error loading admin data:', error);
      
      // Only redirect if admin session is lost
      if (!MultiAdminService.isAdmin()) {
        console.log('🔐 Admin: Admin session lost, redirecting to login');
        navigate('/admin_login');
        return;
      }
      
      // If it's a different error, show it but don't redirect
      console.log('⚠️ Admin: Data loading failed but admin session is valid');
    } finally {
      setLoading(false);
    }
  };

  // Load mock data for session-only mode
  const loadMockData = () => {
    console.log('🔄 Admin: Loading mock data for session-only mode...');
    
    const mockUsers: UserData[] = [
      {
        id: 'mock-user-1',
        displayName: 'John Doe',
        email: 'john.doe@company.com',
        teams: ['mock-team-1', 'mock-team-3'],
        totalTasks: 8,
        completedTasks: 5,
        pendingTasks: 3,
        createdAt: new Date('2024-01-15')
      },
      {
        id: 'mock-user-2',
        displayName: 'Jane Smith',
        email: 'jane.smith@company.com',
        teams: ['mock-team-1', 'mock-team-2'],
        totalTasks: 12,
        completedTasks: 8,
        pendingTasks: 4,
        createdAt: new Date('2024-02-01')
      },
      {
        id: 'mock-user-3',
        displayName: 'Mike Johnson',
        email: 'mike.johnson@company.com',
        teams: ['mock-team-2'],
        totalTasks: 6,
        completedTasks: 4,
        pendingTasks: 2,
        createdAt: new Date('2024-03-10')
      },
      {
        id: 'mock-user-4',
        displayName: 'Sarah Wilson',
        email: 'sarah.wilson@company.com',
        teams: ['mock-team-3'],
        totalTasks: 9,
        completedTasks: 7,
        pendingTasks: 2,
        createdAt: new Date('2024-01-20')
      }
    ];

    const mockTeams: TeamData[] = [
      {
        id: 'mock-team-1',
        name: 'Development Team',
        description: 'Software development and engineering team',
        memberCount: 8,
        totalTasks: 20,
        completedTasks: 13,
        createdAt: new Date('2024-01-01')
      },
      {
        id: 'mock-team-2',
        name: 'Design Team',
        description: 'UI/UX design and creative team',
        memberCount: 5,
        totalTasks: 15,
        completedTasks: 10,
        createdAt: new Date('2024-01-15')
      },
      {
        id: 'mock-team-3',
        name: 'Marketing Team',
        description: 'Digital marketing and content creation',
        memberCount: 6,
        totalTasks: 18,
        completedTasks: 12,
        createdAt: new Date('2024-02-01')
      }
    ];

    const mockTasks: TaskData[] = [
      {
        id: 'mock-task-1',
        title: 'Implement User Authentication System',
        description: 'Build secure login and registration functionality with JWT tokens',
        teamId: 'mock-team-1',
        teamName: 'Development Team',
        assignedTo: 'mock-user-1',
        assignedToName: 'John Doe',
        status: 'completed',
        priority: 'high',
        dueDate: new Date('2024-08-15'),
        createdAt: new Date('2024-08-01')
      },
      {
        id: 'mock-task-2',
        title: 'Design New Dashboard Interface',
        description: 'Create modern and responsive dashboard UI components',
        teamId: 'mock-team-2',
        teamName: 'Design Team',
        assignedTo: 'mock-user-2',
        assignedToName: 'Jane Smith',
        status: 'in-progress',
        priority: 'medium',
        dueDate: new Date('2024-08-25'),
        createdAt: new Date('2024-08-05')
      },
      {
        id: 'mock-task-3',
        title: 'Database Optimization',
        description: 'Optimize database queries and improve performance',
        teamId: 'mock-team-1',
        teamName: 'Development Team',
        assignedTo: 'mock-user-1',
        assignedToName: 'John Doe',
        status: 'todo',
        priority: 'high',
        dueDate: new Date('2024-08-30'),
        createdAt: new Date('2024-08-10')
      },
      {
        id: 'mock-task-4',
        title: 'Create Marketing Campaign',
        description: 'Develop Q4 marketing strategy and campaign materials',
        teamId: 'mock-team-3',
        teamName: 'Marketing Team',
        assignedTo: 'mock-user-4',
        assignedToName: 'Sarah Wilson',
        status: 'in-progress',
        priority: 'medium',
        dueDate: new Date('2024-09-15'),
        createdAt: new Date('2024-08-01')
      },
      {
        id: 'mock-task-5',
        title: 'Mobile App Design',
        description: 'Design mobile app interface and user experience',
        teamId: 'mock-team-2',
        teamName: 'Design Team',
        assignedTo: 'mock-user-3',
        assignedToName: 'Mike Johnson',
        status: 'completed',
        priority: 'low',
        dueDate: new Date('2024-08-10'),
        createdAt: new Date('2024-07-20')
      }
    ];

    setUsers(mockUsers);
    setTeams(mockTeams);
    setTasks(mockTasks);
    setAvailableUsers(mockUsers.map(u => ({ id: u.id, name: u.displayName })));
    setAvailableTeams(mockTeams.map(t => ({ id: t.id, name: t.name })));

    // Calculate stats
    const totalUsers = mockUsers.length;
    const totalTeams = mockTeams.length;
    const totalTasks = mockTasks.length;
    const completedTasks = mockTasks.filter(t => t.status === 'completed').length;
    const pendingTasks = mockTasks.filter(t => t.status !== 'completed').length;
    const overdueTasks = mockTasks.filter(t => {
      const dueDate = t.dueDate || new Date();
      return dueDate < new Date() && t.status !== 'completed';
    }).length;

    setStats({
      totalUsers,
      totalTeams,
      totalTasks,
      completedTasks,
      pendingTasks,
      overdueTasks
    });

    console.log('🎯 Admin: Mock data loading completed successfully');
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    try {
      // Always try to update real data in Firestore first
      try {
        await updateDoc(doc(db, 'tasks', taskId), {
          status: newStatus,
          updatedAt: serverTimestamp()
        });
        
        // Update local state
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        ));
        
        // Recalculate stats
        const updatedTasks = tasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        );
        
        const completedTasks = updatedTasks.filter(t => t.status === 'completed').length;
        const pendingTasks = updatedTasks.filter(t => t.status !== 'completed').length;
        
        setStats(prev => ({
          ...prev,
          completedTasks,
          pendingTasks
        }));
        
        console.log('✅ Admin: Task status updated successfully in Firestore');
        
        // Refresh data to ensure consistency
        loadAdminData();
        
      } catch (firestoreError: any) {
        console.error('❌ Admin: Failed to update task in Firestore:', firestoreError);
        
        // If Firestore fails, update locally and show warning
        setTasks(prev => prev.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        ));
        
        // Recalculate stats
        const updatedTasks = tasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        );
        
        const completedTasks = updatedTasks.filter(t => t.status === 'completed').length;
        const pendingTasks = updatedTasks.filter(t => t.status !== 'completed').length;
        
        setStats(prev => ({
          ...prev,
          completedTasks,
          pendingTasks
        }));
        
        console.log('⚠️ Admin: Task status updated locally (Firestore update failed)');
        alert('Task status updated locally. Firestore update failed. Please refresh to sync.');
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleLogout = () => {
    MultiAdminService.logoutAdmin();
    navigate('/admin_login');
  };

  const handleCreateTeam = async () => {
    try {
      if (!createTeamForm.name || !createTeamForm.description) {
        alert('Please fill in team name and description');
        return;
      }

      // Try to create team in Firestore
      try {
        const newTeam = {
          name: createTeamForm.name,
          description: createTeamForm.description,
          members: createTeamForm.members,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'teams'), newTeam);
        console.log('✅ Admin: Team created successfully in Firestore with ID:', docRef.id);
        
        // Clear form
        setCreateTeamForm({
          name: '',
          description: '',
          members: []
        });
        
        // Show success message
        setSuccessMessage('Team created successfully! 🎉');
        setShowSuccessModal(true);
        
        // Refresh data to show new team
        loadAdminData();
        
      } catch (firestoreError: any) {
        console.error('❌ Admin: Failed to create team in Firestore:', firestoreError);
        
        // If Firestore fails, create locally and show warning
        const newTeam: TeamData = {
          id: `local-team-${Date.now()}`,
          name: createTeamForm.name,
          description: createTeamForm.description,
          memberCount: createTeamForm.members.length,
          totalTasks: 0,
          completedTasks: 0,
          createdAt: new Date()
        };

        setTeams(prev => [...prev, newTeam]);
        
        // Update stats
        setStats(prev => ({
          ...prev,
          totalTeams: prev.totalTeams + 1
        }));
        
        setCreateTeamForm({
          name: '',
          description: '',
          members: []
        });
        
        console.log('⚠️ Admin: Team created locally (Firestore creation failed)');
        alert('Team created locally. Firestore creation failed. Please refresh to sync.');
      }
      
    } catch (error) {
      console.error('Error creating team:', error);
    }
  };

  const handleCreateTask = async () => {
    try {
      // Check if we're in individual task mode or group task mode
      const isIndividualTask = viewMode === 'create-individual-task';
      
      if (!createTaskForm.title) {
        alert('Please enter task title');
        return;
      }
      
      if (isIndividualTask && !createTaskForm.assignedTo) {
        alert('Please select a user to assign the task to');
        return;
      }
      
      if (!isIndividualTask && !createTaskForm.teamId) {
        alert('Please select a team for the group task');
        return;
      }

      // Always try to create real task in Firestore first
      try {
        // Only fetch team data if teamId is provided
        let teamData = null;
        if (createTaskForm.teamId && createTaskForm.teamId.trim() !== '') {
          const teamDoc = await getDoc(doc(db, 'teams', createTaskForm.teamId));
          teamData = teamDoc.data();
        }
        
        // Only fetch user data if assignedTo is provided
        let userData = null;
        if (createTaskForm.assignedTo && createTaskForm.assignedTo.trim() !== '') {
          const userDoc = await getDoc(doc(db, 'users', createTaskForm.assignedTo));
          userData = userDoc.data();
        }

        const newTask = {
          title: createTaskForm.title,
          description: createTaskForm.description,
          teamId: createTaskForm.teamId || null,
          teamName: teamData?.name || 'No Team',
          assignedTo: createTaskForm.assignedTo || null,
          assignedToName: userData?.displayName || 'Team Task',
          status: 'todo',
          priority: createTaskForm.priority,
          dueDate: createTaskForm.dueDate ? new Date(createTaskForm.dueDate) : null,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        const docRef = await addDoc(collection(db, 'tasks'), newTask);
        console.log('✅ Admin: Task created successfully in Firestore with ID:', docRef.id);
        
        // Send WhatsApp notification
        try {
          console.log('📱 Admin: Sending WhatsApp notification for new task...');
          console.log('📱 Admin: Task details:', {
            title: newTask.title,
            assignedTo: newTask.assignedTo,
            assignedToName: newTask.assignedToName,
            teamName: newTask.teamName
          });
          
          // Only send WhatsApp notification for individual tasks (when assignedTo is provided)
          if (newTask.assignedTo) {
            const notificationData = {
              taskId: docRef.id,
              taskTitle: newTask.title,
              taskDescription: newTask.description,
              teamId: newTask.teamId,
              teamName: newTask.teamName,
              assignedTo: newTask.assignedTo, // This is guaranteed to be string here
              assignedToName: newTask.assignedToName,
              priority: newTask.priority,
              dueDate: newTask.dueDate || new Date(),
              taskLink: `${window.location.origin}/task/${docRef.id}`,
              createdAt: new Date()
            };
            
            console.log('📱 Admin: Notification data prepared:', notificationData);
            
            const result = await adminWhatsAppService.sendTaskCreationNotification(
              notificationData,
              newTask.assignedTo
            );
            
            console.log('📱 Admin: WhatsApp service response:', result);
            
            if (result.success) {
              console.log('✅ Admin: WhatsApp notification sent successfully');
            } else {
              console.log('⚠️ Admin: WhatsApp notification failed:', result.message);
            }
          } else {
            console.log('📱 Admin: Skipping WhatsApp notification for team task (no individual assignee)');
          }
          
        } catch (whatsappError) {
          console.error('❌ Admin: Error sending WhatsApp notification:', whatsappError);
        }
        
        // Clear form
        setCreateTaskForm({
          title: '',
          description: '',
          teamId: '',
          assignedTo: '',
          priority: 'medium',
          dueDate: '',
          document: null,
          documentName: ''
        });
        
        // Show success message
        const taskType = viewMode === 'create-individual-task' ? 'Individual Task' : 'Group Task';
        const notificationText = newTask.assignedTo ? ' WhatsApp notification sent.' : '';
        setSuccessMessage(`${taskType} created successfully!${notificationText} 📱`);
        setShowSuccessModal(true);
        
        // Refresh data to show new task
        loadAdminData();
        
      } catch (firestoreError: any) {
        console.error('❌ Admin: Failed to create task in Firestore:', firestoreError);
        
        // If Firestore fails, create locally and show warning
        const team = createTaskForm.teamId ? teams.find(t => t.id === createTaskForm.teamId) : null;
        const user = users.find(u => u.id === createTaskForm.assignedTo);
        
        const newTask: TaskData = {
          id: `local-task-${Date.now()}`,
          title: createTaskForm.title,
          description: createTaskForm.description,
          teamId: createTaskForm.teamId || null,
          teamName: team?.name || 'No Team',
          assignedTo: createTaskForm.assignedTo,
          assignedToName: user?.displayName || 'Unknown User',
          status: 'todo',
          priority: createTaskForm.priority,
          dueDate: createTaskForm.dueDate ? new Date(createTaskForm.dueDate) : null,
          createdAt: new Date()
        };

        setTasks(prev => [...prev, newTask]);
        
        // Update stats
        setStats(prev => ({
          ...prev,
          totalTasks: prev.totalTasks + 1,
          pendingTasks: prev.pendingTasks + 1
        }));
        
        // Update user task counts
        setUsers(prev => prev.map(u => 
          u.id === createTaskForm.assignedTo 
            ? { ...u, totalTasks: u.totalTasks + 1, pendingTasks: u.pendingTasks + 1 }
            : u
        ));
        
        // Update team task counts (only if teamId exists)
        if (createTaskForm.teamId) {
          setTeams(prev => prev.map(t => 
            t.id === createTaskForm.teamId 
              ? { ...t, totalTasks: t.totalTasks + 1 }
              : t
          ));
        }
        
        setCreateTaskForm({
          title: '',
          description: '',
          teamId: '',
          assignedTo: '',
          priority: 'medium',
          dueDate: ''
        });
        
        console.log('⚠️ Admin: Task created locally (Firestore creation failed)');
        alert('Task created locally. Firestore creation failed. Please refresh to sync.');
      }
      
    } catch (error) {
      console.error('Error creating task:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-yellow-100 text-yellow-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUserTasks = (userId: string) => {
    return tasks.filter(task => task.assignedTo === userId);
  };

  const getTeamTasks = (teamId: string) => {
    return tasks.filter(task => task.teamId === teamId);
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const adminEmail = sessionStorage.getItem('adminEmail');

     if (loading || !adminEmail) {
     return (
       <div className={`min-h-screen flex items-center justify-center ${isDarkTheme ? 'bg-gray-900' : 'bg-white'}`}>
         <div className="text-center">
           <div className={`animate-spin rounded-full h-16 w-16 border-b-2 mx-auto mb-4 ${isDarkTheme ? 'border-purple-500' : 'border-blue-600'}`}></div>
           <p className={`text-lg ${isDarkTheme ? 'text-purple-400' : 'text-blue-600'}`}>
             {!adminEmail ? 'Waiting for admin authentication...' : 'Loading Admin Dashboard...'}
           </p>
           {!adminEmail && (
             <p className={`text-sm mt-2 ${isDarkTheme ? 'text-purple-300' : 'text-blue-500'}`}>
               Please login as admin first
             </p>
           )}
         </div>
       </div>
     );
   }

                           return (
     <div className={`min-h-screen flex ${isDarkTheme ? 'bg-gray-900' : 'bg-white'}`}>
      {/* Mobile Sidebar Toggle */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
       <button
         onClick={() => setSidebarOpen(!sidebarOpen)}
         className="p-2 bg-white rounded-lg shadow-lg border border-gray-200"
       >
         <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
         </svg>
       </button>
     </div>

                         {/* Sidebar */}
               <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 fixed lg:block inset-y-0 left-0 z-40 w-72 border-r-2 h-screen shadow-xl transition-transform duration-300 ease-in-out ${
          isDarkTheme 
            ? 'bg-gray-800 border-purple-600 text-white' 
            : 'bg-gray-50 border-gray-300 text-gray-800'
        }`}>
       <div className="p-4 lg:p-8">
          {/* Logo Section */}
                     <div className="flex items-center space-x-4 mb-8 lg:mb-12">
             <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl flex items-center justify-center shadow-lg ${
               isDarkTheme 
                 ? 'bg-gradient-to-br from-purple-500 to-pink-600' 
                 : 'bg-gradient-to-br from-blue-500 to-purple-600'
             }`}>
               <span className="text-white text-xl lg:text-2xl font-bold">👑</span>
             </div>
             <div>
               <h1 className={`text-lg lg:text-2xl font-bold tracking-tight ${isDarkTheme ? 'text-white' : 'text-gray-800'}`}>Admin Panel</h1>
               <p className={`text-xs lg:text-sm font-medium ${isDarkTheme ? 'text-purple-300' : 'text-gray-500'}`}>Control Center</p>
             </div>
           </div>
          
          {/* Navigation */}
          <nav className="space-y-2 lg:space-y-3">
                         <button
               onClick={() => { setViewMode('overview'); setSidebarOpen(false); }}
               className={`w-full text-left px-4 lg:px-6 py-3 lg:py-4 rounded-xl transition-all duration-200 font-medium text-base lg:text-lg ${
                 viewMode === 'overview' 
                   ? isDarkTheme
                     ? 'bg-gradient-to-r from-purple-900 to-pink-800 text-white border-2 border-purple-400 shadow-md'
                     : 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border-2 border-blue-200 shadow-md' 
                   : isDarkTheme
                     ? 'text-purple-200 hover:bg-gray-700 hover:text-white hover:shadow-sm'
                     : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 hover:shadow-sm'
               }`}
             >
              <span className="text-lg lg:text-xl mr-3">📊</span>
              Overview
            </button>
            <button
              onClick={() => { setViewMode('users'); setSidebarOpen(false); }}
              className={`w-full text-left px-4 lg:px-6 py-3 lg:py-4 rounded-xl transition-all duration-200 font-medium text-base lg:text-lg ${
                viewMode === 'users' 
                  ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border-2 border-blue-200 shadow-md' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 hover:shadow-sm'
              }`}
            >
              <span className="text-lg lg:text-xl mr-3">👥</span>
              Users
            </button>
            <button
              onClick={() => { setViewMode('teams'); setSidebarOpen(false); }}
              className={`w-full text-left px-4 lg:px-6 py-3 lg:py-4 rounded-xl transition-all duration-200 font-medium text-base lg:text-lg ${
                viewMode === 'teams' 
                  ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border-2 border-blue-200 shadow-md' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 hover:shadow-sm'
              }`}
            >
              <span className="text-lg lg:text-xl mr-3">🏢</span>
              Teams
            </button>
            <button
              onClick={() => { setViewMode('tasks'); setSidebarOpen(false); }}
              className={`w-full text-left px-4 lg:px-6 py-3 lg:py-4 rounded-xl transition-all duration-200 font-medium text-base lg:text-lg ${
                viewMode === 'tasks' 
                  ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border-2 border-blue-200 shadow-md' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 hover:shadow-sm'
              }`}
            >
              <span className="text-lg lg:text-xl mr-3">✅</span>
              Tasks
            </button>
                         <button
               onClick={() => { setViewMode('create-individual-task'); setSidebarOpen(false); }}
               className={`w-full text-left px-4 lg:px-6 py-3 lg:py-4 rounded-xl transition-all duration-200 font-medium text-base lg:text-lg ${
                 viewMode === 'create-individual-task' 
                   ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border-2 border-blue-200 shadow-md' 
                   : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 hover:shadow-sm'
               }`}
             >
               <span className="text-lg lg:text-xl mr-3">👤</span>
               Individual Task
             </button>
             <button
               onClick={() => { setViewMode('create-group-task'); setSidebarOpen(false); }}
               className={`w-full text-left px-4 lg:px-6 py-3 lg:py-4 rounded-xl transition-all duration-200 font-medium text-base lg:text-lg ${
                 viewMode === 'create-group-task' 
                   ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border-2 border-blue-200 shadow-md' 
                   : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 hover:shadow-sm'
               }`}
             >
               <span className="text-lg lg:text-xl mr-3">👥</span>
               Group Task
             </button>
             <button
               onClick={() => { setViewMode('create-team'); setSidebarOpen(false); }}
               className={`w-full text-left px-4 lg:px-6 py-3 lg:py-4 rounded-xl transition-all duration-200 font-medium text-base lg:text-lg ${
                 viewMode === 'create-team' 
                   ? 'bg-gradient-to-r from-blue-50 to-purple-50 text-blue-700 border-2 border-blue-200 shadow-md' 
                   : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800 hover:shadow-sm'
               }`}
             >
               <span className="text-lg lg:text-xl mr-3">🏢</span>
               Create Team
             </button>
                    </nav>
          

          
          {/* Logout Section */}
          <div className={`mt-8 lg:mt-12 pt-6 lg:pt-8 border-t ${isDarkTheme ? 'border-gray-600' : 'border-gray-200'}`}>
                         <button
               onClick={handleLogout}
               className={`w-full px-4 lg:px-6 py-3 lg:py-4 rounded-xl transition-all duration-200 text-white font-semibold text-base lg:text-lg shadow-lg hover:shadow-xl ${
                 isDarkTheme
                   ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                   : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700'
               }`}
             >
               <span className="text-lg lg:text-xl mr-3">🚪</span>
               Logout Admin
             </button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
                                                                                                               {/* Main Content */}
          <div className={`flex-1 p-4 lg:p-8 ml-0 lg:ml-72 ${isDarkTheme ? 'bg-gray-900' : 'bg-gray-50/30'}`}>
        {viewMode === 'overview' && (
          <div className="space-y-6">
                         {/* Header */}
                           <div className={`${isDarkTheme ? 'bg-gradient-to-r from-purple-900 via-pink-800 to-purple-800' : 'bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700'} rounded-2xl shadow-xl p-4 lg:p-8 text-white`}>
               <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
                 <div>
                   <h1 className="text-2xl lg:text-4xl font-bold mb-2">👑 Admin Dashboard</h1>
                   <p className="text-blue-100 text-base lg:text-xl">Manage your entire organization from one place</p>
                 </div>
                                   <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                    <button
                      onClick={() => setIsDarkTheme(!isDarkTheme)}
                      className="px-4 lg:px-6 py-2 lg:py-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-200 text-white font-medium shadow-lg hover:shadow-xl text-sm lg:text-base"
                    >
                      {isDarkTheme ? '🌞' : '🌙'}
                    </button>
                    

                    
                    <button
                      onClick={loadAdminData}
                      className="px-4 lg:px-6 py-2 lg:py-3 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-200 text-white font-medium shadow-lg hover:shadow-xl text-sm lg:text-base"
                    >
                      🔄 Refresh Data
                    </button>
                    
                    {/* Admin Management Button - Only show for super admins and admins */}
                    {(currentAdmin?.role === 'super_admin' || currentAdmin?.role === 'admin') && (
                      <button
                        onClick={() => setShowAdminManagement(true)}
                        className="px-4 lg:px-6 py-2 lg:py-3 bg-orange-500 hover:bg-orange-600 rounded-xl transition-all duration-200 text-white font-medium shadow-lg hover:shadow-xl text-sm lg:text-base"
                      >
                        👥 Manage Admins
                      </button>
                    )}
                    <div className="text-left sm:text-right">
                      <p className="text-blue-200 text-sm lg:text-base">Welcome back,</p>
                      <p className="text-lg lg:text-2xl font-semibold">
                        {currentAdmin?.displayName || adminEmail || 'Administrator'}
                      </p>
                      {currentAdmin && (
                        <div className="flex items-center space-x-2 mt-1">
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            currentAdmin.role === 'super_admin' ? 'bg-red-500 text-white' :
                            currentAdmin.role === 'admin' ? 'bg-blue-500 text-white' :
                            'bg-green-500 text-white'
                          }`}>
                            {currentAdmin.role.replace('_', ' ').toUpperCase()}
                          </span>
                          <span className="text-blue-200 text-xs">
                            {currentAdmin.email}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
               </div>
             </div>



                         {/* Stats Overview */}
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                                                           <div className={`${isDarkTheme ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4 lg:p-6 border-l-4 ${isDarkTheme ? 'border-purple-500' : 'border-blue-500'}`}>
                  <div className="flex items-center">
                    <div className={`p-2 lg:p-3 rounded-full ${isDarkTheme ? 'bg-purple-900 text-purple-400' : 'bg-blue-100 text-blue-600'}`}>
                      <svg className="w-6 h-6 lg:w-8 lg:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <div className="ml-3 lg:ml-4">
                      <p className={`text-xs lg:text-sm font-medium ${isDarkTheme ? 'text-purple-300' : 'text-gray-600'}`}>Total Users</p>
                      <p className={`text-2xl lg:text-3xl font-bold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>{stats.totalUsers}</p>
                    </div>
                  </div>
                </div>

                                                           <div className={`${isDarkTheme ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4 lg:p-6 border-l-4 ${isDarkTheme ? 'border-green-400' : 'border-green-500'}`}>
                  <div className="flex items-center">
                    <div className={`p-2 lg:p-3 rounded-full ${isDarkTheme ? 'bg-green-900 text-green-400' : 'bg-green-100 text-green-600'}`}>
                      <svg className="w-6 h-6 lg:w-8 lg:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <div className="ml-3 lg:ml-4">
                      <p className={`text-xs lg:text-sm font-medium ${isDarkTheme ? 'text-green-300' : 'text-gray-600'}`}>Total Teams</p>
                      <p className={`text-2xl lg:text-3xl font-bold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>{stats.totalTeams}</p>
                    </div>
                  </div>
                </div>

                               <div className={`${isDarkTheme ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4 lg:p-6 border-l-4 ${isDarkTheme ? 'border-purple-400' : 'border-purple-500'}`}>
                  <div className="flex items-center">
                    <div className={`p-2 lg:p-3 rounded-full ${isDarkTheme ? 'bg-purple-900 text-purple-400' : 'bg-purple-100 text-purple-600'}`}>
                      <svg className="w-6 h-6 lg:w-8 lg:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div className="ml-3 lg:ml-4">
                      <p className={`text-xs lg:text-sm font-medium ${isDarkTheme ? 'text-purple-300' : 'text-gray-600'}`}>Total Tasks</p>
                      <p className={`text-2xl lg:text-3xl font-bold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>{stats.totalTasks}</p>
                    </div>
                  </div>
                </div>

                               <div className={`${isDarkTheme ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4 lg:p-6 border-l-4 ${isDarkTheme ? 'border-yellow-400' : 'border-yellow-500'}`}>
                  <div className="flex items-center">
                    <div className={`p-2 lg:p-3 rounded-full ${isDarkTheme ? 'bg-yellow-900 text-yellow-400' : 'bg-yellow-100 text-yellow-600'}`}>
                      <svg className="w-6 h-6 lg:w-8 lg:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3 lg:ml-4">
                      <p className={`text-xs lg:text-sm font-medium ${isDarkTheme ? 'text-yellow-300' : 'text-gray-600'}`}>Pending Tasks</p>
                      <p className={`text-2xl lg:text-3xl font-bold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>{stats.pendingTasks}</p>
                    </div>
                  </div>
                </div>

                <div className={`${isDarkTheme ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4 lg:p-6 border-l-4 ${isDarkTheme ? 'border-green-400' : 'border-green-500'}`}>
                  <div className="flex items-center">
                    <div className={`p-2 lg:p-3 rounded-full ${isDarkTheme ? 'bg-green-900 text-green-400' : 'bg-green-100 text-green-600'}`}>
                      <svg className="w-6 h-6 lg:w-8 lg:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="ml-3 lg:ml-4">
                      <p className={`text-xs lg:text-sm font-medium ${isDarkTheme ? 'text-green-300' : 'text-gray-600'}`}>Completed</p>
                      <p className={`text-2xl lg:text-3xl font-bold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>{stats.completedTasks}</p>
                    </div>
                  </div>
                </div>

                <div className={`${isDarkTheme ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4 lg:p-6 border-l-4 ${isDarkTheme ? 'border-red-400' : 'border-red-500'}`}>
                  <div className="flex items-center">
                    <div className={`p-2 lg:p-3 rounded-full ${isDarkTheme ? 'bg-red-900 text-red-400' : 'bg-red-100 text-red-600'}`}>
                      <svg className="w-6 h-6 lg:w-8 lg:h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h1.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                    </div>
                    <div className="ml-3 lg:ml-4">
                      <p className={`text-xs lg:text-sm font-bold ${isDarkTheme ? 'text-red-300' : 'text-gray-600'}`}>Overdue</p>
                      <p className={`text-2xl lg:text-3xl font-bold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>{stats.overdueTasks}</p>
                    </div>
                  </div>
                </div>
                

            </div>
            
                                     {/* Quick Actions */}
                           <div className={`${isDarkTheme ? 'bg-gray-800 border-gray-600' : 'bg-white border-gray-200'} border rounded-xl p-4 lg:p-6`}>
                <h3 className={`text-base lg:text-lg font-semibold mb-4 ${isDarkTheme ? 'text-white' : 'text-gray-800'}`}>🚀 Quick Actions</h3>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-4">
                                                      <button
                     onClick={() => setViewMode('create-individual-task')}
                     className={`p-3 lg:p-4 rounded-lg border transition-all duration-200 text-center ${
                       isDarkTheme
                         ? 'bg-gray-700 border-gray-600 hover:border-purple-400 hover:shadow-lg'
                         : 'bg-gray-50 border-gray-200 hover:border-blue-300 hover:shadow-lg'
                     }`}
                   >
                     <div className="text-2xl lg:text-3xl mb-2">👤</div>
                     <div className={`font-medium text-sm lg:text-base ${
                       isDarkTheme ? 'text-white' : 'text-gray-700'
                     }`}>Individual Task</div>
                     <div className={`text-xs lg:text-sm ${
                       isDarkTheme ? 'text-purple-300' : 'text-gray-500'
                     }`}>Assign to one user</div>
                   </button>
                                     <button
                     onClick={() => setViewMode('create-group-task')}
                     className={`p-3 lg:p-4 rounded-lg border transition-all duration-200 text-center ${
                       isDarkTheme
                         ? 'bg-gray-700 border-gray-600 hover:border-pink-400 hover:shadow-lg'
                         : 'bg-gray-50 border-gray-200 hover:border-blue-300 hover:shadow-lg'
                     }`}
                   >
                     <div className="text-2xl lg:text-3xl mb-2">👥</div>
                     <div className={`font-medium text-sm lg:text-base ${
                       isDarkTheme ? 'text-white' : 'text-gray-700'
                     }`}>Group Task</div>
                     <div className={`text-xs lg:text-sm ${
                       isDarkTheme ? 'text-pink-300' : 'text-gray-500'
                     }`}>Assign to team</div>
                   </button>
                   <button
                     onClick={() => setViewMode('create-team')}
                     className={`p-3 lg:p-4 rounded-lg border transition-all duration-200 text-center ${
                       isDarkTheme
                         ? 'bg-gray-700 border-gray-600 hover:border-purple-400 hover:shadow-lg'
                         : 'bg-gray-50 border-gray-200 hover:border-blue-300 hover:shadow-lg'
                     }`}
                   >
                     <div className="text-2xl lg:text-3xl mb-2">🏢</div>
                     <div className={`font-medium text-sm lg:text-base ${
                       isDarkTheme ? 'text-white' : 'text-gray-700'
                     }`}>Create Team</div>
                     <div className={`text-xs lg:text-sm ${
                       isDarkTheme ? 'text-purple-300' : 'text-gray-500'
                     }`}>New team</div>
                   </button>
                  <button
                    onClick={() => setViewMode('users')}
                    className={`p-3 lg:p-4 rounded-lg border transition-all duration-200 text-center ${
                      isDarkTheme
                        ? 'bg-gray-700 border-gray-600 hover:border-purple-400 hover:shadow-lg'
                        : 'bg-gray-50 border-gray-200 hover:border-blue-300 hover:shadow-lg'
                    }`}
                  >
                    <div className="text-2xl lg:text-3xl mb-2">👥</div>
                    <div className={`font-medium text-sm lg:text-base ${
                      isDarkTheme ? 'text-white' : 'text-gray-700'
                    }`}>Manage Users</div>
                    <div className={`text-xs lg:text-sm ${
                      isDarkTheme ? 'text-purple-300' : 'text-gray-500'
                    }`}>View all users</div>
                  </button>
                  <button
                    onClick={() => setViewMode('teams')}
                    className={`p-3 lg:p-4 rounded-lg border transition-all duration-200 text-center ${
                      isDarkTheme
                        ? 'bg-gray-700 border-gray-600 hover:border-purple-400 hover:shadow-lg'
                        : 'bg-gray-50 border-gray-200 hover:border-blue-300 hover:shadow-lg'
                    }`}
                  >
                    <div className="text-2xl lg:text-3xl mb-2">🏢</div>
                    <div className={`font-medium text-sm lg:text-base ${
                      isDarkTheme ? 'text-white' : 'text-gray-700'
                    }`}>Manage Teams</div>
                    <div className={`text-xs lg:text-sm ${
                      isDarkTheme ? 'text-purple-300' : 'text-gray-500'
                    }`}>View all teams</div>
                  </button>
               </div>
             </div>
          </div>
        )}

                                   {viewMode === 'users' && (
            <div className="space-y-6">
              <div className={`${isDarkTheme ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4 lg:p-6`}>
                <div className="flex items-center justify-between mb-4 lg:mb-6">
                  <h2 className={`text-xl lg:text-2xl font-bold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>Users Overview</h2>
                  <button
                    onClick={() => setShowCreateUserModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create User
                  </button>
                </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                {users.map((user) => (
                  <div 
                    key={user.id} 
                    className="bg-gray-50 rounded-lg p-6 hover:bg-blue-50 transition-colors cursor-pointer border-2 border-transparent hover:border-blue-300"
                    onClick={() => {
                      setSelectedUser(user);
                      setViewMode('tasks');
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-500 to-navy-600 flex items-center justify-center text-white font-semibold text-lg">
                        {user.displayName.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                        {user.teams.length} teams
                      </span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{user.displayName}</h3>
                    <p className="text-sm text-gray-600 mb-2">{user.email}</p>
                    <p className="text-sm text-gray-500 mb-4">
                      📱 {user.phoneNumber || user.phone || 'No phone'}
                    </p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Tasks:</span>
                        <span className="font-medium text-blue-600">{user.totalTasks}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Completed:</span>
                        <span className="font-medium text-green-600">{user.completedTasks}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Pending:</span>
                        <span className="font-medium text-yellow-600">{user.pendingTasks}</span>
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-gray-500">
                      Joined: {user.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

                                   {viewMode === 'teams' && (
            <div className="space-y-6">
              <div className={`${isDarkTheme ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4 lg:p-6`}>
                <h2 className={`text-xl lg:text-2xl font-bold mb-4 lg:mb-6 ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>Teams Overview</h2>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
                {teams.map((team) => (
                  <div 
                    key={team.id} 
                    className="bg-gray-50 rounded-lg p-6 hover:bg-blue-50 transition-colors cursor-pointer border-2 border-transparent hover:border-blue-300"
                    onClick={() => {
                      setSelectedTeam(team);
                      setViewMode('tasks');
                    }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                        {team.memberCount} members
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-4">{team.description}</p>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Total Tasks:</span>
                        <span className="font-medium text-blue-600">{team.totalTasks}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Completed:</span>
                        <span className="font-medium text-green-600">{team.completedTasks}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Pending:</span>
                        <span className="font-medium text-yellow-600">{team.totalTasks - team.completedTasks}</span>
                      </div>
                    </div>
                    <div className="mt-4 text-xs text-gray-500">
                      Created: {team.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

                                   {viewMode === 'tasks' && (
            <div className="space-y-6">
              <div className={`${isDarkTheme ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4 lg:p-6`}>
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 lg:mb-6 space-y-3 lg:space-y-0">
                  <div>
                    <h2 className={`text-xl lg:text-2xl font-bold ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>
                      {selectedUser ? `${selectedUser.displayName}'s Tasks` : 
                       selectedTeam ? `${selectedTeam.name} Team Tasks` : 'All Tasks'}
                    </h2>
                    {selectedUser && (
                      <p className={`mt-1 text-sm lg:text-base ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                        {selectedUser.email} • {selectedUser.teams.length} teams
                      </p>
                    )}
                    {selectedTeam && (
                      <p className={`mt-1 text-sm lg:text-base ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>
                        {selectedTeam.description} • {selectedTeam.memberCount} members
                      </p>
                    )}
                  </div>
                 <div className="flex space-x-3">
                   {(selectedUser || selectedTeam) && (
                     <button
                       onClick={() => {
                         setSelectedUser(null);
                         setSelectedTeam(null);
                       }}
                       className="px-3 lg:px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors text-sm lg:text-base"
                     >
                       ← Back to All
                     </button>
                   )}
                 </div>
               </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                      {!selectedUser && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned To</th>}
                      {!selectedTeam && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                                             <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Document</th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                       <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(selectedUser ? getUserTasks(selectedUser.id) : 
                      selectedTeam ? getTeamTasks(selectedTeam.id) : tasks).map((task) => (
                      <tr key={task.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{task.title}</div>
                            <div className="text-sm text-gray-500">{task.description}</div>
                          </div>
                        </td>
                        {!selectedUser && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.assignedToName}</td>
                        )}
                        {!selectedTeam && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{task.teamName}</td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                        </td>
                                                 <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                           {task.dueDate?.toDate?.()?.toLocaleDateString() || 'No due date'}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                           {task.documentName ? (
                             <div className="flex items-center space-x-2">
                               <span className="text-blue-600 font-medium">{task.documentName}</span>
                               <button
                                 onClick={() => window.open(task.document, '_blank')}
                                 className="text-blue-500 hover:text-blue-700 text-xs underline"
                               >
                                 View
                               </button>
                               <button
                                 onClick={() => {
                                   const link = document.createElement('a');
                                   link.href = task.document || '';
                                   link.download = task.documentName || 'document';
                                   link.click();
                                 }}
                                 className="text-green-500 hover:text-green-700 text-xs underline"
                               >
                                 Download
                               </button>
                             </div>
                           ) : (
                             <span className="text-gray-400">No document</span>
                           )}
                         </td>
                         <td className="px-6 py-4 whitespace-nowrap">
                           <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(task.status)}`}>
                             {task.status}
                           </span>
                         </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <select
                            value={task.status}
                            onChange={(e) => handleStatusChange(task.id, e.target.value)}
                            className="px-3 py-1 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                          >
                            <option value="todo">Todo</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                            <option value="overdue">Overdue</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {(selectedUser ? getUserTasks(selectedUser.id) : 
                selectedTeam ? getTeamTasks(selectedTeam.id) : tasks).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No tasks found for this selection.
                </div>
              )}
            </div>
          </div>
        )}

                 

                   {viewMode === 'create-team' && (
            <div className="space-y-6">
              <div className={`${isDarkTheme ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4 lg:p-6`}>
                <h2 className={`text-xl lg:text-2xl font-bold mb-4 lg:mb-6 ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>Create New Team</h2>

                <div className={`${isDarkTheme ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4 lg:p-6 space-y-4`}>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Team Name *</label>
                     <input
                       type="text"
                       value={createTeamForm.name}
                       onChange={(e) => setCreateTeamForm({...createTeamForm, name: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       placeholder="Enter team name"
                     />
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Description *</label>
                     <input
                       type="text"
                       value={createTeamForm.description}
                       onChange={(e) => setCreateTeamForm({...createTeamForm, description: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       placeholder="Enter team description"
                     />
                   </div>
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">Team Members</label>
                   <select
                     multiple
                     value={createTeamForm.members}
                     onChange={(e) => {
                       const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                       setCreateTeamForm({...createTeamForm, members: selectedOptions});
                     }}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                   >
                     {availableUsers.map(user => (
                       <option key={user.id} value={user.id}>{user.name}</option>
                     ))}
                   </select>
                   <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple members</p>
                 </div>

                 <div className="flex justify-end space-x-3">
                   <button
                     onClick={() => setCreateTeamForm({
                       name: '',
                       description: '',
                       members: []
                     })}
                     className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                   >
                     Clear Form
                   </button>
                   <button
                     onClick={handleCreateTeam}
                     className="px-6 py-2 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 font-medium"
                   >
                     Create Team
                   </button>
                 </div>
               </div>
             </div>
           </div>
         )}

                   {viewMode === 'create-individual-task' && (
            <div className="space-y-6">
              <div className={`${isDarkTheme ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4 lg:p-6`}>
                <h2 className={`text-xl lg:text-2xl font-bold mb-4 lg:mb-6 ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>Create Individual Task</h2>

                <div className={`${isDarkTheme ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4 lg:p-6 space-y-4`}>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Task Title *</label>
                     <input
                       type="text"
                       value={createTaskForm.title}
                       onChange={(e) => setCreateTaskForm({...createTaskForm, title: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       placeholder="Enter task title"
                     />
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                     <select
                       value={createTaskForm.priority}
                       onChange={(e) => setCreateTaskForm({...createTaskForm, priority: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     >
                       <option value="low">Low</option>
                       <option value="medium">Medium</option>
                       <option value="high">High</option>
                     </select>
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Assign To *</label>
                     <select
                       value={createTaskForm.assignedTo}
                       onChange={(e) => setCreateTaskForm({...createTaskForm, assignedTo: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     >
                       <option value="">Select a user</option>
                       {availableUsers.map(user => (
                         <option key={user.id} value={user.id}>{user.name}</option>
                       ))}
                     </select>
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                     <input
                       type="date"
                       value={createTaskForm.dueDate}
                       onChange={(e) => setCreateTaskForm({...createTaskForm, dueDate: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     />
                   </div>
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                   <textarea
                     value={createTaskForm.description}
                     onChange={(e) => setCreateTaskForm({...createTaskForm, description: e.target.value})}
                     rows={3}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     placeholder="Enter task description"
                   />
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">Attach Document</label>
                   <input
                     type="file"
                     onChange={(e) => {
                       const file = e.target.files?.[0] || null;
                       setCreateTaskForm({
                         ...createTaskForm, 
                         document: file,
                         documentName: file?.name || ''
                       });
                     }}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                   />
                   {createTaskForm.documentName && (
                     <p className="text-xs text-green-600 mt-1">✓ {createTaskForm.documentName}</p>
                   )}
                 </div>

                 <div className="flex justify-end space-x-3">
                   <button
                     onClick={() => setCreateTaskForm({
                       title: '',
                       description: '',
                       teamId: '',
                       assignedTo: '',
                       priority: 'medium',
                       dueDate: '',
                       document: null,
                       documentName: ''
                     })}
                     className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                   >
                     Clear Form
                   </button>
                   <button
                     onClick={handleCreateTask}
                     className="px-6 py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium"
                   >
                     Create Individual Task
                   </button>
                 </div>
               </div>
             </div>
           </div>
         )}

                   {viewMode === 'create-group-task' && (
            <div className="space-y-6">
              <div className={`${isDarkTheme ? 'bg-gray-800' : 'bg-white'} rounded-xl shadow-lg p-4 lg:p-6`}>
                <h2 className={`text-xl lg:text-2xl font-bold mb-4 lg:mb-6 ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>Create Group Task</h2>

                <div className={`${isDarkTheme ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-4 lg:p-6 space-y-4`}>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Task Title *</label>
                     <input
                       type="text"
                       value={createTaskForm.title}
                       onChange={(e) => setCreateTaskForm({...createTaskForm, title: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                       placeholder="Enter task title"
                     />
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                     <select
                       value={createTaskForm.priority}
                       onChange={(e) => setCreateTaskForm({...createTaskForm, priority: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     >
                       <option value="low">Low</option>
                       <option value="medium">Medium</option>
                       <option value="high">High</option>
                     </select>
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Team *</label>
                     <select
                       value={createTaskForm.teamId}
                       onChange={(e) => setCreateTaskForm({...createTaskForm, teamId: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     >
                       <option value="">Select a team</option>
                       {availableTeams.map(team => (
                         <option key={team.id} value={team.id}>{team.name}</option>
                       ))}
                     </select>
                   </div>

                   <div>
                     <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                     <input
                       type="date"
                       value={createTaskForm.dueDate}
                       onChange={(e) => setCreateTaskForm({...createTaskForm, dueDate: e.target.value})}
                       className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     />
                   </div>
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                   <textarea
                     value={createTaskForm.description}
                     onChange={(e) => setCreateTaskForm({...createTaskForm, description: e.target.value})}
                     rows={3}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     placeholder="Enter task description"
                   />
                 </div>

                 <div>
                   <label className="block text-sm font-medium text-gray-700 mb-2">Attach Document</label>
                   <input
                     type="file"
                     onChange={(e) => {
                       const file = e.target.files?.[0] || null;
                       setCreateTaskForm({
                         ...createTaskForm, 
                         document: file,
                         documentName: file?.name || ''
                       });
                     }}
                     className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                     accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                   />
                   {createTaskForm.documentName && (
                     <p className="text-xs text-green-600 mt-1">✓ {createTaskForm.documentName}</p>
                   )}
                 </div>

                 <div className="flex justify-end space-x-3">
                   <button
                     onClick={() => setCreateTaskForm({
                       title: '',
                       description: '',
                       teamId: '',
                       assignedTo: '',
                       priority: 'medium',
                       dueDate: '',
                       document: null,
                       documentName: ''
                     })}
                     className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                   >
                     Clear Form
                   </button>
                   <button
                     onClick={handleCreateTask}
                     className="px-6 py-2 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all duration-200 font-medium"
                   >
                     Create Group Task
                   </button>
                 </div>
               </div>
             </div>
           </div>
         )}

                   {/* Success Modal */}
          {showSuccessModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
              <div className={`${isDarkTheme ? 'bg-gray-800' : 'bg-white'} rounded-xl p-8 max-w-md mx-4 text-center`}>
                <div className="text-6xl mb-4">🎉</div>
                <h3 className={`text-xl font-bold mb-4 ${isDarkTheme ? 'text-white' : 'text-gray-900'}`}>Success!</h3>
                <p className={`mb-6 ${isDarkTheme ? 'text-gray-300' : 'text-gray-600'}`}>{successMessage}</p>
                <button
                  onClick={() => setShowSuccessModal(false)}
                  className={`w-full px-6 py-3 text-white rounded-lg transition-all duration-200 font-medium ${
                    isDarkTheme 
                      ? 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
                      : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
                  }`}
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Create User Form Modal */}
          <CreateUserForm
            isOpen={showCreateUserModal}
            onClose={() => setShowCreateUserModal(false)}
            onUserCreated={() => {
              setShowCreateUserModal(false);
              loadAdminData(); // Refresh the users list
              setSuccessMessage('User created successfully! 🎉');
              setShowSuccessModal(true);
            }}
          />

          {/* Admin Management Modal */}
          <AdminManagement
            isOpen={showAdminManagement}
            onClose={() => setShowAdminManagement(false)}
          />
       </div>
     </div>
   );
 };

export default AdminDashboard;