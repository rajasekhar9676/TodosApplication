import { collection, query, where, getDocs, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../config';
import { whatsAppService } from './WhatsAppService';
import { Task } from '../types/task';

interface ReminderLog {
  taskId: string;
  sentAt: Date;
  type: 'due' | 'overdue';
  success: boolean;
  phoneNumber: string;
}

class ReminderScheduler {
  private isRunning: boolean = false;
  private reminderLogs: Map<string, ReminderLog> = new Map();
  private unsubscribe: (() => void) | null = null;

  // Start the reminder scheduler
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ Reminder Scheduler: Already running');
      return;
    }

    this.isRunning = true;
    console.log('✅ Reminder Scheduler: Started');
    this.setupTaskListener();
    this.checkOverdueTasks();
  }

  // Stop the reminder scheduler
  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.isRunning = false;
    console.log('🛑 Reminder Scheduler: Stopped');
  }

  // Setup real-time listener for tasks
  private setupTaskListener(): void {
    const tasksQuery = query(
      collection(db, 'tasks'),
      where('status', '!=', 'COMPLETED')
    );

    this.unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const task = { id: change.doc.id, ...change.doc.data() } as Task;
        
        if (change.type === 'added' || change.type === 'modified') {
          this.processTaskForReminders(task);
        }
      });
    }, (error) => {
      console.error('❌ Reminder Scheduler: Error listening to tasks:', error);
    });
  }

  // Process a task for reminders
  private async processTaskForReminders(task: Task): Promise<void> {
    if (!task.dueDate || task.status === 'COMPLETED' || !task.id) return;

    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const timeUntilDue = dueDate.getTime() - now.getTime();
    const daysUntilDue = Math.ceil(timeUntilDue / (1000 * 60 * 60 * 24));

    // Get user's phone number
    const userId = task.createdBy || task.assignedTo;
    if (!userId) {
      console.log('⚠️ Reminder Scheduler: No user ID found for task:', task.id);
      return;
    }
    
    const phoneNumber = await this.getUserPhoneNumber(userId);
    if (!phoneNumber) {
      console.log('⚠️ Reminder Scheduler: No phone number found for task:', task.id);
      return;
    }

    // Check if reminder was already sent recently
    const reminderKey = `${task.id}_${phoneNumber}`;
    const lastReminder = this.reminderLogs.get(reminderKey);
    const timeSinceLastReminder = lastReminder ? 
      now.getTime() - lastReminder.sentAt.getTime() : Infinity;

    // Send reminders based on due date
    if (daysUntilDue === 1 && timeSinceLastReminder > 24 * 60 * 60 * 1000) {
      // 1 day before due date
      await this.sendDueReminder(task, phoneNumber, reminderKey);
    } else if (daysUntilDue === 0 && timeSinceLastReminder > 12 * 60 * 60 * 1000) {
      // Due today
      await this.sendDueReminder(task, phoneNumber, reminderKey);
    } else if (daysUntilDue < 0 && timeSinceLastReminder > 6 * 60 * 60 * 1000) {
      // Overdue
      await this.sendOverdueReminder(task, phoneNumber, reminderKey);
    }
  }

  // Send due reminder
  private async sendDueReminder(task: Task, phoneNumber: string, reminderKey: string): Promise<void> {
    if (!task.id) return; // Safety check
    
    try {
      // Use the new template method instead of generateReminderMessage
      const success = await whatsAppService.sendTaskReminder(task, phoneNumber);
      
      // Log the reminder
      this.reminderLogs.set(reminderKey, {
        taskId: task.id,
        sentAt: new Date(),
        type: 'due',
        success,
        phoneNumber
      });

      if (success) {
        console.log('✅ Template reminder sent for task:', task.title);
        // Update task with reminder sent timestamp
        await this.updateTaskReminderSent(task.id);
      } else {
        console.error('❌ Failed to send template reminder for task:', task.title);
      }
    } catch (error) {
      console.error('❌ Error sending due reminder:', error);
    }
  }

  // Send overdue reminder
  private async sendOverdueReminder(task: Task, phoneNumber: string, reminderKey: string): Promise<void> {
    if (!task.id) return; // Safety check
    
    try {
      const success = await whatsAppService.sendOverdueReminder(task, phoneNumber);
      
      // Log the reminder
      this.reminderLogs.set(reminderKey, {
        taskId: task.id,
        sentAt: new Date(),
        type: 'overdue',
        success,
        phoneNumber
      });

      if (success) {
        console.log('✅ Overdue reminder sent for task:', task.title);
        // Update task with overdue reminder sent timestamp
        await this.updateTaskOverdueReminderSent(task.id);
      } else {
        console.error('❌ Failed to send overdue reminder for task:', task.title);
      }
    } catch (error) {
      console.error('❌ Error sending overdue reminder:', error);
    }
  }

  // Get user's phone number
  private async getUserPhoneNumber(userId: string): Promise<string | null> {
    try {
      const userDoc = await getDocs(query(
        collection(db, 'users'),
        where('uid', '==', userId)
      ));

      if (!userDoc.empty) {
        const userData = userDoc.docs[0].data();
        return userData.phoneNumber || null;
      }
      return null;
    } catch (error) {
      console.error('❌ Error fetching user phone number:', error);
      return null;
    }
  }

  // Update task with reminder sent timestamp
  private async updateTaskReminderSent(taskId: string): Promise<void> {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const taskSnap = await getDocs(query(collection(db, 'tasks'), where('id', '==', taskId)));
      const currentReminderCount = taskSnap.docs[0]?.data()?.reminderCount || 0;
      
      await updateDoc(taskRef, {
        lastReminderSent: new Date(),
        reminderCount: currentReminderCount + 1
      });
    } catch (error) {
      console.error('❌ Error updating task reminder sent:', error);
    }
  }

  // Update task with overdue reminder sent timestamp
  private async updateTaskOverdueReminderSent(taskId: string): Promise<void> {
    try {
      const taskRef = doc(db, 'tasks', taskId);
      const taskSnap = await getDocs(query(collection(db, 'tasks'), where('id', '==', taskId)));
      const currentOverdueReminderCount = taskSnap.docs[0]?.data()?.overdueReminderCount || 0;
      
      await updateDoc(taskRef, {
        lastOverdueReminderSent: new Date(),
        overdueReminderCount: currentOverdueReminderCount + 1
      });
    } catch (error) {
      console.error('❌ Error updating task overdue reminder sent:', error);
    }
  }

  // Check for overdue tasks immediately
  private async checkOverdueTasks(): Promise<void> {
    try {
      const overdueQuery = query(
        collection(db, 'tasks'),
        where('status', '!=', 'COMPLETED'),
        where('dueDate', '<', new Date().toISOString())
      );

      const overdueSnapshot = await getDocs(overdueQuery);
      for (const doc of overdueSnapshot.docs) {
        const task = { id: doc.id, ...doc.data() } as Task;
        if (!task.id) continue; // Skip tasks without ID
        
        const userId = task.createdBy || task.assignedTo;
        if (userId) {
          const phoneNumber = await this.getUserPhoneNumber(userId);
          
          if (phoneNumber) {
            const reminderKey = `${task.id}_${phoneNumber}`;
            const lastReminder = this.reminderLogs.get(reminderKey);
            
            // Send overdue reminder if not sent recently
            if (!lastReminder || 
                new Date().getTime() - lastReminder.sentAt.getTime() > 6 * 60 * 60 * 1000) {
              await this.sendOverdueReminder(task, phoneNumber, reminderKey);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Error checking overdue tasks:', error);
    }
  }

  // Get reminder statistics
  getStats(): { totalReminders: number; successfulReminders: number; failedReminders: number } {
    const total = this.reminderLogs.size;
    const successful = Array.from(this.reminderLogs.values()).filter(log => log.success).length;
    const failed = total - successful;

    return { totalReminders: total, successfulReminders: successful, failedReminders: failed };
  }

  // Clear old reminder logs (older than 30 days)
  clearOldLogs(): void {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    for (const [key, log] of this.reminderLogs.entries()) {
      if (log.sentAt < thirtyDaysAgo) {
        this.reminderLogs.delete(key);
      }
    }
  }
}

// Export singleton instance
export const reminderScheduler = new ReminderScheduler();
export default ReminderScheduler;
