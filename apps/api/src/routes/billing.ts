import { Hono } from 'hono';
import Stripe from 'stripe';
import { getPrisma, TenantDB } from '@flowmail/db';
import { apiKeyAuth } from '../middleware/auth';

const billing = new Hono<{
  Variables: {
    projectId: string;
  };
}>();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24-preview',
});

billing.get('/plan', apiKeyAuth, async (c) => {
  const projectId = c.get('projectId');
  const tenantDb = new TenantDB(getPrisma(), projectId);

  try {
    const project = await tenantDb.getProject();
    if (!project) return c.json({ error: 'Project not found' }, 404);
    return c.json({ plan: project.plan });
  } catch (error: any) {
    return c.json({ error: error.message }, 500);
  }
});

billing.post('/create-checkout-session', apiKeyAuth, async (c) => {
  const { plan } = await c.req.json();
  const projectId = c.get('projectId');
  
  const priceIds: Record<string, string | undefined> = {
    growth: process.env.STRIPE_GROWTH_PRICE_ID,
    scale: process.env.STRIPE_SCALE_PRICE_ID,
  };

  const priceId = priceIds[plan];
  if (!priceId) return c.json({ error: `Invalid plan or price ID not configured for: ${plan}` }, 400);

  const prisma = getPrisma();

  try {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) return c.json({ error: 'Project not found' }, 404);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`,
      customer: project.stripeCustomerId || undefined,
      client_reference_id: projectId,
      metadata: { projectId, plan },
    });

    return c.json({ url: session.url });
  } catch (err: any) {
    return c.json({ error: err.message }, 500);
  }
});

billing.post('/webhook', async (c) => {
  const sig = c.req.header('stripe-signature')!;
  const body = await c.req.raw.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    return c.json({ error: `Webhook Error: ${err.message}` }, 400);
  }

  const prisma = getPrisma();

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const projectId = session.client_reference_id!;
    const plan = session.metadata?.plan;

    await prisma.project.update({
      where: { id: projectId },
      data: {
        plan,
        stripeCustomerId: session.customer as string,
        stripeSubscriptionId: session.subscription as string,
      },
    });
  }

  return c.json({ received: true });
});

export default billing;
