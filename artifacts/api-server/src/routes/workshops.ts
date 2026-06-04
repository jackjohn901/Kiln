import { Router } from "express";
import { db } from "@workspace/db";
import { workshopsTable, workshopBookingsTable, notificationsTable, usersTable, userSettingsTable, profilesTable } from "@workspace/db";
import { eq, and, desc, sql, gte, isNull } from "drizzle-orm";
import crypto from "crypto";
import { sendEmailWithRetry, workshopReminderEmail, workshopBookingEmail, newWorkshopBookingArtistEmail } from "../lib/email";

const router = Router();

// GET /workshops
router.get("/workshops", async (req, res): Promise<void> => {
  try {
    const { artistId, technique, upcoming } = req.query as Record<string, string>;
    let query = db.select().from(workshopsTable).where(eq(workshopsTable.isActive, true)).$dynamic();
    if (artistId) query = query.where(eq(workshopsTable.artistId, artistId));
    const rows = await query.orderBy(desc(workshopsTable.startDate));
    const viewerId = req.isAuthenticated() ? req.user.id : null;
    let bookedIds = new Set<string>();
    if (viewerId) {
      const b = await db.select({ workshopId: workshopBookingsTable.workshopId }).from(workshopBookingsTable).where(eq(workshopBookingsTable.userId, viewerId));
      bookedIds = new Set(b.map(x => x.workshopId));
    }
    res.json({ workshops: rows.map(w => ({ ...w, isBooked: bookedIds.has(w.id), spotsLeft: w.maxSpots - w.spotsBooked, startDate: w.startDate?.toISOString(), endDate: w.endDate?.toISOString(), createdAt: w.createdAt.toISOString(), updatedAt: w.updatedAt.toISOString() })) });
  } catch (err) { req.log.error({ err }, "getWorkshops error"); res.status(500).json({ error: "Failed to load workshops" }); }
});

// GET /workshops/:id
router.get("/workshops/:id", async (req, res): Promise<void> => {
  try {
    const [w] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, req.params.id));
    if (!w) { res.status(404).json({ error: "Not found" }); return; }
    const bookings = await db.select().from(workshopBookingsTable).where(eq(workshopBookingsTable.workshopId, w.id));
    const viewerId = req.isAuthenticated() ? req.user.id : null;
    const isBooked = viewerId ? bookings.some(b => b.userId === viewerId) : false;
    res.json({ ...w, isBooked, spotsLeft: w.maxSpots - w.spotsBooked, bookingCount: bookings.length, startDate: w.startDate?.toISOString(), endDate: w.endDate?.toISOString(), createdAt: w.createdAt.toISOString(), updatedAt: w.updatedAt.toISOString() });
  } catch (err) { req.log.error({ err }, "getWorkshop error"); res.status(500).json({ error: "Failed to load workshop" }); }
});

// POST /workshops — create (authenticated)
router.post("/workshops", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const { title, description, technique, level, location, isOnline, meetingUrl, price, maxSpots, durationHours, imageUrl, startDate, endDate, tags } = req.body;
  if (!title || !price) { res.status(400).json({ error: "title and price required" }); return; }
  try {
    const user = req.user;
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Artist";
    const [workshop] = await db.insert(workshopsTable).values({
      id: crypto.randomUUID(), artistId: user.id, artistName: name, artistAvatarUrl: user.profileImageUrl ?? null,
      title, description, technique, level: level ?? "All levels", location, isOnline: !!isOnline,
      meetingUrl: isOnline && meetingUrl ? String(meetingUrl) : null,
      price: Number(price), maxSpots: Number(maxSpots ?? 8), durationHours: Number(durationHours ?? 3),
      imageUrl, startDate: startDate ? new Date(startDate) : null, endDate: endDate ? new Date(endDate) : null, tags: tags ?? [],
    }).returning();
    res.status(201).json({ ...workshop, spotsLeft: workshop.maxSpots, isBooked: false, startDate: workshop.startDate?.toISOString(), endDate: workshop.endDate?.toISOString(), createdAt: workshop.createdAt.toISOString(), updatedAt: workshop.updatedAt.toISOString() });
  } catch (err) { req.log.error({ err }, "createWorkshop error"); res.status(500).json({ error: "Failed to create workshop" }); }
});

