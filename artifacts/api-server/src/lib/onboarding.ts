import { db } from "@workspace/db";
import { usersTable } from "@workspace/db/schema";
import { onboardingEmailsTable } from "@workspace/db/schema";
import { dropsTable, workshopsTable } from "@workspace/db/schema";
import { and, eq, gte, lt, count, inArray, isNotNull, sql } from "drizzle-orm";
import {
  sendEmail,
  welcomeEmail,
  onboardingDay3Email,
  onboardingDay7Email,
  weeklyDigestEmail,
} from "./email";
import { logger } from "./logger";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

async function hasSent(userId: string, step: string): Promise<boolean> {
  const rows = await db
    .select({ id: onboardingEmailsTable.id })
    .from(onboardingEmailsTable)
    .where(
      and(
        eq(onboardingEmailsTable.userId, userId),
        eq(onboardingEmailsTable.step, step)
      )
    )
    .limit(1);
  return rows.length > 0;
}

async function markSent(userId: string, step: string): Promise<void> {
  await db.insert(onboardingEmailsTable).values({ userId, step }).onConflictDoNothing();
}

export async function sendWelcomeIfNew(user: {
  id: string;
  email: string | null;
  firstName: string | null;
}): Promise<void> {
  if (!user.email) return;
  if (await hasSent(user.id, "day1")) return;
  const sent = await sendEmail({
    to: user.email,
    subject: "Welcome to Kiln — you're in 🔥",
    html: welcomeEmail(user.firstName),
  });
  if (sent) {
    await markSent(user.id, "day1");
    logger.info({ userId: user.id }, "Welcome email sent");
  }
}

async function runDayNSequence(dayN: 3 | 7): Promise<void> {
  const stepKey = `day${dayN}`;
  const now = new Date();
  const windowStart = new Date(now.getTime() - dayN * DAY_MS - DAY_MS / 2);
  const windowEnd = new Date(now.getTime() - dayN * DAY_MS + DAY_MS / 2);

  const users = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      firstName: usersTable.firstName,
    })
    .from(usersTable)
    .where(
      and(
        gte(usersTable.createdAt, windowStart),
        lt(usersTable.createdAt, windowEnd)
      )
    );

  for (const user of users) {
    if (!user.email) continue;
    if (await hasSent(user.id, stepKey)) continue;
    const html = dayN === 3
      ? onboardingDay3Email(user.firstName)
      : onboardingDay7Email(user.firstName);
    const subject = dayN === 3
      ? "Two more ways to earn on Kiln"
      : "Your first week on Kiln — what to explore next";
    const sent = await sendEmail({ to: user.email, subject, html });
    if (sent) {
      await markSent(user.id, stepKey);
      logger.info({ userId: user.id, step: stepKey }, "Onboarding email sent");
    }
  }
}

export async function runOnboardingCron(): Promise<void> {
  await Promise.all([runDayNSequence(3), runDayNSequence(7)]);
}

export async function runWeeklyDigest(): Promise<void> {
  const now = new Date();
  const weekKey = `digest_${now.getFullYear()}_${Math.floor(now.getTime() / WEEK_MS)}`;

  const weekAgo = new Date(now.getTime() - WEEK_MS);

  const [newArtistRows, dropRows, workshopRows] = await Promise.all([
    db
      .select({ count: count() })
      .from(usersTable)
      .where(gte(usersTable.createdAt, weekAgo)),
    db
      .select({ count: count() })
      .from(dropsTable)
      .where(inArray(dropsTable.status, ["active", "live"])),
    db
      .select({ count: count() })
      .from(workshopsTable)
      .where(
        and(
          isNotNull(workshopsTable.startDate),
          gte(workshopsTable.startDate, new Date())
        )
      ),
  ]);

  const stats = {
    newArtistCount: newArtistRows[0]?.count ?? 0,
    activeDropCount: dropRows[0]?.count ?? 0,
    upcomingWorkshopCount: workshopRows[0]?.count ?? 0,
  };

  const allUsers = await db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(sql`${usersTable.email} is not null`);

  let sent = 0;
  for (const user of allUsers) {
    if (!user.email) continue;
    if (await hasSent(user.id, weekKey)) continue;
    const ok = await sendEmail({
      to: user.email,
      subject: "This week on Kiln 🔥",
      html: weeklyDigestEmail(stats),
    });
    if (ok) {
      await markSent(user.id, weekKey);
      sent++;
    }
  }
  logger.info({ sent, weekKey }, "Weekly digest run complete");
}
