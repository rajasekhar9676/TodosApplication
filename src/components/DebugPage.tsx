import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../config';
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';

const DebugPage: React.FC = () => {
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    
    const gatherDebugInfo = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const info: any = {
          userId: user.uid,
          userEmail: user.email,
          timestamp: new Date().toISOString()
        };
        
        // Check user document
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            info.userDocument = {
              exists: true,
              teams: userData.teams || [],
              joinedTeams: userData.joinedTeams || [],
              displayName: userData.displayName,
              email: userData.email
            };
          } else {
            info.userDocument = { exists: false };
          }
        } catch (err) {
          info.userDocument = { error: err instanceof Error ? err.message : 'Unknown error' };
        }
        
        // Check teams collection
        try {
          const teamsSnapshot = await getDocs(collection(db, 'teams'));
          info.teamsCollection = {
            count: teamsSnapshot.size,
            teams: teamsSnapshot.docs.map(doc => ({
              id: doc.id,
              name: doc.data().name,
              members: doc.data().members || []
            }))
          };
        } catch (err) {
          info.teamsCollection = { error: err instanceof Error ? err.message : 'Unknown error' };
        }
        
        // Check tasks collection
        try {
          const tasksSnapshot = await getDocs(collection(db, 'tasks'));
          info.tasksCollection = {
            count: tasksSnapshot.size,
            tasks: tasksSnapshot.docs.map(doc => ({
              id: doc.id,
              title: doc.data().title,
              teamId: doc.data().teamId,
              assignedTo: doc.data().assignedTo
            }))
          };
        } catch (err) {
          info.tasksCollection = { error: err instanceof Error ? err.message : 'Unknown error' };
        }
        
        setDebugInfo(info);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error occurred');
      } finally {
        setLoading(false);
      }
    };
    
    gatherDebugInfo();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Debug Page</h1>
          <p className="text-gray-600">Please log in to view debug information.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-blue-700">Gathering debug information...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-900 mb-4">Error</h1>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Debug Information</h1>
        
        <div className="space-y-6">
          {/* User Info */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">User Information</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                {JSON.stringify({
                  uid: debugInfo.userId,
                  email: debugInfo.userEmail,
                  timestamp: debugInfo.timestamp
                }, null, 2)}
              </pre>
            </div>
          </div>

          {/* User Document */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">User Document</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(debugInfo.userDocument, null, 2)}
              </pre>
            </div>
          </div>

          {/* Teams Collection */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Teams Collection</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(debugInfo.teamsCollection, null, 2)}
              </pre>
            </div>
          </div>

          {/* Tasks Collection */}
          <div>
            <h2 className="text-xl font-semibold text-gray-800 mb-3">Tasks Collection</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                {JSON.stringify(debugInfo.tasksCollection, null, 2)}
              </pre>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex space-x-4">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh Data
          </button>
          <button
            onClick={() => window.location.href = '/dashboard'}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};

export default DebugPage;













