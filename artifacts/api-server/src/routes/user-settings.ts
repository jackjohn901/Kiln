import { Router } from "express";
import { db } from "@workspace/db";
import { userSettingsTable, profilesTable, workshopBookingsTable } from "@workspace/db";
import { isEmailPaused } from "../lib/emailPaused";

import { eq } from "drizzle-orm";
import { verifyUnsubscribeToken, verifyBookingUnsubscribeToken } from "../lib/unsubscribeTokens";

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
    db.select({ contactEmail: profilesTable.contactEmail, contactEmailBounced: profilesTable.contactEmailBounced, phoneNumber: profilesTable.phoneNumber }).from(profilesTable).where(eq(profilesTable.userId, req.user.id)),
  ]);
  if (!row) {
    res.json({
      settings: {},
      shippingSettings: {},
      paymentSettings: {},
      defaultShippingAddress: null,
      notifEmailResumeAt: null,
      contactEmail: profile?.contactEmail ?? null,
      contactEmailBounced: profile?.contactEmailBounced ?? false,
      phoneNumber: profile?.phoneNumber ?? null,
    });
    return;
  }

  // Auto-clear an expired timed snooze so the client always sees up-to-date state
  let resolvedRow = row;
  if (row.notifEmailResumeAt && row.notifEmailResumeAt <= new Date()) {
    const rowSettings = (row.settings as Record<string, unknown> | null) ?? {};
    const clearedSettings = { ...rowSettings, notif_email_paused: false };
    await db.update(userSettingsTable).set({
      settings: clearedSettings,
      notifEmailPausedAt: null,
      notifEmailResumeAt: null,
    }).where(eq(userSettingsTable.userId, req.user.id)).catch(() => {});
    resolvedRow = { ...row, settings: clearedSettings, notifEmailPausedAt: null, notifEmailResumeAt: null };
  }

  res.json({ ...resolvedRow, contactEmail: profile?.contactEmail ?? null, contactEmailBounced: profile?.contactEmailBounced ?? false, phoneNumber: profile?.phoneNumber ?? null });
});

// PATCH /me/settings
router.patch("/me/settings", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const userId = req.user.id;
  const { settings, shippingSettings, paymentSettings, contactEmail, phoneNumber, defaultShippingAddress, notifEmailResumeAt: rawResumeAt } = req.body;

  // Validate notifEmailResumeAt if provided — must be a future ISO date string or null
  let notifEmailResumeAtValue: Date | null | undefined;
  if (rawResumeAt !== undefined) {
    if (rawResumeAt === null) {
      notifEmailResumeAtValue = null;
    } else if (typeof rawResumeAt === "string") {
      const parsed = new Date(rawResumeAt);
      if (isNaN(parsed.getTime())) {
        res.status(400).json({ error: "notifEmailResumeAt must be a valid ISO date string or null" });
        return;
      }
      notifEmailResumeAtValue = parsed;
    } else {
      res.status(400).json({ error: "notifEmailResumeAt must be a valid ISO date string or null" });
      return;
    }
  }

  // Detect notif_email_paused transitions to set/clear the timestamp
  let notifEmailPausedAtUpdate: { notifEmailPausedAt: Date | null } | undefined;
  if (settings !== undefined && typeof settings === "object" && settings !== null) {
    const incoming = settings as Record<string, unknown>;
    if ("notif_email_paused" in incoming) {
      if (incoming.notif_email_paused === true) {
        // Check if it was already paused so we don't reset the timestamp on every save
        const [existing] = await db.select({ notifEmailPausedAt: userSettingsTable.notifEmailPausedAt })
          .from(userSettingsTable).where(eq(userSettingsTable.userId, userId));
        if (!existing?.notifEmailPausedAt) {
          notifEmailPausedAtUpdate = { notifEmailPausedAt: new Date() };
        }
      } else if (incoming.notif_email_paused === false) {
        notifEmailPausedAtUpdate = { notifEmailPausedAt: null };
        // Unpausing always clears the snooze resume timestamp too
        if (notifEmailResumeAtValue === undefined) notifEmailResumeAtValue = null;
      }
    }
  }

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

  // Validate phoneNumber if provided — empty string is allowed (clears the number)
  if (typeof phoneNumber === "string") {
    const trimmed = phoneNumber.trim();
    if (trimmed.length > 0 && !/^[0-9\s\-+().]+$/.test(trimmed)) {
      res.status(400).json({ error: "phoneNumber may only contain digits, spaces, dashes, plus signs, and parentheses" });
      return;
    }
  }

  // Persist contactEmail and phoneNumber to profiles table if provided.
  // Saving a new (non-empty) email always clears the bounced flag so the UI
  // resets back to a clean state for the freshly-provided address.
  const profileUpdates: Record<string, string | null | boolean> = {};
  if (typeof contactEmail === "string") {
    profileUpdates.contactEmail = contactEmail.trim() || null;
    if (contactEmail.trim().length > 0) profileUpdates.contactEmailBounced = false;
  }
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
      ...notifEmailPausedAtUpdate,
      ...(notifEmailResumeAtValue !== undefined && { notifEmailResumeAt: notifEmailResumeAtValue }),
    }).where(eq(userSettingsTable.userId, userId)).returning();
    res.json(updated);
  } else {
    const [created] = await db.insert(userSettingsTable).values({
      userId,
      settings: settings ?? {},
      shippingSettings: shippingSettings ?? {},
      paymentSettings: paymentSettings ?? {},
      defaultShippingAddress: defaultShippingAddress ?? null,
      ...(notifEmailPausedAtUpdate?.notifEmailPausedAt !== undefined && { notifEmailPausedAt: notifEmailPausedAtUpdate.notifEmailPausedAt }),
      ...(notifEmailResumeAtValue !== undefined && notifEmailResumeAtValue !== null && { notifEmailResumeAt: notifEmailResumeAtValue }),
    }).returning();
    res.json(created);
  }
});

