import express, { type Express } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { WebhookHandlers } from "./webhookHandlers";
import { authMiddleware } from "./middlewares/authMiddleware";
import { runOnboardingCron, runWeeklyDigest } from "./lib/onboarding";
import { drainEmailQueue } from "./lib/emailQueue";

const app: Express = express();

// Trust the platform reverse proxy so `req.ip` reflects the real client IP from
// X-Forwarded-For. Required for per-IP rate limiting (see orders cart receipt
// limiter) to identify callers instead of the shared proxy address.
app.set("trust proxy", true);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(cors({ credentials: true, origin: true }));
app.use(cookieParser());

// ── Stripe webhook: must be registered BEFORE express.json() ──────────────────
app.post(
  '/api/stripe/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res): Promise<void> => {
    const signature = req.headers['stripe-signature'];
    if (!signature) { res.status(400).json({ error: 'Missing stripe-signature' }); return; }
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (err: any) {
      logger.error({ err }, 'Stripe webhook error');
      res.status(400).json({ error: 'Webhook processing error' });
    }
  }
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(authMiddleware);

app.use("/api", router);

// ── Onboarding & digest crons ─────────────────────────────────────────────────
const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;
const EMAIL_QUEUE_INTERVAL_MS = 5 * 60_000;
// Run onboarding check once a day (first run after 5min so rapid restarts don't flood Resend)
setTimeout(() => {
  void runOnboardingCron();
  setInterval(() => void runOnboardingCron(), DAY_MS);
}, 5 * 60_000);
// Run weekly digest weekly (first run after 6min startup delay)
setTimeout(() => {
  void runWeeklyDigest();
  setInterval(() => void runWeeklyDigest(), WEEK_MS);
}, 6 * 60_000);
// Drain failed email queue on startup (after 30s) and every 5 minutes
setTimeout(() => {
  void drainEmailQueue();
  setInterval(() => void drainEmailQueue(), EMAIL_QUEUE_INTERVAL_MS);
}, 30_000);

export default app;
