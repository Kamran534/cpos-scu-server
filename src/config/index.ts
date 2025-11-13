import dotenv from 'dotenv';

dotenv.config();

const port = parseInt(process.env.PORT || '4000', 10);

export const config = {
  port,
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  baseUrl: process.env.BASE_URL || `http://localhost:${port}`,
  corsOrigin: process.env.CORS_ORIGIN || '*', // Deprecated: use CORS_ORIGINS instead
  corsOrigins: process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || '*',
  jwtSecret: process.env.JWT_SECRET || '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  rabbitmq: {
    url: process.env.RABBITMQ_URL || '',
    queueName: process.env.QUEUE_NAME || '',
    queueType: process.env.QUEUE_TYPE || undefined, // Optional: 'quorum' or 'classic'
  },
  // Sync Scheduler Configuration
  sync: {
    cronSchedule: process.env.SYNC_CRON_SCHEDULE || '0 * * * *', // Default: every hour at minute 0
  },
  // TradeUnleashed Integration
  tradeUnleashed: {
    baseUrl: process.env.TRADEUNLEASHED_BASE_URL || 'https://q-prod.tradeunleashed.com',
    username: process.env.TRADEUNLEASHED_USERNAME || '03008420717',
    password: process.env.TRADEUNLEASHED_PASSWORD || 'Xaxu@pk00!',
    defaultFacilityId: process.env.TRADEUNLEASHED_FACILITY_ID || '886375309',
  },
};

