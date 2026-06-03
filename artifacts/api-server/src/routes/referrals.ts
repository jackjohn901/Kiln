import { Router } from "express";
import { db } from "@workspace/db";
import { referralCodesTable, referralUsesTable } from "@workspace/db/schema";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { awardBadge } from "./badges";

const router = Router();

function generateCode(userId: string): string {
  const base = userId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 6).toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `${base}${suffix}`;
}

async function getOrCreateCode(userId: string): Promise<string> {
  const rows = await db.select().from(referralCodesTable).where(eq(referralCodesTable.userId, userId)).limit(1);
  if (rows.length > 0) return rows[0].code;
  const code = generateCode(userId);
  await db.insert(referralCodesTable).values({ userId, code, useCount: 0 });
  return code;
}

router.get("/me/referral", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  const code = await getOrCreateCode(userId);
  const uses = await db.select().from(referralUsesTable).where(eq(referralUsesTable.referrerId, userId));
  const count = uses.length;
  const milestone = count >= 100 ? "evangelist" : count >= 10 ? "recruiter" : count >= 1 ? "early_adopter" : null;
  const nextMilestone = count >= 100 ? null
    : count >= 10 ? { label: "Evangelist", at: 100, reward: "Revenue share + legendary badge" }
    : count >= 1 ? { label: "Recruiter", at: 10, reward: "Promotion tools + rare badge" }
    : { label: "First Invite", at: 1, reward: "Early Adopter badge" };
  res.json({ code, useCount: count, milestone, nextMilestone });
});

router.post("/referrals/use", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  const { code } = req.body as { code: string };
  if (!code) { res.status(400).json({ error: "code required" }); return; }
  const rows = await db.select().from(referralCodesTable).where(eq(referralCodesTable.code, code.toUpperCase())).limit(1);
  if (rows.length === 0) { res.status(404).json({ error: "Invalid code" }); return; }
  const referrerId = rows[0].userId;
  if (referrerId === userId) { res.status(400).json({ error: "Cannot use your own code" }); return; }
  const existing = await db.select().from(referralUsesTable).where(eq(referralUsesTable.refereeId, userId)).limit(1);
  if (existing.length > 0) { res.status(409).json({ error: "Already used a referral code" }); return; }
  // Insert the credit. The unique constraint on referee_id is the real guard
  // against concurrent double-redemption — onConflictDoNothing makes the race
  // a no-op rather than a duplicate credit.
  const inserted = await db
    .insert(referralUsesTable)
    .values({ id: randomUUID(), referrerId, refereeId: userId })
    .onConflictDoNothing()
    .returning({ id: referralUsesTable.id });
  if (inserted.length === 0) { res.status(409).json({ error: "Already used a referral code" }); return; }
  // Count authoritatively from referral_uses (the source of truth) rather than
  // trusting the cached useCount, which can lag under concurrent redemptions.
  const [{ count: newCount }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(referralUsesTable)
    .where(eq(referralUsesTable.referrerId, referrerId));
  await db.update(referralCodesTable).set({ useCount: newCount }).where(eq(referralCodesTable.userId, referrerId));
  // Award the referrer their milestone badge(s). awardBadge is idempotent, so
  // catch-up badges are granted even if an earlier threshold was missed.
  try {
    await awardBadge(referrerId, "referral_1");
    if (newCount >= 10) await awardBadge(referrerId, "referral_10");
    if (newCount >= 100) await awardBadge(referrerId, "referral_100");
  } catch (err) {
    req.log.error({ err, referrerId }, "failed to award referral badge");
  }
  res.json({ ok: true, referrerId });
});

export default router;
