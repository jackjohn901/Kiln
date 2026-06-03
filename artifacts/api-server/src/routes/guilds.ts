import { Router } from "express";
import { db } from "@workspace/db";
import { guildsTable, guildMembersTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

const DEFAULT_CHANNELS = ["General", "Show & Tell", "Help & Critique", "Buy / Sell / Trade"];
function channelsOf(g: { channels: string[] | null }): string[] {
  return g.channels?.length ? g.channels : DEFAULT_CHANNELS;
}

// GET /guilds
router.get("/guilds", async (req, res): Promise<void> => {
  try {
    const guilds = await db.select().from(guildsTable).where(eq(guildsTable.isPublic, true)).orderBy(desc(guildsTable.memberCount));
    const viewerId = req.isAuthenticated() ? req.user.id : null;
    let joinedIds = new Set<string>();
    if (viewerId) {
      const m = await db.select({ guildId: guildMembersTable.guildId }).from(guildMembersTable).where(eq(guildMembersTable.userId, viewerId));
      joinedIds = new Set(m.map(x => x.guildId));
    }
    res.json({ guilds: guilds.map(g => ({ ...g, channels: channelsOf(g), isJoined: joinedIds.has(g.id), createdAt: g.createdAt.toISOString() })) });
  } catch (err) { req.log.error({ err }, "getGuilds error"); res.status(500).json({ error: "Failed to load guilds" }); }
});

// GET /guilds/:id
router.get("/guilds/:id", async (req, res): Promise<void> => {
  const [guild] = await db.select().from(guildsTable).where(eq(guildsTable.id, req.params.id));
  if (!guild) { res.status(404).json({ error: "Not found" }); return; }

  const viewerId = req.isAuthenticated() ? req.user.id : null;

  if (!guild.isPublic) {
    if (!viewerId) { res.status(404).json({ error: "Not found" }); return; }
    const [membership] = await db.select({ userId: guildMembersTable.userId })
      .from(guildMembersTable)
      .where(and(eq(guildMembersTable.guildId, guild.id), eq(guildMembersTable.userId, viewerId)));
    if (!membership) { res.status(404).json({ error: "Not found" }); return; }
  }

  const members = await db.select().from(guildMembersTable).where(eq(guildMembersTable.guildId, guild.id));
  const isMember = viewerId ? members.some(m => m.userId === viewerId) : false;
  const myRole = viewerId ? (members.find(m => m.userId === viewerId)?.role ?? null) : null;

  res.json({ ...guild, channels: channelsOf(guild), myRole, isJoined: isMember, members: members.map(m => ({ ...m, joinedAt: m.joinedAt.toISOString() })), createdAt: guild.createdAt.toISOString() });
});

// Derive a URL-safe slug from a display name. Slugs are generated server-side so
// clients cannot drive uniqueness behaviour or supply a colliding value.
function slugifyName(name: string): string {
  return name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "guild";
}

// POST /guilds — create guild
router.post("/guilds", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { name, description, technique, imageUrl, bannerUrl, isPublic } = req.body;
  if (!name || typeof name !== "string" || !name.trim()) { res.status(400).json({ error: "name required" }); return; }
  const base = slugifyName(name);
  try {
    // The slug column is unique. Retry with a short random suffix on a unique
    // violation (Postgres 23505) so duplicate/concurrent names don't 500.
    let guild: typeof guildsTable.$inferSelect | undefined;
    for (let attempt = 0; attempt < 6; attempt++) {
      const slug = attempt === 0 ? base : `${base}-${Math.random().toString(36).slice(2, 6)}`;
      try {
        [guild] = await db.insert(guildsTable).values({ id: crypto.randomUUID(), name, slug, description, technique, imageUrl, bannerUrl, isPublic: isPublic !== false, createdBy: req.user.id }).returning();
        break;
      } catch (e) {
        if ((e as { code?: string }).code === "23505" && attempt < 5) continue;
        throw e;
      }
    }
    if (!guild) { res.status(500).json({ error: "Failed to create guild" }); return; }
    await db.insert(guildMembersTable).values({ guildId: guild.id, userId: req.user.id, role: "admin" });
    await db.update(guildsTable).set({ memberCount: 1 }).where(eq(guildsTable.id, guild.id));
    res.status(201).json({ ...guild, isJoined: true, createdAt: guild.createdAt.toISOString() });
  } catch (err) { req.log.error({ err }, "createGuild error"); res.status(500).json({ error: "Failed to create guild" }); }
});

