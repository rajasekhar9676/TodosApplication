import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../config';
import { useAuth } from '../context/AuthContext';

interface TaskCountDebuggerProps {
  onClose: () => void;
}

interface TaskData {
  id: string;
  title?: string;
  status?: string;
  taskType?: string;
  createdBy?: string;
  assignedTo?: string;
  teamId?: string;
}

const TaskCountDebugger: React.FC<TaskCountDebuggerProps> = ({ onClose }) => {
  const { user } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const runDebug = async () => {
    if (!user?.uid) return;
    
    setLoading(true);
    const info: any = {};

    try {
      // 1. Check user document
      console.log('🔍 Debug: Checking user document...');
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        info.userDocument = {
          exists: true,
          teams: userData.teams || [],
          joinedTeams: userData.joinedTeams || [],
          hasTeams: !!(userData.teams && userData.teams.length > 0)
        };
      } else {
        info.userDocument = { exists: false };
      }

      // 2. Check individual tasks
      console.log('🔍 Debug: Checking individual tasks...');
      const individualQuery = query(
        collection(db, 'tasks'),
        where('createdBy', '==', user.uid),
        where('taskType', '==', 'individual')
      );
      const individualSnap = await getDocs(individualQuery);
      info.individualTasks = {
        count: individualSnap.docs.length,
        tasks: individualSnap.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title,
          status: doc.data().status,
          taskType: doc.data().taskType
        }))
      };

      // 3. Check team tasks
      console.log('🔍 Debug: Checking team tasks...');
      const teamQuery = query(
        collection(db, 'tasks'),
        where('taskType', '==', 'team')
      );
      const teamSnap = await getDocs(teamQuery);
      const allTeamTasks = teamSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TaskData[];
      
      info.teamTasks = {
        totalCount: allTeamTasks.length,
        userTeamTasks: allTeamTasks.filter(task => 
          info.userDocument.teams?.includes(task.teamId)
        ),
        allTeamTasks: allTeamTasks
      };

      // 4. Check assigned tasks
      console.log('🔍 Debug: Checking assigned tasks...');
      const assignedQuery = query(
        collection(db, 'tasks'),
        where('assignedTo', '==', user.uid)
      );
      const assignedSnap = await getDocs(assignedQuery);
      info.assignedTasks = {
        count: assignedSnap.docs.length,
        tasks: assignedSnap.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title,
          status: doc.data().status,
          assignedTo: doc.data().assignedTo
        }))
      };

      // 5. Check all tasks
      console.log('🔍 Debug: Checking all tasks...');
      const allTasksQuery = query(collection(db, 'tasks'));
      const allTasksSnap = await getDocs(allTasksQuery);
      info.allTasks = {
        count: allTasksSnap.docs.length,
        tasks: allTasksSnap.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title,
          status: doc.data().status,
          taskType: doc.data().taskType,
          createdBy: doc.data().createdBy,
          assignedTo: doc.data().assignedTo,
          teamId: doc.data().teamId
        }))
      };

      setDebugInfo(info);
      console.log('🔍 Debug: Complete debug info:', info);

    } catch (error) {
      console.error('❌ Debug: Error running debug:', error);
      info.error = error;
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runDebug();
  }, [user?.uid]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b border-gray-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                🔍 Task Count Debugger
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Debugging task count issues
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={runDebug}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                {loading ? '🔄 Running...' : '🔄 Refresh Debug'}
              </button>
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
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-400">Running debug...</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* User Document */}
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  👤 User Document
                </h3>
                <pre className="text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">
                  {JSON.stringify(debugInfo.userDocument, null, 2)}
                </pre>
              </div>

              {/* Individual Tasks */}
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  📝 Individual Tasks ({debugInfo.individualTasks?.count || 0})
                </h3>
                <pre className="text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">
                  {JSON.stringify(debugInfo.individualTasks, null, 2)}
                </pre>
              </div>

              {/* Team Tasks */}
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  🏢 Team Tasks ({debugInfo.teamTasks?.userTeamTasks?.length || 0} / {debugInfo.teamTasks?.totalCount || 0})
                </h3>
                <pre className="text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">
                  {JSON.stringify(debugInfo.teamTasks, null, 2)}
                </pre>
              </div>

              {/* Assigned Tasks */}
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  📋 Assigned Tasks ({debugInfo.assignedTasks?.count || 0})
                </h3>
                <pre className="text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">
                  {JSON.stringify(debugInfo.assignedTasks, null, 2)}
                </pre>
              </div>

              {/* All Tasks */}
              <div className="bg-gray-50 dark:bg-slate-700/50 rounded-xl p-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  📊 All Tasks ({debugInfo.allTasks?.count || 0})
                </h3>
                <pre className="text-sm text-gray-700 dark:text-gray-300 overflow-x-auto">
                  {JSON.stringify(debugInfo.allTasks, null, 2)}
                </pre>
              </div>

              {/* Summary */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
                  📈 Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-blue-800 dark:text-blue-200">Individual:</span>
                    <span className="ml-2 text-blue-600 dark:text-blue-300">{debugInfo.individualTasks?.count || 0}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800 dark:text-blue-200">Team:</span>
                    <span className="ml-2 text-blue-600 dark:text-blue-300">{debugInfo.teamTasks?.userTeamTasks?.length || 0}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800 dark:text-blue-200">Assigned:</span>
                    <span className="ml-2 text-blue-600 dark:text-blue-300">{debugInfo.assignedTasks?.count || 0}</span>
                  </div>
                  <div>
                    <span className="font-medium text-blue-800 dark:text-blue-200">Total:</span>
                    <span className="ml-2 text-blue-600 dark:text-blue-300">
                      {(debugInfo.individualTasks?.count || 0) + 
                       (debugInfo.teamTasks?.userTeamTasks?.length || 0) + 
                       (debugInfo.assignedTasks?.count || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaskCountDebugger;
