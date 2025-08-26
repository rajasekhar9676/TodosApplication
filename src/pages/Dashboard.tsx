import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../config';
import { doc, getDoc, collection, query, orderBy, limit, addDoc, serverTimestamp, onSnapshot, setDoc, updateDoc, getDocs, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { Task } from '../types/task';
import PhoneNumberCollector from '../components/PhoneNumberCollector';

interface Team {
  id: string;
  name: string;
  description: string;
  members: Array<{ uid: string; role: string }>;
  createdAt: any;
}

interface VoiceNote {
  id: string;
  text: string;
  createdAt: any;
  userId: string;
}

// Helper function to create user document
const createUserDocument = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userData = {
      uid: userId,
      teams: [],
      createdAt: serverTimestamp(),
      lastUpdated: serverTimestamp()
    };
    await setDoc(userRef, userData);
    console.log('✅ Dashboard: User document created');
    return userData;
  } catch (error) {
    console.error('❌ Dashboard: Error creating user document:', error);
    throw error;
  }
};

// Helper function to fix user document
const fixUserDocument = async (userId: string, currentUserData: any) => {
  try {
    const userRef = doc(db, 'users', userId);
    const updates = {
      teams: currentUserData?.joinedTeams || [],
      lastUpdated: serverTimestamp()
    };
    await updateDoc(userRef, updates);
    console.log('✅ Dashboard: User document fixed');
    return updates;
  } catch (error) {
    console.error('❌ Dashboard: Error fixing user document:', error);
    throw error;
  }
};

// Helper function to migrate user document from joinedTeams to teams
const migrateUserDocument = async (userId: string, currentUserData: any) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      const joinedTeams = userData?.joinedTeams || [];
      const teams = userData?.teams || [];
      
      if (joinedTeams.length > 0 && teams.length === 0) {
        console.log('🔄 Dashboard: Migrating user document...');
        await updateDoc(userRef, {
          teams: joinedTeams,
          joinedTeams: [], // Clear old field
          lastUpdated: serverTimestamp()
        });
        console.log('✅ Dashboard: User document migrated successfully');
        return true;
      } else {
        console.log('ℹ️ Dashboard: No migration needed');
        return false;
      }
    }
    return false;
  } catch (error) {
    console.error('❌ Dashboard: Error migrating user document:', error);
    throw error;
  }
};

// Debug function to check invitation status
const debugInvitationStatus = async (userId: string) => {
  try {
    console.log('🔍 Dashboard: Debugging invitation status for user:', userId);
    
    // Check all invitations for this user's email
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      console.log('🔍 Dashboard: User email:', userData.email);
      
      // Get all invitations for this email
      const invitationsQuery = query(
        collection(db, 'invitations'),
        where('email', '==', userData.email)
      );
      
      const invitationsSnap = await getDocs(invitationsQuery);
      console.log('🔍 Dashboard: Found invitations:', invitationsSnap.size);
      
      if (!invitationsSnap.empty) {
        invitationsSnap.forEach(doc => {
          const invitation = doc.data();
          console.log('🔍 Dashboard: Invitation:', {
            id: doc.id,
            teamName: invitation.teamName,
            status: invitation.status,
            email: invitation.email,
            teamId: invitation.teamId
          });
        });
      }
    }
  } catch (error) {
    console.error('❌ Dashboard: Error debugging invitation status:', error);
  }
};

// Function to clear test team ID
const clearTestTeam = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      teams: [],
      lastUpdated: serverTimestamp()
    });
    console.log('✅ Dashboard: Cleared test team ID from profile');
    window.location.reload();
  } catch (error) {
    console.error('❌ Dashboard: Error clearing test team:', error);
  }
};

