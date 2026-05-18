import { Router } from "express";
import { db } from "@workspace/db";
import { digitalDownloadPurchasesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";
import { getDigitalProduct } from "../lib/digitalProducts";

const router = Router();

// GET /digital-downloads/purchases — my purchases (does NOT expose raw download URLs)
router.get("/digital-downloads/purchases", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.json({ purchases: [] }); return; }
  const purchases = await db.select().from(digitalDownloadPurchasesTable)
    .where(eq(digitalDownloadPurchasesTable.userId, req.user.id));
  res.json({ purchases: purchases.map(p => p.productId) });
});

// GET /digital-downloads/:productId/download-url — returns URL only after verifying purchase
router.get("/digital-downloads/:productId/download-url", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { productId } = req.params;
  try {
    const [purchase] = await db.select().from(digitalDownloadPurchasesTable)
      .where(and(
        eq(digitalDownloadPurchasesTable.userId, req.user.id),
        eq(digitalDownloadPurchasesTable.productId, productId),
      )).limit(1);
    if (!purchase) { res.status(403).json({ error: "Purchase required to download this file." }); return; }
    if (!purchase.downloadUrl) { res.status(404).json({ error: "File not yet available." }); return; }

    // Issue a short-lived HMAC token for the download
    const secret = process.env.SESSION_SECRET ?? "kiln-dl";
    const expiry = Math.floor(Date.now() / 1000) + 900; // 15 minutes
    const token = crypto
      .createHmac("sha256", secret)
      .update(`${req.user.id}:${productId}:${expiry}`)
      .digest("hex");

    res.json({ url: purchase.downloadUrl, token, expiry, expiresIn: 900 });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch download URL" });
  }
});

// POST /digital-downloads/purchase — record a FREE product acquisition only.
// Paid products are recorded exclusively via the Stripe webhook after confirmed payment.
router.post("/digital-downloads/purchase", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { productId } = req.body;
  if (!productId) { res.status(400).json({ error: "productId required" }); return; }

  // Verify the product exists in the server-side registry and is genuinely free.
  const product = getDigitalProduct(productId);
  if (!product) {
    res.status(404).json({ error: "Product not found." }); return;
  }
  if (!product.isFree) {
    res.status(403).json({ error: "Paid products must be purchased through checkout." }); return;
  }

  const existing = await db.select().from(digitalDownloadPurchasesTable)
    .where(and(
      eq(digitalDownloadPurchasesTable.userId, req.user.id),
      eq(digitalDownloadPurchasesTable.productId, productId),
    ));
  if (existing.length > 0) { res.json({ purchase: existing[0], duplicate: true }); return; }

  const [purchase] = await db.insert(digitalDownloadPurchasesTable).values({
    id: crypto.randomUUID(),
    userId: req.user.id,
    productId: product.id,
    productTitle: product.title,
    amountCents: 0,
    downloadUrl: product.downloadUrl,
  }).returning();
  res.status(201).json({ purchase });
});

export default router;
