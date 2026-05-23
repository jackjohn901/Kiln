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
  usersTable,
  userSettingsTable,
  notificationsTable,
} from "@workspace/db";
import { eq, and, sql, inArray } from "drizzle-orm";
import crypto from "crypto";
import { getUncachableStripeClient } from '../stripeClient';
import { logger } from '../lib/logger';
import { broadcast } from '../lib/websocket';
import { getDigitalProduct } from '../lib/digitalProducts';
import { sendEmail, sendEmailWithRetry, manualPayoutReceiptEmail, newSaleEmail, newWorkshopBookingArtistEmail, workshopBookingEmail, commissionPaymentEmail, type WorkshopCalendarParams } from '../lib/email';

const router: IRouter = Router();

// In-memory dedup guard: prevents duplicate receipt emails when Stripe retries a
// webhook for the same session. Keyed by Stripe session ID; lives for the process
// lifetime (cleared on restart), which covers the typical retry window.
const manualPayoutReceiptSent = new Set<string>();
const manualPayoutArtistNotified = new Set<string>();

/**
 * Create order rows for a listing checkout session.
 * Called inline from the webhook handler on checkout.session.completed so that
 * order records exist before receipt emails are sent (eliminates the race between
 * the webhook and the buyer's browser redirect).
 *
 * Safe to call multiple times for the same session — idempotent via the dedupeKey.
 * Returns the created (or already-existing) order rows, or [] if creation is skipped
 * (e.g. userId absent, no matching listings, amount mismatch).
 */
