import { Request, Response, NextFunction } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

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
    // req.ip can be undefined in some edge cases, provide a fallback like 'anonymous' 
    // or use ! if 'trust proxy' is enabled.
    const ip = req.ip || '127.0.0.1';

    generalLimiter.consume(ip)
        .then(() => next())
        .catch(() => {
            res.status(429).json({ error: 'Too many requests' });
        });
};

export const uploadRateLimit = (req: Request, res: Response, next: NextFunction) => {
    uploadLimiter.consume(req.ip!)
        .then((rateLimiterRes) => {
            // Optional: Tell the user how many they have left
            res.set('X-RateLimit-Limit', '3');
            res.set('X-RateLimit-Remaining', String(rateLimiterRes.remainingPoints));
            next();
        })
        .catch((rateLimiterRes) => {
            const retryAfter = Math.round(rateLimiterRes.msBeforeNext / 1000) || 1;

            // Standard Header
            res.set('Retry-After', String(retryAfter));

            // Custom Headers (Good for debugging)
            res.set('X-RateLimit-Reset', new Date(Date.now() + rateLimiterRes.msBeforeNext).toISOString());

            res.status(429).json({
                error: 'Upload limit reached',
                message: `Please wait ${Math.ceil(retryAfter / 60)} minutes.`
            });
        });
};