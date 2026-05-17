import { Router } from "express";
import { db } from "@workspace/db";
import { userSettingsTable, profilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router = Router();

// GET /me/settings
router.get("/me/settings", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [[row], [profile]] = await Promise.all([
    db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, req.user.id)),
    db.select({ contactEmail: profilesTable.contactEmail }).from(profilesTable).where(eq(profilesTable.userId, req.user.id)),
  ]);
  if (!row) { res.json({ settings: {}, shippingSettings: {}, paymentSettings: {}, contactEmail: profile?.contactEmail ?? null }); return; }
  res.json({ ...row, contactEmail: profile?.contactEmail ?? null });
});

// PATCH /me/settings
router.patch("/me/settings", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  const { settings, shippingSettings, paymentSettings, contactEmail } = req.body;

  // Persist contactEmail to profiles table if provided
  if (typeof contactEmail === "string") {
    await db.update(profilesTable)
      .set({ contactEmail: contactEmail.trim() || null })
      .where(eq(profilesTable.userId, userId))
      .catch(() => {});
  }
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