// PATCH /workshops/:id — update workshop (owner only)
router.patch("/workshops/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const [existing] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, req.params.id));
    if (!existing) { res.status(404).json({ error: "Not found" }); return; }
    if (existing.artistId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }

    const { title, description, technique, level, location, isOnline, meetingUrl, price, maxSpots, durationHours, imageUrl, startDate, endDate, tags, isActive } = req.body;

    const updates: Partial<typeof workshopsTable.$inferInsert> = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (technique !== undefined) updates.technique = technique;
    if (level !== undefined) updates.level = level;
    if (location !== undefined) updates.location = location;
    if (isOnline !== undefined) updates.isOnline = !!isOnline;
    if (meetingUrl !== undefined) updates.meetingUrl = (isOnline ?? existing.isOnline) && meetingUrl ? String(meetingUrl) : null;
    if (price !== undefined) updates.price = Number(price);
    if (maxSpots !== undefined) updates.maxSpots = Number(maxSpots);
    if (durationHours !== undefined) updates.durationHours = Number(durationHours);
    if (imageUrl !== undefined) updates.imageUrl = imageUrl;
    if (startDate !== undefined) updates.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) updates.endDate = endDate ? new Date(endDate) : null;
    if (tags !== undefined) updates.tags = tags;
    if (isActive !== undefined) updates.isActive = !!isActive;

    const [updated] = await db.update(workshopsTable).set(updates).where(eq(workshopsTable.id, req.params.id)).returning();
    res.json({ ...updated, spotsLeft: updated.maxSpots - updated.spotsBooked, startDate: updated.startDate?.toISOString(), endDate: updated.endDate?.toISOString(), createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() });
  } catch (err) { req.log.error({ err }, "patchWorkshop error"); res.status(500).json({ error: "Failed to update workshop" }); }
});

// POST /workshops/:id/book — book a spot (free workshops only).
// Paid workshops (price > 0) must be booked via /api/stripe/checkout to ensure payment is verified
// before a seat is reserved. Direct booking of paid workshops is rejected here.
router.post("/workshops/:id/book", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const [w] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, req.params.id));
  if (!w) { res.status(404).json({ error: "Not found" }); return; }
  if (w.price > 0) { res.status(402).json({ error: "This workshop requires payment. Please complete checkout before your spot is reserved." }); return; }
  if (w.spotsBooked >= w.maxSpots) { res.status(400).json({ error: "No spots left" }); return; }
  const userId = req.user.id;
  const [existing] = await db.select().from(workshopBookingsTable).where(and(eq(workshopBookingsTable.workshopId, w.id), eq(workshopBookingsTable.userId, userId)));
  if (existing) { res.json({ booking: existing, alreadyBooked: true }); return; }
  try {
    const user = req.user;
    const name = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "Student";
    const [booking] = await db.insert(workshopBookingsTable).values({ id: crypto.randomUUID(), workshopId: w.id, userId, userName: name, userEmail: user.email ?? undefined, paidAmount: 0 }).returning();
    await db.update(workshopsTable).set({ spotsBooked: sql`${workshopsTable.spotsBooked} + 1` }).where(eq(workshopsTable.id, w.id));
    await db.insert(notificationsTable).values({ id: crypto.randomUUID(), userId: w.artistId, type: "workshop", fromId: userId, fromName: name, fromAvatarUrl: user.profileImageUrl ?? null, text: `booked your workshop: ${w.title}`, link: `/workshops/${w.id}` });

    const calParams = { startDateISO: w.startDate?.toISOString() ?? null, endDateISO: w.endDate?.toISOString() ?? null, durationHours: w.durationHours, isOnline: w.isOnline, location: w.location ?? null, workshopId: w.id };

    if (user.email) {
      const startLabel = w.startDate
        ? w.startDate.toLocaleString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "2-digit", timeZoneName: "short" })
        : "Date TBD";
      const html = workshopBookingEmail(w.title, w.artistName, startLabel, calParams, { isOnline: w.isOnline, location: w.location ?? null, meetingUrl: w.meetingUrl ?? null });
      sendEmailWithRetry({ to: user.email, subject: `Booking confirmed: "${w.title}"`, html }, { label: "workshop booking confirmation", contextId: w.id }).catch((err: unknown) => { req.log.error({ err }, "workshopBookingEmail send failed"); });
    }

    const [[artistUser], [artistSettings], [studentProfile]] = await Promise.all([
      db.select({ email: usersTable.email }).from(usersTable).where(eq(usersTable.id, w.artistId)),
      db.select({ settings: userSettingsTable.settings, notifEmailResumeAt: userSettingsTable.notifEmailResumeAt }).from(userSettingsTable).where(eq(userSettingsTable.userId, w.artistId)),
      db.select({ handle: profilesTable.handle }).from(profilesTable).where(eq(profilesTable.userId, userId)),
    ]);
    const artistEmailSnoozed = artistSettings?.notifEmailResumeAt && artistSettings.notifEmailResumeAt > new Date();
    const artistWantsEmail = !artistEmailSnoozed && (artistSettings?.settings as Record<string, unknown> | null)?.workshopBookingEmail !== false;
    if (artistUser?.email && artistWantsEmail) {
      const studentName = [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email || "A student";
      const html = newWorkshopBookingArtistEmail(studentName, user.email ?? "", w.title, 0, calParams, studentProfile?.handle ?? null, userId);
      sendEmailWithRetry({ to: artistUser.email, subject: `New booking: "${w.title}"`, html }, { label: "new workshop booking (artist)", contextId: w.id }).catch((err: unknown) => { req.log.error({ err }, "newWorkshopBookingArtistEmail send failed"); });
    }

    res.status(201).json({ booking: { ...booking, createdAt: booking.createdAt.toISOString() }, spotsLeft: w.maxSpots - w.spotsBooked - 1 });
  } catch (err) { req.log.error({ err }, "bookWorkshop error"); res.status(500).json({ error: "Failed to book workshop" }); }
});

