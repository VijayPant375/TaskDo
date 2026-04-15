import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { decrypt, encrypt } from './crypto.js';
import {
  getRedisClient,
  deleteSession as deleteRedisSession,
  getSession as getRedisSession,
  isRedisAvailable,
  setOAuthState as setRedisOAuthState,
  setSession as setRedisSession,
} from './redis.js';

export interface StoredTask {
  id: string;
  userId: string;
  name?: string;
  description?: string;
  _encrypted?: string;
  _nonce?: string;
  deadline: string;
  priority: 'high' | 'medium' | 'low';
  notificationEnabled: boolean;
  alarmTime: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  provider: 'google' | 'local';
  providerAccountId: string;
  createdAt: string;
  updatedAt: string;
}

export interface StoredSession {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: string;
  createdAt: string;
  lastUsedAt: string;
}

export interface StoredSubscription {
  userId: string;
  tier: 'free' | 'premium';
  status: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  billingPeriod: 'monthly' | 'yearly' | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface StoredOAuthState {
  state: string;
  codeVerifier: string;
  returnTo: string;
  expiresAt: string;
}

export interface DatabaseShape {
  oauthStates: StoredOAuthState[];
  sessions: StoredSession[];
  subscriptions: StoredSubscription[];
  tasks: StoredTask[];
  users: StoredUser[];
}

export interface IndexedDatabase extends DatabaseShape {
  userById: Map<string, StoredUser>;
  userByEmail: Map<string, StoredUser>;
  userByProviderAccountId: Map<string, StoredUser>;
  tasksByUserId: Map<string, StoredTask[]>;
  subscriptionByUserId: Map<string, StoredSubscription>;
  subscriptionByStripeCustomerId: Map<string, StoredSubscription>;
  subscriptionByStripeSubscriptionId: Map<string, StoredSubscription>;
}

const currentFilePath = fileURLToPath(import.meta.url);
const libraryDirectory = path.dirname(currentFilePath);
const dataDirectory = path.resolve(libraryDirectory, '..', 'data');
const storePath = path.join(dataDirectory, 'store.json');

const emptyDatabase: DatabaseShape = {
  oauthStates: [],
  sessions: [],
  subscriptions: [],
  tasks: [],
  users: [],
};

type TaskContent = Pick<StoredTask, 'description' | 'name'>;

function decryptTaskContent(task: StoredTask): TaskContent {
  if (!task._encrypted) {
    return {
      description: task.description ?? '',
      name: task.name ?? '',
    };
  }

  if (!task._nonce) {
    throw new Error(`Task ${task.id} is missing its encryption nonce.`);
  }

  const decrypted = decrypt(task._encrypted, task._nonce);
  const parsed = JSON.parse(decrypted) as Partial<TaskContent>;

  return {
    description: typeof parsed.description === 'string' ? parsed.description : '',
    name: typeof parsed.name === 'string' ? parsed.name : '',
  };
}

function encryptTaskContent(input: TaskContent) {
  const payload = JSON.stringify({
    description: input.description ?? '',
    name: input.name ?? '',
  });
  const { encrypted, nonce } = encrypt(payload);

  return {
    _encrypted: encrypted,
    _nonce: nonce,
  };
}

function withDecryptedTaskContent(task: StoredTask): StoredTask {
  const content = decryptTaskContent(task);

  return {
    ...task,
    description: content.description,
    name: content.name,
  };
}

function buildTaskSignature(task: Pick<StoredTask, 'alarmTime' | 'deadline'> & TaskContent) {
  return `${task.name ?? ''}::${task.deadline}::${task.alarmTime}`;
}

function cloneDatabaseShape(database: DatabaseShape): DatabaseShape {
  return {
    oauthStates: [...database.oauthStates],
    sessions: [...database.sessions],
    subscriptions: [...database.subscriptions],
    tasks: [...database.tasks],
    users: [...database.users],
  };
}

export function buildIndexes(database: DatabaseShape): IndexedDatabase {
  const indexedDatabase: IndexedDatabase = {
    ...cloneDatabaseShape(database),
    subscriptionByStripeCustomerId: new Map<string, StoredSubscription>(),
    subscriptionByStripeSubscriptionId: new Map<string, StoredSubscription>(),
    subscriptionByUserId: new Map<string, StoredSubscription>(),
    tasksByUserId: new Map<string, StoredTask[]>(),
    userByEmail: new Map<string, StoredUser>(),
    userById: new Map<string, StoredUser>(),
    userByProviderAccountId: new Map<string, StoredUser>(),
  };

  for (const user of indexedDatabase.users) {
    indexedDatabase.userById.set(user.id, user);
    indexedDatabase.userByEmail.set(user.email.toLowerCase(), user);
    indexedDatabase.userByProviderAccountId.set(user.providerAccountId, user);
  }

  for (const task of indexedDatabase.tasks) {
    const tasks = indexedDatabase.tasksByUserId.get(task.userId) ?? [];
    tasks.push(task);
    indexedDatabase.tasksByUserId.set(task.userId, tasks);
  }

  for (const subscription of indexedDatabase.subscriptions) {
    indexedDatabase.subscriptionByUserId.set(subscription.userId, subscription);

    if (subscription.stripeCustomerId) {
      indexedDatabase.subscriptionByStripeCustomerId.set(
        subscription.stripeCustomerId,
        subscription
      );
    }

    if (subscription.stripeSubscriptionId) {
      indexedDatabase.subscriptionByStripeSubscriptionId.set(
        subscription.stripeSubscriptionId,
        subscription
      );
    }
  }

  return indexedDatabase;
}

function refreshUserIndexes(database: IndexedDatabase, user: StoredUser) {
  database.userById.set(user.id, user);

  for (const [email, indexedUser] of database.userByEmail.entries()) {
    if (indexedUser.id === user.id && email !== user.email.toLowerCase()) {
      database.userByEmail.delete(email);
    }
  }

  for (const [providerAccountId, indexedUser] of database.userByProviderAccountId.entries()) {
    if (indexedUser.id === user.id && providerAccountId !== user.providerAccountId) {
      database.userByProviderAccountId.delete(providerAccountId);
    }
  }

  database.userByEmail.set(user.email.toLowerCase(), user);
  database.userByProviderAccountId.set(user.providerAccountId, user);
}

function refreshTasksIndex(database: IndexedDatabase, userId: string) {
  const tasks = database.tasks.filter((task) => task.userId === userId);

  if (tasks.length === 0) {
    database.tasksByUserId.delete(userId);
    return;
  }

  database.tasksByUserId.set(userId, tasks);
}

function refreshSubscriptionIndexes(database: IndexedDatabase, subscription: StoredSubscription) {
  database.subscriptionByUserId.set(subscription.userId, subscription);

  for (const [customerId, indexedSubscription] of database.subscriptionByStripeCustomerId.entries()) {
    if (
      indexedSubscription.userId === subscription.userId &&
      customerId !== subscription.stripeCustomerId
    ) {
      database.subscriptionByStripeCustomerId.delete(customerId);
    }
  }

  for (const [subscriptionId, indexedSubscription] of database.subscriptionByStripeSubscriptionId.entries()) {
    if (
      indexedSubscription.userId === subscription.userId &&
      subscriptionId !== subscription.stripeSubscriptionId
    ) {
      database.subscriptionByStripeSubscriptionId.delete(subscriptionId);
    }
  }

  if (subscription.stripeCustomerId) {
    database.subscriptionByStripeCustomerId.set(subscription.stripeCustomerId, subscription);
  }

  if (subscription.stripeSubscriptionId) {
    database.subscriptionByStripeSubscriptionId.set(
      subscription.stripeSubscriptionId,
      subscription
    );
  }
}

export function updateIndexesOnWrite(
  database: IndexedDatabase,
  entity: 'user' | 'task' | 'subscription',
  record: unknown
) {
  if (entity === 'user') {
    const user = record as StoredUser | null;
    if (!user) {
      return;
    }

    refreshUserIndexes(database, user);
    return;
  }

  if (entity === 'task') {
    const task = record as StoredTask | null;
    if (!task) {
      return;
    }

    refreshTasksIndex(database, task.userId);
    return;
  }

  const subscription = record as StoredSubscription | null;
  if (!subscription) {
    return;
  }

  refreshSubscriptionIndexes(database, subscription);
}

function ensureStoreFile() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }

  if (!fs.existsSync(storePath)) {
    fs.writeFileSync(storePath, JSON.stringify(emptyDatabase, null, 2));
  }
}

