import { Task } from '../types/task';
import { db } from '../config';
import { doc, getDoc, collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, setDoc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { adminWhatsAppService } from './adminWhatsAppService';

// Predefined reminder intervals
export const REMINDER_INTERVALS: ReminderInterval[] = [
  { id: '4h', name: '4 Hours', hours: 4, description: 'Every 4 hours' },
  { id: '8h', name: '8 Hours', hours: 8, description: 'Every 8 hours' },
  { id: '12h', name: '12 Hours', hours: 12, description: 'Every 12 hours' },
  { id: '1d', name: '1 Day', hours: 24, description: 'Daily' },
  { id: '2d', name: '2 Days', hours: 48, description: 'Every 2 days' },
  { id: '3d', name: '3 Days', hours: 72, description: 'Every 3 days' },
  { id: '1w', name: '1 Week', hours: 168, description: 'Weekly' }
];

export interface ReminderInterval {
  id: string;
  name: string;
  hours: number;
  description: string;
}

export interface TaskReminder {
  id: string;
  taskId: string;
  userId: string;
  phoneNumber: string;
  reminderType: 'before_due' | 'overdue';
  intervalHours: number;
  scheduledTime: Date;
  sentTime?: Date;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
  message: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReminderSettings {
  userId: string;
  enabled: boolean;
  intervals: number[]; // Array of hours (e.g., [4, 8, 24])
  beforeDueReminders: boolean;
  overdueReminders: boolean;
  reminderTime: string; // Time of day to send reminders (e.g., "09:00")
  timezone: string;
  updatedAt: Date;
}

class WhatsAppReminderService {
  private isInitialized: boolean = false;
  private reminderCheckInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes



  constructor() {
    this.initialize();
  }

  // Initialize the service
  initialize(): boolean {
    if (!adminWhatsAppService.getStatus().initialized) {
      console.error('❌ WhatsApp Reminder Service: Admin WhatsApp service not initialized');
      return false;
    }

    this.isInitialized = true;
    console.log('✅ WhatsApp Reminder Service: Initialized successfully');
    this.startReminderScheduler();
    return true;
  }

  // Start the automatic reminder scheduler
  private startReminderScheduler(): void {
    if (this.reminderCheckInterval) {
      clearInterval(this.reminderCheckInterval);
    }

    this.reminderCheckInterval = setInterval(() => {
      this.processPendingReminders();
    }, this.CHECK_INTERVAL);

    console.log('🔄 WhatsApp Reminder Service: Scheduler started');
  }

  // Stop the reminder scheduler
  stopReminderScheduler(): void {
    if (this.reminderCheckInterval) {
      clearInterval(this.reminderCheckInterval);
      this.reminderCheckInterval = null;
      console.log('⏹️ WhatsApp Reminder Service: Scheduler stopped');
    }
  }

  // Create reminders for a new task
  async createTaskReminders(task: Task, userId: string, phoneNumber: string): Promise<{
    success: boolean;
    remindersCreated: number;
    error?: string;
  }> {
    if (!this.isInitialized) {
      return { success: false, remindersCreated: 0, error: 'Service not initialized' };
    }

    if (!task.dueDate) {
      console.log('⚠️ WhatsApp Reminder Service: Task has no due date, skipping reminders');
      return { success: true, remindersCreated: 0 };
    }

    try {
      // Get user's reminder settings
      const settings = await this.getUserReminderSettings(userId);
      if (!settings.enabled) {
        console.log('⚠️ WhatsApp Reminder Service: User has reminders disabled');
        return { success: true, remindersCreated: 0 };
      }

      const dueDate = new Date(task.dueDate);
      const now = new Date();
      const remindersCreated: TaskReminder[] = [];

      // Create before-due reminders
      if (settings.beforeDueReminders) {
        for (const intervalHours of settings.intervals) {
          const reminderTime = new Date(dueDate.getTime() - (intervalHours * 60 * 60 * 1000));
          
          // Only create reminder if it's in the future
          if (reminderTime > now) {
            const reminder: Omit<TaskReminder, 'id'> = {
              taskId: task.id!,
              userId,
              phoneNumber,
              reminderType: 'before_due',
              intervalHours,
              scheduledTime: reminderTime,
              status: 'pending',
              message: this.generateReminderMessage(task, 'before_due', intervalHours),
              createdAt: now,
              updatedAt: now
            };

            const reminderRef = await addDoc(collection(db, 'taskReminders'), reminder);
            remindersCreated.push({ id: reminderRef.id, ...reminder });
          }
        }
      }

      // Create overdue reminder (24 hours after due date)
      if (settings.overdueReminders) {
        const overdueTime = new Date(dueDate.getTime() + (24 * 60 * 60 * 1000));
        
        const overdueReminder: Omit<TaskReminder, 'id'> = {
          taskId: task.id!,
          userId,
          phoneNumber,
          reminderType: 'overdue',
          intervalHours: 24,
          scheduledTime: overdueTime,
          status: 'pending',
          message: this.generateReminderMessage(task, 'overdue', 24),
          createdAt: now,
          updatedAt: now
        };

        const overdueRef = await addDoc(collection(db, 'taskReminders'), overdueReminder);
        remindersCreated.push({ id: overdueRef.id, ...overdueReminder });
      }

      console.log(`✅ WhatsApp Reminder Service: Created ${remindersCreated.length} reminders for task ${task.id}`);
      return { success: true, remindersCreated: remindersCreated.length };

    } catch (error) {
      console.error('❌ WhatsApp Reminder Service: Error creating task reminders:', error);
      return { 
        success: false, 
        remindersCreated: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Process pending reminders
  private async processPendingReminders(): Promise<void> {
    try {
      const now = new Date();
      const pendingRemindersQuery = query(
        collection(db, 'taskReminders'),
        where('status', '==', 'pending'),
        where('scheduledTime', '<=', now)
      );

      const snapshot = await getDocs(pendingRemindersQuery);
      const reminders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as TaskReminder));

      console.log(`🔄 WhatsApp Reminder Service: Processing ${reminders.length} pending reminders`);

      for (const reminder of reminders) {
        await this.sendReminder(reminder);
      }

    } catch (error) {
      console.error('❌ WhatsApp Reminder Service: Error processing pending reminders:', error);
    }
  }

  // Send a specific reminder
  private async sendReminder(reminder: TaskReminder): Promise<void> {
    try {
      console.log(`📱 WhatsApp Reminder Service: Sending reminder ${reminder.id} to ${reminder.phoneNumber}`);

      // Update reminder status to processing
      await updateDoc(doc(db, 'taskReminders', reminder.id), {
        status: 'sent',
        sentTime: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Send WhatsApp message
      const success = await this.sendWhatsAppReminder(reminder);

      if (success) {
        console.log(`✅ WhatsApp Reminder Service: Reminder ${reminder.id} sent successfully`);
      } else {
        // Mark as failed
        await updateDoc(doc(db, 'taskReminders', reminder.id), {
          status: 'failed',
          updatedAt: serverTimestamp()
        });
        console.log(`❌ WhatsApp Reminder Service: Failed to send reminder ${reminder.id}`);
      }

    } catch (error) {
      console.error(`❌ WhatsApp Reminder Service: Error sending reminder ${reminder.id}:`, error);
      
      // Mark as failed
      try {
        await updateDoc(doc(db, 'taskReminders', reminder.id), {
          status: 'failed',
          updatedAt: serverTimestamp()
        });
      } catch (updateError) {
        console.error('❌ WhatsApp Reminder Service: Error updating reminder status:', updateError);
      }
    }
  }

  // Send WhatsApp reminder message
  private async sendWhatsAppReminder(reminder: TaskReminder): Promise<boolean> {
    try {
      // Get task details
      const taskDoc = await getDoc(doc(db, 'tasks', reminder.taskId));
      if (!taskDoc.exists()) {
        console.log(`⚠️ WhatsApp Reminder Service: Task ${reminder.taskId} not found`);
        return false;
      }

      const task = taskDoc.data() as Task;

      // Create notification data for admin WhatsApp service
      const notificationData = {
        taskId: task.id!,
        taskTitle: task.title,
        taskDescription: task.description || '',
        teamId: task.teamId || null,
        teamName: task.teamId ? 'Team Task' : 'Individual Task',
        assignedTo: reminder.userId,
        assignedToName: 'User', // We'll get this from user data if needed
        priority: task.priority,
        dueDate: task.dueDate ? new Date(task.dueDate) : new Date(),
        taskLink: `${window.location.origin}/tasks/${task.id}`,
        createdAt: new Date()
      };

      // Send using admin WhatsApp service
      const result = await adminWhatsAppService.sendTaskCreationNotification(notificationData, reminder.userId);
      return result.success;

    } catch (error) {
      console.error('❌ WhatsApp Reminder Service: Error sending WhatsApp reminder:', error);
      return false;
    }
  }

  // Generate reminder message
  private generateReminderMessage(task: Task, type: 'before_due' | 'overdue', intervalHours: number): string {
    const dueDate = task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date';
    
    if (type === 'overdue') {
      return `🚨 URGENT: Task "${task.title}" is overdue! Please complete it immediately.`;
    } else {
      const timeLeft = intervalHours < 24 ? `${intervalHours} hours` : `${Math.floor(intervalHours / 24)} days`;
      return `🔔 Reminder: Task "${task.title}" is due in ${timeLeft}. Please complete it soon.`;
    }
  }

  // Get user's reminder settings
  async getUserReminderSettings(userId: string): Promise<ReminderSettings> {
    try {
      const settingsDoc = await getDoc(doc(db, 'reminderSettings', userId));
      
      if (settingsDoc.exists()) {
        return settingsDoc.data() as ReminderSettings;
      }

      // Return default settings
      return {
        userId,
        enabled: true,
        intervals: [24, 8, 4], // Default: 1 day, 8 hours, 4 hours before due
        beforeDueReminders: true,
        overdueReminders: true,
        reminderTime: '09:00',
        timezone: 'UTC',
        updatedAt: new Date()
      };

    } catch (error) {
      console.error('❌ WhatsApp Reminder Service: Error getting user reminder settings:', error);
      return {
        userId,
        enabled: false,
        intervals: [],
        beforeDueReminders: false,
        overdueReminders: false,
        reminderTime: '09:00',
        timezone: 'UTC',
        updatedAt: new Date()
      };
    }
  }

  // Update user's reminder settings
  async updateUserReminderSettings(userId: string, settings: Partial<ReminderSettings>): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const updatedSettings: ReminderSettings = {
        userId,
        enabled: settings.enabled ?? true,
        intervals: settings.intervals ?? [24, 8, 4],
        beforeDueReminders: settings.beforeDueReminders ?? true,
        overdueReminders: settings.overdueReminders ?? true,
        reminderTime: settings.reminderTime ?? '09:00',
        timezone: settings.timezone ?? 'UTC',
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'reminderSettings', userId), updatedSettings, { merge: true });
      console.log(`✅ WhatsApp Reminder Service: Updated reminder settings for user ${userId}`);
      return { success: true };

    } catch (error) {
      console.error('❌ WhatsApp Reminder Service: Error updating reminder settings:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Cancel all reminders for a task
  async cancelTaskReminders(taskId: string): Promise<{
    success: boolean;
    cancelledCount: number;
    error?: string;
  }> {
    try {
      const remindersQuery = query(
        collection(db, 'taskReminders'),
        where('taskId', '==', taskId),
        where('status', '==', 'pending')
      );

      const snapshot = await getDocs(remindersQuery);
      let cancelledCount = 0;

      for (const docSnapshot of snapshot.docs) {
        await updateDoc(doc(db, 'taskReminders', docSnapshot.id), {
          status: 'cancelled',
          updatedAt: serverTimestamp()
        });
        cancelledCount++;
      }

      console.log(`✅ WhatsApp Reminder Service: Cancelled ${cancelledCount} reminders for task ${taskId}`);
      return { success: true, cancelledCount };

    } catch (error) {
      console.error('❌ WhatsApp Reminder Service: Error cancelling task reminders:', error);
      return { 
        success: false, 
        cancelledCount: 0, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Get reminder statistics for a user
  async getUserReminderStats(userId: string): Promise<{
    totalReminders: number;
    sentReminders: number;
    pendingReminders: number;
    failedReminders: number;
  }> {
    try {
      const remindersQuery = query(
        collection(db, 'taskReminders'),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(remindersQuery);
      const reminders = snapshot.docs.map(doc => doc.data() as TaskReminder);

      return {
        totalReminders: reminders.length,
        sentReminders: reminders.filter(r => r.status === 'sent').length,
        pendingReminders: reminders.filter(r => r.status === 'pending').length,
        failedReminders: reminders.filter(r => r.status === 'failed').length
      };

    } catch (error) {
      console.error('❌ WhatsApp Reminder Service: Error getting reminder stats:', error);
      return {
        totalReminders: 0,
        sentReminders: 0,
        pendingReminders: 0,
        failedReminders: 0
      };
    }
  }

  // Get service status
  getStatus(): { initialized: boolean; schedulerRunning: boolean } {
    return {
      initialized: this.isInitialized,
      schedulerRunning: this.reminderCheckInterval !== null
    };
  }
}

// Export singleton instance
export const whatsAppReminderService = new WhatsAppReminderService();
export default WhatsAppReminderService;