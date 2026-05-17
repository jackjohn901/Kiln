import { Router } from "express";
import { db } from "@workspace/db";
import { userSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /me/settings
router.get("/me/settings", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [row] = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, req.user.id));
  if (!row) { res.json({ settings: {}, shippingSettings: {}, paymentSettings: {} }); return; }
  res.json(row);
});

// PATCH /me/settings
router.patch("/me/settings", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  const { settings, shippingSettings, paymentSettings } = req.body;
  const existing = await db.select({ userId: userSettingsTable.userId }).from(userSettingsTable)
    .where(eq(userSettingsTable.userId, userId));
  if (existing.length > 0) {
    const [updated] = await db.update(userSettingsTable).set({
      ...(settings !== undefined && { settings }),
      ...(shippingSettings !== undefined && { shippingSettings }),
      ...(paymentSettings !== undefined && { paymentSettings }),
    }).where(eq(userSettingsTable.userId, userId)).returning();
    res.json(updated);
  } else {
    const [created] = await db.insert(userSettingsTable).values({
      userId, settings: settings ?? {}, shippingSettings: shippingSettings ?? {},
      paymentSettings: paymentSettings ?? {},
    }).returning();
    res.json(created);
  }
});

export default router;
