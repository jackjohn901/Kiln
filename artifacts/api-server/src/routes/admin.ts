import { Router, type IRouter } from "express";
import {
  db, reportsTable, verificationApplicationsTable, profilesTable,
  postsTable, followsTable, likesTable, ordersTable,
  commissionsTable, workshopsTable, workshopBookingsTable, usersTable,
  notificationsTable,
} from "@workspace/db";
import { eq, desc, sql, gte, count, and, isNull } from "drizzle-orm";
import { openai } from "@workspace/integrations-openai-ai-server";
import { getSeedStatus, forceSeedDatabase, forceSeedDatabaseWithMarker, getSeedHistory } from "../lib/seed";
import { sendEmail, broadcastEmail } from "../lib/email";
import { randomUUID } from "crypto";

const router: IRouter = Router();

// Only users whose IDs are in ADMIN_USER_IDS env var can access these routes
// Format: comma-separated list of user IDs
// If ADMIN_USER_IDS is absent or empty, all admin routes are denied (fail-closed).
function isAdmin(userId: string): boolean {
  const admins = (process.env["ADMIN_USER_IDS"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (admins.length === 0) return false;
  return admins.includes(userId);
}

// GET /admin/reports?status=pending|reviewed|actioned|dismissed
router.get("/admin/reports", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!isAdmin(req.user.id)) { res.status(403).json({ error: "Forbidden" }); return; }

  const status = String(req.query["status"] ?? "pending");
  const limit = Math.min(Number(req.query["limit"] ?? 50), 200);

  try {
    const reports = await db.select()
      .from(reportsTable)
      .where(eq(reportsTable.status, status))
      .orderBy(desc(reportsTable.createdAt))
      .limit(limit);

    res.json({
      reports: reports.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() })),
    });
  } catch (err) {
    req.log.error({ err }, "admin.getReports error");
    res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// PATCH /admin/reports/:id
router.patch("/admin/reports/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!isAdmin(req.user.id)) { res.status(403).json({ error: "Forbidden" }); return; }

  const { id } = req.params;
  const { status } = req.body as { status?: string };
  const validStatuses = ["pending", "reviewed", "actioned", "dismissed"];
  if (!status || !validStatuses.includes(status)) {
    res.status(400).json({ error: "status must be one of: " + validStatuses.join(", ") });
    return;
  }

  try {
    const [updated] = await db.update(reportsTable)
      .set({ status })
      .where(eq(reportsTable.id, id))
      .returning();

    if (!updated) { res.status(404).json({ error: "Report not found" }); return; }
    res.json({ report: { ...updated, createdAt: updated.createdAt.toISOString() } });
  } catch (err) {
    req.log.error({ err }, "admin.updateReport error");
    res.status(500).json({ error: "Failed to update report" });
  }
});

