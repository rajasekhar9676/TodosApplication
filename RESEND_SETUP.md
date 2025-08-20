# Resend Email Setup Guide

## Overview
This application uses Resend for sending team invitation emails. Follow these steps to configure email functionality.

## Step 1: Get Resend API Key

1. Go to [Resend.com](https://resend.com) and create a free account
2. Navigate to the API Keys section in your dashboard
3. Create a new API key
4. Copy the API key (it starts with `re_`)

## Step 2: Configure Environment Variables

1. Open the `.env` file in the root of your project
2. Replace `your_resend_api_key_here` with your actual Resend API key:

```env
REACT_APP_RESEND_API_KEY=re_your_actual_api_key_here
```

## Step 3: Configure Sender Domain (Optional but Recommended)

For production use, you should configure a custom domain in Resend:

1. In your Resend dashboard, go to Domains
2. Add your domain (e.g., `yourdomain.com`)
3. Follow the DNS configuration instructions
4. Update the `from` email in `src/services/invitationService.ts`:

```typescript
from: 'TodoPro <rajasekharm2268@gmail.com>',
```

## Step 4: Test Email Functionality

1. Start the development server: `npm start`
2. Create a team and invite a user with an email address
3. Check the browser console for email sending logs
4. The invited user should receive a beautiful HTML email

## Troubleshooting

### Email Not Sending
- Check that your Resend API key is correct
- Verify the API key is properly set in the `.env` file
- Check browser console for error messages
- Ensure you're not using a test domain without proper configuration

### CORS Issues
If you encounter CORS issues, you may need to:
1. Use a backend proxy
2. Configure CORS headers in your development server
3. Use Firebase Functions as an alternative

### Rate Limits
Resend free tier includes:
- 3,000 emails per month
- 100 emails per day
- 10 emails per second

## Alternative Email Services

If you prefer to use a different email service, you can modify the `sendEmailViaResend` function in `src/services/invitationService.ts` to use:

- **SendGrid**: Replace the fetch call with SendGrid API
- **AWS SES**: Use AWS SDK for JavaScript
- **EmailJS**: For client-side email sending
- **Firebase Functions**: Create a Cloud Function with Nodemailer

## Security Notes

- Never commit your API keys to version control
- Use environment variables for all sensitive configuration
- Consider using Firebase Functions for server-side email sending in production
- Implement rate limiting to prevent abuse

## Production Considerations

For production deployment:

1. Use a custom domain for sending emails
2. Implement proper error handling and retry logic
3. Add email templates for different scenarios
4. Set up email tracking and analytics
5. Configure SPF, DKIM, and DMARC records
6. Monitor email delivery rates and bounces 