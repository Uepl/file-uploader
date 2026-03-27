import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import fileRoutes from '../fileRoutes.js';

// Mock the controller handlers if we want true integration tests without real side effects
// Or we can mock the models/services used by the controllers.
// Since fileController.ts is large and complex, let's mock it for now to test route mapping.

vi.mock('../../controllers/fileController.js', () => ({
    getPublicKeyHandler: (req: any, res: any) => res.json({ publicKey: 'mock-pk' }),
    uploadFile: (req: any, res: any) => res.status(201).json({ message: 'File uploaded' }),
    listFiles: (req: any, res: any) => res.json({ files: [] }),
    downloadFile: (req: any, res: any) => res.send('file-content'),
    deleteFile: (req: any, res: any) => res.status(204).send(),
    renameFile: (req: any, res: any) => res.json({ message: 'Renamed' })
}));

// Mock authenticateToken middleware to always pass
vi.mock('../../middleware/auth.js', () => ({
    authenticateToken: (req: any, res: any, next: any) => {
        req.user = { uid: '123' };
        next();
    }
}));

// Mock uploadRateLimit middleware
vi.mock('../../middleware/rateLimiter.js', () => ({
    uploadRateLimit: (req: any, res: any, next: any) => next()
}));

const app = express();
app.use(express.json());
app.use('/api', fileRoutes);

describe('File Routes', () => {
    it('GET /api/public-key should return the public key', async () => {
        const response = await request(app).get('/api/public-key');
        expect(response.status).toBe(200);
        expect(response.body.publicKey).toBe('mock-pk');
    });

    it('GET /api/files should return list of files', async () => {
        const response = await request(app).get('/api/files');
        expect(response.status).toBe(200);
        expect(response.body.files).toEqual([]);
    });

    it('POST /api/upload should return 201', async () => {
        const response = await request(app).post('/api/upload');
        expect(response.status).toBe(201);
        expect(response.body.message).toBe('File uploaded');
    });

    it('DELETE /api/files/:id should return 204', async () => {
        const response = await request(app).delete('/api/files/abc');
        expect(response.status).toBe(204);
    });

    it('PATCH /api/files/:id should return 200', async () => {
        const response = await request(app).patch('/api/files/abc').send({ newName: 'new' });
        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Renamed');
    });
});
