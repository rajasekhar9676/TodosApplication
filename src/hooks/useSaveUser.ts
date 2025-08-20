import { useEffect } from 'react';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db } from '../config'; // update to your Firebase config path

export const useSaveUser = (user: User | null) => {
  useEffect(() => {
    const saveUser = async () => {
      if (!user) return;

      const userRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(userRef);

      if (!docSnap.exists()) {
        await setDoc(userRef, {
          displayName: user.displayName || '',
          email: user.email || '',
          role: 'member',
          joinedTeams: []
        });
      }
    };

    saveUser();
  }, [user]);
};



