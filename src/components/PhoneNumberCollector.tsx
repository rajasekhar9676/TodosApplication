import React, { useState, useEffect } from 'react';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config';
import { useAuth } from '../context/AuthContext';
import { whatsAppService } from '../services/WhatsAppService';

interface PhoneNumberCollectorProps {
  onComplete?: () => void;
  showSkip?: boolean;
}

const PhoneNumberCollector: React.FC<PhoneNumberCollectorProps> = ({ 
  onComplete, 
  showSkip = true 
}) => {
  const { user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCollector, setShowCollector] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      checkUserPhoneNumber();
    }
  }, [user]);

  const checkUserPhoneNumber = async () => {
    if (!user?.uid) return;

    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (!userData.phoneNumber) {
          setShowCollector(true);
        }
      }
    } catch (error) {
      console.error('Error checking user phone number:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      // Validate phone number
      if (!whatsAppService.isValidPhoneNumber(phoneNumber)) {
        setError('Please enter a valid phone number');
        setIsSubmitting(false);
        return;
      }

      // Format phone number
      const formattedNumber = whatsAppService.formatPhoneNumber(phoneNumber);

      // Update user document
      if (user?.uid) {
        await updateDoc(doc(db, 'users', user.uid), {
          phoneNumber: formattedNumber,
          phoneNumberVerified: false,
          lastUpdated: new Date()
        });

        setSuccess(true);
        setShowCollector(false);
        
        // Call completion callback
        if (onComplete) {
          onComplete();
        }

        // Show success message
        setTimeout(() => {
          setSuccess(false);
        }, 3000);
      }
    } catch (error) {
      console.error('Error updating phone number:', error);
      setError('Failed to save phone number. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = () => {
    setShowCollector(false);
    if (onComplete) {
      onComplete();
    }
  };

  const handleTestMessage = async () => {
    if (!phoneNumber || !whatsAppService.isValidPhoneNumber(phoneNumber)) {
      setError('Please enter a valid phone number first');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const formattedNumber = whatsAppService.formatPhoneNumber(phoneNumber);
      const testMessage = `🧪 *Test Message*\n\nThis is a test message from your Task Manager App to verify WhatsApp integration.\n\nIf you receive this, your phone number is correctly configured! 🎉\n\n_Time: ${new Date().toLocaleString()}_`;

      const success = await whatsAppService.sendMessage(formattedNumber, testMessage);
      
      if (success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 5000);
      } else {
        setError('Failed to send test message. Please check your API configuration.');
      }
    } catch (error) {
      console.error('Error sending test message:', error);
      setError('Error sending test message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!showCollector) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-11/12 sm:w-3/4 lg:w-2/3 xl:w-1/2 max-w-md">
        <div className="p-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Add Phone Number</h2>
            <p className="text-gray-600">
              To receive WhatsApp reminders for your tasks, please provide your phone number.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                We'll use this to send WhatsApp reminders for your tasks
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-md p-3">
                <p className="text-sm text-green-600">
                  ✅ Phone number saved successfully! You'll now receive WhatsApp reminders.
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="submit"
                disabled={isSubmitting || !phoneNumber.trim()}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Saving...' : 'Save Phone Number'}
              </button>
              
              <button
                type="button"
                onClick={handleTestMessage}
                disabled={isSubmitting || !phoneNumber.trim()}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Sending...' : 'Send Test Message'}
              </button>
            </div>

            {showSkip && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleSkip}
                  className="text-gray-500 hover:text-gray-700 text-sm underline"
                >
                  Skip for now
                </button>
                <p className="text-xs text-gray-400 mt-1">
                  You can add this later in your profile settings
                </p>
              </div>
            )}
          </form>

          <div className="mt-6 p-4 bg-blue-50 rounded-md">
            <h3 className="text-sm font-medium text-blue-800 mb-2">💡 Why add a phone number?</h3>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• Get WhatsApp reminders 1 day before task due dates</li>
              <li>• Receive urgent notifications for overdue tasks</li>
              <li>• Stay on top of your important deadlines</li>
              <li>• Never miss a task again!</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhoneNumberCollector;












