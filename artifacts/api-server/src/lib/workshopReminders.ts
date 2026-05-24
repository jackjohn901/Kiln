import { db, workshopsTable, workshopBookingsTable, userSettingsTable } from "@workspace/db";
import { and, gte, lte, isNull, isNotNull, eq } from "drizzle-orm";
import { logger } from "./logger";
import { sendEmail, workshopReminderEmail } from "./email";
import { generateUnsubscribeToken } from "./unsubscribeTokens";

async function sendWorkshopReminders() {
  try {
    const now = new Date();
    const windowEnd = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const upcomingWorkshops = await db
      .select()
      .from(workshopsTable)
      .where(
        and(
          eq(workshopsTable.isActive, true),
          isNotNull(workshopsTable.startDate),
          gte(workshopsTable.startDate, now),
          lte(workshopsTable.startDate, windowEnd),
        )
      );

    if (upcomingWorkshops.length === 0) return;

    logger.info({ count: upcomingWorkshops.length }, "workshopReminders: found workshops in 24h window");

    for (const workshop of upcomingWorkshops) {
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

      for (const booking of bookings) {
        if (!booking.userEmail) {
          logger.debug({ bookingId: booking.id }, "workshopReminders: skipping booking with no email");
          continue;
        }

        // Check if the student has opted out of workshop reminder emails
        const [userSettings] = await db
          .select({ settings: userSettingsTable.settings })
          .from(userSettingsTable)
          .where(eq(userSettingsTable.userId, booking.userId));

        const settings = userSettings?.settings as Record<string, unknown> | null ?? {};
        if (settings.workshopReminderOptOut === true) {
          logger.debug({ bookingId: booking.id, userId: booking.userId }, "workshopReminders: skipping opted-out user");
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
          : "Tomorrow";

        const unsubscribeToken = generateUnsubscribeToken(booking.userId);

        const html = workshopReminderEmail(
          workshop.title,
          workshop.artistName,
          startLabel,
          workshop.id,
          {
            isOnline: workshop.isOnline,
            location: workshop.location,
            meetingUrl: workshop.meetingUrl,
            unsubscribeToken,
          },
        );

        const sent = await sendEmail({
          to: booking.userEmail,
          subject: `Reminder: "${workshop.title}" is tomorrow`,
          html,
        });

        if (sent) {
          await db
            .update(workshopBookingsTable)
            .set({ reminderSentAt: new Date() })
            .where(eq(workshopBookingsTable.id, booking.id));

          logger.info({ bookingId: booking.id, workshopId: workshop.id }, "workshopReminders: reminder sent");
        }
      }
    }
  } catch (err) {
    logger.error({ err }, "workshopReminders: error dispatching reminders");
  }
}

export function startWorkshopReminders() {
  sendWorkshopReminders();
  setInterval(sendWorkshopReminders, 60 * 60 * 1000);
  logger.info("Workshop reminders job started (1h interval)");
}

export { sendWorkshopReminders };
