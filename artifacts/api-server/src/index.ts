import { createServer } from "http";
import app from "./app";
import { logger } from "./lib/logger";
import { setupWebSocket } from "./lib/websocket";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient";
import { seedDatabase } from "./lib/seed";
import { backfillProcessingWindow } from "./lib/backfillProcessingWindow";
import { startScheduledPostsPublisher } from "./lib/scheduledPosts";
import { startStoryExpiry } from "./lib/storyExpiry";
import { startDropCountdownScheduler } from "./lib/dropCountdown";

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    logger.warn("DATABASE_URL not set — skipping Stripe initialization");
    return;
  }
  try {
    logger.info("Initializing Stripe schema...");
    await runMigrations({ databaseUrl });
    logger.info("Stripe schema ready");

    const stripeSync = await getStripeSync();
    const webhookBase = process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
      : "";
    if (webhookBase) {
      await stripeSync.findOrCreateManagedWebhook(`${webhookBase}/api/stripe/webhook`);
      logger.info("Stripe webhook configured");
    }
    stripeSync.syncBackfill().catch((err) => logger.error({ err }, "Stripe backfill error"));
  } catch (err: any) {
    logger.warn({ err: err.message }, "Stripe init skipped — connect integration to enable payments");
  }
}

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

(async () => {
  await initStripe();
  await seedDatabase();
  backfillProcessingWindow().catch((err) => logger.error({ err }, "backfillProcessingWindow error"));
  startScheduledPostsPublisher();
  startStoryExpiry();
  startDropCountdownScheduler();

  const server = createServer(app);
  setupWebSocket(server);

  server.listen(port, () => {
    logger.info({ port }, "Server listening");
  });

  server.on("error", (err) => {
    logger.error({ err }, "Server error");
    process.exit(1);
  });
})();
