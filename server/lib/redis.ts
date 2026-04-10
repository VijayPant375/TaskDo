import { Redis } from 'ioredis';

let sharedRedisClient: Redis | null = null;
let hasLoggedMissingRedisUrl = false;
let redisAvailable = false;

function getRedisUrl() {
  const value = process.env.REDIS_URL?.trim();
  return value ? value : null;
}

function createRedisClient() {
  const redisUrl = getRedisUrl();
  if (!redisUrl) {
    if (!hasLoggedMissingRedisUrl) {
      console.warn('REDIS_URL is not configured. Redis features are disabled.');
      hasLoggedMissingRedisUrl = true;
    }

    redisAvailable = false;
    return null;
  }

  const client = new Redis(redisUrl, {
    enableOfflineQueue: false,
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });

  client.on('ready', () => {
    redisAvailable = true;
  });

  client.on('error', (error: unknown) => {
    redisAvailable = false;
    console.warn('Redis connection error. Falling back to file-backed storage.', error);
  });

  client.on('close', () => {
    redisAvailable = false;
  });

  return client;
}

export function getRedisClient() {
  if (!sharedRedisClient) {
    sharedRedisClient = createRedisClient();
  }

  return sharedRedisClient;
}

export async function isRedisAvailable() {
  const client = getRedisClient();
  if (!client) {
    return false;
  }

  if (redisAvailable) {
    return true;
  }

  try {
    if (client.status === 'wait') {
      await client.connect();
    }

    const pong = await client.ping();
    redisAvailable = pong === 'PONG';
  } catch (error) {
    redisAvailable = false;
    console.warn('Redis is unavailable. Falling back to file-backed storage.', error);
  }

  return redisAvailable;
}

export const redis = {
  get client() {
    return getRedisClient();
  },
};
