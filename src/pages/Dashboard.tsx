import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../config';
import { doc, getDoc, collection, query, orderBy, limit, addDoc, serverTimestamp, onSnapshot, setDoc, updateDoc, getDocs, where } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

interface Team {
  id: string;
  name: string;
  description: string;
  members: Array<{ uid: string; role: string }>;
  createdAt: any;
}

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate: any;
  assignedTo: string;
  teamId: string;
  teamName: string;
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
const fixUserDocument = async (userId: string) => {
  try {
    const userRef = doc(db, 'users', userId);
    const updates = {
      teams: [],
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
const migrateUserDocument = async (userId: string) => {
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
    pendingTasks: 0,
    teamsCount: 0
  });
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchDashboardData = async () => {
      try {
        console.log('🔄 Dashboard: Fetching user data for:', user.uid);
        
        // Fetch user's teams
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        
        if (!userSnap.exists()) {
          console.log('❌ Dashboard: User document not found, creating...');
          await createUserDocument(user.uid);
          // Retry after creating document
          const newUserSnap = await getDoc(userRef);
          const userData = newUserSnap.data();
          console.log('✅ Dashboard: Created user document:', userData);
        }
        
        let userData = userSnap.data();

        console.log('📋 Dashboard: User document exists:', userSnap.exists());
        console.log('📋 Dashboard: User data:', userData);
        console.log('📋 Dashboard: User teams array:', userData?.teams);
        console.log('📋 Dashboard: User joinedTeams array:', userData?.joinedTeams);
        
        // Check if user document needs fixing
        if (userData && !userData.teams && !userData.joinedTeams) {
          console.log('⚠️ Dashboard: User document missing teams fields, fixing...');
          await fixUserDocument(user.uid);
        }
        
        // Check if user document needs migration from joinedTeams to teams
        if (userData && userData.joinedTeams && userData.joinedTeams.length > 0 && (!userData.teams || userData.teams.length === 0)) {
          console.log('🔄 Dashboard: User document needs migration from joinedTeams to teams...');
          await migrateUserDocument(user.uid);
          // Refresh user data after migration
          const updatedUserSnap = await getDoc(userRef);
          const updatedUserData = updatedUserSnap.data();
          userData = updatedUserData;
        }

        // Handle both 'teams' and 'joinedTeams' field names for compatibility
        const userTeams = userData?.teams || userData?.joinedTeams || [];
        
        if (userTeams.length > 0) {
          console.log('📋 Dashboard: Fetching teams data for:', userTeams.length, 'teams');
          console.log('📋 Dashboard: Teams field used:', userData?.teams ? 'teams' : 'joinedTeams');
          
          const teamPromises = userTeams.map(async (teamId: string) => {
            const teamRef = doc(db, 'teams', teamId);
            const teamSnap = await getDoc(teamRef);
            if (teamSnap.exists()) {
              return { id: teamId, ...teamSnap.data() } as Team;
            } else {
              console.warn('⚠️ Dashboard: Team not found:', teamId);
              return null;
            }
          });
          
          const teamsData = (await Promise.all(teamPromises)).filter(Boolean) as Team[];
          console.log('📋 Dashboard: Teams data loaded:', teamsData.length, 'teams');
          console.log('📋 Dashboard: Teams data details:', teamsData);
          
          setTeams(teamsData);
          console.log('📋 Dashboard: setTeams called with:', teamsData);
          setStats(prev => ({ ...prev, teamsCount: teamsData.length }));

          // Set up real-time listeners for user's tasks only
          const unsubscribeFunctions: (() => void)[] = [];
          
          for (const team of teamsData) {
            // Fetch all team tasks, then filter to show only user's assigned tasks
            const tasksQuery = query(
              collection(db, 'teams', team.id, 'tasks'),
              orderBy('createdAt', 'desc')
            );
            
            const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
              const allTeamTasks = snapshot.docs.map(doc => ({ 
                id: doc.id, 
                ...doc.data(),
                teamName: team.name
              } as Task));
              
              // Filter tasks to only show user's tasks
              const userTasks = allTeamTasks.filter(task => 
                task.assignedTo === user.uid
              );
              
              console.log(`📋 Dashboard: Team ${team.name} - All tasks: ${allTeamTasks.length}, User tasks: ${userTasks.length}`);
              
              // Update all tasks with only user's tasks, ensuring no duplicates
              setAllTasks(prev => {
                const otherTeamTasks = prev.filter(task => task.teamId !== team.id);
                const newAllTasks = [...otherTeamTasks, ...userTasks];
                
                // Remove duplicates based on task ID
                const uniqueTasks = newAllTasks.filter((task, index, self) => 
                  index === self.findIndex(t => t.id === task.id)
                );
                
                console.log(`📋 Dashboard: Total user tasks after update:`, uniqueTasks.length, '(deduplicated)');
                return uniqueTasks;
              });
            }, (error) => {
              console.error(`Error listening to team ${team.id} tasks:`, error);
            });
            
            unsubscribeFunctions.push(unsubscribe);
          }

          // Cleanup all listeners on unmount
          return () => {
            unsubscribeFunctions.forEach(unsubscribe => unsubscribe());
          };
        }

        // Fetch voice notes with real-time listener
        const voiceNotesQuery = query(
          collection(db, 'voiceNotes'),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        
        const unsubscribe = onSnapshot(voiceNotesQuery, (snapshot) => {
          const voiceNotesData = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as VoiceNote))
            .filter(note => note.userId === user.uid);
          setVoiceNotes(voiceNotesData);
        }, (error) => {
          console.error('Error listening to voice notes:', error);
        });

        // Cleanup listener on unmount
        return () => unsubscribe();
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Set up real-time listener for user's teams array
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      const unsubscribeUser = onSnapshot(userRef, (doc) => {
        if (doc.exists()) {
          const userData = doc.data();
          console.log('🔄 Dashboard: User data updated in real-time:', userData);
          
          // If teams array changed, refresh dashboard data (handle both field names)
          const userTeams = userData?.teams || userData?.joinedTeams || [];
          if (userTeams.length !== teams.length) {
            console.log('🔄 Dashboard: Teams array changed, refreshing data...');
            console.log('🔄 Dashboard: New teams count:', userTeams.length, 'vs current:', teams.length);
            fetchDashboardData();
          }
        }
      }, (error) => {
        console.error('❌ Dashboard: Error listening to user updates:', error);
      });

      return () => unsubscribeUser();
    }
  }, [user]);

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
      // Debug: Log all task details
      console.log('📋 Dashboard: All user tasks:', allTasks.map(task => ({
        id: task.id,
        title: task.title,
        teamName: task.teamName,
        status: task.status,
        assignedTo: task.assignedTo
      })));
      
      // Sort by creation date and take recent 10
      const sortedTasks = allTasks.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return b.createdAt.toDate() - a.createdAt.toDate();
      }).slice(0, 10);
      setRecentTasks(sortedTasks);

      // Calculate stats for user's tasks only
      const totalTasks = allTasks.length;
      const completedTasks = allTasks.filter(task => task.status === 'completed').length;
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
  }, [allTasks]);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-8 text-white shadow-xl">
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
              <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.teamsCount}</p>
            </div>
          </div>
        </div>
      </div>

  

      {/* Quick Actions */}
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

      {/* Teams Section */}
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
                    {loading ? 'Refreshing...' : 'Refresh Teams'}
                  </button>
                  <button
                    onClick={manualFixUserDocument}
                    disabled={loading}
                    className="inline-flex items-center bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Fix User Document
                  </button>
                  <button
                    onClick={() => migrateUserDocument(user?.uid || '')}
                    disabled={loading}
                    className="inline-flex items-center bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Migrate Teams Data
                  </button>
                  <button
                    onClick={() => debugInvitationStatus(user?.uid || '')}
                    disabled={loading}
                    className="inline-flex items-center bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5M12 6a3 3 0 110 6 3 3 0 010-6z" />
                    </svg>
                    Debug Invitations
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        console.log('🔍 Dashboard: Checking all teams in database...');
                        
                        // Get all teams
                        const teamsQuery = query(collection(db, 'teams'));
                        const teamsSnap = await getDocs(teamsQuery);
                        
                        console.log('🔍 Dashboard: Total teams in database:', teamsSnap.size);
                        
                        if (!teamsSnap.empty) {
                          teamsSnap.forEach(doc => {
                            const team = doc.data();
                            console.log('🔍 Dashboard: Team:', {
                              id: doc.id,
                              name: team.name,
                              members: team.members?.length || 0,
                              createdBy: team.createdBy
                            });
                          });
                        } else {
                          console.log('🔍 Dashboard: No teams found in database');
                        }
                      } catch (error) {
                        console.error('❌ Dashboard: Error checking teams:', error);
                      }
                    }}
                    disabled={loading}
                    className="inline-flex items-center bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Check All Teams
                  </button>
                  <button
                    onClick={() => clearTestTeam(user?.uid || '')}
                    disabled={loading}
                    className="inline-flex items-center bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Clear Test Team
                  </button>
                  <button
                    onClick={() => testAcceptInvitation(user?.uid || '')}
                    disabled={loading}
                    className="inline-flex items-center bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Test Accept Invitation
                  </button>
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

      {/* Recent Tasks */}
      {recentTasks.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-700/50">
          <div className="p-6 border-b border-gray-200/50 dark:border-slate-700/50">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Recent Tasks</h2>
              <Link to="/tasks" className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-semibold transition-colors">
                View all tasks →
              </Link>
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
                      <span className="text-sm text-blue-600 dark:text-blue-400">{task.teamName}</span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 text-sm mb-2">{task.description}</p>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        task.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                        task.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                        'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
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
                          Due: {new Date(task.dueDate.toDate()).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Voice Notes Section */}
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
  );
};

export default Dashboard;
