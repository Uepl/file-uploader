import { Request, Response } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';
import { User, UserModel } from '../models/userModel.js';
import logger from '../utils/logger.js';
import { db, storage } from '../config/firebase.js';
import { getPrivateKey } from '../utils/keyManager.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const bucketName = process.env.GCS_BUCKET_NAME || 'your-bucket-name';
const bucket = storage.bucket(bucketName);

export const register = async (req: Request, res: Response) => {
    const { email, password } = req.body;
    try {
        if (!email || !password) {
            return res.status(400).json({ error: 'Missing fields' });
        }
        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) {
            logger.warn("Registration attempt failed: Email already exists", { email, ip: req.ip });
            return res.status(400).json({ error: 'User already exists' });
        }
        // Hash with Argon2
        const hashedPassword = await argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: 2 ** 16,
            timeCost: 3,
            parallelism: 1
        });

        const newUser = await UserModel.create({ email, password: hashedPassword });

        logger.info("New user registered successfully", { uid: newUser.id, email });
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        logger.error("Registration failed", { error, email, ip: req.ip });
        res.status(500).json({ error: 'Registration failed' });
    }
};

export const login = async (req: Request, res: Response) => {
    const { email, password } = req.body;

    try {
        if (!email || !password) {
            return res.status(400).json({ error: 'Missing credentials' });
        }
        const user: User | null = await UserModel.findByEmail(email);
        if (!user || !user.password) {
            logger.warn("Login failed: User not found", { email, ip: req.ip });
            return res.status(400).json({ error: 'Invalid credentials' });
        }

        // Verify Argon2 Hash
        const validPassword = await argon2.verify(user.password, password);
        if (!validPassword) {
            logger.warn("Login failed: Incorrect password", { email, ip: req.ip });
            return res.status(400).json({ error: 'Invalid credentials' });
        }
        // Generate Token
        const token = jwt.sign(
            { uid: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        logger.info("User login successful", { uid: user.id, email, ip: req.ip });
        res.json({ message: 'Login successful', token });
    } catch (error) {
        logger.error("Login process error", { error, email, ip: req.ip });
        res.status(500).json({ error: 'Login failed' });
    }
};

// File Management Endpoints

export const listFiles = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.uid;
        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const snapshot = await db.collection('files')
            .where('userId', '==', userId)
            .orderBy('uploadDate', 'desc')
            .get();

        const files = snapshot.docs.map(doc => ({
            id: doc.id,
            originalName: doc.data().originalName,
            size: doc.data().size,
            uploadDate: doc.data().uploadDate?.toDate?.(),
            contentType: doc.data().contentType
        }));

        logger.info("Files listed successfully", { userId, fileCount: files.length });
        res.json({ files });
    } catch (error) {
        logger.error("List files failed", { error, userId: req.user?.uid });
        res.status(500).json({ error: 'Failed to list files' });
    }
};