async function createOrdersForSession(params: {
  sessionId: string;
  amountTotal: number | null;
  userId: string;
  listingIds: string[];
  listingQtys: number[];
  manualPayout: boolean;
}): Promise<{ orderId: string; sellerId: string }[]> {
  const { sessionId, amountTotal, userId, listingIds, listingQtys, manualPayout } = params;
  if (listingIds.length === 0) return [];

  const dedupeKey = `stripe:${sessionId}`;

  // Idempotency: return existing rows if already created (webhook replay / double call).
  const existing = await db
    .select({ id: ordersTable.id, sellerId: ordersTable.sellerId })
    .from(ordersTable)
    .where(eq(ordersTable.notes, dedupeKey));
  if (existing.length > 0) {
    return existing.map((r) => ({ orderId: r.id, sellerId: r.sellerId ?? '' }));
  }

  // Fetch authoritative listing data from DB.
  const listings = await db
    .select({
      id: listingsTable.id,
      title: listingsTable.title,
      artistId: listingsTable.artistId,
      price: listingsTable.price,
      imageUrl: listingsTable.imageUrl,
    })
    .from(listingsTable)
    .where(inArray(listingsTable.id, listingIds));

  const listingMap = new Map(listings.map((l) => [l.id, l]));

  // Amount reconciliation: reject if server-computed total differs by more than $1.
  let expectedCents = 0;
  for (let i = 0; i < listingIds.length; i++) {
    const listing = listingMap.get(listingIds[i]);
    if (listing) expectedCents += Math.round(listing.price * 100) * (listingQtys[i] ?? 1);
  }
  const paidCents = amountTotal ?? 0;
  if (Math.abs(expectedCents - paidCents) > 100) {
    logger.warn({ sessionId, expectedCents, paidCents }, 'Webhook order creation rejected: amount mismatch');
    return [];
  }

  // Fetch per-seller processing windows and buyer's stored shipping address in parallel.
  const sellerIds = [...new Set(listings.map((l) => l.artistId))];
  const [paymentSettingsRows, buyerShippingRows] = await Promise.all([
    sellerIds.length > 0
      ? db
          .select({ userId: userSettingsTable.userId, paymentSettings: userSettingsTable.paymentSettings })
          .from(userSettingsTable)
          .where(inArray(userSettingsTable.userId, sellerIds))
      : Promise.resolve([]),
    db
      .select({ defaultShippingAddress: userSettingsTable.defaultShippingAddress })
      .from(userSettingsTable)
      .where(eq(userSettingsTable.userId, userId))
      .limit(1),
  ]);

  const processingWindowMap = new Map<string, number | null>();
  const processingWindowLabelMap = new Map<string, string | null>();
  for (const row of paymentSettingsRows) {
    const ps = row.paymentSettings as Record<string, unknown> | null;
    processingWindowMap.set(row.userId, ps && typeof ps.processingWindow === 'number' ? ps.processingWindow : null);
    const label = ps && typeof ps.processingWindowLabel === 'string' && ps.processingWindowLabel.trim()
      ? ps.processingWindowLabel.trim()
      : null;
    processingWindowLabelMap.set(row.userId, label);
  }

  // Format buyer's default shipping address as a multi-line string.
  let buyerShippingAddress: string | null = null;
  const addrRow = buyerShippingRows[0];
  if (addrRow?.defaultShippingAddress) {
    const addr = addrRow.defaultShippingAddress as Record<string, unknown>;
    const street = typeof addr.street === 'string' ? addr.street.trim() : '';
    const city = typeof addr.city === 'string' ? addr.city.trim() : '';
    const state = typeof addr.state === 'string' ? addr.state.trim() : '';
    const zip = typeof addr.zip === 'string' ? addr.zip.trim() : '';
    const country = typeof addr.country === 'string' ? addr.country.trim() : '';
    const line2 = [city, state, zip].filter(Boolean).join(', ');
    const parts = [street, line2, country].filter(Boolean);
    buyerShippingAddress = parts.length > 0 ? parts.join('\n') : null;
  }

  // Insert one order row per listing item.
  const result: { orderId: string; sellerId: string }[] = [];
  for (let i = 0; i < listingIds.length; i++) {
    const listing = listingMap.get(listingIds[i]);
    if (!listing) {
      logger.warn({ listingId: listingIds[i], sessionId }, 'Listing from session metadata not found in DB; skipping');
      continue;
    }
    const qty = listingQtys[i] ?? 1;
    const orderId = crypto.randomUUID();
    await db.insert(ordersTable).values({
      id: orderId,
      buyerId: userId,
      sellerId: listing.artistId,
      type: 'listing',
      refId: listingIds[i],
      title: listing.title,
      description: null,
      imageUrl: listing.imageUrl ?? null,
      amount: listing.price * qty,
      currency: 'USD',
      status: 'confirmed',
      shippingAddress: buyerShippingAddress,
      // INVARIANT: notes must always equal dedupeKey so all rows for a session
      // can be grouped, deduplicated, and looked up. Never omit on any insert path.
      notes: dedupeKey,
      processingWindowDays: processingWindowMap.get(listing.artistId) ?? null,
      processingWindowLabel: processingWindowLabelMap.get(listing.artistId) ?? null,
      manualPayout,
    });
    result.push({ orderId, sellerId: listing.artistId });
  }

  return result;
}
const connectArtistNotified = new Set<string>();
const connectBuyerReceiptSent = new Set<string>();
const workshopArtistNotified = new Set<string>();
const workshopStudentConfirmationSent = new Set<string>();
const commissionArtistNotified = new Set<string>();

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

    // Fetch payment settings for all listing artists — needed for both:
    //   (a) manual-payout method validation (manualPayout === true)
    //   (b) processing window derivation for ALL checkout types (Connect and manual alike).
    const listingArtistIds = [...new Set(
      listingIds.map((id) => listingPriceMap.get(id)?.artistId).filter((id): id is string => !!id),
    )];
    let artistPaymentSettingsRows: Array<{ userId: string; paymentSettings: unknown }> = [];
    if (listingArtistIds.length > 0) {
      artistPaymentSettingsRows = await db
        .select({ userId: userSettingsTable.userId, paymentSettings: userSettingsTable.paymentSettings })
        .from(userSettingsTable)
        .where(inArray(userSettingsTable.userId, listingArtistIds));
    }

    // When the artist has no connected Stripe account, verify they have at least one
    // manual payment method configured before allowing checkout to proceed.
    if (manualPayout) {
      // Check that every artist has at least one usable manual payment method.
      // An artist with no settings row at all also counts as having no payment method.
      const settingsMap = new Map(artistPaymentSettingsRows.map((row) => [row.userId, row.paymentSettings]));
      const artistsWithoutMethod = listingArtistIds.filter((id) => {
        const ps = settingsMap.get(id) as Record<string, unknown> | null | undefined;
        return !ps || !(
          (typeof ps.stripeLink === 'string' && ps.stripeLink.trim()) ||
          (typeof ps.venmo === 'string' && ps.venmo.trim()) ||
          (typeof ps.cashapp === 'string' && ps.cashapp.trim()) ||
          (typeof ps.paypalMe === 'string' && ps.paypalMe.trim())
        );
      });

      if (artistsWithoutMethod.length > 0) {
        res.status(400).json({
          error: artistsWithoutMethod.length === 1
            ? 'This artist has not set up a payment method yet. Please contact them directly to complete your purchase.'
            : `${artistsWithoutMethod.length} artists in your cart have not set up a payment method yet. Please contact them directly to complete your purchase.`,
          code: 'no_payout_method',
          affectedArtistCount: artistsWithoutMethod.length,
        });
        return;
      }
    }

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

    // Derive the processing window for all orders — take the maximum across all artists.
    // Returned to the client so it can be cached in localStorage before the Stripe redirect
    // and displayed immediately on the order confirmation page for both manual-payout and
    // Connect orders.
    let processingWindowDays: number | null = null;
    let processingWindowLabel: string | null = null;
    for (const row of artistPaymentSettingsRows) {
      const ps = row.paymentSettings as Record<string, unknown> | null;
      const w = ps && typeof ps.processingWindow === 'number' ? ps.processingWindow : null;
      if (w !== null) {
        processingWindowDays = processingWindowDays === null ? w : Math.max(processingWindowDays, w);
      }
      const label = ps && typeof ps.processingWindowLabel === 'string' && ps.processingWindowLabel.trim()
        ? ps.processingWindowLabel.trim()
        : null;
      if (label !== null) {
        processingWindowLabel = label;
      }
    }

    res.json({ url: session.url, sessionId: session.id, manualPayout, processingWindowDays, processingWindowLabel });
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

