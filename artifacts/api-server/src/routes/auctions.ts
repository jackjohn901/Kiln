import { Router } from "express";
import { db } from "@workspace/db";
import { auctionsTable, auctionBidsTable, notificationsTable, usersTable, userSettingsTable, profilesTable } from "@workspace/db";
import { sendSmsIfOptedIn } from "../lib/sms";
import { eq, desc, and, gt, max, sql } from "drizzle-orm";
import crypto from "crypto";
import { broadcastAll } from "../lib/websocket";
import { sendEmailWithRetry, outbidEmail } from "../lib/email";
import { isEmailPaused } from "../lib/emailPaused";
import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "../lib/logger";

const router = Router();

// GET /auctions
router.get("/auctions", async (req, res): Promise<void> => {
  try {
    const artistId = typeof req.query.artistId === "string" ? req.query.artistId : undefined;
    const [auctions, latestBids] = await Promise.all([
      db.select().from(auctionsTable)
        .where(artistId ? eq(auctionsTable.artistId, artistId) : undefined)
        .orderBy(desc(auctionsTable.endDate)),
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
  // Treat a start time at (or within a minute of) "now" as live, so client/server
  // clock skew can't leave a just-created auction stuck in "upcoming" and hidden.
  const status = sd.getTime() > now.getTime() + 60_000 ? "upcoming" : "live";
  const [auction] = await db.insert(auctionsTable).values({ id: crypto.randomUUID(), artistId: user.id, artistName: name, artistAvatarUrl: user.profileImageUrl ?? null, title, description, imageUrl, medium, dimensions, startingPrice: Number(startingPrice), reservePrice: reservePrice ? Number(reservePrice) : null, currentBid: 0, startDate: sd, endDate: new Date(endDate), status, tags: tags ?? [] }).returning();
  res.status(201).json({ ...auction, bids: [], startDate: auction.startDate.toISOString(), endDate: auction.endDate.toISOString(), createdAt: auction.createdAt.toISOString() });
});

// POST /auctions/:id/relist — re-auction a piece whose auction ended without
// selling ("passed": no bids, or the reserve was never met). Owner only. Starts a
// fresh live auction now, for the same duration and same starting/reserve price.
router.post("/auctions/:id/relist", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  try {
    // Serialize per source-auction with an advisory lock and re-read inside the
    // transaction so concurrent requests (multi-tab, retries) can't spawn multiple
    // clones. The source is flagged "relisted" once consumed (idempotency guard).
    type RelistResult =
      | { error: "notfound" | "forbidden" | "already" | "live" | "sold" }
      | { created: typeof auctionsTable.$inferSelect };
    const result: RelistResult = await db.transaction(async (tx): Promise<RelistResult> => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${req.params.id}))`);
      const [auction] = await tx.select().from(auctionsTable).where(eq(auctionsTable.id, req.params.id));
      if (!auction) return { error: "notfound" as const };
      if (auction.artistId !== userId) return { error: "forbidden" as const };
      if (auction.status === "relisted") return { error: "already" as const };
      if (new Date() <= auction.endDate) return { error: "live" as const };
      const reserveMet = auction.reservePrice == null || auction.currentBid >= auction.reservePrice;
      if (auction.currentBidderId && reserveMet) return { error: "sold" as const };
      // Preserve the original auction length; fall back to 3 days if it was zero/invalid.
      const durationMs = auction.endDate.getTime() - auction.startDate.getTime();
      const start = new Date();
      const end = new Date(start.getTime() + (durationMs > 0 ? durationMs : 3 * 86_400_000));
      const [created] = await tx.insert(auctionsTable).values({
        id: crypto.randomUUID(),
        artistId: auction.artistId,
        artistName: auction.artistName,
        artistAvatarUrl: auction.artistAvatarUrl,
        title: auction.title,
        description: auction.description,
        imageUrl: auction.imageUrl,
        medium: auction.medium,
        dimensions: auction.dimensions,
        startingPrice: auction.startingPrice,
        reservePrice: auction.reservePrice,
        currentBid: 0,
        currentBidderId: null,
        currentBidderName: null,
        bidCount: 0,
        currency: auction.currency,
        status: "live",
        startDate: start,
        endDate: end,
        winnerId: null,
        tags: auction.tags ?? [],
      }).returning();
      await tx.update(auctionsTable).set({ status: "relisted" }).where(eq(auctionsTable.id, auction.id));
      return { created };
    });
    if ("error" in result) {
      const map = {
        notfound: [404, "Not found"],
        forbidden: [403, "You can only re-auction your own pieces"],
        already: [409, "This piece has already been re-auctioned"],
        live: [400, "This auction hasn't ended yet"],
        sold: [400, "This auction sold — it can't be re-auctioned"],
      } as const;
      const [code, message] = map[result.error];
      res.status(code).json({ error: message });
      return;
    }
    const created = result.created;
    res.status(201).json({ ...created, bids: [], startDate: created.startDate.toISOString(), endDate: created.endDate.toISOString(), createdAt: created.createdAt.toISOString() });
  } catch (err) {
    req.log.error({ err }, "relistAuction error");
    res.status(500).json({ error: "Failed to re-auction" });
  }
});

// POST /auctions/:id/bid — place a bid
router.post("/auctions/:id/bid", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [auction] = await db.select().from(auctionsTable).where(eq(auctionsTable.id, req.params.id));
  if (!auction) { res.status(404).json({ error: "Not found" }); return; }
  if (auction.status !== "live") { res.status(400).json({ error: "Auction is not live" }); return; }
  if (new Date() > auction.endDate) { res.status(400).json({ error: "Auction has ended" }); return; }
  if (auction.artistId === req.user.id) { res.status(400).json({ error: "You can't bid on your own auction" }); return; }
  const { amount } = req.body;
  const bidAmount = Number(amount);
  const minBid = auction.currentBid > 0 ? auction.currentBid + 50 : auction.startingPrice;
  if (bidAmount < minBid) { res.status(400).json({ error: `Minimum bid is $${minBid}` }); return; }
  const user = req.user;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Bidder";
  const [bid] = await db.insert(auctionBidsTable).values({ id: crypto.randomUUID(), auctionId: auction.id, bidderId: user.id, bidderName: name, amount: bidAmount }).returning();
  const [updated] = await db.update(auctionsTable).set({ currentBid: bidAmount, currentBidderId: user.id, currentBidderName: name, bidCount: auction.bidCount + 1 }).where(eq(auctionsTable.id, auction.id)).returning();
  if (auction.currentBidderId && auction.currentBidderId !== user.id) {
    const outbidNotifId = crypto.randomUUID();
    await db.insert(notificationsTable).values({ id: outbidNotifId, userId: auction.currentBidderId, type: "follow", fromId: user.id, fromName: name, fromAvatarUrl: user.profileImageUrl ?? null, text: `outbid you on ${auction.title} with $${bidAmount.toLocaleString()}`, link: `/auctions/${auction.id}` });
    const prevBidderId = auction.currentBidderId;
    try {
      const [[prev], [s], [prof]] = await Promise.all([
        db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, prevBidderId)),
        db.select({ settings: userSettingsTable.settings, notifEmailResumeAt: userSettingsTable.notifEmailResumeAt, notifSmsResumeAt: userSettingsTable.notifSmsResumeAt }).from(userSettingsTable).where(eq(userSettingsTable.userId, prevBidderId)),
        db.select({ phoneNumber: profilesTable.phoneNumber }).from(profilesTable).where(eq(profilesTable.userId, prevBidderId)),
      ]);
      const emailSettings = (s?.settings as Record<string, unknown> | null);
      const emailSnoozed = isEmailPaused(emailSettings, s?.notifEmailResumeAt);
      const wantsEmail = !emailSnoozed && emailSettings?.notif_email_outbid !== false;
      if (emailSnoozed) {
        db.update(notificationsTable).set({ emailSkipped: true }).where(eq(notificationsTable.id, outbidNotifId)).catch(() => {});
      }
      if (wantsEmail && prev?.email) await sendEmailWithRetry({ to: prev.email, subject: `You've been outbid on "${auction.title}"`, html: outbidEmail(auction.title, bidAmount, name) }, { label: "outbid notification", contextId: auction.id });
      sendSmsIfOptedIn(prevBidderId, prof?.phoneNumber, "notif_sms_outbid", s?.settings as Record<string, unknown> | null, `Kiln: You've been outbid on "${auction.title}". New bid: $${bidAmount.toLocaleString()}. Bid now: https://kilnfire.replit.app/kiln/auctions/${auction.id}`, s?.notifSmsResumeAt);
    } catch (err) {
      logger.warn({ err, prevBidderId, auctionId: auction.id }, "Failed to send outbid notification email");
    }
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
  // Reserve must be met for a sale — keeps "sold" consistent with the relist rule,
  // so a reserve-not-met (relistable) auction can never also be checked out.
  if (auction.reservePrice != null && auction.currentBid < auction.reservePrice) { res.status(400).json({ error: "The reserve price was not met on this auction" }); return; }
  try {
    const stripe = await getUncachableStripeClient();
    const baseUrl = process.env.REPLIT_DOMAINS
      ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}`
      : `http://localhost:${process.env.PORT ?? 5000}`;
    const basePath = process.env.BASE_PATH ?? "";
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'link'],
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
