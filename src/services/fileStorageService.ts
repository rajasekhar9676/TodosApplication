import { collection, addDoc, doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config';

export interface FileInfo {
  id: string;
  name: string;
  url: string;
  size: number;
  type: string;
  uploadedAt: string;
  path: string;
  base64Data?: string; // For Firestore storage
  isChunked?: boolean; // Indicates if file was stored in chunks
  chunkCount?: number; // Number of chunks for chunked files
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

class FileStorageService {

  async uploadFile(
    file: File, 
    pathPrefix: string, 
    onProgress?: (progress: UploadProgress) => void
  ): Promise<FileInfo> {
    // Check file size (max 1GB for large file support)
    const maxSize = 1024 * 1024 * 1024; // 1GB
    if (file.size > maxSize) {
      throw new Error(`File size too large. Maximum size is ${maxSize / (1024 * 1024)}MB`);
    }

    const fileId = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const safeName = file.name.replace(/[^\w\.\-]+/g, '_');
    const fileName = `${pathPrefix}/${fileId}_${safeName}`;
    
    try {
      // Check if file is too large for single Firestore document (8MB limit for safety)
      const maxSingleDocSize = 8 * 1024 * 1024; // 8MB
      
      if (file.size > maxSingleDocSize) {
        // Use chunked upload for large files
        return await this.uploadFileInChunks(file, fileId, fileName, pathPrefix, onProgress);
      } else {
        // Use single document upload for smaller files
        return await this.uploadFileSingle(file, fileId, fileName, pathPrefix, onProgress);
      }
      
    } catch (error) {
      console.error('❌ Upload error:', error);
      throw new Error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async uploadFileSingle(
    file: File,
    fileId: string,
    fileName: string,
    pathPrefix: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<FileInfo> {
    // Convert file to base64
    const base64Data = await this.fileToBase64(file);
    
    // Simulate progress for UI feedback
    if (onProgress) {
      onProgress({
        loaded: file.size,
        total: file.size,
        percentage: 50
      });
    }
    
    // Store in Firestore
    const docRef = await addDoc(collection(db, 'fileStorage'), {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      path: fileName,
      base64Data: base64Data,
      pathPrefix: pathPrefix
    });
    
    // Simulate progress completion
    if (onProgress) {
      onProgress({
        loaded: file.size,
        total: file.size,
        percentage: 100
      });
    }
    
    // Return file info with data URL for immediate viewing
    const dataUrl = `data:${file.type};base64,${base64Data}`;
    
    return {
      id: fileId,
      name: file.name,
      url: dataUrl,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      path: fileName,
      base64Data: base64Data,
      isChunked: false
    };
  }

  private async uploadFileInChunks(
    file: File,
    fileId: string,
    fileName: string,
    pathPrefix: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<FileInfo> {
    const chunkSize = 750 * 1024; // 750KB chunks (becomes ~1MB in base64, safe for Firestore)
    const totalChunks = Math.ceil(file.size / chunkSize);
    
    console.log(`📦 Uploading large file in ${totalChunks} chunks of ${chunkSize / (1024 * 1024)}MB each`);
    
    // Upload chunks sequentially to avoid overwhelming Firestore
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, file.size);
      const chunk = file.slice(start, end);
      
      try {
        await this.uploadChunk(chunk, fileId, i, totalChunks, pathPrefix);
        
        // Update progress
        if (onProgress) {
          const progress = Math.round(((i + 1) / totalChunks) * 100);
          onProgress({
            loaded: end,
            total: file.size,
            percentage: progress
          });
        }
        
        // Small delay between chunks to prevent overwhelming Firestore
        if (i < totalChunks - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`❌ Failed to upload chunk ${i + 1}/${totalChunks}:`, error);
        throw new Error(`Failed to upload chunk ${i + 1}/${totalChunks}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    // Create metadata document
    await addDoc(collection(db, 'fileStorage'), {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      path: fileName,
      pathPrefix: pathPrefix,
      isChunked: true,
      chunkCount: totalChunks
    });
    
    // Return file info (no base64Data for chunked files)
    return {
      id: fileId,
      name: file.name,
      url: '', // Will be generated when downloading
      size: file.size,
      type: file.type,
      uploadedAt: new Date().toISOString(),
      path: fileName,
      isChunked: true,
      chunkCount: totalChunks
    };
  }

  private async uploadChunk(
    chunk: Blob,
    fileId: string,
    chunkIndex: number,
    totalChunks: number,
    pathPrefix: string
  ): Promise<void> {
    const base64Chunk = await this.blobToBase64(chunk);
    
    // Debug: Check base64 size
    const base64Size = base64Chunk.length;
    const maxSize = 1048487; // Firestore's 1MB limit
    console.log(`📊 Chunk ${chunkIndex + 1}/${totalChunks}: Original ${chunk.size} bytes, Base64 ${base64Size} bytes (${Math.round(base64Size/maxSize*100)}% of limit)`);
    
    if (base64Size > maxSize) {
      throw new Error(`Chunk ${chunkIndex + 1} base64 size (${base64Size} bytes) exceeds Firestore limit (${maxSize} bytes)`);
    }
    
    await addDoc(collection(db, 'fileStorage'), {
      id: `${fileId}_chunk_${chunkIndex}`,
      fileId: fileId,
      chunkIndex: chunkIndex,
      totalChunks: totalChunks,
      base64Data: base64Chunk,
      pathPrefix: pathPrefix,
      isChunk: true
    });
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64 data
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data URL prefix to get just the base64 data
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  async downloadFile(fileInfo: FileInfo): Promise<Blob> {
    try {
      if (fileInfo.isChunked) {
        // Download and reassemble chunked file
        return await this.downloadChunkedFile(fileInfo);
      } else {
        // Download single file
        const base64Data = fileInfo.base64Data || fileInfo.url.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: fileInfo.type });
      }
    } catch (error) {
      console.error('Download failed:', error);
      throw new Error(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async downloadChunkedFile(fileInfo: FileInfo): Promise<Blob> {
    if (!fileInfo.chunkCount) {
      throw new Error('Chunk count not available for chunked file');
    }

    // Get all chunks
    const chunkPromises = [];
    for (let i = 0; i < fileInfo.chunkCount; i++) {
      const chunkId = `${fileInfo.id}_chunk_${i}`;
      chunkPromises.push(this.getFileDocument(chunkId));
    }

    const chunkDocs = await Promise.all(chunkPromises);
    
    // Sort chunks by index and combine
    const sortedChunks = chunkDocs
      .filter(doc => doc?.exists())
      .map(doc => doc!.data())
      .sort((a, b) => a.chunkIndex - b.chunkIndex);

    if (sortedChunks.length !== fileInfo.chunkCount) {
      throw new Error(`Missing chunks. Expected ${fileInfo.chunkCount}, found ${sortedChunks.length}`);
    }

    // Combine all chunk data
    const combinedBase64 = sortedChunks.map(chunk => chunk.base64Data).join('');
    
    // Convert to blob
    const byteCharacters = atob(combinedBase64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: fileInfo.type });
  }

  async deleteFile(fileInfo: FileInfo): Promise<void> {
    try {
      if (fileInfo.isChunked && fileInfo.chunkCount) {
        // Delete all chunks
        const chunkPromises = [];
        for (let i = 0; i < fileInfo.chunkCount; i++) {
          const chunkId = `${fileInfo.id}_chunk_${i}`;
          chunkPromises.push(this.getFileDocument(chunkId));
        }
        
        const chunkDocs = await Promise.all(chunkPromises);
        const deletePromises = chunkDocs
          .filter(doc => doc?.exists())
          .map(doc => deleteDoc(doc!.ref));
        
        await Promise.all(deletePromises);
      }
      
      // Delete main file document
      const querySnapshot = await this.getFileDocument(fileInfo.id);
      if (querySnapshot) {
        await deleteDoc(doc(db, 'fileStorage', querySnapshot.id));
      }
    } catch (error) {
      console.error('Delete failed:', error);
      throw new Error(`Delete failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getFileUrl(fileInfo: FileInfo): Promise<string> {
    if (fileInfo.isChunked) {
      // For chunked files, we need to download and create a data URL
      const blob = await this.downloadFile(fileInfo);
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      });
    } else {
      // Return the data URL directly for non-chunked files
      return fileInfo.url;
    }
  }

  private async getFileDocument(fileId: string) {
    // This would need to be implemented with a query to find the document by fileId
    // For now, we'll assume the fileId is the document ID
    try {
      const docRef = doc(db, 'fileStorage', fileId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap : null;
    } catch (error) {
      console.error('Error getting file document:', error);
      return null;
    }
  }

  // Bulk operations
  async uploadMultipleFiles(
    files: FileList, 
    pathPrefix: string,
    onProgress?: (fileIndex: number, progress: UploadProgress) => void
  ): Promise<FileInfo[]> {
    const results: FileInfo[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const fileInfo = await this.uploadFile(
          file, 
          pathPrefix, 
          (progress) => onProgress?.(i, progress)
        );
        results.push(fileInfo);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        // Continue with other files
      }
    }
    
    return results;
  }
}

export const fileStorageService = new FileStorageService();
