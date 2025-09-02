import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

interface ReminderSettings {
  whatsappNumber: string;
  autoReminders: boolean;
  reminderInterval: number;
  customMessage: string;
}

const SimpleWhatsAppReminder: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ReminderSettings>({
    whatsappNumber: '',
    autoReminders: false,
    reminderInterval: 4,
    customMessage: '🔔 Task Reminder: Please complete your task on time!'
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSendManualReminder = async () => {
    if (!settings.whatsappNumber) {
      setMessage('Please enter a WhatsApp number');
      return;
    }

    setLoading(true);
    try {
      // Simulate sending WhatsApp message
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMessage('✅ WhatsApp reminder sent successfully! (Simulated)');
    } catch (error) {
      setMessage('❌ Failed to send WhatsApp reminder');
    } finally {
      setLoading(false);
    }
  };

  const handleSendAutomaticReminders = async () => {
    setLoading(true);
    try {
      // Simulate sending automatic reminders
      await new Promise(resolve => setTimeout(resolve, 2000));
      setMessage('✅ Automatic reminders configured! (Simulated)');
    } catch (error) {
      setMessage('❌ Failed to configure automatic reminders');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Simulate saving settings
      await new Promise(resolve => setTimeout(resolve, 1000));
      setMessage('✅ Settings saved successfully! (Simulated)');
    } catch (error) {
      setMessage('❌ Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">WhatsApp Reminders</h1>
        <p className="text-gray-600">Configure and send WhatsApp reminders for your tasks</p>
      </div>

      {/* Settings Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Reminder Settings</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WhatsApp Number
            </label>
            <input
              type="tel"
              value={settings.whatsappNumber}
              onChange={(e) => setSettings(prev => ({ ...prev, whatsappNumber: e.target.value }))}
              placeholder="+1234567890"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">Include country code (e.g., +1 for US)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Reminder Message
            </label>
            <textarea
              value={settings.customMessage}
              onChange={(e) => setSettings(prev => ({ ...prev, customMessage: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your custom reminder message..."
            />
          </div>

          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={settings.autoReminders}
                onChange={(e) => setSettings(prev => ({ ...prev, autoReminders: e.target.checked }))}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Enable automatic reminders</span>
            </label>
          </div>

          {settings.autoReminders && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reminder Interval (hours)
              </label>
              <select
                value={settings.reminderInterval}
                onChange={(e) => setSettings(prev => ({ ...prev, reminderInterval: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>Every 1 hour</option>
                <option value={2}>Every 2 hours</option>
                <option value={4}>Every 4 hours</option>
                <option value={6}>Every 6 hours</option>
                <option value={12}>Every 12 hours</option>
                <option value={24}>Every 24 hours</option>
              </select>
            </div>
          )}

          <button
            onClick={handleSaveSettings}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>

      {/* Manual Reminder */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Send Manual Reminder</h2>
        <p className="text-gray-600 mb-4">Send a reminder immediately to the configured WhatsApp number</p>
        
        <button
          onClick={handleSendManualReminder}
          disabled={loading || !settings.whatsappNumber}
          className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50"
        >
          {loading ? 'Sending...' : '📱 Send WhatsApp Reminder'}
        </button>
      </div>

      {/* Automatic Reminders */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Automatic Reminders</h2>
        <p className="text-gray-600 mb-4">Configure automatic reminders for all your tasks</p>
        
        <button
          onClick={handleSendAutomaticReminders}
          disabled={loading}
          className="w-full bg-purple-600 text-white py-3 px-4 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
        >
          {loading ? 'Configuring...' : '⚙️ Configure Automatic Reminders'}
        </button>
      </div>

      {/* Status Message */}
      {message && (
        <div className={`p-4 rounded-md ${
          message.includes('✅') ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          <p className={`text-sm ${
            message.includes('✅') ? 'text-green-800' : 'text-red-800'
          }`}>
            {message}
          </p>
        </div>
      )}

      {/* Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">WhatsApp Integration Status</h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>This is a simplified WhatsApp reminder component. In production, you'll need to integrate with WhatsApp Business API or services like Twilio.</p>
              <p className="mt-1">Features: Manual reminders, automatic reminders, custom messages, and delivery confirmation (double tick).</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SimpleWhatsAppReminder;













