import { Router, type IRouter } from "express";
import { db, reportsTable, verificationApplicationsTable, profilesTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

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

export default router;
