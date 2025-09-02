import React, { useState, useEffect } from 'react';
import { ReminderSettings, whatsAppReminderService, REMINDER_INTERVALS } from '../services/whatsappReminderService';

interface ReminderSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userName: string;
}

const ReminderSettingsModal: React.FC<ReminderSettingsModalProps> = ({
  isOpen,
  onClose,
  userId,
  userName
}) => {
  const [settings, setSettings] = useState<ReminderSettings>({
    userId,
    enabled: true,
    intervals: [24, 8, 4],
    beforeDueReminders: true,
    overdueReminders: true,
    reminderTime: '09:00',
    timezone: 'UTC',
    updatedAt: new Date()
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      loadUserSettings();
    }
  }, [isOpen, userId]);

  const loadUserSettings = async () => {
    setLoading(true);
    try {
      const userSettings = await whatsAppReminderService.getUserReminderSettings(userId);
      setSettings(userSettings);
    } catch (error) {
      console.error('Error loading reminder settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await whatsAppReminderService.updateUserReminderSettings(userId, settings);
      if (result.success) {
        alert('Reminder settings updated successfully!');
        onClose();
      } else {
        alert(`Error updating settings: ${result.error}`);
      }
    } catch (error) {
      console.error('Error saving reminder settings:', error);
      alert('Error saving reminder settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleIntervalToggle = (intervalHours: number) => {
    setSettings(prev => ({
      ...prev,
      intervals: prev.intervals.includes(intervalHours)
        ? prev.intervals.filter(h => h !== intervalHours)
        : [...prev.intervals, intervalHours].sort((a, b) => b - a) // Sort descending
    }));
  };

  const formatInterval = (hours: number): string => {
    if (hours < 24) {
      return `${hours}h`;
    } else if (hours === 24) {
      return '1d';
    } else {
      return `${Math.floor(hours / 24)}d`;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                WhatsApp Reminder Settings
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Configure reminder intervals for {userName}
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
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Enable/Disable Reminders */}
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Enable WhatsApp Reminders
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Turn on/off automatic WhatsApp reminders for this user
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.enabled}
                      onChange={(e) => setSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              {settings.enabled && (
                <>
                  {/* Reminder Types */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Reminder Types
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              Before Due Date
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Send reminders before task due date
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.beforeDueReminders}
                              onChange={(e) => setSettings(prev => ({ ...prev, beforeDueReminders: e.target.checked }))}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>

                      <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              Overdue Tasks
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              Send reminders for overdue tasks
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={settings.overdueReminders}
                              onChange={(e) => setSettings(prev => ({ ...prev, overdueReminders: e.target.checked }))}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Reminder Intervals */}
                  {settings.beforeDueReminders && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Reminder Intervals
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Select when to send reminders before the due date
                      </p>
                      
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {REMINDER_INTERVALS.map((interval) => (
                          <button
                            key={interval.id}
                            onClick={() => handleIntervalToggle(interval.hours)}
                            className={`p-3 rounded-lg border-2 transition-all duration-200 text-center ${
                              settings.intervals.includes(interval.hours)
                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                                : 'border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-slate-500'
                            }`}
                          >
                            <div className="font-semibold text-lg">
                              {formatInterval(interval.hours)}
                            </div>
                            <div className="text-xs opacity-75">
                              {interval.description}
                            </div>
                          </button>
                        ))}
                      </div>
                      
                      {settings.intervals.length > 0 && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            <strong>Selected intervals:</strong> {settings.intervals.map(h => formatInterval(h)).join(', ')} before due date
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reminder Time */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Reminder Time
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Time of Day
                        </label>
                        <input
                          type="time"
                          value={settings.reminderTime}
                          onChange={(e) => setSettings(prev => ({ ...prev, reminderTime: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          Time to send daily reminders
                        </p>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Timezone
                        </label>
                        <select
                          value={settings.timezone}
                          onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                          <option value="UTC">UTC</option>
                          <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                          <option value="America/New_York">America/New_York (EST)</option>
                          <option value="Europe/London">Europe/London (GMT)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-slate-700">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !settings.enabled || (settings.beforeDueReminders && settings.intervals.length === 0)}
              className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReminderSettingsModal;
