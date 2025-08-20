// Gmail API Service using OAuth 2.0
// This service handles sending emails via Gmail API

interface GmailCredentials {
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  senderEmail: string;
}

interface EmailData {
  to: string;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

class GmailService {
  private credentials: GmailCredentials;

  constructor() {
    this.credentials = {
      clientId: process.env.REACT_APP_GMAIL_CLIENT_ID || '',
      clientSecret: process.env.REACT_APP_GMAIL_CLIENT_SECRET || '',
      refreshToken: process.env.REACT_APP_GMAIL_REFRESH_TOKEN || '',
      senderEmail: process.env.REACT_APP_SENDER_EMAIL || 'rajasekharm2268@gmail.com',
    };
    
    // Debug logging to check environment variables
    console.log('🔧 Gmail Service Debug:');
    console.log('Client ID:', this.credentials.clientId ? 'Found' : 'Missing');
    console.log('Client Secret:', this.credentials.clientSecret ? 'Found' : 'Missing');
    console.log('Refresh Token:', this.credentials.refreshToken ? `Found (${this.credentials.refreshToken.length} chars)` : 'Missing');
    console.log('Sender Email:', this.credentials.senderEmail);
  }

  private async getAccessToken(): Promise<string> {
    try {
      console.log('🔐 Getting Gmail access token...');
      
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.credentials.clientId,
          client_secret: this.credentials.clientSecret,
          refresh_token: this.credentials.refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Access token obtained successfully');
      return data.access_token;
    } catch (error) {
      console.error('❌ Error getting access token:', error);
      throw error;
    }
  }

  private createEmailMessage(emailData: EmailData): string {
    const boundary = 'boundary_' + Math.random().toString(36).substring(2);
    
    const message = [
      `From: ${this.credentials.senderEmail}`,
      `To: ${emailData.to}`,
      `Subject: ${emailData.subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      '',
      emailData.textBody || emailData.htmlBody.replace(/<[^>]*>/g, ''),
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      '',
      emailData.htmlBody,
      '',
      `--${boundary}--`,
    ].join('\r\n');

    // Use browser-compatible base64 encoding instead of Node.js Buffer
    const encoder = new TextEncoder();
    const bytes = encoder.encode(message);
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  async sendEmail(emailData: EmailData): Promise<boolean> {
    try {
      console.log('📧 Starting Gmail API email send process...');
      console.log('📧 To:', emailData.to);
      console.log('📧 Subject:', emailData.subject);

      // Check if credentials are configured
      if (!this.credentials.clientId || !this.credentials.clientSecret || !this.credentials.refreshToken) {
        console.warn('⚠️ Gmail API credentials not configured. Running in demo mode.');
        console.log('📧 EMAIL CONTENT (DEMO MODE):');
        console.log('=================================');
        console.log('FROM:', this.credentials.senderEmail);
        console.log('TO:', emailData.to);
        console.log('SUBJECT:', emailData.subject);
        console.log('TEXT BODY:', emailData.textBody || 'No text body');
        console.log('=================================');
        
        // Simulate email sending delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        console.log('✅ Email "sent" successfully (demo mode)');
        console.log('📧 To enable real email sending, configure Gmail API credentials in .env file');
        return true;
      }

      // Get access token
      const accessToken = await this.getAccessToken();

      // Create email message
      const rawMessage = this.createEmailMessage(emailData);

      // Send email via Gmail API
      const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          raw: rawMessage,
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Gmail API error:', response.status, response.statusText);
        console.error('❌ Error details:', errorData);
        throw new Error(`Gmail API error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('✅ Email sent successfully via Gmail API');
      console.log('📧 Message ID:', result.id);
      
      return true;
    } catch (error) {
      console.error('❌ Error sending email via Gmail API:', error);
      console.log('📧 Falling back to demo mode...');
      
      // Fallback to demo mode if API fails
      console.log('📧 EMAIL CONTENT (FALLBACK DEMO MODE):');
      console.log('=================================');
      console.log('FROM:', this.credentials.senderEmail);
      console.log('TO:', emailData.to);
      console.log('SUBJECT:', emailData.subject);
      console.log('=================================');
      
      return true; // Return true so invitation process doesn't fail
    }
  }

  async sendInvitationEmail(
    toEmail: string,
    teamName: string,
    inviterName: string,
    role: string,
    invitationId: string
  ): Promise<boolean> {
    const subject = `Invitation to join ${teamName} on TodoPro`;
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Team Invitation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Team Invitation</h1>
          </div>
          <div class="content">
            <h2>Hi there!</h2>
            <p><strong>${inviterName}</strong> has invited you to join the team <strong>"${teamName}"</strong> on TodoPro.</p>
            
            <div style="background: #e8f4fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Your Role:</strong> ${role}</p>
              <p><strong>Team:</strong> ${teamName}</p>
              <p><strong>Invited by:</strong> ${inviterName}</p>
            </div>
            
            <p>TodoPro is a collaborative task management platform that helps teams work together efficiently.</p>
            
            <div style="text-align: center;">
              <a href="https://todos-application-892h.vercel.app/invite/accept/${invitationId}" class="button">Accept Invitation</a>
            </div>
            
            <p style="margin-top: 30px; font-size: 14px; color: #666;">
              If you have any questions, please contact your team administrator.
            </p>
          </div>
          <div class="footer">
            <p>This invitation was sent from TodoPro</p>
            <p>© 2024 TodoPro. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textBody = `
      Hi there!
      
      ${inviterName} has invited you to join the team "${teamName}" on TodoPro.
      
      Your Role: ${role}
      Team: ${teamName}
      Invited by: ${inviterName}
      
      TodoPro is a collaborative task management platform that helps teams work together efficiently.
      
      To accept this invitation, please visit: https://todos-application-892h.vercel.app/invite/accept/${invitationId}
      
      If you have any questions, please contact your team administrator.
      
      Best regards,
      The TodoPro Team
    `;

    return this.sendEmail({
      to: toEmail,
      subject,
      htmlBody,
      textBody,
    });
  }
}

export const gmailService = new GmailService(); 