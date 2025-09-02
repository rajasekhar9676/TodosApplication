import React, { useState } from 'react';
import { Task } from '../types/task';

interface TaskListManagerProps {
  tasks: Task[];
  viewType: 'individual' | 'team' | 'assigned' | 'all';
  onViewChange: (view: 'list' | 'grid') => void;
  currentView: 'list' | 'grid';
}

const TaskListManager: React.FC<TaskListManagerProps> = ({ 
  tasks, 
  viewType, 
  onViewChange, 
  currentView 
}) => {
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Filter tasks based on current filters
  const filteredTasks = tasks.filter(task => {
    if (filterStatus !== 'all' && task.status !== filterStatus) return false;
    if (filterPriority !== 'all' && task.priority !== filterPriority) return false;
    if (filterCategory !== 'all' && task.category !== filterCategory) return false;
    if (viewType === 'individual' && task.taskType !== 'individual') return false;
    if (viewType === 'team' && task.taskType !== 'team') return false;
    if (viewType === 'assigned' && !task.assignedTo) return false;
    return true;
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {viewType === 'assigned' ? 'Assigned' : viewType.charAt(0).toUpperCase() + viewType.slice(1)} Tasks
          </h2>
          <p className="text-gray-600 mt-1">
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} found
          </p>
        </div>
        
        <div className="flex items-center space-x-3 mt-4 sm:mt-0">
          {/* View Type Buttons */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => onViewChange('list')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                currentView === 'list'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              List
            </button>
            <button
              onClick={() => onViewChange('grid')}
              className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                currentView === 'grid'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Grid
            </button>

          </div>
        </div>
      </div>

      {/* Task Count Summary - Above List View */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="ml-3">
              <p className="text-sm font-medium text-blue-800">Total</p>
              <p className="text-lg font-semibold text-blue-900">{filteredTasks.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="ml-3">
              <p className="text-sm font-medium text-yellow-800">Pending</p>
              <p className="text-lg font-semibold text-yellow-900">
                {filteredTasks.filter(task => task.status !== 'COMPLETED').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">Completed</p>
              <p className="text-lg font-semibold text-green-900">
                {filteredTasks.filter(task => task.status === 'COMPLETED').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="ml-3">
              <p className="text-sm font-medium text-purple-800">With Files</p>
              <p className="text-lg font-semibold text-purple-900">
                {filteredTasks.filter(task => task.attachments && task.attachments.length > 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* List View */}
      {currentView === 'list' && (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredTasks.map((task) => (
                  <tr key={task.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{task.title}</div>
                        {task.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">{task.description}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        task.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        task.status === 'IN-PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.status.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        task.priority === 'high' ? 'bg-red-100 text-red-800' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{task.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        task.taskType === 'individual' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {task.taskType === 'individual' ? 'Individual' : 'Team'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {task.attachments && task.attachments.length > 0 && (
                          <span className="text-blue-600 text-sm">📎 {task.attachments.length}</span>
                        )}
                        <button
                          onClick={() => window.open(`/tasks?view=${task.id}`, '_blank')}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                          title="View task details"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskListManager;
