import React, { useState, useEffect } from 'react';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { db, storage } from '../config';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

interface Task {
  id?: string;
  title: string;
  description?: string;
  dueDate: string;
  status: 'TO-DO' | 'IN-PROGRESS' | 'COMPLETED';
  category: string;
  activityLog?: { message: string; timestamp: string }[];
  attachment?: string;
}

interface AddTaskFormProps {
  taskToEdit: Task | null;
  onClose: () => void;
}

const AddTaskForm: React.FC<AddTaskFormProps> = ({ taskToEdit, onClose }) => {
  const [title, setTitle] = useState(taskToEdit?.title || '');
  const [description, setDescription] = useState(taskToEdit?.description || '');
  const [category, setCategory] = useState(taskToEdit?.category || '');
  const [dueDate, setDueDate] = useState(taskToEdit?.dueDate || '');
  const [selectedDate, setSelectedDate] = useState<Date | null>(
    taskToEdit?.dueDate ? new Date(taskToEdit.dueDate.split('/').reverse().join('-')) : null
  );
  const [status, setStatus] = useState<'TO-DO' | 'IN-PROGRESS' | 'COMPLETED'>(taskToEdit?.status || 'TO-DO');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentURL, setAttachmentURL] = useState(taskToEdit?.attachment || '');
  const [activityLog, setActivityLog] = useState<{ message: string; timestamp: string }[]>(
    taskToEdit?.activityLog || []
  );
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [activeTab, setActiveTab] = useState<'DETAILS' | 'ACTIVITY'>('DETAILS');

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!title) newErrors.title = 'Task Title is required';
    if (!category) newErrors.category = 'Category is required';
    if (!dueDate) newErrors.dueDate = 'Due Date is required';
    if (!status) newErrors.status = 'Status is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileUpload = async (file: File) => {
    const storageRef = ref(storage, `attachments/${file.name}`);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    setAttachmentURL(url);

    const newLog = {
      message: 'You uploaded file',
      timestamp: new Date().toLocaleString(),
    };
    setActivityLog([...activityLog, newLog]);
  };

  const handleFileDelete = async () => {
    if (attachmentURL) {
      const fileRef = ref(storage, attachmentURL);
      await deleteObject(fileRef);
      setAttachmentURL('');

      const newLog = {
        message: 'You deleted file',
        timestamp: new Date().toLocaleString(),
      };
      setActivityLog([...activityLog, newLog]);
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
    if (!validateForm()) return;

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
      dueDate,
      status,
      activityLog: newActivityLog,
      attachment: attachmentURL,
    };

    try {
      if (taskToEdit) {
        await updateDoc(doc(db, 'tasks', taskToEdit.id!), taskData);
      } else {
        newActivityLog.push({
          message: 'You created this task',
          timestamp: new Date().toLocaleString(),
        });
        taskData.activityLog = newActivityLog;
        await addDoc(collection(db, 'tasks'), taskData);
      }
      onClose();
    } catch (error) {
      console.error('Error saving task:', error);
    }
  };

  return (
    <div className="fixed top-[64px] bottom-0 left-0 right-0 bg-black bg-opacity-50 flex items-start justify-center z-20">
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg w-11/12 sm:w-1/2 max-h-[calc(100vh-64px)] overflow-y-auto relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
        <h2 className="text-lg font-semibold mb-4">{taskToEdit ? '' : 'Create Task'}</h2>
        {taskToEdit && (
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => setActiveTab('DETAILS')}
              className={`px-4 py-1 rounded-full text-sm font-medium ${
                activeTab === 'DETAILS' ? 'bg-black text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              DETAILS
            </button>
            <button
              onClick={() => setActiveTab('ACTIVITY')}
              className={`px-4 py-1 rounded-full text-sm font-medium ${
                activeTab === 'ACTIVITY' ? 'bg-black text-white' : 'bg-gray-200 text-gray-700'
              }`}
            >
              ACTIVITY
            </button>
          </div>
        )}
        {activeTab === 'DETAILS' ? (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Task Title*</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 p-2 w-full border rounded-md"
                placeholder="Task title"
              />
              {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 p-2 w-full border rounded-md"
                rows={4}
                placeholder="Description"
              />
              <div className="flex justify-between items-center mt-1">
                <div className="flex space-x-2">
                  <button type="button" className="text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m-4-4h8"></path>
                    </svg>
                  </button>
                  <button type="button" className="text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m-4-4h8"></path>
                    </svg>
                  </button>
                  <button type="button" className="text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m-4-4h8"></path>
                    </svg>
                  </button>
                  <button type="button" className="text-gray-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m-4-4h8"></path>
                    </svg>
                  </button>
                </div>
                <p className="text-gray-500 text-xs">{description.length}/300 characters</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Task Category*</label>
              <div className="flex space-x-2 mt-1">
                <button
                  type="button"
                  onClick={() => setCategory('Work')}
                  className={`px-4 py-1 rounded-md text-sm font-medium ${
                    category === 'Work' ? 'bg-[#7B1984] text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Work
                </button>
                <button
                  type="button"
                  onClick={() => setCategory('Personal')}
                  className={`px-4 py-1 rounded-md text-sm font-medium ${
                    category === 'Personal' ? 'bg-[#7B1984] text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Personal
                </button>
              </div>
              {errors.category && <p className="text-red-500 text-xs mt-1">{errors.category}</p>}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Due on*</label>
              <div className="relative">
                <DatePicker
                  selected={selectedDate}
                  onChange={handleDateChange}
                  dateFormat="dd MMM, yyyy"
                  placeholderText="DD/MM/YYYY"
                  className="mt-1 p-2 w-full border rounded-md"
                  highlightDates={highlightDates}
                  customInput={<input />}
                  calendarClassName="border rounded-md shadow-lg"
                  dayClassName={(date) =>
                    highlightDates.some(
                      (highlightDate) =>
                        date.getDate() === highlightDate.getDate() &&
                        date.getMonth() === highlightDate.getMonth() &&
                        date.getFullYear() === highlightDate.getFullYear()
                    )
                      ? 'bg-purple-500 text-white rounded-md'
                      : ''
                  }
                  renderCustomHeader={({ date, decreaseMonth, increaseMonth }) => (
                    <div className="flex justify-between items-center px-2 py-1">
                      <button onClick={decreaseMonth} className="text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path>
                        </svg>
                      </button>
                      <span className="text-sm font-medium">
                        {date.toLocaleString('default', { month: 'long', year: 'numeric' })}
                      </span>
                      <button onClick={increaseMonth} className="text-gray-500">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                        </svg>
                      </button>
                    </div>
                  )}
                />
                <svg
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                  ></path>
                </svg>
              </div>
              {errors.dueDate && <p className="text-red-500 text-xs mt-1">{errors.dueDate}</p>}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Task Status*</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as 'TO-DO' | 'IN-PROGRESS' | 'COMPLETED')}
                className="mt-1 p-2 w-full border rounded-md"
              >
                <option value="">Choose</option>
                <option value="TO-DO">TO-DO</option>
                <option value="IN-PROGRESS">IN-PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
              {errors.status && <p className="text-red-500 text-xs mt-1">{errors.status}</p>}
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">Attachment</label>
              <div className="mt-1 p-4 border-dashed border-2 border-gray-300 rounded-md text-center">
                {attachmentURL ? (
                  <div className="flex items-center justify-center space-x-2">
                    <img src={attachmentURL} alt="Attachment" className="h-16 w-16 object-cover" />
                    <button onClick={handleFileDelete} className="text-red-500">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                      </svg>
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      type="file"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          setAttachment(e.target.files[0]);
                          handleFileUpload(e.target.files[0]);
                        }
                      }}
                      className="hidden"
                      id="file-upload"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer text-gray-700">
                      Drop your files here or <span className="text-blue-500 underline">Upload</span>
                    </label>
                  </>
                )}
              </div>
            </div>
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border rounded-full text-gray-700 uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#7B1984] text-white rounded-full uppercase"
              >
                {taskToEdit ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        ) : (
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700">Activity</h3>
            <div className="mt-2 max-h-40 overflow-y-auto">
              {activityLog.map((log, index) => (
                <div key={index} className="flex justify-between text-xs text-gray-500 mb-2">
                  <p>{log.message}</p>
                  <p>{log.timestamp}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddTaskForm;

