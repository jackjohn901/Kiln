import { Router } from "express";
import { db, foundingArtistApplicationsTable, profilesTable } from "@workspace/db";
import { eq, count, and, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

const router = Router();

// GET /founding-artists/count — public: how many spots are filled
router.get("/founding-artists/count", async (req, res): Promise<void> => {
  try {
    const [row] = await db
      .select({ count: count() })
      .from(profilesTable)
      .where(eq(profilesTable.isFoundingArtist, true));
    res.json({ count: row?.count ?? 0, total: 100 });
  } catch (err) {
    req.log.error({ err }, "founding-artists.count error");
    res.status(500).json({ error: "Failed to fetch count" });
  }
});

// GET /founding-artists — public list of approved founding artists
router.get("/founding-artists", async (req, res): Promise<void> => {
  try {
    const artists = await db
      .select({
        userId: profilesTable.userId,
        displayName: profilesTable.displayName,
        handle: profilesTable.handle,
        medium: profilesTable.medium,
        location: profilesTable.location,
        avatarUrl: profilesTable.avatarUrl,
        foundingArtistNumber: profilesTable.foundingArtistNumber,
        followerCount: profilesTable.followerCount,
      })
      .from(profilesTable)
      .where(eq(profilesTable.isFoundingArtist, true))
      .orderBy(profilesTable.foundingArtistNumber);
    res.json({ artists });
  } catch (err) {
    req.log.error({ err }, "founding-artists.list error");
    res.status(500).json({ error: "Failed to fetch founding artists" });
  }
});

// POST /me/founding-artist/apply
router.post("/me/founding-artist/apply", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  const { medium, statement, instagram, website, portfolioUrl, yearsActive } = req.body as {
    medium?: string;
    statement?: string;
    instagram?: string;
    website?: string;
    portfolioUrl?: string;
    yearsActive?: number;
  };

  if (!medium || !statement || statement.trim().length < 50) {
    res.status(400).json({ error: "medium and a statement of at least 50 characters are required" });
    return;
  }

  try {
    // Check if already a founding artist
    const [profile] = await db.select({ isFoundingArtist: profilesTable.isFoundingArtist })
      .from(profilesTable)
      .where(eq(profilesTable.userId, req.user.id))
      .limit(1);

    if (profile?.isFoundingArtist) {
      res.status(409).json({ error: "You are already a Founding Artist" });
      return;
    }

    // Upsert application (one per user)
    const existing = await db.select({ id: foundingArtistApplicationsTable.id })
      .from(foundingArtistApplicationsTable)
      .where(eq(foundingArtistApplicationsTable.userId, req.user.id))
      .limit(1);

    if (existing.length > 0) {
      await db.update(foundingArtistApplicationsTable)
        .set({ medium, statement, instagram, website, portfolioUrl, yearsActive: yearsActive ?? null, status: "pending" })
        .where(eq(foundingArtistApplicationsTable.userId, req.user.id));
    } else {
      await db.insert(foundingArtistApplicationsTable).values({
        id: randomUUID(),
        userId: req.user.id,
        medium,
        statement,
        instagram: instagram ?? null,
        website: website ?? null,
        portfolioUrl: portfolioUrl ?? null,
        yearsActive: yearsActive ?? null,
        status: "pending",
      });
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "founding-artist.apply error");
    res.status(500).json({ error: "Failed to submit application" });
  }
});

// GET /me/founding-artist/status
router.get("/me/founding-artist/status", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const [app] = await db.select()
      .from(foundingArtistApplicationsTable)
      .where(eq(foundingArtistApplicationsTable.userId, req.user.id))
      .limit(1);

    const [profile] = await db.select({
      isFoundingArtist: profilesTable.isFoundingArtist,
      foundingArtistNumber: profilesTable.foundingArtistNumber,
    })
      .from(profilesTable)
      .where(eq(profilesTable.userId, req.user.id))
      .limit(1);

    res.json({
      isFoundingArtist: profile?.isFoundingArtist ?? false,
      foundingArtistNumber: profile?.foundingArtistNumber ?? null,
      application: app ? {
        status: app.status,
        submittedAt: app.submittedAt.toISOString(),
        reviewNote: app.reviewNote,
      } : null,
    });
  } catch (err) {
    req.log.error({ err }, "founding-artist.status error");
    res.status(500).json({ error: "Failed to fetch status" });
  }
});

