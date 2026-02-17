import admin from 'firebase-admin';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    // This replace is necessary to handle the newline characters in the string
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
};

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


const db = admin.firestore();

export { admin, db };