// GET /api/unsubscribe/workshop-booking?token=<booking-token>
// Per-booking one-click unsubscribe — sets reminderOptOut on the specific booking row
router.get("/unsubscribe/workshop-booking", async (req, res): Promise<void> => {
  const token = typeof req.query.token === "string" ? req.query.token : null;
  if (!token) {
    res.status(400).send(unsubscribePage("Invalid link", "This unsubscribe link is missing a token. Please use the link from your email.", false));
    return;
  }

  const parsed = verifyBookingUnsubscribeToken(token);
  if (!parsed) {
    res.status(400).send(unsubscribePage("Invalid link", "This unsubscribe link is invalid or has been tampered with. Please use the link from your original reminder email.", false));
    return;
  }

  const { bookingId } = parsed;

  try {
    const [booking] = await db
      .select({ id: workshopBookingsTable.id })
      .from(workshopBookingsTable)
      .where(eq(workshopBookingsTable.id, bookingId));

    if (!booking) {
      res.status(400).send(unsubscribePage("Booking not found", "We couldn't find the booking associated with this link.", false));
      return;
    }

    await db
      .update(workshopBookingsTable)
      .set({ reminderOptOut: true })
      .where(eq(workshopBookingsTable.id, bookingId));

    res.send(unsubscribePage(
      "Reminder turned off",
      "You won't receive a reminder for this specific workshop. Your other workshop reminders are not affected. You can manage all your notification preferences in your account settings.",
      true,
    ));
  } catch {
    res.status(500).send(unsubscribePage("Something went wrong", "We couldn't update your preference right now. Please try again later or manage your settings from your account.", false));
  }
});

