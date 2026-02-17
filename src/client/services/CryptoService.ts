

export class CryptoService {
    /**
     * Generates a random AES-GCM key
     */
    static async generateAesKey(): Promise<CryptoKey> {
        return window.crypto.subtle.generateKey(
            {
                name: 'AES-GCM',
                length: 256,
            },
            true, // extractable (so we can wrap it)
            ['encrypt', 'decrypt']
        );
    }

    /**
     * Encrypts file data using the AES key
     */
    static async encryptFileData(
        file: File,
        key: CryptoKey
    ): Promise<{ ciphertext: ArrayBuffer; iv: Uint8Array }> {
        const fileBuffer = await file.arrayBuffer();
        const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM

        const ciphertext = await window.crypto.subtle.encrypt(
            {
                name: 'AES-GCM',
                iv: iv,
            },
            key,
            fileBuffer
        );

        return { ciphertext, iv };
    }

    /**
     * Wraps (encrypts) the AES key using the RSA Public Key
     */
    static async wrapAesKeyWithRsa(
        aesKey: CryptoKey,
        rsaPublicKey: CryptoKey
    ): Promise<ArrayBuffer> {
        return window.crypto.subtle.wrapKey(
            'raw', // Format to export the key before wrapping
            aesKey, // Key to wrap
            rsaPublicKey, // Wrapping key (RSA Public Key)
            {
                name: 'RSA-OAEP',
            }
        );
    }

    /**
     * Export key to raw format (for debugging/logging ONLY - not used in secure flow)
     */
    static async exportKeyRaw(key: CryptoKey): Promise<ArrayBuffer> {
        return window.crypto.subtle.exportKey('raw', key);
    }
}