router.post('/stripe/payment-plan-checkout', async (req, res): Promise<void> => {
  try {
    const { listingId, installments } = req.body as {
      listingId: string;
      installments: number;
    };

    if (!listingId || ![2, 3].includes(installments)) {
      res.status(400).json({ error: 'listingId and valid installments (2 or 3) required' });
      return;
    }

    const [listing] = await db
      .select()
      .from(listingsTable)
      .where(eq(listingsTable.id, listingId));

    if (!listing) {
      res.status(404).json({ error: 'Listing not found' });
      return;
    }

    if (listing.price < 150) {
      res.status(400).json({ error: 'Payment plans only available for listings >= $150' });
      return;
    }

    const stripe = await getUncachableStripeClient();
    const installmentAmount = Math.ceil((listing.price * 100) / installments);

    const baseUrl = process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : `http://localhost:${process.env.PORT ?? 5000}`;
    const basePath = process.env.BASE_PATH ?? '';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: { name: `${listing.title} — Installment 1 of ${installments}` },
          unit_amount: installmentAmount,
        },
        quantity: 1,
      }],
      metadata: {
        listingId,
        installments: String(installments),
        planType: "installment",
        platform: 'kiln',
        ...(req.isAuthenticated() ? { userId: req.user.id } : {}),
      },
      success_url: `${baseUrl}${basePath}/cart/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${basePath}/listings/${listingId}`,
    });

    res.json({ url: session.url });
  } catch (err: unknown) {
    logger.error({ err }, 'Stripe payment plan checkout error');
    const msg = err instanceof Error ? err.message : 'Checkout failed';
    res.status(500).json({ error: msg });
  }
});

