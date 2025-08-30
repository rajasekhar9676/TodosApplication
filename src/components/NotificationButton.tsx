import React, { useState, useEffect } from 'react';
import { db } from '../config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import NotificationPanel from './NotificationPanel';

const NotificationButton: React.FC = () => {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);

  // Debug logging
  console.log('🔔 NotificationButton: Rendering with user:', user?.uid);
  console.log('🔔 NotificationButton: Pending count:', pendingCount);

  useEffect(() => {
    console.log('🔔 NotificationButton: useEffect triggered, user:', user?.uid);
    if (!user?.uid) {
      console.log('🔔 NotificationButton: No user UID, returning early');
      return;
    }

    console.log('🔔 NotificationButton: Setting up Firestore listener for user:', user.uid);
    const unsubscribe = onSnapshot(
      query(
        collection(db, 'tasks'),
        where('assignedTo', '==', user.uid),
        where('status', '!=', 'completed')
      ),
      (snapshot) => {
        console.log('🔔 NotificationButton: Firestore update, pending tasks:', snapshot.size);
        setPendingCount(snapshot.size);
      },
      (error) => {
        console.error('❌ NotificationButton: Error fetching pending tasks count:', error);
      }
    );

    return () => {
      console.log('🔔 NotificationButton: Cleaning up Firestore listener');
      unsubscribe();
    };
  }, [user?.uid]);

  const handleNotificationClick = () => {
    console.log('🔔 NotificationButton: Clicked, opening panel');
    setIsNotificationPanelOpen(true);
  };

  // Always render the button, even if there's no user (for debugging)
  return (
    <>
      {/* Simple, always-visible notification button */}
      <div className="bg-red-500 p-4 rounded-lg border-4 border-yellow-400 shadow-2xl">
        <button
          onClick={handleNotificationClick}
          className="relative inline-flex items-center justify-center p-4 text-white hover:text-yellow-200 transition-all duration-200 rounded-lg hover:bg-red-600 border-2 border-white hover:border-yellow-300"
          title="Task Notifications"
          style={{ 
            minWidth: '80px', 
            minHeight: '80px',
            backgroundColor: '#ef4444',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          {/* Bell Icon - Very prominent */}
          <svg className="w-10 h-10" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
          </svg>
          
          {/* Notification Badge - Very prominent */}
          {pendingCount > 0 && (
            <span className="absolute -top-3 -right-3 bg-yellow-400 text-red-600 text-lg rounded-full h-8 w-8 flex items-center justify-center font-bold animate-pulse border-4 border-white shadow-lg">
              {pendingCount > 99 ? '99+' : pendingCount}
            </span>
          )}
          
          {/* Debug info - show user status */}
          <div className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 text-xs text-white bg-black px-2 py-1 rounded whitespace-nowrap">
            {user ? `User: ${user.uid?.slice(0, 8)}...` : 'No User'}
          </div>
        </button>
      </div>

      <NotificationPanel
        isOpen={isNotificationPanelOpen}
        onClose={() => setIsNotificationPanelOpen(false)}
      />
    </>
  );
};

export default NotificationButton;