// GET /admin/verifications?status=pending|approved|rejected
router.get("/admin/verifications", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!isAdmin(req.user.id)) { res.status(403).json({ error: "Forbidden" }); return; }

  const status = String(req.query["status"] ?? "pending");
  const limit = Math.min(Number(req.query["limit"] ?? 50), 200);

  try {
    const applications = await db.select()
      .from(verificationApplicationsTable)
      .where(eq(verificationApplicationsTable.status, status))
      .orderBy(desc(verificationApplicationsTable.submittedAt))
      .limit(limit);

    res.json({
      applications: applications.map((a) => ({
        ...a,
        submittedAt: a.submittedAt.toISOString(),
        updatedAt: a.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    req.log.error({ err }, "admin.getVerifications error");
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

// PATCH /admin/verifications/:id/approve
router.patch("/admin/verifications/:id/approve", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!isAdmin(req.user.id)) { res.status(403).json({ error: "Forbidden" }); return; }

  try {
    const [app] = await db.update(verificationApplicationsTable)
      .set({ status: "approved" })
      .where(eq(verificationApplicationsTable.id, req.params.id))
      .returning();

    if (!app) { res.status(404).json({ error: "Application not found" }); return; }

    await db.update(profilesTable)
      .set({ isVerified: true })
      .where(eq(profilesTable.userId, app.userId));

    res.json({ success: true, userId: app.userId });
  } catch (err) {
    req.log.error({ err }, "admin.approveVerification error");
    res.status(500).json({ error: "Failed to approve" });
  }
});

// PATCH /admin/verifications/:id/reject
router.patch("/admin/verifications/:id/reject", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!isAdmin(req.user.id)) { res.status(403).json({ error: "Forbidden" }); return; }

  try {
    const [app] = await db.update(verificationApplicationsTable)
      .set({ status: "rejected" })
      .where(eq(verificationApplicationsTable.id, req.params.id))
      .returning();

    if (!app) { res.status(404).json({ error: "Application not found" }); return; }

    await db.update(profilesTable)
      .set({ isVerified: false })
      .where(eq(profilesTable.userId, app.userId));

    res.json({ success: true, userId: app.userId });
  } catch (err) {
    req.log.error({ err }, "admin.rejectVerification error");
    res.status(500).json({ error: "Failed to reject" });
  }
});

// POST /api/admin/platform-insights — AI analysis of platform stats, owner-only
router.post("/admin/platform-insights", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!isCreator(req.user.id)) { res.status(403).json({ error: "Forbidden" }); return; }

  const stats = req.body as Record<string, unknown>;

  try {
    const prompt = `You are an expert growth advisor for Kiln, a craft artist creator platform (like TikTok/Instagram for ceramics, glasswork, weaving, woodwork, metalwork, and pottery).

Here is the current platform analytics data:
${JSON.stringify(stats, null, 2)}

Analyze this data and return exactly 6 actionable insights as a JSON array. Each insight must have:
- "priority": "high" | "medium" | "low"
- "category": one of "growth", "engagement", "content", "commerce", "retention", "feature"
- "title": short title (max 8 words)
- "insight": one clear sentence describing what the data shows
- "action": one specific action the platform owner should take this week
- "impact": one sentence on expected outcome

Focus on what's working, what needs attention, and concrete next steps for both the web platform and mobile app. Be specific — reference the actual numbers from the data. Return ONLY valid JSON, no markdown, no explanation.`;

    const response = await openai.chat.completions.create({
      model: "gpt-5.4",
      max_completion_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.choices[0]?.message?.content ?? "[]";
    let insights: unknown;
    try {
      insights = JSON.parse(raw);
    } catch {
      insights = [];
    }

    res.json({ insights, generatedAt: new Date().toISOString() });
  } catch (err) {
    req.log.error({ err }, "admin.platformInsights error");
    res.status(500).json({ error: "Failed to generate insights" });
  }
});

// GET /api/admin/platform-stats — owner-only platform-wide analytics
// Gated by CREATOR_USER_ID env var (only the platform owner can access this)
function isCreator(userId: string): boolean {
  const creatorId = (process.env["CREATOR_USER_ID"] ?? "").trim();
  return creatorId.length > 0 && userId === creatorId;
}

router.get("/admin/platform-stats", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!isCreator(req.user.id)) { res.status(403).json({ error: "Forbidden" }); return; }

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfToday); startOfWeek.setDate(startOfToday.getDate() - 7);
  const startOfMonth = new Date(startOfToday); startOfMonth.setDate(startOfToday.getDate() - 30);
  const startOf90Days = new Date(startOfToday); startOf90Days.setDate(startOfToday.getDate() - 90);

  try {
    const [
      totalUsersRows,
      newTodayRows,
      newThisWeekRows,
      newThisMonthRows,
      totalPostsRows,
      postsThisWeekRows,
      totalLikesRows,
      totalFollowsRows,
      totalOrdersRows,
      totalCommissionsRows,
      totalWorkshopBookingsRows,
      trendingPostsRows,
      topArtistsRows,
      newUsersByDayRows,
      newPostsByDayRows,
    ] = await Promise.all([
      // Total users
      db.select({ count: sql<number>`count(*)::int` }).from(profilesTable),
      // New users today
      db.select({ count: sql<number>`count(*)::int` }).from(profilesTable)
        .where(gte(profilesTable.createdAt, startOfToday)),
      // New users this week
      db.select({ count: sql<number>`count(*)::int` }).from(profilesTable)
        .where(gte(profilesTable.createdAt, startOfWeek)),
      // New users this month
      db.select({ count: sql<number>`count(*)::int` }).from(profilesTable)
        .where(gte(profilesTable.createdAt, startOfMonth)),
      // Total posts
      db.select({ count: sql<number>`count(*)::int` }).from(postsTable)
        .where(eq(postsTable.isDraft, false)),
      // Posts this week
      db.select({ count: sql<number>`count(*)::int` }).from(postsTable)
        .where(sql`${postsTable.isDraft} = false AND ${postsTable.createdAt} >= ${startOfWeek}`),
      // Total likes
      db.select({ count: sql<number>`count(*)::int` }).from(likesTable),
      // Total follows
      db.select({ count: sql<number>`count(*)::int` }).from(followsTable),
      // Total orders
      db.select({ count: sql<number>`count(*)::int` }).from(ordersTable),
      // Total commissions
      db.select({ count: sql<number>`count(*)::int` }).from(commissionsTable),
      // Total workshop bookings
      db.select({ count: sql<number>`count(*)::int` }).from(workshopBookingsTable),
      // Trending posts (most liked in last 7 days)
      db.select({
        id: postsTable.id,
        caption: postsTable.caption,
        thumbnailUrl: postsTable.thumbnailUrl,
        likeCount: postsTable.likeCount,
        commentCount: postsTable.commentCount,
        viewCount: postsTable.viewCount,
        authorId: postsTable.authorId,
        createdAt: postsTable.createdAt,
      }).from(postsTable)
        .where(sql`${postsTable.isDraft} = false AND ${postsTable.createdAt} >= ${startOfWeek}`)
        .orderBy(desc(postsTable.likeCount))
        .limit(10),
      // Top artists by follower count
      db.select({
        userId: profilesTable.userId,
        displayName: profilesTable.displayName,
        avatarUrl: profilesTable.avatarUrl,
        followerCount: profilesTable.followerCount,
        location: profilesTable.location,
      }).from(profilesTable)
        .orderBy(desc(profilesTable.followerCount))
        .limit(10),
      // New users per day for last 90 days
      db.select({
        day: sql<string>`to_char(${profilesTable.createdAt}, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      }).from(profilesTable)
        .where(gte(profilesTable.createdAt, startOf90Days))
        .groupBy(sql`to_char(${profilesTable.createdAt}, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(${profilesTable.createdAt}, 'YYYY-MM-DD')`),
      // New posts per day for last 90 days
      db.select({
        day: sql<string>`to_char(${postsTable.createdAt}, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      }).from(postsTable)
        .where(sql`${postsTable.isDraft} = false AND ${postsTable.createdAt} >= ${startOf90Days}`)
        .groupBy(sql`to_char(${postsTable.createdAt}, 'YYYY-MM-DD')`)
        .orderBy(sql`to_char(${postsTable.createdAt}, 'YYYY-MM-DD')`),
    ]);

    // Build day maps for charts
    const usersByDay: Record<string, number> = {};
    for (const row of newUsersByDayRows) usersByDay[row.day] = row.count;

    const postsByDay: Record<string, number> = {};
    for (const row of newPostsByDayRows) postsByDay[row.day] = row.count;

    res.json({
      asOf: now.toISOString(),
      totals: {
        users: totalUsersRows[0]?.count ?? 0,
        newUsersToday: newTodayRows[0]?.count ?? 0,
        newUsersThisWeek: newThisWeekRows[0]?.count ?? 0,
        newUsersThisMonth: newThisMonthRows[0]?.count ?? 0,
        posts: totalPostsRows[0]?.count ?? 0,
        postsThisWeek: postsThisWeekRows[0]?.count ?? 0,
        likes: totalLikesRows[0]?.count ?? 0,
        follows: totalFollowsRows[0]?.count ?? 0,
        orders: totalOrdersRows[0]?.count ?? 0,
        commissions: totalCommissionsRows[0]?.count ?? 0,
        workshopBookings: totalWorkshopBookingsRows[0]?.count ?? 0,
      },
      trendingPosts: trendingPostsRows.map((p) => ({
        ...p,
        createdAt: p.createdAt.toISOString(),
      })),
      topArtists: topArtistsRows,
      charts: { usersByDay, postsByDay },
    });
  } catch (err) {
    req.log.error({ err }, "admin.platformStats error");
    res.status(500).json({ error: "Failed to load platform stats" });
  }
});

// POST /admin/backfill-order-notes
// One-time migration: stamp orphaned manual-payout order rows with the Stripe
// session key from the "first" order in the same bulk checkout. Orders created
// before the grouping fix only stored the dedupeKey on the first row; subsequent
// items in the cart had notes = null, so they didn't appear grouped on receipts.
//
// Safety: pass ?dry_run=true to preview affected rows without writing anything.
//
// Matching criteria for orphans:
//   - same buyer_id as the anchor
//   - manual_payout = true
//   - notes IS NULL
//   - created_at within 30 seconds of the anchor's created_at
router.post("/admin/backfill-order-notes", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!isAdmin(req.user.id)) { res.status(403).json({ error: "Forbidden" }); return; }

  const dryRun = req.query["dry_run"] === "true";

  try {
    // Find all anchor orders that already carry a Stripe session dedupeKey.
    const anchors = await db
      .select({
        id: ordersTable.id,
        buyerId: ordersTable.buyerId,
        notes: ordersTable.notes,
        createdAt: ordersTable.createdAt,
      })
      .from(ordersTable)
      .where(
        and(
          eq(ordersTable.manualPayout, true),
          sql`${ordersTable.notes} LIKE 'stripe:%'`
        )
      );

    const backfilledIds: string[] = [];

    for (const anchor of anchors) {
      if (!anchor.notes) continue;

      // Find sibling orders that are missing the session key.
      const orphans = await db
        .select({ id: ordersTable.id })
        .from(ordersTable)
        .where(
          and(
            eq(ordersTable.buyerId, anchor.buyerId),
            eq(ordersTable.manualPayout, true),
            isNull(ordersTable.notes),
            sql`${ordersTable.createdAt} BETWEEN
              ${anchor.createdAt}::timestamptz - INTERVAL '30 seconds'
              AND
              ${anchor.createdAt}::timestamptz + INTERVAL '30 seconds'`
          )
        );

      for (const orphan of orphans) {
        backfilledIds.push(orphan.id);
        if (!dryRun) {
          await db
            .update(ordersTable)
            .set({ notes: anchor.notes })
            .where(eq(ordersTable.id, orphan.id));
        }
      }
    }

    res.json({
      dryRun,
      backfilled: backfilledIds.length,
      orderIds: backfilledIds,
    });
  } catch (err) {
    req.log.error({ err }, "admin.backfillOrderNotes error");
    res.status(500).json({ error: "Failed to backfill order notes" });
  }
});

