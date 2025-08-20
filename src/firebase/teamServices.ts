import { db } from '../config';
import {
  doc,
  setDoc,
  collection,
  updateDoc,
  arrayUnion,
  serverTimestamp
} from 'firebase/firestore';
import { User } from 'firebase/auth';

// Create a new team and update the user's joinedTeams
export const createTeam = async (teamName: string, currentUser: User) => {
  const teamRef = doc(collection(db, 'teams'));
  await setDoc(teamRef, {
    name: teamName,
    createdBy: currentUser.uid,
    members: [currentUser.uid],
    invitations: [],
    createdAt: new Date()
  });

  const userRef = doc(db, 'users', currentUser.uid);
  await updateDoc(userRef, {
    joinedTeams: arrayUnion(teamRef.id)
  });
};

// 🔧 Add this: Invite a user by email to a team
export const sendInvite = async (teamId: string, email: string) => {
  const teamRef = doc(db, 'teams', teamId);
  await updateDoc(teamRef, {
    invitations: arrayUnion(email)
  });
};
