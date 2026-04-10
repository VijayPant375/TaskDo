import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import cors from 'cors';
import dotenv from 'dotenv';
import express, { type NextFunction, type Request, type Response } from 'express';
import rateLimit from 'express-rate-limit';
import Stripe from 'stripe';
import {
  accessCookieName,
  clearAuthCookies,
  parseCookies,
  refreshCookieName,
  setAuthCookies,
} from './lib/cookies.js';
import {
  cacheSubscription,
  getCachedSubscription,
  invalidateSubscriptionCache,
  type CachedSubscriptionPayload,
} from './lib/redis.js';
import {
  consumeOAuthState,
  countActiveTasksByUser,
  createSession,
  createTaskForUser,
  deleteSession,
  deleteTaskForUser,
  getSessionById,
  getSubscriptionByStripeCustomerId,
  getSubscriptionByStripeSubscriptionId,
  getSubscriptionByUserId,
  getUserById,
  importTasksForUser,
  listTasksByUser,
  saveOAuthState,
  updateSessionRefreshToken,
  updateTaskForUser,
  upsertGoogleUser,
  upsertSubscriptionForUser,
} from './lib/store.js';
import {
  createCodeChallenge,
  createCodeVerifier,
  createOpaqueToken,
  hashToken,
  signJwt,
  verifyJwt,
} from './lib/tokens.js';

dotenv.config();

const app = express();
const port = Number(process.env.PORT ?? 3001);
const host = process.env.HOST ?? '0.0.0.0';
const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
const jwtAccessSecret = process.env.JWT_ACCESS_SECRET ?? 'taskdo-dev-access-secret';
const jwtRefreshSecret = process.env.JWT_REFRESH_SECRET ?? 'taskdo-dev-refresh-secret';
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleRedirectUri =
  process.env.GOOGLE_REDIRECT_URI ?? `http://localhost:${port}/api/auth/google/callback`;
const isGoogleOAuthConfigured = Boolean(googleClientId && googleClientSecret);
const secureCookies = process.env.NODE_ENV === 'production';
const accessTokenLifetimeSeconds = 60 * 15;
const refreshTokenLifetimeSeconds = 60 * 60 * 24 * 14;
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey ? new Stripe(stripeSecretKey) : null;
const currentFilePath = fileURLToPath(import.meta.url);
const serverDirectory = path.dirname(currentFilePath);
const frontendDistDirectory = path.resolve(serverDirectory, '..', '..', 'dist');
const freeTaskLimit = 50;

interface AuthenticatedRequest extends Request {
  authUser?: {
    id: string;
  };
}

function getSubscriptionPayload(subscription: Stripe.Subscription) {
  const status = subscription.status;
  const isPremium = status === 'active' || status === 'trialing';
  const billingPeriod =
    subscription.items.data[0]?.price.recurring?.interval === 'year' ? 'yearly' : 'monthly';

  return {
    billingPeriod: billingPeriod as 'monthly' | 'yearly',
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    currentPeriodEnd: subscription.items.data[0]?.current_period_end ?? null,
    customerId:
      typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id,
    isPremium,
    status,
    subscriptionId: subscription.id,
  };
}

function createAccessToken(userId: string) {
  return signJwt({ sub: userId, type: 'access' }, jwtAccessSecret, accessTokenLifetimeSeconds);
}

function createRefreshToken(userId: string, sessionId: string) {
  return `${createOpaqueToken()}.${signJwt(
    { sid: sessionId, sub: userId, type: 'refresh' },
    jwtRefreshSecret,
    refreshTokenLifetimeSeconds
  )}`;
}

async function setSessionCookies(response: Response, userId: string, sessionId: string) {
  const accessToken = createAccessToken(userId);
  const refreshToken = createRefreshToken(userId, sessionId);
  const refreshTokenHash = hashToken(refreshToken, jwtRefreshSecret);
  const refreshExpiresAt = new Date(Date.now() + refreshTokenLifetimeSeconds * 1000).toISOString();

  await updateSessionRefreshToken(sessionId, refreshTokenHash, refreshExpiresAt);
  setAuthCookies(response, {
    accessToken,
    accessTokenMaxAgeSeconds: accessTokenLifetimeSeconds,
    refreshToken,
    refreshTokenMaxAgeSeconds: refreshTokenLifetimeSeconds,
    secureCookies,
  });
}

