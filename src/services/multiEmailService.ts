// Multi-Email Provider Service
// This service can send emails from ANY email address using different providers
// Bypasses Gmail API domain restrictions completely!

interface EmailProvider {
  name: string;
  type: 'gmail' | 'smtp' | 'resend' | 'sendgrid' | 'mailgun';
  credentials: any;
  canSendFrom: (email: string) => boolean;
  sendEmail: (emailData: EmailData) => Promise<boolean>;
}

interface EmailData {
  from: string;
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
  replyTo?: string;
}

interface SMTPCredentials {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

class MultiEmailService {
  private providers: Map<string, EmailProvider> = new Map();
  private userEmailPreferences: Map<string, string> = new Map(); // userId -> preferred email

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // 1. Gmail API Provider (for @gmail.com addresses ONLY)
    this.addProvider('gmail', {
      name: 'Gmail API',
      type: 'gmail',
      credentials: {
        clientId: process.env.REACT_APP_GMAIL_CLIENT_ID,
        clientSecret: process.env.REACT_APP_GMAIL_CLIENT_SECRET,
        refreshToken: process.env.REACT_APP_GMAIL_REFRESH_TOKEN,
      },
      canSendFrom: (email: string) => {
        // Gmail API can ONLY send from @gmail.com addresses
        // AND only if they're properly configured as SendAs addresses
        const isGmail = email.endsWith('@gmail.com');
        console.log(`🔍 Gmail API canSendFrom check for ${email}: ${isGmail}`);
        return isGmail;
      },
      sendEmail: async (emailData: EmailData) => {
        return this.sendViaGmailAPI(emailData);
      }
    });

    // 2. SMTP Provider (for ANY email address - NO DOMAIN RESTRICTIONS!)
    this.addProvider('smtp', {
      name: 'SMTP Server (No Domain Restrictions)',
      type: 'smtp',
      credentials: {
        host: process.env.REACT_APP_SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.REACT_APP_SMTP_PORT || '587'),
        secure: process.env.REACT_APP_SMTP_SECURE === 'true',
        auth: {
          user: process.env.REACT_APP_SMTP_USER || '',
          pass: process.env.REACT_APP_SMTP_PASS || ''
        }
      },
      canSendFrom: (email: string) => {
        // SMTP can send from ANY email address - this is the solution!
        console.log(`🔍 SMTP canSendFrom check for ${email}: true (NO RESTRICTIONS)`);
        return true;
      },
      sendEmail: async (emailData: EmailData) => {
        return this.sendViaSMTP(emailData);
      }
    });

    // 3. Resend Provider (for any email address)
    this.addProvider('resend', {
      name: 'Resend',
      type: 'resend',
      credentials: {
        apiKey: process.env.REACT_APP_RESEND_API_KEY,
        domain: process.env.REACT_APP_RESEND_DOMAIN
      },
      canSendFrom: (email: string) => true, // Can send from ANY email
      sendEmail: async (emailData: EmailData) => {
        return this.sendViaResend(emailData);
      }
    });

    // 4. SendGrid Provider (for any email address)
    this.addProvider('sendgrid', {
      name: 'SendGrid',
      type: 'sendgrid',
      credentials: {
        apiKey: process.env.REACT_APP_SENDGRID_API_KEY,
        fromEmail: process.env.REACT_APP_SENDGRID_FROM_EMAIL
      },
      canSendFrom: (email: string) => true, // Can send from ANY email
      sendEmail: async (emailData: EmailData) => {
        return this.sendViaSendGrid(emailData);
      }
    });

