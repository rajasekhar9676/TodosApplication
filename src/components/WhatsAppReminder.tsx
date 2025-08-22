import React, { useState, useEffect } from 'react';
import { whatsappReminderService, TaskReminder, ReminderSettings } from '../services/whatsappReminderService';
import { useAuth } from '../context/AuthContext';

const WhatsAppReminder: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Reminder settings
  const [settings, setSettings] = useState<ReminderSettings>({
    enabled: true,
    defaultTime: 4,
    autoReminders: true,
    manualReminders: true,
    whatsappNumber: '',
    reminderMessage: ''
  });
  
  // User reminders
  const [userReminders, setUserReminders] = useState<TaskReminder[]>([]);
  const [selectedTask, setSelectedTask] = useState<string>('');
  const [customMessage, setCustomMessage] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  
  // Available tasks (you'll need to fetch these from your task service)
  const [availableTasks, setAvailableTasks] = useState<Array<{
    id: string;
    title: string;
    dueDate: Date;
    status: string;
  }>>([]);
  
  useEffect(() => {
    if (user) {
      loadUserReminders();
      loadUserSettings();
      loadAvailableTasks();
    }
  }, [user]);
  
  const loadUserReminders = async () => {
    try {
      const reminders = await whatsappReminderService.getUserReminders(user!.uid);
      setUserReminders(reminders);
    } catch (error) {
      console.error('Failed to load reminders:', error);
    }
  };
  
  const loadUserSettings = async () => {
    try {
      // Load user preferences from context or user document
      if ((user as any)?.preferences?.reminderSettings) {
        setSettings({
          ...settings,
          ...(user as any).preferences.reminderSettings
        });
      }
      
      // Set WhatsApp number from user profile
      if ((user as any)?.phone) {
        setWhatsappNumber((user as any).phone);
        setSettings(prev => ({ ...prev, whatsappNumber: (user as any).phone }));
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };
  
  const loadAvailableTasks = async () => {
    try {
      // This should fetch tasks from your task service
      // For now, we'll use mock data
      const mockTasks = [
        { id: '1', title: 'Complete Project Report', dueDate: new Date(), status: 'in-progress' },
        { id: '2', title: 'Review Code Changes', dueDate: new Date(Date.now() + 86400000), status: 'todo' },
        { id: '3', title: 'Team Meeting', dueDate: new Date(Date.now() + 172800000), status: 'todo' }
      ];
      setAvailableTasks(mockTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    }
  };
  
  const handleSendManualReminder = async () => {
    if (!selectedTask || !whatsappNumber) {
      setError('Please select a task and enter WhatsApp number');
      return;
    }
    
    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      const result = await whatsappReminderService.sendManualReminder(
        selectedTask,
        user!.uid,
        whatsappNumber,
        customMessage
      );
      
      if (result.success) {
        setMessage('Reminder sent successfully!');
        setCustomMessage('');
        setSelectedTask('');
        loadUserReminders(); // Refresh reminders list
      } else {
        setError(result.error || 'Failed to send reminder');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to send reminder');
    } finally {
      setLoading(false);
    }
  };
  
  const handleSendAutomaticReminders = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      const results = await whatsappReminderService.sendAutomaticReminders();
      const successCount = results.filter(r => r.success).length;
      const errorCount = results.filter(r => !r.success).length;
      
      if (successCount > 0) {
        setMessage(`Automatic reminders sent: ${successCount} successful, ${errorCount} failed`);
        loadUserReminders(); // Refresh reminders list
      } else {
        setError('No automatic reminders were sent');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to send automatic reminders');
    } finally {
      setLoading(false);
    }
  };
  
  const handleUpdateSettings = async () => {
    try {
      const result = await whatsappReminderService.updateReminderSettings(user!.uid, settings);
      if (result.success) {
        setMessage('Settings updated successfully!');
      } else {
        setError(result.error || 'Failed to update settings');
      }
    } catch (error: any) {
      setError(error.message || 'Failed to update settings');
    }
  };
  
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleString();
  };
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'sent': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">WhatsApp Reminders</h2>
        
        {message && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-green-800">{message}</p>
              </div>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Reminder Settings */}
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Reminder Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <input
                  type="checkbox"
                  checked={settings.enabled}
                  onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                  className="mr-2"
                />
                Enable WhatsApp Reminders
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <input
                  type="checkbox"
                  checked={settings.autoReminders}
                  onChange={(e) => setSettings({ ...settings, autoReminders: e.target.checked })}
                  className="mr-2"
                />
                Enable Automatic Reminders
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <input
                  type="checkbox"
                  checked={settings.manualReminders}
                  onChange={(e) => setSettings({ ...settings, manualReminders: e.target.checked })}
                  className="mr-2"
                />
                Enable Manual Reminders
              </label>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Reminder Time (hours before due date)
              </label>
              <input
                type="number"
                value={settings.defaultTime}
                onChange={(e) => setSettings({ ...settings, defaultTime: parseInt(e.target.value) || 4 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="1"
                max="72"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <button
              onClick={handleUpdateSettings}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500"
            >
              Update Settings
            </button>
          </div>
        </div>
        
        {/* Manual Reminder */}
        <div className="bg-blue-50 rounded-lg p-6 mb-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Send Manual Reminder</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Task</label>
              <select
                value={selectedTask}
                onChange={(e) => setSelectedTask(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Choose a task...</option>
                {availableTasks.map(task => (
                  <option key={task.id} value={task.id}>
                    {task.title} - Due: {formatDate(task.dueDate)}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">WhatsApp Number</label>
              <input
                type="tel"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="+1234567890"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Custom Message (Optional)</label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Leave empty to use default message..."
              />
            </div>
          </div>
          
          <div className="mt-4 flex gap-3">
            <button
              onClick={handleSendManualReminder}
              disabled={loading || !selectedTask || !whatsappNumber}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending...' : 'Send Reminder'}
            </button>
            
            <button
              onClick={handleSendAutomaticReminders}
              disabled={loading || !settings.autoReminders}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Send Auto Reminders'}
            </button>
          </div>
        </div>
        
        {/* Reminder History */}
        <div className="bg-white rounded-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 p-6 border-b border-gray-200">Reminder History</h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Team</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sent At</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {userReminders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No reminders found
                    </td>
                  </tr>
                ) : (
                  userReminders.map((reminder) => (
                    <tr key={reminder.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {reminder.taskTitle}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {reminder.teamName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          reminder.type === 'automatic' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {reminder.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(reminder.status)}`}>
                          {reminder.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {reminder.sentAt ? formatDate(reminder.sentAt) : 'Not sent'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WhatsAppReminder;
