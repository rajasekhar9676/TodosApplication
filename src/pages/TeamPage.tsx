import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../config';

interface Task {
  id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'done';
}

const TeamPage = () => {
  const { teamId } = useParams();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (!teamId) return;
    const q = query(collection(db, 'teams', teamId, 'tasks'), orderBy('title'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() } as Task));
      setTasks(data);
    });
    return () => unsub();
  }, [teamId]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !teamId) return;
    await addDoc(collection(db, 'teams', teamId, 'tasks'), {
      title,
      description,
      status: 'todo'
    });
    setTitle('');
    setDescription('');
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Team Tasks</h1>

      <form onSubmit={handleAddTask} className="mb-4 bg-white p-4 shadow-md rounded-xl">
        <input
          type="text"
          placeholder="Task title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="border p-2 rounded w-full mb-2"
        />
        <textarea
          placeholder="Task description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="border p-2 rounded w-full mb-2"
        />
        <button
          type="submit"
          className="bg-purple-600 text-white py-2 px-4 rounded hover:bg-purple-700"
        >
          Add Task
        </button>
      </form>

      <div className="grid gap-2">
        {tasks.map((task) => (
          <div key={task.id} className="border p-4 bg-gray-100 rounded-xl">
            <h2 className="font-semibold text-lg">{task.title}</h2>
            <p>{task.description}</p>
            <p className="text-sm text-gray-600">Status: {task.status}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeamPage;
