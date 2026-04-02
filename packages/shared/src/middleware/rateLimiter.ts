import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';
import { logger } from '../logger.js';

// 1. Setup the Limiter Instances
const generalLimiter = new RateLimiterMemory({
    points: 50,          // 50 requests
    duration: 60,        // per 1 minute
});

const uploadLimiter = new RateLimiterMemory({
    points: 3,           // 3 uploads
    duration: 3600,      // per 1 hour
    blockDuration: 600,  // Block for 10 mins if they spam
});

// 2. Export the Middleware functions
export const generalRateLimit = (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || '127.0.0.1';

    generalLimiter.consume(ip)
        .then(() => next())
        .catch(() => {
            logger.warn('General rate limit exceeded', {
                ip,
                path: req.path,
                method: req.method
            });
            res.status(429).json({ error: 'Too many requests' });
        });
};

export const uploadRateLimit = (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || '127.0.0.1';
    uploadLimiter.consume(ip)
        .then((rateLimiterRes) => {
            res.set('X-RateLimit-Limit', '3');
            res.set('X-RateLimit-Remaining', String(rateLimiterRes.remainingPoints));

            logger.info('Upload request allowed', {
                ip,
                path: req.path,
                remainingPoints: rateLimiterRes.remainingPoints
            });

            next();
        })
        .catch((rateLimiterRes) => {
            const retryAfter = Math.round(rateLimiterRes.msBeforeNext / 1000) || 1;
            res.set('Retry-After', String(retryAfter));
            res.set('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString());

            logger.warn('Upload rate limit exceeded', {
                ip,
                path: req.path,
                retryAfterSeconds: retryAfter,
                resetAt: new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString()
            });

            res.status(429).json({
                error: 'Upload limit reached',
                message: `Please wait ${Math.ceil(retryAfter / 60)} minutes.`
            });
        });
};
