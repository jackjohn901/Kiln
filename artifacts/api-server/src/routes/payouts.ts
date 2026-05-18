import { Router } from "express";
import { db } from "@workspace/db";
import { payoutsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// GET /payouts — my payout history
router.get("/payouts", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const payouts = await db.select().from(payoutsTable)
      .where(eq(payoutsTable.userId, req.user.id))
      .orderBy(desc(payoutsTable.createdAt));
    res.json({
      payouts: payouts.map(p => ({
        ...p,
        requestedAt: p.requestedAt.toISOString(),
        processedAt: p.processedAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "getPayouts error");
    res.status(500).json({ error: "Failed to load payouts" });
  }
});

// POST /payouts/request — request a payout
router.post("/payouts/request", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { amountCents, method, notes } = req.body as {
    amountCents: number;
    method?: string;
    notes?: string;
  };
  if (!amountCents || Number(amountCents) < 100) {
    res.status(400).json({ error: "Minimum payout is $1.00" });
    return;
  }
  try {
    const [payout] = await db.insert(payoutsTable).values({
      id: crypto.randomUUID(),
      userId: req.user.id,
      amountCents: Number(amountCents),
      method: method ?? "bank",
      notes: notes ?? null,
    }).returning();
    res.status(201).json({
      ...payout,
      requestedAt: payout.requestedAt.toISOString(),
      processedAt: null,
      createdAt: payout.createdAt.toISOString(),
    });
  } catch (err) {
    req.log.error({ err }, "requestPayout error");
    res.status(500).json({ error: "Failed to request payout" });
  }
});

export default router;
