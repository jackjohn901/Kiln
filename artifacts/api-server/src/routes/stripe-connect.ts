import { Router, type IRouter } from 'express';
import { db } from '@workspace/db';
import { profilesTable } from '@workspace/db';
import { eq } from 'drizzle-orm';
import { getUncachableStripeClient } from '../stripeClient';
import { logger } from '../lib/logger';

const router: IRouter = Router();

function getBaseUrl(): string {
  return process.env.REPLIT_DOMAINS
    ? `https://${process.env.REPLIT_DOMAINS.split(',')[0]}`
    : `http://localhost:${process.env.PORT ?? 5000}`;
}

function getBasePath(): string {
  return process.env.BASE_PATH ?? '';
}

router.post('/me/stripe/connect', async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: 'Unauthorized' }); return; }

  try {
    const stripe = await getUncachableStripeClient();
    const baseUrl = getBaseUrl();
    const basePath = getBasePath();

    const [profile] = await db
      .select({ stripeConnectedAccountId: profilesTable.stripeConnectedAccountId })
      .from(profilesTable)
      .where(eq(profilesTable.userId, req.user.id));

    let accountId = profile?.stripeConnectedAccountId;

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: req.user.email ?? undefined,
        capabilities: { card_payments: { requested: true }, transfers: { requested: true } },
      });
      accountId = account.id;

      await db
        .update(profilesTable)
        .set({ stripeConnectedAccountId: accountId, stripeConnectStatus: 'pending' })
        .where(eq(profilesTable.userId, req.user.id));
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${baseUrl}${basePath}/api/me/stripe/connect/refresh`,
      return_url: `${baseUrl}${basePath}/api/me/stripe/connect/return`,
      type: 'account_onboarding',
    });

    res.json({ url: accountLink.url });
  } catch (err: unknown) {
    logger.error({ err }, 'Stripe Connect onboarding error');
    const msg = err instanceof Error ? err.message : 'Failed to start Stripe onboarding';
    res.status(500).json({ error: msg });
  }
});

router.get('/me/stripe/connect/status', async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: 'Unauthorized' }); return; }

  try {
    const [profile] = await db
      .select({
        stripeConnectedAccountId: profilesTable.stripeConnectedAccountId,
        stripeConnectStatus: profilesTable.stripeConnectStatus,
      })
      .from(profilesTable)
      .where(eq(profilesTable.userId, req.user.id));

    if (!profile?.stripeConnectedAccountId) {
      res.json({ connected: false, status: null, chargesEnabled: false });
      return;
    }

    const stripe = await getUncachableStripeClient();
    let chargesEnabled = false;
    try {
      const account = await stripe.accounts.retrieve(profile.stripeConnectedAccountId);
      chargesEnabled = account.charges_enabled;
    } catch {
      // Account may have been deleted externally; treat as not connected
    }

    res.json({
      connected: true,
      status: profile.stripeConnectStatus,
      chargesEnabled,
      accountId: profile.stripeConnectedAccountId,
    });
  } catch (err: unknown) {
    logger.error({ err }, 'Stripe Connect status error');
    const msg = err instanceof Error ? err.message : 'Failed to get status';
    res.status(500).json({ error: msg });
  }
});

router.get('/me/stripe/connect/return', async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.redirect('/login'); return; }

  const basePath = getBasePath();

  try {
    const [profile] = await db
      .select({ stripeConnectedAccountId: profilesTable.stripeConnectedAccountId })
      .from(profilesTable)
      .where(eq(profilesTable.userId, req.user.id));

    if (profile?.stripeConnectedAccountId) {
      const stripe = await getUncachableStripeClient();
      const account = await stripe.accounts.retrieve(profile.stripeConnectedAccountId);

      let newStatus: string;
      if (account.charges_enabled) {
        newStatus = 'active';
      } else if (account.requirements?.disabled_reason) {
        newStatus = 'restricted';
      } else {
        newStatus = 'pending';
      }

      await db
        .update(profilesTable)
        .set({ stripeConnectStatus: newStatus })
        .where(eq(profilesTable.userId, req.user.id));
    }
  } catch (err) {
    logger.error({ err }, 'Stripe Connect return handler error');
  }

  res.redirect(`${basePath}/kiln/earnings?connected=true`);
});

router.get('/me/stripe/connect/refresh', async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.redirect('/login'); return; }

  try {
    const stripe = await getUncachableStripeClient();
    const baseUrl = getBaseUrl();
    const basePath = getBasePath();

    const [profile] = await db
      .select({ stripeConnectedAccountId: profilesTable.stripeConnectedAccountId })
      .from(profilesTable)
      .where(eq(profilesTable.userId, req.user.id));

    if (!profile?.stripeConnectedAccountId) {
      res.redirect(`${basePath}/kiln/earnings`);
      return;
    }

    const accountLink = await stripe.accountLinks.create({
      account: profile.stripeConnectedAccountId,
      refresh_url: `${baseUrl}${basePath}/api/me/stripe/connect/refresh`,
      return_url: `${baseUrl}${basePath}/api/me/stripe/connect/return`,
      type: 'account_onboarding',
    });

    res.redirect(accountLink.url);
  } catch (err: unknown) {
    logger.error({ err }, 'Stripe Connect refresh error');
    const basePath = getBasePath();
    res.redirect(`${basePath}/kiln/earnings?connect_error=1`);
  }
});

router.post('/me/stripe/connect/disconnect', async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: 'Unauthorized' }); return; }

  try {
    await db
      .update(profilesTable)
      .set({ stripeConnectedAccountId: null, stripeConnectStatus: 'disconnected' })
      .where(eq(profilesTable.userId, req.user.id));

    res.json({ ok: true });
  } catch (err: unknown) {
    logger.error({ err }, 'Stripe Connect disconnect error');
    const msg = err instanceof Error ? err.message : 'Failed to disconnect';
    res.status(500).json({ error: msg });
  }
});

export default router;
