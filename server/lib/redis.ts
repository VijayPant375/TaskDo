import { Redis } from 'ioredis';
import type { StoredOAuthState, StoredSession } from './store.js';

let sharedRedisClient: Redis | null = null;
let hasLoggedMissingRedisUrl = false;
let redisAvailable = false;
const refreshTokenLifetimeSeconds = 60 * 60 * 24 * 14;
const oauthStateLifetimeSeconds = 60 * 10;

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

function getSessionKey(sessionId: string) {
  return `session:${sessionId}`;
}

function getOAuthStateKey(state: string) {
  return `oauth:${state}`;
}

export async function setSession(session: StoredSession) {
  const client = getRedisClient();
  if (!client) {
    return false;
  }

  try {
    if (!(await isRedisAvailable())) {
      return false;
    }

    await client.set(
      getSessionKey(session.id),
      JSON.stringify(session),
      'EX',
      refreshTokenLifetimeSeconds
    );
    return true;
  } catch (error) {
    redisAvailable = false;
    console.warn('Failed to write session to Redis. Falling back to file-backed storage.', error);
    return false;
  }
}

export async function getSession(sessionId: string) {
  const client = getRedisClient();
  if (!client) {
    return null;
  }

  try {
    if (!(await isRedisAvailable())) {
      return null;
    }

    const raw = await client.get(getSessionKey(sessionId));
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch (error) {
    redisAvailable = false;
    console.warn('Failed to read session from Redis. Falling back to file-backed storage.', error);
    return null;
  }
}

export async function deleteSession(sessionId: string) {
  const client = getRedisClient();
  if (!client) {
    return false;
  }

  try {
    if (!(await isRedisAvailable())) {
      return false;
    }

    await client.del(getSessionKey(sessionId));
    return true;
  } catch (error) {
    redisAvailable = false;
    console.warn('Failed to delete session from Redis. Falling back to file-backed storage.', error);
    return false;
  }
}

export async function setOAuthState(state: StoredOAuthState) {
  const client = getRedisClient();
  if (!client) {
    return false;
  }

  try {
    if (!(await isRedisAvailable())) {
      return false;
    }

    await client.set(
      getOAuthStateKey(state.state),
      JSON.stringify(state),
      'EX',
      oauthStateLifetimeSeconds
    );
    return true;
  } catch (error) {
    redisAvailable = false;
    console.warn('Failed to write OAuth state to Redis. Falling back to file-backed storage.', error);
    return false;
  }
}

export async function getOAuthState(stateKey: string) {
  const client = getRedisClient();
  if (!client) {
    return null;
  }

  try {
    if (!(await isRedisAvailable())) {
      return null;
    }

    const raw = await client.get(getOAuthStateKey(stateKey));
    return raw ? (JSON.parse(raw) as StoredOAuthState) : null;
  } catch (error) {
    redisAvailable = false;
    console.warn('Failed to read OAuth state from Redis. Falling back to file-backed storage.', error);
    return null;
  }
}

export async function deleteOAuthState(stateKey: string) {
  const client = getRedisClient();
  if (!client) {
    return false;
  }

  try {
    if (!(await isRedisAvailable())) {
      return false;
    }

    await client.del(getOAuthStateKey(stateKey));
    return true;
  } catch (error) {
    redisAvailable = false;
    console.warn('Failed to delete OAuth state from Redis. Falling back to file-backed storage.', error);
    return false;
  }
}

export const redis = {
  get client() {
    return getRedisClient();
  },
};
