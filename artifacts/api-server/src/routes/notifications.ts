import { Router } from "express";
import { db, notificationsTable } from "@workspace/db";
import { eq, desc, and, or } from "drizzle-orm";

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

router.patch("/notifications/dismiss-missed", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    await db.update(notificationsTable)
      .set({ emailSkipped: false, smsSkipped: false })
      .where(and(
        eq(notificationsTable.userId, req.user.id),
        or(eq(notificationsTable.emailSkipped, true), eq(notificationsTable.smsSkipped, true)),
      ));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "dismissMissed error");
    res.status(500).json({ error: "Failed to dismiss missed notifications" });
  }
});

router.patch("/notifications/:id/read", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    await db.update(notificationsTable)
      .set({ read: true })
      .where(and(eq(notificationsTable.id, req.params.id), eq(notificationsTable.userId, req.user.id)));
    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "markOneRead error");
    res.status(500).json({ error: "Failed to mark read" });
  }
});

export default router;