function getAuthenticatedUserFromRequest(request: Request) {
  const cookies = parseCookies(request.headers.cookie);
  const token = cookies[accessCookieName];

  if (!token) {
    return null;
  }

  const payload = verifyJwt(token, jwtAccessSecret);
  if (!payload || payload.type !== 'access' || typeof payload.sub !== 'string') {
    return null;
  }

  return getUserById(payload.sub);
}

function sanitizeTask(task: {
  alarmTime?: string;
  completed?: boolean;
  deadline?: string;
  description?: string;
  name?: string;
  notificationEnabled?: boolean;
  priority?: string;
}) {
  if (!task.name?.trim()) {
    return { error: 'Task name is required.' };
  }

  if (!task.deadline || Number.isNaN(Date.parse(task.deadline))) {
    return { error: 'A valid deadline is required.' };
  }

  if (!task.alarmTime || Number.isNaN(Date.parse(task.alarmTime))) {
    return { error: 'A valid alarm time is required.' };
  }

  if (!task.priority || !['high', 'medium', 'low'].includes(task.priority)) {
    return { error: 'Priority must be high, medium, or low.' };
  }

  return {
    value: {
      alarmTime: new Date(task.alarmTime).toISOString(),
      completed: Boolean(task.completed),
      deadline: new Date(task.deadline).toISOString(),
      description: task.description?.trim() ?? '',
      name: task.name.trim(),
      notificationEnabled: Boolean(task.notificationEnabled),
      priority: task.priority as 'high' | 'medium' | 'low',
    },
  };
}

function serializeSubscriptionForClient(userId: string) {
  const subscription = getSubscriptionByUserId(userId);

  if (!subscription) {
    return {
      tier: 'free' as const,
    };
  }

  return {
    tier: subscription.tier,
    stripeCustomerId: subscription.stripeCustomerId ?? undefined,
    stripeSubscriptionId: subscription.stripeSubscriptionId ?? undefined,
    billingPeriod: subscription.billingPeriod ?? undefined,
    currentPeriodEnd: subscription.currentPeriodEnd ?? undefined,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
  };
}

function serializeStoredSubscription(subscription: ReturnType<typeof getSubscriptionByUserId>): CachedSubscriptionPayload {
  if (!subscription) {
    return {
      tier: 'free',
    };
  }

  return {
    tier: subscription.tier,
    stripeCustomerId: subscription.stripeCustomerId ?? undefined,
    stripeSubscriptionId: subscription.stripeSubscriptionId ?? undefined,
    billingPeriod: subscription.billingPeriod ?? undefined,
    currentPeriodEnd: subscription.currentPeriodEnd ?? undefined,
    cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
  };
}

function isPremiumUser(userId: string) {
  return serializeSubscriptionForClient(userId).tier === 'premium';
}

async function persistSubscriptionForUser(userId: string, subscription: Stripe.Subscription) {
  const payload = getSubscriptionPayload(subscription);

  const persisted = upsertSubscriptionForUser(userId, {
    billingPeriod: payload.billingPeriod,
    cancelAtPeriodEnd: payload.cancelAtPeriodEnd,
    currentPeriodEnd: payload.currentPeriodEnd
      ? new Date(payload.currentPeriodEnd * 1000).toISOString()
      : null,
    status: payload.status,
    stripeCustomerId: payload.customerId,
    stripeSubscriptionId: payload.subscriptionId,
    tier: payload.isPremium ? 'premium' : 'free',
  });

  await invalidateSubscriptionCache(userId);
  return persisted;
}