router.get('/stripe/session/:sessionId', async (req, res): Promise<void> => {
  try {
    const stripe = await getUncachableStripeClient();
    const [session, lineItemsPage] = await Promise.all([
      stripe.checkout.sessions.retrieve(req.params.sessionId),
      stripe.checkout.sessions.listLineItems(req.params.sessionId, { limit: 100 }),
    ]);

    const lineItems = lineItemsPage.data.map((item) => ({
      name: item.description ?? 'Item',
      quantity: item.quantity ?? 1,
      amountTotal: item.amount_total,
    }));

    res.json({
      status: session.status,
      customerEmail: session.customer_details?.email,
      amountTotal: session.amount_total,
      manualPayout: session.metadata?.manualPayout === 'true',
      lineItems,
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
        customer_details?: { email?: string | null; name?: string | null } | null;
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
          // Track whether this webhook event actually created a new booking so
          // the artist notification is only sent on a real new confirmation.
          let bookingConfirmed = false;
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
              bookingConfirmed = true;
            }
          }

          // Notify the workshop host artist only when a booking was actually confirmed.
          // Gating on bookingConfirmed ensures we don't notify when:
          //   - the workshop was full (seat not granted), or
          //   - the booking already existed (webhook replay after process restart).
          if (bookingConfirmed && w) {
            const studentName = session.customer_details?.name ?? '';
            const studentEmail = session.customer_email ?? session.customer_details?.email ?? '';
            const amountCents = session.amount_total ?? 0;

            // Send confirmation email to the student.
            if (studentEmail && !workshopStudentConfirmationSent.has(session.id)) {
              workshopStudentConfirmationSent.add(session.id);
              try {
                const startDateStr = w.startDate
                  ? w.startDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
                  : 'Date TBD';
                const calParams: WorkshopCalendarParams = {
                  startDateISO: w.startDate?.toISOString() ?? null,
                  endDateISO: w.endDate?.toISOString() ?? null,
                  location: w.location ?? null,
                  isOnline: w.isOnline,
                  workshopId: w.id,
                  durationHours: w.durationHours,
                };
                const html = workshopBookingEmail(w.title, w.artistName, startDateStr, calParams);
                await sendEmail({
                  to: studentEmail,
                  subject: `You're booked! "${w.title}" with ${w.artistName}`,
                  html,
                });
              } catch (studentEmailErr) {
                logger.error({ err: studentEmailErr, sessionId: session.id }, 'Failed to send workshop booking student confirmation email');
              }
            }
          }

          if (bookingConfirmed && w && !workshopArtistNotified.has(session.id)) {
            workshopArtistNotified.add(session.id);
            try {
              const studentName = session.customer_details?.name ?? '';
              const studentEmail = session.customer_email ?? session.customer_details?.email ?? '';
              const amountCents = session.amount_total ?? 0;

              const [artistUserRow, artistSettingsRow] = await Promise.all([
                db.select({ id: usersTable.id, email: usersTable.email })
                  .from(usersTable)
                  .where(eq(usersTable.id, w.artistId))
                  .then((rows) => rows[0] ?? null),
                db.select({ userId: userSettingsTable.userId, settings: userSettingsTable.settings })
                  .from(userSettingsTable)
                  .where(eq(userSettingsTable.userId, w.artistId))
                  .then((rows) => rows[0] ?? null),
              ]);

              if (artistUserRow) {
                const artistSettings = artistSettingsRow?.settings as Record<string, boolean> | null;
                const wantsEmail = artistSettings?.notif_email_paused !== true && artistSettings?.notif_email_new_booking !== false;
                if (wantsEmail && artistUserRow.email) {
                  const html = newWorkshopBookingArtistEmail(studentName, studentEmail, w.title, amountCents);
                  await sendEmail({
                    to: artistUserRow.email,
                    subject: `New booking for "${w.title}"`,
                    html,
                  });
                }

                const notifText = studentName
                  ? `${studentName} booked a seat in "${w.title}"`
                  : `A student booked a seat in "${w.title}"`;

                await db.insert(notificationsTable).values({
                  id: crypto.randomUUID(),
                  userId: w.artistId,
                  type: 'workshop_booking',
                  fromName: studentName || 'A student',
                  text: notifText,
                  link: '/workshops',
                  read: false,
                });

                broadcast(w.artistId, {
                  type: 'notification',
                  userId: w.artistId,
                  notifType: 'workshop_booking',
                  fromName: studentName || 'A student',
                  text: notifText,
                  link: '/workshops',
                });
              }
            } catch (workshopNotifErr) {
              logger.error({ err: workshopNotifErr, sessionId: session.id }, 'Failed to send workshop booking artist notification');
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

          // Notify the commissioned artist about the payment.
          if (!commissionArtistNotified.has(session.id)) {
            commissionArtistNotified.add(session.id);
            try {
              const [commission] = await db.select({
                id: commissionsTable.id,
                artistId: commissionsTable.artistId,
                clientName: commissionsTable.clientName,
                clientEmail: commissionsTable.clientEmail,
                workType: commissionsTable.workType,
              })
                .from(commissionsTable)
                .where(eq(commissionsTable.id, meta.commissionId));

              if (commission) {
                const amountCents = session.amount_total ?? 0;
                const clientEmail = commission.clientEmail
                  ?? session.customer_email
                  ?? session.customer_details?.email
                  ?? '';

                const [artistUserRow, artistSettingsRow] = await Promise.all([
                  db.select({ id: usersTable.id, email: usersTable.email })
                    .from(usersTable)
                    .where(eq(usersTable.id, commission.artistId))
                    .then((rows) => rows[0] ?? null),
                  db.select({ userId: userSettingsTable.userId, settings: userSettingsTable.settings })
                    .from(userSettingsTable)
                    .where(eq(userSettingsTable.userId, commission.artistId))
                    .then((rows) => rows[0] ?? null),
                ]);

                if (artistUserRow) {
                  const artistSettings = artistSettingsRow?.settings as Record<string, boolean> | null;
                  const wantsEmail = artistSettings?.notif_email_paused !== true && artistSettings?.notif_email_commission_payment !== false;
                  if (wantsEmail && artistUserRow.email) {
                    const html = commissionPaymentEmail(
                      commission.clientName,
                      clientEmail,
                      commission.id,
                      commission.workType ?? '',
                      meta.milestone,
                      amountCents,
                    );
                    const milestoneLabel = meta.milestone === 'deposit' ? 'deposit' : 'final payment';
                    await sendEmail({
                      to: artistUserRow.email,
                      subject: `Commission ${milestoneLabel} received from ${commission.clientName}`,
                      html,
                    });
                  }

                  const milestoneLabel = meta.milestone === 'deposit' ? 'Deposit' : meta.milestone === 'final' ? 'Final payment' : meta.milestone;
                  const amountDollars = (amountCents / 100).toFixed(2);
                  const notifText = `${milestoneLabel} received from ${commission.clientName} — $${amountDollars}`;

                  await db.insert(notificationsTable).values({
                    id: crypto.randomUUID(),
                    userId: commission.artistId,
                    type: 'commission_payment',
                    fromName: commission.clientName,
                    text: notifText,
                    link: '/commissions',
                    read: false,
                  });

                  broadcast(commission.artistId, {
                    type: 'notification',
                    userId: commission.artistId,
                    notifType: 'commission_payment',
                    fromName: commission.clientName,
                    text: notifText,
                    link: '/commissions',
                  });
                }
              }
            } catch (commissionNotifErr) {
              logger.error({ err: commissionNotifErr, sessionId: session.id }, 'Failed to send commission payment artist notification');
            }
          }
        }

        // 5. Auction payment — mark as paid
        if (meta.type === 'auction' && meta.auctionId) {
          await db.update(auctionsTable)
            .set({ status: 'paid' })
            .where(eq(auctionsTable.id, meta.auctionId));
        }

        // 5b. For listing checkouts with a known userId, create order rows now so
        //     receipt emails and notifications can deep-link to the correct order.
        //     `createOrdersForSession` is idempotent — safe to call on webhook replay.
        let webhookOrderRows: { orderId: string; sellerId: string }[] = [];
        if (meta.listingIds && meta.userId) {
          const _lIds = meta.listingIds.split(',').filter(Boolean);
          const _lQtys = (meta.listingQtys ?? '').split(',').map((q) => parseInt(q, 10) || 1);
          webhookOrderRows = await createOrdersForSession({
            sessionId: session.id,
            amountTotal: session.amount_total ?? null,
            userId: meta.userId,
            listingIds: _lIds,
            listingQtys: _lQtys,
            manualPayout: meta.manualPayout === 'true',
          }).catch((err) => {
            logger.error({ err, sessionId: session.id }, 'Webhook order creation failed');
            return [];
          });
        }
        const webhookOrderId = webhookOrderRows[0]?.orderId ?? null;

        // 6. Manual-payout order — send buyer a receipt email since Stripe won't
        //    automatically send one (no connected account to trigger their receipt flow).
        if (meta.manualPayout === 'true' && meta.listingIds) {
          const buyerEmail =
            session.customer_email ?? session.customer_details?.email ?? null;
          if (buyerEmail && !manualPayoutReceiptSent.has(session.id)) {
            manualPayoutReceiptSent.add(session.id);
            try {
              // Fetch canonical line items from Stripe — authoritative source for
              // item name, quantity, and unit price as actually charged.
              const stripeClient = await getUncachableStripeClient();
              const stripeLineItems = await stripeClient.checkout.sessions.listLineItems(
                session.id,
                { limit: 100 },
              );

              // Listing IDs from metadata are in the same positional order as the
              // Stripe line items created at checkout. Use them only for artist name
              // enrichment via a DB lookup; never for price or quantity.
              const ids = meta.listingIds.split(',').filter(Boolean);

              const listingRows = ids.length > 0
                ? await db
                    .select({
                      id: listingsTable.id,
                      artistId: listingsTable.artistId,
                    })
                    .from(listingsTable)
                    .where(inArray(listingsTable.id, ids))
                : [];

              const artistIds = [...new Set(listingRows.map((r) => r.artistId))];
              const [artistRows, artistPaymentRows] = await Promise.all([
                artistIds.length > 0
                  ? db
                      .select({ userId: profilesTable.userId, displayName: profilesTable.displayName })
                      .from(profilesTable)
                      .where(inArray(profilesTable.userId, artistIds))
                  : Promise.resolve([]),
                artistIds.length > 0
                  ? db
                      .select({ userId: userSettingsTable.userId, paymentSettings: userSettingsTable.paymentSettings })
                      .from(userSettingsTable)
                      .where(inArray(userSettingsTable.userId, artistIds))
                  : Promise.resolve([]),
              ]);
              const artistNameMap = new Map(artistRows.map((a) => [a.userId, a.displayName ?? '']));
              // Map listing ID → artist name by position index.
              const listingArtistName = (idx: number): string | undefined => {
                const listingId = ids[idx];
                const listing = listingId ? listingRows.find((r) => r.id === listingId) : undefined;
                return listing ? (artistNameMap.get(listing.artistId) ?? undefined) : undefined;
              };

              // Derive processing window: take the maximum across all artists in the order.
              let receiptProcessingWindowDays: number | null = null;
              for (const row of artistPaymentRows) {
                const ps = row.paymentSettings as Record<string, unknown> | null;
                const w = ps && typeof ps.processingWindow === 'number' ? ps.processingWindow : null;
                if (w !== null) {
                  receiptProcessingWindowDays = receiptProcessingWindowDays === null ? w : Math.max(receiptProcessingWindowDays, w);
                }
              }

              // Build receipt items from Stripe line items (authoritative).
              const receiptItems = stripeLineItems.data.map((li, idx) => ({
                title: li.description ?? ids[idx] ?? 'Item',
                quantity: li.quantity ?? 1,
                priceCents: li.price?.unit_amount ?? undefined,
                artistName: listingArtistName(idx),
              }));

              const receiptOrderId = webhookOrderId;

              const html = manualPayoutReceiptEmail(
                session.id,
                session.amount_total ?? 0,
                receiptItems,
                receiptProcessingWindowDays,
                receiptOrderId,
              );

              await sendEmailWithRetry(
                { to: buyerEmail, subject: 'Your Kiln order is confirmed', html },
                { contextId: session.id, label: 'manual-payout receipt' },
              );
            } catch (emailErr) {
              logger.error({ err: emailErr, sessionId: session.id, to: buyerEmail }, 'Failed to send manual-payout receipt email');
            }
          }

          // 6b. Send each artist a "new sale" notification email.
          if (!manualPayoutArtistNotified.has(session.id)) {
            manualPayoutArtistNotified.add(session.id);
            try {
              const ids = meta.listingIds.split(',').filter(Boolean);
              const qtys = (meta.listingQtys ?? '').split(',').map((q) => parseInt(q, 10) || 1);

              const listingRows = ids.length > 0
                ? await db
                    .select({ id: listingsTable.id, title: listingsTable.title, artistId: listingsTable.artistId })
                    .from(listingsTable)
                    .where(inArray(listingsTable.id, ids))
                : [];

              const artistIds = [...new Set(listingRows.map((r) => r.artistId))];

              if (artistIds.length > 0) {
                const [artistUserRows, artistSettingsRows] = await Promise.all([
                  db
                    .select({ id: usersTable.id, email: usersTable.email })
                    .from(usersTable)
                    .where(inArray(usersTable.id, artistIds)),
                  db
                    .select({ userId: userSettingsTable.userId, settings: userSettingsTable.settings })
                    .from(userSettingsTable)
                    .where(inArray(userSettingsTable.userId, artistIds)),
                ]);

                const artistSettingsMap = new Map(
                  artistSettingsRows.map((r) => [r.userId, r.settings as Record<string, unknown> | null]),
                );

                const buyerName = session.customer_details?.name ?? '';
                const buyerEmail = session.customer_email ?? session.customer_details?.email ?? '';
                const amountTotal = session.amount_total ?? 0;

                for (const artist of artistUserRows) {
                  const artistItems = ids
                    .map((id, idx) => {
                      const listing = listingRows.find((r) => r.id === id && r.artistId === artist.id);
                      if (!listing) return null;
                      return { title: listing.title, quantity: qtys[idx] ?? 1 };
                    })
                    .filter((item): item is { title: string; quantity: number } => item !== null);

                  if (artistItems.length === 0) continue;

                  // Send email if the artist has opted in (default: opt-in).
                  const artistSettings = artistSettingsMap.get(artist.id);
                  const wantsEmail = artistSettings?.notif_email_paused !== true && artistSettings?.notif_email_new_sale !== false;
                  if (wantsEmail && artist.email) {
                    const html = newSaleEmail(buyerName, buyerEmail, session.id, amountTotal, artistItems);
                    await sendEmail({
                      to: artist.email,
                      subject: 'You have a new sale on Kiln',
                      html,
                    });
                  }

                  // Always insert an in-app notification so the bell badge and
                  // Notifications page reflect the new sale in real time.
                  const itemSummary = artistItems.map((item) =>
                    item.quantity > 1 ? `${item.title} ×${item.quantity}` : item.title,
                  );
                  const amountDollars = (amountTotal / 100).toFixed(2);
                  const notifText = itemSummary.length === 1
                    ? `New sale: "${itemSummary[0]}" — $${amountDollars}`
                    : `New sale: ${itemSummary.length} items — $${amountDollars}`;

                  const saleOrderId = webhookOrderId;
                  const saleLink = saleOrderId ? `/earnings/orders/${saleOrderId}` : '/earnings';

                  await db.insert(notificationsTable).values({
                    id: crypto.randomUUID(),
                    userId: artist.id,
                    type: 'sale',
                    fromName: buyerName || 'A buyer',
                    text: notifText,
                    link: saleLink,
                    read: false,
                  });

                  // Push to the artist's active session immediately so the bell
                  // badge and notification panel update without a page refresh.
                  broadcast(artist.id, {
                    type: 'notification',
                    userId: artist.id,
                    notifType: 'sale',
                    fromName: buyerName || 'A buyer',
                    text: notifText,
                    link: saleLink,
                  });
                }
              }
            } catch (artistEmailErr) {
              logger.error({ err: artistEmailErr, sessionId: session.id }, 'Failed to send manual-payout artist notification email');
            }
          }
        }

        // 7. Stripe Connect listing sale — send artist notification email and
        //    create an in-app notification. This mirrors the manual-payout path
        //    (section 6b) but fires when the order was routed through the artist's
        //    connected Stripe account (manualPayout is NOT set).
        if (!meta.manualPayout && meta.listingIds && !connectArtistNotified.has(session.id)) {
          connectArtistNotified.add(session.id);
          try {
            const ids = meta.listingIds.split(',').filter(Boolean);
            const qtys = (meta.listingQtys ?? '').split(',').map((q) => parseInt(q, 10) || 1);

            const listingRows = ids.length > 0
              ? await db
                  .select({ id: listingsTable.id, title: listingsTable.title, artistId: listingsTable.artistId })
                  .from(listingsTable)
                  .where(inArray(listingsTable.id, ids))
              : [];

            // 7a. Send the buyer an itemized receipt email.
            //     Stripe Connect sessions do not automatically send a Kiln receipt,
            //     so we mirror the manual-payout receipt flow here.
            const connectBuyerEmail =
              session.customer_email ?? session.customer_details?.email ?? null;
            if (connectBuyerEmail && !connectBuyerReceiptSent.has(session.id)) {
              connectBuyerReceiptSent.add(session.id);
              try {
                const stripeClient = await getUncachableStripeClient();
                const stripeLineItems = await stripeClient.checkout.sessions.listLineItems(
                  session.id,
                  { limit: 100 },
                );

                const artistIds = [...new Set(listingRows.map((r) => r.artistId))];
                const [artistRows, artistPaymentRows] = await Promise.all([
                  artistIds.length > 0
                    ? db
                        .select({ userId: profilesTable.userId, displayName: profilesTable.displayName })
                        .from(profilesTable)
                        .where(inArray(profilesTable.userId, artistIds))
                    : Promise.resolve([]),
                  artistIds.length > 0
                    ? db
                        .select({ userId: userSettingsTable.userId, paymentSettings: userSettingsTable.paymentSettings })
                        .from(userSettingsTable)
                        .where(inArray(userSettingsTable.userId, artistIds))
                    : Promise.resolve([]),
                ]);
                const artistNameMap = new Map(artistRows.map((a) => [a.userId, a.displayName ?? '']));

                // Derive processing window: take the maximum across all artists in the order.
                let receiptProcessingWindowDays: number | null = null;
                for (const row of artistPaymentRows) {
                  const ps = row.paymentSettings as Record<string, unknown> | null;
                  const w = ps && typeof ps.processingWindow === 'number' ? ps.processingWindow : null;
                  if (w !== null) {
                    receiptProcessingWindowDays = receiptProcessingWindowDays === null ? w : Math.max(receiptProcessingWindowDays, w);
                  }
                }

                const receiptItems = stripeLineItems.data.map((li, idx) => {
                  const listingId = ids[idx];
                  const listing = listingId ? listingRows.find((r) => r.id === listingId) : undefined;
                  const artistName = listing ? (artistNameMap.get(listing.artistId) ?? undefined) : undefined;
                  return {
                    title: li.description ?? listingId ?? 'Item',
                    quantity: li.quantity ?? 1,
                    priceCents: li.price?.unit_amount ?? undefined,
                    artistName,
                  };
                });

                const connectReceiptOrderId = webhookOrderId;

                const html = manualPayoutReceiptEmail(
                  session.id,
                  session.amount_total ?? 0,
                  receiptItems,
                  receiptProcessingWindowDays,
                  connectReceiptOrderId,
                );

                await sendEmailWithRetry(
                  { to: connectBuyerEmail, subject: 'Your Kiln order is confirmed', html },
                  { contextId: session.id, label: 'connect receipt' },
                );
              } catch (receiptErr) {
                logger.error({ err: receiptErr, sessionId: session.id, to: connectBuyerEmail }, 'Failed to send Stripe Connect buyer receipt email');
              }
            }

            const artistIds = [...new Set(listingRows.map((r) => r.artistId))];

            if (artistIds.length > 0) {
              const [artistUserRows, artistSettingsRows] = await Promise.all([
                db
                  .select({ id: usersTable.id, email: usersTable.email })
                  .from(usersTable)
                  .where(inArray(usersTable.id, artistIds)),
                db
                  .select({ userId: userSettingsTable.userId, settings: userSettingsTable.settings })
                  .from(userSettingsTable)
                  .where(inArray(userSettingsTable.userId, artistIds)),
              ]);

              const artistSettingsMap = new Map(
                artistSettingsRows.map((r) => [r.userId, r.settings as Record<string, unknown> | null]),
              );

              const buyerName = session.customer_details?.name ?? '';
              const buyerEmail = session.customer_email ?? session.customer_details?.email ?? '';
              const amountTotal = session.amount_total ?? 0;

              for (const artist of artistUserRows) {
                const artistItems = ids
                  .map((id, idx) => {
                    const listing = listingRows.find((r) => r.id === id && r.artistId === artist.id);
                    if (!listing) return null;
                    return { title: listing.title, quantity: qtys[idx] ?? 1 };
                  })
                  .filter((item): item is { title: string; quantity: number } => item !== null);

                if (artistItems.length === 0) continue;

                // Respect the artist's email notification preference (default: opt-in).
                const artistSettings = artistSettingsMap.get(artist.id);
                const wantsEmail = artistSettings?.notif_email_paused !== true && artistSettings?.notif_email_new_sale !== false;
                if (wantsEmail && artist.email) {
                  const html = newSaleEmail(buyerName, buyerEmail, session.id, amountTotal, artistItems);
                  await sendEmail({
                    to: artist.email,
                    subject: 'You have a new sale on Kiln',
                    html,
                  });
                }

                // Always insert an in-app notification regardless of email preference.
                const itemSummary = artistItems.map((item) =>
                  item.quantity > 1 ? `${item.title} ×${item.quantity}` : item.title,
                );
                const amountDollars = (amountTotal / 100).toFixed(2);
                const notifText = itemSummary.length === 1
                  ? `New sale: "${itemSummary[0]}" — $${amountDollars}`
                  : `New sale: ${itemSummary.length} items — $${amountDollars}`;

                const connectSaleOrderId = webhookOrderId;
                const connectSaleLink = connectSaleOrderId ? `/earnings/orders/${connectSaleOrderId}` : '/earnings';

                await db.insert(notificationsTable).values({
                  id: crypto.randomUUID(),
                  userId: artist.id,
                  type: 'sale',
                  fromName: buyerName || 'A buyer',
                  text: notifText,
                  link: connectSaleLink,
                  read: false,
                });

                broadcast(artist.id, {
                  type: 'notification',
                  userId: artist.id,
                  notifType: 'sale',
                  fromName: buyerName || 'A buyer',
                  text: notifText,
                  link: connectSaleLink,
                });
              }
            }
          } catch (connectArtistEmailErr) {
            logger.error({ err: connectArtistEmailErr, sessionId: session.id }, 'Failed to send Stripe Connect artist notification');
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
