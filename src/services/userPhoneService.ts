// User Phone Service - Automatically gets phone numbers from registration and Google login
// Just like Amazon - no manual verification needed!

import { db } from '../config';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';

interface UserPhoneData {
  phoneNumber?: string;
  phoneNumberVerified: boolean;
  phoneSource: 'registration' | 'google_login' | 'manual' | 'auto_detected';
  updatedAt: Date;
}

class UserPhoneService {
  
  // 🚀 Get phone number from user registration
  async getPhoneFromRegistration(userId: string, phoneNumber: string): Promise<boolean> {
    try {
      console.log(`📱 UserPhone: Setting phone from registration for user ${userId}: ${phoneNumber}`);
      
      await setDoc(doc(db, 'users', userId), {
        phoneNumber: phoneNumber,
        phoneNumberVerified: true, // Auto-verify for registration
        phoneSource: 'registration',
        updatedAt: new Date()
      }, { merge: true });
      
      console.log(`✅ UserPhone: Phone number set from registration for user ${userId}`);
      return true;
      
    } catch (error) {
      console.error(`❌ UserPhone: Error setting phone from registration for user ${userId}:`, error);
      return false;
    }
  }

  // 🚀 Get phone number from Google login (if available)
  async getPhoneFromGoogleLogin(user: User): Promise<boolean> {
    try {
      if (!user.phoneNumber) {
        console.log(`⚠️ UserPhone: No phone number in Google profile for user ${user.uid}`);
        return false;
      }

      console.log(`📱 UserPhone: Setting phone from Google login for user ${user.uid}: ${user.phoneNumber}`);
      
      await setDoc(doc(db, 'users', user.uid), {
        phoneNumber: user.phoneNumber,
        phoneNumberVerified: true, // Auto-verify for Google login
        phoneSource: 'google_login',
        updatedAt: new Date()
      }, { merge: true });
      
      console.log(`✅ UserPhone: Phone number set from Google login for user ${user.uid}`);
      return true;
      
    } catch (error) {
      console.error(`❌ UserPhone: Error setting phone from Google login for user ${user.uid}:`, error);
      return false;
    }
  }

  // 🔍 Get user's phone number (Amazon-style: auto-detect)
  async getUserPhoneNumber(userId: string): Promise<string | null> {
    try {
      const userDoc = await getDoc(doc(db, 'users', userId));
      
      if (!userDoc.exists()) {
        console.log(`⚠️ UserPhone: User ${userId} not found`);
        return null;
      }

      const userData = userDoc.data();
      
      // Amazon-style: Use any available phone number (no manual verification required)
      // Check both phoneNumber and phone fields for compatibility
      if (userData.phoneNumber) {
        console.log(`✅ UserPhone: Found phone number for user ${userId}: ${userData.phoneNumber}`);
        console.log(`📱 Source: ${userData.phoneSource || 'unknown'}`);
        return userData.phoneNumber;
      }
      
      // Fallback to phone field for backward compatibility
      if (userData.phone) {
        console.log(`✅ UserPhone: Found phone (legacy field) for user ${userId}: ${userData.phone}`);
        console.log(`📱 Source: legacy phone field`);
        return userData.phone;
      }
      
      console.log(`⚠️ UserPhone: User ${userId} has no phone number available`);
      return null;

    } catch (error) {
      console.error(`❌ UserPhone: Error getting phone number for user ${userId}:`, error);
      return null;
    }
  }

  // 🔍 Check if user has phone number configured
  async isUserPhoneReady(userId: string): Promise<boolean> {
    try {
      const phoneNumber = await this.getUserPhoneNumber(userId);
      return !!phoneNumber;
    } catch (error) {
      return false;
    }
  }

  // 📊 Get phone number statistics
  async getPhoneStats(): Promise<{
    totalUsers: number;
    usersWithPhone: number;
    usersWithoutPhone: number;
    percentageWithPhone: number;
  }> {
    try {
      // This would need to be implemented with proper Firestore queries
      // For now, returning mock data
      return {
        totalUsers: 0,
        usersWithPhone: 0,
        usersWithoutPhone: 0,
        percentageWithPhone: 0
      };
    } catch (error) {
      console.error('❌ UserPhone: Error getting phone stats:', error);
      return {
        totalUsers: 0,
        usersWithPhone: 0,
        usersWithoutPhone: 0,
        percentageWithPhone: 0
      };
    }
  }

  // 🔧 Update phone number manually (for admin use)
  async updatePhoneNumber(userId: string, phoneNumber: string, source: 'manual' | 'admin' = 'manual'): Promise<boolean> {
    try {
      console.log(`📱 UserPhone: Updating phone number for user ${userId}: ${phoneNumber}`);
      
      await updateDoc(doc(db, 'users', userId), {
        phoneNumber: phoneNumber,
        phoneNumberVerified: true,
        phoneSource: source,
        updatedAt: new Date()
      });
      
      console.log(`✅ UserPhone: Phone number updated for user ${userId}`);
      return true;
      
    } catch (error) {
      console.error(`❌ UserPhone: Error updating phone number for user ${userId}:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const userPhoneService = new UserPhoneService();
export default UserPhoneService;







