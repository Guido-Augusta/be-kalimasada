import Redis from 'ioredis';

const REDIS_URL = process.env.REDIS_URL;
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

const redisClient = REDIS_URL
  ? new Redis(REDIS_URL)
  : new Redis({
      host: REDIS_HOST,
      port: REDIS_PORT,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    });

redisClient.on('connect', () => {
  console.log('Connected to Redis');
});

redisClient.on('error', (err: Error) => {
  console.error('Redis connection error:', err.message);
});

export { redisClient };
