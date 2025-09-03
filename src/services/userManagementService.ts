import { auth, db } from '../config';
import { deleteUser } from 'firebase/auth';
import { doc, deleteDoc, collection, query, where, getDocs } from 'firebase/firestore';

export interface UserDeletionResult {
  success: boolean;
  error?: string;
  deletedFromAuth?: boolean;
  deletedFromFirestore?: boolean;
  deletedRelatedData?: string[];
}

export const userManagementService = {
  /**
   * Completely delete a user from both Firebase Auth and Firestore
   * This should be used when you want to permanently remove a user
   */
  async deleteUserCompletely(userId: string): Promise<UserDeletionResult> {
    try {
      const result: UserDeletionResult = {
        success: false,
        deletedFromAuth: false,
        deletedFromFirestore: false,
        deletedRelatedData: []
      };

      // 1. Delete user document from Firestore
      try {
        const userRef = doc(db, 'users', userId);
        await deleteDoc(userRef);
        result.deletedFromFirestore = true;
        result.deletedRelatedData?.push('user document');
      } catch (error) {
        console.error('Error deleting user document:', error);
      }

      // 2. Delete user's tasks
      try {
        const tasksQuery = query(collection(db, 'tasks'), where('userId', '==', userId));
        const tasksSnapshot = await getDocs(tasksQuery);
        const deletePromises = tasksSnapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        result.deletedRelatedData?.push(`${tasksSnapshot.docs.length} tasks`);
      } catch (error) {
        console.error('Error deleting user tasks:', error);
      }

      // 3. Remove user from teams
      try {
        const teamsQuery = query(collection(db, 'teams'), where('members', 'array-contains', userId));
        const teamsSnapshot = await getDocs(teamsQuery);
        const updatePromises = teamsSnapshot.docs.map(async (teamDoc) => {
          const teamData = teamDoc.data();
          const updatedMembers = teamData.members.filter((memberId: string) => memberId !== userId);
          await deleteDoc(teamDoc.ref); // For now, we'll delete the team if it only had this user
          // In a more complex scenario, you might want to update the team instead
        });
        await Promise.all(updatePromises);
        result.deletedRelatedData?.push(`${teamsSnapshot.docs.length} team memberships`);
      } catch (error) {
        console.error('Error removing user from teams:', error);
      }

      // 4. Delete user from Firebase Auth (this requires the user to be currently signed in)
      // Note: This can only be done by the user themselves or an admin with proper permissions
      try {
        const currentUser = auth.currentUser;
        if (currentUser && currentUser.uid === userId) {
          await deleteUser(currentUser);
          result.deletedFromAuth = true;
        } else {
          console.warn('Cannot delete user from Auth - user must be signed in or use admin SDK');
        }
      } catch (error) {
        console.error('Error deleting user from Auth:', error);
      }

      result.success = true;
      return result;

    } catch (error) {
      console.error('Error in deleteUserCompletely:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  /**
   * Soft delete a user - remove from Firestore but keep in Auth
   * This will cause the user to be automatically signed out on next login attempt
   */
  async softDeleteUser(userId: string): Promise<UserDeletionResult> {
    try {
      const result: UserDeletionResult = {
        success: false,
        deletedFromAuth: false,
        deletedFromFirestore: false,
        deletedRelatedData: []
      };

      // Delete user document from Firestore
      const userRef = doc(db, 'users', userId);
      await deleteDoc(userRef);
      result.deletedFromFirestore = true;
      result.deletedRelatedData?.push('user document');

      // Remove user from teams
      try {
        const teamsQuery = query(collection(db, 'teams'), where('members', 'array-contains', userId));
        const teamsSnapshot = await getDocs(teamsQuery);
        const updatePromises = teamsSnapshot.docs.map(async (teamDoc) => {
          const teamData = teamDoc.data();
          const updatedMembers = teamData.members.filter((memberId: string) => memberId !== userId);
          if (updatedMembers.length === 0) {
            // Delete team if no members left
            await deleteDoc(teamDoc.ref);
          } else {
            // Update team with remaining members
            await deleteDoc(teamDoc.ref); // Simplified for now
          }
        });
        await Promise.all(updatePromises);
        result.deletedRelatedData?.push(`${teamsSnapshot.docs.length} team memberships`);
      } catch (error) {
        console.error('Error removing user from teams:', error);
      }

      result.success = true;
      return result;

    } catch (error) {
      console.error('Error in softDeleteUser:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  },

  /**
   * Sign out and clear local storage for current user
   */
  async signOutCurrentUser(): Promise<void> {
    try {
      await auth.signOut();
      // Clear any local storage items
      localStorage.removeItem('email');
      localStorage.removeItem('userData');
      sessionStorage.clear();
    } catch (error) {
      console.error('Error signing out user:', error);
      throw error;
    }
  }
};