// Function to manually test accepting an invitation
const testAcceptInvitation = async (userId: string) => {
  try {
    console.log('🧪 Dashboard: Testing invitation acceptance...');
    
    // Get the first pending invitation
    const invitationsQuery = query(
      collection(db, 'invitations'),
      where('email', '==', 'digital@educationtoday.co'),
      where('status', '==', 'pending')
    );
    
    const invitationsSnap = await getDocs(invitationsQuery);
    
    if (!invitationsSnap.empty) {
      const firstInvitation = invitationsSnap.docs[0];
      const invitationData = firstInvitation.data();
      
      console.log('🧪 Dashboard: Testing with invitation:', {
        id: firstInvitation.id,
        teamName: invitationData.teamName,
        teamId: invitationData.teamId,
        email: invitationData.email
      });
      
      // Test the acceptance process step by step
      const invitationRef = doc(db, 'invitations', firstInvitation.id);
      
      // Step 1: Update invitation status
      console.log('🧪 Dashboard: Step 1 - Updating invitation status...');
      await updateDoc(invitationRef, {
        status: 'accepted',
        acceptedAt: new Date(),
        acceptedBy: userId
      });
      console.log('✅ Dashboard: Invitation status updated to accepted');
      
      // Step 2: Add team to user profile
      console.log('🧪 Dashboard: Step 2 - Adding team to user profile...');
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        const currentTeams = userData?.teams || [];
        const updatedTeams = [...currentTeams, invitationData.teamId];
        
        await updateDoc(userRef, {
          teams: updatedTeams,
          lastUpdated: serverTimestamp()
        });
        console.log('✅ Dashboard: Team added to user profile');
        console.log('🧪 Dashboard: Teams array updated to:', updatedTeams);
        
        // Refresh the page to see the changes
        window.location.reload();
      }
    } else {
      console.log('❌ Dashboard: No pending invitations found');
    }
  } catch (error) {
    console.error('❌ Dashboard: Error testing invitation acceptance:', error);
  }
};

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  
  // Debug logging for teams state changes
  useEffect(() => {
    console.log('📋 Dashboard: Teams state changed to:', teams);
    console.log('📋 Dashboard: Teams length:', teams.length);
  }, [teams]);
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [voiceNotes, setVoiceNotes] = useState<VoiceNote[]>([]);
  const [stats, setStats] = useState({
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0
  });
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAllTasksModal, setShowAllTasksModal] = useState(false);

  // Enhanced error handling for data fetching
  const fetchDashboardData = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      console.log('🔄 Dashboard: Starting data fetch for user:', user.uid);
      
      // Get user document with better error handling
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        let userData = userDocSnap.data();
        console.log('📋 Dashboard: User document exists:', !!userData);
        console.log('📋 Dashboard: User data:', userData);
        
        // Check and fix user document structure
        if (!userData.teams || !Array.isArray(userData.teams)) {
          console.log('⚠️ Dashboard: Fixing user teams array...');
          userData = await fixUserDocument(user.uid, userData);
        }
        
        // Migrate old data if needed
        if (userData.joinedTeams && userData.joinedTeams.length > 0 && (!userData.teams || userData.teams.length === 0)) {
          console.log('🔄 Dashboard: Migrating joinedTeams to teams...');
          await migrateUserDocument(user.uid, userData);
          // Refresh user data after migration
          const refreshedUserSnap = await getDoc(doc(db, 'users', user.uid));
          if (refreshedUserSnap.exists()) {
            userData = refreshedUserSnap.data();
          }
        }
        
        console.log('📋 Dashboard: User teams array:', userData.teams);
        console.log('📋 Dashboard: User joinedTeams array:', userData.joinedTeams);
        
                 // Set teams state
         if (userData.teams && Array.isArray(userData.teams)) {
           setTeams(userData.teams);
           
           // Fetch team details with error handling
           if (userData.teams.length > 0) {
             console.log('📋 Dashboard: Fetching teams data for:', userData.teams.length, 'teams');
             const teamsField = userData.teams.length > 0 ? 'teams' : 'joinedTeams';
             console.log('📋 Dashboard: Teams field used:', teamsField);
             
             try {
               const teamsData = await Promise.all(
                 userData.teams.map(async (teamId: string) => {
                   try {
                     const teamDocRef = doc(db, 'teams', teamId);
                     const teamDocSnap = await getDoc(teamDocRef);
                     if (teamDocSnap.exists()) {
                       return { id: teamId, ...teamDocSnap.data() };
                     } else {
                       console.warn('⚠️ Dashboard: Team not found:', teamId);
                       return null;
                     }
                   } catch (error) {
                     console.error('❌ Dashboard: Error fetching team:', teamId, error);
                     return null;
                   }
                 })
               );
               
               const validTeams = teamsData.filter(team => team !== null);
               console.log('📋 Dashboard: Teams data loaded:', validTeams.length, 'teams');
               console.log('📋 Dashboard: Teams data details:', validTeams);
               
               if (validTeams.length > 0) {
                 // Keep teams as string array for now
                 console.log('📋 Dashboard: Teams loaded successfully');
               }
             } catch (error) {
               console.error('❌ Dashboard: Error fetching teams data:', error);
             }
           }
         }
      } else {
        console.log('📋 Dashboard: User document does not exist, creating...');
        await createUserDocument(user.uid);
      }
    } catch (error) {
      console.error('❌ Dashboard: Error in fetchDashboardData:', error);
    }
  }, [user?.uid]);

  // Enhanced task fetching with error handling
  const fetchUserTasks = useCallback(async () => {
    if (!user?.uid) return;
    
    try {
      console.log('📋 Dashboard: Fetching tasks for user:', user.uid);
      
      const allTasks: any[] = [];
      
      // 1. Fetch individual tasks created by the user
      try {
        const individualTasksQuery = query(
          collection(db, 'tasks'),
          where('createdBy', '==', user.uid),
          orderBy('createdAt', 'desc'),
          limit(50)
        );
        
        const individualTasksSnap = await getDocs(individualTasksQuery);
        const individualTasks = individualTasksSnap.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log(`📋 Dashboard: Individual tasks created by user: ${individualTasks.length}`);
        allTasks.push(...individualTasks);
      } catch (error) {
        console.error('❌ Dashboard: Error fetching individual tasks:', error);
      }
      
      // 2. Fetch team tasks if user has teams
      if (teams.length > 0) {
        for (const teamId of teams) {
          try {
            const tasksQuery = query(
              collection(db, 'tasks'),
              where('teamId', '==', teamId),
              orderBy('createdAt', 'desc'),
              limit(50)
            );
            
            const tasksSnap = await getDocs(tasksQuery);
            const teamTasks = tasksSnap.docs.map(doc => ({
              id: doc.id,
              ...doc.data()
            }));
            
            console.log(`📋 Dashboard: Team ${teamId} - All tasks: ${teamTasks.length}, User tasks: ${teamTasks.filter((task: any) => task.assignedTo === user.uid).length}`);
            
            allTasks.push(...teamTasks);
          } catch (error) {
            console.error('❌ Dashboard: Error fetching tasks for team:', teamId, error);
          }
        }
      }
      
      // Deduplicate tasks and filter user tasks
      const uniqueTasks = allTasks.filter((task, index, self) => 
        index === self.findIndex(t => t.id === task.id)
      );
      
      // Count tasks that are either assigned to the user OR created by the user
      const userTasks = uniqueTasks.filter(task => 
        (task as any).assignedTo === user.uid || (task as any).createdBy === user.uid
      );
      console.log('📋 Dashboard: Total user tasks after update:', userTasks.length, '(deduplicated)');
      
      setAllTasks(uniqueTasks);
      
      // Update stats with error handling
      try {
        const completedTasks = userTasks.filter(task => (task as any).status === 'COMPLETED').length;
        const pendingTasks = userTasks.filter(task => (task as any).status !== 'COMPLETED').length;
        
        setStats({
          totalTasks: userTasks.length,
          completedTasks,
          pendingTasks,

        });
        
        console.log('📊 Dashboard: Stats updated:', { totalTasks: userTasks.length, completedTasks, pendingTasks });
      } catch (error) {
        console.error('❌ Dashboard: Error updating stats:', error);
        setStats({ totalTasks: 0, completedTasks: 0, pendingTasks: 0 });
      }
      
    } catch (error) {
      console.error('❌ Dashboard: Error in fetchUserTasks:', error);
      setAllTasks([]); // Clear tasks on error
             setStats({ totalTasks: 0, completedTasks: 0, pendingTasks: 0 });
    }
  }, [user?.uid, teams.length]); // Only depend on teams count, not content

  useEffect(() => {
    if (!user) return;

    let isMounted = true;

    // Fetch user's teams and tasks with proper error handling
    const initializeDashboard = async () => {
      try {
        if (!isMounted) return;
        await fetchDashboardData();
        if (!isMounted) return;
        await fetchUserTasks();
      } catch (error) {
        console.error('❌ Dashboard: Error initializing dashboard:', error);
      }
    };

    initializeDashboard();

    return () => {
      isMounted = false;
    };
  }, [user, fetchDashboardData, fetchUserTasks]);

  // Add a refresh function for manual updates
  const refreshDashboard = async () => {
    console.log('🔄 Dashboard: Manual refresh requested');
    setLoading(true);
    setTeams([]);
    setAllTasks([]);
    
    // Force re-fetch by updating user dependency
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      await getDoc(userRef); // This will trigger the useEffect
    }
    
    setLoading(false);
  };

  // Manual fix function for debugging
  const manualFixUserDocument = async () => {
    if (!user) return;
    
    console.log('🔧 Dashboard: Manual fix requested');
    setLoading(true);
    
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await createUserDocument(user.uid);
        console.log('✅ Dashboard: Created missing user document');
      } else {
        const userData = userSnap.data();
        if (!userData.teams) {
          await updateDoc(userRef, {
            teams: userData.joinedTeams || [],
            lastUpdated: serverTimestamp()
          });
          console.log('✅ Dashboard: Added teams field to user document');
        }
      }
      
      // Refresh dashboard
      await refreshDashboard();
    } catch (error) {
      console.error('❌ Dashboard: Error fixing user document:', error);
    } finally {
      setLoading(false);
    }
  };

  // Update stats and recent tasks when allTasks changes
  useEffect(() => {
    console.log('🔄 Dashboard: User tasks updated:', allTasks.length, 'tasks');
    
    if (allTasks.length > 0) {
      // Filter tasks that belong to the current user
      const userTasks = allTasks.filter(task => 
        task.assignedTo === user?.uid || task.createdBy === user?.uid
      );
      
      // Debug: Log all task details
      console.log('📋 Dashboard: All user tasks:', userTasks.map(task => ({
        id: task.id,
        title: task.title,
        status: task.status,
        assignedTo: task.assignedTo,
        createdBy: task.createdBy
      })));
      
      // Sort by creation date and take recent 10
      const sortedTasks = userTasks.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        // Handle both Firestore Timestamp and regular Date objects
        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      });
      setRecentTasks(sortedTasks.slice(0, 10));

      // Calculate stats for user's tasks only
      const totalTasks = userTasks.length;
      const completedTasks = userTasks.filter(task => task.status === 'COMPLETED').length;
      const pendingTasks = totalTasks - completedTasks;
      
      console.log('📊 Dashboard: Updating user stats:', { totalTasks, completedTasks, pendingTasks });
      
      setStats(prev => ({
        ...prev,
        totalTasks,
        completedTasks,
        pendingTasks
      }));
    } else {
      console.log('📊 Dashboard: No user tasks found, resetting stats');
      setStats(prev => ({
        ...prev,
        totalTasks: 0,
        completedTasks: 0,
        pendingTasks: 0
      }));
    }
  }, [allTasks, user?.uid]);

  // Debug function to reset tasks state
  const resetTasksState = () => {
    console.log('🔄 Dashboard: Manually resetting tasks state');
    setAllTasks([]);
    setRecentTasks([]);
    setStats(prev => ({
      ...prev,
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0
    }));
  };

  // Note: handleTextRecorded is kept for future use with voice recording features
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleTextRecorded = async (text: string) => {
    if (!user) return;
    
    try {
      const voiceNoteData = {
        text,
        userId: user.uid,
        createdAt: serverTimestamp(),
      };
      
      const docRef = await addDoc(collection(db, 'voiceNotes'), voiceNoteData);
      const newVoiceNote = {
        id: docRef.id,
        text,
        userId: user.uid,
        createdAt: new Date(),
      };
      
      setVoiceNotes(prev => [newVoiceNote, ...prev.slice(0, 9)]);
    } catch (error) {
      console.error('Error saving voice note:', error);
    }
  };

  const isProductionMode = process.env.NODE_ENV === 'production';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Welcome Banner - Full Width with No Margins */}
      <div className="w-full mb-6">
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl mx-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">Welcome back!</h1>
              <p className="text-blue-100 text-lg">Here's what's happening with your personal tasks today.</p>
            </div>
            <div className="hidden md:block">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards - Full Width Grid */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-700/50 p-6 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">My Tasks</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalTasks}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-700/50 p-6 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.completedTasks}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-700/50 p-6 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.pendingTasks}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-700/50 p-6 hover:shadow-xl transition-all duration-300 hover:scale-105">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Teams</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">{teams.length}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions - Full Width Grid */}
      <div className="px-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/tasks"
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-700/50 p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Create Task</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">Add a new task to your team</p>
          </Link>

          <Link
            to="/teams"
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-700/50 p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-green-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Manage Teams</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">Create and manage your teams</p>
          </Link>

          <Link
            to="/calendar"
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-700/50 p-6 hover:shadow-xl transition-all duration-300 hover:scale-105 group"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">View Calendar</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">See your tasks in calendar view</p>
          </Link>
        </div>
      </div>

      {/* Teams Section - Full Width */}
      <div className="px-4 mb-6">
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-700/50">
          <div className="p-6 border-b border-gray-200/50 dark:border-slate-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Teams</h2>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full text-sm font-medium">
                  {teams.length} team{teams.length !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  onClick={refreshDashboard}
                  disabled={loading}
                  className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                  title="Refresh teams"
                >
                  <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <Link to="/teams" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-semibold transition-colors">
                  View all teams →
                </Link>
              </div>
            </div>
          </div>
          <div className="p-6">
            {teams.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No teams yet</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
                  Create your first team to start collaborating with others, or wait for team invitations to arrive. Teams help you organize tasks and work together efficiently.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={refreshDashboard}
                    disabled={loading}
                    className="inline-flex items-center bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                  >
                    <svg className={`w-5 h-5 mr-2 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {loading ? 'Refreshing...' : 'Refresh'}
                  </button>

                  {!isProductionMode && (
                    <button
                      onClick={() => migrateUserDocument(user?.uid || '', { teams: teams, joinedTeams: [] })}
                      disabled={loading}
                      className="inline-flex items-center bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {isProductionMode ? 'Team Management' : 'Migrate Teams Data'}
                    </button>
                  )}

                  <Link
                    to="/teams"
                    className="inline-flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Create Your First Team
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.slice(0, 6).map((team) => (
                  <Link
                    key={team.id}
                    to={`/teams/${team.id}`}
                    className="group bg-gray-50 dark:bg-slate-700/50 rounded-xl p-6 hover:bg-white dark:hover:bg-slate-700 transition-all duration-300 hover:shadow-lg border border-gray-200/50 dark:border-slate-600/50"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                        </svg>
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-sm text-gray-500 dark:text-gray-400">{team.members.length}</span>
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    </div>
                    
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {team.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
                      {team.description || 'No description provided'}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        Created {team.createdAt?.toDate ? new Date(team.createdAt.toDate()).toLocaleDateString() : 'Recently'}
                      </span>
                      <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                        {team.members.find(m => m.uid === user?.uid)?.role || 'member'}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Tasks Section - Full Width */}
      {recentTasks.length > 0 && (
        <div className="px-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-700/50">
            <div className="p-6 border-b border-gray-200/50 dark:border-slate-700/50">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recent Tasks</h2>
                <button 
                  onClick={() => setShowAllTasksModal(true)}
                  className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-semibold transition-colors"
                >
                  View all tasks →
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentTasks.slice(0, 5).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-4 border border-gray-200/50 dark:border-slate-700/50 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{task.title}</h4>
                        <span className="text-sm text-blue-600 dark:text-blue-400">•</span>
                        <span className="text-sm text-blue-600 dark:text-blue-400">{task.taskType}</span>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">{task.description}</p>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          task.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          task.status === 'IN-PROGRESS' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-200'
                        }`}>
                          {task.status}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          task.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {task.priority}
                        </span>
                        {task.dueDate && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voice Notes Section - Hidden in Production */}
      {!isProductionMode && (
        <div className="px-4 mb-6">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-700/50">
            <div className="p-6 border-b border-gray-200/50 dark:border-slate-700/50">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Voice Notes</h2>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Click the microphone button to record
                  </span>
                </div>
              </div>
            </div>
            <div className="p-6">
              {voiceNotes.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-900 dark:to-pink-900 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No voice notes yet</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6 max-w-md mx-auto">
                    Use the microphone button in the bottom right corner to record your first voice note. Perfect for quick thoughts and ideas!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {voiceNotes.map((note) => (
                    <div key={note.id} className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 border border-gray-200/50 dark:border-slate-600/50">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
                            {note.text}
                          </p>
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {note.createdAt?.toDate ? 
                                new Date(note.createdAt.toDate()).toLocaleString() : 
                                new Date(note.createdAt).toLocaleString()
                              }
                            </span>
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => navigator.clipboard.writeText(note.text)}
                                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
                                title="Copy to clipboard"
                              >
                                Copy
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View All Tasks Modal */}
      {showAllTasksModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-11/12 sm:w-3/4 lg:w-2/3 xl:w-1/2 max-h-[90vh] overflow-y-auto relative">
            <button 
              onClick={() => setShowAllTasksModal(false)} 
              className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 z-10"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>

            <div className="p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">All Your Tasks</h2>
              
              {/* Task Count Summary */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Total</p>
                      <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">{stats.totalTasks}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Pending</p>
                      <p className="text-lg font-semibold text-yellow-900 dark:text-yellow-100">{stats.pendingTasks}</p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-800 dark:text-green-200">Completed</p>
                      <p className="text-lg font-semibold text-green-900 dark:text-green-100">{stats.completedTasks}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* All Tasks List */}
              <div className="space-y-3">
                {allTasks.filter(task => 
                  task.assignedTo === user?.uid || task.createdBy === user?.uid
                ).map((task) => (
                  <div key={task.id} className="flex items-center justify-between p-4 border border-gray-200 dark:border-slate-600 rounded-xl hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-gray-900 dark:text-white">{task.title}</h4>
                        <span className="text-sm text-blue-600 dark:text-blue-400">•</span>
                        <span className="text-sm text-blue-600 dark:text-blue-400">{task.taskType}</span>
                      </div>
                      {task.description && (
                        <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          task.status === 'COMPLETED' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          task.status === 'IN-PROGRESS' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-gray-100 text-gray-800 dark:bg-slate-700 dark:text-gray-200'
                        }`}>
                          {task.status}
                        </span>
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          task.priority === 'high' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        }`}>
                          {task.priority}
                        </span>
                        {task.dueDate && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        {task.attachments && task.attachments.length > 0 && (
                          <span className="text-xs text-blue-600 dark:text-blue-400">
                            📎 {task.attachments.length} file(s)
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => {
                          setShowAllTasksModal(false);
                          // Navigate to tasks page with this task selected
                          window.location.href = `/tasks?view=${task.id}`;
                        }}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* No Tasks Message */}
              {allTasks.filter(task => 
                task.assignedTo === user?.uid || task.createdBy === user?.uid
              ).length === 0 && (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                    <svg className="w-10 h-10 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">No tasks yet</h3>
                  <p className="text-gray-600 dark:text-gray-300 mb-6">
                    You haven't created or been assigned any tasks yet.
                  </p>
                  <button
                    onClick={() => {
                      setShowAllTasksModal(false);
                      window.location.href = '/tasks';
                    }}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Create Your First Task
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Phone Number Collector for Gmail Users */}
      <PhoneNumberCollector 
        onComplete={() => console.log('Phone number collection completed')}
        showSkip={true}
      />

    </div>
  );
};

export default Dashboard;
