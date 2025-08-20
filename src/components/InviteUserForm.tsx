import { useState } from 'react';
import { sendInvite } from '../firebase/teamServices';

interface Props {
  teamId: string;
}

const InviteUserForm = ({ teamId }: Props) => {
  const [email, setEmail] = useState('');

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    await sendInvite(teamId, email);
    setEmail('');
    alert('Invitation sent!');
  };

  return (
    <form onSubmit={handleInvite} className="p-4 bg-white shadow-md rounded-xl mt-4">
      <input
        type="email"
        placeholder="Invite by email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border p-2 rounded w-full mb-2"
      />
      <button
        type="submit"
        className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
      >
        Send Invite
      </button>
    </form>
  );
};

export default InviteUserForm;
