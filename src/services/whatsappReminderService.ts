import { db } from '../config';
import { 
  collection, 
  doc, 
  getDocs, 
  query, 
  where, 
  updateDoc, 
  addDoc,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';

export interface ReminderSettings {
  enabled: boolean;
  defaultTime: number; // hours before due date
  autoReminders: boolean;
  manualReminders: boolean;
  whatsappNumber?: string;
  reminderMessage?: string;
}

export interface TaskReminder {
  id: string;
  taskId: string;
  taskTitle: string;
  teamId: string;
  teamName: string;
  userId: string;
  userName: string;
  dueDate: Date;
  reminderTime: Date;
  status: 'pending' | 'sent' | 'failed';
  type: 'manual' | 'automatic';
  whatsappNumber?: string;
  message: string;
  createdAt: Date;
  sentAt?: Date;
}

export interface ReminderResult {
  success: boolean;
  message?: string;
  reminderId?: string;
  error?: string;
}

class WhatsAppReminderService {
  private apiUrl = 'https://api.whatsapp.com/send'; // You'll need to replace this with your actual WhatsApp Business API
  
  // Send manual reminder for a specific task
  async sendManualReminder(
    taskId: string, 
    userId: string, 
    whatsappNumber: string,
    customMessage?: string
  ): Promise<ReminderResult> {
    try {
      console.log('📱 WhatsApp: Sending manual reminder for task:', taskId);
      
      // Get task details
      const taskRef = doc(db, 'tasks', taskId);
      const taskSnap = await getDocs(collection(db, 'tasks'));
      const task = taskSnap.docs.find(doc => doc.id === taskId)?.data();
      
      if (!task) {
        return {
          success: false,
          error: 'Task not found'
        };
      }
      
      // Get team details
      const teamRef = doc(db, 'teams', task.teamId);
      const teamSnap = await getDocs(collection(db, 'teams'));
      const team = teamSnap.docs.find(doc => doc.id === task.teamId)?.data();
      
      // Get user details
      const userRef = doc(db, 'users', userId);
      const userSnap = await getDocs(collection(db, 'users'));
      const user = userSnap.docs.find(doc => doc.id === userId)?.data();
      
      if (!team || !user) {
        return {
          success: false,
          error: 'Team or user not found'
        };
      }
      
      // Create reminder message
      const defaultMessage = `🔔 Task Reminder\n\n📋 Task: ${task.title}\n👥 Team: ${team.name}\n⏰ Due: ${task.dueDate?.toDate?.() ? task.dueDate.toDate().toLocaleString() : 'No due date'}\n👤 Assigned to: ${user.displayName || user.email}\n\nPlease complete this task on time!`;
      
      const message = customMessage || defaultMessage;
      
      // Send WhatsApp message (this is a placeholder - you'll need to integrate with actual WhatsApp Business API)
      const whatsappResult = await this.sendWhatsAppMessage(whatsappNumber, message);
      
      if (!whatsappResult.success) {
        return {
          success: false,
          error: `WhatsApp sending failed: ${whatsappResult.error}`
        };
      }
      
      // Create reminder record
      const reminderData: Omit<TaskReminder, 'id'> = {
        taskId,
        taskTitle: task.title,
        teamId: task.teamId,
        teamName: team.name,
        userId,
        userName: user.displayName || user.email,
        dueDate: task.dueDate?.toDate?.() || new Date(),
        reminderTime: new Date(),
        status: 'sent',
        type: 'manual',
        whatsappNumber,
        message,
        createdAt: new Date(),
        sentAt: new Date()
      };
      
      const reminderRef = await addDoc(collection(db, 'reminders'), reminderData);
      
      console.log('✅ WhatsApp: Manual reminder sent successfully');
      
      return {
        success: true,
        message: 'Reminder sent successfully',
        reminderId: reminderRef.id
      };
      
    } catch (error: any) {
      console.error('❌ WhatsApp: Manual reminder failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to send reminder'
      };
    }
  }
  
  // Send automatic reminders for overdue tasks
  async sendAutomaticReminders(): Promise<ReminderResult[]> {
    try {
      console.log('📱 WhatsApp: Starting automatic reminders check');
      
      const results: ReminderResult[] = [];
      const now = new Date();
      
      // Get all active tasks with due dates
      const tasksQuery = query(
        collection(db, 'tasks'),
        where('status', 'in', ['todo', 'in-progress']),
        where('dueDate', '<=', Timestamp.fromDate(now))
      );
      
      const tasksSnap = await getDocs(tasksQuery);
      
      for (const taskDoc of tasksSnap.docs) {
        const task = taskDoc.data();
        const taskId = taskDoc.id;
        
        // Check if reminder already sent recently (within last 4 hours)
        const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000);
        
        const remindersQuery = query(
          collection(db, 'reminders'),
          where('taskId', '==', taskId),
          where('type', '==', 'automatic'),
          where('sentAt', '>=', Timestamp.fromDate(fourHoursAgo))
        );
        
        const recentReminders = await getDocs(remindersQuery);
        
        if (recentReminders.empty) {
          // Send automatic reminder
          const result = await this.sendAutomaticReminder(taskId, task);
          results.push(result);
          
          // Wait a bit between reminders to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log(`✅ WhatsApp: Automatic reminders completed. ${results.length} reminders sent.`);
      return results;
      
    } catch (error: any) {
      console.error('❌ WhatsApp: Automatic reminders failed:', error);
      return [{
        success: false,
        error: error.message || 'Failed to send automatic reminders'
      }];
    }
  }
  
  // Send automatic reminder for a specific task
  private async sendAutomaticReminder(taskId: string, task: any): Promise<ReminderResult> {
    try {
      // Get team and user details
      const teamSnap = await getDocs(collection(db, 'teams'));
      const team = teamSnap.docs.find(doc => doc.id === task.teamId)?.data();
      
      const userSnap = await getDocs(collection(db, 'users'));
      const user = userSnap.docs.find(doc => doc.id === task.assignedTo)?.data();
      
      if (!team || !user) {
        return {
          success: false,
          error: 'Team or user not found'
        };
      }
      
      // Check if user has WhatsApp notifications enabled
      if (!user.preferences?.notifications?.whatsapp) {
        return {
          success: false,
          error: 'User has WhatsApp notifications disabled'
        };
      }
      
      // Get user's WhatsApp number
      const whatsappNumber = user.phone || user.whatsappNumber;
      if (!whatsappNumber) {
        return {
          success: false,
          error: 'User has no WhatsApp number configured'
        };
      }
      
      // Create automatic reminder message
      const message = `🚨 URGENT: Task Overdue\n\n📋 Task: ${task.title}\n👥 Team: ${team.name}\n⏰ Due: ${task.dueDate?.toDate?.() ? task.dueDate.toDate().toLocaleString() : 'No due date'}\n👤 Assigned to: ${user.displayName || user.email}\n\n⚠️ This task is overdue! Please complete it immediately.`;
      
      // Send WhatsApp message
      const whatsappResult = await this.sendWhatsAppMessage(whatsappNumber, message);
      
      if (!whatsappResult.success) {
        return {
          success: false,
          error: `WhatsApp sending failed: ${whatsappResult.error}`
        };
      }
      
      // Create reminder record
      const reminderData: Omit<TaskReminder, 'id'> = {
        taskId,
        taskTitle: task.title,
        teamId: task.teamId,
        teamName: team.name,
        userId: task.assignedTo,
        userName: user.displayName || user.email,
        dueDate: task.dueDate?.toDate?.() || new Date(),
        reminderTime: new Date(),
        status: 'sent',
        type: 'automatic',
        whatsappNumber,
        message,
        createdAt: new Date(),
        sentAt: new Date()
      };
      
      await addDoc(collection(db, 'reminders'), reminderData);
      
      return {
        success: true,
        message: 'Automatic reminder sent successfully'
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send automatic reminder'
      };
    }
  }
  
  // Send WhatsApp message (placeholder - integrate with actual API)
  private async sendWhatsAppMessage(phoneNumber: string, message: string): Promise<{ success: boolean; error?: string }> {
    try {
      // This is a placeholder implementation
      // You'll need to integrate with WhatsApp Business API or a service like Twilio
      
      console.log('📱 WhatsApp: Sending message to:', phoneNumber);
      console.log('📱 WhatsApp: Message:', message);
      
      // For now, we'll simulate success
      // In production, replace this with actual WhatsApp API call
      
      // Example with Twilio WhatsApp API:
      // const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': 'Basic ' + btoa('YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN'),
      //     'Content-Type': 'application/x-www-form-urlencoded'
      //   },
      //   body: new URLSearchParams({
      //     'From': 'whatsapp:+14155238886',
      //     'To': `whatsapp:${phoneNumber}`,
      //     'Body': message
      //   })
      // });
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ WhatsApp: Message sent successfully (simulated)');
      
      return { success: true };
      
    } catch (error: any) {
      console.error('❌ WhatsApp: Message sending failed:', error);
      return {
        success: false,
        error: error.message || 'Failed to send WhatsApp message'
      };
    }
  }
  
  // Get reminder history for a user
  async getUserReminders(userId: string): Promise<TaskReminder[]> {
    try {
      const remindersQuery = query(
        collection(db, 'reminders'),
        where('userId', '==', userId)
      );
      
      const remindersSnap = await getDocs(remindersQuery);
      return remindersSnap.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as TaskReminder[];
      
    } catch (error: any) {
      console.error('❌ WhatsApp: Failed to get user reminders:', error);
      return [];
    }
  }
  
  // Update reminder settings for a user
  async updateReminderSettings(userId: string, settings: Partial<ReminderSettings>): Promise<ReminderResult> {
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        'preferences.reminderSettings': settings,
        updatedAt: new Date()
      });
      
      return {
        success: true,
        message: 'Reminder settings updated successfully'
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to update reminder settings'
      };
    }
  }
  
  // Schedule reminder for future
  async scheduleReminder(
    taskId: string,
    userId: string,
    reminderTime: Date,
    message: string
  ): Promise<ReminderResult> {
    try {
      const reminderData: Omit<TaskReminder, 'id'> = {
        taskId,
        taskTitle: '', // Will be filled when reminder is sent
        teamId: '',
        teamName: '',
        userId,
        userName: '',
        dueDate: new Date(),
        reminderTime,
        status: 'pending',
        type: 'manual',
        message,
        createdAt: new Date()
      };
      
      const reminderRef = await addDoc(collection(db, 'reminders'), reminderData);
      
      return {
        success: true,
        message: 'Reminder scheduled successfully',
        reminderId: reminderRef.id
      };
      
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to schedule reminder'
      };
    }
  }
}

export const whatsappReminderService = new WhatsAppReminderService();
export default whatsappReminderService;
