import { beforeAll, afterAll, vi } from 'vitest';
import { prisma } from '../src/utils/prisma';
import dotenv from 'dotenv';

dotenv.config();

// Mock Redis to prevent timeouts
vi.mock('../src/utils/redis', () => ({
  redisClient: {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue('OK'),
    setex: vi.fn().mockResolvedValue('OK'),
    del: vi.fn().mockResolvedValue(1),
    on: vi.fn(),
  },
}));

// Mock node-cron to prevent background jobs
vi.mock('node-cron', () => ({
  schedule: vi.fn().mockReturnValue({ start: vi.fn(), stop: vi.fn() }),
}));

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});