// GET /api/unsubscribe/mentions?token=<token>
// Public one-click unsubscribe — no auth required, token is HMAC-verified
// Sets notif_email_mentions: false in the user's settings JSON
router.get("/unsubscribe/mentions", async (req, res): Promise<void> => {
  const token = typeof req.query.token === "string" ? req.query.token : null;
  if (!token) {
    res.status(400).send(unsubscribePage("Invalid link", "This unsubscribe link is missing a token. Please use the link from your email.", false));
    return;
  }

  const userId = verifyUnsubscribeToken(token);
  if (!userId) {
    res.status(400).send(unsubscribePage("Invalid link", "This unsubscribe link is invalid or has been tampered with. Please use the link from your original mention email.", false));
    return;
  }

  try {
    const existing = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, userId));
    const currentSettings = (existing[0]?.settings as Record<string, unknown>) ?? {};
    const newSettings = { ...currentSettings, notif_email_mentions: false };

    if (existing.length > 0) {
      await db.update(userSettingsTable)
        .set({ settings: newSettings })
        .where(eq(userSettingsTable.userId, userId));
    } else {
      await db.insert(userSettingsTable).values({
        userId,
        settings: newSettings,
        shippingSettings: {},
        paymentSettings: {},
      });
    }

    res.send(unsubscribePage(
      "You've been unsubscribed",
      "You won't receive @mention notification emails anymore. You can re-enable them any time in your notification settings.",
      true,
    ));
  } catch {
    res.status(500).send(unsubscribePage("Something went wrong", "We couldn't update your preference right now. Please try again later or manage your settings from your account.", false));
  }
});

// GET /api/unsubscribe/workshop-reminders?token=<token>
// Public one-click unsubscribe — no auth required, token is HMAC-verified
// Opts the user out of ALL workshop reminder emails globally
router.get("/unsubscribe/workshop-reminders", async (req, res): Promise<void> => {
  const token = typeof req.query.token === "string" ? req.query.token : null;
  if (!token) {
    res.status(400).send(unsubscribePage("Invalid link", "This unsubscribe link is missing a token. Please use the link from your email.", false));
    return;
  }

  const userId = verifyUnsubscribeToken(token);
  if (!userId) {
    res.status(400).send(unsubscribePage("Invalid link", "This unsubscribe link is invalid or has been tampered with. Please use the link from your original reminder email.", false));
    return;
  }

  try {
    const existing = await db.select().from(userSettingsTable).where(eq(userSettingsTable.userId, userId));
    const currentSettings = (existing[0]?.settings as Record<string, unknown>) ?? {};
    const newSettings = { ...currentSettings, workshopReminderOptOut: true };

    if (existing.length > 0) {
      await db.update(userSettingsTable)
        .set({ settings: newSettings })
        .where(eq(userSettingsTable.userId, userId));
    } else {
      await db.insert(userSettingsTable).values({
        userId,
        settings: newSettings,
        shippingSettings: {},
        paymentSettings: {},
      });
    }

    res.send(unsubscribePage(
      "You've been unsubscribed",
      "You won't receive workshop reminder emails for any future bookings. You can re-enable them any time in your notification settings.",
      true,
    ));
  } catch {
    res.status(500).send(unsubscribePage("Something went wrong", "We couldn't update your preference right now. Please try again later or manage your settings from your account.", false));
  }
});

function unsubscribePage(title: string, message: string, success: boolean): string {
  const color = success ? "#4ade80" : "#f87171";
  const icon = success ? "✓" : "✗";
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title} — Kiln</title>
  <style>
    body { font-family: Georgia, serif; background: #1a1714; color: #d6d3d1; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
    .card { background: #292524; border-radius: 16px; padding: 40px 48px; max-width: 480px; text-align: center; }
    .icon { font-size: 48px; color: ${color}; margin-bottom: 16px; }
    h1 { color: ${color}; font-size: 22px; margin: 0 0 12px; }
    p { color: #a8a29e; font-size: 15px; line-height: 1.6; margin: 0 0 24px; }
    a { display: inline-block; background: #f59e0b; color: #1c1917; padding: 10px 24px; border-radius: 24px; text-decoration: none; font-weight: bold; font-size: 14px; }
    .brand { font-size: 20px; font-weight: bold; color: #f59e0b; margin-bottom: 32px; }
    .sub { color: #78716c; font-size: 12px; margin-bottom: 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="brand">Kiln</div>
    <div class="icon">${icon}</div>
    <h1>${title}</h1>
    <p>${message}</p>
    <a href="https://kilnfire.replit.app/kiln/settings">Manage all preferences</a>
    <p class="sub" style="margin-top:20px;">You can re-enable reminders from your notification settings at any time.</p>
  </div>
</body>
</html>`;
}

export default router;
