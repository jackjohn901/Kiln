import { Router } from "express";
import { db } from "@workspace/db";
import { auctionsTable, auctionBidsTable, notificationsTable } from "@workspace/db";
import { eq, desc, and, gt } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

// GET /auctions
router.get("/auctions", async (req, res): Promise<void> => {
  try {
    const auctions = await db.select().from(auctionsTable).orderBy(desc(auctionsTable.endDate));
    res.json({ auctions: auctions.map(a => ({ ...a, startDate: a.startDate.toISOString(), endDate: a.endDate.toISOString(), createdAt: a.createdAt.toISOString() })) });
  } catch (err) { req.log.error({ err }, "getAuctions error"); res.status(500).json({ error: "Failed to load auctions" }); }
});

// GET /auctions/:id
router.get("/auctions/:id", async (req, res): Promise<void> => {
  const [auction] = await db.select().from(auctionsTable).where(eq(auctionsTable.id, req.params.id));
  if (!auction) { res.status(404).json({ error: "Not found" }); return; }
  const bids = await db.select().from(auctionBidsTable).where(eq(auctionBidsTable.auctionId, auction.id)).orderBy(desc(auctionBidsTable.amount));
  res.json({ ...auction, bids: bids.map(b => ({ ...b, createdAt: b.createdAt.toISOString() })), startDate: auction.startDate.toISOString(), endDate: auction.endDate.toISOString(), createdAt: auction.createdAt.toISOString() });
});

// POST /auctions — create
router.post("/auctions", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { title, description, imageUrl, medium, dimensions, startingPrice, reservePrice, startDate, endDate, tags } = req.body;
  if (!title || !startingPrice || !startDate || !endDate) { res.status(400).json({ error: "title, startingPrice, startDate, endDate required" }); return; }
  const user = req.user;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Artist";
  const now = new Date();
  const sd = new Date(startDate);
  const status = sd > now ? "upcoming" : "live";
  const [auction] = await db.insert(auctionsTable).values({ id: crypto.randomUUID(), artistId: user.id, artistName: name, artistAvatarUrl: user.profileImageUrl ?? null, title, description, imageUrl, medium, dimensions, startingPrice: Number(startingPrice), reservePrice: reservePrice ? Number(reservePrice) : null, currentBid: 0, startDate: sd, endDate: new Date(endDate), status, tags: tags ?? [] }).returning();
  res.status(201).json({ ...auction, bids: [], startDate: auction.startDate.toISOString(), endDate: auction.endDate.toISOString(), createdAt: auction.createdAt.toISOString() });
});

// POST /auctions/:id/bid — place a bid
router.post("/auctions/:id/bid", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [auction] = await db.select().from(auctionsTable).where(eq(auctionsTable.id, req.params.id));
  if (!auction) { res.status(404).json({ error: "Not found" }); return; }
  if (auction.status !== "live") { res.status(400).json({ error: "Auction is not live" }); return; }
  if (new Date() > auction.endDate) { res.status(400).json({ error: "Auction has ended" }); return; }
  const { amount } = req.body;
  const bidAmount = Number(amount);
  const minBid = auction.currentBid > 0 ? auction.currentBid + 50 : auction.startingPrice;
  if (bidAmount < minBid) { res.status(400).json({ error: `Minimum bid is $${minBid}` }); return; }
  const user = req.user;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Bidder";
  const [bid] = await db.insert(auctionBidsTable).values({ id: crypto.randomUUID(), auctionId: auction.id, bidderId: user.id, bidderName: name, amount: bidAmount }).returning();
  const [updated] = await db.update(auctionsTable).set({ currentBid: bidAmount, currentBidderId: user.id, currentBidderName: name, bidCount: auction.bidCount + 1 }).where(eq(auctionsTable.id, auction.id)).returning();
  if (auction.currentBidderId && auction.currentBidderId !== user.id) {
    await db.insert(notificationsTable).values({ id: crypto.randomUUID(), userId: auction.currentBidderId, type: "follow", fromId: user.id, fromName: name, fromAvatarUrl: user.profileImageUrl ?? null, text: `outbid you on ${auction.title} with $${bidAmount.toLocaleString()}`, link: `/auctions/${auction.id}` });
  }
  res.json({ bid: { ...bid, createdAt: bid.createdAt.toISOString() }, auction: { ...updated, startDate: updated.startDate.toISOString(), endDate: updated.endDate.toISOString(), createdAt: updated.createdAt.toISOString() } });
});

export default router;
