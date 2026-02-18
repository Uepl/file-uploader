import { Request, Response } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { UserModel } from '../models/userModel.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) return res.status(400).json({ error: 'Missing fields' });

        const existingUser = await UserModel.findByEmail(email);
        if (existingUser) return res.status(400).json({ error: 'User already exists' });

        // Hash with Argon2
        const hashedPassword = await argon2.hash(password, {
            type: argon2.argon2id,
            memoryCost: 2 ** 16,
            timeCost: 3,
            parallelism: 1
        });

        await UserModel.create({ email, password: hashedPassword });
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Registration failed' });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        console.log("email", email)
        console.log("password", password)
        // Get user from Model
        const user: any = await UserModel.findByEmail(email);
        if (!user) return res.status(400).json({ error: 'Invalid credentials' });

        // Verify Argon2 Hash
        const validPassword = await argon2.verify(user.password, password);
        if (!validPassword) return res.status(400).json({ error: 'Invalid credentials' });

        // Generate Token
        const token = jwt.sign({ uid: user.id, email: user.email }, JWT_SECRET, { expiresIn: '1h' });

        res.json({ message: 'Login successful', token });
    } catch (error) {
        res.status(500).json({ error: 'Login failed' });
    }
};