import { useState } from 'react';
import { createTeam } from '../firebase/teamServices';
import { User } from 'firebase/auth';

interface Props {
  currentUser: User;
}

const CreateTeamForm = ({ currentUser }: Props) => {
  const [teamName, setTeamName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    await createTeam(teamName, currentUser);
    setTeamName('');
    alert('Team created!');
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white shadow-md rounded-xl">
      <input
        type="text"
        placeholder="Enter team name"
        value={teamName}
        onChange={(e) => setTeamName(e.target.value)}
        className="border p-2 rounded w-full mb-2"
      />
      <button
        type="submit"
        className="bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
      >
        Create Team
      </button>
    </form>
  );
};

export default CreateTeamForm;