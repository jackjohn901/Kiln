import { Router, type IRouter } from 'express';
import { db } from "@workspace/db";
import { ordersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { getUncachableStripeClient } from '../stripeClient';
import { logger } from '../lib/logger';

const router: IRouter = Router();

interface CartLineItem {
  name: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  artistName?: string;
}

router.post('/stripe/checkout', async (req, res): Promise<void> => {
  try {
    const { items, customerEmail, successPath, cancelPath } = req.body as {
      items: CartLineItem[];
      customerEmail?: string;
      successPath?: string;
      cancelPath?: string;
    };

    if (!items?.length) {
      res.status(400).json({ error: 'No items provided' }); return;
    }

    const stripe = await getUncachableStripeClient();

    const baseUrl = process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : `http://localhost:${process.env.PORT ?? 5000}`;

    const basePath = process.env.BASE_PATH ?? '';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: customerEmail,
      line_items: items.map((item) => ({
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(item.price * 100),
          product_data: {
            name: item.name,
            description: item.artistName ? `By ${item.artistName}` : undefined,
            images: item.imageUrl ? [item.imageUrl] : undefined,
          },
        },
        quantity: item.quantity,
      })),
      mode: 'payment',
      success_url: `${baseUrl}${basePath}${successPath ?? '/cart/success'}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${basePath}${cancelPath ?? '/cart'}`,
      metadata: {
        platform: 'kiln',
      },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err: any) {
    logger.error({ err }, 'Stripe checkout error');
    res.status(500).json({ error: err.message ?? 'Checkout failed' });
  }
});

router.post('/stripe/subscription-checkout', async (req, res): Promise<void> => {
  try {
    const { artistId, tierId, tierLabel, amount, customerEmail, successPath, cancelPath } = req.body as {
      artistId?: string;
      tierId?: string;
      tierLabel: string;
      amount: number;
      customerEmail?: string;
      successPath?: string;
      cancelPath?: string;
    };

    if (!tierLabel || !amount) {
      res.status(400).json({ error: 'tierLabel and amount required' }); return;
    }

    const stripe = await getUncachableStripeClient();

    const baseUrl = process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : `http://localhost:${process.env.PORT ?? 5000}`;

    const basePath = process.env.BASE_PATH ?? '';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: customerEmail,
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(amount * 100),
          product_data: { name: tierLabel },
          recurring: { interval: 'month' },
        },
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: `${baseUrl}${basePath}${successPath ?? '/'}?subscribed=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${basePath}${cancelPath ?? '/'}`,
      metadata: { platform: 'kiln', artistId: artistId ?? '', tierId: tierId ?? '' },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err: any) {
    logger.error({ err }, 'Stripe subscription checkout error');
    res.status(500).json({ error: err.message ?? 'Checkout failed' });
  }
});

router.get('/stripe/session/:sessionId', async (req, res): Promise<void> => {
  try {
    const stripe = await getUncachableStripeClient();
    const session = await stripe.checkout.sessions.retrieve(req.params.sessionId);
    res.json({
      status: session.status,
      customerEmail: session.customer_details?.email,
      amountTotal: session.amount_total,
    });
  } catch (err: any) {
    logger.error({ err }, 'Stripe session retrieve error');
    res.status(500).json({ error: err.message });
  }
});

router.post('/stripe/webhook', async (req, res): Promise<void> => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];

  let event: { type: string; data: { object: Record<string, unknown> } };
  try {
    const stripe = await getUncachableStripeClient();
    if (webhookSecret && sig && Buffer.isBuffer(req.body)) {
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret) as unknown as typeof event;
    } else {
      event = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as typeof event;
    }
  } catch (err: unknown) {
    logger.warn({ err }, 'Stripe webhook signature verification failed');
    res.status(400).json({ error: 'Invalid webhook' }); return;
  }

  try {
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as {
        id: string; payment_status: string;
        metadata?: { platform?: string; orderId?: string };
        customer_email?: string | null;
      };
      if (session.payment_status === 'paid' && session.metadata?.platform === 'kiln') {
        if (session.metadata?.orderId) {
          await db.update(ordersTable)
            .set({ status: 'paid' })
            .where(eq(ordersTable.id, session.metadata.orderId));
        }
        logger.info({ sessionId: session.id }, 'Stripe checkout completed');
      }
    }
    res.json({ received: true });
  } catch (err) {
    logger.error({ err }, 'Stripe webhook handling error');
    res.status(500).json({ error: 'Webhook handling failed' });
  }
});

export default router;
