import { Router, type IRouter } from 'express';
import { db } from "@workspace/db";
import {
  listingsTable,
  profilesTable,
  userSettingsTable,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { getUncachableStripeClient } from '../stripeClient';
import { logger } from '../lib/logger';
import { getDigitalProduct } from '../lib/digitalProducts';

const router: IRouter = Router();

interface CartLineItem {
  name: string;
  quantity: number;
  imageUrl?: string;
  artistName?: string;
  /** Server uses this to look up the authoritative price from the listings table. */
  listingId?: string;
  /** Fallback unit price (in dollars) when no DB listing is available — e.g. drops, workshops. */
  price?: number;
}

// Lightweight pre-checkout validation: given a list of listing IDs, return which
// ones are sold, unavailable, or deleted. Lets the cart page warn buyers about
// stale items before they start the checkout flow. Mirrors the availability
// logic in /stripe/checkout (sold || !available || missing row).
router.post('/stripe/cart-validate', async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const { listingIds: rawListingIds } = req.body as { listingIds?: unknown };

    if (!Array.isArray(rawListingIds)) {
      res.status(400).json({ error: 'listingIds must be an array.' }); return;
    }

    // Dedupe, keep only non-empty strings, and cap to a reasonable size to avoid abuse.
    const listingIds = [...new Set(
      rawListingIds.filter((id): id is string => typeof id === 'string' && id.length > 0),
    )].slice(0, 100);

    if (listingIds.length === 0) {
      res.json({ unavailableListings: [] }); return;
    }

    const rows = await db
      .select({
        id: listingsTable.id,
        isSold: listingsTable.isSold,
        isAvailable: listingsTable.isAvailable,
        title: listingsTable.title,
      })
      .from(listingsTable)
      .where(inArray(listingsTable.id, listingIds));

    const unavailableListings: Array<{ id: string; title: string }> = [];
    const foundIds = new Set(rows.map((r) => r.id));
    for (const row of rows) {
      if (row.isSold || !row.isAvailable) {
        unavailableListings.push({ id: row.id, title: row.title });
      }
    }
    // IDs not returned by the query have been deleted from the catalogue.
    for (const id of listingIds) {
      if (!foundIds.has(id)) {
        unavailableListings.push({ id, title: 'This item' });
      }
    }

    res.json({ unavailableListings });
  } catch (err: unknown) {
    logger.error({ err }, 'Stripe cart-validate error');
    res.status(500).json({ error: 'Failed to validate cart.' });
  }
});

