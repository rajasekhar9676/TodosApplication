import React, { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config';
import { useAuth } from '../context/AuthContext';
import { whatsAppService } from '../services/WhatsAppService';

interface WhatsAppSettingsProps {
  onClose?: () => void;
}

const WhatsAppSettings: React.FC<WhatsAppSettingsProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [reminderPreferences, setReminderPreferences] = useState({
    dueDateReminder: true,
    overdueReminder: true,
    dailyDigest: false,
    reminderTime: '09:00'
  });
  const [testMessage, setTestMessage] = useState('');
  const [isTestSending, setIsTestSending] = useState(false);

  useEffect(() => {
    if (user) {
      loadUserSettings();
    }
  }, [user]);

  const loadUserSettings = async () => {
    if (!user?.uid) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setPhoneNumber(userData.phoneNumber || '');
        setReminderPreferences({
          dueDateReminder: userData.dueDateReminder !== false,
          overdueReminder: userData.overdueReminder !== false,
          dailyDigest: userData.dailyDigest || false,
          reminderTime: userData.reminderTime || '09:00'
        });
      }
    } catch (error) {
      console.error('Error loading user settings:', error);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsSubmitting(true);

    try {
      // Validate phone number if provided
      if (phoneNumber && !whatsAppService.isValidPhoneNumber(phoneNumber)) {
        setError('Please enter a valid phone number');
        setIsSubmitting(false);
        return;
      }

      // Format phone number
      const formattedNumber = phoneNumber ? whatsAppService.formatPhoneNumber(phoneNumber) : '';

      // Update user document
      if (user?.uid) {
        await updateDoc(doc(db, 'users', user.uid), {
          phoneNumber: formattedNumber,
          phoneNumberVerified: !!formattedNumber,
          dueDateReminder: reminderPreferences.dueDateReminder,
          overdueReminder: reminderPreferences.overdueReminder,
          dailyDigest: reminderPreferences.dailyDigest,
          reminderTime: reminderPreferences.reminderTime,
          lastUpdated: new Date()
        });

        setSuccess('Settings saved successfully!');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      setError('Failed to save settings. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestMessage = async () => {
    if (!phoneNumber || !whatsAppService.isValidPhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number first');
      return;
    }

    if (!testMessage.trim()) {
      setError('Please enter a test message');
      return;
    }

    setIsTestSending(true);
    setError('');
    setSuccess('');

    try {
      const formattedNumber = whatsAppService.formatPhoneNumber(phoneNumber);
      const success = await whatsAppService.sendMessage(formattedNumber, testMessage);
      
      if (success) {
        setSuccess('✅ Test message sent successfully! Check your WhatsApp.');
        setTestMessage('');
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError('Failed to send test message. Please check your API configuration.');
      }
    } catch (error) {
      console.error('Error sending test message:', error);
      setError('Error sending test message. Please try again.');
    } finally {
      setIsTestSending(false);
    }
  };

  const handleSendSampleReminder = async () => {
    if (!phoneNumber || !whatsAppService.isValidPhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number first');
      return;
    }

    setIsTestSending(true);
    setError('');
    setSuccess('');

    try {
      const formattedNumber = whatsAppService.formatPhoneNumber(phoneNumber);
      
      // Create a sample task for testing
      const sampleTask = {
        id: 'sample',
        title: 'Sample Task Reminder',
        description: 'This is a sample task to test WhatsApp reminders',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        priority: 'medium',
        taskType: 'individual',
        status: 'TO-DO'
      } as any;

      const reminder = whatsAppService.generateReminderMessage(sampleTask, formattedNumber);
      const success = await whatsAppService.scheduleReminder(reminder);
      
      if (success) {
        setSuccess('✅ Sample reminder sent successfully! Check your WhatsApp.');
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError('Failed to send sample reminder. Please check your API configuration.');
      }
    } catch (error) {
      console.error('Error sending sample reminder:', error);
      setError('Error sending sample reminder. Please try again.');
    } finally {
      setIsTestSending(false);
    }
  };

  const getServiceStatus = () => {
    const status = whatsAppService.getStatus();
    return status;
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">WhatsApp Reminder Settings</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Service Status */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Service Status</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getServiceStatus().initialized ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {getServiceStatus().initialized ? 'Initialized' : 'Not Initialized'}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${getServiceStatus().hasCredentials ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {getServiceStatus().hasCredentials ? 'API Configured' : 'API Missing'}
            </span>
          </div>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Phone Number */}
        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number
          </label>
          <input
            type="tel"
            id="phoneNumber"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Enter your phone number (e.g., 9876543210)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-500 mt-1">
            We'll use this to send WhatsApp reminders for your tasks
          </p>
        </div>

        {/* Reminder Preferences */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-3">Reminder Preferences</h3>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={reminderPreferences.dueDateReminder}
                onChange={(e) => setReminderPreferences(prev => ({ ...prev, dueDateReminder: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Send reminders 1 day before due date</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={reminderPreferences.overdueReminder}
                onChange={(e) => setReminderPreferences(prev => ({ ...prev, overdueReminder: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Send urgent reminders for overdue tasks</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={reminderPreferences.dailyDigest}
                onChange={(e) => setReminderPreferences(prev => ({ ...prev, dailyDigest: e.target.checked }))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-700">Send daily digest of pending tasks</span>
            </label>
          </div>
        </div>

        {/* Reminder Time */}
        <div>
          <label htmlFor="reminderTime" className="block text-sm font-medium text-gray-700 mb-2">
            Preferred Reminder Time
          </label>
          <input
            type="time"
            id="reminderTime"
            value={reminderPreferences.reminderTime}
            onChange={(e) => setReminderPreferences(prev => ({ ...prev, reminderTime: e.target.value }))}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <p className="text-sm text-green-600">{success}</p>
          </div>
        )}

        {/* Save Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? 'Saving...' : 'Save Settings'}
        </button>
      </form>

      {/* Test Section */}
      <div className="mt-8 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Test WhatsApp Integration</h3>
        
        {/* Test Custom Message */}
        <div className="mb-4">
          <label htmlFor="testMessage" className="block text-sm font-medium text-gray-700 mb-2">
            Test Custom Message
          </label>
          <div className="flex space-x-2">
            <input
              type="text"
              id="testMessage"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Enter a test message"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              type="button"
              onClick={handleTestMessage}
              disabled={isTestSending || !phoneNumber || !testMessage.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isTestSending ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>

        {/* Test Sample Reminder */}
        <div className="mb-4">
          <button
            type="button"
            onClick={handleSendSampleReminder}
            disabled={isTestSending || !phoneNumber}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isTestSending ? 'Sending...' : 'Send Sample Task Reminder'}
          </button>
          <p className="text-xs text-gray-500 mt-1">
            This will send a sample task reminder to test the formatting
          </p>
        </div>
      </div>

      {/* Info Section */}
      <div className="mt-6 p-4 bg-blue-50 rounded-md">
        <h3 className="text-sm font-medium text-blue-800 mb-2">ℹ️ How it works</h3>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Reminders are sent automatically based on your preferences</li>
          <li>• Due date reminders: 1 day before deadline</li>
          <li>• Overdue reminders: Every 6 hours for late tasks</li>
          <li>• Daily digest: Summary of all pending tasks (if enabled)</li>
          <li>• You can test the integration anytime using the test buttons above</li>
        </ul>
      </div>
    </div>
  );
};

export default WhatsAppSettings;











