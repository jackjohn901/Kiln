import { Router } from "express";
import { db } from "@workspace/db";
import { materialExchangeListingsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// GET /material-exchange — all available listings
router.get("/material-exchange", async (req, res): Promise<void> => {
  const listings = await db.select().from(materialExchangeListingsTable)
    .where(eq(materialExchangeListingsTable.isAvailable, 1))
    .orderBy(desc(materialExchangeListingsTable.createdAt))
    .limit(100);
  res.json({ listings });
});

// POST /material-exchange — create listing
router.post("/material-exchange", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { type, category, title, description, price, tradeFor, quantity, location, imageUrl, condition } = req.body;
  if (!title) { res.status(400).json({ error: "title required" }); return; }
  const user = req.user;
  const userName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Artist";
  const [listing] = await db.insert(materialExchangeListingsTable).values({
    id: crypto.randomUUID(), userId: user.id, userName,
    userAvatar: user.profileImageUrl ?? null,
    type: type ?? "sell", category: category ?? null, title,
    description: description ?? null,
    price: price ? Math.round(Number(price)) : null,
    tradeFor: tradeFor ?? null, quantity: quantity ?? null,
    location: location ?? null, imageUrl: imageUrl ?? null,
    condition: condition ?? null,
  }).returning();
  res.status(201).json(listing);
});

// POST /material-exchange/:id/like — toggle like
router.post("/material-exchange/:id/like", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  await db.update(materialExchangeListingsTable)
    .set({ likeCount: sql`${materialExchangeListingsTable.likeCount} + 1` })
    .where(eq(materialExchangeListingsTable.id, req.params.id));
  res.json({ ok: true });
});

// DELETE /material-exchange/:id
router.delete("/material-exchange/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [listing] = await db.select().from(materialExchangeListingsTable).where(eq(materialExchangeListingsTable.id, req.params.id));
  if (!listing || listing.userId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }
  await db.update(materialExchangeListingsTable).set({ isAvailable: 0 }).where(eq(materialExchangeListingsTable.id, req.params.id));
  res.json({ ok: true });
});

export default router;
