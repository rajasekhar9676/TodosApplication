import React, { useState, useEffect } from 'react';
import { db } from '../config';
import { doc, updateDoc, arrayRemove, arrayUnion, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

interface TeamMember {
  uid: string;
  email?: string;
  role: 'admin' | 'member';
  displayName?: string;
  joinedAt?: Date;
  invitedBy?: string;
}

interface TeamMembersProps {
  teamId: string;
  teamName: string;
  members: TeamMember[];
  userRole: string;
  onMembersUpdate: (members: TeamMember[]) => void;
}

const TeamMembers: React.FC<TeamMembersProps> = ({ 
  teamId, 
  teamName, 
  members, 
  userRole, 
  onMembersUpdate 
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showRoleChange, setShowRoleChange] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<'admin' | 'member'>('member');

  const isAdmin = userRole === 'admin' || members.find(m => m.uid === user?.uid)?.role === 'admin';
  const currentUserMember = members.find(m => m.uid === user?.uid);

  const handleRoleChange = async (memberId: string, newRole: 'admin' | 'member') => {
    if (!isAdmin || memberId === user?.uid) return;

    setLoading(true);
    try {
      const teamRef = doc(db, 'teams', teamId);
      const updatedMembers = members.map(member => 
        member.uid === memberId 
          ? { ...member, role: newRole }
          : member
      );

      await updateDoc(teamRef, {
        members: updatedMembers,
        lastUpdated: serverTimestamp()
      });

      onMembersUpdate(updatedMembers);
      setShowRoleChange(null);
      console.log('✅ Member role updated successfully');
    } catch (error) {
      console.error('❌ Error updating member role:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!isAdmin || memberId === user?.uid) return;

    if (!window.confirm('Are you sure you want to remove this member from the team?')) {
      return;
    }

    setLoading(true);
    try {
      const teamRef = doc(db, 'teams', teamId);
      const updatedMembers = members.filter(member => member.uid !== memberId);

      await updateDoc(teamRef, {
        members: updatedMembers,
        lastUpdated: serverTimestamp()
      });

      onMembersUpdate(updatedMembers);
      console.log('✅ Member removed successfully');
    } catch (error) {
      console.error('❌ Error removing member:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'member': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return '👑';
      case 'member': return '👤';
      default: return '❓';
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200/50 dark:border-slate-700/50">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Team Members ({members.length})
          </h3>
          {isAdmin && (
            <span className="text-sm text-gray-500 dark:text-gray-400">
              You can manage team members
            </span>
          )}
        </div>

        <div className="space-y-4">
          {members.map((member) => (
            <div key={member.uid} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-slate-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold">
                  {member.displayName?.charAt(0)?.toUpperCase() || member.email?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    {member.displayName || member.email || 'Unknown User'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {member.email}
                  </p>
                  {member.joinedAt && (
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Joined: {member.joinedAt instanceof Date ? member.joinedAt.toLocaleDateString() : 'Recently'}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(member.role)}`}>
                  {getRoleIcon(member.role)} {member.role}
                </span>

                {isAdmin && member.uid !== user?.uid && (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setShowRoleChange(member.uid)}
                      className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
                    >
                      Change Role
                    </button>
                    <button
                      onClick={() => handleRemoveMember(member.uid)}
                      disabled={loading}
                      className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 text-sm"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {member.uid === user?.uid && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">(You)</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Role Change Modal */}
        {showRoleChange && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-sm w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Change Member Role
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Role
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as 'admin' | 'member')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 text-gray-900 dark:text-white"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleRoleChange(showRoleChange, newRole)}
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md disabled:opacity-50"
                  >
                    {loading ? 'Updating...' : 'Update Role'}
                  </button>
                  <button
                    onClick={() => setShowRoleChange(null)}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeamMembers;



















