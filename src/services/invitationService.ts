import { db } from '../config';
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp, setDoc } from 'firebase/firestore';
import { gmailService } from './gmailService';

export interface Invitation {
  id: string;
  teamId: string;
  teamName: string;
  email: string;
  role: string;
  status: 'pending' | 'accepted' | 'declined';
  invitedBy: string;
  invitedByName: string;
  createdAt: any;
  expiresAt: Date;
}

export const invitationService = {
  async sendInvitation(
    teamId: string,
    teamName: string,
    email: string,
    role: string,
    invitedBy: string,
    invitedByName: string
  ): Promise<{ success: boolean; invitationId?: string; error?: string }> {
    try {
      console.log('📧 Starting invitation process...');
      console.log('📧 Team:', teamName);
      console.log('📧 Email:', email);
      console.log('📧 Role:', role);

      // 1. Store invitation in Firestore
      const invitationData = {
        teamId,
        teamName,
        email: email.trim(),
        role,
        status: 'pending',
        invitedBy,
        invitedByName,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      };

      const invitationRef = await addDoc(collection(db, 'invitations'), invitationData);
      console.log('✅ Invitation stored in Firestore:', invitationRef.id);

      // 2. Update team's invitations array
      const teamRef = doc(db, 'teams', teamId);
      const teamSnap = await getDoc(teamRef);
      
      if (teamSnap.exists()) {
        const teamData = teamSnap.data();
        const currentInvitations = teamData.invitations || [];
        
        await updateDoc(teamRef, {
          invitations: [...currentInvitations, {
            id: invitationRef.id,
            email: email.trim(),
            role,
            status: 'pending',
            createdAt: new Date(),
          }]
        });
        console.log('✅ Team invitations array updated');
      }

      // 3. Send email via Gmail API
      console.log('📧 Sending email via Gmail API...');
      const emailSuccess = await gmailService.sendInvitationEmail(
        email.trim(),
        teamName,
        invitedByName,
        role,
        invitationRef.id
      );

      if (emailSuccess) {
        console.log('✅ Email sent successfully');
        console.log('✅ Invitation process completed successfully');
        return { success: true, invitationId: invitationRef.id };
      } else {
        console.error('❌ Failed to send email');
        return { success: false, error: 'Failed to send email' };
      }

    } catch (error) {
      console.error('❌ Error in invitation process:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  async acceptInvitation(invitationId: string, userId: string): Promise<{ success: boolean; error?: string; teamId?: string; teamName?: string }> {
    try {
      console.log('🎯 Accepting invitation:', invitationId);
      console.log('🎯 User ID:', userId);

      // 1. Get invitation details
      const invitationRef = doc(db, 'invitations', invitationId);
      console.log('🎯 Fetching invitation from:', `invitations/${invitationId}`);
      
      const invitationSnap = await getDoc(invitationRef);
      
      if (!invitationSnap.exists()) {
        console.error('❌ Invitation not found:', invitationId);
        throw new Error('Invitation not found');
      }

      const invitation = invitationSnap.data() as Invitation;
      console.log('🎯 Invitation data:', invitation);
      
      // Validate invitation data
      if (!invitation.teamId || !invitation.teamName || !invitation.email) {
        console.error('❌ Invalid invitation data:', invitation);
        throw new Error('Invalid invitation data');
      }
      
      if (invitation.status !== 'pending') {
        console.error('❌ Invitation status is not pending:', invitation.status);
        throw new Error('Invitation is no longer pending');
      }

      // 2. Update invitation status
      console.log('🎯 Step 2: Updating invitation status to accepted...');
      try {
        await updateDoc(invitationRef, { 
          status: 'accepted',
          acceptedAt: serverTimestamp(),
          acceptedBy: userId
        });
        console.log('✅ Invitation status updated successfully');
      } catch (error) {
        console.error('❌ Failed to update invitation status:', error);
        throw new Error(`Failed to update invitation status: ${error}`);
      }

      // 3. Add user to team
      console.log('🎯 Step 3: Adding user to team:', invitation.teamId);
      const teamRef = doc(db, 'teams', invitation.teamId);
      const teamSnap = await getDoc(teamRef);
      
      if (!teamSnap.exists()) {
        console.error('❌ Team not found:', invitation.teamId);
        throw new Error('Team not found');
      }

      const teamData = teamSnap.data();
      const currentMembers = teamData.members || [];
      console.log('🎯 Current team members:', currentMembers.length);
      
      // Check if user is already a member
      const isAlreadyMember = currentMembers.some((member: any) => member.uid === userId);
      
      if (!isAlreadyMember) {
        const newMember = {
          uid: userId,
          role: invitation.role as 'admin' | 'member',
          email: invitation.email,
          displayName: invitation.invitedByName, // Store the inviter's name as display name
          joinedAt: new Date(),
          invitedBy: invitation.invitedBy
        };
        
        console.log('🎯 Adding new member to team:', newMember);
        
        try {
          await updateDoc(teamRef, {
            members: [...currentMembers, newMember]
          });
          console.log('✅ User added to team successfully');
        } catch (error) {
          console.error('❌ Failed to add user to team:', error);
          throw new Error(`Failed to add user to team: ${error}`);
        }
      } else {
        console.log('ℹ️ User is already a team member');
      }

      // 4. Add team to user's teams array (with migration support)
      console.log('🎯 Step 4: Adding team to user profile');
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      
      if (userSnap.exists()) {
        const userData = userSnap.data();
        console.log('🎯 Current user data:', userData);
        
        // Migrate existing user document if needed
        let currentTeams = userData?.teams || [];
        const joinedTeams = userData?.joinedTeams || [];
        
        console.log('🎯 Current teams array:', currentTeams);
        console.log('🎯 Current joinedTeams array:', joinedTeams);
        
        // If user has joinedTeams but no teams field, migrate the data
        if (joinedTeams.length > 0 && (!userData.teams || userData.teams.length === 0)) {
          console.log('🔄 Migrating user document: moving teams from joinedTeams to teams field');
          currentTeams = [...joinedTeams];
          
          // Update the document to use the teams field and remove joinedTeams
          await updateDoc(userRef, {
            teams: currentTeams,
            joinedTeams: [], // Clear the old field
            lastUpdated: serverTimestamp()
          });
          console.log('✅ User document migrated successfully');
        }
        
        // Add the new team
        const updatedTeams = [...currentTeams, invitation.teamId];
        console.log('🎯 Updated teams array:', updatedTeams);
        
        try {
          await updateDoc(userRef, { 
            teams: updatedTeams,
            lastUpdated: serverTimestamp()
          });
          console.log('✅ Team added to user profile successfully');
        } catch (error) {
          console.error('❌ Failed to add team to user profile:', error);
          throw new Error(`Failed to add team to user profile: ${error}`);
        }
      } else {
        // Create user document if it doesn't exist
        console.log('🎯 Creating new user document with team');
        try {
          await setDoc(userRef, {
            uid: userId,
            email: invitation.email,
            teams: [invitation.teamId],
            createdAt: serverTimestamp(),
            lastUpdated: serverTimestamp()
          });
          console.log('✅ User document created successfully');
        } catch (error) {
          console.error('❌ Failed to create user document:', error);
          throw new Error(`Failed to create user document: ${error}`);
        }
      }

      console.log('✅ Invitation accepted successfully');
      return { 
        success: true, 
        teamId: invitation.teamId, 
        teamName: invitation.teamName 
      };

    } catch (error) {
      console.error('❌ Error accepting invitation:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('permission-denied')) {
          return { success: false, error: 'Permission denied. Please check if you are logged in with the correct email.' };
        } else if (error.message.includes('not-found')) {
          return { success: false, error: 'Invitation or team not found. The invitation may have expired.' };
        } else {
          return { success: false, error: error.message };
        }
      }
      
      return { success: false, error: 'Failed to accept invitation. Please try again.' };
    }
  },

  async declineInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('❌ Declining invitation:', invitationId);

      const invitationRef = doc(db, 'invitations', invitationId);
      await updateDoc(invitationRef, { status: 'declined' });

      console.log('✅ Invitation declined successfully');
      return { success: true };

    } catch (error) {
      console.error('❌ Error declining invitation:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}; 