// Resolve a display name for the acting admin so seed history rows are readable.
async function getSeedActor(userId: string): Promise<{ id: string; name: string | null }> {
  try {
    const [profile] = await db
      .select({ displayName: profilesTable.displayName })
      .from(profilesTable)
      .where(eq(profilesTable.userId, userId))
      .limit(1);
    return { id: userId, name: profile?.displayName ?? null };
  } catch {
    return { id: userId, name: null };
  }
}

// GET /admin/seed-history — recent seed/reseed runs for the maintenance audit log
router.get("/admin/seed-history", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!isAdmin(req.user.id)) { res.status(403).json({ error: "Forbidden" }); return; }

  const limit = Math.min(Number(req.query["limit"] ?? 20), 100);

  try {
    const history = await getSeedHistory(limit);
    res.json({ history });
  } catch (err) {
    req.log.error({ err }, "admin.seedHistory error");
    res.status(500).json({ error: "Failed to fetch seed history" });
  }
});

// POST /admin/reseed-with-marker — re-seed and write a new marker ID
router.post("/admin/reseed-with-marker", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!isAdmin(req.user.id)) { res.status(403).json({ error: "Forbidden" }); return; }

  const { newMarkerId } = req.body as { newMarkerId?: string };
  if (!newMarkerId || typeof newMarkerId !== "string" || !newMarkerId.trim()) {
    res.status(400).json({ error: "newMarkerId is required" });
    return;
  }

  try {
    const actor = await getSeedActor(req.user.id);
    const result = await forceSeedDatabaseWithMarker(newMarkerId.trim(), actor, "advance-marker");
    req.log.info({ result }, "admin.reseedWithMarker: completed");
    res.json(result);
  } catch (err) {
    req.log.error({ err }, "admin.reseedWithMarker error");
    res.status(500).json({ error: "Reseed with new marker failed" });
  }
});

