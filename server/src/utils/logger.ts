import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const { combine, timestamp, printf, colorize, json, errors, metadata } = winston.format;

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    // Global formats (Logic, not just strings)
    format: combine(
        errors({ stack: true }),
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        metadata({ fillExcept: ['message', 'level', 'timestamp', 'stack'] })
    ),
    // 4. Handle process crashes
    exceptionHandlers: [
        new DailyRotateFile({ filename: 'logs/exceptions-%DATE%.log', datePattern: 'YYYY-MM-DD' })
    ],
    rejectionHandlers: [
        new DailyRotateFile({ filename: 'logs/rejections-%DATE%.log', datePattern: 'YYYY-MM-DD' })
    ],
    transports: [
        // Error logs: Structured JSON for Google Cloud/Elasticsearch
        new DailyRotateFile({
            filename: 'logs/error-%DATE%.log',
            level: 'error',
            format: json(),
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '30d'
        }),
        // Combined logs: Structured JSON
        new DailyRotateFile({
            filename: 'logs/combined-%DATE%.log',
            format: json(),
            zippedArchive: true,
            maxSize: '20m',
            maxFiles: '14d'
        })
    ]
});

// 5. Console: Pretty, colored, and human-readable for developers
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: combine(
            colorize(),
            printf((info) => {
                const { level, message, timestamp, stack } = info;
                const meta = info.metadata as Record<string, any>;

                const metaString = meta && Object.keys(meta).length
                    ? `\n${JSON.stringify(meta, null, 2)}`
                    : '';

                return `[${timestamp}] ${level}: ${stack || message}${metaString}`;
            })
        )
    }));
}

export default logger;