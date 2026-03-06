import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
});

export const childLogger = (context: string) => logger.child({ context });
