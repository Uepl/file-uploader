import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import authRoutes from '../authRoutes.js';
import { UserModel } from '../../models/userModel.js';
import argon2 from 'argon2';

// Mock the UserModel
vi.mock('../../models/userModel', () => ({
    UserModel: {
        findByEmail: vi.fn(),
        create: vi.fn()
    }
}));

// Mock argon2
vi.mock('argon2', () => ({
    default: {
        hash: vi.fn(),
        verify: vi.fn()
    }
}));

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);

describe('Auth Routes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('POST /api/auth/register should return 201 on success', async () => {
        vi.mocked(UserModel.findByEmail).mockResolvedValue(null);
        vi.mocked(UserModel.create).mockResolvedValue({ id: '123', email: 'test@example.com' } as any);
        vi.mocked(argon2.hash).mockResolvedValue('hashed-password');

        const response = await request(app)
            .post('/api/auth/register')
            .send({ email: 'test@example.com', password: 'password123' });

        expect(response.status).toBe(201);
        expect(response.body.message).toBe('User registered successfully');
    });

    it('POST /api/auth/login should return 200 and token on success', async () => {
        vi.mocked(UserModel.findByEmail).mockResolvedValue({
            id: '123',
            email: 'test@example.com',
            password: 'hashed-password'
        } as any);
        vi.mocked(argon2.verify).mockResolvedValue(true);

        const response = await request(app)
            .post('/api/auth/login')
            .send({ email: 'test@example.com', password: 'password123' });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('Login successful');
        expect(response.body.token).toBeDefined();
    });
});
