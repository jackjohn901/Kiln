import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { getWebhookState } from "../lib/webhookState";

const router: IRouter = Router();

// GET /healthz — public, unauthenticated liveness probe for uptime monitors,
// deployment pipelines, and external health checks. Verifies DB connectivity.
// Exposes minimal info only (no seed marker / privileged details).
router.get("/healthz", async (req, res) => {
  const uptimeSeconds = Math.floor(process.uptime());

  let dbOk = false;
  try {
    await db.execute(sql`SELECT 1`);
    dbOk = true;
  } catch (err) {
    req.log.error({ err }, "healthz DB check failed");
  }

  const webhookState = getWebhookState();

  // Liveness is determined by core service health only (DB).
  // Webhook registration state is included for observability but must not
  // cause the probe to return 503 — a Stripe misconfiguration should never
  // make the API appear down to deploy pipelines or uptime monitors.
  res.status(dbOk ? 200 : 503).json({
    ok: dbOk,
    db: dbOk ? "ok" : "error",
    webhook: webhookState.status,
    uptimeSeconds,
  });
});

export default router;
