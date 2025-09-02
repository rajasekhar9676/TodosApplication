import React, { useState } from 'react';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { db } from '../config';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { useAuth } from '../context/AuthContext';
import { Task, Team } from '../types/task';

interface AddTaskFormProps {
  taskToEdit: Task | null;
  onClose: () => void;
  userTeams?: Team[];
}

const AddTaskForm: React.FC<AddTaskFormProps> = ({ taskToEdit, onClose, userTeams = [] }) => {
  const { user } = useAuth();
  const [title, setTitle] = useState(taskToEdit?.title || '');
  const [description, setDescription] = useState(taskToEdit?.description || '');
  const [category, setCategory] = useState(taskToEdit?.category || '');
  const [dueDate, setDueDate] = useState(taskToEdit?.dueDate || '');
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    taskToEdit?.dueDate ? new Date(taskToEdit.dueDate.split('/').reverse().join('-')) : null
  );
  const [status, setStatus] = useState<'TO-DO' | 'IN-PROGRESS' | 'COMPLETED'>(taskToEdit?.status || 'TO-DO');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(taskToEdit?.priority || 'medium');
  const [taskType, setTaskType] = useState<'individual' | 'team'>(taskToEdit?.taskType || 'individual');
  const [selectedTeamId, setSelectedTeamId] = useState(taskToEdit?.teamId || '');
  const [assignedTo, setAssignedTo] = useState(taskToEdit?.assignedTo || '');
  const [attachments, setAttachments] = useState<Array<{
    name: string;
    url: string;
    type: string;
    size: number;
    uploadedAt: string;
  }>>(taskToEdit?.attachments || []);
  const [activityLog, setActivityLog] = useState<{ message: string; timestamp: string }[]>(
    taskToEdit?.activityLog || []
  );
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'ATTACHMENTS' | 'ACTIVITY'>('DETAILS');
  const [uploadingFiles, setUploadingFiles] = useState(false);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!title) newErrors.title = 'Task Title is required';
    if (!category) newErrors.category = 'Category is required';
    // Due date is optional for individual tasks, required for team tasks
    if (taskType === 'team' && !dueDate) newErrors.dueDate = 'Due Date is required for team tasks';
    if (!status) newErrors.status = 'Status is required';
    if (taskType === 'team' && !selectedTeamId) newErrors.teamId = 'Team selection is required for team tasks';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileUpload = async (files: FileList) => {
    if (!files || files.length === 0) return;
    
    setUploadingFiles(true);
    const newAttachments = [...attachments];
    
    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Check file size (max 1MB to prevent Firestore payload issues)
        if (file.size > 1 * 1024 * 1024) {
          alert(`File ${file.name} is too large. Maximum size is 1MB. Please use smaller files or compress them.`);
          continue;
        }
        
        // Check file type
        const allowedTypes = [
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'text/plain', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        ];
        
        if (!allowedTypes.includes(file.type)) {
          alert(`File type ${file.type} is not supported.`);
          continue;
        }
        
        // Store file metadata only (not the actual file content)
        const newAttachment = {
          name: file.name,
          url: '', // Empty URL - files will be handled separately
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString()
        };
        
        newAttachments.push(newAttachment);
        setAttachments([...newAttachments]);
        
        // Add to activity log
        const newLog = {
          message: `You uploaded file: ${file.name}`,
          timestamp: new Date().toLocaleString(),
        };
        setActivityLog(prev => [...prev, newLog]);
      }
      
      setAttachments(newAttachments);
    } catch (error) {
      console.error('Error uploading files:', error);
      alert('Error uploading files. Please try again.');
    } finally {
      setUploadingFiles(false);
    }
  };

  const handleFileDelete = async (attachmentIndex: number) => {
    try {
      // TEMPORARY: For base64 files, just remove from state
      // No need to delete from Firebase Storage
      const newAttachments = attachments.filter((_, index) => index !== attachmentIndex);
      setAttachments(newAttachments);
      
      const deletedAttachment = attachments[attachmentIndex];
      const newLog = {
        message: `You deleted file: ${deletedAttachment.name}`,
        timestamp: new Date().toLocaleString(),
      };
      setActivityLog(prev => [...prev, newLog]);
    } catch (error) {
      console.error('Error deleting file:', error);
      alert('Error deleting file. Please try again.');
    }
  };

  const handleDateChange = (date: Date | null) => {
    setSelectedDate(date);
    if (date) {
      const formattedDate = date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
      setDueDate(formattedDate);
    } else {
      setDueDate('');
    }
  };

  const highlightDates = [
    new Date(2024, 11, 9), // 9th December 2024
    new Date(2024, 11, 24), // 24th December 2024
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !user) return;

    const newActivityLog = [...activityLog];
    if (taskToEdit && taskToEdit.status !== status) {
      newActivityLog.push({
        message: `You changed the status from ${taskToEdit.status} to ${status}`,
        timestamp: new Date().toLocaleString(),
      });
    }

    const taskData: Partial<Task> = {
      title,
      description,
      category,
      dueDate: dueDate || undefined,
      status,
      priority,
      taskType,
      activityLog: newActivityLog,
      attachments,
    };

    // Only add createdBy and createdAt for new tasks
    if (!taskToEdit) {
      taskData.createdBy = user.uid;
      taskData.createdAt = new Date();
    }

    // Only add team-related fields if this is a team task
    if (taskType === 'team' && selectedTeamId) {
      taskData.teamId = selectedTeamId;
      if (assignedTo) {
        taskData.assignedTo = assignedTo;
      }
    }

    try {
      // Check data size before saving
      const dataSize = JSON.stringify(taskData).length;
      console.log('📊 Task data size:', dataSize, 'bytes');
      
      if (dataSize > 1000000) { // 1MB limit
        alert('Task data is too large. Please reduce file attachments or description length.');
        return;
      }
      
      if (taskToEdit) {
        console.log('🔄 Updating task:', taskToEdit.id);
        await updateDoc(doc(db, 'tasks', taskToEdit.id!), taskData);
        console.log('✅ Task updated successfully');
      } else {
        newActivityLog.push({
          message: 'You created this task',
          timestamp: new Date().toLocaleString(),
        });
        taskData.activityLog = newActivityLog;
        console.log('🔄 Creating new task');
        const docRef = await addDoc(collection(db, 'tasks'), taskData);
        console.log('✅ Task created successfully with ID:', docRef.id);
      }
      onClose();
    } catch (error) {
      console.error('❌ Error saving task:', error);
      
      // Provide more specific error messages
      let errorMessage = 'Error saving task. Please try again.';
      if (error instanceof Error) {
        if (error.message.includes('permission-denied')) {
          errorMessage = 'Permission denied. Please check your account permissions.';
        } else if (error.message.includes('network')) {
          errorMessage = 'Network error. Please check your internet connection.';
        } else if (error.message.includes('quota') || error.message.includes('payload size')) {
          errorMessage = 'Task data is too large. Please reduce file attachments or description length.';
        } else if (error.message.includes('Request payload size exceeds')) {
          errorMessage = 'Task data is too large. Please reduce file attachments or description length.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      alert(errorMessage);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-11/12 sm:w-3/4 lg:w-2/3 xl:w-1/2 max-h-[90vh] overflow-y-auto relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-700 z-10">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
        
        <h2 className="text-2xl font-bold mb-6 text-gray-800">
          {taskToEdit ? 'Edit Task' : 'Create New Task'}
        </h2>
        
        {taskToEdit && (
          <div className="flex space-x-2 mb-6">
            <button
              onClick={() => setActiveTab('DETAILS')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'DETAILS' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              DETAILS
            </button>
            <button
              onClick={() => setActiveTab('ATTACHMENTS')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'ATTACHMENTS' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ATTACHMENTS ({attachments.length})
            </button>
            <button
              onClick={() => setActiveTab('ACTIVITY')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'ACTIVITY' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ACTIVITY
            </button>
          </div>
        )}

        {(activeTab === 'DETAILS' || !taskToEdit) && (
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Task Type Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Task Type *</label>
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setTaskType('individual')}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                      taskType === 'individual'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Individual Task
                  </button>
                  <button
                    type="button"
                    onClick={() => setTaskType('team')}
                    className={`flex-1 px-4 py-3 rounded-lg border-2 font-medium transition-all ${
                      taskType === 'team'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
                    }`}
                  >
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Team Task
                  </button>
                </div>
              </div>

              {/* Team Selection (only for team tasks) */}
              {taskType === 'team' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Team *</label>
                  <select
                    value={selectedTeamId}
                    onChange={(e) => setSelectedTeamId(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Choose a team</option>
                    {userTeams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                  {errors.teamId && <p className="text-red-500 text-xs mt-1">{errors.teamId}</p>}
                </div>
              )}
            </div>

            {/* Task Title and Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Task Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter task title"
                  required
                />
                {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority *</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={4}
                placeholder="Describe the task in detail..."
              />
              <div className="flex justify-between items-center mt-1">
                <div className="flex space-x-2">
                  <button type="button" className="text-gray-500 hover:text-gray-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m-4-4h8" />
                    </svg>
                  </button>
                  <button type="button" className="text-gray-500 hover:text-gray-700">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m-4-4h8" />
                    </svg>
                  </button>
                </div>
                <p className="text-gray-500 text-xs">{description.length}/500 characters</p>
              </div>
            </div>

            {/* Category and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Task Category *</label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setCategory('Work')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      category === 'Work' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Work
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('Personal')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      category === 'Personal' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Personal
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('Project')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      category === 'Project' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    Project
                  </button>
                </div>
                {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Task Status *</label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'TO-DO' | 'IN-PROGRESS' | 'COMPLETED')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="TO-DO">TO-DO</option>
                  <option value="IN-PROGRESS">IN-PROGRESS</option>
                  <option value="COMPLETED">COMPLETED</option>
                </select>
                {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status}</p>}
              </div>
            </div>

            {/* Due Date and Assignment */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Date *</label>
                <div className="relative">
                  <DatePicker
                    selected={selectedDate}
                    onChange={handleDateChange}
                    dateFormat="dd MMM, yyyy"
                    placeholderText="Select due date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    highlightDates={highlightDates}
                    minDate={new Date()}
                  />
                  <svg
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                {errors.dueDate && <p className="text-red-500 text-xs mt-1">{errors.dueDate}</p>}
              </div>

              {/* Assignment (only for team tasks) */}
              {taskType === 'team' && selectedTeamId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assign To</label>
                  <select
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Unassigned</option>
                    {userTeams
                      .find(team => team.id === selectedTeamId)
                      ?.members.map((member) => (
                        <option key={member.uid} value={member.uid}>
                          {member.uid === user?.uid ? 'Me' : `Member ${member.uid.slice(0, 8)}`}
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>

            {/* File Upload Section - ALWAYS VISIBLE */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                📎 Attachments ({attachments.length})
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  multiple
                  onChange={(e) => e.target.files && handleFileUpload(e.target.files)}
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.webp,.xls,.xlsx"
                  disabled={uploadingFiles}
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <div className="space-y-2">
                    <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                      <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-blue-600 hover:text-blue-500">
                        {uploadingFiles ? 'Uploading...' : 'Click to upload files'}
                      </span>
                      <span> or drag and drop</span>
                    </div>
                    <p className="text-xs text-gray-500">
                      PDF, Word, Excel, Images, Text files (Max 10MB each)
                    </p>
                  </div>
                </label>
              </div>
              
              {/* Show uploaded files */}
              {attachments.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Files:</h4>
                  <div className="space-y-2">
                    {attachments.map((attachment, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <span className="text-lg">{getFileIcon(attachment.type)}</span>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{attachment.name}</p>
                            <p className="text-xs text-gray-500">
                              {formatFileSize(attachment.size)} • {new Date(attachment.uploadedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleFileDelete(index)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Delete
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                {taskToEdit ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </form>
        )}

        {activeTab === 'ATTACHMENTS' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Task Attachments</h3>
            
            {attachments.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="mt-2 text-gray-500">No attachments uploaded yet</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {attachments.map((attachment, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl">{getFileIcon(attachment.type)}</span>
                      <div>
                        <p className="font-medium text-gray-900">{attachment.name}</p>
                        <p className="text-sm text-gray-500">
                          {formatFileSize(attachment.size)} • {new Date(attachment.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <a
                        href={attachment.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      >
                        View
                      </a>
                      <button
                        onClick={() => handleFileDelete(index)}
                        className="text-red-600 hover:text-red-700 text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'ACTIVITY' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Task Activity Log</h3>
            
            {activityLog.length === 0 ? (
              <div className="text-center py-8">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="mt-2 text-gray-500">No activity recorded yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activityLog.map((log, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">{log.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{log.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AddTaskForm;

