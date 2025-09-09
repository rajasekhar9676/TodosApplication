import React, { useState, useEffect } from 'react';
import { db } from '../config';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

interface PhoneNumberVerificationProps {
  onVerified?: (phoneNumber: string) => void;
  showSuccessMessage?: boolean;
}

const PhoneNumberVerification: React.FC<PhoneNumberVerificationProps> = ({ 
  onVerified, 
  showSuccessMessage = true 
}) => {
  const { user } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [showVerificationInput, setShowVerificationInput] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');

  useEffect(() => {
    if (user) {
      checkExistingPhoneNumber();
    }
  }, [user]);

  const checkExistingPhoneNumber = async () => {
    if (!user) return;
    
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists()) {
        const userData = userDoc.data();
        if (userData.phoneNumber && userData.phoneNumberVerified) {
          setPhoneNumber(userData.phoneNumber);
          setIsVerified(true);
        } else if (userData.phoneNumber) {
          setPhoneNumber(userData.phoneNumber);
          setShowVerificationInput(true);
        }
      }
    } catch (error) {
      console.error('Error checking existing phone number:', error);
    }
  };

  const formatPhoneNumber = (input: string): string => {
    // Remove all non-digit characters
    let cleaned = input.replace(/\D/g, '');
    
    // If it's a 10-digit Indian number, add +91
    if (cleaned.length === 10 && /^[6-9]/.test(cleaned)) {
      cleaned = '+91' + cleaned;
    }
    // If it's already 12 digits and starts with 91, add +
    else if (cleaned.length === 12 && cleaned.startsWith('91')) {
      cleaned = '+' + cleaned;
    }
    // If it's 11 digits and starts with 0, remove 0 and add +91
    else if (cleaned.length === 11 && cleaned.startsWith('0')) {
      cleaned = '+91' + cleaned.substring(1);
    }
    
    return cleaned;
  };

  const handlePhoneNumberSubmit = async () => {
    if (!user) return;
    
    const formattedNumber = formatPhoneNumber(phoneNumber);
    
    if (!formattedNumber || formattedNumber.length < 10) {
      showMessage('Please enter a valid phone number', 'error');
      return;
    }

    try {
      // Update user document with phone number
      await updateDoc(doc(db, 'users', user.uid), {
        phoneNumber: formattedNumber,
        phoneNumberVerified: false,
        updatedAt: new Date()
      });

      setPhoneNumber(formattedNumber);
      setShowVerificationInput(true);
      showMessage('Phone number saved! Please verify with the code sent to your WhatsApp.', 'success');
      
      // In a real app, you would send verification code via WhatsApp here
      // For now, we'll simulate it with a demo code
      showMessage('Demo: Use code "123456" to verify (in real app, this would be sent via WhatsApp)', 'info');
      
    } catch (error) {
      console.error('Error saving phone number:', error);
      showMessage('Error saving phone number. Please try again.', 'error');
    }
  };

  const handleVerificationSubmit = async () => {
    if (!user || !verificationCode) return;
    
    setIsVerifying(true);
    
    try {
      // In a real app, you would verify the code with your backend
      // For now, we'll accept any 6-digit code as valid
      if (verificationCode.length === 6) {
        // Mark phone number as verified
        await updateDoc(doc(db, 'users', user.uid), {
          phoneNumberVerified: true,
          updatedAt: new Date()
        });
        
        setIsVerified(true);
        setShowVerificationInput(false);
        showMessage('Phone number verified successfully! You will now receive WhatsApp notifications.', 'success');
        
        if (onVerified) {
          onVerified(phoneNumber);
        }
      } else {
        showMessage('Invalid verification code. Please try again.', 'error');
      }
    } catch (error) {
      console.error('Error verifying phone number:', error);
      showMessage('Error verifying phone number. Please try again.', 'error');
    } finally {
      setIsVerifying(false);
    }
  };

  const showMessage = (msg: string, type: 'success' | 'error' | 'info') => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(''), 5000);
  };

  const handleEditPhoneNumber = () => {
    setIsVerified(false);
    setShowVerificationInput(false);
    setVerificationCode('');
    setMessage('');
  };

  if (!user) {
    return <div className="text-gray-500">Please log in to verify your phone number.</div>;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <h3 className="text-lg font-semibold text-gray-800 mb-4">
        📱 WhatsApp Phone Number Verification
      </h3>
      
      {message && (
        <div className={`mb-4 p-3 rounded-md text-sm ${
          messageType === 'success' ? 'bg-green-100 text-green-800' :
          messageType === 'error' ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {message}
        </div>
      )}

      {isVerified ? (
        <div className="space-y-4">
          <div className="flex items-center space-x-2 text-green-600">
            <span className="text-xl">✅</span>
            <span className="font-medium">Phone Number Verified</span>
          </div>
          <div className="bg-gray-50 p-3 rounded-md">
            <span className="text-sm text-gray-600">Phone:</span>
            <span className="ml-2 font-medium">{phoneNumber}</span>
          </div>
          <button
            onClick={handleEditPhoneNumber}
            className="w-full px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50 transition-colors"
          >
            Edit Phone Number
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="Enter your phone number (e.g., 9876543210)"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={showVerificationInput}
            />
            <p className="text-xs text-gray-500 mt-1">
              Include country code if not Indian (+91)
            </p>
          </div>

          {!showVerificationInput ? (
            <button
              onClick={handlePhoneNumberSubmit}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Save Phone Number
            </button>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Verification Code
                </label>
                <input
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the 6-digit code sent to your WhatsApp
                </p>
              </div>
              
              <button
                onClick={handleVerificationSubmit}
                disabled={isVerifying || verificationCode.length !== 6}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isVerifying ? 'Verifying...' : 'Verify Code'}
              </button>
              
              <button
                onClick={handleEditPhoneNumber}
                className="w-full px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Change Phone Number
              </button>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-md">
        <h4 className="text-sm font-medium text-blue-800 mb-2">ℹ️ Why verify your phone number?</h4>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>• Receive WhatsApp notifications for new tasks</li>
          <li>• Get task reminders and updates</li>
          <li>• Stay informed about team activities</li>
          <li>• Ensure important messages reach you</li>
        </ul>
      </div>
    </div>
  );
};

export default PhoneNumberVerification;















