import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { sendEmail, sendEmailWithRetry, manualPayoutReceiptEmail, type ManualPayoutReceiptItem, type PerArtistShippingLine, newPatronEmail, stripeAccountRestrictedEmail } from './lib/email';
import { logger } from './lib/logger';
import { db } from '@workspace/db';
import { patronSubscriptionsTable, patronTiersTable, profilesTable, ordersTable, listingsTable, userSettingsTable } from '@workspace/db';
import { eq, and, sql, inArray } from 'drizzle-orm';
import crypto from 'crypto';
import type Stripe from 'stripe';

/**
 * Create order rows for a listing checkout session, inline in the webhook handler.
 * This ensures orders exist before the receipt email is sent, eliminating the race
 * between the webhook and the buyer's browser redirect.
 *
 * Idempotent: if orders already exist for this session (created by the browser or a
 * previous webhook delivery), the existing rows are returned unchanged.
 *
 * Returns created/existing order rows, or [] if creation is skipped
 * (userId absent, no matching listings, or amount mismatch).
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

  const existing = await db
    .select({ id: ordersTable.id, sellerId: ordersTable.sellerId })
    .from(ordersTable)
    .where(eq(ordersTable.notes, dedupeKey));
  if (existing.length > 0) {
    return existing.map((r) => ({ orderId: r.id, sellerId: r.sellerId ?? '' }));
  }

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

  let expectedCents = 0;
  for (let i = 0; i < listingIds.length; i++) {
    const listing = listingMap.get(listingIds[i]);
    if (listing) expectedCents += Math.round(listing.price * 100) * (listingQtys[i] ?? 1);
  }
  const paidCents = amountTotal ?? 0;
  if (Math.abs(expectedCents - paidCents) > 100) {
    logger.warn({ sessionId, expectedCents, paidCents }, 'Webhook order creation skipped: amount mismatch');
    return [];
  }

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
      ? ps.processingWindowLabel.trim() : null;
    processingWindowLabelMap.set(row.userId, label);
  }

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

  const result: { orderId: string; sellerId: string }[] = [];
  for (let i = 0; i < listingIds.length; i++) {
    const listing = listingMap.get(listingIds[i]);
    if (!listing) {
      logger.warn({ listingId: listingIds[i], sessionId }, 'Listing from session metadata not found; skipping order row');
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
      quantity: qty,
      currency: 'USD',
      status: 'confirmed',
      shippingAddress: buyerShippingAddress,
      notes: dedupeKey,
      processingWindowDays: processingWindowMap.get(listing.artistId) ?? null,
      processingWindowLabel: processingWindowLabelMap.get(listing.artistId) ?? null,
      manualPayout,
    });
    result.push({ orderId, sellerId: listing.artistId });
  }

  return result;
}

async function activatePatronSubscription(tierId: string, userId: string): Promise<void> {
  const [tier] = await db.select().from(patronTiersTable).where(eq(patronTiersTable.id, tierId));
  if (!tier) return;

  const [existing] = await db
    .select()
    .from(patronSubscriptionsTable)
    .where(
      and(
        eq(patronSubscriptionsTable.tierId, tierId),
        eq(patronSubscriptionsTable.subscriberId, userId),
        eq(patronSubscriptionsTable.status, 'active'),
      ),
    );

  if (!existing) {
    await db.insert(patronSubscriptionsTable).values({
      id: crypto.randomUUID(),
      tierId,
      artistId: tier.artistId,
      subscriberId: userId,
      status: 'active',
      amount: tier.price,
    });
    await db
      .update(patronTiersTable)
      .set({ subscriberCount: sql`${patronTiersTable.subscriberCount} + 1` })
      .where(eq(patronTiersTable.id, tierId));
  }

  const [artistProfile] = await db
    .select({ displayName: profilesTable.displayName, contactEmail: profilesTable.contactEmail })
    .from(profilesTable)
    .where(eq(profilesTable.userId, tier.artistId));
  const [patronProfile] = await db
    .select({ displayName: profilesTable.displayName })
    .from(profilesTable)
    .where(eq(profilesTable.userId, userId));

  if (artistProfile?.contactEmail) {
    await sendEmailWithRetry({
      to: artistProfile.contactEmail,
      subject: `New patron: ${patronProfile?.displayName ?? 'Someone'} joined your ${tier.name} tier`,
      html: newPatronEmail(patronProfile?.displayName ?? 'A fan', tier.name),
    }, { label: "new patron notification (webhook)" });
  }
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    try {
      const stripe = await getUncachableStripeClient();
      const event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET ?? '');

      if (event.type === 'account.updated') {
        const account = event.data.object as Stripe.Account;
        if (account.id) {
          const disabledReason = account.requirements?.disabled_reason ?? null;
          const isRestricted = disabledReason !== null;

          let newStatus: string;
          if (account.charges_enabled) {
            newStatus = 'active';
          } else if (isRestricted) {
            newStatus = 'restricted';
          } else {
            newStatus = 'pending';
          }

          const [profile] = await db
            .select({
              contactEmail: profilesTable.contactEmail,
              displayName: profilesTable.displayName,
              stripeRestrictionNotified: profilesTable.stripeRestrictionNotified,
            })
            .from(profilesTable)
            .where(eq(profilesTable.stripeConnectedAccountId, account.id));

          const statusUpdates: Partial<typeof profilesTable.$inferInsert> = { stripeConnectStatus: newStatus };

          if (!isRestricted && profile?.stripeRestrictionNotified) {
            statusUpdates.stripeRestrictionNotified = false;
          }

          await db
            .update(profilesTable)
            .set(statusUpdates)
            .where(eq(profilesTable.stripeConnectedAccountId, account.id));

          if (isRestricted && profile && !profile.stripeRestrictionNotified && profile.contactEmail) {
            const sent = await sendEmail({
              to: profile.contactEmail,
              subject: 'Action required: your Kiln payout account has been restricted',
              html: stripeAccountRestrictedEmail(profile.displayName ?? ''),
            });
            if (sent) {
              await db
                .update(profilesTable)
                .set({ stripeRestrictionNotified: true })
                .where(eq(profilesTable.stripeConnectedAccountId, account.id));
            } else {
              logger.warn({ accountId: account.id }, 'Stripe restriction email delivery failed; will retry on next webhook ping');
            }
          }

          logger.info({ accountId: account.id, newStatus, isRestricted }, 'Stripe account.updated: synced stripeConnectStatus');
        }
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as import('stripe').Stripe.Checkout.Session;
        const meta = (session.metadata ?? {}) as Record<string, string>;
        const email = session.customer_details?.email ?? session.customer_email;
        const amount = session.amount_total ?? 0;
        const orderId = session.id.slice(-8).toUpperCase();

        if (session.mode === 'payment' && email) {
          // Create order rows server-side for listing checkouts so the receipt email
          // deep link is always correct. For non-listing sessions (meta.listingIds absent
          // or meta.userId absent), this is a no-op and the fallback path still works.
          let webhookCreatedOrders: { orderId: string; sellerId: string }[] = [];
          if (meta.listingIds && meta.userId) {
            const listingIds = meta.listingIds.split(',').filter(Boolean);
            const listingQtys = (meta.listingQtys ?? '').split(',').map((q) => parseInt(q, 10) || 1);
            try {
              webhookCreatedOrders = await createOrdersForSession({
                sessionId: session.id,
                amountTotal: session.amount_total ?? null,
                userId: meta.userId,
                listingIds,
                listingQtys,
                manualPayout: meta.manualPayout === 'true',
              });
            } catch (orderErr) {
              logger.error({ err: orderErr, sessionId: session.id }, 'Webhook order creation failed; receipt email will omit deep link');
            }
          }

          // Use the first order ID as the receipt deep-link target.
          // If order creation was skipped or failed, the link falls back to null
          // and the email renders without a deep link (still functional).
          const receiptOrderId = webhookCreatedOrders[0]?.orderId ?? null;

          // Fetch all order rows for this session to build itemised receipt email.
          const sessionKey = `stripe:${session.id}`;
          const sessionOrders = receiptOrderId
            ? await db
                .select({
                  title: ordersTable.title,
                  amount: ordersTable.amount,
                  quantity: ordersTable.quantity,
                  processingWindowDays: ordersTable.processingWindowDays,
                  shippingAddress: ordersTable.shippingAddress,
                  displayName: profilesTable.displayName,
                })
                .from(ordersTable)
                .leftJoin(profilesTable, eq(ordersTable.sellerId, profilesTable.userId))
                .where(eq(ordersTable.notes, sessionKey))
                .catch(() => [])
            : [];

          const items: ManualPayoutReceiptItem[] = sessionOrders.length > 0
            ? sessionOrders.map((o) => {
                const qty = o.quantity ?? 1;
                const totalCents = Math.round((o.amount ?? 0) * 100);
                const unitCents = qty > 1 ? Math.round(totalCents / qty) : totalCents;
                return {
                  title: o.title ?? 'Item',
                  quantity: qty,
                  priceCents: unitCents,
                  artistName: o.displayName ?? undefined,
                };
              })
            : [];

          const processingWindowDays = sessionOrders.reduce<number | null>((max, o) => {
            if (o.processingWindowDays == null) return max;
            return max == null ? o.processingWindowDays : Math.max(max, o.processingWindowDays);
          }, null);

          const shippingAddress = sessionOrders[0]?.shippingAddress ?? null;

          // Parse per-artist shipping breakdown stored in session metadata.
          let perArtistShipping: PerArtistShippingLine[] | null = null;
          if (meta.shippingBreakdown) {
            try {
              const parsed = JSON.parse(meta.shippingBreakdown) as unknown;
              if (Array.isArray(parsed)) {
                perArtistShipping = parsed
                  .filter(
                    (e): e is { n: string; c: number } =>
                      e !== null &&
                      typeof e === 'object' &&
                      typeof (e as Record<string, unknown>).n === 'string' &&
                      typeof (e as Record<string, unknown>).c === 'number',
                  )
                  .map((e) => ({ artistName: e.n, amountCents: e.c }));
                if (perArtistShipping.length === 0) perArtistShipping = null;
              }
            } catch {
              // Malformed JSON — proceed without shipping breakdown.
            }
          }

          await sendEmailWithRetry(
            {
              to: email,
              subject: `Your Kiln order #${orderId} is confirmed`,
              html: manualPayoutReceiptEmail(orderId, amount, items, processingWindowDays, receiptOrderId ?? undefined, shippingAddress, perArtistShipping),
            },
            { contextId: session.id, label: 'order confirmation' },
          );
        }

        if (session.mode === 'subscription' && meta.platform === 'kiln' && meta.tierId && meta.userId) {
          activatePatronSubscription(meta.tierId, meta.userId).catch((err) =>
            logger.error({ err }, 'Failed to activate patron subscription from webhook'),
          );
        }
      }
    } catch (err) {
      logger.debug({ err }, 'Webhook email/patron step skipped (webhook secret may not be configured)');
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
  }
}
