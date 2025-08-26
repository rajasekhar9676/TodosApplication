# WhatsApp Integration Guide

This guide explains how to integrate WhatsApp Business API with the TodoPro application for sending task reminders.

## Overview

The WhatsApp reminder system allows users to:
- Send manual reminders for specific tasks
- Receive automatic reminders for overdue tasks
- Configure reminder settings and timing
- Track reminder history and delivery status

## Prerequisites

1. **WhatsApp Business Account** - Required for sending messages
2. **API Provider** - Choose one of the following:
   - **Twilio WhatsApp API** (Recommended for beginners)
   - **Meta WhatsApp Business API** (Direct integration)
   - **MessageBird** (Alternative provider)

## Option 1: Twilio WhatsApp API (Recommended)

### Step 1: Create Twilio Account
1. Go to [Twilio Console](https://console.twilio.com/)
2. Sign up for a free account
3. Get your Account SID and Auth Token

### Step 2: Enable WhatsApp Sandbox
1. In Twilio Console, go to **Messaging** → **Try it out** → **Send a WhatsApp message**
2. Follow instructions to join your WhatsApp sandbox
3. Note your WhatsApp number (usually +14155238886)

### Step 3: Update Configuration
Replace the placeholder in `whatsappReminderService.ts`:

```typescript
// Replace this placeholder implementation
private async sendWhatsAppMessage(phoneNumber: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.twilio.com/2010-04-01/Accounts/YOUR_ACCOUNT_SID/Messages.json', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa('YOUR_ACCOUNT_SID:YOUR_AUTH_TOKEN'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'From': 'whatsapp:+14155238886', // Your Twilio WhatsApp number
        'To': `whatsapp:${phoneNumber}`,
        'Body': message
      })
    });

    if (response.ok) {
      return { success: true };
    } else {
      const error = await response.json();
      return { success: false, error: error.message };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

### Step 4: Environment Variables
Create `.env` file in your project root:

```env
REACT_APP_TWILIO_ACCOUNT_SID=your_account_sid_here
REACT_APP_TWILIO_AUTH_TOKEN=your_auth_token_here
REACT_APP_TWILIO_WHATSAPP_NUMBER=+14155238886
```

## Option 2: Meta WhatsApp Business API

### Step 1: Create Meta Developer Account
1. Go to [Meta Developers](https://developers.facebook.com/)
2. Create a new app
3. Add WhatsApp Business API product

### Step 2: Get Access Token
1. In your app, go to **WhatsApp** → **Getting Started**
2. Generate a temporary access token
3. Note your Phone Number ID

### Step 3: Update Configuration
```typescript
private async sendWhatsAppMessage(phoneNumber: string, message: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`https://graph.facebook.com/v17.0/YOUR_PHONE_NUMBER_ID/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer YOUR_ACCESS_TOKEN`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: phoneNumber,
        type: 'text',
        text: { body: message }
      })
    });

    if (response.ok) {
      return { success: true };
    } else {
      const error = await response.json();
      return { success: false, error: error.error?.message };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
```

## Environment Configuration

### Production Setup
For production, use environment variables:

```typescript
// config.ts
export const WHATSAPP_CONFIG = {
  provider: process.env.REACT_APP_WHATSAPP_PROVIDER || 'twilio',
  accountSid: process.env.REACT_APP_TWILIO_ACCOUNT_SID,
  authToken: process.env.REACT_APP_TWILIO_AUTH_TOKEN,
  phoneNumber: process.env.REACT_APP_TWILIO_WHATSAPP_NUMBER,
  // Meta WhatsApp
  metaToken: process.env.REACT_APP_META_ACCESS_TOKEN,
  phoneNumberId: process.env.REACT_APP_META_PHONE_NUMBER_ID
};
```

## Message Templates

### Default Reminder Message
```
🔔 Task Reminder

📋 Task: {taskTitle}
👥 Team: {teamName}
⏰ Due: {dueDate}
👤 Assigned to: {userName}

Please complete this task on time!
```

### Overdue Task Message
```
🚨 URGENT: Task Overdue

📋 Task: {taskTitle}
👥 Team: {teamName}
⏰ Due: {dueDate}
👤 Assigned to: {userName}

⚠️ This task is overdue! Please complete it immediately.
```

## Customization

### Message Variables
You can customize messages using these variables:
- `{taskTitle}` - Task name
- `{teamName}` - Team name
- `{dueDate}` - Task due date
- `{userName}` - Assigned user name
- `{priority}` - Task priority
- `{status}` - Current task status

### Custom Message Examples
```typescript
// High priority task
const highPriorityMessage = `🚨 HIGH PRIORITY TASK\n\n${defaultMessage}\n\nPriority: 🔴 High\nPlease prioritize this task!`;

// Team collaboration
const teamMessage = `👥 Team Collaboration Needed\n\n${defaultMessage}\n\nPlease coordinate with your team members.`;
```

## Testing

### Sandbox Testing
1. Use Twilio WhatsApp sandbox for development
2. Test with your own WhatsApp number
3. Verify message delivery and formatting

### Production Testing
1. Test with real phone numbers
2. Verify message delivery timing
3. Check error handling and retry logic

## Error Handling

### Common Errors
- **Invalid phone number** - Check phone number format
- **Rate limiting** - Implement delays between messages
- **Authentication failed** - Verify API credentials
- **Message too long** - Truncate long messages

### Retry Logic
```typescript
private async sendWithRetry(phoneNumber: string, message: string, maxRetries = 3): Promise<{ success: boolean; error?: string }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await this.sendWhatsAppMessage(phoneNumber, message);
      if (result.success) return result;
      
      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    } catch (error) {
      if (attempt === maxRetries) {
        return { success: false, error: error.message };
      }
    }
  }
  return { success: false, error: 'Max retries exceeded' };
}
```

## Security Considerations

### Phone Number Validation
```typescript
private validatePhoneNumber(phoneNumber: string): boolean {
  // Basic validation - customize based on your needs
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phoneNumber.replace(/\s/g, ''));
}
```

### Rate Limiting
```typescript
private rateLimiter = new Map<string, number>();

