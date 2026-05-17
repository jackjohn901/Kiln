import { Router, type IRouter } from "express";
import { db, reportsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

// Only users whose IDs are in ADMIN_USER_IDS env var can access these routes
// Format: comma-separated list of user IDs
function isAdmin(userId: string): boolean {
  const admins = (process.env["ADMIN_USER_IDS"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  // If no admins configured, allow any authenticated user (dev mode)
  if (admins.length === 0) return true;
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

export default router;
