import { Router, type IRouter } from 'express';
import { db } from "@workspace/db";
import {
  ordersTable,
  digitalDownloadPurchasesTable,
  workshopsTable,
  workshopBookingsTable,
  commissionsTable,
  auctionsTable,
  listingsTable,
  profilesTable,
  userSettingsTable,
} from "@workspace/db";
import { eq, and, sql, inArray } from "drizzle-orm";
import crypto from "crypto";
import { getUncachableStripeClient } from '../stripeClient';
import { logger } from '../lib/logger';
import { getDigitalProduct } from '../lib/digitalProducts';
import { sendEmail, manualPayoutReceiptEmail } from '../lib/email';

const router: IRouter = Router();

// In-memory dedup guard: prevents duplicate receipt emails when Stripe retries a
// webhook for the same session. Keyed by Stripe session ID; lives for the process
// lifetime (cleared on restart), which covers the typical retry window.
const manualPayoutReceiptSent = new Set<string>();

interface CartLineItem {
  name: string;
  quantity: number;
  imageUrl?: string;
  artistName?: string;
  /** Server uses this to look up the authoritative price from the listings table. */
  listingId?: string;
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

    // Resolve authoritative prices server-side.
    // For listing items: look up from the DB by listingId.
    // For digital download items: look up from the server-side product registry.
    const listingIds = items
      .map((item) => item.listingId)
      .filter((id): id is string => !!id);

    let listingPriceMap = new Map<string, { price: number; artistId: string; title: string; imageUrl: string | null }>();
    if (listingIds.length > 0) {
      const rows = await db
        .select({
          id: listingsTable.id,
          price: listingsTable.price,
          isSold: listingsTable.isSold,
          isAvailable: listingsTable.isAvailable,
          artistId: listingsTable.artistId,
          title: listingsTable.title,
          imageUrl: listingsTable.imageUrl,
        })
        .from(listingsTable)
        .where(inArray(listingsTable.id, listingIds));
      for (const row of rows) {
        if (row.isSold || !row.isAvailable) {
          res.status(400).json({ error: `Listing "${row.id}" is no longer available.` }); return;
        }
        listingPriceMap.set(row.id, {
          price: row.price,
          artistId: row.artistId,
          title: row.title,
          imageUrl: row.imageUrl,
        });
      }
    }

    // Enforce strict checkout mode separation to prevent metadata/item mismatch attacks.
    // A digital-product checkout MUST NOT contain listing items (and vice versa).
    // This prevents paying a cheap listing price while claiming a paid digital entitlement.
    const isDigital = extraMetadata?.type === 'digital';
    const hasListingItems = listingIds.length > 0;

    if (isDigital && hasListingItems) {
      res.status(400).json({ error: 'Digital product checkouts cannot include listing items.' }); return;
    }

    let digitalPriceCents: number | null = null;
    if (isDigital) {
      if (!extraMetadata?.productId) {
        res.status(400).json({ error: 'productId required for digital checkout.' }); return;
      }
      const product = getDigitalProduct(extraMetadata.productId);
      if (!product) {
        res.status(400).json({ error: 'Digital product not found.' }); return;
      }
      if (product.isFree) {
        res.status(400).json({ error: 'Free products do not require a checkout session.' }); return;
      }
      if (items.length !== 1) {
        res.status(400).json({ error: 'Digital checkout must contain exactly one item.' }); return;
      }
      digitalPriceCents = Math.round(product.priceUsd * 100);
    }

