import { Request, Response } from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { User, UserModel } from '../models/userModel.js';
import logger from '../utils/logger.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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