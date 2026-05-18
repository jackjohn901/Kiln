import { Router, type IRouter } from 'express';
import { db } from "@workspace/db";
import {
  ordersTable,
  digitalDownloadPurchasesTable,
  workshopsTable,
  workshopBookingsTable,
  commissionsTable,
  auctionsTable,
} from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import crypto from "crypto";
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
    const { items, customerEmail, successPath, cancelPath, metadata: extraMetadata } = req.body as {
      items: CartLineItem[];
      customerEmail?: string;
      successPath?: string;
      cancelPath?: string;
      metadata?: Record<string, string>;
    };

    if (!items?.length) {
      res.status(400).json({ error: 'No items provided' }); return;
    }

    const stripe = await getUncachableStripeClient();

    const baseUrl = process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : `http://localhost:${process.env.PORT ?? 5000}`;

    const basePath = process.env.BASE_PATH ?? '';

    // Attach calling user's ID to metadata so webhook can act on their behalf
    const userId = req.isAuthenticated() ? req.user.id : undefined;

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
        ...(userId ? { userId } : {}),
        ...(extraMetadata ?? {}),
      },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err: unknown) {
    logger.error({ err }, 'Stripe checkout error');
    const msg = err instanceof Error ? err.message : 'Checkout failed';
    res.status(500).json({ error: msg });
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
  } catch (err: unknown) {
    logger.error({ err }, 'Stripe subscription checkout error');
    const msg = err instanceof Error ? err.message : 'Checkout failed';
    res.status(500).json({ error: msg });
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
  } catch (err: unknown) {
    logger.error({ err }, 'Stripe session retrieve error');
    const msg = err instanceof Error ? err.message : 'Failed';
    res.status(500).json({ error: msg });
  }
});

router.post('/stripe/webhook', async (req, res): Promise<void> => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env['STRIPE_WEBHOOK_SECRET'];

  type SessionMeta = {
    platform?: string;
    type?: string;
    orderId?: string;
    userId?: string;
    // digital
    productId?: string;
    productTitle?: string;
    downloadUrl?: string;
    // workshop
    workshopId?: string;
    // commission
    commissionId?: string;
    milestone?: string;
    // auction
    auctionId?: string;
  };

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
        id: string;
        payment_status: string;
        amount_total?: number | null;
        metadata?: SessionMeta;
        customer_email?: string | null;
      };

      if (session.payment_status === 'paid' && session.metadata?.platform === 'kiln') {
        const meta = session.metadata ?? {};

        // 1. Generic order payment
        if (meta.orderId) {
          await db.update(ordersTable)
            .set({ status: 'paid' })
            .where(eq(ordersTable.id, meta.orderId));
        }

        // 2. Digital download — record purchase so user can download
        if (meta.type === 'digital' && meta.productId && meta.userId) {
          const existing = await db.select({ id: digitalDownloadPurchasesTable.id })
            .from(digitalDownloadPurchasesTable)
            .where(and(
              eq(digitalDownloadPurchasesTable.userId, meta.userId),
              eq(digitalDownloadPurchasesTable.productId, meta.productId),
            ));
          if (existing.length === 0) {
            await db.insert(digitalDownloadPurchasesTable).values({
              id: crypto.randomUUID(),
              userId: meta.userId,
              productId: meta.productId,
              productTitle: meta.productTitle ?? meta.productId,
              amountCents: session.amount_total ?? 0,
              downloadUrl: meta.downloadUrl ?? null,
            });
          }
        }

        // 3. Workshop booking — auto-confirm seat after payment
        if (meta.type === 'workshop' && meta.workshopId && meta.userId) {
          const [w] = await db.select().from(workshopsTable)
            .where(eq(workshopsTable.id, meta.workshopId));
          if (w && w.spotsBooked < w.maxSpots) {
            const existing = await db.select({ id: workshopBookingsTable.id })
              .from(workshopBookingsTable)
              .where(and(
                eq(workshopBookingsTable.workshopId, meta.workshopId),
                eq(workshopBookingsTable.userId, meta.userId),
              ));
            if (existing.length === 0) {
              await db.insert(workshopBookingsTable).values({
                id: crypto.randomUUID(),
                workshopId: meta.workshopId,
                userId: meta.userId,
                userName: "",
                paidAmount: w.price,
              });
              await db.update(workshopsTable)
                .set({ spotsBooked: sql`${workshopsTable.spotsBooked} + 1` })
                .where(eq(workshopsTable.id, meta.workshopId));
            }
          }
        }

        // 4. Commission milestone payment — auto-confirm deposit or final
        if (meta.type === 'commission' && meta.commissionId && meta.milestone) {
          if (meta.milestone === 'deposit') {
            await db.update(commissionsTable)
              .set({ depositPaid: true })
              .where(eq(commissionsTable.id, meta.commissionId));
          } else if (meta.milestone === 'final') {
            await db.update(commissionsTable)
              .set({ finalPaid: true })
              .where(eq(commissionsTable.id, meta.commissionId));
          }
        }

        // 5. Auction payment — mark as paid
        if (meta.type === 'auction' && meta.auctionId) {
          await db.update(auctionsTable)
            .set({ status: 'paid' })
            .where(eq(auctionsTable.id, meta.auctionId));
        }

        logger.info({ sessionId: session.id, type: meta.type ?? 'order' }, 'Stripe checkout completed');
      }
    }
    res.json({ received: true });
  } catch (err) {
    logger.error({ err }, 'Stripe webhook handling error');
    res.status(500).json({ error: 'Webhook handling failed' });
  }
});

export default router;