    // Validate quantities: must be positive integers within a reasonable range.
    for (const item of items) {
      const qty = item.quantity;
      if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
        res.status(400).json({ error: 'Item quantity must be an integer between 1 and 100.' }); return;
      }
    }

    // Validate that every item has an authoritative price source.
    for (const item of items) {
      if (item.listingId) {
        if (!listingPriceMap.has(item.listingId)) {
          res.status(400).json({ error: `Listing "${item.listingId}" not found.` }); return;
        }
      } else if (isDigital && digitalPriceCents !== null) {
        // Price will be set from registry below — OK.
      } else {
        res.status(400).json({ error: 'Each checkout item must include a valid listingId.' }); return;
      }
    }

    const stripe = await getUncachableStripeClient();

    const baseUrl = process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : `http://localhost:${process.env.PORT ?? 5000}`;

    const basePath = process.env.BASE_PATH ?? '';

    const userId = req.isAuthenticated() ? req.user.id : undefined;

    // Embed server-resolved listing IDs and quantities in session metadata so that
    // order creation after success can derive line items from a trusted source,
    // not from client-supplied localStorage data.
    const sessionListingIds = listingIds.join(',');
    const sessionListingQtys = items
      .filter((item) => item.listingId)
      .map((item) => String(item.quantity))
      .join(',');

    // Reserved keys that must NEVER be overridden by client-supplied extraMetadata.
    const RESERVED_META_KEYS = new Set(['platform', 'userId', 'listingIds', 'listingQtys']);
    // Allowlist of safe extra metadata keys clients may pass through (e.g. for digital/workshop flows).
    const ALLOWED_EXTRA_KEYS = new Set(['type', 'productId', 'workshopId', 'commissionId', 'milestone', 'auctionId', 'orderId']);

    const safeExtraMeta: Record<string, string> = {};
    if (extraMetadata) {
      for (const [key, value] of Object.entries(extraMetadata)) {
        if (!RESERVED_META_KEYS.has(key) && ALLOWED_EXTRA_KEYS.has(key) && typeof value === 'string') {
          safeExtraMeta[key] = value;
        }
      }
    }

    // Determine total amount cents for Stripe Connect application fee calculation.
    const lineItemsCents = items.map((item) => {
      if (item.listingId) {
        return Math.round(listingPriceMap.get(item.listingId)!.price * 100) * item.quantity;
      }
      return (digitalPriceCents ?? 0) * item.quantity;
    });
    const totalAmountCents = lineItemsCents.reduce((sum, c) => sum + c, 0);

    // For single-seller listing checkouts, route funds to the artist's connected Stripe account
    // if they have one with charges enabled (10% platform fee via application_fee_amount).
    let connectedAccountId: string | null = null;
    if (listingIds.length > 0) {
      const artistIds = new Set(
        listingIds.map((id) => listingPriceMap.get(id)?.artistId).filter(Boolean),
      );
      if (artistIds.size === 1) {
        const [artistId] = artistIds;
        if (artistId) {
          const [artistProfile] = await db
            .select({
              stripeConnectedAccountId: profilesTable.stripeConnectedAccountId,
              stripeConnectStatus: profilesTable.stripeConnectStatus,
            })
            .from(profilesTable)
            .where(eq(profilesTable.userId, artistId));

          if (
            artistProfile?.stripeConnectedAccountId &&
            artistProfile.stripeConnectStatus === 'active'
          ) {
            // Verify charges_enabled directly from Stripe before routing funds.
            try {
              const account = await stripe.accounts.retrieve(artistProfile.stripeConnectedAccountId);
              if (account.charges_enabled) {
                connectedAccountId = artistProfile.stripeConnectedAccountId;
              }
            } catch {
              // If retrieval fails, fall through to platform-only flow.
            }
          }
        }
      }
    }

    const manualPayout = listingIds.length > 0 && connectedAccountId === null;

    const sessionParams: import('stripe').Stripe.Checkout.SessionCreateParams = {
      payment_method_types: ['card'],
      customer_email: customerEmail,
      line_items: items.map((item) => {
        let unitAmountCents: number;
        if (item.listingId) {
          const dbListing = listingPriceMap.get(item.listingId)!;
          unitAmountCents = Math.round(dbListing.price * 100);
        } else {
          unitAmountCents = digitalPriceCents!;
        }

        return {
          price_data: {
            currency: 'usd',
            unit_amount: unitAmountCents,
            product_data: {
              name: item.name,
              description: item.artistName ? `By ${item.artistName}` : undefined,
              images: item.imageUrl ? [item.imageUrl] : undefined,
            },
          },
          quantity: item.quantity,
        };
      }),
      mode: 'payment',
      success_url: `${baseUrl}${basePath}${successPath ?? '/cart/success'}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${basePath}${cancelPath ?? '/cart'}`,
      metadata: {
        // Reserved keys are always set from trusted server-side values.
        // safeExtraMeta is spread after to allow additional context keys,
        // but reserved keys cannot appear in safeExtraMeta (enforced above).
        ...safeExtraMeta,
        platform: 'kiln',
        ...(userId ? { userId } : {}),
        // Trusted server-side record of what was purchased (for order creation).
        ...(sessionListingIds ? { listingIds: sessionListingIds, listingQtys: sessionListingQtys } : {}),
        // Flag manual-payout sessions so the webhook can send a buyer receipt.
        ...(manualPayout ? { manualPayout: 'true' } : {}),
      },
      // Route funds to artist's connected account when available.
      ...(connectedAccountId
        ? {
            payment_intent_data: {
              application_fee_amount: Math.round(totalAmountCents * 0.1),
              transfer_data: { destination: connectedAccountId },
            },
          }
        : {}),
    };

    const session = await stripe.checkout.sessions.create(sessionParams);

    // For manual-payout orders, look up the artist's configured processing window
    // so the buyer can be shown an accurate estimate at checkout.
    let processingWindowDays: number | null = null;
    if (manualPayout) {
      const artistIds = [...new Set(
        listingIds.map((id) => listingPriceMap.get(id)?.artistId).filter((id): id is string => !!id),
      )];
      if (artistIds.length > 0) {
        try {
          const settingsRows = await db
            .select({ userId: userSettingsTable.userId, paymentSettings: userSettingsTable.paymentSettings })
            .from(userSettingsTable)
            .where(inArray(userSettingsTable.userId, artistIds));
          for (const row of settingsRows) {
            const ps = row.paymentSettings as Record<string, unknown> | null;
            const w = ps && typeof ps.processingWindow === 'number' ? ps.processingWindow : null;
            if (w !== null) {
              processingWindowDays = processingWindowDays === null ? w : Math.max(processingWindowDays, w);
            }
          }
        } catch (windowErr) {
          // Non-critical: fall through, frontend will use the default label
          logger.warn({ err: windowErr }, 'Could not fetch artist processingWindow for manual-payout response');
        }
      }
    }

    res.json({ url: session.url, sessionId: session.id, manualPayout, processingWindowDays });
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
      metadata: {
        platform: 'kiln',
        artistId: artistId ?? '',
        tierId: tierId ?? '',
        ...(req.isAuthenticated() ? { userId: req.user.id } : {}),
      },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err: unknown) {
    logger.error({ err }, 'Stripe subscription checkout error');
    const msg = err instanceof Error ? err.message : 'Checkout failed';
    res.status(500).json({ error: msg });
  }
});