router.post('/stripe/checkout', async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: 'Unauthorized' }); return; }
  try {
    const { items, customerEmail, successPath, cancelPath, metadata: extraMetadata, shippingBreakdown: rawShippingBreakdown } = req.body as {
      items: CartLineItem[];
      customerEmail?: string;
      successPath?: string;
      cancelPath?: string;
      metadata?: Record<string, string>;
      shippingBreakdown?: Array<{ artistId: string; artistName: string; amountCents: number }>;
    };

    if (!items?.length) {
      res.status(400).json({ error: 'No items provided' }); return;
    }

    // Resolve authoritative prices server-side.
    // For listing items: look up from the DB by listingId.
    // For digital download items: look up from the server-side product registry.
    // For items with a fallback price (drops, workshops): no DB lookup needed.
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

      // Collect every unavailable or deleted listing before returning so the
      // client can surface all problem items in one pass (not just the first).
      const unavailableListings: Array<{ id: string; title: string }> = [];

      const foundIds = new Set(rows.map((r) => r.id));
      for (const row of rows) {
        if (row.isSold || !row.isAvailable) {
          unavailableListings.push({ id: row.id, title: row.title });
        } else {
          listingPriceMap.set(row.id, {
            price: row.price,
            artistId: row.artistId,
            title: row.title,
            imageUrl: row.imageUrl,
          });
        }
      }
      // IDs not returned by the query have been deleted from the catalogue.
      for (const id of listingIds) {
        if (!foundIds.has(id)) {
          unavailableListings.push({ id, title: "This item" });
        }
      }

      if (unavailableListings.length > 0) {
        res.status(400).json({
          error: "Some items in your cart are no longer available.",
          code: "items_unavailable",
          unavailableListings,
        });
        return;
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
      } else if (typeof item.price === "number" && item.price > 0) {
        // Fallback price provided (drops, workshops, etc.) — OK.
      } else {
        res.status(400).json({ error: 'Each checkout item must include a valid listingId or a price.' }); return;
      }
    }

    const stripe = await getUncachableStripeClient();

    const baseUrl = process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
      : `http://localhost:${process.env.PORT ?? 5000}`;

    const basePath = process.env.BASE_PATH ?? '';

    const userId = req.user.id;

    // Embed server-resolved listing IDs and quantities in session metadata so that
    // order creation after success can derive line items from a trusted source,
    // not from client-supplied localStorage data.
    const sessionListingIds = listingIds.join(',');
    const sessionListingQtys = items
      .filter((item) => item.listingId)
      .map((item) => String(item.quantity))
      .join(',');

    // Validate and encode per-artist shipping breakdown supplied by the client.
    // We only store artist names and amounts (not IDs) since names are display-only.
    // Validation: every artistId in the breakdown must belong to one of the listing's artists.
    let shippingBreakdownMeta: string | null = null;
    if (Array.isArray(rawShippingBreakdown) && rawShippingBreakdown.length > 0 && listingIds.length > 0) {
      const listingArtistIdSet = new Set(
        listingIds.map((id) => listingPriceMap.get(id)?.artistId).filter(Boolean),
      );
      const validated: Array<{ n: string; c: number }> = [];
      for (const entry of rawShippingBreakdown) {
        if (
          typeof entry.artistId === 'string' &&
          typeof entry.artistName === 'string' &&
          typeof entry.amountCents === 'number' &&
          Number.isFinite(entry.amountCents) &&
          entry.amountCents >= 0 &&
          listingArtistIdSet.has(entry.artistId)
        ) {
          validated.push({ n: entry.artistName.slice(0, 60).trim(), c: Math.round(entry.amountCents) });
        }
      }
      if (validated.length > 0) {
        const encoded = JSON.stringify(validated);
        // Stripe metadata values are capped at 500 characters; skip if the JSON is too large.
        if (encoded.length <= 500) {
          shippingBreakdownMeta = encoded;
        }
      }
    }

    // Reserved keys that must NEVER be overridden by client-supplied extraMetadata.
    const RESERVED_META_KEYS = new Set(['platform', 'userId', 'listingIds', 'listingQtys', 'shippingBreakdown']);
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
      if (isDigital && digitalPriceCents !== null) {
        return digitalPriceCents * item.quantity;
      }
      return Math.round((item.price ?? 0) * 100) * item.quantity;
    });
    const totalAmountCents = lineItemsCents.reduce((sum, c) => sum + c, 0);

    // For single-seller listing checkouts, route funds to the artist's connected Stripe account
    // if they have one with charges enabled (5% platform fee via application_fee_amount).
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
      payment_method_types: ['card', 'link'],
      customer_email: customerEmail,
      line_items: items.map((item) => {
        let unitAmountCents: number;
        if (item.listingId) {
          const dbListing = listingPriceMap.get(item.listingId)!;
          unitAmountCents = Math.round(dbListing.price * 100);
        } else if (isDigital && digitalPriceCents !== null) {
          unitAmountCents = digitalPriceCents;
        } else {
          unitAmountCents = Math.round((item.price ?? 0) * 100);
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
        userId,
        // Trusted server-side record of what was purchased (for order creation).
        ...(sessionListingIds ? { listingIds: sessionListingIds, listingQtys: sessionListingQtys } : {}),
        // Flag manual-payout sessions so the webhook can send a buyer receipt.
        ...(manualPayout ? { manualPayout: 'true' } : {}),
        // Per-artist shipping breakdown for order confirmation email (display only).
        ...(shippingBreakdownMeta ? { shippingBreakdown: shippingBreakdownMeta } : {}),
      },
      // Route funds to artist's connected account when available.
      ...(connectedAccountId
        ? {
            payment_intent_data: {
              application_fee_amount: Math.round(totalAmountCents * 0.05),
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
  if (!req.isAuthenticated()) { res.status(401).json({ error: 'Unauthorized' }); return; }
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
      payment_method_types: ['card', 'link'],
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
      payment_method_types: ['card', 'link'],
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
  if (!req.isAuthenticated()) { res.status(401).json({ error: 'Unauthorized' }); return; }
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
      payment_method_types: ['card', 'link'],
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

// POST /api/stripe/webhook is registered in app.ts BEFORE express.json(),
// so that Stripe signature verification receives the raw Buffer.
// The handler in webhookHandlers.ts is the single source of truth.
// Do NOT add a router-level /stripe/webhook route here.

export default router;