async function syncSubscriptionForUser(userId: string) {
  const stored = getSubscriptionByUserId(userId);
  const cached = await getCachedSubscription(userId);

  if (cached) {
    return cached;
  }

  if (!stored?.stripeSubscriptionId || !stripe) {
    const payload = serializeStoredSubscription(stored);
    await cacheSubscription(userId, payload);
    return payload;
  }

  const subscription = await stripe.subscriptions.retrieve(stored.stripeSubscriptionId);
  await persistSubscriptionForUser(userId, subscription);
  const payload = serializeSubscriptionForClient(userId);
  await cacheSubscription(userId, payload);
  return payload;
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  if (session.mode !== 'subscription' || !session.subscription || !stripe) {
    return;
  }

  const userId = session.client_reference_id ?? session.metadata?.userId;
  if (!userId) {
    return;
  }

  const subscription =
    typeof session.subscription === 'string'
      ? await stripe.subscriptions.retrieve(session.subscription)
      : session.subscription;

  await persistSubscriptionForUser(userId, subscription);
  await invalidateSubscriptionCache(userId);
}

async function handleSubscriptionChanged(subscription: Stripe.Subscription) {
  const userIdFromMetadata = subscription.metadata.userId;
  const customerId =
    typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id;

  const matchedSubscription =
    getSubscriptionByStripeSubscriptionId(subscription.id) ??
    getSubscriptionByStripeCustomerId(customerId);
  const userId = userIdFromMetadata || matchedSubscription?.userId;

  if (!userId) {
    return;
  }

  await persistSubscriptionForUser(userId, subscription);
  await invalidateSubscriptionCache(userId);
}

async function exchangeGoogleCodeForProfile(code: string, codeVerifier: string) {
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    body: new URLSearchParams({
      client_id: googleClientId as string,
      client_secret: googleClientSecret as string,
      code,
      code_verifier: codeVerifier,
      grant_type: 'authorization_code',
      redirect_uri: googleRedirectUri,
    }),
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    method: 'POST',
  });

  if (!tokenResponse.ok) {
    throw new Error('Google token exchange failed.');
  }

  const tokenData = (await tokenResponse.json()) as { access_token?: string };
  if (!tokenData.access_token) {
    throw new Error('Google access token missing.');
  }

  const profileResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  if (!profileResponse.ok) {
    throw new Error('Failed to fetch Google profile.');
  }

  return (await profileResponse.json()) as {
    email?: string;
    name?: string;
    picture?: string;
    sub?: string;
  };
}

function requireStripe(response: Response) {
  if (!stripe) {
    response.status(503).send('Stripe is not configured yet.');
    return false;
  }

  return true;
}

function requireAuth(request: AuthenticatedRequest, response: Response, next: NextFunction) {
  const user = getAuthenticatedUserFromRequest(request);

  if (!user) {
    response.status(401).send('Authentication required.');
    return;
  }

  request.authUser = { id: user.id };
  next();
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/webhook', express.raw({ type: 'application/json' }), async (request, response) => {
  if (!requireStripe(response)) {
    return;
  }

  const signature = request.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    response.status(200).json({ received: true, warning: 'Webhook secret not configured.' });
    return;
  }

  if (!signature) {
    response.status(400).send('Missing Stripe signature header.');
    return;
  }

  try {
    const event = stripe!.webhooks.constructEvent(request.body, signature, webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await handleSubscriptionChanged(event.data.object as Stripe.Subscription);
        break;
      default:
        console.log(`Unhandled Stripe event: ${event.type}`);
    }

    response.json({ received: true });
  } catch (error) {
    console.error('Webhook signature verification failed.', error);
    response.status(400).send('Webhook Error');
  }
});

app.use(
  cors({
    credentials: true,
    origin: frontendUrl,
  })
);
app.use(express.json());
app.use('/api/auth/', authLimiter);
app.use('/api/', apiLimiter);

app.get('/api/health', (_request, response) => {
  response.json({
    googleOAuthConfigured: isGoogleOAuthConfigured,
    ok: true,
    stripeConfigured: Boolean(stripe),
  });
});

app.get('/api/auth/session', (request, response) => {
  const user = getAuthenticatedUserFromRequest(request);

  response.json({
    googleOAuthEnabled: isGoogleOAuthConfigured,
    isAuthenticated: Boolean(user),
    user: user
      ? {
          avatarUrl: user.avatarUrl,
          email: user.email,
          id: user.id,
          name: user.name,
        }
      : null,
  });
});

