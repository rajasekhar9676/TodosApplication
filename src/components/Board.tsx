import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, onSnapshot, updateDoc, doc, deleteDoc, query, where, getDoc } from 'firebase/firestore';
import { db } from '../config';
import { DragDropContext, Droppable, Draggable, DropResult } from 'react-beautiful-dnd';
import TopBar from './TopBar';
import TaskItem from './TaskItem';
import AddTaskForm from './AddTaskForm';
import { useAuth } from '../context/AuthContext';
import { Task, Team } from '../types/task';

const Board: React.FC = () => {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [visibleTasks, setVisibleTasks] = useState(5);
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterDueDate, setFilterDueDate] = useState('All');
  const [filterTaskType, setFilterTaskType] = useState<'all' | 'individual' | 'team'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Fetch user teams
  useEffect(() => {
    if (!user?.uid) return;

    const fetchUserTeams = async () => {
      try {
        // Get user's teams from user document
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        const userData = userSnap.data();

        if (userData?.teams && userData.teams.length > 0) {
          // Fetch team details for each team ID
          const teamPromises = userData.teams.map(async (teamId: string) => {
            const teamRef = doc(db, 'teams', teamId);
            const teamSnap = await getDoc(teamRef);
            if (teamSnap.exists()) {
              return { id: teamId, ...teamSnap.data() };
            }
            return null;
          });
          
          const teamsData = (await Promise.all(teamPromises)).filter(Boolean);
          setUserTeams(teamsData);
        }
      } catch (error) {
        console.error('Error fetching user teams:', error);
      }
    };

    fetchUserTeams();
  }, [user?.uid]);

  // Fetch tasks
  useEffect(() => {
    if (!user?.uid) return;

    let tasksQuery;
    
    if (filterTaskType === 'individual') {
      tasksQuery = query(
        collection(db, 'tasks'),
        where('createdBy', '==', user.uid),
        where('taskType', '==', 'individual')
      );
    } else if (filterTaskType === 'team') {
      const teamIds = userTeams.map(team => team.id);
      if (teamIds.length > 0) {
        tasksQuery = query(
          collection(db, 'tasks'),
          where('teamId', 'in', teamIds),
          where('taskType', '==', 'team')
        );
      }
    } else {
      // All tasks - individual tasks created by user + team tasks from user's teams
      const teamIds = userTeams.map(team => team.id);
      if (teamIds.length > 0) {
        tasksQuery = query(
          collection(db, 'tasks'),
          where('createdBy', '==', user.uid)
        );
        // Note: This is a simplified approach. For production, you might want to use multiple queries
      } else {
        tasksQuery = query(
          collection(db, 'tasks'),
          where('createdBy', '==', user.uid)
        );
      }
    }

    if (tasksQuery) {
      const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
        const taskData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Task[];
        setTasks(taskData);
      });
      return () => unsubscribe();
    }
  }, [user?.uid, filterTaskType, userTeams]);

  const filteredTasks = tasks
    .filter(task => filterCategory === 'All' || task.category === filterCategory)
    .filter(task => filterDueDate === 'All' || task.dueDate === filterDueDate)
    .filter(task => task.title.toLowerCase().includes(searchQuery.toLowerCase()));

  const toDoTasks = filteredTasks.filter(task => task.status === 'TO-DO').slice(0, visibleTasks);
  const inProgressTasks = filteredTasks.filter(task => task.status === 'IN-PROGRESS').slice(0, visibleTasks);
  const completedTasks = filteredTasks.filter(task => task.status === 'COMPLETED').slice(0, visibleTasks);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    const task = tasks.find(t => t.id === result.draggableId);
    if (!task || !task.id) return;

    const newStatus = destination.droppableId as 'TO-DO' | 'IN-PROGRESS' | 'COMPLETED';
    await updateDoc(doc(db, 'tasks', task.id), { status: newStatus });
  };

  const handleSelectTask = (task: Task) => {
    const taskId = task.id;
    if (!taskId) return;
    
    if (selectedTasks.includes(taskId)) {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId));
    } else {
      setSelectedTasks([...selectedTasks, taskId]);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    // Remove from selected tasks if it was selected
    setSelectedTasks(selectedTasks.filter(id => id !== taskId));
    // Refresh tasks after deletion
    // The onSnapshot listener will automatically update the UI
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
    <div className="relative min-h-screen bg-gray-100 overflow-hidden hidden sm:block">
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

        {/* Task Type Filter */}
        <div className="px-8 pt-4">
          <div className="flex items-center space-x-4 mb-4">
            <span className="text-sm font-medium text-gray-700">Task Type:</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setFilterTaskType('all')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  filterTaskType === 'all'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                All Tasks
              </button>
              <button
                onClick={() => setFilterTaskType('individual')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  filterTaskType === 'individual'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Individual
              </button>
              <button
                onClick={() => setFilterTaskType('team')}
                className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${
                  filterTaskType === 'team'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Team
              </button>
            </div>
          </div>
        </div>

        <div className="p-8">
          {showForm && (
            <div className="mb-4">
              <AddTaskForm
                taskToEdit={taskToEdit}
                onClose={() => {
                  setShowForm(false);
                  setTaskToEdit(null);
                }}
                userTeams={userTeams}
              />
            </div>
          )}

          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex space-x-4">
              {/* To-Do Column */}
              <Droppable droppableId="TO-DO">
                {(provided) => (
                  <div
                    className="w-1/3 p-4 bg-white rounded-lg"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    <h3 className="font-semibold text-lg mb-3 bg-[#FAC3FF] p-2 rounded-md text-center">
                      TO-DO ({toDoTasks.length})
                    </h3>
                    {toDoTasks.length === 0 ? (
                      <div className="p-4 bg-white rounded-md text-center text-gray-500">
                        No Tasks in To-Do
                      </div>
                    ) : (
                      toDoTasks.map((task, index) => (
                        <Draggable key={task.id || `task-${index}`} draggableId={task.id || `task-${index}`} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <TaskItem
                                task={task}
                                onEdit={(task) => {
                                  setTaskToEdit(task);
                                  setShowForm(true);
                                }}
                                onDelete={handleDeleteTask}
                                onSelect={handleSelectTask}
                                isSelected={selectedTasks.includes(task.id || '')}
                                showTaskType={true}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {toDoTasks.length < filteredTasks.filter(task => task.status === 'TO-DO').length && (
                      <button
                        onClick={handleLoadMore}
                        className="w-full p-2 text-center text-blue-500 hover:underline"
                      >
                        Load More
                      </button>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              {/* In-Progress Column */}
              <Droppable droppableId="IN-PROGRESS">
                {(provided) => (
                  <div
                    className="w-1/3 p-4 bg-white rounded-lg"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    <h3 className="font-semibold text-lg mb-3 bg-[#85D9F1] p-2 rounded-md text-center">
                      IN-PROGRESS ({inProgressTasks.length})
                    </h3>
                    {inProgressTasks.length === 0 ? (
                      <div className="p-4 bg-white rounded-md text-center text-gray-500">
                        No Tasks In-Progress
                      </div>
                    ) : (
                      inProgressTasks.map((task, index) => (
                        <Draggable key={task.id || `task-${index}`} draggableId={task.id || `task-${index}`} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <TaskItem
                                task={task}
                                onEdit={(task) => {
                                  setTaskToEdit(task);
                                  setShowForm(true);
                                }}
                                onDelete={handleDeleteTask}
                                onSelect={handleSelectTask}
                                isSelected={selectedTasks.includes(task.id || '')}
                                showTaskType={true}
                              />
                            </div>
                          )}
                        </Draggable>
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
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              {/* Completed Column */}
              <Droppable droppableId="COMPLETED">
                {(provided) => (
                  <div
                    className="w-1/3 p-4 bg-white rounded-lg"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    <h3 className="font-semibold text-lg mb-3 bg-[#CEFFCC] p-2 rounded-md text-center">
                      COMPLETED ({completedTasks.length})
                    </h3>
                    {completedTasks.length === 0 ? (
                      <div className="p-4 bg-white rounded-md text-center text-gray-500">
                        No Completed Tasks
                      </div>
                    ) : (
                      completedTasks.map((task, index) => (
                        <Draggable key={task.id || `task-${index}`} draggableId={task.id || `task-${index}`} index={index}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                            >
                              <TaskItem
                                task={task}
                                onEdit={(task) => {
                                  setTaskToEdit(task);
                                  setShowForm(true);
                                }}
                                onDelete={handleDeleteTask}
                                onSelect={handleSelectTask}
                                isSelected={selectedTasks.includes(task.id || '')}
                                showTaskType={true}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))
                    )}
                    {completedTasks.length < filteredTasks.filter(task => task.status === 'COMPLETED').length && (
                      <button
                        onClick={handleLoadMore}
                        className="w-full p-2 text-center text-blue-500 hover:underline"
                      >
                        Load More
                      </button>
                    )}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </DragDropContext>

          {selectedTasks.length > 0 && (
            <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 flex items-center space-x-4 bg-black text-white p-2 rounded-md">
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
                <option value="">Change Status</option>
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

export default Board;
