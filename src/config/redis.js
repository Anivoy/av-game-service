import Redis from 'ioredis';
import { redisConfig } from './env.js';

const redisClient = new Redis({
  host: redisConfig.REDIS_HOST || 'localhost',
  port: redisConfig.REDIS_PORT || 6379,
  password: redisConfig.REDIS_PASSWORD || undefined,
  db: redisConfig.REDIS_DB || 0,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
});

export { redisClient };