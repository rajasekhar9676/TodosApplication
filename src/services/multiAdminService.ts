import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, updatePassword, sendPasswordResetEmail, deleteUser } from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config';

export interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  role: 'super_admin' | 'admin' | 'moderator';
  permissions: string[];
  isActive: boolean;
  createdAt: any;
  lastLogin: any;
  phoneNumber?: string;
  department?: string;
  canCreateUsers: boolean;
  canDeleteUsers: boolean;
  canManageTeams: boolean;
  canManageTasks: boolean;
  canViewAnalytics: boolean;
}

export interface AdminAuthResult {
  success: boolean;
  message: string;
  user?: AdminUser;
}

export class MultiAdminService {
  private static initializationPromise: Promise<void> | null = null;
  
  // Default admin accounts that will be created if they don't exist
  private static readonly DEFAULT_ADMINS = [
    {
      email: 'anilsharma@educationtoday.co',
      password: 'Anilsharma@1234',
      displayName: 'Super Admin Anil Sharma',
      role: 'super_admin' as const,
      permissions: ['all'],
      canCreateUsers: true,
      canDeleteUsers: true,
      canManageTeams: true,
      canManageTasks: true,
      canViewAnalytics: true
    },
    {
      email: 'accounts@educationtoday.co',
      password: 'Accounts@2025',
      displayName: 'Admin Accounts',
      role: 'admin' as const,
      permissions: ['manage_users', 'manage_teams', 'manage_tasks', 'view_analytics'],
      canCreateUsers: true,
      canDeleteUsers: false,
      canManageTeams: true,
      canManageTasks: true,
      canViewAnalytics: true
    },
    {
      email: 'sales@educationtoday.co',
      password: 'Sales@2025',
      displayName: 'Moderator Sales',
      role: 'moderator' as const,
      permissions: ['manage_teams', 'manage_tasks'],
      canCreateUsers: false,
      canDeleteUsers: false,
      canManageTeams: true,
      canManageTasks: true,
      canViewAnalytics: false
    }
  ];

  // Ensure admin accounts are initialized
  static async ensureInitialized(): Promise<void> {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }
    
