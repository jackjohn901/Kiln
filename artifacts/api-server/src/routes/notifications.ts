import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/notifications", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const notifications = await db.select().from(notificationsTable)
      .where(eq(notificationsTable.userId, req.user.id))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);
    res.json({ notifications: notifications.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })) });
  } catch (err) {
    req.log.error({ err }, "getNotifications error");
    res.status(500).json({ error: "Failed to load notifications" });
  }
});

router.post("/notifications/read-all", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    await db.update(notificationsTable)
      .set({ read: true })
      .where(eq(notificationsTable.userId, req.user.id));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "markAllRead error");
    res.status(500).json({ error: "Failed to mark read" });
  }
});

export default router;
