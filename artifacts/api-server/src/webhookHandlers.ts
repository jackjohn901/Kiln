import { getStripeSync, getUncachableStripeClient } from './stripeClient';
import { sendEmail, orderConfirmationEmail } from './lib/email';
import { logger } from './lib/logger';

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    // Fire order confirmation email for completed one-time payments
    try {
      const stripe = await getUncachableStripeClient();
      const event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET ?? '');
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as import('stripe').Stripe.Checkout.Session;
        const email = session.customer_details?.email ?? session.customer_email;
        const amount = session.amount_total ?? 0;
        const orderId = session.id.slice(-8).toUpperCase();
        if (email && session.mode === 'payment') {
          sendEmail({
            to: email,
            subject: `Your Kiln order #${orderId} is confirmed`,
            html: orderConfirmationEmail(email, orderId, amount),
          }).catch(() => {});
        }
      }
    } catch (err) {
      logger.debug({ err }, 'Webhook email step skipped (webhook secret may not be configured)');
    }

    const sync = await getStripeSync();
    await sync.processWebhook(payload, signature);
  }
}
