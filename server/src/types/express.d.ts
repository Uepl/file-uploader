import * as express from 'express';

declare global {
    namespace Express {
        interface Request {
            user?: {
                uid: string;
                email?: string;
                // add other fields you expect in your JWT payload
            };
        }
    }
}