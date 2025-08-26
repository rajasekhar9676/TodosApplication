import { Task } from '../types/task';

interface WhatsAppConfig {
  apiKey: string;
  baseUrl: string;
}

interface ReminderMessage {
  taskId: string;
  taskTitle: string;
  dueDate: string;
  priority: string;
  phoneNumber: string;
  message: string;
  scheduledTime: Date;
}

class WhatsAppService {
  private config: WhatsAppConfig;
  private isInitialized: boolean = false;

  constructor() {
    this.config = {
      apiKey: process.env.REACT_APP_DOUBLE_TICK_API_KEY || 'key_XAKKhG3Xdz',
      baseUrl: 'https://public.doubletick.io'
    };
  }

  // Initialize the service
  initialize(apiKey?: string): boolean {
    if (apiKey) {
      this.config.apiKey = apiKey;
    }

    // Check if we have the minimum required credentials
    if (!this.config.apiKey) {
      console.error('❌ WhatsApp Service: Missing API key');
      return false;
    }

    this.isInitialized = true;
    console.log('✅ WhatsApp Service: Initialized successfully');
    console.log(`📱 API Key: ${this.config.apiKey.substring(0, 10)}...`);
    return true;
  }

  // Send immediate WhatsApp message using template
  async sendMessage(phoneNumber: string, message: string): Promise<boolean> {
    if (!this.isInitialized) {
      console.error('❌ WhatsApp Service: Not initialized');
      return false;
    }

    try {
      const response = await fetch(`${this.config.baseUrl}/whatsapp/message/template`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'Authorization': this.config.apiKey
        },
        body: JSON.stringify({
          messages: [{
            to: phoneNumber,
            content: {
              templateName: "Task Reminder",
              language: "en_GB",
              templateData: {
                header: { type: "TEXT" },
                body: { placeholders: ["1", "2", "3", "4", "5"] }
              }
            }
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ WhatsApp template message sent:', result);
      return true;
    } catch (error) {
      console.error('❌ WhatsApp Service: Error sending template message:', error);
      return false;
    }
  }

  // Schedule a reminder message
  async scheduleReminder(reminder: ReminderMessage): Promise<boolean> {
    if (!this.isInitialized) {
      console.error('❌ WhatsApp Service: Not initialized');
      return false;
    }

    try {
      // For now, we'll send immediately since Double Tick might not support scheduling
      // In production, you might want to use a cron job or cloud function
      return await this.sendMessage(reminder.phoneNumber, reminder.message);
    } catch (error) {
      console.error('❌ WhatsApp Service: Error scheduling reminder:', error);
      return false;
    }
  }

  // Generate reminder message for a task
  generateReminderMessage(task: Task, phoneNumber: string): ReminderMessage {
    if (!task.id) {
      throw new Error('Task ID is required to generate reminder message');
    }
    
    const dueDate = new Date(task.dueDate);
    const formattedDate = dueDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const priorityEmoji = {
      'high': '🔴',
      'medium': '🟡',
      'low': '🟢'
    }[task.priority] || '⚪';

    const message = `🔔 *Task Reminder*\n\n` +
      `*${task.title}*\n\n` +
      `📝 ${task.description || 'No description'}\n` +
      `📅 Due: ${formattedDate}\n` +
      `🎯 Priority: ${priorityEmoji} ${task.priority.toUpperCase()}\n` +
      `👥 Type: ${task.taskType}\n\n` +
      `Please complete this task before the due date!\n\n` +
      `_Sent via Task Manager App_`;

    return {
      taskId: task.id,
      taskTitle: task.title,
      dueDate: task.dueDate,
      priority: task.priority,
      phoneNumber,
      message,
      scheduledTime: new Date()
    };
  }

  // Send task reminder using template
  async sendTaskReminder(task: Task, phoneNumber: string): Promise<boolean> {
    if (!this.isInitialized) {
      console.error('❌ WhatsApp Service: Not initialized');
      return false;
    }

    try {
      // Format dates for template
      const scheduledDate = new Date(task.dueDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      
      const dueDate = new Date(task.dueDate).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });

      // Get user display name (you might need to fetch this)
      const userName = "User"; // This will be placeholder 1

      const response = await fetch(`${this.config.baseUrl}/whatsapp/message/template`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'Authorization': this.config.apiKey
        },
        body: JSON.stringify({
          messages: [{
            to: phoneNumber,
            content: {
              templateName: "Task Reminder",
              language: "en_GB",
              templateData: {
                header: { type: "TEXT" },
                body: { 
                  placeholders: [
                    userName,                    // {{1}} - User Name
                    task.title,                 // {{2}} - Task Name
                    scheduledDate,              // {{3}} - Scheduled Date
                    task.priority.toUpperCase(), // {{4}} - Priority Level
                    dueDate                     // {{5}} - Due Date
                  ]
                }
              }
            }
          }]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Task reminder template sent:', result);
      return true;
    } catch (error) {
      console.error('❌ WhatsApp Service: Error sending task reminder template:', error);
      return false;
    }
  }

  // Send reminder for overdue tasks
  async sendOverdueReminder(task: Task, phoneNumber: string): Promise<boolean> {
    const overdueMessage = `🚨 *URGENT: Overdue Task*\n\n` +
      `*${task.title}*\n\n` +
      `This task was due on ${new Date(task.dueDate).toLocaleDateString()} and is now overdue!\n\n` +
      `Please complete it as soon as possible.\n\n` +
      `_Sent via Task Manager App_`;

    return await this.sendMessage(phoneNumber, overdueMessage);
  }

  // Check if phone number is valid
  isValidPhoneNumber(phoneNumber: string): boolean {
    // Remove all non-digit characters
    const cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Check if it's a valid length (10-15 digits)
    if (cleanNumber.length < 10 || cleanNumber.length > 15) {
      return false;
    }

    // Check if it starts with a valid country code or is a local number
    return /^(\+?[1-9]\d{0,14}|\d{10,15})$/.test(cleanNumber);
  }

  // Format phone number for WhatsApp
  formatPhoneNumber(phoneNumber: string): string {
    let formatted = phoneNumber.replace(/\D/g, '');
    
    // If it's a 10-digit Indian number, add +91
    if (formatted.length === 10 && (formatted.startsWith('6') || formatted.startsWith('7') || formatted.startsWith('8') || formatted.startsWith('9'))) {
      formatted = '+91' + formatted;
    }
    // If it's already 12 digits and starts with 91, add +
    else if (formatted.length === 12 && formatted.startsWith('91')) {
      formatted = '+' + formatted;
    }
    // If it's 11 digits and starts with 0, remove 0 and add +91
    else if (formatted.length === 11 && formatted.startsWith('0')) {
      formatted = '+91' + formatted.substring(1);
    }
    
    return formatted;
  }

  // Get service status
  getStatus(): { initialized: boolean; hasCredentials: boolean } {
    return {
      initialized: this.isInitialized,
      hasCredentials: !!this.config.apiKey
    };
  }
}

// Export singleton instance
export const whatsAppService = new WhatsAppService();
export default WhatsAppService;