function readDatabase(): IndexedDatabase {
  ensureStoreFile();

  try {
    const raw = fs.readFileSync(storePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DatabaseShape>;

    return buildIndexes({
      oauthStates: parsed.oauthStates ?? [],
      sessions: parsed.sessions ?? [],
      subscriptions: parsed.subscriptions ?? [],
      tasks: parsed.tasks ?? [],
      users: parsed.users ?? [],
    });
  } catch (error) {
    console.error('Failed to read auth/task store. Falling back to an empty database.', error);
    return buildIndexes(structuredClone(emptyDatabase));
  }
}

function writeDatabase(next: DatabaseShape) {
  ensureStoreFile();
  fs.writeFileSync(
    storePath,
    JSON.stringify(
      {
        oauthStates: next.oauthStates,
        sessions: next.sessions,
        subscriptions: next.subscriptions,
        tasks: next.tasks,
        users: next.users,
      },
      null,
      2
    )
  );
}

function mutateDatabase<T>(mutator: (database: IndexedDatabase) => T): T {
  const database = readDatabase();
  const result = mutator(database);
  writeDatabase(database);
  return result;
}

export function getUserById(userId: string) {
  return readDatabase().userById.get(userId) ?? null;
}

export function getUserByProviderAccountId(providerAccountId: string) {
  return readDatabase().userByProviderAccountId.get(providerAccountId) ?? null;
}

export function getUserByEmail(email: string) {
  return readDatabase().userByEmail.get(email.toLowerCase()) ?? null;
}

export function upsertGoogleUser(input: {
  avatarUrl: string | null;
  email: string;
  name: string;
  providerAccountId: string;
}) {
  return mutateDatabase((database) => {
    const now = new Date().toISOString();
    const existing =
      database.userByProviderAccountId.get(input.providerAccountId) ??
      database.userByEmail.get(input.email.toLowerCase()) ??
      null;

    if (existing) {
      existing.avatarUrl = input.avatarUrl;
      existing.email = input.email;
      existing.name = input.name;
      existing.providerAccountId = input.providerAccountId;
      existing.updatedAt = now;
      updateIndexesOnWrite(database, 'user', existing);
      return existing;
    }

    const created: StoredUser = {
      id: randomUUID(),
      avatarUrl: input.avatarUrl,
      createdAt: now,
      email: input.email,
      name: input.name,
      provider: 'google',
      providerAccountId: input.providerAccountId,
      updatedAt: now,
    };

    database.users.push(created);
    updateIndexesOnWrite(database, 'user', created);
    return created;
  });
}

export function upsertLocalUser(input: {
  email: string;
  id: string;
  name: string;
}) {
  return mutateDatabase((database) => {
    const now = new Date().toISOString();
    const existing =
      database.userById.get(input.id) ?? database.userByEmail.get(input.email.toLowerCase()) ?? null;

    if (existing) {
      existing.avatarUrl = existing.avatarUrl ?? null;
      existing.email = input.email;
      existing.name = input.name;
      existing.provider = existing.provider ?? 'local';
      existing.providerAccountId = existing.providerAccountId || input.id;
      existing.updatedAt = now;
      updateIndexesOnWrite(database, 'user', existing);
      return existing;
    }

    const created: StoredUser = {
      id: input.id,
      avatarUrl: null,
      createdAt: now,
      email: input.email,
      name: input.name,
      provider: 'local',
      providerAccountId: input.id,
      updatedAt: now,
    };

    database.users.push(created);
    updateIndexesOnWrite(database, 'user', created);
    return created;
  });
}

export async function saveOAuthState(input: StoredOAuthState) {
  if (await setRedisOAuthState(input)) {
    return;
  }

  mutateDatabase((database) => {
    database.oauthStates = database.oauthStates.filter((item) => item.state !== input.state);
    database.oauthStates.push(input);
  });
}

function consumeOAuthStateFromFile(state: string) {
  return mutateDatabase((database) => {
    const match = database.oauthStates.find((item) => item.state === state) ?? null;
    database.oauthStates = database.oauthStates.filter((item) => item.state !== state);
    return match;
  });
}

export async function consumeOAuthState(state: string) {
  const client = getRedisClient();

  if (client && (await isRedisAvailable())) {
    try {
      const key = `oauth:${state}`;
      const result = await client.multi().get(key).del(key).exec();
      const rawState = result?.[0]?.[1];

      if (typeof rawState === 'string') {
        return JSON.parse(rawState) as StoredOAuthState;
      }

      return null;
    } catch (error) {
      console.warn('Failed to consume OAuth state from Redis. Falling back to file-backed storage.', error);
    }
  }

  return consumeOAuthStateFromFile(state);
}

export async function pruneExpiredOAuthStates() {
  if (await isRedisAvailable()) {
    return;
  }

  const now = Date.now();
  mutateDatabase((database) => {
    database.oauthStates = database.oauthStates.filter(
      (item) => new Date(item.expiresAt).getTime() > now
    );
  });
}

export async function createSession(input: {
  expiresAt: string;
  refreshTokenHash: string;
  userId: string;
}) {
  const session = mutateDatabase((database) => {
    const now = new Date().toISOString();
    const createdSession: StoredSession = {
      id: randomUUID(),
      createdAt: now,
      expiresAt: input.expiresAt,
      lastUsedAt: now,
      refreshTokenHash: input.refreshTokenHash,
      userId: input.userId,
    };

    database.sessions.push(createdSession);
    return createdSession;
  });

  await setRedisSession(session);
  return session;
}

function getSessionByIdFromFile(sessionId: string) {
  return readDatabase().sessions.find((session) => session.id === sessionId) ?? null;
}

export async function getSessionById(sessionId: string) {
  const redisSession = await getRedisSession(sessionId);
  if (redisSession) {
    return redisSession;
  }

  return getSessionByIdFromFile(sessionId);
}

export async function updateSessionRefreshToken(
  sessionId: string,
  refreshTokenHash: string,
  expiresAt: string
) {
  const session = mutateDatabase((database) => {
    const session = database.sessions.find((item) => item.id === sessionId);
    if (!session) {
      return null;
    }

    session.refreshTokenHash = refreshTokenHash;
    session.expiresAt = expiresAt;
    session.lastUsedAt = new Date().toISOString();
    return session;
  });

  if (session) {
    await setRedisSession(session);
  }
}

export async function deleteSession(sessionId: string) {
  mutateDatabase((database) => {
    database.sessions = database.sessions.filter((session) => session.id !== sessionId);
  });

  await deleteRedisSession(sessionId);
}

export async function pruneExpiredSessions() {
  const now = Date.now();
  const redisIsAvailable = await isRedisAvailable();
  const database = readDatabase();

  if (!redisIsAvailable) {
    database.sessions = database.sessions.filter((session) => new Date(session.expiresAt).getTime() > now);
    writeDatabase(database);
    return;
  }

  const nextSessions: StoredSession[] = [];

  for (const session of database.sessions) {
    const isExpired = new Date(session.expiresAt).getTime() <= now;
    if (!isExpired) {
      nextSessions.push(session);
      continue;
    }

    const redisSession = await getRedisSession(session.id);
    if (redisSession) {
      nextSessions.push(session);
    }
  }

  database.sessions = nextSessions;
  writeDatabase(database);
}

export function listTasksByUser(userId: string) {
  const tasks = readDatabase().tasksByUserId.get(userId) ?? [];
  return [...tasks]
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .map(withDecryptedTaskContent);
}

export function countActiveTasksByUser(userId: string) {
  return (readDatabase().tasksByUserId.get(userId) ?? []).filter((task) => !task.completed).length;
}

export function createTaskForUser(
  userId: string,
  input: Omit<StoredTask, 'createdAt' | 'id' | 'updatedAt' | 'userId'>
) {
  return mutateDatabase((database) => {
    const now = new Date().toISOString();
    const encryptedContent = encryptTaskContent({
      description: input.description ?? '',
      name: input.name ?? '',
    });
    const task: StoredTask = {
      ...input,
      ...encryptedContent,
      createdAt: now,
      description: undefined,
      id: randomUUID(),
      name: undefined,
      updatedAt: now,
      userId,
    };

    database.tasks.push(task);
    updateIndexesOnWrite(database, 'task', task);
    return withDecryptedTaskContent(task);
  });
}

export function updateTaskForUser(
  userId: string,
  taskId: string,
  input: Partial<Omit<StoredTask, 'createdAt' | 'id' | 'updatedAt' | 'userId'>>
) {
  return mutateDatabase((database) => {
    const task =
      (database.tasksByUserId.get(userId) ?? []).find((item) => item.id === taskId) ?? null;
    if (!task) {
      return null;
    }

    const nextContent = {
      ...decryptTaskContent(task),
      description: input.description ?? decryptTaskContent(task).description,
      name: input.name ?? decryptTaskContent(task).name,
    };
    const encryptedContent = encryptTaskContent(nextContent);

    Object.assign(task, input, encryptedContent, {
      description: undefined,
      name: undefined,
      updatedAt: new Date().toISOString(),
    });

    updateIndexesOnWrite(database, 'task', task);
    return withDecryptedTaskContent(task);
  });
}

export function deleteTaskForUser(userId: string, taskId: string) {
  return mutateDatabase((database) => {
    const deletedTask = (database.tasksByUserId.get(userId) ?? []).find((task) => task.id === taskId) ?? null;
    const beforeCount = database.tasks.length;
    database.tasks = database.tasks.filter((task) => !(task.id === taskId && task.userId === userId));

    if (deletedTask) {
      updateIndexesOnWrite(database, 'task', deletedTask);
    }

    return database.tasks.length !== beforeCount;
  });
}

export function importTasksForUser(
  userId: string,
  tasks: Array<Omit<StoredTask, 'createdAt' | 'id' | 'updatedAt' | 'userId'>>
) {
  return mutateDatabase((database) => {
    const now = new Date().toISOString();
    const existingSignatures = new Set(
      (database.tasksByUserId.get(userId) ?? []).map((task) => {
        const content = decryptTaskContent(task);
        return buildTaskSignature({ ...task, ...content });
      })
    );

    const created: StoredTask[] = [];

    for (const input of tasks) {
      const signature = buildTaskSignature(input);
      if (existingSignatures.has(signature)) {
        continue;
      }

      const encryptedContent = encryptTaskContent({
        description: input.description ?? '',
        name: input.name ?? '',
      });
      const task: StoredTask = {
        ...input,
        ...encryptedContent,
        createdAt: now,
        description: undefined,
        id: randomUUID(),
        name: undefined,
        updatedAt: now,
        userId,
      };

      database.tasks.push(task);
      created.push(task);
      existingSignatures.add(signature);
    }

    if (created.length > 0) {
      updateIndexesOnWrite(database, 'task', { userId } satisfies Pick<StoredTask, 'userId'>);
    }

    return created.map(withDecryptedTaskContent);
  });
}

export function migrateTaskEncryptionForUser(userId: string) {
  return mutateDatabase((database) => {
    let migratedCount = 0;

    for (const task of database.tasksByUserId.get(userId) ?? []) {
      if (task._encrypted) {
        continue;
      }

      const encryptedContent = encryptTaskContent({
        description: task.description ?? '',
        name: task.name ?? '',
      });

      task._encrypted = encryptedContent._encrypted;
      task._nonce = encryptedContent._nonce;
      task.name = undefined;
      task.description = undefined;
      task.updatedAt = new Date().toISOString();
      migratedCount += 1;
    }

    if (migratedCount > 0) {
      updateIndexesOnWrite(database, 'task', { userId } satisfies Pick<StoredTask, 'userId'>);
    }

    return migratedCount;
  });
}

export function getSubscriptionByUserId(userId: string) {
  return readDatabase().subscriptionByUserId.get(userId) ?? null;
}

export function getSubscriptionByStripeCustomerId(customerId: string) {
  return readDatabase().subscriptionByStripeCustomerId.get(customerId) ?? null;
}

export function getSubscriptionByStripeSubscriptionId(subscriptionId: string) {
  return readDatabase().subscriptionByStripeSubscriptionId.get(subscriptionId) ?? null;
}

export function upsertSubscriptionForUser(
  userId: string,
  input: Omit<StoredSubscription, 'createdAt' | 'updatedAt' | 'userId'>
) {
  return mutateDatabase((database) => {
    const now = new Date().toISOString();
    const existing = database.subscriptionByUserId.get(userId) ?? null;

    if (existing) {
      existing.tier = input.tier;
      existing.status = input.status;
      existing.stripeCustomerId = input.stripeCustomerId;
      existing.stripeSubscriptionId = input.stripeSubscriptionId;
      existing.billingPeriod = input.billingPeriod;
      existing.currentPeriodEnd = input.currentPeriodEnd;
      existing.cancelAtPeriodEnd = input.cancelAtPeriodEnd;
      existing.updatedAt = now;
      updateIndexesOnWrite(database, 'subscription', existing);
      return existing;
    }

    const created: StoredSubscription = {
      ...input,
      createdAt: now,
      updatedAt: now,
      userId,
    };

    database.subscriptions.push(created);
    updateIndexesOnWrite(database, 'subscription', created);
    return created;
  });
}