app.get('/api/auth/google/start', async (request, response) => {
  if (!isGoogleOAuthConfigured) {
    response.status(503).send('Google OAuth is not configured yet.');
    return;
  }

  const state = randomUUID();
  const codeVerifier = createCodeVerifier();
  const codeChallenge = createCodeChallenge(codeVerifier);
  const returnTo =
    typeof request.query.returnTo === 'string' && request.query.returnTo.startsWith('/')
      ? request.query.returnTo
      : '/';

  try {
    await saveOAuthState({
      codeVerifier,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      returnTo,
      state,
    });
  } catch (error) {
    console.error('Failed to store OAuth state.', error);
    response.status(500).send('Unable to start Google sign-in.');
    return;
  }

  const googleUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  googleUrl.searchParams.set('client_id', googleClientId as string);
  googleUrl.searchParams.set('redirect_uri', googleRedirectUri);
  googleUrl.searchParams.set('response_type', 'code');
  googleUrl.searchParams.set('scope', 'openid email profile');
  googleUrl.searchParams.set('state', state);
  googleUrl.searchParams.set('code_challenge', codeChallenge);
  googleUrl.searchParams.set('code_challenge_method', 'S256');
  googleUrl.searchParams.set('access_type', 'offline');
  googleUrl.searchParams.set('prompt', 'consent');

  response.redirect(googleUrl.toString());
});

app.get('/api/auth/google/callback', async (request, response) => {
  if (!isGoogleOAuthConfigured) {
    response.status(503).send('Google OAuth is not configured yet.');
    return;
  }

  const code = typeof request.query.code === 'string' ? request.query.code : null;
  const state = typeof request.query.state === 'string' ? request.query.state : null;

  if (!code || !state) {
    response.status(400).send('Missing OAuth callback parameters.');
    return;
  }

  const oauthState = await consumeOAuthState(state);
  if (!oauthState || new Date(oauthState.expiresAt).getTime() <= Date.now()) {
    response.status(400).send('OAuth state is invalid or expired.');
    return;
  }

  try {
    const profile = await exchangeGoogleCodeForProfile(code, oauthState.codeVerifier);
    if (!profile.sub || !profile.email || !profile.name) {
      response.status(400).send('Google profile is incomplete.');
      return;
    }

    const user = upsertGoogleUser({
      avatarUrl: profile.picture ?? null,
      email: profile.email,
      name: profile.name,
      providerAccountId: profile.sub,
    });

    const session = await createSession({
      expiresAt: new Date(Date.now() + refreshTokenLifetimeSeconds * 1000).toISOString(),
      refreshTokenHash: 'pending',
      userId: user.id,
    });

    await setSessionCookies(response, user.id, session.id);
    response.redirect(new URL(oauthState.returnTo, frontendUrl).toString());
  } catch (error) {
    console.error('Google OAuth callback failed.', error);
    response.status(500).send('Unable to complete Google sign-in.');
  }
});

app.post('/api/auth/refresh', async (request, response) => {
  const cookies = parseCookies(request.headers.cookie);
  const refreshToken = cookies[refreshCookieName];

  if (!refreshToken) {
    response.status(401).send('Refresh token is missing.');
    return;
  }

  const parts = refreshToken.split('.');
  if (parts.length < 4) {
    clearAuthCookies(response, secureCookies);
    response.status(401).send('Refresh token is invalid.');
    return;
  }

  const jwtPart = parts.slice(1).join('.');
  const payload = verifyJwt(jwtPart, jwtRefreshSecret);
  if (
    !payload ||
    payload.type !== 'refresh' ||
    typeof payload.sub !== 'string' ||
    typeof payload.sid !== 'string'
  ) {
    clearAuthCookies(response, secureCookies);
    response.status(401).send('Refresh token is invalid.');
    return;
  }

  const session = await getSessionById(payload.sid);
  const user = getUserById(payload.sub);
  const expectedHash = hashToken(refreshToken, jwtRefreshSecret);

  if (
    !session ||
    !user ||
    session.userId !== user.id ||
    session.refreshTokenHash !== expectedHash ||
    new Date(session.expiresAt).getTime() <= Date.now()
  ) {
    if (session) {
      await deleteSession(session.id);
    }

    clearAuthCookies(response, secureCookies);
    response.status(401).send('Refresh session has expired.');
    return;
  }

  await setSessionCookies(response, user.id, session.id);
  response.json({ ok: true });
});

