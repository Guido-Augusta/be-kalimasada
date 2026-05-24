import Redis from 'ioredis';

const ENABLE_REDIS = process.env.ENABLE_REDIS === 'true';
const REDIS_URL = process.env.REDIS_URL;
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379', 10);

let redisClient: any;

if (ENABLE_REDIS) {
  redisClient = REDIS_URL
    ? new Redis(REDIS_URL, {
        retryStrategy: (times: number) => {
          const delay = Math.min(times * 100, 3000);
          return delay;
        },
        maxRetriesPerRequest: 3,
      })
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
    // console.error('Redis connection error:', err.message);
    return 0;
  });
} else {
  // Mock Redis Client ketika dinonaktifkan agar tidak ada koneksi/error log
  redisClient = {
    get: async () => null,
    setex: async () => 'OK',
    del: async () => 0,
    keys: async () => [],
    on: () => {},
  };
}

export { redisClient };
