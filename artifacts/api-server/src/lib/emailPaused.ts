import { db, notificationsTable } from "@workspace/db";
import { and, eq } from "drizzle-orm";
import { injectSnoozeRecap } from "./email";

/**
 * Prepends a "while you were away" recap to an outgoing email when the
 * recipient's snooze has just lifted.
 *
 * Counts the notifications that were skipped while the user was snoozed
 * (`emailSkipped = true`) and, if any exist, injects a short recap banner into
 * the email and clears the flag in the same atomic update so the recap is shown
 * exactly once — on the first email delivered after the snooze ends.
 *
 * Best-effort: returns the original html unchanged on any error so a recap
 * failure never blocks the underlying notification email.
 */
export async function prependSnoozeRecap(userId: string, html: string): Promise<string> {
  try {
    // Atomically clear the skipped flag and learn how many rows were affected.
    // Concurrent sends race here harmlessly: only the update that actually flips
    // the rows gets a non-zero count, so the recap is injected just once.
    const cleared = await db
      .update(notificationsTable)
      .set({ emailSkipped: false })
      .where(and(eq(notificationsTable.userId, userId), eq(notificationsTable.emailSkipped, true)))
      .returning({ id: notificationsTable.id });
    if (cleared.length === 0) return html;
    return injectSnoozeRecap(html, cleared.length);
  } catch {
    return html;
  }
}

/**
 * Returns true if the user has email notifications paused right now.
 *
 * Handles both indefinite pauses (resume_at is null) and timed snoozes
 * (resume_at is a future timestamp). If resume_at is in the past the snooze
 * has expired and this returns false so the email is delivered.
 */
export function isEmailPaused(
  settings: Record<string, unknown> | null | undefined,
  resumeAt: Date | null | undefined,
): boolean {
  if (settings?.notif_email_paused !== true) return false;
  if (resumeAt != null && resumeAt <= new Date()) return false;
  return true;
}

/**
 * Returns true if the user has SMS notifications paused right now.
 *
 * Mirrors isEmailPaused — handles both indefinite pauses and timed snoozes.
 */
export function isSmsPaused(
  settings: Record<string, unknown> | null | undefined,
  resumeAt: Date | null | undefined,
): boolean {
  if (settings?.notif_sms_paused !== true) return false;
  if (resumeAt != null && resumeAt <= new Date()) return false;
  return true;
}
