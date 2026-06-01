import { Router } from "express";
import { db } from "@workspace/db";
import { cartItemsTable, listingsTable } from "@workspace/db";
import { eq, and, inArray } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// GET /me/cart
// Returns the user's server-side cart, filtering out (and cleaning up) any rows
// whose listing has been deleted or is no longer purchasable (sold/unavailable).
router.get("/me/cart", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.json({ items: [] }); return; }
  const rows = await db
    .select({
      id: cartItemsTable.id,
      listingId: cartItemsTable.listingId,
      quantity: cartItemsTable.quantity,
      isSold: listingsTable.isSold,
      isAvailable: listingsTable.isAvailable,
    })
    .from(cartItemsTable)
    .leftJoin(listingsTable, eq(cartItemsTable.listingId, listingsTable.id))
    .where(eq(cartItemsTable.userId, req.user.id));

  const valid = rows.filter((r) => r.isAvailable === true && r.isSold === false);
  const staleIds = rows.filter((r) => !(r.isAvailable === true && r.isSold === false)).map((r) => r.id);

  // Best-effort cleanup of orphaned/unavailable rows so the cart self-heals.
  if (staleIds.length > 0) {
    db.delete(cartItemsTable)
      .where(and(eq(cartItemsTable.userId, req.user.id), inArray(cartItemsTable.id, staleIds)))
      .catch((err) => req.log.error({ err }, "me/cart cleanup error"));
  }

  res.json({ items: valid.map((r) => ({ id: r.id, listingId: r.listingId, quantity: r.quantity })) });
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