app.post('/api/auth/logout', async (request, response) => {
  const cookies = parseCookies(request.headers.cookie);
  const refreshToken = cookies[refreshCookieName];

  if (refreshToken) {
    const parts = refreshToken.split('.');
    const jwtPart = parts.length >= 4 ? parts.slice(1).join('.') : null;
    const payload = jwtPart ? verifyJwt(jwtPart, jwtRefreshSecret) : null;

    if (payload && typeof payload.sid === 'string') {
      await deleteSession(payload.sid);
    }
  }

  clearAuthCookies(response, secureCookies);
  response.status(204).send();
});

app.get('/api/subscription', requireAuth, (request: AuthenticatedRequest, response) => {
  response.json(serializeSubscriptionForClient(request.authUser!.id));
});

app.post('/api/subscription/refresh', requireAuth, async (request: AuthenticatedRequest, response) => {
  try {
    response.json(await syncSubscriptionForUser(request.authUser!.id));
  } catch (error) {
    console.error('Failed to refresh stored subscription state.', error);
    response.status(500).send('Unable to refresh subscription state.');
  }
});

app.get('/api/tasks', requireAuth, (request: AuthenticatedRequest, response) => {
  response.json(listTasksByUser(request.authUser!.id));
});

app.post('/api/tasks', requireAuth, (request: AuthenticatedRequest, response) => {
  const sanitized = sanitizeTask(request.body as Record<string, unknown>);
  if ('error' in sanitized) {
    response.status(400).send(sanitized.error);
    return;
  }

  const userId = request.authUser!.id;
  const wouldBeActiveTask = !sanitized.value.completed;

  if (!isPremiumUser(userId) && wouldBeActiveTask && countActiveTasksByUser(userId) >= freeTaskLimit) {
    response.status(403).send('Free plan task limit reached. Upgrade to Premium to add more active tasks.');
    return;
  }

  const task = createTaskForUser(userId, sanitized.value);
  response.status(201).json(task);
});

app.put('/api/tasks/:taskId', requireAuth, (request: AuthenticatedRequest, response) => {
  const sanitized = sanitizeTask(request.body as Record<string, unknown>);
  if ('error' in sanitized) {
    response.status(400).send(sanitized.error);
    return;
  }

  const task = updateTaskForUser(request.authUser!.id, String(request.params.taskId), sanitized.value);
  if (!task) {
    response.status(404).send('Task not found.');
    return;
  }

  response.json(task);
});

app.delete('/api/tasks/:taskId', requireAuth, (request: AuthenticatedRequest, response) => {
  const deleted = deleteTaskForUser(request.authUser!.id, String(request.params.taskId));
  if (!deleted) {
    response.status(404).send('Task not found.');
    return;
  }

  response.status(204).send();
});

app.post('/api/tasks/import', requireAuth, (request: AuthenticatedRequest, response) => {
  const tasks = Array.isArray((request.body as { tasks?: unknown[] }).tasks)
    ? ((request.body as { tasks: unknown[] }).tasks as Array<Record<string, unknown>>)
    : null;

  if (!tasks) {
    response.status(400).send('tasks must be an array.');
    return;
  }

  const sanitizedTasks = [];

  for (const task of tasks) {
    const sanitized = sanitizeTask(task);
    if ('error' in sanitized) {
      response.status(400).send(sanitized.error);
      return;
    }

    sanitizedTasks.push(sanitized.value);
  }

  const userId = request.authUser!.id;
  const activeImportCount = sanitizedTasks.filter((task) => !task.completed).length;

  if (
    !isPremiumUser(userId) &&
    countActiveTasksByUser(userId) + activeImportCount > freeTaskLimit
  ) {
    response.status(403).send('Free plan task limit reached. Upgrade to Premium to import more active tasks.');
    return;
  }

  const imported = importTasksForUser(userId, sanitizedTasks);
  response.status(201).json(imported);
});

