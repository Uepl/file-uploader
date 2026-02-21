import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || '';

export const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) {
        logger.warn("No token found in header", {
            ip: req.ip,
            path: req.path
        })
        return res.status(401).json({ error: 'Authentication token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            logger.warn("JWT Verification Failed", {
                error: err.message,
                ip: req.ip,
                path: req.path
            });
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = decoded as { uid: string };
        next();
    });
};