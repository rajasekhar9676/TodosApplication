import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword,
  updateProfile,
  UserCredential 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config';

export interface ManualUserData {
  name: string;
  email: string;
  phone: string;
  employeeId?: string;
  department?: string;
  position?: string;
  company?: string;
  address?: string;
  emergencyContact?: string;
  skills?: string[];
  bio?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResult {
  success: boolean;
  user?: any;
  error?: string;
}

class ManualAuthService {
  // Register new user with email/password
  async registerUser(userData: ManualUserData, password: string): Promise<AuthResult> {
    try {
      console.log('🔐 ManualAuth: Starting registration for:', userData.email);
      
      // Create user with Firebase Auth
      const userCredential: UserCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        password
      );
      
      const user = userCredential.user;
      console.log('🔐 ManualAuth: User created with UID:', user.uid);
      
      // Update profile with display name
      await updateProfile(user, {
        displayName: userData.name
      });
      
      // Create user document in Firestore
      const userDoc = {
        uid: user.uid,
        email: userData.email,
        displayName: userData.name,
        phone: userData.phone,
        employeeId: userData.employeeId || null,
        department: userData.department || null,
        position: userData.position || null,
        company: userData.company || null,
        address: userData.address || null,
        emergencyContact: userData.emergencyContact || null,
        skills: userData.skills || [],
        bio: userData.bio || null,
        authProvider: 'manual',
        createdAt: new Date(),
        updatedAt: new Date(),
        teams: [],
        joinedTeams: [],
        isActive: true,
        lastLogin: new Date(),
        preferences: {
          theme: 'light',
          notifications: {
            email: true,
            push: true,
            whatsapp: true
          },
          reminderSettings: {
            defaultReminderTime: 4, // hours before due date
            autoReminders: true
          }
        }
      };
      
      await setDoc(doc(db, 'users', user.uid), userDoc);
      console.log('🔐 ManualAuth: User document created in Firestore');
      
      return {
        success: true,
        user: {
          ...user,
          ...userDoc
        }
      };
      
    } catch (error: any) {
      console.error('❌ ManualAuth: Registration failed:', error);
      
      let errorMessage = 'Registration failed';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Email is already registered. Please use a different email or try logging in.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak. Please use at least 6 characters.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address. Please check your email format.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  // Login existing user
  async loginUser(credentials: LoginCredentials): Promise<AuthResult> {
    try {
      console.log('🔐 ManualAuth: Starting login for:', credentials.email);
      
      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );
      
      const user = userCredential.user;
      console.log('🔐 ManualAuth: Login successful for UID:', user.uid);
      
      // Get user document from Firestore
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        
        // Update last login
        await setDoc(userDocRef, {
          ...userData,
          lastLogin: new Date()
        }, { merge: true });
        
        return {
          success: true,
          user: {
            ...user,
            ...userData
          }
        };
      } else {
        console.warn('⚠️ ManualAuth: User document not found, creating basic one');
        
        // Create basic user document if it doesn't exist
        const basicUserDoc = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || 'User',
          authProvider: 'manual',
          createdAt: new Date(),
          updatedAt: new Date(),
          teams: [],
          joinedTeams: [],
          isActive: true,
          lastLogin: new Date()
        };
        
        await setDoc(userDocRef, basicUserDoc);
        
        return {
          success: true,
          user: {
            ...user,
            ...basicUserDoc
          }
        };
      }
      
    } catch (error: any) {
      console.error('❌ ManualAuth: Login failed:', error);
      
      let errorMessage = 'Login failed';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email. Please check your email or register.';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password. Please try again.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many failed attempts. Please try again later.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  // Check if user exists
  async checkUserExists(email: string): Promise<boolean> {
    try {
      // Try to sign in with a dummy password to check if user exists
      // This is a workaround since Firebase doesn't have a direct "user exists" check
      const userDocRef = doc(db, 'users', email);
      const userDocSnap = await getDoc(userDocRef);
      return userDocSnap.exists();
    } catch (error) {
      return false;
    }
  }
  
  // Update user profile
  async updateUserProfile(uid: string, updates: Partial<ManualUserData>): Promise<AuthResult> {
    try {
      const userDocRef = doc(db, 'users', uid);
      await setDoc(userDocRef, {
        ...updates,
        updatedAt: new Date()
      }, { merge: true });
      
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update profile'
      };
    }
  }
}

export const manualAuthService = new ManualAuthService();
export default manualAuthService;





















