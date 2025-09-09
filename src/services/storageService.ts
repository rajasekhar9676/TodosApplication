import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

export interface UploadedFileInfo {
  name: string;
  url: string;
}

export const storageService = {
  async uploadFile(file: File, pathPrefix: string): Promise<UploadedFileInfo> {
    const storage = getStorage();
    const fileName = `${pathPrefix}/${Date.now()}_${file.name}`;
    const storageRef = ref(storage, fileName);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    return { name: file.name, url };
  }
};



