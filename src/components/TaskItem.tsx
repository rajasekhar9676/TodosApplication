import React from 'react';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '../config';

interface Task {
  id: string;
  title: string;
  dueDate: string;
  status: 'TO-DO' | 'IN-PROGRESS' | 'COMPLETED';
  category: string;
}

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onSelect?: (taskId: string) => void;
  isSelected?: boolean;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onEdit, onSelect, isSelected }) => {
  const handleDelete = async () => {
    await deleteDoc(doc(db, 'tasks', task.id));
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-md mb-2 shadow-sm group">
      {/* Mobile View: Show only the title with a checkbox */}
      <div
        className="flex items-center sm:hidden w-full"
        onClick={() => onEdit(task)} // Open edit form on tap in mobile view
      >
        {onSelect && (
          <div className="mr-2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation(); // Prevent triggering onEdit when clicking the checkbox
                onSelect(task.id);
              }}
              className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
            />
          </div>
        )}
        <p className="text-sm font-semibold truncate">{task.title}</p>
      </div>

      {/* Desktop View: Show full details */}
      <div className="hidden sm:flex items-center w-full">
        {/* Checkbox for Selection (Only in Home View) */}
        {onSelect && (
          <div className="mr-2">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onSelect(task.id)}
              className="w-5 h-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
            />
          </div>
        )}

        {/* Status Indicator (Only in Home View) */}
        {onSelect && (
          <div className="mr-4">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center ${
                task.status === 'COMPLETED' ? 'bg-green-500' : 'border border-gray-300'
              }`}
            >
              {task.status === 'COMPLETED' ? (
                // Green circle with tick mark for Completed
                <svg
                  className="w-3 h-3 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M5 13l4 4L19 7"
                  ></path>
                </svg>
              ) : (
                // Gray circle with three dots for To-Do and In-Progress
                <svg
                  className="w-3 h-3 text-gray-400"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M6 10h2v2H6v-2zm4 0h2v2h-2v-2zm4 0h2v2h-2v-2z" />
                </svg>
              )}
            </div>
          </div>
        )}

        <div className="flex w-full justify-between">
          {/* Task Title with Strikethrough for Completed (Only in Home View) */}
          <p
            className={`text-sm font-semibold w-1/4 ${
              onSelect && task.status === 'COMPLETED' ? 'line-through text-gray-500' : ''
            }`}
          >
            {task.title}
          </p>

          {/* Desktop view: Due Date, Status, Category (Home View) */}
          {onSelect ? (
            <>
              <p className="text-gray-500 text-xs w-1/4 text-center">{task.dueDate}</p>
              <p className="text-gray-500 text-xs w-1/4 text-center">{task.status}</p>
              <p className="text-gray-500 text-xs w-1/4 text-center">{task.category}</p>
            </>
          ) : (
            // Board View: Show Category and Due Date below the title
            <div className="text-gray-500 text-xs">
              <p>{task.category}</p>
              <p>{task.dueDate}</p>
            </div>
          )}
        </div>
      </div>

      {/* Three-Dot Menu */}
      <div className="relative">
        <button className="text-gray-500">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
            ></path>
          </svg>
        </button>
        <div className="absolute right-0 mt-2 w-32 bg-white rounded-md shadow-lg z-10 sm:hidden group-hover:block">
          <button
            onClick={() => onEdit(task)}
            className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="block px-4 py-2 text-sm text-red-500 hover:bg-gray-100 w-full text-left"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskItem;