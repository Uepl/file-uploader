import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import generalRoutes from '../generalRoutes.js';

const app = express();
app.use(express.json());
app.use('/api', generalRoutes);

describe('General Routes', () => {
    it('GET /api/health should return 200 and OK', async () => {
        const response = await request(app).get('/api/health');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ status: 'ok' });
    });
});
