import crypto from 'node:crypto';
import logger from './logger.js';

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

            logger.info('RSA Key pair successfully loaded from environment.');
        } catch (error) {
            logger.error('Failed to load RSA key from PRIVATE_KEY environment variable', { error });
            process.exit(1);
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

        logger.warn('No PRIVATE_KEY found in .env. Generated ephemeral RSA keys. Files encrypted now cannot be decrypted after server restart!');
    }

};

export const getPublicKey = () => publicKeyPem;
export const getPrivateKey = () => privateKeyPem;