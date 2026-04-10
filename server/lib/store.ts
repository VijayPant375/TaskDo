import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

export interface StoredTask {
  id: string;
  userId: string;
  name: string;
  description: string;
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
  provider: 'google';
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

interface DatabaseShape {
  oauthStates: StoredOAuthState[];
  sessions: StoredSession[];
  subscriptions: StoredSubscription[];
  tasks: StoredTask[];
  users: StoredUser[];
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

function ensureStoreFile() {
  if (!fs.existsSync(dataDirectory)) {
    fs.mkdirSync(dataDirectory, { recursive: true });
  }

  if (!fs.existsSync(storePath)) {
    fs.writeFileSync(storePath, JSON.stringify(emptyDatabase, null, 2));
  }
}

function readDatabase(): DatabaseShape {
  ensureStoreFile();

  try {
    const raw = fs.readFileSync(storePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<DatabaseShape>;

    return {
      oauthStates: parsed.oauthStates ?? [],
      sessions: parsed.sessions ?? [],
      subscriptions: parsed.subscriptions ?? [],
      tasks: parsed.tasks ?? [],
      users: parsed.users ?? [],
    };
  } catch (error) {
    console.error('Failed to read auth/task store. Falling back to an empty database.', error);
    return structuredClone(emptyDatabase);
  }
}

function writeDatabase(next: DatabaseShape) {
  ensureStoreFile();
  fs.writeFileSync(storePath, JSON.stringify(next, null, 2));
}

function mutateDatabase<T>(mutator: (database: DatabaseShape) => T): T {
  const database = readDatabase();
  const result = mutator(database);
  writeDatabase(database);
  return result;
}

export function getUserById(userId: string) {
  return readDatabase().users.find((user) => user.id === userId) ?? null;
}

export function getUserByProviderAccountId(providerAccountId: string) {
  return readDatabase().users.find((user) => user.providerAccountId === providerAccountId) ?? null;
}

export function getUserByEmail(email: string) {
  return readDatabase().users.find((user) => user.email.toLowerCase() === email.toLowerCase()) ?? null;
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
      database.users.find((user) => user.providerAccountId === input.providerAccountId) ??
      database.users.find((user) => user.email.toLowerCase() === input.email.toLowerCase());

    if (existing) {
      existing.avatarUrl = input.avatarUrl;
      existing.email = input.email;
      existing.name = input.name;
      existing.providerAccountId = input.providerAccountId;
      existing.updatedAt = now;
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
    return created;
  });
}

export function saveOAuthState(input: StoredOAuthState) {
  mutateDatabase((database) => {
    database.oauthStates = database.oauthStates.filter((item) => item.state !== input.state);
    database.oauthStates.push(input);
  });
}

export function consumeOAuthState(state: string) {
  return mutateDatabase((database) => {
    const match = database.oauthStates.find((item) => item.state === state) ?? null;
    database.oauthStates = database.oauthStates.filter((item) => item.state !== state);
    return match;
  });
}

export function pruneExpiredOAuthStates() {
  const now = Date.now();
  mutateDatabase((database) => {
    database.oauthStates = database.oauthStates.filter(
      (item) => new Date(item.expiresAt).getTime() > now
    );
  });
}

export function createSession(input: {
  expiresAt: string;
  refreshTokenHash: string;
  userId: string;
}) {
  return mutateDatabase((database) => {
    const now = new Date().toISOString();
    const session: StoredSession = {
      id: randomUUID(),
      createdAt: now,
      expiresAt: input.expiresAt,
      lastUsedAt: now,
      refreshTokenHash: input.refreshTokenHash,
      userId: input.userId,
    };

    database.sessions.push(session);
    return session;
  });
}

export function getSessionById(sessionId: string) {
  return readDatabase().sessions.find((session) => session.id === sessionId) ?? null;
}

export function updateSessionRefreshToken(sessionId: string, refreshTokenHash: string, expiresAt: string) {
  mutateDatabase((database) => {
    const session = database.sessions.find((item) => item.id === sessionId);
    if (!session) {
      return;
    }

    session.refreshTokenHash = refreshTokenHash;
    session.expiresAt = expiresAt;
    session.lastUsedAt = new Date().toISOString();
  });
}

export function deleteSession(sessionId: string) {
  mutateDatabase((database) => {
    database.sessions = database.sessions.filter((session) => session.id !== sessionId);
  });
}

export function pruneExpiredSessions() {
  const now = Date.now();
  mutateDatabase((database) => {
    database.sessions = database.sessions.filter(
      (session) => new Date(session.expiresAt).getTime() > now
    );
  });
}

export function listTasksByUser(userId: string) {
  return readDatabase()
    .tasks.filter((task) => task.userId === userId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export function countActiveTasksByUser(userId: string) {
  return readDatabase().tasks.filter((task) => task.userId === userId && !task.completed).length;
}

export function createTaskForUser(
  userId: string,
  input: Omit<StoredTask, 'createdAt' | 'id' | 'updatedAt' | 'userId'>
) {
  return mutateDatabase((database) => {
    const now = new Date().toISOString();
    const task: StoredTask = {
      ...input,
      createdAt: now,
      id: randomUUID(),
      updatedAt: now,
      userId,
    };

    database.tasks.push(task);
    return task;
  });
}

export function updateTaskForUser(
  userId: string,
  taskId: string,
  input: Partial<Omit<StoredTask, 'createdAt' | 'id' | 'updatedAt' | 'userId'>>
) {
  return mutateDatabase((database) => {
    const task = database.tasks.find((item) => item.id === taskId && item.userId === userId) ?? null;
    if (!task) {
      return null;
    }

    Object.assign(task, input, { updatedAt: new Date().toISOString() });
    return task;
  });
}

export function deleteTaskForUser(userId: string, taskId: string) {
  return mutateDatabase((database) => {
    const beforeCount = database.tasks.length;
    database.tasks = database.tasks.filter((task) => !(task.id === taskId && task.userId === userId));
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
      database.tasks
        .filter((task) => task.userId === userId)
        .map((task) => `${task.name}::${task.deadline}::${task.alarmTime}`)
    );

    const created: StoredTask[] = [];

    for (const input of tasks) {
      const signature = `${input.name}::${input.deadline}::${input.alarmTime}`;
      if (existingSignatures.has(signature)) {
        continue;
      }

      const task: StoredTask = {
        ...input,
        createdAt: now,
        id: randomUUID(),
        updatedAt: now,
        userId,
      };

      database.tasks.push(task);
      created.push(task);
      existingSignatures.add(signature);
    }

    return created;
  });
}

export function getSubscriptionByUserId(userId: string) {
  return readDatabase().subscriptions.find((subscription) => subscription.userId === userId) ?? null;
}

export function getSubscriptionByStripeCustomerId(customerId: string) {
  return (
    readDatabase().subscriptions.find((subscription) => subscription.stripeCustomerId === customerId) ??
    null
  );
}

export function getSubscriptionByStripeSubscriptionId(subscriptionId: string) {
  return (
    readDatabase().subscriptions.find(
      (subscription) => subscription.stripeSubscriptionId === subscriptionId
    ) ?? null
  );
}

export function upsertSubscriptionForUser(
  userId: string,
  input: Omit<StoredSubscription, 'createdAt' | 'updatedAt' | 'userId'>
) {
  return mutateDatabase((database) => {
    const now = new Date().toISOString();
    const existing =
      database.subscriptions.find((subscription) => subscription.userId === userId) ?? null;

    if (existing) {
      existing.tier = input.tier;
      existing.status = input.status;
      existing.stripeCustomerId = input.stripeCustomerId;
      existing.stripeSubscriptionId = input.stripeSubscriptionId;
      existing.billingPeriod = input.billingPeriod;
      existing.currentPeriodEnd = input.currentPeriodEnd;
      existing.cancelAtPeriodEnd = input.cancelAtPeriodEnd;
      existing.updatedAt = now;
      return existing;
    }

    const created: StoredSubscription = {
      ...input,
      createdAt: now,
      updatedAt: now,
      userId,
    };

    database.subscriptions.push(created);
    return created;
  });
}
