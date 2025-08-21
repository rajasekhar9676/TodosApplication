# 📧 Gmail API Setup Guide

## 🔧 **Complete Gmail API Configuration**

### **Step 1: Create Google Cloud Project**
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Gmail API for your project

### **Step 2: Create OAuth 2.0 Credentials**
1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client IDs**
3. Choose **Web application**
4. Add authorized redirect URIs:
   - `http://localhost:3000` (for development)
   - `https://your-app.vercel.app` (for production)
5. Copy **Client ID** and **Client Secret**

### **Step 3: Get Refresh Token**
1. Use this URL (replace with your client ID):
   ```
   https://accounts.google.com/o/oauth2/v2/auth?
   client_id=YOUR_CLIENT_ID&
   redirect_uri=http://localhost:3000&
   scope=https://www.googleapis.com/auth/gmail.send&
   response_type=code&
   access_type=offline&
   prompt=consent
   ```

2. Authorize the application
3. Copy the **authorization code** from the redirect URL
4. Exchange it for refresh token:
   ```bash
   curl -X POST https://oauth2.googleapis.com/token \
     -d "client_id=YOUR_CLIENT_ID" \
     -d "client_secret=YOUR_CLIENT_SECRET" \
     -d "code=AUTHORIZATION_CODE" \
     -d "grant_type=authorization_code" \
     -d "redirect_uri=http://localhost:3000"
   ```

### **Step 4: Create Environment File**
Create `.env` file in your project root:
```env
REACT_APP_GMAIL_CLIENT_ID=your_client_id_here
REACT_APP_GMAIL_CLIENT_SECRET=your_client_secret_here
REACT_APP_GMAIL_REFRESH_TOKEN=your_refresh_token_here
REACT_APP_SENDER_EMAIL=your_email@gmail.com
```

### **Step 5: Restart Application**
After creating `.env` file, restart your React development server.

## 🚨 **Common Issues & Solutions**

### **Issue: "400 Bad Request" Error**
- **Cause**: Incorrect email format or missing credentials
- **Solution**: Verify all environment variables are set correctly

### **Issue: "Unauthorized" Error**
- **Cause**: Invalid or expired refresh token
- **Solution**: Generate new refresh token

### **Issue: "Quota Exceeded"**
- **Cause**: Gmail API daily quota limit reached
- **Solution**: Wait for quota reset or upgrade Google Cloud plan

## 📋 **Testing**

1. **Check Console**: Look for Gmail Service Debug logs
2. **Test Invitation**: Try sending a team invitation
3. **Verify Email**: Check if email is received

## 🔒 **Security Notes**

- **Never commit** `.env` file to version control
- **Keep credentials** secure and private
- **Rotate tokens** regularly for security
- **Use environment variables** in production

## 📞 **Support**

If you continue having issues:
1. Check browser console for detailed error messages
2. Verify all credentials are correct
3. Ensure Gmail API is enabled in Google Cloud Console
4. Check if your Google account has 2FA enabled