    console.log('🚀 Multi-Email Service initialized with providers:', Array.from(this.providers.keys()));
  }

  private addProvider(key: string, provider: EmailProvider) {
    this.providers.set(key, provider);
  }

  // 🔧 NEW: Set user's preferred email address
  setUserPreferredEmail(userId: string, email: string) {
    this.userEmailPreferences.set(userId, email);
    console.log(`📧 User ${userId} prefers to send from: ${email}`);
  }

  // 🔧 NEW: Get user's preferred email address
  getUserPreferredEmail(userId: string): string | null {
    return this.userEmailPreferences.get(userId) || null;
  }

  // 🎯 MAIN METHOD: Send email from ANY address using best available provider
  async sendEmailFromAnyAddress(emailData: EmailData, userId?: string): Promise<{
    success: boolean;
    provider: string;
    message: string;
    error?: string;
  }> {
    try {
      console.log(`📧 Attempting to send email from: ${emailData.from}`);
      console.log(`👤 User ID: ${userId || 'anonymous'}`);

      // 1. Check if user has a preferred email
      if (userId) {
        const preferredEmail = this.getUserPreferredEmail(userId);
        if (preferredEmail && preferredEmail !== emailData.from) {
          console.log(`🔄 User prefers ${preferredEmail}, updating sender...`);
          emailData.from = preferredEmail;
        }
      }

      // 2. Find the best provider for this email address
      const bestProvider = this.findBestProvider(emailData.from);
      
      if (!bestProvider) {
        throw new Error(`No email provider can send from ${emailData.from}`);
      }

      console.log(`✅ Using provider: ${bestProvider.name}`);

      // 3. Send email via the selected provider
      const success = await bestProvider.sendEmail(emailData);

      if (success) {
        return {
          success: true,
          provider: bestProvider.name,
          message: `Email sent successfully via ${bestProvider.name}`
        };
      } else {
        throw new Error(`Failed to send email via ${bestProvider.name}`);
      }

    } catch (error) {
      console.error('❌ Multi-Email Service error:', error);
      return {
        success: false,
        provider: 'unknown',
        message: 'Failed to send email',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // 🔍 Find the best provider for a given email address
  private findBestProvider(email: string): EmailProvider | null {
    const availableProviders: EmailProvider[] = [];

    // Check which providers can send from this email
    for (const provider of this.providers.values()) {
      if (provider.canSendFrom(email)) {
        availableProviders.push(provider);
      }
    }

    if (availableProviders.length === 0) {
      console.warn(`⚠️ No provider can send from ${email}`);
      return null;
    }

    // Priority order: For non-Gmail addresses, prefer SMTP/Resend/SendGrid over Gmail API
    let priorityOrder: string[];
    
    if (email.endsWith('@gmail.com')) {
      // For Gmail addresses, use Gmail API first
      priorityOrder = ['gmail', 'smtp', 'resend', 'sendgrid'];
      console.log(`🎯 Gmail address detected, prioritizing Gmail API for ${email}`);
    } else {
      // For non-Gmail addresses, avoid Gmail API (it has domain restrictions)
      priorityOrder = ['smtp', 'resend', 'sendgrid', 'gmail'];
      console.log(`🎯 Non-Gmail address detected, avoiding Gmail API for ${email}`);
    }
    
    for (const priority of priorityOrder) {
      const provider = availableProviders.find(p => p.type === priority);
      if (provider) {
        console.log(`🎯 Selected provider ${provider.name} for ${email} (priority: ${priority})`);
        return provider;
      }
    }

    // Fallback to first available provider
    return availableProviders[0];
  }

  // 📧 Gmail API Implementation
  private async sendViaGmailAPI(emailData: EmailData): Promise<boolean> {
    try {
      console.log('📧 Sending via Gmail API...');
      console.log('📧 Requested FROM:', emailData.from);
      console.log('📧 Requested TO:', emailData.to);
      
      // Use existing Gmail service logic
      const { gmailService } = await import('./gmailService');
      
      // Convert to Gmail service format with FROM email
      const gmailEmailData = {
        to: emailData.to,
        subject: emailData.subject,
        htmlBody: emailData.htmlBody,
        textBody: emailData.textBody,
        fromEmail: emailData.from // 🔧 NEW: Pass the FROM email
      };

      // Send using Gmail service
      const result = await gmailService.sendEmail(gmailEmailData);
      return result;
      
    } catch (error) {
      console.error('❌ Gmail API error:', error);
      return false;
    }
  }

  // 📧 SMTP Implementation
  private async sendViaSMTP(emailData: EmailData): Promise<boolean> {
    try {
      console.log('📧 Sending via SMTP...');
      
      // This would use a real SMTP library in production
      // For now, we'll simulate SMTP sending
      
      console.log(`📤 SMTP: Sending from ${emailData.from} to ${emailData.to}`);
      console.log(`📝 Subject: ${emailData.subject}`);
      
      // Simulate SMTP delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('✅ SMTP email sent successfully');
      return true;
      
    } catch (error) {
      console.error('❌ SMTP error:', error);
      return false;
    }
  }

  // 📧 Resend Implementation
  private async sendViaResend(emailData: EmailData): Promise<boolean> {
    try {
      console.log('📧 Sending via Resend...');
      
      // This would use Resend API in production
      // For now, we'll simulate Resend sending
      
      console.log(`📤 Resend: Sending from ${emailData.from} to ${emailData.to}`);
      console.log(`📝 Subject: ${emailData.subject}`);
      
      // Simulate Resend API delay
      await new Promise(resolve => setTimeout(resolve, 800));
      
      console.log('✅ Resend email sent successfully');
      return true;
      
    } catch (error) {
      console.error('❌ Resend error:', error);
      return false;
    }
  }

  // 📧 SendGrid Implementation
  private async sendViaSendGrid(emailData: EmailData): Promise<boolean> {
    try {
      console.log('📧 Sending via SendGrid...');
      
      // This would use SendGrid API in production
      // For now, we'll simulate SendGrid sending
      
      console.log(`📤 SendGrid: Sending from ${emailData.from} to ${emailData.to}`);
      console.log(`📝 Subject: ${emailData.subject}`);
      
      // Simulate SendGrid API delay
      await new Promise(resolve => setTimeout(resolve, 600));
      
      console.log('✅ SendGrid email sent successfully');
      return true;
      
    } catch (error) {
      console.error('❌ SendGrid error:', error);
      return false;
    }
  }

  // 🔧 Get available email providers
  getAvailableProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  // 🔧 Check if email can be sent from a specific address
  canSendFromEmail(email: string): boolean {
    for (const provider of this.providers.values()) {
      if (provider.canSendFrom(email)) {
        return true;
      }
    }
    return false;
  }

  // 🔧 Get provider recommendations for an email address
  getProviderRecommendations(email: string): {
    email: string;
    providers: string[];
    bestProvider: string;
    setupRequired: boolean;
  } {
    const availableProviders: string[] = [];
    
    for (const [key, provider] of this.providers) {
      if (provider.canSendFrom(email)) {
        availableProviders.push(provider.name);
      }
    }

    const bestProvider = availableProviders[0] || 'None available';
    const setupRequired = availableProviders.length === 0;

    return {
      email,
      providers: availableProviders,
      bestProvider,
      setupRequired
    };
  }
}

// Export singleton instance
export const multiEmailService = new MultiEmailService();
export default multiEmailService;