    this.initializationPromise = this.initializeDefaultAdmins();
    return this.initializationPromise;
  }

  // Initialize default admin accounts
  static async initializeDefaultAdmins(): Promise<void> {
    try {
      console.log('🚀 Initializing admin system...');
      console.log('📋 Admin accounts will be created on first login attempt');
      console.log('✅ Admin system initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing admin system:', error);
      // Don't throw error - this is expected
    }
  }

  // Create individual admin account
  private static async createAdminAccount(adminData: any): Promise<void> {
    try {
      console.log(`🔄 Creating admin account: ${adminData.email}`);
      console.log(`📧 Email: ${adminData.email}`);
      console.log(`🔑 Password length: ${adminData.password.length}`);
      console.log(`👤 Display name: ${adminData.displayName}`);
      
      // Create Firebase Auth user first
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        adminData.email, 
        adminData.password
      );
      
      console.log(`✅ Firebase Auth user created: ${userCredential.user.uid}`);
      
      // Update profile with display name
      await updateProfile(userCredential.user, {
        displayName: adminData.displayName
      });
      
      console.log(`✅ Profile updated with display name: ${adminData.displayName}`);
      
      // Now create admin document in Firestore (user is now authenticated)
      const adminDocRef = doc(db, 'admins', adminData.email);
      const adminUser: AdminUser = {
        uid: userCredential.user.uid,
        email: adminData.email,
        displayName: adminData.displayName,
        role: adminData.role,
        permissions: adminData.permissions,
        isActive: true,
        createdAt: serverTimestamp(),
        lastLogin: null,
        canCreateUsers: adminData.canCreateUsers,
        canDeleteUsers: adminData.canDeleteUsers,
        canManageTeams: adminData.canManageTeams,
        canManageTasks: adminData.canManageTasks,
        canViewAnalytics: adminData.canViewAnalytics
      };
      
      await setDoc(adminDocRef, adminUser);
      console.log(`✅ Admin document created in Firestore: ${adminData.email} (${adminData.role})`);
      
      // Sign out the user after creating the account
      await signOut(auth);
      console.log(`✅ Signed out after creating admin account: ${adminData.email}`);
      
    } catch (error: any) {
      console.error(`❌ Detailed error creating admin account ${adminData.email}:`, {
        code: error.code,
        message: error.message,
        email: adminData.email,
        passwordLength: adminData.password.length,
        displayName: adminData.displayName
      });
      
      if (error.code === 'auth/email-already-in-use') {
        console.log(`ℹ️ Admin account already exists in Firebase Auth: ${adminData.email}`);
        return; // Don't throw error for existing accounts
      } else if (error.code === 'auth/weak-password') {
        console.error(`❌ Password too weak for ${adminData.email}`);
        throw new Error(`Password does not meet Firebase requirements for ${adminData.email}`);
      } else if (error.code === 'auth/invalid-email') {
        console.error(`❌ Invalid email format: ${adminData.email}`);
        throw new Error(`Invalid email format: ${adminData.email}`);
      } else if (error.code === 'auth/operation-not-allowed') {
        console.error(`❌ Email/password accounts not enabled in Firebase Console`);
        throw new Error(`Email/password authentication not enabled. Please enable it in Firebase Console.`);
      } else if (error.code === 'permission-denied') {
        console.error(`❌ Firestore permission denied for ${adminData.email}`);
        throw new Error(`Firestore permission denied. This might be due to security rules or authentication issues.`);
      } else {
        console.error(`❌ Unexpected error: ${error.code} - ${error.message}`);
        throw error; // Re-throw to allow retry
      }
    }
  }

  // Admin accounts are created during initialization

  // Admin login with multi-admin support
  static async loginAdmin(email: string, password: string): Promise<AdminAuthResult> {
    try {
      console.log(`🔑 Attempting admin login for: ${email}`);
      
      // Ensure admin accounts are initialized first
      await this.ensureInitialized();
      
      // First, try to sign in with Firebase Auth to verify credentials
      let userCredential;
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log(`✅ Firebase Auth successful for: ${email}`);
      } catch (firebaseError: any) {
        console.error('❌ Firebase authentication failed:', firebaseError);
        
        // If account doesn't exist, try to create it
        if (firebaseError.code === 'auth/user-not-found') {
          console.log(`🔄 Account not found, attempting to create: ${email}`);
          const adminData = this.DEFAULT_ADMINS.find(admin => admin.email === email);
          if (adminData) {
            try {
              await this.createAdminAccount(adminData);
              // Try login again
              userCredential = await signInWithEmailAndPassword(auth, email, password);
              console.log(`✅ Admin account created and login successful: ${email}`);
            } catch (createError: any) {
              console.error('❌ Failed to create admin account:', createError);
              return {
                success: false,
                message: `Failed to create admin account: ${createError.message}`
              };
            }
          } else {
            return {
              success: false,
              message: `Email not found in admin system: ${firebaseError.message}`
            };
          }
        } else if (firebaseError.code === 'auth/invalid-credential') {
          console.log(`⚠️ Invalid credentials for existing account: ${email}`);
          const adminData = this.DEFAULT_ADMINS.find(admin => admin.email === email);
          if (adminData) {
            return {
              success: false,
              message: `Account exists but password is incorrect. Please use the "🔄 Reset Admin Passwords" button to reset your password, or use "🗑️ Force Recreate Accounts" to delete and recreate the account.`
            };
          } else {
            return {
              success: false,
              message: `Invalid email or password: ${firebaseError.message}`
            };
          }
        } else {
          return {
            success: false,
            message: `Login failed: ${firebaseError.message}`
          };
        }
      }
      
      // Now check if admin document exists in Firestore
      const adminDocRef = doc(db, 'admins', email);
      let adminDoc = await getDoc(adminDocRef);
      
      if (!adminDoc.exists()) {
        console.log(`🔄 Admin document not found, creating for: ${email}`);
        
        // Find the admin data from our default admins
        const adminData = this.DEFAULT_ADMINS.find(admin => admin.email === email);
        
        if (!adminData) {
          return {
            success: false,
            message: 'Email not found in admin system'
          };
        }
        
        // Create admin document in Firestore
        const adminUser: AdminUser = {
          uid: userCredential.user.uid,
          email: adminData.email,
          displayName: adminData.displayName,
          role: adminData.role,
          permissions: adminData.permissions,
          isActive: true,
          createdAt: serverTimestamp(),
          lastLogin: serverTimestamp(),
          canCreateUsers: adminData.canCreateUsers,
          canDeleteUsers: adminData.canDeleteUsers,
          canManageTeams: adminData.canManageTeams,
          canManageTasks: adminData.canManageTasks,
          canViewAnalytics: adminData.canViewAnalytics
        };
        
        try {
          await setDoc(adminDocRef, adminUser);
          console.log(`✅ Admin document created for: ${email}`);
          adminDoc = await getDoc(adminDocRef); // Refresh the document
        } catch (firestoreError: any) {
          console.warn(`⚠️ Could not create admin document in Firestore: ${firestoreError.message}`);
          console.log(`💡 Continuing with session-only admin mode`);
          
          // Set admin session (session-only mode)
          sessionStorage.setItem('isAdmin', 'true');
          sessionStorage.setItem('adminEmail', email);
          sessionStorage.setItem('adminRole', adminData.role);
          sessionStorage.setItem('adminPermissions', JSON.stringify(adminData.permissions));
          sessionStorage.setItem('adminUID', userCredential.user.uid);
          sessionStorage.setItem('adminMode', 'session-only');
          
          return {
            success: true,
            message: `Welcome, ${adminData.displayName}! (Session-only mode - Firestore access limited)`,
            user: adminUser
          };
        }
      }
      
      const adminData = adminDoc.data() as AdminUser;
      
      if (!adminData.isActive) {
        return {
          success: false,
          message: 'Admin account is deactivated'
        };
      }
      
      // Update last login
      try {
        await updateDoc(adminDocRef, {
          lastLogin: serverTimestamp()
        });
      } catch (error) {
        console.warn('⚠️ Could not update last login timestamp:', error);
      }
      
      // Set admin session
      sessionStorage.setItem('isAdmin', 'true');
      sessionStorage.setItem('adminEmail', email);
      sessionStorage.setItem('adminRole', adminData.role);
      sessionStorage.setItem('adminPermissions', JSON.stringify(adminData.permissions));
      sessionStorage.setItem('adminUID', adminData.uid);
      
      console.log(`✅ Admin login successful: ${email} (${adminData.role})`);
      
      return {
        success: true,
        message: `Welcome, ${adminData.displayName}!`,
        user: adminData
      };
      
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
    return isAdmin === 'true' && !!adminEmail;
  }

  // Get current admin user data
  static getCurrentAdmin(): AdminUser | null {
    if (!this.isAdmin()) return null;
    
    const adminEmail = sessionStorage.getItem('adminEmail');
    const adminRole = sessionStorage.getItem('adminRole');
    const adminPermissions = sessionStorage.getItem('adminPermissions');
    const adminUID = sessionStorage.getItem('adminUID');
    
    if (!adminEmail || !adminRole || !adminPermissions || !adminUID) return null;
    
    return {
      uid: adminUID,
      email: adminEmail,
      displayName: adminEmail.split('@')[0], // Fallback display name
      role: adminRole as any,
      permissions: JSON.parse(adminPermissions),
      isActive: true,
      createdAt: null,
      lastLogin: null,
      canCreateUsers: adminRole === 'super_admin' || adminRole === 'admin',
      canDeleteUsers: adminRole === 'super_admin',
      canManageTeams: true,
      canManageTasks: true,
      canViewAnalytics: adminRole === 'super_admin' || adminRole === 'admin'
    };
  }

  // Check if current admin has specific permission
  static hasPermission(permission: string): boolean {
    const admin = this.getCurrentAdmin();
    if (!admin) return false;
    
    return admin.permissions.includes('all') || admin.permissions.includes(permission);
  }

  // Check if current admin can perform specific action
  static canPerformAction(action: 'createUsers' | 'deleteUsers' | 'manageTeams' | 'manageTasks' | 'viewAnalytics'): boolean {
    const admin = this.getCurrentAdmin();
    if (!admin) return false;
    
    switch (action) {
      case 'createUsers':
        return admin.canCreateUsers;
      case 'deleteUsers':
        return admin.canDeleteUsers;
      case 'manageTeams':
        return admin.canManageTeams;
      case 'manageTasks':
        return admin.canManageTasks;
      case 'viewAnalytics':
        return admin.canViewAnalytics;
      default:
        return false;
    }
  }

  // Get all admin users (for super admin only)
  static async getAllAdmins(): Promise<AdminUser[]> {
    try {
      if (!this.canPerformAction('createUsers')) {
        throw new Error('Insufficient permissions to view admin list');
      }
      
      const adminsRef = collection(db, 'admins');
      const snapshot = await getDocs(adminsRef);
      
      const admins: AdminUser[] = [];
      snapshot.forEach(doc => {
        admins.push(doc.data() as AdminUser);
      });
      
      return admins;
    } catch (error) {
      console.error('❌ Error fetching admin list:', error);
      throw error;
    }
  }

  // Create new admin user (for super admin only)
  static async createAdmin(adminData: Omit<AdminUser, 'uid' | 'createdAt' | 'lastLogin'>): Promise<AdminUser> {
    try {
      if (!this.canPerformAction('createUsers')) {
        throw new Error('Insufficient permissions to create admin users');
      }
      
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        adminData.email, 
        'tempPassword123' // Temporary password, admin should change it
      );
      
      // Update profile
      await updateProfile(userCredential.user, {
        displayName: adminData.displayName,
        photoURL: null
      });
      
      // Create admin document
      const newAdmin: AdminUser = {
        ...adminData,
        uid: userCredential.user.uid,
        createdAt: serverTimestamp(),
        lastLogin: serverTimestamp()
      };
      
      await setDoc(doc(db, 'admins', adminData.email), newAdmin);
      
      console.log(`✅ New admin created: ${adminData.email}`);
      return newAdmin;
      
    } catch (error) {
      console.error('❌ Error creating admin:', error);
      throw error;
    }
  }

  // Check Firebase Auth configuration
  static async checkFirebaseAuthConfig(): Promise<{ enabled: boolean; error?: string }> {
    try {
      console.log('🔍 Checking Firebase Auth configuration...');
      
      // Try to create a test account to see if email/password auth is enabled
      const testEmail = `test-${Date.now()}@example.com`;
      const testPassword = 'TestPassword123!';
      
      try {
        const testCredential = await createUserWithEmailAndPassword(auth, testEmail, testPassword);
        // If successful, delete the test account
        await testCredential.user.delete();
        console.log('✅ Firebase Auth email/password is enabled');
        return { enabled: true };
      } catch (error: any) {
        if (error.code === 'auth/operation-not-allowed') {
          console.error('❌ Email/password authentication not enabled in Firebase Console');
          return { 
            enabled: false, 
            error: 'Email/password authentication is not enabled. Please enable it in Firebase Console > Authentication > Sign-in method > Email/Password.' 
          };
        } else if (error.code === 'auth/weak-password') {
          console.log('✅ Firebase Auth email/password is enabled (password requirements are strict)');
          return { enabled: true };
        } else {
          console.error('❌ Firebase Auth configuration check failed:', error);
          return { 
            enabled: false, 
            error: `Firebase Auth configuration issue: ${error.message}` 
          };
        }
      }
    } catch (error: any) {
      console.error('❌ Error checking Firebase Auth configuration:', error);
      return { 
        enabled: false, 
        error: `Failed to check Firebase Auth configuration: ${error.message}` 
      };
    }
  }

  // Handle existing admin account (update password and create Firestore document)
  private static async handleExistingAdminAccount(adminData: any): Promise<void> {
    console.log(`🔄 Handling existing admin account: ${adminData.email}`);
    
    try {
      // Try to sign in with the current password
      const userCredential = await signInWithEmailAndPassword(auth, adminData.email, adminData.password);
      console.log(`✅ Successfully signed in with existing password: ${adminData.email}`);
      
      // Update profile if needed
      if (userCredential.user.displayName !== adminData.displayName) {
        await updateProfile(userCredential.user, {
          displayName: adminData.displayName
        });
        console.log(`✅ Updated display name: ${adminData.displayName}`);
      }
      
      // Create or update Firestore document
      const adminDocRef = doc(db, 'admins', adminData.email);
      const adminDoc = await getDoc(adminDocRef);
      
      if (!adminDoc.exists()) {
        console.log(`🔄 Creating Firestore document for existing auth user: ${adminData.email}`);
        const adminUser: AdminUser = {
          uid: userCredential.user.uid,
          email: adminData.email,
          displayName: adminData.displayName,
          role: adminData.role,
          permissions: adminData.permissions,
          isActive: true,
          createdAt: serverTimestamp(),
          lastLogin: null,
          canCreateUsers: adminData.canCreateUsers,
          canDeleteUsers: adminData.canDeleteUsers,
          canManageTeams: adminData.canManageTeams,
          canManageTasks: adminData.canManageTasks,
          canViewAnalytics: adminData.canViewAnalytics
        };
        await setDoc(adminDocRef, adminUser);
        console.log(`✅ Firestore document created: ${adminData.email}`);
      } else {
        console.log(`ℹ️ Firestore document already exists: ${adminData.email}`);
      }
      
      await signOut(auth);
      console.log(`✅ Successfully handled existing account: ${adminData.email}`);
      
    } catch (signInError: any) {
      if (signInError.code === 'auth/invalid-credential' || signInError.code === 'auth/wrong-password') {
        console.log(`⚠️ Password mismatch for existing account: ${adminData.email}`);
        console.log(`💡 Sending password reset email to: ${adminData.email}`);
        
        try {
          // Send password reset email
          await sendPasswordResetEmail(auth, adminData.email);
          console.log(`✅ Password reset email sent to: ${adminData.email}`);
          throw new Error(`Password reset email sent to ${adminData.email}. Please check your email and reset the password, then try again.`);
        } catch (resetError: any) {
          console.error(`❌ Failed to send password reset email:`, resetError);
          throw new Error(`Account exists but password is incorrect. Please reset your password manually or contact administrator.`);
        }
      } else {
        console.error(`❌ Error signing in to existing account:`, signInError);
        throw signInError;
      }
    }
  }

  // Manual admin account creation (for troubleshooting)
  static async createAdminAccountsManually(): Promise<void> {
    console.log('🔧 Manually creating admin accounts...');
    
    // First check Firebase Auth configuration
    const configCheck = await this.checkFirebaseAuthConfig();
    if (!configCheck.enabled) {
      throw new Error(`Firebase Auth not properly configured: ${configCheck.error}`);
    }
    
    try {
      for (const adminData of this.DEFAULT_ADMINS) {
        try {
          await this.createAdminAccount(adminData);
        } catch (error: any) {
          if (error.code === 'auth/email-already-in-use') {
            console.log(`ℹ️ Admin account already exists in Firebase Auth: ${adminData.email}`);
            await this.handleExistingAdminAccount(adminData);
          } else {
            throw error; // Re-throw other errors
          }
        }
      }
      console.log('✅ Manual admin account creation completed');
    } catch (error) {
      console.error('❌ Manual admin account creation failed:', error);
      throw error;
    }
  }

  // Force delete and recreate admin accounts (for troubleshooting)
  static async forceRecreateAdminAccounts(): Promise<void> {
    console.log('🗑️ Force recreating admin accounts...');
    
    try {
      for (const adminData of this.DEFAULT_ADMINS) {
        try {
          console.log(`🔄 Processing admin account: ${adminData.email}`);
          
          // Try to sign in with the current password to delete the account
          try {
            const userCredential = await signInWithEmailAndPassword(auth, adminData.email, adminData.password);
            console.log(`✅ Signed in successfully, deleting account: ${adminData.email}`);
            await deleteUser(userCredential.user);
            console.log(`✅ Deleted Firebase Auth account: ${adminData.email}`);
          } catch (signInError: any) {
            if (signInError.code === 'auth/invalid-credential' || signInError.code === 'auth/wrong-password') {
              console.log(`⚠️ Cannot sign in to delete account ${adminData.email} - password mismatch`);
              console.log(`💡 Sending password reset email to delete account manually`);
              await sendPasswordResetEmail(auth, adminData.email);
              throw new Error(`Cannot delete account ${adminData.email} due to password mismatch. Password reset email sent. Please reset password and try again.`);
            } else {
              console.log(`ℹ️ Account ${adminData.email} may not exist or other error:`, signInError.code);
            }
          }
          
          // Delete Firestore document if it exists
          try {
            const adminDocRef = doc(db, 'admins', adminData.email);
            const adminDoc = await getDoc(adminDocRef);
            if (adminDoc.exists()) {
              // We need to be authenticated to delete, so we'll skip this for now
              console.log(`ℹ️ Firestore document exists for ${adminData.email} - will be overwritten on recreation`);
            }
          } catch (firestoreError: any) {
            console.log(`ℹ️ Could not check Firestore document for ${adminData.email}:`, firestoreError.message);
          }
          
          // Wait a moment before recreating
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Now create the account fresh
          console.log(`🔄 Creating fresh account: ${adminData.email}`);
          await this.createAdminAccount(adminData);
          
        } catch (error: any) {
          console.error(`❌ Error processing admin account ${adminData.email}:`, error);
          if (error.message.includes('password reset email sent')) {
            throw error; // Re-throw password reset errors
          }
          // Continue with other accounts
        }
      }
      console.log('✅ Force recreation of admin accounts completed');
    } catch (error) {
      console.error('❌ Error force recreating admin accounts:', error);
      throw error;
    }
  }

  // Check if admin account exists (for troubleshooting)
  static async checkAdminAccountExists(email: string): Promise<{ exists: boolean; error?: string }> {
    console.log(`🔍 Checking if admin account exists: ${email}`);
    
    try {
      // Try to sign in with a dummy password to see if account exists
      try {
        await signInWithEmailAndPassword(auth, email, 'dummy-password-123');
        // If we get here, the account exists but password is wrong
        return { exists: true, error: 'Account exists but password is incorrect' };
      } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
          console.log(`✅ Account ${email} does not exist in Firebase Auth`);
          return { exists: false };
        } else if (error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
          console.log(`⚠️ Account ${email} exists but password is incorrect`);
          return { exists: true, error: 'Account exists but password is incorrect' };
        } else {
          console.error(`❌ Error checking account ${email}:`, error);
          return { exists: false, error: `Error checking account: ${error.message}` };
        }
      }
    } catch (error: any) {
      console.error(`❌ Error checking admin account ${email}:`, error);
      return { exists: false, error: `Failed to check account: ${error.message}` };
    }
  }

  // Delete specific admin account (for troubleshooting)
  static async deleteSpecificAdminAccount(email: string): Promise<void> {
    console.log(`🗑️ Attempting to delete admin account: ${email}`);
    
    try {
      // First, check if the account actually exists
      const accountCheck = await this.checkAdminAccountExists(email);
      if (!accountCheck.exists) {
        console.log(`ℹ️ Account ${email} does not exist, nothing to delete`);
        return;
      }
      
      console.log(`ℹ️ Account ${email} exists: ${accountCheck.error || 'Found'}`);
      
      // Try to find the admin data
      const adminData = this.DEFAULT_ADMINS.find(admin => admin.email === email);
      if (!adminData) {
        throw new Error(`Admin account ${email} not found in default admins list`);
      }
      
      // Try to sign in with the current password to delete the account
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, adminData.password);
        console.log(`✅ Signed in successfully, deleting account: ${email}`);
        await deleteUser(userCredential.user);
        console.log(`✅ Deleted Firebase Auth account: ${email}`);
        
        // Also try to delete the Firestore document
        try {
          const adminDocRef = doc(db, 'admins', email);
          const adminDoc = await getDoc(adminDocRef);
          if (adminDoc.exists()) {
            // We need to be authenticated to delete, so we'll skip this for now
            console.log(`ℹ️ Firestore document exists for ${email} - will be overwritten on recreation`);
          }
        } catch (firestoreError: any) {
          console.log(`ℹ️ Could not check Firestore document for ${email}:`, firestoreError.message);
        }
        
      } catch (signInError: any) {
        if (signInError.code === 'auth/invalid-credential' || signInError.code === 'auth/wrong-password') {
          console.log(`⚠️ Cannot sign in to delete account ${email} - password mismatch`);
          console.log(`💡 Sending password reset email to delete account manually`);
          await sendPasswordResetEmail(auth, email);
          throw new Error(`Cannot delete account ${email} due to password mismatch. Password reset email sent. Please reset password and try again.`);
        } else if (signInError.code === 'auth/user-not-found') {
          console.log(`ℹ️ Account ${email} does not exist in Firebase Auth`);
          return; // Account doesn't exist, nothing to delete
        } else {
          console.error(`❌ Error signing in to delete account ${email}:`, signInError);
          throw signInError;
        }
      }
      
    } catch (error) {
      console.error(`❌ Error deleting admin account ${email}:`, error);
      throw error;
    }
  }

  // Reset all admin passwords (for troubleshooting)
  static async resetAllAdminPasswords(): Promise<void> {
    console.log('🔄 Resetting all admin passwords...');
    
    try {
      for (const adminData of this.DEFAULT_ADMINS) {
        try {
          console.log(`📧 Sending password reset email to: ${adminData.email}`);
          await sendPasswordResetEmail(auth, adminData.email);
          console.log(`✅ Password reset email sent to: ${adminData.email}`);
        } catch (error: any) {
          console.error(`❌ Failed to send password reset to ${adminData.email}:`, error);
        }
      }
      console.log('✅ Password reset emails sent to all admin accounts');
    } catch (error) {
      console.error('❌ Error resetting admin passwords:', error);
      throw error;
    }
  }

  // Admin logout
  static logoutAdmin(): void {
    sessionStorage.removeItem('isAdmin');
    sessionStorage.removeItem('adminEmail');
    sessionStorage.removeItem('adminRole');
    sessionStorage.removeItem('adminPermissions');
    sessionStorage.removeItem('adminUID');
    sessionStorage.removeItem('adminMode');
  }
}