// POST /admin/reseed — re-run database seed (dry-run preview or force)
router.post("/admin/reseed", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!isAdmin(req.user.id)) { res.status(403).json({ error: "Forbidden" }); return; }

  const dryRun = req.query["dry_run"] === "true";

  try {
    if (dryRun) {
      const status = await getSeedStatus();
      res.json({ dryRun: true, ...status });
      return;
    }

    const actor = await getSeedActor(req.user.id);
    const result = await forceSeedDatabase(actor);
    req.log.info({ result }, "admin.reseed: forced reseed completed");
    res.json({ dryRun: false, ...result });
  } catch (err) {
    req.log.error({ err }, "admin.reseed error");
    res.status(500).json({ error: "Reseed failed" });
  }
});

// POST /admin/test-notification — send a test notification to the calling admin
router.post("/admin/test-notification", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!isAdmin(req.user.id)) { res.status(403).json({ error: "Forbidden" }); return; }

  const dryRun = req.query["dry_run"] === "true";

  const preview = {
    type: "system",
    text: "Test notification — the notification pipeline is working correctly.",
    link: "/kiln/notifications",
  };

  if (dryRun) {
    res.json({ dryRun: true, preview });
    return;
  }

  try {
    await db.insert(notificationsTable).values({
      id: randomUUID(),
      userId: req.user.id,
      type: preview.type,
      text: preview.text,
      link: preview.link,
      read: false,
    });
    res.json({ dryRun: false, sent: true });
  } catch (err) {
    req.log.error({ err }, "admin.testNotification error");
    res.status(500).json({ error: "Failed to send test notification" });
  }
});

