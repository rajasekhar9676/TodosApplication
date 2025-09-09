import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../config';

export interface UploadedFileInfo {
  name: string;
  url: string;
}

export const storageService = {
  async uploadFile(file: File, pathPrefix: string): Promise<UploadedFileInfo> {
    const safeName = file.name.replace(/[^\w\.\-]+/g, '_');
    const fileName = `${pathPrefix}/${Date.now()}_${safeName}`;
    const storageRef = ref(storage, fileName);
    const metadata = { contentType: file.type || 'application/octet-stream' } as any;
    const task = uploadBytesResumable(storageRef, file, metadata);
    await new Promise<void>((resolve, reject) => {
      task.on('state_changed', () => {}, reject, () => resolve());
    });
    const url = await getDownloadURL(storageRef);
    return { name: file.name, url };
  }
};



