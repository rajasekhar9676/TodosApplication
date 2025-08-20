# Quick Setup Guide - Get Resend API Key Working

## 🚀 Step-by-Step Instructions

### Step 1: Get Resend API Key
1. Go to [https://resend.com](https://resend.com)
2. Click "Sign Up" and create a free account
3. After signing in, go to "API Keys" in the left sidebar
4. Click "Create API Key"
5. Give it a name like "TodoPro App"
6. Copy the API key (it starts with `re_`)

### Step 2: Update Environment File
1. Open the `.env` file in your project root
2. Replace the placeholder with your actual API key:

```env
REACT_APP_RESEND_API_KEY=re_your_actual_api_key_here
```

**Example:**
```env
REACT_APP_RESEND_API_KEY=re_1234567890abcdef
```

### Step 3: Restart Development Server
1. Stop the current server (Ctrl+C)
2. Run: `npm start`
3. The server will restart and load the new environment variable

### Step 4: Test the Email Functionality
1. Go to your app at `http://localhost:3000`
2. Create a team or go to an existing team
3. Try inviting someone with an email address
4. Check the browser console for success messages

## 🔍 Troubleshooting

### If you still see "API key not configured":
1. Make sure you saved the `.env` file
2. Make sure you restarted the development server
3. Check that the API key starts with `re_`
4. Try adding a console.log to check the value:

```javascript
console.log('API Key:', process.env.REACT_APP_RESEND_API_KEY);
```

### If you get CORS errors:
This is normal for development. The app will fall back to logging the email content instead of sending real emails.

### If you want to test without Resend:
The app will automatically fall back to logging email content in the console, so you can still test the invitation flow.

## 📧 What You'll See

### With Resend API Key:
- Real emails sent to the specified address
- Beautiful HTML email template
- Professional invitation experience

### Without Resend API Key:
- Email content logged to browser console
- Invitation still stored in database
- Fallback notification system

## 🎯 Next Steps

Once you have the API key working:
1. Test with a real email address
2. Check your email inbox for the invitation
3. Click the "Accept Invitation" link
4. Verify the user is added to the team

## 💡 Pro Tips

- Resend free tier includes 3,000 emails per month
- You can use any email address for testing
- The invitation links will work with your local development server
- Consider setting up a custom domain for production use 