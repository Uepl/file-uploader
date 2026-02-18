export class KeyUtils {
    /**
     * Converts a Base64 string to an ArrayBuffer
     */
    static base64ToArrayBuffer(base64: string): ArrayBuffer {
        const binaryString = window.atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
    }

    /**
     * Converts an ArrayBuffer to a Base64 string
     */
    static arrayBufferToBase64(buffer: ArrayBuffer): string {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        const len = bytes.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    }

    /**
     * Imports a PEM encoded RSA Public Key
     */
    static async importPublicKey(pem: string): Promise<CryptoKey> {
        // Remove PEM header and footer
        const pemHeader = "-----BEGIN PUBLIC KEY-----";
        const pemFooter = "-----END PUBLIC KEY-----";
        const pemContents = pem.substring(
            pem.indexOf(pemHeader) + pemHeader.length,
            pem.indexOf(pemFooter)
        ).replace(/\n/g, "").trim();

        const binaryDer = this.base64ToArrayBuffer(pemContents);

        return window.crypto.subtle.importKey(
            "spki",
            binaryDer,
            {
                name: "RSA-OAEP",
                hash: "SHA-256",
            },
            true,
            ["wrapKey"]
        );
    }
}