private async checkRateLimit(phoneNumber: string): Promise<boolean> {
  const now = Date.now();
  const lastMessage = this.rateLimiter.get(phoneNumber) || 0;
  const timeDiff = now - lastMessage;
  
  // Allow only 1 message per 5 minutes per number
  if (timeDiff < 5 * 60 * 1000) {
    return false;
  }
  
  this.rateLimiter.set(phoneNumber, now);
  return true;
}
```

## Monitoring and Analytics

### Track Message Status
```typescript
interface MessageStatus {
  id: string;
  phoneNumber: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
  error?: string;
}

// Store in Firestore for analytics
await addDoc(collection(db, 'messageStatus'), messageStatus);
```

### Dashboard Metrics
- Total messages sent
- Delivery success rate
- Response rates
- Error patterns

## Troubleshooting

### Common Issues

1. **Messages not sending**
   - Check API credentials
   - Verify phone number format
   - Check rate limits

2. **Authentication errors**
   - Refresh access tokens
   - Verify account status
   - Check API permissions

3. **Message delivery delays**
   - Check provider status
   - Verify network connectivity
   - Review rate limiting settings

### Debug Mode
Enable debug logging:

```typescript
const DEBUG_MODE = process.env.NODE_ENV === 'development';

if (DEBUG_MODE) {
  console.log('📱 WhatsApp Debug:', {
    phoneNumber,
    message: message.substring(0, 100) + '...',
    timestamp: new Date().toISOString()
  });
}
```

## Support

For technical support:
- **Twilio**: [Support Documentation](https://www.twilio.com/docs/whatsapp)
- **Meta**: [WhatsApp Business API Docs](https://developers.facebook.com/docs/whatsapp)
- **MessageBird**: [API Documentation](https://developers.messagebird.com/)

## Next Steps

1. Choose your WhatsApp provider
2. Set up API credentials
3. Test with sandbox environment
4. Deploy to production
5. Monitor and optimize

Remember to comply with WhatsApp's messaging policies and respect user privacy preferences.





