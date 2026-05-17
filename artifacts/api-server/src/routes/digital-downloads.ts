import { Router } from "express";
import { db } from "@workspace/db";
import { digitalDownloadPurchasesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// GET /digital-downloads/purchases — my purchases
router.get("/digital-downloads/purchases", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.json({ purchases: [] }); return; }
  const purchases = await db.select().from(digitalDownloadPurchasesTable)
    .where(eq(digitalDownloadPurchasesTable.userId, req.user.id));
  res.json({ purchases: purchases.map(p => p.productId) });
});

// POST /digital-downloads/purchase — record a purchase
router.post("/digital-downloads/purchase", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { productId, productTitle, amountCents, downloadUrl } = req.body;
  if (!productId || !productTitle) { res.status(400).json({ error: "productId and productTitle required" }); return; }
  const existing = await db.select().from(digitalDownloadPurchasesTable)
    .where(and(eq(digitalDownloadPurchasesTable.userId, req.user.id), eq(digitalDownloadPurchasesTable.productId, productId)));
  if (existing.length > 0) { res.json({ purchase: existing[0], duplicate: true }); return; }
  const [purchase] = await db.insert(digitalDownloadPurchasesTable).values({
    id: crypto.randomUUID(), userId: req.user.id, productId, productTitle,
    amountCents: amountCents ?? 0, downloadUrl: downloadUrl ?? null,
  }).returning();
  res.status(201).json({ purchase });
});

export default router;
