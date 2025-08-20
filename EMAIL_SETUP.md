# Email Setup Guide for TodoPro

## Current Implementation

The invitation system is now working with the following features:

1. **Invitation Storage**: Invitations are stored in Firestore with status tracking
2. **Team Integration**: Invitations are linked to teams and users
3. **Acceptance/Decline**: Users can accept or decline invitations
4. **Basic Email Notification**: Currently logs email content to console

## Setting Up Real Email Sending

### Option 1: EmailJS (Recommended for React apps)

1. **Sign up at [EmailJS](https://www.emailjs.com/)**
2. **Create an Email Service**:
   - Go to Email Services
   - Add a new service (Gmail, Outlook, etc.)
   - Follow the setup instructions

3. **Create an Email Template**:
   - Go to Email Templates
   - Create a new template
   - Use variables: `{{to_email}}`, `{{team_name}}`, `{{inviter_name}}`, `{{role}}`, `{{accept_link}}`, `{{decline_link}}`

4. **Update Configuration**:
   - Open `src/services/invitationService.ts`
   - Replace the placeholder values:
     ```typescript
     const EMAILJS_SERVICE_ID = 'your_service_id';
     const EMAILJS_TEMPLATE_ID = 'your_template_id';
     const EMAILJS_PUBLIC_KEY = 'your_public_key';
     ```

### Option 2: Firebase Functions with Nodemailer

1. **Install Firebase CLI**: `npm install -g firebase-tools`
2. **Initialize Firebase Functions**: `firebase init functions`
3. **Install Nodemailer**: `cd functions && npm install nodemailer`
4. **Create email function** in `functions/index.js`:
   ```javascript
   const functions = require('firebase-functions');
   const nodemailer = require('nodemailer');

   exports.sendInvitationEmail = functions.https.onCall(async (data, context) => {
     // Email sending logic here
   });
   ```

### Option 3: SendGrid API

1. **Sign up at [SendGrid](https://sendgrid.com/)**
2. **Get API Key** from SendGrid dashboard
3. **Create a backend API** or use Firebase Functions
4. **Update the invitation service** to use SendGrid API

## Testing the Invitation System

1. **Create a team** and invite someone by email
2. **Check the console** for the email content (currently logged)
3. **Test invitation acceptance** by navigating to `/invite/accept/{invitationId}`

## Current Features

✅ **Working Features**:
- Invitation creation and storage in Firestore
- Team member management
- Invitation acceptance/decline
- User role assignment
- Basic email content generation

🔄 **To Complete**:
- Real email sending (choose one of the options above)
- Email template customization
- Invitation expiration handling
- Email verification

## Security Considerations

- Invitations expire after 7 days
- Only team admins can send invitations
- Invitations are validated before acceptance
- User authentication required for acceptance

## Troubleshooting

1. **Invitation not sending**: Check console for errors
2. **Email not received**: Verify email service configuration
3. **Acceptance fails**: Check Firestore permissions
4. **404 errors**: Ensure all routes are properly configured

## Next Steps

1. Choose and implement an email service
2. Customize email templates
3. Add email verification
4. Implement invitation management UI
5. Add bulk invitation features 