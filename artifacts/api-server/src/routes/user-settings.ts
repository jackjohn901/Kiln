import { Router } from "express";
import { db } from "@workspace/db";
import { userSettingsTable, profilesTable } from "@workspace/db";

import { eq } from "drizzle-orm";

const router = Router();

interface ShippingAddress {
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
}

function isValidShippingAddress(v: unknown): v is ShippingAddress {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const obj = v as Record<string, unknown>;
  for (const key of ["street", "city", "state", "zip", "country"]) {
    if (key in obj && obj[key] !== null && typeof obj[key] !== "string") return false;
  }
  return true;
}

// GET /me/settings
router.get("/me/settings", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [[row], [profile]] = await Promise.all([
    db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, req.user.id)),
    db.select({ contactEmail: profilesTable.contactEmail, phoneNumber: profilesTable.phoneNumber }).from(profilesTable).where(eq(profilesTable.userId, req.user.id)),
  ]);
  if (!row) {
    res.json({
      settings: {},
      shippingSettings: {},
      paymentSettings: {},
      defaultShippingAddress: null,
      contactEmail: profile?.contactEmail ?? null,
      phoneNumber: profile?.phoneNumber ?? null,
    });
    return;
  }
  res.json({ ...row, contactEmail: profile?.contactEmail ?? null, phoneNumber: profile?.phoneNumber ?? null });
});

// PATCH /me/settings
router.patch("/me/settings", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  const { settings, shippingSettings, paymentSettings, contactEmail, phoneNumber, defaultShippingAddress } = req.body;

  // Validate processingWindow if provided in paymentSettings
  if (paymentSettings !== undefined && paymentSettings !== null && typeof paymentSettings === "object") {
    const pw = (paymentSettings as Record<string, unknown>).processingWindow;
    if (pw !== undefined && pw !== null) {
      if (typeof pw !== "number" || !Number.isInteger(pw) || pw < 1 || pw > 30) {
        res.status(400).json({ error: "processingWindow must be an integer between 1 and 30" });
        return;
      }
    }
  }

  // Validate defaultShippingAddress if provided
  if (defaultShippingAddress !== undefined && defaultShippingAddress !== null) {
    if (!isValidShippingAddress(defaultShippingAddress)) {
      res.status(400).json({ error: "Invalid defaultShippingAddress format" });
      return;
    }
  }

  // Validate contactEmail if provided — empty string is allowed (clears the address)
  if (typeof contactEmail === "string") {
    const trimmed = contactEmail.trim();
    if (trimmed.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      res.status(400).json({ error: "contactEmail must be a valid email address" });
      return;
    }
  }

  // Persist contactEmail and phoneNumber to profiles table if provided
  const profileUpdates: Record<string, string | null> = {};
  if (typeof contactEmail === "string") profileUpdates.contactEmail = contactEmail.trim() || null;
  if (typeof phoneNumber === "string") profileUpdates.phoneNumber = phoneNumber.trim() || null;
  if (Object.keys(profileUpdates).length > 0) {
    await db.update(profilesTable)
      .set(profileUpdates)
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
      ...(defaultShippingAddress !== undefined && { defaultShippingAddress: defaultShippingAddress ?? null }),
    }).where(eq(userSettingsTable.userId, userId)).returning();
    res.json(updated);
  } else {
    const [created] = await db.insert(userSettingsTable).values({
      userId,
      settings: settings ?? {},
      shippingSettings: shippingSettings ?? {},
      paymentSettings: paymentSettings ?? {},
      defaultShippingAddress: defaultShippingAddress ?? null,
    }).returning();
    res.json(created);
  }
});

export default router;
