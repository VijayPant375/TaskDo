import { jest, describe, it, expect, beforeAll } from '@jest/globals';

// --- Mocks must be registered before any dynamic imports ---

jest.unstable_mockModule('../lib/store.js', () => ({
  // Task functions
  listTasksByUser: jest.fn(() => []),
  createTaskForUser: jest.fn((userId: any, task: any) => ({ id: 'task-1', userId, ...task })),
  updateTaskForUser: jest.fn((userId: any, taskId: any, task: any) => ({ id: taskId, userId, ...task })),
  deleteTaskForUser: jest.fn(() => true),
  countActiveTasksByUser: jest.fn(() => 0),
  importTasksForUser: jest.fn((_userId: any, tasks: any) => tasks),
  migrateTaskEncryptionForUser: jest.fn(() => 1),
  // User functions
  getUserById: jest.fn((id: any) => ({
    id,
    email: 'test@example.com',
    name: 'Test User',
    avatarUrl: null,
    provider: 'local',
    providerAccountId: id,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })),
  getUserByEmail: jest.fn(() => null),
  getUserByProviderAccountId: jest.fn(() => null),
  upsertLocalUser: jest.fn((input: any) => input),
  upsertGoogleUser: jest.fn((input: any) => input),
  // Session functions
  createSession: jest.fn().mockResolvedValue({ id: 'session-1', userId: '', mfaVerified: true, tempMfaSecret: null, refreshTokenHash: '', expiresAt: '', createdAt: '', lastUsedAt: '' }),
  getSessionById: jest.fn().mockResolvedValue(null),
  updateSessionRefreshToken: jest.fn().mockResolvedValue(undefined),
  updateSessionMfaState: jest.fn().mockResolvedValue(null),
  deleteSession: jest.fn().mockResolvedValue(undefined),
  pruneExpiredSessions: jest.fn().mockResolvedValue(undefined),
  // OAuth state functions
  saveOAuthState: jest.fn().mockResolvedValue(undefined),
  consumeOAuthState: jest.fn().mockResolvedValue(null),
  pruneExpiredOAuthStates: jest.fn().mockResolvedValue(undefined),
  // Subscription functions
  getSubscriptionByUserId: jest.fn(() => null),
  getSubscriptionByStripeCustomerId: jest.fn(() => null),
  getSubscriptionByStripeSubscriptionId: jest.fn(() => null),
  upsertSubscriptionForUser: jest.fn(),
  // Index helpers
  buildIndexes: jest.fn((db: any) => db),
  updateIndexesOnWrite: jest.fn(),
}));

// requireAuth calls User.findById — must return { mfaEnabled: false } to pass the MFA check
jest.unstable_mockModule('../models/User.js', () => ({
  User: {
    findById: jest.fn().mockResolvedValue({ mfaEnabled: false }),
  },
}));

// --- Dynamic imports (after mocks are set up) ---

let request: any;
let app: any;
let store: any;
let authHelper: any;

beforeAll(async () => {
  const reqModule = await import('supertest');
  request = reqModule.default;
  const appModule = await import('./helpers/app.js');
  app = appModule.app;
  store = await import('../lib/store.js');
  authHelper = await import('./helpers/authHelper.js');
});

// Reusable valid task body — passes sanitizeTask() validation
const validTask = {
  name: 'Test Task',
  deadline: new Date(Date.now() + 86400000).toISOString(),
  alarmTime: new Date(Date.now() + 3600000).toISOString(),
  priority: 'medium',
  completed: false,
};

describe('Task routes', () => {
  // 1. GET /api/tasks — no auth → 401
  it('GET /api/tasks with no auth returns 401', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.status).toBe(401);
  });

  // 2. GET /api/tasks — valid auth → 200, array
  it('GET /api/tasks with valid auth cookie returns 200 array', async () => {
    const res = await request(app)
      .get('/api/tasks')
      .set('Cookie', authHelper.authCookieHeader());

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  // 3. POST /api/tasks — valid auth + valid body → 201
  it('POST /api/tasks with valid auth + valid body returns 201', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', authHelper.authCookieHeader())
      .send(validTask);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id', 'task-1');
  });

  // 4. POST /api/tasks — missing name → 400
  it('POST /api/tasks with missing name returns 400', async () => {
    const { name: _removed, ...noName } = validTask;
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', authHelper.authCookieHeader())
      .send(noName);

    expect(res.status).toBe(400);
  });

  // 5. POST /api/tasks — invalid priority → 400
  it('POST /api/tasks with invalid priority returns 400', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .set('Cookie', authHelper.authCookieHeader())
      .send({ ...validTask, priority: 'ultra' });

    expect(res.status).toBe(400);
  });

  // 6. PUT /api/tasks/:taskId — valid auth + valid body → 200
  it('PUT /api/tasks/:taskId with valid auth + valid body returns 200', async () => {
    const res = await request(app)
      .put('/api/tasks/task-1')
      .set('Cookie', authHelper.authCookieHeader())
      .send(validTask);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('id', 'task-1');
  });

  // 7. PUT /api/tasks/:taskId — updateTaskForUser returns null → 404
  it('PUT /api/tasks/:taskId when updateTaskForUser returns null returns 404', async () => {
    (store.updateTaskForUser as jest.Mock).mockReturnValueOnce(null);

    const res = await request(app)
      .put('/api/tasks/nonexistent')
      .set('Cookie', authHelper.authCookieHeader())
      .send(validTask);

    expect(res.status).toBe(404);
  });

  // 8. DELETE /api/tasks/:taskId — valid auth → 204
  it('DELETE /api/tasks/:taskId with valid auth returns 204', async () => {
    const res = await request(app)
      .delete('/api/tasks/task-1')
      .set('Cookie', authHelper.authCookieHeader());

    expect(res.status).toBe(204);
  });

  // 9. DELETE /api/tasks/:taskId — deleteTaskForUser returns false → 404
  it('DELETE /api/tasks/:taskId when deleteTaskForUser returns false returns 404', async () => {
    (store.deleteTaskForUser as jest.Mock).mockReturnValueOnce(false);

    const res = await request(app)
      .delete('/api/tasks/nonexistent')
      .set('Cookie', authHelper.authCookieHeader());

    expect(res.status).toBe(404);
  });
});
