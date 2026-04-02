import { CryptoService } from './CryptoService.js';

export interface FileMetadata {
    id: string;
    originalName: string;
    size: number;
    uploadDate: Date;
    contentType: string;
}

export interface DecryptedFile {
    blob: Blob;
    originalName: string;
}

const getAuthToken = (): string | null => {
    return localStorage.getItem('token');
};

const createHeaders = (additionalHeaders: Record<string, string> = {}) => {
    const token = getAuthToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...additionalHeaders
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
};

/**
 * Helper: Convert base64 string to ArrayBuffer
 */
const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
};

export const FileService = {
    /**
     * Get list of user's uploaded files
     */
    async getFiles(): Promise<FileMetadata[]> {
        const response = await fetch(`/api/files`, {
            method: 'GET',
            headers: createHeaders()
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch files: ${response.statusText}`);
        }

        const data = await response.json();
        return data.files.map((file: any) => ({
            ...file,
            uploadDate: new Date(file.uploadDate)
        }));
    },

    /**
     * Download and decrypt file on the client side
     * Returns plaintext file blob
     */
    async downloadAndDecryptFile(fileId: string): Promise<DecryptedFile> {
        // Fetch encrypted file and metadata
        const response = await fetch(
            `/api/files/${fileId}/download`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${getAuthToken()}`
                }
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to download file: ${response.statusText}`);
        }

        const encryptedBlob = await response.blob();
        const encryptedKeyBase64 = response.headers.get('X-Encrypted-Key');
        const ivBase64 = response.headers.get('X-IV');
        const contentDisposition = response.headers.get('Content-Disposition');

        let originalName = 'download';
        if (contentDisposition) {
            const match = contentDisposition.match(/filename="([^"]*)"/);
            if (match) {
                originalName = decodeURIComponent(match[1]);
            }
        }

        if (!encryptedKeyBase64 || !ivBase64) {
            throw new Error('Missing decryption metadata in response');
        }

        // Convert base64 to ArrayBuffer
        const encryptedKeyBuffer = base64ToArrayBuffer(encryptedKeyBase64);
        const ivBuffer = base64ToArrayBuffer(ivBase64);

        // Import AES key from raw bytes
        const aesKey = await CryptoService.importAesKey(encryptedKeyBuffer);

        // Decrypt file
        const encryptedFileBuffer = await encryptedBlob.arrayBuffer();
        const decryptedBuffer = await CryptoService.decryptFileData(
            encryptedFileBuffer,
            aesKey,
            new Uint8Array(ivBuffer)
        );

        // Create new blob with decrypted content
        const decryptedBlob = new Blob([decryptedBuffer], { type: encryptedBlob.type });

        return {
            blob: decryptedBlob,
            originalName
        };
    },

    /**
     * Delete a file by ID
     */
    async deleteFile(fileId: string): Promise<void> {
        const response = await fetch(
            `/api/files/${fileId}`,
            {
                method: 'DELETE',
                headers: createHeaders()
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to delete file: ${response.statusText}`);
        }
    },

    /**
     * Rename a file
     */
    async renameFile(fileId: string, newName: string): Promise<void> {
        const response = await fetch(
            `/api/files/${fileId}`,
            {
                method: 'PATCH',
                headers: createHeaders(),
                body: JSON.stringify({ newName })
            }
        );

        if (!response.ok) {
            throw new Error(`Failed to rename file: ${response.statusText}`);
        }
    },

    /**
     * Fetch the server's RSA public key for session key wrapping
     */
    async getPublicKey(): Promise<string> {
        const response = await fetch('/api/public-key');
        if (!response.ok) {
            throw new Error('Failed to fetch public key');
        }
        const { publicKey } = await response.json();
        return publicKey;
    },

    /**
     * Upload an encrypted file with its wrapped key and IV
     */
    async uploadFile(formData: FormData): Promise<{ message: string }> {
        const token = getAuthToken();
        const response = await fetch('/api/upload', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || 'Upload failed on server');
        }

        return await response.json();
    }
};

