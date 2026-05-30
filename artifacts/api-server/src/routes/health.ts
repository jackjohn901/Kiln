import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";

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

  res.status(dbOk ? 200 : 503).json({
    ok: dbOk,
    db: dbOk ? "ok" : "error",
    uptimeSeconds,
  });
});

export default router;
