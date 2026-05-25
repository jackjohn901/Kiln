import { db, failedEmailsTable } from "@workspace/db";
import { and, eq, lte } from "drizzle-orm";
import { sendEmail, type EmailPayload } from "./email";
import { logger } from "./logger";

const MAX_PERSISTENT_ATTEMPTS = 10;

const BACKOFF_DELAYS_MS = [
  5 * 60_000,
  15 * 60_000,
  30 * 60_000,
  60 * 60_000,
  2 * 60 * 60_000,
  4 * 60 * 60_000,
  8 * 60 * 60_000,
  12 * 60 * 60_000,
  24 * 60 * 60_000,
];

function nextRetryDelay(attemptsDone: number): number {
  const idx = Math.min(attemptsDone, BACKOFF_DELAYS_MS.length - 1);
  return BACKOFF_DELAYS_MS[idx] ?? BACKOFF_DELAYS_MS[BACKOFF_DELAYS_MS.length - 1]!;
}

/**
 * Persists an email to the retry queue after all in-process attempts have been exhausted.
 */
export async function enqueueFailedEmail(
  payload: EmailPayload,
  contextId?: string,
  label?: string,
): Promise<void> {
  try {
    await db.insert(failedEmailsTable).values({
      to: payload.to,
      from: payload.from ?? null,
      subject: payload.subject,
      html: payload.html,
      contextId: contextId ?? null,
      label: label ?? null,
      status: "pending",
      nextRetryAt: new Date(),
    });
    logger.info(
      { to: payload.to, subject: payload.subject, contextId, label },
      "Email queued for persistent retry",
    );
  } catch (err) {
    logger.error({ err, to: payload.to, subject: payload.subject }, "Failed to persist email to retry queue");
  }
}

/**
 * Drains the pending email queue: picks up all rows due for retry, attempts delivery,
 * and updates state accordingly.
 */
export async function drainEmailQueue(): Promise<void> {
  let rows: typeof failedEmailsTable.$inferSelect[];
  try {
    rows = await db
      .select()
      .from(failedEmailsTable)
      .where(
        and(
          eq(failedEmailsTable.status, "pending"),
          lte(failedEmailsTable.nextRetryAt, new Date()),
        ),
      );
  } catch (err) {
    logger.error({ err }, "Email queue drain: failed to query pending rows");
    return;
  }

  if (rows.length === 0) return;

  logger.info({ count: rows.length }, "Email queue drain: processing pending emails");

  for (const row of rows) {
    const payload: EmailPayload = {
      to: row.to,
      subject: row.subject,
      html: row.html,
      ...(row.from ? { from: row.from } : {}),
    };

    const ok = await sendEmail(payload);
    const newAttempts = row.attempts + 1;

    if (ok) {
      try {
        await db
          .update(failedEmailsTable)
          .set({ status: "delivered", attempts: newAttempts, deliveredAt: new Date() })
          .where(eq(failedEmailsTable.id, row.id));
        logger.info(
          { id: row.id, to: row.to, subject: row.subject, contextId: row.contextId, label: row.label },
          "Email queue: queued email delivered successfully",
        );
      } catch (err) {
        logger.error({ err, id: row.id }, "Email queue: failed to mark row as delivered");
      }
      continue;
    }

    if (newAttempts >= MAX_PERSISTENT_ATTEMPTS) {
      try {
        await db
          .update(failedEmailsTable)
          .set({ status: "failed", attempts: newAttempts, lastError: "Max persistent retry attempts exhausted" })
          .where(eq(failedEmailsTable.id, row.id));
        logger.error(
          { id: row.id, to: row.to, subject: row.subject, contextId: row.contextId, label: row.label, attempts: newAttempts },
          "Email queue: email permanently undeliverable after max attempts",
        );
      } catch (err) {
        logger.error({ err, id: row.id }, "Email queue: failed to mark row as permanently failed");
      }
      continue;
    }

    const delayMs = nextRetryDelay(newAttempts);
    const nextRetryAt = new Date(Date.now() + delayMs);
    try {
      await db
        .update(failedEmailsTable)
        .set({ attempts: newAttempts, nextRetryAt, lastError: "Delivery attempt failed" })
        .where(eq(failedEmailsTable.id, row.id));
      logger.warn(
        { id: row.id, to: row.to, subject: row.subject, attempts: newAttempts, nextRetryAt },
        "Email queue: delivery failed, scheduled next retry",
      );
    } catch (err) {
      logger.error({ err, id: row.id }, "Email queue: failed to update retry schedule");
    }
  }
}
