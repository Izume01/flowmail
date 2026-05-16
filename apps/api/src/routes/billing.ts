import { Hono } from 'hono';
import Stripe from 'stripe';
import { createDbClient } from '@flowmail/db';

const billing = new Hono();

// Initialize Stripe with secret key from environment
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-02-24-preview',
});

/**
 * Create a Stripe Checkout session for a subscription plan.
 * POST /billing/create-checkout-session
 */
billing.post('/create-checkout-session', async (c) => {
  const { projectId, plan } = await c.req.json();
  
  if (!projectId || !plan) {
    return c.json({ error: 'Missing projectId or plan' }, 400);
  }

  // Map plan names to Stripe Price IDs
  // In production, these should be environment variables
  const priceIds: Record<string, string | undefined> = {
    growth: process.env.STRIPE_GROWTH_PRICE_ID,
    scale: process.env.STRIPE_SCALE_PRICE_ID,
  };

  const priceId = priceIds[plan];
  if (!priceId) {
    return c.json({ error: `Invalid plan or price ID not configured for: ${plan}` }, 400);
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?canceled=true`,
      metadata: {
        projectId,
        plan,
      },
    });

    return c.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe error:', error);
    return c.json({ error: error.message }, 500);
  }
});

/**
 * Stripe Webhook handler to process events from Stripe.
 * POST /billing/webhook
 */
billing.post('/webhook', async (c) => {
  const sig = c.req.header('stripe-signature');
  const body = await c.req.text();
  
  if (!sig) {
    return c.json({ error: 'Missing stripe-signature' }, 400);
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return c.json({ error: `Webhook Error: ${err.message}` }, 400);
  }

  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createDbClient(supabaseUrl, supabaseKey);

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const { projectId, plan } = session.metadata || {};
      const stripeCustomerId = session.customer as string;
      const stripeSubscriptionId = session.subscription as string;

      if (projectId) {
        const { error } = await supabase
          .from('projects')
          .update({
            stripe_customer_id: stripeCustomerId,
            stripe_subscription_id: stripeSubscriptionId,
            plan: plan || 'growth',
          })
          .eq('id', projectId);
        
        if (error) {
          console.error('Failed to update project billing info:', error);
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const { error } = await supabase
        .from('projects')
        .update({
          plan: 'free',
          stripe_subscription_id: null,
        })
        .eq('stripe_subscription_id', subscription.id);
      
      if (error) {
        console.error('Failed to handle subscription deletion:', error);
      }
      break;
    }

    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return c.json({ received: true });
});

export default billing;
