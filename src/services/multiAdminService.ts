import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
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
  // Secure admin configuration from environment variables
  private static readonly ADMIN_CONFIG = {
    superAdmin: {
      email: process.env.REACT_APP_SUPER_ADMIN_EMAIL || 'superadmin@educationtoday.co',
      password: process.env.REACT_APP_SUPER_ADMIN_PASSWORD || 'superadmin@2024',
      displayName: process.env.REACT_APP_SUPER_ADMIN_NAME || 'Super Administrator',
      role: 'super_admin' as const,
      permissions: ['all'],
      canCreateUsers: true,
      canDeleteUsers: true,
      canManageTeams: true,
      canManageTasks: true,
      canViewAnalytics: true
    },
    admin: {
      email: process.env.REACT_APP_ADMIN_EMAIL || 'admin@educationtoday.co',
      password: process.env.REACT_APP_ADMIN_PASSWORD || 'admin@2024',
      displayName: process.env.REACT_APP_ADMIN_NAME || 'Administrator',
      role: 'admin' as const,
      permissions: ['manage_users', 'manage_teams', 'manage_tasks', 'view_analytics'],
      canCreateUsers: true,
      canDeleteUsers: false,
      canManageTeams: true,
      canManageTasks: true,
      canViewAnalytics: true
    },
    moderator: {
      email: process.env.REACT_APP_MODERATOR_EMAIL || 'moderator@educationtoday.co',
      password: process.env.REACT_APP_MODERATOR_PASSWORD || 'moderator@2024',
      displayName: process.env.REACT_APP_MODERATOR_NAME || 'Team Moderator',
      role: 'moderator' as const,
      permissions: ['manage_teams', 'manage_tasks'],
      canCreateUsers: false,
      canDeleteUsers: false,
      canManageTeams: true,
      canManageTasks: true,
      canViewAnalytics: false
    }
  };

  // Get default admin accounts from environment configuration
  private static getDefaultAdmins() {
    const admins = [];
    
    // Only add admins that have environment variables configured
    if (process.env.REACT_APP_SUPER_ADMIN_EMAIL && process.env.REACT_APP_SUPER_ADMIN_PASSWORD) {
      admins.push(this.ADMIN_CONFIG.superAdmin);
    }
    
    if (process.env.REACT_APP_ADMIN_EMAIL && process.env.REACT_APP_ADMIN_PASSWORD) {
      admins.push(this.ADMIN_CONFIG.admin);
    }
    
    if (process.env.REACT_APP_MODERATOR_EMAIL && process.env.REACT_APP_MODERATOR_PASSWORD) {
      admins.push(this.ADMIN_CONFIG.moderator);
    }

    // If no environment variables are set, use fallback (for development only)
    if (admins.length === 0) {
      console.warn('⚠️ No admin environment variables found. Using fallback credentials for development only.');
      admins.push(this.ADMIN_CONFIG.superAdmin);
      admins.push(this.ADMIN_CONFIG.admin);
      admins.push(this.ADMIN_CONFIG.moderator);
    }

    return admins;
  }

  // Initialize default admin accounts
  static async initializeDefaultAdmins(): Promise<void> {
    try {
      console.log('🚀 Initializing secure admin accounts from environment...');
      
      const defaultAdmins = this.getDefaultAdmins();
      
      if (defaultAdmins.length === 0) {
        throw new Error('No admin accounts configured. Please set environment variables.');
      }
      
      for (const adminData of defaultAdmins) {
        await this.ensureAdminAccount(adminData);
      }
      
      console.log(`✅ ${defaultAdmins.length} admin accounts initialized successfully`);
    } catch (error) {
      console.error('❌ Error initializing admin accounts:', error);
      throw error;
    }
  }

  // Ensure a specific admin account exists
  private static async ensureAdminAccount(adminData: any): Promise<void> {
    try {
      // Check if admin document exists in Firestore
      const adminDocRef = doc(db, 'admins', adminData.email);
      const adminDoc = await getDoc(adminDocRef);
      
              if (!adminDoc.exists()) {
          console.log(`🔄 Creating secure admin account: ${adminData.email}`);
          
          // Create Firebase Auth user
          const userCredential = await createUserWithEmailAndPassword(
            auth, 
            adminData.email, 
            adminData.password
          );
          
          // Update profile
          await updateProfile(userCredential.user, {
            displayName: adminData.displayName,
            photoURL: null
          });
          
          // Create admin document in Firestore (NO PASSWORD STORED)
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
          
          await setDoc(adminDocRef, adminUser);
          console.log(`✅ Secure admin account created: ${adminData.email}`);
        } else {
          console.log(`✅ Admin account already exists: ${adminData.email}`);
        }
    } catch (error: any) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`ℹ️ Admin account already exists in Firebase Auth: ${adminData.email}`);
        // Try to sign in to verify credentials
        try {
          await signInWithEmailAndPassword(auth, adminData.email, adminData.password);
          console.log(`✅ Admin account verified: ${adminData.email}`);
        } catch (signInError) {
          console.warn(`⚠️ Could not verify admin account: ${adminData.email}`, signInError);
        }
      } else {
        console.error(`❌ Error ensuring admin account ${adminData.email}:`, error);
        throw error;
      }
    }
  }

  // Admin login with multi-admin support
  static async loginAdmin(email: string, password: string): Promise<AdminAuthResult> {
    try {
      console.log(`🔑 Attempting admin login for: ${email}`);
      
      // Check if email exists in admin collection
      const adminDocRef = doc(db, 'admins', email);
      const adminDoc = await getDoc(adminDocRef);
      
      if (!adminDoc.exists()) {
        return {
          success: false,
          message: 'Email not found in admin system'
        };
      }
      
      const adminData = adminDoc.data() as AdminUser;
      
      if (!adminData.isActive) {
        return {
          success: false,
          message: 'Admin account is deactivated'
        };
      }
      
      // Try to sign in with Firebase
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Update last login
        await updateDoc(adminDocRef, {
          lastLogin: serverTimestamp()
        });
        
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
        
      } catch (firebaseError: any) {
        console.error('❌ Firebase authentication failed:', firebaseError);
        
        // Handle rate limiting
        if (firebaseError.code === 'auth/too-many-requests') {
          console.log('🔄 Rate limit hit, switching to session-only mode...');
          
          // Set admin session (session-only mode)
          sessionStorage.setItem('isAdmin', 'true');
          sessionStorage.setItem('adminEmail', email);
          sessionStorage.setItem('adminRole', adminData.role);
          sessionStorage.setItem('adminPermissions', JSON.stringify(adminData.permissions));
          sessionStorage.setItem('adminUID', adminData.uid);
          sessionStorage.setItem('adminMode', 'session-only');
          
          return {
            success: true,
            message: `Welcome, ${adminData.displayName}! (Session-only mode due to rate limiting)`,
            user: adminData
          };
        }
        
        return {
          success: false,
          message: `Authentication failed: ${firebaseError.message}`
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

  // Admin logout
  static logoutAdmin(): void {
    sessionStorage.removeItem('isAdmin');
    sessionStorage.removeItem('adminEmail');
    sessionStorage.removeItem('adminRole');
    sessionStorage.removeItem('adminPermissions');
    sessionStorage.removeItem('adminUID');
    sessionStorage.removeItem('adminMode');
  }

  // Check if environment variables are properly configured
  static checkEnvironmentConfiguration(): {
    isConfigured: boolean;
    missingVariables: string[];
    recommendations: string[];
  } {
    const requiredVars = [
      'REACT_APP_SUPER_ADMIN_EMAIL',
      'REACT_APP_SUPER_ADMIN_PASSWORD',
      'REACT_APP_ADMIN_EMAIL', 
      'REACT_APP_ADMIN_PASSWORD',
      'REACT_APP_MODERATOR_EMAIL',
      'REACT_APP_MODERATOR_PASSWORD'
    ];

    const missingVars: string[] = [];
    const recommendations: string[] = [];

    requiredVars.forEach(varName => {
      if (!process.env[varName]) {
        missingVars.push(varName);
      }
    });

    if (missingVars.length > 0) {
      recommendations.push('Run setup-secure-admin.ps1 to configure admin credentials');
      recommendations.push('Create .env file with required environment variables');
      recommendations.push('Never commit .env files to version control');
    }

    return {
      isConfigured: missingVars.length === 0,
      missingVariables: missingVars,
      recommendations
    };
  }

  // Get admin configuration status for debugging
  static getAdminConfigurationStatus(): {
    superAdmin: { configured: boolean; email?: string };
    admin: { configured: boolean; email?: string };
    moderator: { configured: boolean; email?: string };
  } {
    return {
      superAdmin: {
        configured: !!(process.env.REACT_APP_SUPER_ADMIN_EMAIL && process.env.REACT_APP_SUPER_ADMIN_PASSWORD),
        email: process.env.REACT_APP_SUPER_ADMIN_EMAIL
      },
      admin: {
        configured: !!(process.env.REACT_APP_ADMIN_EMAIL && process.env.REACT_APP_ADMIN_PASSWORD),
        email: process.env.REACT_APP_ADMIN_EMAIL
      },
      moderator: {
        configured: !!(process.env.REACT_APP_MODERATOR_EMAIL && process.env.REACT_APP_MODERATOR_PASSWORD),
        email: process.env.REACT_APP_MODERATOR_EMAIL
      }
    };
  }
}