export const downloadFile = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.uid;
        const fileId = Array.isArray(req.params.fileId) ? req.params.fileId[0] : req.params.fileId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!fileId) {
            return res.status(400).json({ error: 'File ID required' });
        }

        // Verify ownership
        const fileDoc = await db.collection('files').doc(fileId).get();
        if (!fileDoc.exists || fileDoc.data()?.userId !== userId) {
            logger.warn("Unauthorized download attempt", { fileId, userId, ip: req.ip });
            return res.status(403).json({ error: 'File not found or unauthorized' });
        }

        const fileData = fileDoc.data();
        const storagePath = fileData?.storagePath;
        const encryptedKeyBase64 = fileData?.encryptedKey;
        const ivBase64 = fileData?.iv;

        if (!storagePath || !encryptedKeyBase64 || !ivBase64) {
            return res.status(404).json({ error: 'File metadata incomplete' });
        }

        // Extract path from gs://bucket/path/to/file
        const pathWithoutBucket = storagePath.replace(`gs://${bucketName}/`, '');
        const file = bucket.file(pathWithoutBucket);

        // Download file from GCS
        const [fileBuffer] = await file.download();

        // Unwrap the AES key using server's private key
        const privateKey = getPrivateKey();
        const encryptedKeyBuffer = Buffer.from(encryptedKeyBase64, 'base64');

        let unwrappedAesKey: Buffer;
        try {
            unwrappedAesKey = crypto.privateDecrypt(
                {
                    key: privateKey,
                    padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
                    oaepHash: 'sha256'
                },
                encryptedKeyBuffer
            );
        } catch (error) {
            logger.error("Failed to unwrap AES key", { error, fileId });
            return res.status(500).json({ error: 'Failed to process file' });
        }

        res.set({
            'Content-Type': fileData?.contentType || 'application/octet-stream',
            'Content-Disposition': `attachment; filename="${encodeURIComponent(fileData?.originalName || 'file')}"`,
            'Content-Length': fileBuffer.length,
            'X-Encrypted-Key': unwrappedAesKey.toString('base64'),
            'X-IV': ivBase64
        });

        logger.info("File download started", { fileId, userId, size: fileBuffer.length });
        res.send(fileBuffer);
    } catch (error) {
        logger.error("Download file failed", { error, fileId: req.params.fileId, userId: req.user?.uid });
        res.status(500).json({ error: 'Failed to download file' });
    }
};

export const deleteFile = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.uid;
        const fileId = Array.isArray(req.params.fileId) ? req.params.fileId[0] : req.params.fileId;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!fileId) {
            return res.status(400).json({ error: 'File ID required' });
        }

        // Verify ownership
        const fileDoc = await db.collection('files').doc(fileId).get();
        if (!fileDoc.exists || fileDoc.data()?.userId !== userId) {
            logger.warn("Unauthorized delete attempt", { fileId, userId, ip: req.ip });
            return res.status(403).json({ error: 'File not found or unauthorized' });
        }

        const fileData = fileDoc.data();
        const storagePath = fileData?.storagePath;

        // Delete from Firestore
        await db.collection('files').doc(fileId).delete();

        // Delete from GCS
        if (storagePath) {
            const pathWithoutBucket = storagePath.replace(`gs://${bucketName}/`, '');
            const file = bucket.file(pathWithoutBucket);
            await file.delete().catch(() => {
                // Ignore if file doesn't exist in GCS
                logger.warn("GCS file not found for deletion", { storagePath });
            });
        }

        logger.info("File deleted successfully", { fileId, userId });
        res.json({ message: 'File deleted successfully' });
    } catch (error) {
        logger.error("Delete file failed", { error, fileId: req.params.fileId, userId: req.user?.uid });
        res.status(500).json({ error: 'Failed to delete file' });
    }
};

export const renameFile = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.uid;
        const fileId = Array.isArray(req.params.fileId) ? req.params.fileId[0] : req.params.fileId;
        const { newName } = req.body;

        if (!userId) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        if (!fileId || !newName) {
            return res.status(400).json({ error: 'File ID and new name required' });
        }

        // Verify ownership
        const fileDoc = await db.collection('files').doc(fileId).get();
        if (!fileDoc.exists || fileDoc.data()?.userId !== userId) {
            logger.warn("Unauthorized rename attempt", { fileId, userId, ip: req.ip });
            return res.status(403).json({ error: 'File not found or unauthorized' });
        }

        // Update Firestore
        await db.collection('files').doc(fileId).update({
            originalName: newName,
            updatedAt: new Date()
        });

        logger.info("File renamed successfully", { fileId, userId, newName });
        res.json({ message: 'File renamed successfully', originalName: newName });
    } catch (error) {
        logger.error("Rename file failed", { error, fileId: req.params.fileId, userId: req.user?.uid });
        res.status(500).json({ error: 'Failed to rename file' });
    }
};