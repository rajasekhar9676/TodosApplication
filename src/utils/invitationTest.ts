// Invitation Test Utility - For Debugging Only
// Remove this file in production

import { db } from '../config';
import { collection, addDoc, getDoc, doc, serverTimestamp } from 'firebase/firestore';

export const invitationTest = {
  // Create a test invitation
  async createTestInvitation(
    teamId: string,
    teamName: string,
    email: string,
    role: string,
    invitedBy: string,
    invitedByName: string
  ) {
    try {
      console.log('🧪 Creating test invitation...');
      
      const testInvitation = {
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

      const docRef = await addDoc(collection(db, 'invitations'), testInvitation);
      console.log('✅ Test invitation created with ID:', docRef.id);
      
      return { success: true, invitationId: docRef.id };
    } catch (error) {
      console.error('❌ Error creating test invitation:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Test retrieving an invitation
  async testRetrieveInvitation(invitationId: string) {
    try {
      console.log('🧪 Testing invitation retrieval for ID:', invitationId);
      
      const invitationRef = doc(db, 'invitations', invitationId);
      const invitationSnap = await getDoc(invitationRef);
      
      if (!invitationSnap.exists()) {
        console.log('❌ Test: Invitation not found');
        return { success: false, error: 'Invitation not found' };
      }

      const data = invitationSnap.data();
      console.log('✅ Test: Invitation found:', data);
      console.log('✅ Test: Invitation fields:', Object.keys(data));
      
      // Check required fields
      const requiredFields = ['teamId', 'teamName', 'email', 'role', 'status', 'invitedBy', 'invitedByName'];
      const missingFields = requiredFields.filter(field => !data[field]);
      
      if (missingFields.length > 0) {
        console.log('❌ Test: Missing required fields:', missingFields);
        return { success: false, error: `Missing fields: ${missingFields.join(', ')}` };
      }

      console.log('✅ Test: All required fields present');
      return { success: true, data };
    } catch (error) {
      console.error('❌ Test: Error retrieving invitation:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },

  // Test the complete invitation flow
  async testCompleteFlow(
    teamId: string,
    teamName: string,
    email: string,
    role: string,
    invitedBy: string,
    invitedByName: string
  ) {
    console.log('🧪 Testing complete invitation flow...');
    
    // Step 1: Create invitation
    const createResult = await this.createTestInvitation(
      teamId, teamName, email, role, invitedBy, invitedByName
    );
    
    if (!createResult.success) {
      return createResult;
    }

          const invitationId = createResult.invitationId;
      
      if (!invitationId) {
        return { success: false, error: 'Failed to get invitation ID' };
      }
      
      // Step 2: Test retrieval
      const retrieveResult = await this.testRetrieveInvitation(invitationId);
    
    if (!retrieveResult.success) {
      return retrieveResult;
    }

    console.log('✅ Test: Complete flow successful');
    return { success: true, invitationId, data: retrieveResult.data };
  }
};

// Usage example (uncomment to test):
/*
// Test invitation creation and retrieval
invitationTest.testCompleteFlow(
  'your-team-id',
  'Test Team',
  'test@email.com',
  'member',
  'your-user-id',
  'Your Name'
).then(result => {
  if (result.success) {
    console.log('Test successful:', result);
  } else {
    console.log('Test failed:', result.error);
  }
});
*/
