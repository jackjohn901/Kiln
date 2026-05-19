import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { sendEmail, orderConfirmationEmail, newPatronEmail } from './lib/email';
import { logger } from './lib/logger';
import { db } from '@workspace/db';
import { patronSubscriptionsTable, patronTiersTable, profilesTable } from '@workspace/db';
import { eq, and, sql } from 'drizzle-orm';
import crypto from 'crypto';

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
    sendEmail({
      to: artistProfile.contactEmail,
      subject: `New patron: ${patronProfile?.displayName ?? 'Someone'} joined your ${tier.name} tier`,
      html: newPatronEmail(patronProfile?.displayName ?? 'A fan', tier.name),
    }).catch(() => {});
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

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as import('stripe').Stripe.Checkout.Session;
        const meta = (session.metadata ?? {}) as Record<string, string>;
        const email = session.customer_details?.email ?? session.customer_email;
        const amount = session.amount_total ?? 0;
        const orderId = session.id.slice(-8).toUpperCase();

        if (session.mode === 'payment' && email) {
          sendEmail({
            to: email,
            subject: `Your Kiln order #${orderId} is confirmed`,
            html: orderConfirmationEmail(email, orderId, amount),
          }).catch(() => {});
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
