import { db } from '../firebase.js';

export interface FileMetadata {
  id?: string;
  userId: string;
  originalName: string;
  storagePath: string;
  storageType: string;
  uploadDate: any;
  updatedAt?: any;
  encryptedKey: string;
  iv: string;
  size: number;
  contentType: string;
}

export class FileModel {
  static async create(data: FileMetadata): Promise<string> {
    const docRef = await db.collection('files').add({
      ...data,
      uploadDate: new Date()
    });
    return docRef.id;
  }

  static async findById(id: string): Promise<FileMetadata | null> {
    const doc = await db.collection('files').doc(id).get();
    if (!doc.exists) return null;
    const data = doc.data() as any;
    return {
      id: doc.id,
      ...data,
      uploadDate: data.uploadDate?.toDate ? data.uploadDate.toDate() : data.uploadDate,
      updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
    } as FileMetadata;
  }

  static async findByUserId(userId: string): Promise<FileMetadata[]> {
    const snapshot = await db.collection('files')
      .where('userId', '==', userId)
      .orderBy('uploadDate', 'desc')
      .get();

    return snapshot.docs.map(doc => {
      const data = doc.data() as any;
      return {
        id: doc.id,
        ...data,
        uploadDate: data.uploadDate?.toDate ? data.uploadDate.toDate() : data.uploadDate,
        updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate() : data.updatedAt
      } as FileMetadata;
    });
  }

  static async delete(id: string): Promise<void> {
    await db.collection('files').doc(id).delete();
  }

  static async update(id: string, data: Partial<FileMetadata>): Promise<void> {
    await db.collection('files').doc(id).update({
      ...data,
      updatedAt: new Date()
    });
  }
}