// Admin: GET /admin/founding-artists?status=pending|approved|rejected
router.get("/admin/founding-artists", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const admins = (process.env["ADMIN_USER_IDS"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!admins.includes(req.user.id)) { res.status(403).json({ error: "Forbidden" }); return; }

  const status = String(req.query["status"] ?? "pending");
  try {
    const apps = await db
      .select({
        app: foundingArtistApplicationsTable,
        displayName: profilesTable.displayName,
        handle: profilesTable.handle,
        avatarUrl: profilesTable.avatarUrl,
        followerCount: profilesTable.followerCount,
      })
      .from(foundingArtistApplicationsTable)
      .leftJoin(profilesTable, eq(profilesTable.userId, foundingArtistApplicationsTable.userId))
      .where(eq(foundingArtistApplicationsTable.status, status))
      .orderBy(foundingArtistApplicationsTable.submittedAt);

    res.json({
      applications: apps.map(({ app, displayName, handle, avatarUrl, followerCount }) => ({
        ...app,
        submittedAt: app.submittedAt.toISOString(),
        reviewedAt: app.reviewedAt?.toISOString() ?? null,
        updatedAt: app.updatedAt.toISOString(),
        displayName,
        handle,
        avatarUrl,
        followerCount,
      })),
    });
  } catch (err) {
    req.log.error({ err }, "admin.founding-artists.list error");
    res.status(500).json({ error: "Failed to fetch applications" });
  }
});

// Admin: PATCH /admin/founding-artists/:userId/approve
router.patch("/admin/founding-artists/:userId/approve", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const admins = (process.env["ADMIN_USER_IDS"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!admins.includes(req.user.id)) { res.status(403).json({ error: "Forbidden" }); return; }

  const { userId } = req.params;
  const { reviewNote } = req.body as { reviewNote?: string };

  try {
    // Find next available number
    const [{ nextNum }] = await db
      .select({ nextNum: sql<number>`coalesce(max(${profilesTable.foundingArtistNumber}), 0) + 1` })
      .from(profilesTable)
      .where(eq(profilesTable.isFoundingArtist, true));

    if (nextNum > 100) {
      res.status(400).json({ error: "All 100 Founding Artist spots are filled" });
      return;
    }

    await db.update(foundingArtistApplicationsTable)
      .set({ status: "approved", reviewNote: reviewNote ?? null, reviewedAt: new Date() })
      .where(eq(foundingArtistApplicationsTable.userId, userId));

    await db.update(profilesTable)
      .set({ isFoundingArtist: true, foundingArtistNumber: nextNum, isVerified: true })
      .where(eq(profilesTable.userId, userId));

    res.json({ success: true, foundingArtistNumber: nextNum });
  } catch (err) {
    req.log.error({ err }, "admin.founding-artists.approve error");
    res.status(500).json({ error: "Failed to approve" });
  }
});

// Admin: PATCH /admin/founding-artists/:userId/reject
router.patch("/admin/founding-artists/:userId/reject", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const admins = (process.env["ADMIN_USER_IDS"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!admins.includes(req.user.id)) { res.status(403).json({ error: "Forbidden" }); return; }

  const { userId } = req.params;
  const { reviewNote } = req.body as { reviewNote?: string };

  try {
    await db.update(foundingArtistApplicationsTable)
      .set({ status: "rejected", reviewNote: reviewNote ?? null, reviewedAt: new Date() })
      .where(eq(foundingArtistApplicationsTable.userId, userId));

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "admin.founding-artists.reject error");
    res.status(500).json({ error: "Failed to reject" });
  }
});

export default router;