// DELETE /workshops/:id/book — cancel booking
// spotsBooked is only decremented when a booking row belonging to the caller is actually deleted,
// preventing unauthenticated seat-count manipulation by users who never held a booking.
router.delete("/workshops/:id/book", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const deleted = await db.delete(workshopBookingsTable)
    .where(and(eq(workshopBookingsTable.workshopId, req.params.id), eq(workshopBookingsTable.userId, req.user.id)))
    .returning({ id: workshopBookingsTable.id });
  if (deleted.length > 0) {
    await db.update(workshopsTable).set({ spotsBooked: sql`GREATEST(${workshopsTable.spotsBooked} - 1, 0)` }).where(eq(workshopsTable.id, req.params.id));
  }
  res.json({ success: true });
});

// PATCH /workshops/bookings/:id — update a booking the caller owns.
// Currently supports toggling the per-booking reminder opt-out so students can
// re-enable reminders for a workshop they previously muted.
router.patch("/workshops/bookings/:id", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const [booking] = await db.select().from(workshopBookingsTable).where(eq(workshopBookingsTable.id, req.params.id));
    if (!booking) { res.status(404).json({ error: "Not found" }); return; }
    if (booking.userId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }

    const { reminderOptOut } = req.body as { reminderOptOut?: unknown };
    if (typeof reminderOptOut !== "boolean") { res.status(400).json({ error: "reminderOptOut (boolean) required" }); return; }

    const [updated] = await db.update(workshopBookingsTable)
      .set({ reminderOptOut })
      .where(eq(workshopBookingsTable.id, booking.id))
      .returning();
    res.json({ booking: { ...updated, createdAt: updated.createdAt.toISOString() } });
  } catch (err) {
    req.log.error({ err }, "patchWorkshopBooking error");
    res.status(500).json({ error: "Failed to update booking" });
  }
});

