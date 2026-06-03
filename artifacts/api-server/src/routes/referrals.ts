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

// Network (multi-level) badge tiers, based on the TOTAL downline size:
// people you invited + everyone they invite, all the way down the chain.
const NETWORK_TIERS = [
  { at: 5, badge: "network_5", label: "Community Builder", icon: "🌱" },
  { at: 25, badge: "network_25", label: "Network Weaver", icon: "🕸️" },
  { at: 100, badge: "network_100", label: "Kiln Catalyst", icon: "⚡" },
  { at: 500, badge: "network_500", label: "Movement Maker", icon: "🌍" },
];

async function awardNetworkBadges(userId: string, networkCount: number): Promise<void> {
  for (const tier of NETWORK_TIERS) {
    if (networkCount >= tier.at) await awardBadge(userId, tier.badge);
  }
}

// Total downline size for a user — everyone beneath them in the invite tree.
async function getNetworkCount(userId: string): Promise<number> {
  const result = await db.execute(sql`
    WITH RECURSIVE downline AS (
      SELECT referee_id, 1 AS depth FROM referral_uses WHERE referrer_id = ${userId}
      UNION ALL
      SELECT ru.referee_id, d.depth + 1 FROM referral_uses ru
      JOIN downline d ON ru.referrer_id = d.referee_id
      WHERE d.depth < 50
    )
    SELECT count(DISTINCT referee_id)::int AS network FROM downline
  `);
  return Number((result.rows[0] as { network: number } | undefined)?.network ?? 0);
}

// All users above a given user in the chain (their referrer, that referrer's
// referrer, and so on). The depth guard prevents runaway loops if data is bad.
async function getAncestors(userId: string): Promise<string[]> {
  const result = await db.execute(sql`
    WITH RECURSIVE ancestors AS (
      SELECT referrer_id, referee_id, 1 AS depth FROM referral_uses WHERE referee_id = ${userId}
      UNION ALL
      SELECT ru.referrer_id, ru.referee_id, a.depth + 1 FROM referral_uses ru
      JOIN ancestors a ON ru.referee_id = a.referrer_id
      WHERE a.depth < 50
    )
    SELECT DISTINCT referrer_id FROM ancestors
  `);
  return (result.rows as Array<{ referrer_id: string }>).map((r) => r.referrer_id);
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
  // Cycle guard: if this user is already an ancestor of the code's owner, linking
  // them would create a loop (A→B then B→A), which would corrupt every network
  // count and badge calculation downstream. Reject it.
  const referrerAncestors = await getAncestors(referrerId);
  if (referrerAncestors.includes(userId)) {
    res.status(400).json({ error: "That person is already in your network — using their code would create a loop" });
    return;
  }
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
  // Multi-level: this new member just grew the network of EVERYONE above them
  // in the chain (the referrer, their referrer, and so on). Re-check each
  // ancestor's network-tier badges. awardBadge/awardNetworkBadges are idempotent.
  try {
    const ancestors = await getAncestors(userId);
    for (const ancestorId of ancestors) {
      const net = await getNetworkCount(ancestorId);
      await awardNetworkBadges(ancestorId, net);
    }
  } catch (err) {
    req.log.error({ err, refereeId: userId }, "failed to award network badges");
  }
  res.json({ ok: true, referrerId });
});

// The signed-in user's invite network (their downline): totals, a per-level
// breakdown for the pyramid view, the people they directly invited (with how
// many each of THOSE has invited), and network-tier status.
router.get("/me/network", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;

  const levelsResult = await db.execute(sql`
    WITH RECURSIVE downline AS (
      SELECT referee_id, 1 AS level FROM referral_uses WHERE referrer_id = ${userId}
      UNION ALL
      SELECT ru.referee_id, d.level + 1 FROM referral_uses ru
      JOIN downline d ON ru.referrer_id = d.referee_id
      WHERE d.level < 50
    )
    SELECT level, count(DISTINCT referee_id)::int AS count
    FROM downline GROUP BY level ORDER BY level
  `);
  const levels = (levelsResult.rows as Array<{ level: number; count: number }>).map((r) => ({
    level: Number(r.level),
    count: Number(r.count),
  }));
  // Canonical total via COUNT(DISTINCT) over the whole downline (not a sum of
  // per-level counts), so the number is robust even if data is unexpected.
  const networkCount = await getNetworkCount(userId);
  const directCount = levels.find((l) => l.level === 1)?.count ?? 0;
  const depth = levels.length;

  // Safety net: ensure the viewer holds every network badge their size earns,
  // even if a past award was missed. Idempotent.
  try {
    await awardNetworkBadges(userId, networkCount);
  } catch (err) {
    req.log.error({ err, userId }, "failed to award network badges on view");
  }

  const membersResult = await db.execute(sql`
    SELECT ru.referee_id AS id,
           p.display_name AS name,
           p.handle AS handle,
           p.avatar_url AS avatar,
           (SELECT count(*)::int FROM referral_uses sub WHERE sub.referrer_id = ru.referee_id) AS invited
    FROM referral_uses ru
    LEFT JOIN profiles p ON p.user_id = ru.referee_id
    WHERE ru.referrer_id = ${userId}
    ORDER BY ru.created_at DESC
    LIMIT 50
  `);
  const members = (membersResult.rows as Array<{
    id: string; name: string | null; handle: string | null; avatar: string | null; invited: number;
  }>).map((r) => ({
    id: r.id,
    name: r.name ?? "New member",
    handle: r.handle ?? null,
    avatar: r.avatar ?? null,
    invited: Number(r.invited ?? 0),
  }));

  const tiers = NETWORK_TIERS.map((t) => ({
    at: t.at, badge: t.badge, label: t.label, icon: t.icon, unlocked: networkCount >= t.at,
  }));
  const nextTier = NETWORK_TIERS.find((t) => networkCount < t.at) ?? null;

  res.json({ directCount, networkCount, depth, levels, members, tiers, nextTier });
});

export default router;
