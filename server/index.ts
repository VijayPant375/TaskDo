import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import Stripe from 'stripe';

dotenv.config();

const requiredEnv = ['STRIPE_SECRET_KEY', 'STRIPE_MONTHLY_PRICE_ID', 'STRIPE_YEARLY_PRICE_ID'] as const;

for (const key of requiredEnv) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

const app = express();
const port = Number(process.env.PORT ?? 3001);
const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

app.post('/api/webhook', express.raw({ type: 'application/json' }), (request, response) => {
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
    const event = stripe.webhooks.constructEvent(request.body, signature, webhookSecret);

    switch (event.type) {
      case 'checkout.session.completed':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        console.log(`Received Stripe event: ${event.type}`);
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
    origin: frontendUrl,
  })
);
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ ok: true });
});

app.post('/api/create-checkout-session', async (request, response) => {
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

    const priceId =
      billingPeriod === 'monthly'
        ? (process.env.STRIPE_MONTHLY_PRICE_ID as string)
        : (process.env.STRIPE_YEARLY_PRICE_ID as string);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
      metadata: {
        billingPeriod,
        product: 'taskdo-premium',
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

app.post('/api/verify-subscription', async (request, response) => {
  try {
    const { sessionId } = request.body as { sessionId?: string };

    if (!sessionId) {
      response.status(400).send('sessionId is required.');
      return;
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
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

    const subscription =
      typeof session.subscription === 'string'
        ? await stripe.subscriptions.retrieve(session.subscription)
        : session.subscription;

    response.json({
      billingPeriod: subscription.items.data[0]?.price.recurring?.interval === 'year' ? 'yearly' : 'monthly',
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      currentPeriodEnd: subscription.items.data[0]?.current_period_end ?? null,
      customerId: typeof session.customer === 'string' ? session.customer : session.customer.id,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    console.error('Failed to verify Stripe subscription.', error);
    response.status(500).send('Unable to verify subscription.');
  }
});

app.post('/api/create-portal-session', async (request, response) => {
  try {
    const { customerId, returnUrl } = request.body as {
      customerId?: string;
      returnUrl?: string;
    };

    if (!customerId) {
      response.status(400).send('customerId is required.');
      return;
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
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

app.listen(port, () => {
  console.log(`TaskDo Stripe server listening on http://localhost:${port}`);
});