// POST /guilds/:id/join — toggle join/leave
router.post("/guilds/:id/join", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id; const guildId = req.params.id;
  try {
    const [guild] = await db.select().from(guildsTable).where(eq(guildsTable.id, guildId));
    if (!guild) { res.status(404).json({ error: "Guild not found" }); return; }

    const [existing] = await db.select().from(guildMembersTable).where(and(eq(guildMembersTable.guildId, guildId), eq(guildMembersTable.userId, userId)));

    if (existing) {
      await db.delete(guildMembersTable).where(and(eq(guildMembersTable.guildId, guildId), eq(guildMembersTable.userId, userId)));
      await db.update(guildsTable).set({ memberCount: sql`GREATEST(${guildsTable.memberCount} - 1, 0)` }).where(eq(guildsTable.id, guildId));
      res.json({ joined: false }); return;
    }

    if (!guild.isPublic) {
      res.status(403).json({ error: "This guild is private and not open to new members" });
      return;
    }

    await db.insert(guildMembersTable).values({ guildId, userId, role: "member" });
    await db.update(guildsTable).set({ memberCount: sql`${guildsTable.memberCount} + 1` }).where(eq(guildsTable.id, guildId));
    res.json({ joined: true });
  } catch (err) { req.log.error({ err }, "joinGuild error"); res.status(500).json({ error: "Failed to toggle guild membership" }); }
});

// Returns true if the caller is the guild founder/creator or has the "admin" membership role.
async function isGuildAdmin(guild: typeof guildsTable.$inferSelect, userId: string): Promise<boolean> {
  if (guild.createdBy === userId) return true;
  const [m] = await db.select({ role: guildMembersTable.role })
    .from(guildMembersTable)
    .where(and(eq(guildMembersTable.guildId, guild.id), eq(guildMembersTable.userId, userId)));
  return m?.role === "admin";
}

// POST /guilds/:id/channels — founder/admin updates the guild's channel list
router.post("/guilds/:id/channels", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const [guild] = await db.select().from(guildsTable).where(eq(guildsTable.id, req.params.id));
    if (!guild) { res.status(404).json({ error: "Guild not found" }); return; }
    if (!(await isGuildAdmin(guild, req.user.id))) { res.status(403).json({ error: "Forbidden" }); return; }

    const raw = (req.body as { channels?: unknown }).channels;
    if (!Array.isArray(raw)) { res.status(400).json({ error: "channels must be an array" }); return; }

    const seen = new Set<string>();
    const cleaned: string[] = [];
    for (const c of raw) {
      if (typeof c !== "string") continue;
      const trimmed = c.trim();
      if (!trimmed || trimmed.length > 30) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      cleaned.push(trimmed);
    }

    if (cleaned.length === 0) { res.status(400).json({ error: "At least one valid channel is required" }); return; }
    if (!cleaned.some((c) => c.toLowerCase() === "general")) cleaned.unshift("General");
    if (cleaned.length > 12) { res.status(400).json({ error: "Maximum 12 channels" }); return; }

    await db.update(guildsTable).set({ channels: cleaned }).where(eq(guildsTable.id, guild.id));
    res.json({ channels: cleaned });
  } catch (err) { req.log.error({ err }, "updateChannels error"); res.status(500).json({ error: "Failed to update channels" }); }
});

// POST /guilds/:id/members/:userId/role — founder/admin sets a member's role
router.post("/guilds/:id/members/:userId/role", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const guildId = req.params.id;
    const targetUserId = req.params.userId;
    const [guild] = await db.select().from(guildsTable).where(eq(guildsTable.id, guildId));
    if (!guild) { res.status(404).json({ error: "Guild not found" }); return; }
    if (!(await isGuildAdmin(guild, req.user.id))) { res.status(403).json({ error: "Forbidden" }); return; }

    const role = (req.body as { role?: unknown }).role;
    if (role !== "moderator" && role !== "member") { res.status(400).json({ error: "Invalid role" }); return; }

    if (targetUserId === guild.createdBy) { res.status(400).json({ error: "Cannot change the founder's role" }); return; }
    if (targetUserId === req.user.id) { res.status(400).json({ error: "Cannot change your own role" }); return; }

    const [member] = await db.select().from(guildMembersTable)
      .where(and(eq(guildMembersTable.guildId, guildId), eq(guildMembersTable.userId, targetUserId)));
    if (!member) { res.status(404).json({ error: "Member not found" }); return; }

    await db.update(guildMembersTable).set({ role })
      .where(and(eq(guildMembersTable.guildId, guildId), eq(guildMembersTable.userId, targetUserId)));
    res.json({ ok: true, userId: targetUserId, role });
  } catch (err) { req.log.error({ err }, "setMemberRole error"); res.status(500).json({ error: "Failed to update member role" }); }
});

export default router;
