import { jest, describe, it, expect, beforeAll } from '@jest/globals';

// In ESM Jest, jest.mock() hoisting doesn't work — must use unstable_mockModule
// and import the mocked module dynamically AFTER this call.
jest.unstable_mockModule('../controllers/authController.js', () => ({
  signup: jest.fn((req: any, res: any) =>
    res.status(201).json({ id: 'user-1', email: req.body.email })
  ),
  login: jest.fn((req: any, res: any) =>
    res.status(200).json({ token: 'mock-token' })
  ),
  verifyLoginMfa: jest.fn((_req: any, res: any) =>
    res.status(200).json({ ok: true })
  ),
  checkUsername: jest.fn((_req: any, res: any) =>
    res.status(200).json({ available: true })
  ),
  createAuthToken: jest.fn(() => 'mock-auth-token'),
  createMfaChallengeToken: jest.fn(() => 'mock-mfa-token'),
}));

// All module imports must be dynamic (after unstable_mockModule) for mocks to take effect
let request: any;
let app: any;
let authController: any;

beforeAll(async () => {
  const reqModule = await import('supertest');
  request = reqModule.default;
  const appModule = await import('./helpers/app.js');
  app = appModule.app;
  authController = await import('../controllers/authController.js');
});

describe('Auth routes', () => {
  // 1. POST /api/auth/signup — valid body → 201
  it('POST /api/auth/signup with valid body returns 201', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ email: 'test@example.com', password: 'secret123', username: 'tester' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('email', 'test@example.com');
  });

  // 2. POST /api/auth/signup — missing email → 400
  it('POST /api/auth/signup with missing email returns 400', async () => {
    (authController.signup as jest.Mock).mockImplementationOnce((_req: any, res: any) =>
      res.status(400).json({ error: 'Email, password, and username are required' })
    );

    const res = await request(app)
      .post('/api/auth/signup')
      .send({ password: 'secret123', username: 'tester' });

    expect(res.status).toBe(400);
  });

  // 3. POST /api/auth/login — valid body → 200
  it('POST /api/auth/login with valid body returns 200', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'secret123' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
  });

  // 4. POST /api/auth/login — missing password → 400
  it('POST /api/auth/login with missing password returns 400', async () => {
    (authController.login as jest.Mock).mockImplementationOnce((_req: any, res: any) =>
      res.status(400).json({ error: 'Email and password are required' })
    );

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com' });

    expect(res.status).toBe(400);
  });

  // 5. GET /api/auth/session — no cookie → isAuthenticated: false
  // (No User.findById call is made when user is null — safe without MongoDB)
  it('GET /api/auth/session with no cookie returns isAuthenticated: false', async () => {
    const res = await request(app).get('/api/auth/session');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('isAuthenticated', false);
  });

  // 6. GET /api/health → 200, body 'OK'
  it('GET /api/health returns 200 with body OK', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.text).toBe('OK');
  });
});