router.post('/stripe/gift-card-checkout', async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const { amount, successPath, cancelPath } = req.body as {
      amount: number;
      successPath?: string;
      cancelPath?: string;
    };

    if (!amount || amount < 1 || amount > 10000) {
      res.status(400).json({ error: 'Amount must be between $1 and $10,000' }); return;
    }

    const stripe = await getUncachableStripeClient();

    const baseUrl = process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : `http://localhost:${process.env.PORT ?? 5000}`;

    const basePath = process.env.BASE_PATH ?? '';

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: req.user.email ?? undefined,
      line_items: [{
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(amount * 100),
          product_data: { name: `Kiln Gift Card — $${amount}` },
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${baseUrl}${basePath}${successPath ?? '/gift-cards'}?purchased=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${basePath}${cancelPath ?? '/gift-cards'}`,
      metadata: { platform: 'kiln', type: 'gift_card', userId: req.user.id },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (err: unknown) {
    logger.error({ err }, 'Stripe gift-card checkout error');
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
    // listing cart
    listingIds?: string;
    listingQtys?: string;
    manualPayout?: string;
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
        customer_details?: { email?: string | null } | null;
      };

      if (session.payment_status === 'paid' && session.metadata?.platform === 'kiln') {
        const meta = session.metadata ?? {};

        // 1. Generic order payment
        if (meta.orderId) {
          await db.update(ordersTable)
            .set({ status: 'paid' })
            .where(eq(ordersTable.id, meta.orderId));
        }

        // 2. Digital download — record purchase so user can download.
        // Title and download URL are sourced from the server-side product registry.
        // Amount paid is verified against the authoritative product price before granting
        // the entitlement, preventing a cheap-listing session from unlocking a paid product.
        if (meta.type === 'digital' && meta.productId && meta.userId) {
          const product = getDigitalProduct(meta.productId);
          if (product && !product.isFree) {
            const authorizedPriceCents = Math.round(product.priceUsd * 100);
            const paidCents = session.amount_total ?? 0;
            // Allow $1.00 tolerance for rounding differences.
            if (Math.abs(authorizedPriceCents - paidCents) <= 100) {
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
                  productTitle: product.title,
                  amountCents: paidCents,
                  downloadUrl: product.downloadUrl,
                });
              }
            } else {
              logger.warn({ sessionId: session.id, productId: meta.productId, authorizedPriceCents, paidCents }, 'Digital entitlement rejected: paid amount does not match product price');
            }
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

        // 6. Manual-payout order — send buyer a receipt email since Stripe won't
        //    automatically send one (no connected account to trigger their receipt flow).
        if (meta.manualPayout === 'true' && meta.listingIds) {
          const buyerEmail =
            session.customer_email ?? session.customer_details?.email ?? null;
          if (buyerEmail && !manualPayoutReceiptSent.has(session.id)) {
            manualPayoutReceiptSent.add(session.id);
            try {
              const ids = meta.listingIds.split(',').filter(Boolean);
              const qtys = (meta.listingQtys ?? '').split(',').map((q) => parseInt(q, 10) || 1);

              const listingRows = ids.length > 0
                ? await db
                    .select({
                      id: listingsTable.id,
                      title: listingsTable.title,
                      artistId: listingsTable.artistId,
                    })
                    .from(listingsTable)
                    .where(inArray(listingsTable.id, ids))
                : [];

              const artistIds = [...new Set(listingRows.map((r) => r.artistId))];
              const artistRows = artistIds.length > 0
                ? await db
                    .select({ userId: profilesTable.userId, displayName: profilesTable.displayName })
                    .from(profilesTable)
                    .where(inArray(profilesTable.userId, artistIds))
                : [];
              const artistNameMap = new Map(artistRows.map((a) => [a.userId, a.displayName ?? '']));

              const receiptItems = ids.map((id, idx) => {
                const listing = listingRows.find((r) => r.id === id);
                return {
                  title: listing?.title ?? id,
                  quantity: qtys[idx] ?? 1,
                  artistName: listing ? (artistNameMap.get(listing.artistId) ?? undefined) : undefined,
                };
              });

              const html = manualPayoutReceiptEmail(
                session.id,
                session.amount_total ?? 0,
                receiptItems,
              );

              await sendEmail({
                to: buyerEmail,
                subject: 'Your Kiln order is confirmed',
                html,
              });
            } catch (emailErr) {
              logger.error({ err: emailErr, sessionId: session.id }, 'Failed to send manual-payout receipt email');
            }
          }
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
