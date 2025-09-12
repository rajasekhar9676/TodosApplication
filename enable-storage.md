# Enable Firebase Storage

## Quick Setup Steps

1. **Go to Firebase Console**: 
   - Open: https://console.firebase.google.com/project/steam-outlet-425507-t1/storage
   - Click "Get Started"

2. **Choose Storage Location**:
   - Select a location close to your users (e.g., us-central1, europe-west1, asia-southeast1)
   - Click "Next"

3. **Configure Security Rules**:
   - Choose "Start in test mode" (we'll update rules later)
   - Click "Next"

4. **Review and Create**:
   - Review your settings
   - Click "Done"

5. **Deploy Updated Rules**:
   ```bash
   firebase deploy --only storage
   ```

## After Enabling Storage

Once Firebase Storage is enabled, the document upload will automatically use Firebase Storage instead of the base64 fallback.

## Current Status

- ✅ **Fallback Solution**: Files are stored as base64 data URLs (works immediately)
- ⏳ **Firebase Storage**: Will be enabled after you complete the setup steps above
- ✅ **File Validation**: Supports images, documents, and text files up to 1MB
- ✅ **Error Handling**: Clear error messages for users

## Testing

Try uploading a small file (< 1MB) in the organize section. It should work immediately with the base64 fallback!

