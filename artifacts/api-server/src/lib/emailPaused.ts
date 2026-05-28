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
