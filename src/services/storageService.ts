import { ref, uploadBytes, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../config';
import { getAuth } from 'firebase/auth';

export interface UploadedFileInfo {
  name: string;
  url: string;
}

export const storageService = {
  async uploadFile(file: File, pathPrefix: string): Promise<UploadedFileInfo> {
    // Check if user is authenticated
    const auth = getAuth();
    if (!auth.currentUser) {
      throw new Error('User must be authenticated to upload files');
    }

    // Validate file
    if (!file || file.size === 0) {
      throw new Error('Invalid file provided');
    }

    // Check file size (max 10MB for Firebase Storage, 1MB for base64 fallback)
    const maxSize = 10 * 1024 * 1024; // 10MB for Firebase Storage
    if (file.size > maxSize) {
      throw new Error(`File size too large. Maximum size is ${maxSize / (1024 * 1024)}MB`);
    }

    try {
      // Use simple upload (like the working version)
      const safeName = file.name.replace(/[^\w\.\-]+/g, '_');
      const fileName = `${pathPrefix}/${Date.now()}_${safeName}`;
      const storageRef = ref(storage, fileName);
      const metadata = { 
        contentType: file.type || 'application/octet-stream',
        customMetadata: {
          uploadedBy: auth.currentUser.uid,
          uploadedAt: new Date().toISOString()
        }
      };
      
      console.log('📁 Uploading file to Firebase Storage:', fileName);
      
      // Use simple upload instead of resumable upload
      await uploadBytes(storageRef, file, metadata);
      
      const url = await getDownloadURL(storageRef);
      console.log('✅ File uploaded successfully to Firebase Storage:', url);
      
      return { name: file.name, url };
    } catch (error) {
      console.warn('⚠️ Firebase Storage failed, falling back to base64 storage:', error);
      
      // Fallback to base64 storage in Firestore
      try {
        const base64 = await this.fileToBase64(file);
        const dataUrl = `data:${file.type};base64,${base64}`;
        
        console.log('✅ File stored as base64 data URL');
        return { name: file.name, url: dataUrl };
      } catch (base64Error) {
        console.error('❌ Both Firebase Storage and base64 fallback failed:', base64Error);
        throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  },

  async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64 string
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }
};



