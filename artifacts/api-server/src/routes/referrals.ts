import { Router } from "express";
import { db } from "@workspace/db";
import { referralCodesTable, referralUsesTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";

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
  const milestone = count >= 100 ? "evangelist" : count >= 10 ? "recruiter" : null;
  const nextMilestone = count >= 100 ? null : count >= 10
    ? { label: "Evangelist", at: 100, reward: "Revenue share + legendary badge" }
    : { label: "Recruiter", at: 10, reward: "Promotion tools + rare badge" };
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
  await db.insert(referralUsesTable).values({ id: randomUUID(), referrerId, refereeId: userId });
  await db.update(referralCodesTable).set({ useCount: rows[0].useCount + 1 }).where(eq(referralCodesTable.userId, referrerId));
  res.json({ ok: true, referrerId });
});

export default router;
