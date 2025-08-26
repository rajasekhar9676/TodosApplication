import React, { useState } from 'react';
import { updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../config';
import { Task } from '../types/task';

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onSelect?: (task: Task) => void;
  isSelected?: boolean;
  showTaskType?: boolean;
}

const TaskItem: React.FC<TaskItemProps> = ({ 
  task, 
  onEdit, 
  onDelete,
  onSelect, 
  isSelected = false,
  showTaskType = false 
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;
    if (!task.id) return; // Add null check
    
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'tasks', task.id));
      onDelete(task.id);
    } catch (error) {
      console.error('Error deleting task:', error);
      alert('Error deleting task. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800 border-green-200';
      case 'IN-PROGRESS': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'TO-DO': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTaskTypeColor = (taskType: string) => {
    switch (taskType) {
      case 'team': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'individual': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return '🖼️';
    if (type === 'application/pdf') return '📄';
    if (type.includes('word') || type.includes('document')) return '📝';
    if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
    if (type === 'text/plain') return '📃';
    return '📎';
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-sm border-2 p-4 mb-3 cursor-pointer transition-all duration-200 hover:shadow-md ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={() => onSelect && onSelect(task)}
    >
      {/* Header with title and actions */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">
            {task.title}
          </h3>
        </div>
        
        <div className="flex items-center space-x-2 ml-3">
          {/* Task Type Badge */}
          {showTaskType && (
            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getTaskTypeColor(task.taskType)}`}>
              {task.taskType === 'team' ? '👥' : '👤'}
              <span className="ml-1">{task.taskType === 'team' ? 'Team' : 'Individual'}</span>
            </span>
          )}
          
          {/* Priority Badge */}
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getPriorityColor(task.priority)}`}>
            {task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢'}
            <span className="ml-1 capitalize">{task.priority}</span>
          </span>
          
          {/* Status Badge */}
          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(task.status)}`}>
            {task.status === 'COMPLETED' ? '✅' : task.status === 'IN-PROGRESS' ? '🔄' : '⏳'}
            <span className="ml-1">{task.status.replace('-', ' ')}</span>
          </span>
        </div>
      </div>

      {/* Description */}
      {task.description && (
        <p className="text-gray-600 text-xs mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Category and Due Date */}
      <div className="flex items-center justify-between mb-3">
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          📂 {task.category}
        </span>
        
        {task.dueDate && (
          <span className="text-xs text-gray-500 flex items-center">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {task.dueDate}
          </span>
        )}
      </div>

      {/* Attachments */}
      {task.attachments && task.attachments.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center space-x-2 mb-2">
            <span className="text-xs font-medium text-gray-700">📎 Attachments ({task.attachments.length})</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {task.attachments.slice(0, 3).map((attachment, index) => (
              <div key={index} className="flex items-center space-x-1 bg-gray-50 rounded px-2 py-1">
                <span className="text-xs">{getFileIcon(attachment.type)}</span>
                <span className="text-xs text-gray-600 truncate max-w-20">
                  {attachment.name}
                </span>
                <span className="text-xs text-gray-400">
                  ({formatFileSize(attachment.size)})
                </span>
              </div>
            ))}
            {task.attachments.length > 3 && (
              <span className="text-xs text-gray-500">
                +{task.attachments.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Footer with actions */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100">
        <div className="flex items-center space-x-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            className="text-blue-600 hover:text-blue-700 text-xs font-medium hover:underline"
          >
            ✏️ Edit
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            disabled={isDeleting}
            className="text-red-600 hover:text-red-700 text-xs font-medium hover:underline disabled:opacity-50"
          >
            {isDeleting ? '🗑️ Deleting...' : '🗑️ Delete'}
          </button>
        </div>

        {/* Creation date */}
        <span className="text-xs text-gray-400">
          {task.createdAt?.toDate ? 
            task.createdAt.toDate().toLocaleDateString() : 
            new Date().toLocaleDateString()
          }
        </span>
      </div>
    </div>
  );
};

export default TaskItem;