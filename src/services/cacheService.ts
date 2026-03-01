import { redisClient } from '../utils/redis';

export async function cacheGet(key: string): Promise<string | null> {
  try {
    return await redisClient.get(key);
  } catch (error) {
    console.warn(
      'Redis cacheGet error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return null;
  }
}

export async function cacheSet(
  key: string,
  data: unknown,
  ttlSeconds: number = 3600
): Promise<boolean> {
  try {
    const jsonData = JSON.stringify(data);
    await redisClient.setex(key, ttlSeconds, jsonData);
    return true;
  } catch (error) {
    console.warn(
      'Redis cacheSet error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return false;
  }
}

export async function cacheDelete(key: string): Promise<boolean> {
  try {
    await redisClient.del(key);
    return true;
  } catch (error) {
    console.warn(
      'Redis cacheDelete error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return false;
  }
}

export async function cacheDeletePattern(pattern: string): Promise<boolean> {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
    return true;
  } catch (error) {
    console.warn(
      'Redis cacheDeletePattern error:',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return false;
  }
}

export async function cacheGetParsed<T>(key: string): Promise<T | null> {
  const data = await cacheGet(key);
  if (data) {
    try {
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }
  return null;
}
