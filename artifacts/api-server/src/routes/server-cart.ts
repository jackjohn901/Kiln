import { Router } from "express";
import { db } from "@workspace/db";
import { cartItemsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// GET /me/cart
router.get("/me/cart", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.json({ items: [] }); return; }
  const items = await db.select().from(cartItemsTable)
    .where(eq(cartItemsTable.userId, req.user.id));
  res.json({ items });
});

// POST /me/cart — add item
router.post("/me/cart", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { listingId, quantity } = req.body;
  if (!listingId) { res.status(400).json({ error: "listingId required" }); return; }
  const existing = await db.select().from(cartItemsTable)
    .where(and(eq(cartItemsTable.userId, req.user.id), eq(cartItemsTable.listingId, listingId)));
  if (existing.length > 0) {
    const [updated] = await db.update(cartItemsTable)
      .set({ quantity: (existing[0].quantity + (quantity ?? 1)) })
      .where(and(eq(cartItemsTable.userId, req.user.id), eq(cartItemsTable.listingId, listingId)))
      .returning();
    res.json(updated);
  } else {
    const [item] = await db.insert(cartItemsTable).values({
      id: crypto.randomUUID(), userId: req.user.id, listingId, quantity: quantity ?? 1,
    }).returning();
    res.status(201).json(item);
  }
});

// DELETE /me/cart/:listingId
router.delete("/me/cart/:listingId", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  await db.delete(cartItemsTable)
    .where(and(eq(cartItemsTable.userId, req.user.id), eq(cartItemsTable.listingId, req.params.listingId)));
  res.json({ ok: true });
});

// DELETE /me/cart — clear all
router.delete("/me/cart", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  await db.delete(cartItemsTable).where(eq(cartItemsTable.userId, req.user.id));
  res.json({ ok: true });
});

export default router;
