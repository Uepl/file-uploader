// src/utils/keyManager.ts
import crypto from 'node:crypto';

let publicKeyPem: string;
let privateKeyPem: string;
const rawKey = process.env.PRIVATE_KEY || '';

const formattedKey = rawKey
    .replace(/\\n/g, '\n')      // Convert literal \n to actual newlines
    .replace(/"/g, '')          // Remove any accidental wrapping quotes
    .trim();

export const generateKeys = () => {
    if (formattedKey) {
        try {
            privateKeyPem = formattedKey;
            const publicKeyObject = crypto.createPublicKey(privateKeyPem);
            publicKeyPem = publicKeyObject.export({
                type: 'spki',
                format: 'pem'
            }) as string;

            console.log('✅ Success: RSA Key pair ready.');
        } catch (error) {
            console.error('❌ Critical Error: The PRIVATE_KEY in .env is invalid!');
            console.error('Reason:', error);
            // Optional: process.exit(1); 
        }
    } else {
        const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
            modulusLength: 2048,
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            }
        });

        publicKeyPem = publicKey;
        privateKeyPem = privateKey;
        console.log('RSA Key Pair Generated (Warning: Ephemeral Keys)');
    }

};

export const getPublicKey = () => publicKeyPem;