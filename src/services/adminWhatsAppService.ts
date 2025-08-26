// Admin WhatsApp Service for Task Creation Notifications
// Automatically sends WhatsApp messages when admin creates tasks
// Includes task link and double tick functionality

import { db } from '../config';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { userPhoneService } from './userPhoneService';

interface AdminTaskNotification {
  taskId: string;
  taskTitle: string;
  taskDescription: string;
  teamId: string | null;
  teamName: string;
  assignedTo: string;
  assignedToName: string;
  priority: string;
  dueDate: Date;
  taskLink: string;
  createdAt: Date;
}

interface WhatsAppConfig {
  apiKey: string;
  baseUrl: string;
}

interface UserData {
  id: string;
  displayName: string;
  email: string;
  phoneNumber?: string;
  phoneNumberVerified?: boolean;
}

interface TeamData {
  id: string;
  name: string;
  description: string;
  members: string[];
}

class AdminWhatsAppService {
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
      console.error('❌ Admin WhatsApp Service: Missing API key');
      return false;
    }

    this.isInitialized = true;
    console.log('✅ Admin WhatsApp Service: Initialized successfully');
    console.log(`📱 API Key: ${this.config.apiKey.substring(0, 10)}...`);
    return true;
  }

  // 🎯 MAIN METHOD: Send WhatsApp notification when admin creates a task
  async sendTaskCreationNotification(
    taskData: AdminTaskNotification,
    userId: string
  ): Promise<{
    success: boolean;
    message: string;
    sentTo: string[];
    failedTo: string[];
    error?: string;
  }> {
    try {
      console.log('🚀 Admin WhatsApp: Sending task creation notification...');
      console.log('📋 Task:', taskData.taskTitle);
      console.log('👥 Team:', taskData.teamName);
      console.log('👤 Assigned to:', taskData.assignedToName);

      // 1. Get user's phone number
      const userPhoneNumber = await this.getUserPhoneNumber(userId);
      
      if (!userPhoneNumber) {
        console.log('⚠️ Admin WhatsApp: User has no phone number, skipping WhatsApp notification');
        return {
          success: false,
          message: 'User has no phone number configured',
          sentTo: [],
          failedTo: [userId],
          error: 'No phone number found'
        };
      }

      // 3. Send WhatsApp message using approved template
      console.log('📱 Admin WhatsApp: About to send WhatsApp message with data:', {
        phoneNumber: userPhoneNumber,
        taskTitle: taskData.taskTitle,
        assignedToName: taskData.assignedToName,
        priority: taskData.priority,
        dueDate: taskData.dueDate,
        createdAt: taskData.createdAt
      });
      
      const whatsappResult = await this.sendWhatsAppMessage(userPhoneNumber, taskData);
      
      if (whatsappResult.success) {
        console.log('✅ Admin WhatsApp: Task creation notification sent successfully!');
        console.log('📱 To:', userPhoneNumber);
        console.log('📋 Task:', taskData.taskTitle);
        
        return {
          success: true,
          message: 'WhatsApp notification sent successfully',
          sentTo: [userId],
          failedTo: [],
        };
      } else {
        console.error('❌ Admin WhatsApp: Failed to send WhatsApp notification');
        console.error('📱 Error:', whatsappResult.error);
        
        return {
          success: false,
          message: 'Failed to send WhatsApp notification',
          sentTo: [],
          failedTo: [userId],
          error: whatsappResult.error
        };
      }

    } catch (error) {
      console.error('❌ Admin WhatsApp: Error sending task creation notification:', error);
      return {
        success: false,
        message: 'Error sending WhatsApp notification',
        sentTo: [],
        failedTo: [userId],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // 🎯 MAIN METHOD: Send WhatsApp notification to team members when admin creates a group task
  async sendTeamTaskCreationNotification(
    taskData: AdminTaskNotification
  ): Promise<{
    success: boolean;
    message: string;
    sentTo: string[];
    failedTo: string[];
    totalMembers: number;
  }> {
    try {
      console.log('🚀 Admin WhatsApp: Sending team task creation notification...');
      console.log('📋 Task:', taskData.taskTitle);
      console.log('👥 Team:', taskData.teamName);

      // Check if this is a team task
      if (!taskData.teamId) {
        console.log('⚠️ Admin WhatsApp: No team ID provided, cannot send team notification');
        return {
          success: false,
          message: 'No team ID provided',
          sentTo: [],
          failedTo: [],
          totalMembers: 0
        };
      }

      // 1. Get team members
      const teamMembers = await this.getTeamMembers(taskData.teamId);
      
      if (teamMembers.length === 0) {
        console.log('⚠️ Admin WhatsApp: No team members found');
        return {
          success: false,
          message: 'No team members found',
          sentTo: [],
          failedTo: [],
          totalMembers: 0
        };
      }

      console.log(`👥 Found ${teamMembers.length} team members`);

      // 2. Send notifications to each member
      const results = await Promise.allSettled(
        teamMembers.map(member => 
          this.sendTaskCreationNotification(taskData, member.id)
        )
      );

      // 3. Process results
      const sentTo: string[] = [];
      const failedTo: string[] = [];

      results.forEach((result, index) => {
        const member = teamMembers[index];
        if (result.status === 'fulfilled' && result.value.success) {
          sentTo.push(member.id);
        } else {
          failedTo.push(member.id);
        }
      });

      console.log(`✅ Admin WhatsApp: Team notifications completed`);
      console.log(`📱 Sent to: ${sentTo.length} members`);
      console.log(`❌ Failed to: ${failedTo.length} members`);

      return {
        success: sentTo.length > 0,
        message: `Notifications sent to ${sentTo.length}/${teamMembers.length} team members`,
        sentTo,
        failedTo,
        totalMembers: teamMembers.length
      };

    } catch (error) {
      console.error('❌ Admin WhatsApp: Error sending team task creation notification:', error);
      return {
        success: false,
        message: 'Error sending team notifications',
        sentTo: [],
        failedTo: [],
        totalMembers: 0
      };
    }
  }

  // 🔍 Get user's phone number using the phone service (Amazon-style: auto-detect)
  private async getUserPhoneNumber(userId: string): Promise<string | null> {
    try {
      // Use the dedicated phone service to get phone number
      const phoneNumber = await userPhoneService.getUserPhoneNumber(userId);
      
      if (phoneNumber) {
        console.log(`✅ Admin WhatsApp: Found phone number for user ${userId}: ${phoneNumber}`);
        return phoneNumber;
      }
      
      console.log(`⚠️ Admin WhatsApp: User ${userId} has no phone number available`);
      return null;

    } catch (error) {
      console.error(`❌ Admin WhatsApp: Error getting phone number for user ${userId}:`, error);
      return null;
    }
  }

  // 🔍 Get team members from Firestore
  private async getTeamMembers(teamId: string): Promise<UserData[]> {
    try {
      const teamDoc = await getDoc(doc(db, 'teams', teamId));
      
      if (!teamDoc.exists()) {
        console.log(`⚠️ Admin WhatsApp: Team ${teamId} not found`);
        return [];
      }

      const teamData = teamDoc.data() as TeamData;
      const memberIds = teamData.members || [];

      if (memberIds.length === 0) {
        console.log(`⚠️ Admin WhatsApp: Team ${teamId} has no members`);
        return [];
      }

      // Get member details
      const memberPromises = memberIds.map(async (memberId) => {
        try {
          const memberDoc = await getDoc(doc(db, 'users', memberId));
          if (memberDoc.exists()) {
            return memberDoc.data() as UserData;
          }
          return null;
        } catch (error) {
          console.error(`❌ Admin WhatsApp: Error getting member ${memberId}:`, error);
          return null;
        }
      });

      const members = (await Promise.all(memberPromises)).filter(Boolean) as UserData[];
      
      // Amazon-style: Use any available phone numbers (no manual verification required)
      const membersWithPhone = members.filter(member => 
        member.phoneNumber && member.phoneNumberVerified !== false // Just need phone number, no verification required
      );

      console.log(`✅ Admin WhatsApp: Found ${membersWithPhone.length} team members with phone numbers`);
      return membersWithPhone;

    } catch (error) {
      console.error(`❌ Admin WhatsApp: Error getting team members for team ${teamId}:`, error);
      return [];
    }
  }



  // 📱 Send WhatsApp message using Double Tick API with approved template
  private async sendWhatsAppMessage(
    phoneNumber: string, 
    taskData: AdminTaskNotification
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.isInitialized) {
      return { success: false, error: 'Service not initialized' };
    }

    // Validate required task data fields
    if (!taskData.assignedToName || !taskData.taskTitle || !taskData.priority) {
      console.error('❌ Admin WhatsApp: Missing required task data fields:', {
        assignedToName: taskData.assignedToName,
        taskTitle: taskData.taskTitle,
        priority: taskData.priority
      });
      return { success: false, error: 'Missing required task data fields' };
    }

    try {
      // Format phone number to ensure it's in the correct format
      let formattedPhoneNumber = phoneNumber;
      if (!phoneNumber.startsWith('+')) {
        // Add country code if not present
        if (phoneNumber.startsWith('91')) {
          formattedPhoneNumber = `+${phoneNumber}`;
        } else if (phoneNumber.startsWith('9')) {
          formattedPhoneNumber = `+91${phoneNumber}`;
        } else {
          formattedPhoneNumber = `+91${phoneNumber}`;
        }
      }
      
      console.log(`📱 Admin WhatsApp: Sending template message to ${formattedPhoneNumber} (original: ${phoneNumber})`);
      console.log('📱 Admin WhatsApp: Raw taskData received:', {
        assignedToName: taskData.assignedToName,
        taskTitle: taskData.taskTitle,
        priority: taskData.priority,
        createdAt: taskData.createdAt,
        dueDate: taskData.dueDate,
        createdAtType: typeof taskData.createdAt,
        dueDateType: typeof taskData.dueDate
      });
      
      // Format dates for template variables with null checks and better validation
      let scheduledDate = 'No date set';
      let dueDate = 'No due date';
      
      try {
        if (taskData.createdAt) {
          const createdAt = taskData.createdAt instanceof Date ? taskData.createdAt : new Date(taskData.createdAt);
          if (!isNaN(createdAt.getTime())) {
            scheduledDate = createdAt.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
          }
        }
      } catch (error) {
        console.warn('⚠️ Admin WhatsApp: Error formatting createdAt date:', error);
        scheduledDate = 'No date set';
      }
      
      try {
        if (taskData.dueDate) {
          const dueDateObj = taskData.dueDate instanceof Date ? taskData.dueDate : new Date(taskData.dueDate);
          if (!isNaN(dueDateObj.getTime())) {
            dueDate = dueDateObj.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            });
          }
        }
      } catch (error) {
        console.warn('⚠️ Admin WhatsApp: Error formatting dueDate date:', error);
        dueDate = 'No due date';
      }

      // Ensure all placeholder values are valid strings - MUST have exactly 5 placeholders for template
      const placeholders = [
        (taskData.assignedToName || 'Unknown User').toString().trim(),           // {{1}} - User Name
        (taskData.taskTitle || 'Untitled Task').toString().trim(),               // {{2}} - Task Name
        scheduledDate.toString().trim(),                                         // {{3}} - Scheduled Date
        (taskData.priority || 'medium').toString().toUpperCase().trim(),         // {{4}} - Priority Level
        dueDate.toString().trim()                                                // {{5}} - Due Date
      ].map(p => {
        // Ensure no placeholder is empty or just whitespace
        if (!p || p.trim() === '') {
          return 'N/A';
        }
        return p;
      });

      // Log the prepared placeholders for debugging
      console.log('📱 Admin WhatsApp: Prepared placeholders:', placeholders);
      console.log('📱 Admin WhatsApp: Placeholder count:', placeholders.length);
      console.log('📱 Admin WhatsApp: Placeholder details:', {
        '{{1}} - User Name': placeholders[0],
        '{{2}} - Task Name': placeholders[1],
        '{{3}} - Scheduled Date': placeholders[2],
        '{{4}} - Priority Level': placeholders[3],
        '{{5}} - Due Date': placeholders[4]
      });
      
      // Validate that we have exactly 5 placeholders as required by the template
      if (placeholders.length !== 5) {
        console.error('❌ Admin WhatsApp: Invalid placeholder count. Expected 5, got:', placeholders.length);
        return { success: false, error: `Invalid placeholder count: ${placeholders.length}, expected 5` };
      }
      
      // Validate that no placeholder is empty
      const emptyPlaceholders = placeholders.findIndex(p => !p || p.trim() === '');
      if (emptyPlaceholders !== -1) {
        console.error('❌ Admin WhatsApp: Empty placeholder found at index:', emptyPlaceholders);
        console.error('❌ Admin WhatsApp: Placeholder value:', placeholders[emptyPlaceholders]);
        return { success: false, error: `Empty placeholder at index ${emptyPlaceholders}` };
      }
      
      // Final validation - ensure all placeholders are valid strings
      const invalidPlaceholders = placeholders.findIndex(p => typeof p !== 'string' || p.length === 0);
      if (invalidPlaceholders !== -1) {
        console.error('❌ Admin WhatsApp: Invalid placeholder found at index:', invalidPlaceholders);
        console.error('❌ Admin WhatsApp: Placeholder value:', placeholders[invalidPlaceholders]);
        console.error('❌ Admin WhatsApp: Placeholder type:', typeof placeholders[invalidPlaceholders]);
        return { success: false, error: `Invalid placeholder at index ${invalidPlaceholders}` };
      }

      // Try the exact structure from your working curl example
      const requestBody = {
        messages: [{
          to: "", // Empty "to" field like your working curl example
          content: {
            templateName: "task_remainder",
            language: "en_GB",
            templateData: {
              header: { type: "TEXT" },
              body: { 
                placeholders: placeholders
              }
            }
          }
        }]
      };
      
      // Also try with the exact test values from your curl example
      const testRequestBody = {
        messages: [{
          to: "", // Empty "to" field like your working curl example
          content: {
            templateName: "task_remainder",
            language: "en_GB",
            templateData: {
              header: { type: "TEXT" },
              body: { 
                placeholders: ["1", "2", "3", "4", "5"]
              }
            }
          }
        }]
      };
      
      console.log('📱 Admin WhatsApp: Sending request body:', JSON.stringify(requestBody, null, 2));
      
      const response = await fetch(`${this.config.baseUrl}/whatsapp/message/template`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'Authorization': this.config.apiKey
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`⚠️ Admin WhatsApp: First template attempt failed (${response.status}): ${errorText}`);
        
        // Try with alternative template names
        if (response.status === 400) {
          console.log('🔄 Admin WhatsApp: Trying alternative template names...');
          
          const alternativeTemplates = [
            "task_remainder", // Primary template name
            "task_reminder",  // Alternative spelling
            "Task_Reminder"   // Alternative format
          ];
          
          for (const templateName of alternativeTemplates) {
            console.log(`🔄 Admin WhatsApp: Trying template: ${templateName}`);
            
            const fallbackRequestBody = {
              messages: [{
                to: "", // Empty "to" field like your working curl example
                content: {
                  templateName: templateName,
                  language: "en_GB",
                  templateData: {
                    header: { type: "TEXT" },
                    body: { 
                      placeholders: placeholders
                    }
                  }
                }
              }]
            };
          
            console.log('🔄 Admin WhatsApp: Trying fallback request body:', JSON.stringify(fallbackRequestBody, null, 2));
            
            const fallbackResponse = await fetch(`${this.config.baseUrl}/whatsapp/message/template`, {
              method: 'POST',
              headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'Authorization': this.config.apiKey
              },
              body: JSON.stringify(fallbackRequestBody)
            });
            
            if (fallbackResponse.ok) {
              const fallbackResult = await fallbackResponse.json();
              console.log('✅ Admin WhatsApp: Fallback template succeeded:', fallbackResult);
              return { success: true };
            } else {
              const fallbackErrorText = await fallbackResponse.text();
              console.log(`❌ Admin WhatsApp: Fallback template also failed (${fallbackResponse.status}): ${fallbackErrorText}`);
            }
          }
          
          // Try with the exact test values from your curl example
          console.log('🔄 Admin WhatsApp: Trying exact test values from curl example...');
          const testRequestBody = {
            messages: [{
              to: formattedPhoneNumber,
              content: {
                templateName: "task_remainder",
                language: "en_GB",
                templateData: {
                  header: { type: "TEXT" },
                  body: { 
                    placeholders: ["1", "2", "3", "4", "5"]
                  }
                }
              }
            }]
          };
          
          console.log('🔄 Admin WhatsApp: Test request body (exact curl values):', JSON.stringify(testRequestBody, null, 2));
          
          const testResponse = await fetch(`${this.config.baseUrl}/whatsapp/message/template`, {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'content-type': 'application/json',
              'Authorization': this.config.apiKey
            },
            body: JSON.stringify(testRequestBody)
          });
          
          if (testResponse.ok) {
            const testResult = await testResponse.json();
            console.log('✅ Admin WhatsApp: Test values succeeded:', testResult);
            return { success: true };
          } else {
            const testErrorText = await testResponse.text();
            console.log(`❌ Admin WhatsApp: Test values also failed (${testResponse.status}): ${testErrorText}`);
          }
          
          // Try with a different template name that might exist
          console.log('🔄 Admin WhatsApp: Trying different template variations...');
          const templateVariations = [
            "task_remainder",
            "task_reminder", 
            "Task_Reminder",
            "task_notification",
            "new_task_notification"
          ];
          
          for (const templateName of templateVariations) {
            console.log(`🔄 Admin WhatsApp: Trying template: ${templateName}`);
            
            const variationRequestBody = {
              messages: [{
                to: formattedPhoneNumber,
                content: {
                  templateName: templateName,
                  language: "en_GB",
                  templateData: {
                    header: { type: "TEXT" },
                    body: { 
                      placeholders: placeholders
                    }
                  }
                }
              }]
            };
          
            console.log(`🔄 Admin WhatsApp: Template variation ${templateName}:`, JSON.stringify(variationRequestBody, null, 2));
            
            const variationResponse = await fetch(`${this.config.baseUrl}/whatsapp/message/template`, {
              method: 'POST',
              headers: {
                'accept': 'application/json',
                'content-type': 'application/json',
                'Authorization': this.config.apiKey
              },
              body: JSON.stringify(variationRequestBody)
            });
            
            if (variationResponse.ok) {
              const variationResult = await variationResponse.json();
              console.log(`✅ Admin WhatsApp: Template variation ${templateName} succeeded:`, variationResult);
              return { success: true };
            } else {
              const variationErrorText = await variationResponse.text();
              console.log(`❌ Admin WhatsApp: Template variation ${templateName} failed (${variationResponse.status}): ${variationErrorText}`);
            }
          }
          
          // Try without header (maybe it's not needed)
          console.log('🔄 Admin WhatsApp: Trying without header...');
          const noHeaderRequestBody = {
            messages: [{
              to: formattedPhoneNumber,
              content: {
                templateName: "task_remainder",
                language: "en_GB",
                templateData: {
                  body: { 
                    placeholders: placeholders
                  }
                }
              }
            }]
          };
          
          console.log('🔄 Admin WhatsApp: No header request body:', JSON.stringify(noHeaderRequestBody, null, 2));
          
          const noHeaderResponse = await fetch(`${this.config.baseUrl}/whatsapp/message/template`, {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'content-type': 'application/json',
              'Authorization': this.config.apiKey
            },
            body: JSON.stringify(noHeaderRequestBody)
          });
          
          if (noHeaderResponse.ok) {
            const noHeaderResult = await noHeaderResponse.json();
            console.log('✅ Admin WhatsApp: No header request succeeded:', noHeaderResult);
            return { success: true };
          } else {
            const noHeaderErrorText = await noHeaderResponse.text();
            console.log(`❌ Admin WhatsApp: No header request failed (${noHeaderResponse.status}): ${noHeaderErrorText}`);
          }
          
          // Try with empty "to" field like your working curl example
          console.log('🔄 Admin WhatsApp: Trying with empty "to" field like your working curl...');
          const emptyToRequestBody = {
            messages: [{
              to: "",  // Empty like your working curl example
              content: {
                templateName: "task_remainder",
                language: "en_GB",
                templateData: {
                  header: { type: "TEXT" },
                  body: { 
                    placeholders: placeholders
                  }
                }
              }
            }]
          };
          
          console.log('🔄 Admin WhatsApp: Empty "to" field request body:', JSON.stringify(emptyToRequestBody, null, 2));
          
          const emptyToResponse = await fetch(`${this.config.baseUrl}/whatsapp/message/template`, {
            method: 'POST',
            headers: {
              'accept': 'application/json',
              'content-type': 'application/json',
              'Authorization': this.config.apiKey
            },
            body: JSON.stringify(emptyToRequestBody)
          });
          
          if (emptyToResponse.ok) {
            const emptyToResult = await emptyToResponse.json();
            console.log('✅ Admin WhatsApp: Empty "to" field request succeeded:', emptyToResult);
            return { success: true };
          } else {
            const emptyToErrorText = await emptyToResponse.text();
            console.log(`❌ Admin WhatsApp: Empty "to" field request failed (${emptyToResponse.status}): ${emptyToErrorText}`);
          }
        }
        
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Admin WhatsApp: Template message sent successfully:', result);
      console.log('📱 Admin WhatsApp: Full API response:', JSON.stringify(result, null, 2));
      
      // Check for any error messages in the response
      if (result.error || result.errors) {
        console.error('❌ Admin WhatsApp: API returned errors:', result.error || result.errors);
      }
      
      // Check if messages array exists and has content
      if (result.messages && Array.isArray(result.messages)) {
        console.log(`📱 Admin WhatsApp: Response contains ${result.messages.length} message(s)`);
        result.messages.forEach((msg: any, index: number) => {
          console.log(`📱 Admin WhatsApp: Message ${index + 1}:`, {
            id: msg.id,
            status: msg.status,
            error: msg.error,
            timestamp: msg.timestamp
          });
        });
      }
      
      // Check for message status in the response
      const messageStatus = result.messages?.[0]?.status || result.status;
      console.log(`📱 Admin WhatsApp: Message status: ${messageStatus}`);
      
      // Check for double tick (delivered status)
      if (messageStatus === 'delivered' || messageStatus === 'read') {
        console.log('✅ Admin WhatsApp: Double tick achieved! Message delivered/read');
      } else if (messageStatus === 'sent') {
        console.log('📤 Admin WhatsApp: Message sent successfully');
      } else if (messageStatus === 'failed') {
        console.log('❌ Admin WhatsApp: Message failed to send');
      } else {
        console.log(`📱 Admin WhatsApp: Unknown message status: ${messageStatus}`);
      }

      return { success: true };

    } catch (error) {
      console.error('❌ Admin WhatsApp: Error sending template message:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // 🔍 Check if user has WhatsApp configured (Amazon-style: auto-detect)
  async isUserWhatsAppReady(userId: string): Promise<boolean> {
    try {
      const phoneNumber = await this.getUserPhoneNumber(userId);
      return !!phoneNumber;
    } catch (error) {
      return false;
    }
  }



  // 📋 Get available templates from WhatsApp Business API
  async getAvailableTemplates(): Promise<{ success: boolean; templates?: any[]; error?: string }> {
    if (!this.isInitialized) {
      return { success: false, error: 'Service not initialized' };
    }

    try {
      console.log('📋 Admin WhatsApp: Fetching available templates...');
      
      const response = await fetch(`${this.config.baseUrl}/whatsapp/templates`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'Authorization': this.config.apiKey
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`⚠️ Admin WhatsApp: Failed to fetch templates (${response.status}): ${errorText}`);
        return { success: false, error: `HTTP ${response.status}: ${errorText}` };
      }

      const result = await response.json();
      console.log('✅ Admin WhatsApp: Available templates:', result);
      return { success: true, templates: result.templates || result };

    } catch (error) {
      console.error('❌ Admin WhatsApp: Error fetching templates:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // 🧪 Test method to verify template structure
  async testTemplateStructure(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
    if (!this.isInitialized) {
      return { success: false, error: 'Service not initialized' };
    }

    try {
      console.log('🧪 Admin WhatsApp: Testing template structure...');
      
      // Format phone number to ensure it's in the correct format
      let formattedPhoneNumber = phoneNumber;
      if (!phoneNumber.startsWith('+')) {
        // Add country code if not present
        if (phoneNumber.startsWith('91')) {
          formattedPhoneNumber = `+${phoneNumber}`;
        } else if (phoneNumber.startsWith('9')) {
          formattedPhoneNumber = `+91${phoneNumber}`;
        } else {
          formattedPhoneNumber = `+91${phoneNumber}`;
        }
      }
      
      console.log(`🧪 Admin WhatsApp: Testing with formatted phone number: ${formattedPhoneNumber} (original: ${phoneNumber})`);
      
      // Use the exact structure from your curl example
      const testRequestBody = {
        messages: [{
          to: formattedPhoneNumber,
          content: {
            templateName: "task_remainder",
            language: "en_GB",
            templateData: {
              header: { type: "TEXT" },
              body: {
                placeholders: ["1", "2", "3", "4", "5"]
              }
            }
          }
        }]
      };
      
      console.log('🧪 Admin WhatsApp: Test request body (exact curl structure):', JSON.stringify(testRequestBody, null, 2));
      
      console.log('🧪 Admin WhatsApp: Test request body:', JSON.stringify(testRequestBody, null, 2));
      
      const response = await fetch(`${this.config.baseUrl}/whatsapp/message/template`, {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'Authorization': this.config.apiKey
        },
        body: JSON.stringify(testRequestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Admin WhatsApp: Test template succeeded:', result);
      return { success: true };

    } catch (error) {
      console.error('❌ Admin WhatsApp: Test template failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // 🔍 Check if team has WhatsApp-ready members
  async isTeamWhatsAppReady(teamId: string): Promise<{
    ready: boolean;
    totalMembers: number;
    membersWithPhone: number;
  }> {
    try {
      const members = await this.getTeamMembers(teamId);
      return {
        ready: members.length > 0,
        totalMembers: members.length,
        membersWithPhone: members.length
      };
    } catch (error) {
      return {
        ready: false,
        totalMembers: 0,
        membersWithPhone: 0
      };
    }
  }

  // 🔧 Get service status
  getStatus(): { initialized: boolean; hasCredentials: boolean } {
    return {
      initialized: this.isInitialized,
      hasCredentials: !!this.config.apiKey
    };
  }
}

// Export singleton instance
export const adminWhatsAppService = new AdminWhatsAppService();
export default AdminWhatsAppService;
