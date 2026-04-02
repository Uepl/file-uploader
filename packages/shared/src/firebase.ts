import admin from 'firebase-admin';
import dotenv from 'dotenv';
import { Storage } from '@google-cloud/storage';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const formattedKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

// 1. For Firebase
admin.initializeApp({
    credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: formattedKey,
    }),
});

// 2. For Storage (The nested one)
const storage = new Storage({
    projectId: process.env.FIREBASE_PROJECT_ID,
    credentials: {
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        private_key: formattedKey,
    },
});


const db = admin.firestore();

export { admin, db, storage };
