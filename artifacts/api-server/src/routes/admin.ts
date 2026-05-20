import { Router, type IRouter } from "express";
import {
  db, reportsTable, verificationApplicationsTable, profilesTable,
  postsTable, followsTable, likesTable, ordersTable,
  commissionsTable, workshopsTable, workshopBookingsTable,
} from "@workspace/db";
import { eq, desc, sql, gte, count } from "drizzle-orm";

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

export default router;
