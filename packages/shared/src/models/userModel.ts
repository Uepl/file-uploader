import { db } from '../firebase.js';
import { logger } from '../logger.js';

// 1. Define the User Interface
export interface User {
    id?: string;
    email: string;
    password?: string; // Hashed
    createdAt: string;
}

const usersCollection = db.collection('users');

export const UserModel = {
    findByEmail: async (email: string): Promise<User | null> => {
        try {
            const snapshot = await usersCollection.where('email', '==', email).limit(1).get();

            if (snapshot.empty) return null;

            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() } as User;
        } catch (error) {
            // Log the database error specifically
            logger.error("Firestore findByEmail Error", { error, email });
            throw error; // Re-throw so the controller knows something went wrong
        }
    },

    create: async (userData: Omit<User, 'id' | 'createdAt'>): Promise<User> => {
        try {
            const newUser: Omit<User, 'id'> = {
                ...userData,
                createdAt: new Date().toISOString()
            };

            const docRef = await usersCollection.add(newUser);

            return {
                id: docRef.id,
                ...newUser
            };
        } catch (error) {
            logger.error("Firestore create user error", { error, email: userData.email });
            throw error;
        }
    }
};
