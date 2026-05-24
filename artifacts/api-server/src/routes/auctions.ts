import { Router } from "express";
import { db } from "@workspace/db";
import { auctionsTable, auctionBidsTable, notificationsTable, usersTable, userSettingsTable, profilesTable } from "@workspace/db";
import { sendSmsIfOptedIn } from "../lib/sms";
import { eq, desc, and, gt, max } from "drizzle-orm";
import crypto from "crypto";
import { broadcastAll } from "../lib/websocket";
import { sendEmail, outbidEmail } from "../lib/email";
import { isEmailPaused } from "../lib/emailPaused";
import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "../lib/logger";

const router = Router();

// GET /auctions
router.get("/auctions", async (req, res): Promise<void> => {
  try {
    const [auctions, latestBids] = await Promise.all([
      db.select().from(auctionsTable).orderBy(desc(auctionsTable.endDate)),
      db.select({ auctionId: auctionBidsTable.auctionId, lastBidAt: max(auctionBidsTable.createdAt) })
        .from(auctionBidsTable)
        .groupBy(auctionBidsTable.auctionId),
    ]);
    const lastBidMap = new Map(latestBids.map(r => [r.auctionId, r.lastBidAt]));
    res.json({
      auctions: auctions.map(a => ({
        ...a,
        startDate: a.startDate.toISOString(),
        endDate: a.endDate.toISOString(),
        createdAt: a.createdAt.toISOString(),
        lastBidAt: lastBidMap.get(a.id)?.toISOString() ?? null,
      })),
    });
  } catch (err) { req.log.error({ err }, "getAuctions error"); res.status(500).json({ error: "Failed to load auctions" }); }
});

// GET /auctions/:id
router.get("/auctions/:id", async (req, res): Promise<void> => {
  const [auction] = await db.select().from(auctionsTable).where(eq(auctionsTable.id, req.params.id));
  if (!auction) { res.status(404).json({ error: "Not found" }); return; }
  const bids = await db.select().from(auctionBidsTable).where(eq(auctionBidsTable.auctionId, auction.id)).orderBy(desc(auctionBidsTable.createdAt));
  const lastBidAt = bids[0]?.createdAt.toISOString() ?? null;
  res.json({ ...auction, bids: bids.map(b => ({ ...b, createdAt: b.createdAt.toISOString() })), lastBidAt, startDate: auction.startDate.toISOString(), endDate: auction.endDate.toISOString(), createdAt: auction.createdAt.toISOString() });
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
    const prevBidderId = auction.currentBidderId;
    Promise.all([
      db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, prevBidderId)),
      db.select({ settings: userSettingsTable.settings, notifEmailResumeAt: userSettingsTable.notifEmailResumeAt }).from(userSettingsTable).where(eq(userSettingsTable.userId, prevBidderId)),
      db.select({ phoneNumber: profilesTable.phoneNumber }).from(profilesTable).where(eq(profilesTable.userId, prevBidderId)),
    ]).then(([[prev], [s], [prof]]) => {
      const emailSettings = (s?.settings as Record<string, unknown> | null);
      const wantsEmail = !isEmailPaused(emailSettings, s?.notifEmailResumeAt) && emailSettings?.notif_email_outbid !== false;
      if (wantsEmail && prev?.email) sendEmail({ to: prev.email, subject: `You've been outbid on "${auction.title}"`, html: outbidEmail(auction.title, bidAmount, name) }).catch(() => {});
      sendSmsIfOptedIn(prevBidderId, prof?.phoneNumber, "notif_sms_outbid", s?.settings as Record<string, unknown> | null, `Kiln: You've been outbid on "${auction.title}". New bid: $${bidAmount.toLocaleString()}. Bid now: https://kilnfire.replit.app/kiln/auctions/${auction.id}`);
    }).catch(() => {});
  }
  broadcastAll({ type: "bid", auctionId: auction.id, currentBid: bidAmount, bidCount: auction.bidCount + 1, bidderName: name, bidAt: bid.createdAt.toISOString() });
  res.json({ bid: { ...bid, createdAt: bid.createdAt.toISOString() }, auction: { ...updated, startDate: updated.startDate.toISOString(), endDate: updated.endDate.toISOString(), createdAt: updated.createdAt.toISOString() } });
});

// POST /auctions/:id/checkout — Stripe checkout for the winning bidder
router.post("/auctions/:id/checkout", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [auction] = await db.select().from(auctionsTable).where(eq(auctionsTable.id, req.params.id));
  if (!auction) { res.status(404).json({ error: "Not found" }); return; }
  if (new Date() < auction.endDate) { res.status(400).json({ error: "Auction is still live" }); return; }
  if (!auction.currentBidderId) { res.status(400).json({ error: "No winning bid on this auction" }); return; }
  if (auction.currentBidderId !== req.user.id) { res.status(403).json({ error: "You are not the winning bidder" }); return; }
  try {
    const stripe = await getUncachableStripeClient();
    const baseUrl = process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
      : `http://localhost:${process.env.PORT ?? 5000}`;
    const basePath = process.env.BASE_PATH ?? "";
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: req.user.email ?? undefined,
      line_items: [{
        price_data: {
          currency: "usd",
          unit_amount: auction.currentBid * 100,
          product_data: {
            name: auction.title,
            description: `Won at auction — ${auction.artistName}`,
            images: auction.imageUrl ? [auction.imageUrl] : [],
          },
        },
        quantity: 1,
      }],
      mode: "payment",
      success_url: `${baseUrl}${basePath}/auctions?auction_paid=${auction.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${basePath}/auctions`,
      metadata: { platform: "kiln", type: "auction", auctionId: auction.id, userId: req.user.id },
    });
    res.json({ url: session.url, sessionId: session.id });
  } catch (err: unknown) {
    logger.error({ err }, "Auction checkout error");
    res.status(500).json({ error: "Checkout failed" });
  }
});

export default router;
