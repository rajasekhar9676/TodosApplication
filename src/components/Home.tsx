import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../config';
import TopBar, { TopBarProps } from './TopBar';
import TaskItem from './TaskItem';
import AddTaskForm from './AddTaskForm';
import { useParams } from 'react-router-dom';

interface Task {
  id: string;
  title: string;
  dueDate: string;
  status: 'TO-DO' | 'IN-PROGRESS' | 'COMPLETED';
  category: string;
}

const Home: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterDueDate, setFilterDueDate] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [visibleTasks, setVisibleTasks] = useState(5);
  const [isTodoExpanded, setIsTodoExpanded] = useState(true);
  const [isInProgressExpanded, setIsInProgressExpanded] = useState(true);
  const [isCompletedExpanded, setIsCompletedExpanded] = useState(true);
  const navigate = useNavigate();
  const { teamId } = useParams();

  // useEffect(() => {
  //   const unsubscribe = onSnapshot(collection(db, 'tasks'), (snapshot) => {
  //     const taskData = snapshot.docs.map(doc => ({
  //       id: doc.id,
  //       ...doc.data(),
  //     })) as Task[];
  //     setTasks(taskData);
  //   });
  //   return () => unsubscribe();
  // }, []);

  useEffect(() => {
  if (!teamId) return;

  const taskRef = collection(db, 'teams', teamId, 'tasks');
  const unsubscribe = onSnapshot(taskRef, (snapshot) => {
    const taskData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Task[];
    setTasks(taskData);
  });

  return () => unsubscribe();
}, [teamId]);


  const filteredTasks = tasks
    .filter(task => filterCategory === 'All' || task.category === filterCategory)
    .filter(task => filterDueDate === 'All' || task.dueDate === filterDueDate)
    .filter(task => task.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const toDoTasks = filteredTasks.filter(task => task.status === 'TO-DO').slice(0, visibleTasks);
  const inProgressTasks = filteredTasks.filter(task => task.status === 'IN-PROGRESS').slice(0, visibleTasks);
  const completedTasks = filteredTasks.filter(task => task.status === 'COMPLETED').slice(0, visibleTasks);

  const handleSelectTask = (taskId: string) => {
    if (selectedTasks.includes(taskId)) {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId));
    } else {
      setSelectedTasks([...selectedTasks, taskId]);
    }
  };

  const handleBulkStatusUpdate = async (newStatus: 'TO-DO' | 'IN-PROGRESS' | 'COMPLETED') => {
    for (const taskId of selectedTasks) {
      await updateDoc(doc(db, 'tasks', taskId), { status: newStatus });
    }
    setSelectedTasks([]);
  };

  const handleBulkDelete = async () => {
    for (const taskId of selectedTasks) {
      await deleteDoc(doc(db, 'tasks', taskId));
    }
    setSelectedTasks([]);
  };

  const handleLoadMore = () => {
    setVisibleTasks(prev => prev + 5);
  };

  return (
    <div className="relative min-h-screen bg-gray-100 overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute w-[700px] h-[700px] bg-gray-200 rounded-full opacity-10 top-[-300px] left-[-300px]"></div>
        <div className="absolute w-[500px] h-[500px] bg-gray-200 rounded-full opacity-10 top-[40%] left-[20%]"></div>
        <div className="absolute w-[600px] h-[600px] bg-gray-200 rounded-full opacity-10 bottom-[-200px] right-[-200px]"></div>
      </div>

      <div className="relative z-10">
        <TopBar
          filterCategory={filterCategory}
          setFilterCategory={setFilterCategory}
          filterDueDate={filterDueDate}
          setFilterDueDate={setFilterDueDate}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          setShowForm={setShowForm}
        />

        <div className="p-4 sm:p-8">
          {/* Desktop View: Headers */}
          <div className="hidden sm:flex items-center justify-between text-gray-500 text-sm mb-2">
            <p className="w-1/4">Task name</p>
            <p className="w-1/4 text-center">Due on :</p>
            <p className="w-1/4 text-center">Task Status</p>
            <p className="w-1/4 text-center">Task Category</p>
          </div>

          {showForm && (
            <AddTaskForm
              taskToEdit={taskToEdit}
              onClose={() => {
                setShowForm(false);
                setTaskToEdit(null);
              }}
            />
          )}

          <div className="mb-8">
            <h3 className="font-semibold text-lg mb-3 bg-[#FAC3FF] p-2 rounded-t-md flex justify-between items-center">
              Todo ({toDoTasks.length})
              <button onClick={() => setIsTodoExpanded(!isTodoExpanded)}>
                <svg
                  className={`w-5 h-5 transform ${isTodoExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
            </h3>
            {isTodoExpanded && (
              <>
                {toDoTasks.length === 0 ? (
                  <div className="p-4 bg-gray-50 rounded-b-md text-center text-gray-500">
                    No Tasks in To-Do
                  </div>
                ) : (
                  toDoTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onEdit={(task) => {
                        setTaskToEdit(task);
                        setShowForm(true);
                      }}
                      onSelect={handleSelectTask}
                      isSelected={selectedTasks.includes(task.id)}
                    />
                  ))
                )}
              </>
            )}
          </div>

          <div className="mb-8">
            <h3 className="font-semibold text-lg mb-3 bg-[#85D9F1] p-2 rounded-t-md flex justify-between items-center">
              In-Progress ({inProgressTasks.length})
              <button onClick={() => setIsInProgressExpanded(!isInProgressExpanded)}>
                <svg
                  className={`w-5 h-5 transform ${isInProgressExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
            </h3>
            {isInProgressExpanded && (
              <>
                {inProgressTasks.length === 0 ? (
                  <div className="p-4 bg-gray-50 rounded-b-md text-center text-gray-500">
                    No Tasks In-Progress
                  </div>
                ) : (
                  inProgressTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onEdit={(task) => {
                        setTaskToEdit(task);
                        setShowForm(true);
                      }}
                      onSelect={handleSelectTask}
                      isSelected={selectedTasks.includes(task.id)}
                    />
                  ))
                )}
                {inProgressTasks.length < filteredTasks.filter(task => task.status === 'IN-PROGRESS').length && (
                  <button
                    onClick={handleLoadMore}
                    className="w-full p-2 text-center text-blue-500 hover:underline"
                  >
                    Load More
                  </button>
                )}
              </>
            )}
          </div>

          <div>
            <h3 className="font-semibold text-lg mb-3 bg-[#CEFFCC] p-2 rounded-t-md flex justify-between items-center">
              Completed ({completedTasks.length})
              <button onClick={() => setIsCompletedExpanded(!isCompletedExpanded)}>
                <svg
                  className={`w-5 h-5 transform ${isCompletedExpanded ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>
            </h3>
            {isCompletedExpanded && (
              <>
                {completedTasks.length === 0 ? (
                  <div className="p-4 bg-gray-50 rounded-b-md text-center text-gray-500">
                    No Tasks Completed
                  </div>
                ) : (
                  completedTasks.map(task => (
                    <TaskItem
                      key={task.id}
                      task={task}
                      onEdit={(task) => {
                        setTaskToEdit(task);
                        setShowForm(true);
                      }}
                      onSelect={handleSelectTask}
                      isSelected={selectedTasks.includes(task.id)}
                    />
                  ))
                )}
              </>
            )}
          </div>

          {selectedTasks.length > 0 && (
            <div className="fixed bottom-4 left-0 right-0 flex items-center justify-center space-x-4 bg-black text-white p-2 rounded-md mx-4">
              <p>{selectedTasks.length} Tasks Selected</p>
              <button
                onClick={() => setSelectedTasks([])}
                className="text-white"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
              <select
                onChange={(e) => handleBulkStatusUpdate(e.target.value as 'TO-DO' | 'IN-PROGRESS' | 'COMPLETED')}
                className="p-1 rounded bg-gray-800 text-white"
              >
                <option value="">Status</option>
                <option value="TO-DO">TO-DO</option>
                <option value="IN-PROGRESS">IN-PROGRESS</option>
                <option value="COMPLETED">COMPLETED</option>
              </select>
              <button
                onClick={handleBulkDelete}
                className="bg-red-500 text-white px-4 py-1 rounded-md"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;