// POST /admin/broadcast-email — email every user (admin-only)
// Body: { subject: string, message: string }. Use ?dry_run=true to preview the recipient count.
router.post("/admin/broadcast-email", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!isAdmin(req.user.id)) { res.status(403).json({ error: "Forbidden" }); return; }

  const dryRun = req.query["dry_run"] === "true";
  const { subject, message } = req.body as { subject?: string; message?: string };

  const trimmedSubject = (subject ?? "").replace(/[\r\n]+/g, " ").trim();
  const trimmedMessage = (message ?? "").trim();
  if (!trimmedSubject || !trimmedMessage) {
    res.status(400).json({ error: "Both a subject and a message are required." });
    return;
  }
  if (trimmedSubject.length > 200) {
    res.status(400).json({ error: "Subject must be 200 characters or fewer." });
    return;
  }
  if (trimmedMessage.length > 10_000) {
    res.status(400).json({ error: "Message must be 10,000 characters or fewer." });
    return;
  }

  try {
    // Gather every distinct contactable address: prefer the profile contact email,
    // fall back to the account email. De-duplicate case-insensitively.
    const rows = await db
      .select({ accountEmail: usersTable.email, contactEmail: profilesTable.contactEmail })
      .from(usersTable)
      .leftJoin(profilesTable, eq(profilesTable.userId, usersTable.id));

    const recipients = new Map<string, string>();
    for (const row of rows) {
      const contact = (row.contactEmail ?? "").trim();
      const account = (row.accountEmail ?? "").trim();
      const addr = contact || account;
      if (!addr || !addr.includes("@")) continue;
      const key = addr.toLowerCase();
      if (!recipients.has(key)) recipients.set(key, addr);
    }
    const addresses = [...recipients.values()];

    if (dryRun) {
      res.json({ dryRun: true, recipientCount: addresses.length });
      return;
    }

    const html = broadcastEmail(trimmedMessage);

    // Send in small concurrent batches so a large user base doesn't open
    // hundreds of simultaneous connections to the email provider.
    let sent = 0;
    let failed = 0;
    const BATCH_SIZE = 20;
    for (let i = 0; i < addresses.length; i += BATCH_SIZE) {
      const batch = addresses.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map((to) => sendEmail({ to, subject: trimmedSubject, html })),
      );
      for (const ok of results) {
        if (ok) sent++; else failed++;
      }
    }

    req.log.info({ adminId: req.user.id, recipientCount: addresses.length, sent, failed }, "admin.broadcastEmail sent");
    res.json({ dryRun: false, recipientCount: addresses.length, sent, failed });
  } catch (err) {
    req.log.error({ err }, "admin.broadcastEmail error");
    res.status(500).json({ error: "Failed to send broadcast email" });
  }
});

