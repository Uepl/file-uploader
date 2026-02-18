import { db } from '../config/firebase.js';

const usersCollection = db.collection('users');

export const UserModel = {
    findByEmail: async (email: string) => {
        const snapshot = await usersCollection.where('email', '==', email).limit(1).get();
        if (snapshot.empty) return null;
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    },

    create: async (userData: any) => {
        const docRef = await usersCollection.add({
            ...userData,
            createdAt: new Date().toISOString()
        });
        return docRef.id;
    }
};