app.post('/api/create-checkout-session', requireAuth, async (request: AuthenticatedRequest, response) => {
  if (!requireStripe(response)) {
    return;
  }

  try {
    const { billingPeriod, successUrl, cancelUrl } = request.body as {
      billingPeriod?: 'monthly' | 'yearly';
      cancelUrl?: string;
      successUrl?: string;
    };

    if (billingPeriod !== 'monthly' && billingPeriod !== 'yearly') {
      response.status(400).send('billingPeriod must be monthly or yearly.');
      return;
    }

    const user = getUserById(request.authUser!.id);
    if (!user) {
      response.status(401).send('Authentication required.');
      return;
    }

    const storedSubscription = getSubscriptionByUserId(user.id);
    const priceId =
      billingPeriod === 'monthly'
        ? (process.env.STRIPE_MONTHLY_PRICE_ID as string)
        : (process.env.STRIPE_YEARLY_PRICE_ID as string);

    const session = await stripe!.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      client_reference_id: user.id,
      customer: storedSubscription?.stripeCustomerId ?? undefined,
      customer_email: storedSubscription?.stripeCustomerId ? undefined : user.email,
      metadata: {
        billingPeriod,
        product: 'taskdo-premium',
        userId: user.id,
      },
      subscription_data: {
        metadata: {
          userId: user.id,
        },
      },
      success_url: successUrl || `${frontendUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${frontendUrl}/?checkout=canceled`,
    });

    response.json({
      url: session.url,
    });
  } catch (error) {
    console.error('Failed to create Stripe Checkout session.', error);
    response.status(500).send('Unable to create checkout session.');
  }
});

app.post('/api/verify-subscription', requireAuth, async (request: AuthenticatedRequest, response) => {
  if (!requireStripe(response)) {
    return;
  }

  try {
    const { sessionId } = request.body as { sessionId?: string };

    if (!sessionId) {
      response.status(400).send('sessionId is required.');
      return;
    }

    const session = await stripe!.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription'],
    });

    if (session.mode !== 'subscription') {
      response.status(400).send('Checkout session is not a subscription session.');
      return;
    }

    if (!session.customer || !session.subscription) {
      response.status(400).send('Checkout session is missing customer or subscription data.');
      return;
    }

    const sessionUserId = session.client_reference_id ?? session.metadata?.userId;
    if (sessionUserId && sessionUserId !== request.authUser!.id) {
      response.status(403).send('Checkout session does not belong to the authenticated user.');
      return;
    }

    const subscription =
      typeof session.subscription === 'string'
        ? await stripe!.subscriptions.retrieve(session.subscription)
        : session.subscription;

    await persistSubscriptionForUser(request.authUser!.id, subscription);
    response.json(getSubscriptionPayload(subscription));
  } catch (error) {
    console.error('Failed to verify Stripe subscription.', error);
    response.status(500).send('Unable to verify subscription.');
  }
});

app.post('/api/create-portal-session', requireAuth, async (request: AuthenticatedRequest, response) => {
  if (!requireStripe(response)) {
    return;
  }

  try {
    const { returnUrl } = request.body as {
      returnUrl?: string;
    };
    const subscription = getSubscriptionByUserId(request.authUser!.id);

    if (!subscription?.stripeCustomerId) {
      response.status(400).send('No Stripe customer is linked to this account.');
      return;
    }

    const portalSession = await stripe!.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl || frontendUrl,
    });

    response.json({
      url: portalSession.url,
    });
  } catch (error) {
    console.error('Failed to create Stripe customer portal session.', error);
    response.status(500).send('Unable to create portal session.');
  }
});

app.use(express.static(frontendDistDirectory));

app.get('*', (request, response, next) => {
  if (request.path.startsWith('/api/')) {
    next();
    return;
  }

  response.sendFile(path.join(frontendDistDirectory, 'index.html'));
});

app.listen(port, host, () => {
  console.log(`TaskDo server listening on http://${host}:${port}`);
});
