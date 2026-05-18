import { Router } from "express";
import { db } from "@workspace/db";
import { guildsTable, guildMembersTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

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
    res.json({ guilds: guilds.map(g => ({ ...g, isJoined: joinedIds.has(g.id), createdAt: g.createdAt.toISOString() })) });
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

  res.json({ ...guild, isJoined: isMember, members: members.map(m => ({ ...m, joinedAt: m.joinedAt.toISOString() })), createdAt: guild.createdAt.toISOString() });
});

// POST /guilds — create guild
router.post("/guilds", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { name, description, technique, imageUrl, bannerUrl, isPublic, slug } = req.body;
  if (!name || !slug) { res.status(400).json({ error: "name and slug required" }); return; }
  try {
    const [guild] = await db.insert(guildsTable).values({ id: crypto.randomUUID(), name, slug, description, technique, imageUrl, bannerUrl, isPublic: isPublic !== false, createdBy: req.user.id }).returning();
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

export default router;
