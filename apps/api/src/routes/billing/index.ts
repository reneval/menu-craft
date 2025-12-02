import { type FastifyInstance } from 'fastify';
import { db, plans, subscriptions, organizations, eq, and } from '@menucraft/database';
import { z } from 'zod';
import type Stripe from 'stripe';
import { requireStripe, isStripeConfigured } from '../../lib/stripe.js';
import { NotFoundError } from '../../utils/errors.js';
import { env } from '../../config/env.js';

const createCheckoutSchema = z.object({
  priceId: z.string(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

const createPortalSchema = z.object({
  returnUrl: z.string().url().optional(),
});

export async function billingRoutes(app: FastifyInstance) {
  // List available plans
  app.get('/plans', async () => {
    const allPlans = await db.query.plans.findMany({
      where: eq(plans.isActive, true),
      orderBy: (plans, { asc }) => [asc(plans.monthlyPrice)],
    });

    return { success: true, data: allPlans };
  });

  // Get current subscription for organization
  app.get('/subscription', async (request) => {
    const { orgId } = request.params as { orgId: string };

    const subscription = await db.query.subscriptions.findFirst({
      where: and(
        eq(subscriptions.organizationId, orgId),
        eq(subscriptions.status, 'active')
      ),
      with: {
        plan: true,
      },
    });

    // If no subscription, return free plan info
    if (!subscription) {
      const freePlan = await db.query.plans.findFirst({
        where: eq(plans.slug, 'free'),
      });
      return {
        success: true,
        data: {
          status: 'free',
          plan: freePlan,
        },
      };
    }

    return { success: true, data: subscription };
  });

  // Create Stripe Checkout session
  app.post('/checkout', async (request, reply) => {
    const { orgId } = request.params as { orgId: string };

    if (!isStripeConfigured()) {
      return reply.code(503).send({
        success: false,
        error: { message: 'Stripe is not configured' },
      });
    }

    const stripe = requireStripe();
    const body = createCheckoutSchema.parse(request.body);

    // Get organization
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
    });

    if (!org) {
      throw new NotFoundError('Organization');
    }

    // Get or create Stripe customer
    let customerId = org.stripeCustomerId;

    if (!customerId) {
      const customer = await stripe.customers.create({
        name: org.name,
        metadata: {
          organizationId: org.id,
        },
      });
      customerId = customer.id;

      // Save customer ID to organization
      await db
        .update(organizations)
        .set({ stripeCustomerId: customerId, updatedAt: new Date() })
        .where(eq(organizations.id, orgId));
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [
        {
          price: body.priceId,
          quantity: 1,
        },
      ],
      success_url: body.successUrl || `${env.WEB_URL}/settings/billing?success=true`,
      cancel_url: body.cancelUrl || `${env.WEB_URL}/settings/billing?canceled=true`,
      metadata: {
        organizationId: orgId,
      },
      subscription_data: {
        metadata: {
          organizationId: orgId,
        },
      },
    });

    return { success: true, data: { url: session.url } };
  });

  // Create Customer Portal session
  app.post('/portal', async (request, reply) => {
    const { orgId } = request.params as { orgId: string };

    if (!isStripeConfigured()) {
      return reply.code(503).send({
        success: false,
        error: { message: 'Stripe is not configured' },
      });
    }

    const stripe = requireStripe();
    const body = createPortalSchema.parse(request.body);

    // Get organization
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
    });

    if (!org || !org.stripeCustomerId) {
      return reply.code(400).send({
        success: false,
        error: { message: 'No billing account found' },
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: org.stripeCustomerId,
      return_url: body.returnUrl || `${env.WEB_URL}/settings/billing`,
    });

    return { success: true, data: { url: session.url } };
  });
}

// Helper type for subscription data from Stripe
interface StripeSubscriptionData {
  id: string;
  status: string;
  current_period_end: number;
  items: { data: Array<{ price: { id: string } }> };
}

// Webhook handler - separate route without org context
export async function billingWebhookRoute(app: FastifyInstance) {
  // Raw body parser for webhook signature verification
  app.addContentTypeParser(
    'application/json',
    { parseAs: 'buffer' },
    (req, body, done) => {
      done(null, body);
    }
  );

  app.post('/webhook', async (request, reply) => {
    if (!isStripeConfigured() || !env.STRIPE_WEBHOOK_SECRET) {
      return reply.code(503).send({ error: 'Webhooks not configured' });
    }

    const stripe = requireStripe();
    const sig = request.headers['stripe-signature'] as string;

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        request.body as Buffer,
        sig,
        env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return reply.code(400).send({ error: `Webhook Error: ${message}` });
    }

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case 'customer.subscription.updated': {
        const subscription = event.data.object as unknown as StripeSubscriptionData;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as { id: string };
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case 'invoice.payment_failed': {
        const invoice = event.data.object as { subscription?: string | { id: string } | null };
        await handlePaymentFailed(invoice);
        break;
      }
    }

    return { received: true };
  });
}

// Webhook handlers
async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const subscriptionId = typeof session.subscription === 'string'
    ? session.subscription
    : (session.subscription as { id?: string } | null)?.id;

  if (!subscriptionId || !session.metadata?.organizationId) return;

  const stripe = requireStripe();
  const stripeSubscription = await stripe.subscriptions.retrieve(subscriptionId) as unknown as StripeSubscriptionData;

  const priceId = stripeSubscription.items.data[0]?.price.id;
  if (!priceId) return;

  // Find plan by price ID
  const plan = await db.query.plans.findFirst({
    where: eq(plans.stripePriceId, priceId),
  });

  if (!plan) {
    console.error(`Plan not found for price ID: ${priceId}`);
    return;
  }

  // Create or update subscription record
  await db
    .insert(subscriptions)
    .values({
      organizationId: session.metadata.organizationId,
      stripeSubscriptionId: stripeSubscription.id,
      status: stripeSubscription.status as 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing',
      currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
      planId: plan.id,
    })
    .onConflictDoUpdate({
      target: subscriptions.stripeSubscriptionId,
      set: {
        status: stripeSubscription.status as 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing',
        currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
        planId: plan.id,
        updatedAt: new Date(),
      },
    });
}

async function handleSubscriptionUpdated(subscription: StripeSubscriptionData) {
  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) return;

  const plan = await db.query.plans.findFirst({
    where: eq(plans.stripePriceId, priceId),
  });

  if (!plan) return;

  await db
    .update(subscriptions)
    .set({
      status: subscription.status as 'active' | 'past_due' | 'canceled' | 'incomplete' | 'trialing',
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      planId: plan.id,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
}

async function handleSubscriptionDeleted(subscription: { id: string }) {
  await db
    .update(subscriptions)
    .set({
      status: 'canceled',
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscription.id));
}

async function handlePaymentFailed(invoice: { subscription?: string | { id: string } | null }) {
  const subscriptionId = typeof invoice.subscription === 'string'
    ? invoice.subscription
    : invoice.subscription?.id;

  if (!subscriptionId) return;

  await db
    .update(subscriptions)
    .set({
      status: 'past_due',
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));
}
