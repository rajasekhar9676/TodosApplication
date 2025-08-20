import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../config';
import { collection, doc, getDoc, addDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import { invitationService } from '../services/invitationService';

interface Team {
  id: string;
  name: string;
  description: string;
  members: Array<{ uid: string; role: string; email?: string; displayName?: string }>;
  createdAt: any;
  createdBy: string;
}

const Teams: React.FC = () => {
  const { user } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [teamForm, setTeamForm] = useState({
    name: '',
    description: '',
    inviteEmail: ''
  });
  const [creating, setCreating] = useState(false);

  const fetchTeams = useCallback(async () => {
    try {
      const userRef = doc(db, 'users', user!.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();

      if (userData?.teams && userData.teams.length > 0) {
        const teamPromises = userData.teams.map(async (teamId: string) => {
          const teamRef = doc(db, 'teams', teamId);
          const teamSnap = await getDoc(teamRef);
          if (teamSnap.exists()) {
            return { id: teamId, ...teamSnap.data() } as Team;
          }
          return null;
        });
        
        const teamsData = (await Promise.all(teamPromises)).filter(Boolean) as Team[];
        setTeams(teamsData);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetchTeams();
  }, [user, fetchTeams]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !teamForm.name.trim()) return;

    setCreating(true);
    try {
      const teamData = {
        name: teamForm.name.trim(),
        description: teamForm.description.trim(),
        members: [{ uid: user.uid, role: 'admin' }],
        createdBy: user.uid,
        createdAt: serverTimestamp(),
      };

      const teamRef = await addDoc(collection(db, 'teams'), teamData);
      
      // Update user's teams array
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();
      const updatedTeams = [...(userData?.teams || []), teamRef.id];
      await updateDoc(userRef, { teams: updatedTeams });

      // If invite email provided, handle invitation
      if (teamForm.inviteEmail.trim()) {
        try {
          // Send invitation using our service
          const result = await invitationService.sendInvitation(
            teamRef.id,
            teamForm.name.trim(),
            teamForm.inviteEmail.trim(),
            'member',
            user.uid,
            user.displayName || user.email || 'Team Member'
          );

          if (result.success) {
            console.log('✅ Invitation sent successfully to:', teamForm.inviteEmail);
          } else {
            console.error('❌ Failed to send invitation:', result.error);
          }
        } catch (error) {
          console.error('Error sending invitation:', error);
        }
      }

      setTeamForm({ name: '', description: '', inviteEmail: '' });
      setShowCreateTeam(false);
      fetchTeams();
    } catch (error) {
      console.error('Error creating team:', error);
    } finally {
      setCreating(false);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Teams</h1>
          <p className="text-gray-600 dark:text-gray-300">Manage your teams and collaborate with others</p>
        </div>
        <button
          onClick={() => setShowCreateTeam(true)}
          className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
        >
          Create Team
        </button>
      </div>

      {/* Create Team Modal */}
      {showCreateTeam && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create New Team</h2>
            <form onSubmit={handleCreateTeam} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Team Name
                </label>
                <input
                  type="text"
                  value={teamForm.name}
                  onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white transition-all duration-200"
                  placeholder="Enter team name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={teamForm.description}
                  onChange={(e) => setTeamForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white transition-all duration-200"
                  placeholder="Enter team description"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Invite Member (Optional)
                </label>
                <input
                  type="email"
                  value={teamForm.inviteEmail}
                  onChange={(e) => setTeamForm(prev => ({ ...prev, inviteEmail: e.target.value }))}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-slate-700 dark:text-white transition-all duration-200"
                  placeholder="Enter email address"
                />
              </div>
              <div className="flex space-x-4 pt-4">
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-xl font-semibold disabled:opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {creating ? 'Creating...' : 'Create Team'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateTeam(false)}
                  className="flex-1 bg-gray-200 dark:bg-slate-600 text-gray-700 dark:text-gray-200 py-3 rounded-xl font-semibold hover:bg-gray-300 dark:hover:bg-slate-500 transition-all duration-200"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Teams Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {teams.length === 0 ? (
          <div className="col-span-full">
            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-700/50 p-12 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">No teams yet</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-8 max-w-md mx-auto">
                Create your first team to start collaborating with others. Teams help you organize tasks and work together efficiently.
              </p>
              <button
                onClick={() => setShowCreateTeam(true)}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-8 py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Create Your First Team
              </button>
            </div>
          </div>
        ) : (
          teams.map((team) => (
            <Link
              key={team.id}
              to={`/teams/${team.id}`}
              className="group bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-700/50 p-6 hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{team.members.length}</span>
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                {team.name}
              </h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm mb-4 line-clamp-2">
                {team.description || 'No description provided'}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Created {team.createdAt?.toDate ? new Date(team.createdAt.toDate()).toLocaleDateString() : 'Recently'}
                  </span>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full">
                    {team.members.find(m => m.uid === user?.uid)?.role || 'member'}
                  </span>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
};

export default Teams; 