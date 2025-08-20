import { db } from '../config';
import { doc, getDoc, addDoc, updateDoc, collection, serverTimestamp } from 'firebase/firestore';
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

  async acceptInvitation(invitationId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🎯 Accepting invitation:', invitationId);

      // 1. Get invitation details
      const invitationRef = doc(db, 'invitations', invitationId);
      const invitationSnap = await getDoc(invitationRef);
      
      if (!invitationSnap.exists()) {
        throw new Error('Invitation not found');
      }

      const invitation = invitationSnap.data() as Invitation;
      
      if (invitation.status !== 'pending') {
        throw new Error('Invitation is no longer pending');
      }

      // 2. Update invitation status
      await updateDoc(invitationRef, { status: 'accepted' });

      // 3. Add user to team
      const teamRef = doc(db, 'teams', invitation.teamId);
      const teamSnap = await getDoc(teamRef);
      
      if (teamSnap.exists()) {
        const teamData = teamSnap.data();
        const currentMembers = teamData.members || [];
        
        // Check if user is already a member
        const isAlreadyMember = currentMembers.some((member: any) => member.uid === userId);
        
        if (!isAlreadyMember) {
          await updateDoc(teamRef, {
            members: [...currentMembers, {
              uid: userId,
              role: invitation.role,
              email: invitation.email,
            }]
          });
          console.log('✅ User added to team');
        }
      }

      // 4. Add team to user's teams array
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.data();
      const updatedTeams = [...(userData?.teams || []), invitation.teamId];
      await updateDoc(userRef, { teams: updatedTeams });   

      console.log('✅ Invitation accepted successfully');
      return { success: true };

    } catch (error) {
      console.error('❌ Error accepting invitation:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
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