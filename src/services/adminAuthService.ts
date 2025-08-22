import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth } from '../config';

// Hardcoded admin credentials
const ADMIN_EMAIL = 'mrajasekhar9676@gmail.com';
const ADMIN_PASSWORD = 'admin123';

// Temporary bypass for rate limiting issues
const ENABLE_FIREBASE_ADMIN_AUTH = true;

export interface AdminAuthResult {
  success: boolean;
  message: string;
  user?: any;
}

export class AdminAuthService {
  // Check if admin account exists, if not create it
  static async ensureAdminAccount(): Promise<void> {
    try {
      console.log('🔍 Checking if admin account exists...');
      // Try to sign in with admin credentials
      await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      console.log('✅ Admin account exists and is accessible');
    } catch (error: any) {
      console.log('⚠️ Admin account sign-in failed:', error.code);
      
      // Handle both user-not-found and invalid-credential errors
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        console.log('🔄 Admin account not found, creating...');
        try {
          // Create admin account
          const userCredential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
          
          // Update profile
          await updateProfile(userCredential.user, {
            displayName: 'Admin User',
            photoURL: null
          });
          
          console.log('✅ Admin account created successfully');
        } catch (createError: any) {
          // Handle email already in use error
          if (createError.code === 'auth/email-already-in-use') {
            console.log('✅ Admin account already exists, attempting to sign in...');
            try {
              await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
              console.log('✅ Admin account exists and is accessible');
            } catch (signInError: any) {
              console.error('❌ Error signing in to existing admin account:', signInError);
              throw signInError;
            }
          } else {
            console.error('❌ Error creating admin account:', createError);
            throw createError;
          }
        }
      } else {
        console.error('❌ Unexpected error ensuring admin account:', error);
        throw error;
      }
    }
  }

  // Admin login
  static async loginAdmin(email: string, password: string): Promise<AdminAuthResult> {
    try {
      // Check if credentials match admin
      if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
        console.log('🔑 Admin credentials valid');
        
        // If Firebase admin auth is disabled (due to rate limiting), use session-only auth
        if (!ENABLE_FIREBASE_ADMIN_AUTH) {
          console.log('🔄 Using session-only admin authentication (Firebase auth disabled)');
          
          // Set admin session
          sessionStorage.setItem('isAdmin', 'true');
          sessionStorage.setItem('adminEmail', email);
          
          console.log('✅ Admin session-only login successful');
          return {
            success: true,
            message: 'Admin login successful (session-only mode)',
            user: { email: email, displayName: 'Admin User', uid: 'admin-session' }
          };
        }
        
        console.log('🔑 Attempting Firebase login...');
        
        try {
          // Sign in with Firebase
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          
          // Set admin session
          sessionStorage.setItem('isAdmin', 'true');
          sessionStorage.setItem('adminEmail', email);
          
          console.log('✅ Admin login successful');
          return {
            success: true,
            message: 'Admin login successful',
            user: userCredential.user
          };
        } catch (firebaseError: any) {
          console.log('⚠️ Firebase login failed:', firebaseError.code);
          
          // Handle too many requests error
          if (firebaseError.code === 'auth/too-many-requests') {
            console.log('🔄 Rate limit hit, switching to session-only mode...');
            // Switch to session-only mode temporarily
            sessionStorage.setItem('isAdmin', 'true');
            sessionStorage.setItem('adminEmail', email);
            sessionStorage.setItem('adminMode', 'session-only');
            
            return {
              success: true,
              message: 'Admin login successful (session-only mode due to rate limiting)',
              user: { email: email, displayName: 'Admin User', uid: 'admin-session' }
            };
          }
          
          // If login fails due to missing account, try to create it
          if (firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/invalid-credential') {
            try {
              console.log('🔄 Creating admin account...');
              const userCredential = await createUserWithEmailAndPassword(auth, email, password);
              
              // Update profile
              await updateProfile(userCredential.user, {
                displayName: 'Admin User',
                photoURL: null
              });
              
              // Set admin session
              sessionStorage.setItem('isAdmin', 'true');
              sessionStorage.setItem('adminEmail', email);
              sessionStorage.setItem('adminMode', 'firebase');
              
              console.log('✅ Admin account created and login successful');
              return {
                success: true,
                message: 'Admin account created and login successful',
                user: userCredential.user
              };
            } catch (createError: any) {
              console.error('❌ Failed to create admin account:', createError);
              
              // Handle too many requests during account creation
              if (createError.code === 'auth/too-many-requests') {
                console.log('🔄 Rate limit hit during account creation, switching to session-only mode...');
                sessionStorage.setItem('isAdmin', 'true');
                sessionStorage.setItem('adminEmail', email);
                sessionStorage.setItem('adminMode', 'session-only');
                
                return {
                  success: true,
                  message: 'Admin login successful (session-only mode due to rate limiting)',
                  user: { email: email, displayName: 'Admin User', uid: 'admin-session' }
                };
              }
              
              return {
                success: false,
                message: `Failed to create admin account: ${createError.message}`
              };
            }
          } else {
            return {
              success: false,
              message: `Firebase authentication failed: ${firebaseError.message}`
            };
          }
        }
      } else {
        return {
          success: false,
          message: 'Invalid admin credentials'
        };
      }
    } catch (error: any) {
      console.error('❌ Admin login error:', error);
      return {
        success: false,
        message: error.message || 'Admin login failed'
      };
    }
  }

  // Check if current user is admin
  static isAdmin(): boolean {
    const isAdmin = sessionStorage.getItem('isAdmin');
    const adminEmail = sessionStorage.getItem('adminEmail');
    return isAdmin === 'true' && adminEmail === ADMIN_EMAIL;
  }

  // Admin logout
  static logoutAdmin(): void {
    sessionStorage.removeItem('isAdmin');
    sessionStorage.removeItem('adminEmail');
  }
}
