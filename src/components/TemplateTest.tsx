import React, { useState } from 'react';
import { whatsAppService } from '../services/WhatsAppService';

const TemplateTest: React.FC = () => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const handleTestTemplate = async () => {
    if (!phoneNumber.trim()) {
      setError('Please enter a phone number');
      return;
    }

    setIsSending(true);
    setError('');
    setResult('');

    try {
      // Create a sample task for testing
      const sampleTask = {
        id: 'test',
        title: 'Complete Project Report',
        description: 'Finish the quarterly project report',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
        priority: 'high',
        taskType: 'individual',
        status: 'TO-DO'
      } as any;

      const success = await whatsAppService.sendTaskReminder(sampleTask, phoneNumber);
      
      if (success) {
        setResult('✅ Template message sent successfully! Check your WhatsApp.');
      } else {
        setError('❌ Failed to send template message. Check console for details.');
      }
    } catch (error) {
      console.error('Error testing template:', error);
      setError('Error sending template message. Check console for details.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Test WhatsApp Template</h2>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
            Phone Number (with country code)
          </label>
          <input
            type="tel"
            id="phoneNumber"
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="e.g., +919876543210"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Include country code (e.g., +91 for India)
          </p>
        </div>

        <button
          onClick={handleTestTemplate}
          disabled={isSending || !phoneNumber.trim()}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSending ? 'Sending...' : 'Test Template Message'}
        </button>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <p className="text-sm text-green-600">{result}</p>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-blue-50 rounded-md">
        <h3 className="text-sm font-medium text-blue-800 mb-2">Template Details</h3>
        <div className="text-xs text-blue-700 space-y-1">
          <p><strong>Template Name:</strong> task_remainder</p>
          <p><strong>Language:</strong> en_GB</p>
          <p><strong>API Endpoint:</strong> https://public.doubletick.io</p>
          <p><strong>Authorization:</strong> key_acbcd</p>
        </div>
      </div>

      <div className="mt-4 p-4 bg-gray-50 rounded-md">
        <h3 className="text-sm font-medium text-gray-800 mb-2">Template Placeholders</h3>
        <div className="text-xs text-gray-700 space-y-1">
          <p><strong>{'{{1}}'}: </strong>User Name</p>
          <p><strong>{'{{2}}'}: </strong>Task Name</p>
          <p><strong>{'{{3}}'}: </strong>Scheduled Date</p>
          <p><strong>{'{{4}}'}: </strong>Priority Level</p>
          <p><strong>{'{{5}}'}: </strong>Due Date</p>
        </div>
      </div>
    </div>
  );
};

export default TemplateTest;
