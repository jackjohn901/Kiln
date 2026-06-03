import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { sendEmail, sendEmailWithRetry, manualPayoutReceiptEmail, type ManualPayoutReceiptItem, type PerArtistShippingLine, newPatronEmail, stripeAccountRestrictedEmail, workshopBookingEmail, newWorkshopBookingArtistEmail, commissionPaymentEmail, newSaleEmail, type WorkshopCalendarParams } from './lib/email';
import { buildReceiptPdf, sessionReceiptId, ordinalId, fmtDate, STATUS_LABELS, TYPE_LABELS, type ReceiptData } from './lib/receiptPdf';
import { logger } from './lib/logger';
import { db } from '@workspace/db';
import { patronSubscriptionsTable, patronTiersTable, profilesTable, ordersTable, listingsTable, userSettingsTable, digitalDownloadPurchasesTable, workshopsTable, workshopBookingsTable, commissionsTable, auctionsTable, notificationsTable, usersTable } from '@workspace/db';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { getDigitalProduct } from './lib/digitalProducts';
import { generateUnsubscribeToken } from './lib/unsubscribeTokens';
import { isEmailPaused } from './lib/emailPaused';
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
  /** Map of artistId → shipping cost in cents, derived from the Stripe session metadata. */
  artistShippingMap?: Map<string, number>;
}): Promise<{ orderId: string; sellerId: string }[]> {
  const { sessionId, amountTotal, userId, listingIds, listingQtys, manualPayout, artistShippingMap } = params;
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

  // Track which artists have already had their shipping cost credited to an order row.
  // Per-artist shipping covers all items from that artist in one checkout — it must only
  // appear once, on the first order row for that artist.
  const shippingCreditedArtists = new Set<string>();

  const result: { orderId: string; sellerId: string }[] = [];
  for (let i = 0; i < listingIds.length; i++) {
    const listing = listingMap.get(listingIds[i]);
    if (!listing) {
      logger.warn({ listingId: listingIds[i], sessionId }, 'Listing from session metadata not found; skipping order row');
      continue;
    }
    const qty = listingQtys[i] ?? 1;
    const orderId = crypto.randomUUID();

    // Only stamp shippingCost on the first order row per artist.
    const shippingCost = (artistShippingMap && !shippingCreditedArtists.has(listing.artistId))
      ? (artistShippingMap.get(listing.artistId) ?? null)
      : null;
    if (shippingCost !== null) shippingCreditedArtists.add(listing.artistId);

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
      shippingCost,
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
  const [artistSettings] = await db
    .select({ settings: userSettingsTable.settings, notifEmailResumeAt: userSettingsTable.notifEmailResumeAt })
    .from(userSettingsTable)
    .where(eq(userSettingsTable.userId, tier.artistId));

  const emailSettings = artistSettings?.settings as Record<string, unknown> | null;
  const emailSnoozed = isEmailPaused(emailSettings, artistSettings?.notifEmailResumeAt);
  const wantsEmail = !emailSnoozed && emailSettings?.notif_email_new_patron !== false;

  if (wantsEmail && artistProfile?.contactEmail) {
    const unsubToken = generateUnsubscribeToken(tier.artistId);
    const unsubscribeUrl = `https://kilndrop.com/api/unsubscribe/patrons?token=${encodeURIComponent(unsubToken)}`;
    await sendEmailWithRetry({
      to: artistProfile.contactEmail,
      subject: `New patron: ${patronProfile?.displayName ?? 'Someone'} joined your ${tier.name} tier`,
      html: newPatronEmail(patronProfile?.displayName ?? 'A fan', tier.name, unsubscribeUrl),
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

            // Parse the shipping breakdown stored in Stripe metadata and build a
            // Map<artistId, shippingCents> so each order row can record its shipping cost.
            let artistShippingMap: Map<string, number> | undefined;
            if (meta.shippingBreakdown) {
              try {
                const parsed = JSON.parse(meta.shippingBreakdown) as unknown;
                if (Array.isArray(parsed)) {
                  const entries = parsed.filter(
                    (e): e is { a?: string; n: string; c: number } =>
                      e !== null &&
                      typeof e === 'object' &&
                      typeof (e as Record<string, unknown>).n === 'string' &&
                      typeof (e as Record<string, unknown>).c === 'number',
                  );
                  // New format includes artistId (a); old format (before this change) did not.
                  const withId = entries.filter((e) => typeof e.a === 'string' && e.a.length > 0);
                  if (withId.length > 0) {
                    artistShippingMap = new Map(withId.map((e) => [e.a as string, e.c]));
                  }
                }
              } catch {
                // Malformed JSON — proceed without shipping map.
              }
            }

            try {
              webhookCreatedOrders = await createOrdersForSession({
                sessionId: session.id,
                amountTotal: session.amount_total ?? null,
                userId: meta.userId,
                listingIds,
                listingQtys,
                manualPayout: meta.manualPayout === 'true',
                artistShippingMap,
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
                  id: ordersTable.id,
                  sellerId: ordersTable.sellerId,
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

          // Generate receipt PDF to attach to the confirmation email.
          // A failure here is non-fatal — the email still goes out without the attachment.
          let receiptAttachment: { filename: string; content: string } | null = null;
          if (sessionOrders.length > 0) {
            try {
              const isCart = sessionOrders.length > 1;
              const refNum = isCart
                ? sessionReceiptId(session.id)
                : ordinalId(webhookCreatedOrders[0]?.orderId ?? session.id);
              const processingWindowText = processingWindowDays !== null
                ? `Ships within ${processingWindowDays} business day${processingWindowDays === 1 ? '' : 's'}`
                : null;
              const receiptData: ReceiptData = {
                refNum,
                receiptTitle:     isCart ? 'Cart Receipt' : 'Order Receipt',
                dateStr:          fmtDate(new Date()),
                statusLabel:      STATUS_LABELS['confirmed'] ?? 'Confirmed',
                typeLabel:        TYPE_LABELS['listing'] ?? 'Shop',
                lines:            sessionOrders.map((o) => ({
                  title:       o.title ?? 'Item',
                  description: null,
                  amount:      o.amount ?? 0,
                })),
                total:            sessionOrders.reduce((s, o) => s + (o.amount ?? 0), 0),
                buyerName:        session.customer_details?.name ?? null,
                buyerAddress:     shippingAddress,
                buyerEmail:       email,
                trackingNumber:   null,
                processingWindow: processingWindowText,
              };
              const pdfBytes = await buildReceiptPdf(receiptData);
              receiptAttachment = {
                filename: `Kiln_Receipt_${refNum}.pdf`,
                content:  Buffer.from(pdfBytes).toString('base64'),
              };
            } catch (pdfErr) {
              logger.warn({ err: pdfErr, sessionId: session.id }, 'Receipt PDF generation failed — sending email without attachment');
            }
          }

          await sendEmailWithRetry(
            {
              to: email,
              subject: `Your Kiln order #${orderId} is confirmed`,
              html: manualPayoutReceiptEmail(orderId, amount, items, processingWindowDays, receiptOrderId ?? undefined, shippingAddress, perArtistShipping, session.id),
              ...(receiptAttachment ? { attachments: [receiptAttachment] } : {}),
            },
            { contextId: session.id, label: 'order confirmation' },
          );

          // Artist sale notification emails — one per seller, with the shipping
          // amount they charged so they know what the buyer paid for delivery.
          if (webhookCreatedOrders.length > 0 && sessionOrders.length > 0) {
            const ordersBySeller = new Map<string, typeof sessionOrders>();
            for (const o of sessionOrders) {
              if (!o.sellerId) continue;
              if (!ordersBySeller.has(o.sellerId)) ordersBySeller.set(o.sellerId, []);
              ordersBySeller.get(o.sellerId)!.push(o);
            }
            if (ordersBySeller.size > 0) {
              const sellerIds = [...ordersBySeller.keys()];
              const [artistUsers, artistSettingsRows] = await Promise.all([
                db.select({ id: usersTable.id, email: usersTable.email }).from(usersTable).where(inArray(usersTable.id, sellerIds)),
                db.select({ userId: userSettingsTable.userId, settings: userSettingsTable.settings, notifEmailResumeAt: userSettingsTable.notifEmailResumeAt })
                  .from(userSettingsTable).where(inArray(userSettingsTable.userId, sellerIds)),
              ]);
              const artistEmailMap = new Map(artistUsers.map((u) => [u.id, u.email]));
              const artistSettingsMap = new Map(artistSettingsRows.map((s) => [s.userId, s]));
              const buyerDisplayName = session.customer_details?.name ?? email ?? 'A buyer';
              const buyerEmailAddr = email ?? '';

              for (const [sellerId, sellerOrders] of ordersBySeller) {
                const artistEmail = artistEmailMap.get(sellerId);
                if (!artistEmail) continue;
                const settings = artistSettingsMap.get(sellerId);
                const prefSettings = settings?.settings as Record<string, unknown> | null;
                const wantsEmail = !isEmailPaused(prefSettings, settings?.notifEmailResumeAt) && prefSettings?.notif_email_new_sale !== false;
                if (!wantsEmail) continue;

                const artistName = sellerOrders[0]?.displayName ?? '';
                const shippingEntry = perArtistShipping?.find((s) => s.artistName === artistName) ?? null;
                const artistShippingCents = shippingEntry !== null ? shippingEntry.amountCents : null;

                const artistItems: ManualPayoutReceiptItem[] = sellerOrders.map((o) => ({
                  title: o.title ?? 'Item',
                  quantity: o.quantity ?? 1,
                  priceCents: Math.round((o.amount ?? 0) * 100),
                }));
                const itemsTotal = Math.round(sellerOrders.reduce((s, o) => s + (o.amount ?? 0), 0) * 100);
                const artistTotalCents = artistShippingCents !== null ? itemsTotal + artistShippingCents : itemsTotal;

                const artistOrderId = webhookCreatedOrders.find((wo) => wo.sellerId === sellerId)?.orderId ?? null;
                const saleHtml = newSaleEmail(buyerDisplayName, buyerEmailAddr, session.id, artistTotalCents, artistItems, artistOrderId, null, meta.userId, artistShippingCents);
                const itemTitles = sellerOrders.map((o) => o.title ?? 'Item').join(', ');
                await sendEmailWithRetry(
                  { to: artistEmail, subject: `New Sale! ${itemTitles}`, html: saleHtml },
                  { contextId: session.id, label: 'artist sale notification' },
                );
              }
            }
          }
        }

        if (session.mode === 'subscription' && meta.platform === 'kiln' && meta.tierId && meta.userId) {
          activatePatronSubscription(meta.tierId, meta.userId).catch((err) =>
            logger.error({ err }, 'Failed to activate patron subscription from webhook'),
          );
        }

        if (session.mode === 'payment' && meta.type === 'digital' && meta.productId && meta.userId) {
          const product = getDigitalProduct(meta.productId);
          if (!product) {
            logger.warn({ productId: meta.productId, sessionId: session.id }, 'Digital download webhook: unknown productId — entitlement skipped');
          } else {
            const paidCents = session.amount_total ?? 0;
            const expectedCents = Math.round(product.priceUsd * 100);
            if (Math.abs(expectedCents - paidCents) > 1) {
              logger.warn(
                { productId: meta.productId, sessionId: session.id, expectedCents, paidCents },
                'Digital download webhook: amount mismatch — entitlement skipped',
              );
            } else {
              const [existing] = await db
                .select({ id: digitalDownloadPurchasesTable.id })
                .from(digitalDownloadPurchasesTable)
                .where(
                  and(
                    eq(digitalDownloadPurchasesTable.userId, meta.userId),
                    eq(digitalDownloadPurchasesTable.productId, meta.productId),
                  ),
                )
                .limit(1);

              if (existing) {
                logger.info({ productId: meta.productId, userId: meta.userId, sessionId: session.id }, 'Digital download entitlement already exists — skipping insert');
              } else {
                await db.insert(digitalDownloadPurchasesTable).values({
                  id: crypto.randomUUID(),
                  userId: meta.userId,
                  productId: meta.productId,
                  productTitle: product.title,
                  amountCents: paidCents,
                  downloadUrl: product.downloadUrl,
                });
                logger.info({ productId: meta.productId, userId: meta.userId, sessionId: session.id }, 'Digital download entitlement granted');
              }
            }
          }
        }

        // --- Workshop booking ---
        // Triggered when a paid workshop checkout completes. Creates the booking row,
        // increments spotsBooked, and sends confirmation emails to the student and artist.
        // Idempotent: a duplicate Stripe delivery for the same (workshopId, userId) pair
        // is detected by checking for an existing booking row before inserting.
        if (session.mode === 'payment' && meta.type === 'workshop' && meta.workshopId && meta.userId) {
          const workshopId = meta.workshopId;
          const studentId = meta.userId;
          const paidAmountCents = session.amount_total ?? 0;
          const customerName = session.customer_details?.name ?? email ?? 'Student';
          const customerEmail = email ?? null;
          try {
            const [workshop] = await db
              .select()
              .from(workshopsTable)
              .where(eq(workshopsTable.id, workshopId));
            if (!workshop) {
              logger.warn({ workshopId, sessionId: session.id }, 'Workshop webhook: workshop not found');
            } else {
              // Amount integrity: paid amount must match the workshop price (±1 cent for rounding)
              const expectedCents = workshop.price * 100;
              if (Math.abs(expectedCents - paidAmountCents) > 100) {
                logger.warn({ workshopId, expectedCents, paidAmountCents, sessionId: session.id }, 'Workshop webhook: amount mismatch — booking skipped');
              } else {
              const [existingBooking] = await db
                .select({ id: workshopBookingsTable.id })
                .from(workshopBookingsTable)
                .where(and(eq(workshopBookingsTable.workshopId, workshopId), eq(workshopBookingsTable.userId, studentId)))
                .limit(1);
              if (existingBooking) {
                logger.info({ workshopId, studentId, sessionId: session.id }, 'Workshop webhook: booking already exists — skipping');
              } else if (workshop.spotsBooked >= workshop.maxSpots) {
                logger.warn({ workshopId, studentId, sessionId: session.id }, 'Workshop webhook: no spots left — booking skipped');
              } else {
                const bookingId = crypto.randomUUID();
                await db.insert(workshopBookingsTable).values({
                  id: bookingId,
                  workshopId,
                  userId: studentId,
                  userName: customerName,
                  userEmail: customerEmail ?? undefined,
                  status: 'confirmed',
                  paidAmount: paidAmountCents,
                });
                await db.update(workshopsTable)
                  .set({ spotsBooked: sql`${workshopsTable.spotsBooked} + 1` })
                  .where(eq(workshopsTable.id, workshopId));

                // Fetch artist settings once — used for both in-app and email preferences
                const [[artistUser], [artistSettings]] = await Promise.all([
                  db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, workshop.artistId)),
                  db.select({ settings: userSettingsTable.settings, notifEmailResumeAt: userSettingsTable.notifEmailResumeAt }).from(userSettingsTable).where(eq(userSettingsTable.userId, workshop.artistId)),
                ]);
                const artistPrefSettings = artistSettings?.settings as Record<string, unknown> | null;

                // In-app notification for artist (respects notif_workshops preference)
                const artistWantsInApp = artistPrefSettings?.notif_workshops !== false;
                if (artistWantsInApp) {
                  await db.insert(notificationsTable).values({
                    id: crypto.randomUUID(),
                    userId: workshop.artistId,
                    type: 'workshop',
                    fromId: studentId,
                    fromName: customerName,
                    fromAvatarUrl: null,
                    text: `booked your workshop: ${workshop.title}`,
                    link: `/workshops`,
                  });
                }

                const calParams: WorkshopCalendarParams | undefined = workshop.startDate ? {
                  startDateISO: workshop.startDate.toISOString(),
                  endDateISO: workshop.endDate?.toISOString() ?? null,
                  durationHours: workshop.durationHours,
                  isOnline: workshop.isOnline,
                  location: workshop.location ?? null,
                  workshopId: workshop.id,
                } : undefined;

                // Student confirmation email
                if (customerEmail) {
                  const startLabel = workshop.startDate
                    ? workshop.startDate.toLocaleString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
                    : 'Date TBD';
                  const studentHtml = workshopBookingEmail(workshop.title, workshop.artistName, startLabel, calParams, { isOnline: workshop.isOnline, location: workshop.location ?? null, meetingUrl: workshop.meetingUrl ?? null });
                  await sendEmailWithRetry({ to: customerEmail, subject: `Booking confirmed: "${workshop.title}"`, html: studentHtml }, { label: 'workshop booking confirmation (webhook)', contextId: session.id });
                }

                // Artist notification email (respects notif_email_new_booking preference)
                const artistWantsEmail = !isEmailPaused(artistPrefSettings, artistSettings?.notifEmailResumeAt) && artistPrefSettings?.notif_email_new_booking !== false;
                if (artistUser?.email && artistWantsEmail) {
                  const artistHtml = newWorkshopBookingArtistEmail(customerName, customerEmail ?? '', workshop.title, paidAmountCents, calParams, null, studentId);
                  await sendEmailWithRetry({ to: artistUser.email, subject: `New booking: "${workshop.title}"`, html: artistHtml }, { label: 'new workshop booking (artist, webhook)', contextId: session.id });
                }

                logger.info({ workshopId, studentId, bookingId, sessionId: session.id }, 'Workshop webhook: booking created');
              }
              } // end amount-match else
            } // end workshop found else
          } catch (err) {
            logger.error({ err, workshopId, studentId, sessionId: session.id }, 'Workshop webhook: handler failed');
          }
        }

        // --- Commission milestone payment ---
        // Triggered when a deposit or final payment for a commission completes.
        // Marks the relevant field on the commission row and notifies the artist.
        // Idempotent: skips if the milestone is already recorded as paid.
        if (session.mode === 'payment' && meta.type === 'commission' && meta.commissionId && meta.milestone) {
          const commissionId = meta.commissionId;
          const milestone = meta.milestone; // 'deposit' | 'final'
          const paidAmountCents = session.amount_total ?? 0;
          try {
            const [commission] = await db
              .select()
              .from(commissionsTable)
              .where(eq(commissionsTable.id, commissionId));
            if (!commission) {
              logger.warn({ commissionId, sessionId: session.id }, 'Commission webhook: commission not found');
            } else if (!['deposit', 'final'].includes(milestone)) {
              // Reject unknown milestone values — prevents metadata spoofing attacks
              logger.warn({ commissionId, milestone, sessionId: session.id }, 'Commission webhook: invalid milestone value — skipping');
            } else if (meta.userId && commission.clientId !== meta.userId) {
              // Ownership check: the payer must be the client on this commission
              logger.warn({ commissionId, expectedClientId: commission.clientId, sessionUserId: meta.userId, sessionId: session.id }, 'Commission webhook: userId is not the commission client — skipping');
            } else {
              const alreadyPaid = milestone === 'deposit' ? commission.depositPaid : commission.finalPaid;
              if (alreadyPaid) {
                logger.info({ commissionId, milestone, sessionId: session.id }, 'Commission webhook: milestone already paid — skipping');
              } else {
                const updates: Partial<typeof commissionsTable.$inferInsert> = milestone === 'deposit'
                  ? { depositPaid: true, depositAmount: paidAmountCents }
                  : { finalPaid: true };
                await db.update(commissionsTable).set(updates).where(eq(commissionsTable.id, commissionId));

                // Fetch artist settings once — used for both in-app and email preferences
                const [[artistUser], [artistSettings]] = await Promise.all([
                  db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, commission.artistId)),
                  db.select({ settings: userSettingsTable.settings, notifEmailResumeAt: userSettingsTable.notifEmailResumeAt }).from(userSettingsTable).where(eq(userSettingsTable.userId, commission.artistId)),
                ]);
                const artistPrefSettings = artistSettings?.settings as Record<string, unknown> | null;

                // In-app notification for artist (respects notif_commissions preference)
                const artistWantsInApp = artistPrefSettings?.notif_commissions !== false;
                if (artistWantsInApp) {
                  await db.insert(notificationsTable).values({
                    id: crypto.randomUUID(),
                    userId: commission.artistId,
                    type: 'commission_payment',
                    fromId: commission.clientId,
                    fromName: commission.clientName,
                    fromAvatarUrl: null,
                    text: `paid ${milestone === 'deposit' ? 'the deposit' : 'the final payment'} for their commission`,
                    link: `/commissions`,
                  });
                }

                // Artist email notification (respects notif_email_commission_payment preference)
                const artistWantsEmail = !isEmailPaused(artistPrefSettings, artistSettings?.notifEmailResumeAt) && artistPrefSettings?.notif_email_commission_payment !== false;
                if (artistUser?.email && artistWantsEmail) {
                  const milestoneLabel = milestone === 'deposit' ? 'Deposit' : 'Final payment';
                  const commHtml = commissionPaymentEmail(commission.clientName, commission.clientEmail ?? '', commissionId, commission.workType ?? '', milestone, paidAmountCents);
                  await sendEmailWithRetry({ to: artistUser.email, subject: `${milestoneLabel} received from ${commission.clientName}`, html: commHtml }, { label: 'commission payment notification (webhook)', contextId: session.id });
                }

                logger.info({ commissionId, milestone, paidAmountCents, sessionId: session.id }, 'Commission webhook: payment recorded');
              }
            }
          } catch (err) {
            logger.error({ err, commissionId, milestone: meta.milestone, sessionId: session.id }, 'Commission webhook: handler failed');
          }
        }

        // --- Auction payment ---
        // Triggered when the winning bidder completes checkout.
        // Marks the auction as paid. Idempotent: skips if already in 'paid' status.
        if (session.mode === 'payment' && meta.type === 'auction' && meta.auctionId) {
          const auctionId = meta.auctionId;
          const paidAmountCents = session.amount_total ?? 0;
          try {
            const [auction] = await db
              .select({ id: auctionsTable.id, status: auctionsTable.status, currentBidderId: auctionsTable.currentBidderId, currentBid: auctionsTable.currentBid })
              .from(auctionsTable)
              .where(eq(auctionsTable.id, auctionId));
            if (!auction) {
              logger.warn({ auctionId, sessionId: session.id }, 'Auction webhook: auction not found');
            } else if (auction.status === 'paid') {
              logger.info({ auctionId, sessionId: session.id }, 'Auction webhook: already paid — skipping');
            } else if (meta.userId && auction.currentBidderId !== meta.userId) {
              // Winner check: only the winning bidder may complete the checkout
              logger.warn({ auctionId, expectedBidderId: auction.currentBidderId, sessionUserId: meta.userId, sessionId: session.id }, 'Auction webhook: userId is not the winning bidder — skipping');
            } else if (Math.abs((auction.currentBid * 100) - paidAmountCents) > 100) {
              // Amount integrity: paid amount must match winning bid (±1 cent for rounding)
              logger.warn({ auctionId, expectedCents: auction.currentBid * 100, paidAmountCents, sessionId: session.id }, 'Auction webhook: amount mismatch — skipping');
            } else {
              await db.update(auctionsTable).set({ status: 'paid' }).where(eq(auctionsTable.id, auctionId));
              logger.info({ auctionId, sessionId: session.id }, 'Auction webhook: marked as paid');
            }
          } catch (err) {
            logger.error({ err, auctionId, sessionId: session.id }, 'Auction webhook: handler failed');
          }
        }
      }
    } catch (err) {
      logger.debug({ err }, 'Webhook email/patron step skipped (webhook secret may not be configured)');
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
  }
}
