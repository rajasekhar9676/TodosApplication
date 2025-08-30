import React, { useState, useEffect } from 'react';
import { MultiAdminService, AdminUser } from '../services/multiAdminService';

interface AdminManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminManagement: React.FC<AdminManagementProps> = ({ isOpen, onClose }) => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: '',
    displayName: '',
    role: 'moderator' as 'super_admin' | 'admin' | 'moderator',
    department: '',
    phoneNumber: ''
  });

  useEffect(() => {
    if (isOpen) {
      loadAdmins();
    }
  }, [isOpen]);

  const loadAdmins = async () => {
    try {
      setLoading(true);
      const adminList = await MultiAdminService.getAllAdmins();
      setAdmins(adminList);
    } catch (error) {
      console.error('Error loading admins:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    try {
      if (!createForm.email || !createForm.displayName) {
        alert('Please fill in all required fields');
        return;
      }

      const newAdminData = {
        email: createForm.email,
        displayName: createForm.displayName,
        role: createForm.role,
        permissions: getPermissionsForRole(createForm.role),
        isActive: true,
        phoneNumber: createForm.phoneNumber || undefined,
        department: createForm.department || undefined,
        canCreateUsers: createForm.role === 'super_admin' || createForm.role === 'admin',
        canDeleteUsers: createForm.role === 'super_admin',
        canManageTeams: true,
        canManageTasks: true,
        canViewAnalytics: createForm.role === 'super_admin' || createForm.role === 'admin'
      };

      await MultiAdminService.createAdmin(newAdminData);
      
      // Reset form and refresh list
      setCreateForm({
        email: '',
        displayName: '',
        role: 'moderator',
        department: '',
        phoneNumber: ''
      });
      setShowCreateForm(false);
      loadAdmins();
      
      alert('Admin account created successfully! The new admin should check their email for login credentials.');
    } catch (error: any) {
      alert(`Error creating admin: ${error.message}`);
    }
  };

  const getPermissionsForRole = (role: string): string[] => {
    switch (role) {
      case 'super_admin':
        return ['all'];
      case 'admin':
        return ['manage_users', 'manage_teams', 'manage_tasks', 'view_analytics'];
      case 'moderator':
        return ['manage_teams', 'manage_tasks'];
      default:
        return ['manage_teams', 'manage_tasks'];
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Admin Management
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage admin accounts and permissions
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Create Admin Button */}
          <div className="mb-6">
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              {showCreateForm ? 'Cancel' : '+ Create New Admin'}
            </button>
          </div>

          {/* Create Admin Form */}
          {showCreateForm && (
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-6 mb-6 border border-gray-200 dark:border-slate-600">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Create New Admin Account
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={createForm.email}
                    onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white"
                    placeholder="admin@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={createForm.displayName}
                    onChange={(e) => setCreateForm({ ...createForm, displayName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white"
                    placeholder="Admin Name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Role *
                  </label>
                  <select
                    value={createForm.role}
                    onChange={(e) => setCreateForm({ ...createForm, role: e.target.value as any })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white"
                  >
                    <option value="moderator">Moderator</option>
                    <option value="admin">Administrator</option>
                    <option value="super_admin">Super Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Department
                  </label>
                  <input
                    type="text"
                    value={createForm.department}
                    onChange={(e) => setCreateForm({ ...createForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white"
                    placeholder="IT, HR, etc."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={createForm.phoneNumber}
                    onChange={(e) => setCreateForm({ ...createForm, phoneNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white"
                    placeholder="+1234567890"
                  />
                </div>
                <div className="md:col-span-2">
                  <button
                    onClick={handleCreateAdmin}
                    className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Create Admin Account
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Admin List */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Current Admin Accounts ({admins.length})
            </h3>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : admins.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                No admin accounts found
              </p>
            ) : (
              <div className="space-y-4">
                {admins.map((admin) => (
                  <div
                    key={admin.email}
                    className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4 border border-gray-200 dark:border-slate-600"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {admin.displayName}
                          </h4>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            admin.role === 'super_admin' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                            admin.role === 'admin' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                            'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}>
                            {admin.role.replace('_', ' ').toUpperCase()}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm mb-2">
                          {admin.email}
                        </p>
                        {admin.department && (
                          <p className="text-gray-500 dark:text-gray-500 text-xs">
                            Department: {admin.department}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {admin.canCreateUsers && (
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                              Create Users
                            </span>
                          )}
                          {admin.canDeleteUsers && (
                            <span className="px-2 py-1 text-xs bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 rounded">
                              Delete Users
                            </span>
                          )}
                          {admin.canManageTeams && (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                              Manage Teams
                            </span>
                          )}
                          {admin.canManageTasks && (
                            <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded">
                              Manage Tasks
                            </span>
                          )}
                          {admin.canViewAnalytics && (
                            <span className="px-2 py-1 text-xs bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 rounded">
                              View Analytics
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                        <p>Created: {admin.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}</p>
                        <p>Last Login: {admin.lastLogin?.toDate?.()?.toLocaleDateString() || 'Never'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminManagement;