// GET /workshops/:id/calendar.ics — download ICS file for Apple Calendar and other clients
router.get("/workshops/:id/calendar.ics", async (req, res): Promise<void> => {
  try {
    const [w] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, req.params.id));
    if (!w) { res.status(404).send("Not found"); return; }

    const now = new Date();
    const dtStamp = formatIcsDate(now);

    const start = w.startDate ?? now;
    const end = w.endDate ?? new Date(start.getTime() + (w.durationHours ?? 2) * 60 * 60 * 1000);
    const dtStart = formatIcsDate(start);
    const dtEnd = formatIcsDate(end);

    const locationLine = w.isOnline ? "Online" : (w.location ?? "");
    const description = [
      `Workshop with ${w.artistName}`,
      w.description ?? "",
      w.isOnline ? "This is an online workshop." : "",
    ].filter(Boolean).join("\\n");

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Kiln//Workshop Calendar//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:workshop-${w.id}@kilndrop.com`,
      `DTSTAMP:${dtStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escIcs(w.title)}`,
      `DESCRIPTION:${escIcs(description)}`,
      locationLine ? `LOCATION:${escIcs(locationLine)}` : null,
      "END:VEVENT",
      "END:VCALENDAR",
    ].filter(Boolean).join("\r\n");

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="workshop-${w.id}.ics"`);
    res.send(ics);
  } catch (err) {
    req.log.error({ err }, "calendarIcs error");
    res.status(500).send("Failed to generate calendar file");
  }
});

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escIcs(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,");
}

// POST /workshops/:id/reminders/send — manually trigger reminders for a workshop (owner only)
router.post("/workshops/:id/reminders/send", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  try {
    const [workshop] = await db.select().from(workshopsTable).where(eq(workshopsTable.id, req.params.id));
    if (!workshop) { res.status(404).json({ error: "Workshop not found" }); return; }
    if (workshop.artistId !== req.user.id) { res.status(403).json({ error: "Forbidden" }); return; }

    const bookings = await db
      .select()
      .from(workshopBookingsTable)
      .where(
        and(
          eq(workshopBookingsTable.workshopId, workshop.id),
          eq(workshopBookingsTable.status, "confirmed"),
          isNull(workshopBookingsTable.reminderSentAt),
        )
      );

    let sent = 0;
    for (const booking of bookings) {
      if (!booking.userEmail) continue;

      // Respect booking-level opt-out
      if (booking.reminderOptOut) {
        req.log.debug({ bookingId: booking.id, userId: booking.userId }, "manual reminder: skipping booking-level opted-out");
        continue;
      }

      // Respect global workshop reminder opt-out preference
      const [userSettings] = await db
        .select({ settings: userSettingsTable.settings })
        .from(userSettingsTable)
        .where(eq(userSettingsTable.userId, booking.userId));

      const settings = (userSettings?.settings as Record<string, unknown> | null) ?? {};
      if (settings.workshopReminderOptOut === true) {
        req.log.debug({ bookingId: booking.id, userId: booking.userId }, "manual reminder: skipping globally opted-out user");
        continue;
      }

      const startLabel = workshop.startDate
        ? workshop.startDate.toLocaleString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
            timeZoneName: "short",
          })
        : "Soon";

      const html = workshopReminderEmail(workshop.title, workshop.artistName, startLabel, workshop.id);
      const ok = await sendEmailWithRetry(
        {
          to: booking.userEmail,
          subject: `Reminder: "${workshop.title}" is coming up`,
          html,
        },
        { label: "workshop reminder", contextId: workshop.id },
      );

      if (ok) {
        await db
          .update(workshopBookingsTable)
          .set({ reminderSentAt: new Date() })
          .where(eq(workshopBookingsTable.id, booking.id));
        sent++;
        req.log.info({ bookingId: booking.id, workshopId: workshop.id }, "manual reminder sent");
      }
    }

    res.json({ sent });
  } catch (err) {
    req.log.error({ err }, "sendWorkshopReminders error");
    res.status(500).json({ error: "Failed to send reminders" });
  }
});

// GET /me/workshops — my bookings
router.get("/me/workshops", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }
  const bookings = await db.select().from(workshopBookingsTable).where(eq(workshopBookingsTable.userId, req.user.id)).orderBy(desc(workshopBookingsTable.createdAt));
  const workshopIds = bookings.map(b => b.workshopId);
  const workshops = workshopIds.length ? await db.select().from(workshopsTable).where(sql`${workshopsTable.id} = ANY(${workshopIds})`) : [];
  const wsMap = Object.fromEntries(workshops.map(w => [w.id, w]));
  res.json({ bookings: bookings.map(b => ({ ...b, workshop: wsMap[b.workshopId] ?? null, createdAt: b.createdAt.toISOString() })) });
});

export default router;
