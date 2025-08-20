# 📧 Email Setup Guide - TodoPro

## 🚀 Quick Setup (Recommended)

### Option 1: Use the PowerShell Script
1. **Run the setup script:**
   ```powershell
   .\update-env.ps1
   ```
2. **Enter your Resend API key when prompted**
3. **Restart the development server**

### Option 2: Manual Setup
1. **Get your Resend API key:**
   - Go to [https://resend.com](https://resend.com)
   - Sign up/Login
   - Go to "API Keys" in the sidebar
   - Click "Create API Key"
   - Copy the key (starts with `re_`)

2. **Update the .env file:**
   - Open `.env` file in the project root
   - Replace `your_resend_api_key_here` with your actual API key
   - Save the file

3. **Restart the development server:**
   - Stop current server (Ctrl+C)
   - Run `npm start`

## 🔍 Debugging

### Check if API key is loaded:
When you send an invitation, check the browser console for these debug messages:

**✅ Working correctly:**
```
🔍 Debug: API Key starts with: re_1234567...
🔍 Debug: API Key length: 32
🔍 Debug: API Key is placeholder: false
📧 Attempting to send email via Resend...
✅ Email sent successfully via Resend
```

**❌ Not working:**
```
🔍 Debug: API Key starts with: undefined
🔍 Debug: API Key length: 0
🔍 Debug: API Key is placeholder: true
⚠️ Resend API key not configured. Please:
```

### Common Issues:

1. **API key not loading:**
   - Make sure `.env` file is in the project root (TodosApplication folder)
   - Make sure you restarted the development server
   - Check that the API key starts with `re_`

2. **CORS errors:**
   - This is normal for development
   - The app will fall back to console logging

3. **Invalid API key:**
   - Verify your API key is correct
   - Make sure it starts with `re_`
   - Check that you have credits in your Resend account

## 📧 Testing

### With Real API Key:
- Real emails sent to the specified address
- Beautiful HTML email template
- Professional invitation experience

### Without API Key (Fallback):
- Email content logged to browser console
- Invitation still stored in database
- You can still test the invitation flow

## 🎯 Next Steps

Once emails are working:
1. Test with a real email address
2. Check your email inbox for the invitation
3. Click the "Accept Invitation" link
4. Verify the user is added to the team

## 💡 Tips

- Resend free tier includes 3,000 emails per month
- You can use any email address for testing
- The invitation links work with your local development server
- Consider setting up a custom domain for production use 