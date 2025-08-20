# Gmail API Setup Guide for TodoPro

This guide will help you set up Gmail API to send invitation emails from your Gmail account (rajasekharm2268@gmail.com).

## 🚀 Quick Setup (5 minutes)

**Option 1: Automated Setup (Recommended)**
```powershell
# Run the setup script
.\setup-gmail-env.ps1
```

**Option 2: Manual Setup**

### Step 1: Enable Gmail API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"

### Step 2: Create OAuth 2.0 Credentials
1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Add authorized redirect URIs:
   - `http://localhost:3000`
   - `http://localhost:3000/auth/callback`
5. Copy the **Client ID** and **Client Secret**

### Step 3: Get Refresh Token
1. Go to [Gmail API OAuth Playground](https://developers.google.com/oauthplayground/)
2. Click the settings icon (⚙️) in the top right
3. Check "Use your own OAuth credentials"
4. Enter your Client ID and Client Secret
5. Close settings
6. In the left panel, find "Gmail API v1" and select:
   - `https://mail.google.com/`
7. Click "Authorize APIs"
8. Sign in with your Gmail account
9. Click "Exchange authorization code for tokens"
10. Copy the **Refresh Token**

### Step 4: Update Environment Variables
Add these to your `.env` file:

```env
# Gmail API Configuration
REACT_APP_GMAIL_API_KEY=your_gmail_api_key_here
REACT_APP_GMAIL_CLIENT_ID=your_client_id_here
REACT_APP_GMAIL_CLIENT_SECRET=your_client_secret_here
REACT_APP_GMAIL_REFRESH_TOKEN=your_refresh_token_here
REACT_APP_SENDER_EMAIL=your_email@gmail.com
```

### Step 5: Restart Development Server
```bash
npm start
```

## 📧 How It Works

1. **User clicks "Invite Member"** in team detail page
2. **System stores invitation** in Firestore database
3. **Gmail API sends email** from your Gmail account
4. **Recipient gets professional invitation** with team details
5. **Email includes direct link** to accept invitation

## 🔧 Advanced Configuration

### Custom Email Templates
You can customize the email template in `TeamDetail.tsx`:

```typescript
const emailContent = `
  <div style="font-family: Arial, sans-serif; max-width: 600px;">
    <h2>Team Invitation</h2>
    <p>Hi there,</p>
    <p>${inviterName} has invited you to join the team "${teamName}" on TodoPro.</p>
    <p>Your role will be: ${role}</p>
    <a href="${window.location.origin}/login" style="background: blue; color: white; padding: 10px 20px; text-decoration: none;">
      Accept Invitation
    </a>
  </div>
`;
```

### Email Sending Options
- **From**: Your Gmail account (authenticated)
- **To**: Invited user's email
- **Subject**: "Invitation to join [Team Name]"
- **Body**: Professional HTML template with team details

## 🛠️ Troubleshooting

### Common Issues:

1. **"Gmail API credentials not configured"**
   - Check that all environment variables are set
   - Restart the development server after updating .env

2. **"Invalid credentials"**
   - Verify Client ID and Client Secret are correct
   - Make sure Gmail API is enabled in Google Cloud Console

3. **"Refresh token expired"**
   - Generate a new refresh token from OAuth Playground
   - Update the REACT_APP_GMAIL_REFRESH_TOKEN in .env

4. **"Quota exceeded"**
   - Gmail API has daily limits
   - Check usage in Google Cloud Console

### Security Best Practices:
- Never commit .env file to version control
- Use environment variables for all sensitive data
- Regularly rotate refresh tokens
- Monitor API usage in Google Cloud Console

## 📊 API Limits

- **Daily quota**: 1 billion queries per day
- **Per user per second**: 250 queries
- **Email sending**: 500 emails per day (Gmail limit)

## 🎯 Testing

1. Create a team in TodoPro
2. Click "Invite Member"
3. Enter a test email address
4. Check the browser console for success messages
5. Verify email is received in the test inbox

## 📞 Support

If you encounter issues:
1. Check the browser console for error messages
2. Verify all environment variables are set correctly
3. Ensure Gmail API is enabled in Google Cloud Console
4. Test with a different Gmail account if needed

---

**Note**: This setup uses OAuth 2.0 for secure authentication. Your Gmail account credentials are never stored in the application. 