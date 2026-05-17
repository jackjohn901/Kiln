import { Router } from "express";
import { db } from "@workspace/db";
import { campaignsTable, campaignRewardsTable, campaignBackersTable, notificationsTable } from "@workspace/db";
import { eq, desc, sql } from "drizzle-orm";
import crypto from "crypto";
import { getUncachableStripeClient } from "../stripeClient";
import { logger } from "../lib/logger";

const router = Router();

// GET /campaigns
router.get("/campaigns", async (req, res): Promise<void> => {
  const campaigns = await db.select().from(campaignsTable).orderBy(desc(campaignsTable.createdAt)).limit(50);
  res.json({ campaigns: campaigns.map(c => ({ ...c, endDate: c.endDate.toISOString(), createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() })) });
});

// GET /campaigns/:id
router.get("/campaigns/:id", async (req, res): Promise<void> => {
  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, req.params.id));
  if (!campaign) { res.status(404).json({ error: "Not found" }); return; }
  const rewards = await db.select().from(campaignRewardsTable).where(eq(campaignRewardsTable.campaignId, campaign.id));
  const backers = await db.select().from(campaignBackersTable).where(eq(campaignBackersTable.campaignId, campaign.id)).orderBy(desc(campaignBackersTable.createdAt)).limit(20);
  res.json({
    ...campaign,
    endDate: campaign.endDate.toISOString(), createdAt: campaign.createdAt.toISOString(), updatedAt: campaign.updatedAt.toISOString(),
    rewards: rewards.map(r => ({ ...r, createdAt: r.createdAt.toISOString() })),
    backers: backers.map(b => ({ ...b, createdAt: b.createdAt.toISOString() })),
  });
});

// POST /campaigns — create
router.post("/campaigns", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { title, description, goalCents, category, imageUrl, videoUrl, endDate, rewards } = req.body;
  if (!title || !description || !goalCents || !endDate) { res.status(400).json({ error: "title, description, goalCents, endDate required" }); return; }
  const user = req.user;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Artist";
  const [campaign] = await db.insert(campaignsTable).values({
    id: crypto.randomUUID(), artistId: user.id, artistName: name,
    artistAvatarUrl: user.profileImageUrl ?? null, title, description,
    goalCents, category, imageUrl, videoUrl, status: "live", endDate: new Date(endDate),
  }).returning();
  if (rewards?.length) {
    await db.insert(campaignRewardsTable).values(rewards.map((r: any) => ({
      id: crypto.randomUUID(), campaignId: campaign.id, title: r.title, description: r.description, amountCents: r.amountCents, maxClaimed: r.maxClaimed ?? null,
    })));
  }
  res.status(201).json({ ...campaign, endDate: campaign.endDate.toISOString(), createdAt: campaign.createdAt.toISOString(), updatedAt: campaign.updatedAt.toISOString() });
});

// POST /campaigns/:id/back — back a campaign via Stripe
router.post("/campaigns/:id/back", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [campaign] = await db.select().from(campaignsTable).where(eq(campaignsTable.id, req.params.id));
  if (!campaign || campaign.status !== "live") { res.status(400).json({ error: "Campaign not found or not live" }); return; }
  const { amountCents, rewardId, message, isAnonymous } = req.body;
  if (!amountCents || amountCents < 100) { res.status(400).json({ error: "amountCents (min 100) required" }); return; }
  const user = req.user;
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Backer";
  try {
    const stripe = await getUncachableStripeClient();
    const baseUrl = process.env.REPLIT_DOMAINS ? `https://${process.env.REPLIT_DOMAINS.split(",")[0]}` : `http://localhost:${process.env.PORT}`;
    const basePath = process.env.BASE_PATH ?? "";
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      customer_email: user.email ?? undefined,
      line_items: [{ price_data: { currency: "usd", unit_amount: amountCents, product_data: { name: `Back: ${campaign.title}` } }, quantity: 1 }],
      mode: "payment",
      success_url: `${baseUrl}${basePath}/campaigns/${campaign.id}?backed=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}${basePath}/campaigns/${campaign.id}`,
      metadata: { platform: "kiln", campaignId: campaign.id, userId: user.id },
    });
    const [backer] = await db.insert(campaignBackersTable).values({
      id: crypto.randomUUID(), campaignId: campaign.id, userId: user.id, userName: name,
      amountCents, rewardId: rewardId ?? null, message: message ?? null, isAnonymous: isAnonymous ?? false,
      stripeSessionId: session.id,
    }).returning();
    await db.update(campaignsTable).set({
      raisedCents: sql`${campaignsTable.raisedCents} + ${amountCents}`,
      backerCount: sql`${campaignsTable.backerCount} + 1`,
    }).where(eq(campaignsTable.id, campaign.id));
    res.json({ url: session.url, backerId: backer.id });
  } catch (err: any) {
    logger.error({ err }, "campaign back error");
    res.status(500).json({ error: err.message ?? "Checkout failed" });
  }
});

// GET /me/campaigns — my campaigns
router.get("/me/campaigns", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const campaigns = await db.select().from(campaignsTable).where(eq(campaignsTable.artistId, req.user.id)).orderBy(desc(campaignsTable.createdAt));
  res.json({ campaigns: campaigns.map(c => ({ ...c, endDate: c.endDate.toISOString(), createdAt: c.createdAt.toISOString(), updatedAt: c.updatedAt.toISOString() })) });
});

export default router;