// GET /admin/health — DB connectivity, API uptime, and seed marker status
router.get("/admin/health", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!isAdmin(req.user.id)) { res.status(403).json({ error: "Forbidden" }); return; }

  const uptimeSeconds = Math.floor(process.uptime());

  // DB connectivity check — run a trivial query and measure round-trip latency
  let dbOk = false;
  let dbLatencyMs: number | null = null;
  let dbError: string | null = null;
  try {
    const t0 = Date.now();
    await db.execute(sql`SELECT 1`);
    dbLatencyMs = Date.now() - t0;
    dbOk = true;
  } catch (err) {
    dbError = err instanceof Error ? err.message : "Unknown DB error";
  }

  // Seed marker status
  let seedMarkerPresent = false;
  let seedMarkerUserId: string | null = null;
  let seedCodeMarkerId: string | null = null;
  try {
    const status = await getSeedStatus();
    seedMarkerPresent = status.markerPresent;
    seedMarkerUserId = status.markerUserId;
    seedCodeMarkerId = status.codeMarkerId;
  } catch {
    // non-fatal
  }

  res.json({
    db: { ok: dbOk, latencyMs: dbLatencyMs, error: dbError },
    api: { uptimeSeconds },
    seed: { markerPresent: seedMarkerPresent, markerUserId: seedMarkerUserId, codeMarkerId: seedCodeMarkerId },
    checkedAt: new Date().toISOString(),
  });
});

// PATCH /admin/users/:id/feature  — grant Featured on Kiln status
router.patch("/admin/users/:id/feature", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!isAdmin(req.user.id)) { res.status(403).json({ error: "Forbidden" }); return; }
  const { featured } = req.body as { featured?: boolean };
  const value = featured !== false;
  await db.update(usersTable).set({ isFeatured: value }).where(eq(usersTable.id, req.params.id));
  res.json({ ok: true, isFeatured: value });
});

// GET /admin/users/featured — list all featured users
router.get("/admin/users/featured", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  if (!isAdmin(req.user.id)) { res.status(403).json({ error: "Forbidden" }); return; }
  const rows = await db.select({ id: usersTable.id, firstName: usersTable.firstName, lastName: usersTable.lastName, email: usersTable.email })
    .from(usersTable).where(eq(usersTable.isFeatured, true));
  res.json({ users: rows });
});

export default router;
