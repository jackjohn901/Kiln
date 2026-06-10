import { db, failedEmailsTable } from "@workspace/db";
import { and, eq, lte, sql } from "drizzle-orm";
import { sendEmail, isFakeAddress, type EmailPayload } from "./email";
import { logger } from "./logger";

export type FailedEmailRow = typeof failedEmailsTable.$inferSelect;

/**
 * When the number of unresolved (pending + failed) queued emails reaches this
 * threshold, the admin dashboard surfaces a proactive alert badge so delivery
 * outages are noticed without anyone polling the Maintenance page.
 */
export const EMAIL_QUEUE_ALERT_THRESHOLD = 10;

export interface EmailQueueAlert {
  pending: number;
  failed: number;
  /** pending + failed — rows that still need attention */
  unresolved: number;
  threshold: number;
  /** true once unresolved rows reach the threshold; clears when the queue drains */
  alert: boolean;
}

/**
 * Lightweight aggregate of the email retry queue used to drive the admin alert
 * badge. Counts only — never returns row contents — so it stays cheap to poll.
 */
export async function getEmailQueueAlert(): Promise<EmailQueueAlert> {
  const countRows = await db
    .select({ status: failedEmailsTable.status, count: sql<number>`count(*)::int` })
    .from(failedEmailsTable)
    .groupBy(failedEmailsTable.status);

  const counts: Record<string, number> = {};
  for (const c of countRows) counts[c.status] = c.count;

  const pending = counts["pending"] ?? 0;
  const failed = counts["failed"] ?? 0;
  const unresolved = pending + failed;

  return {
    pending,
    failed,
    unresolved,
    threshold: EMAIL_QUEUE_ALERT_THRESHOLD,
    alert: unresolved >= EMAIL_QUEUE_ALERT_THRESHOLD,
  };
}

export interface RetryFailedEmailResult {
  found: boolean;
  delivered: boolean;
  row?: FailedEmailRow;
}

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
    // Defensively skip any rows that slipped in for fake/seed addresses — they
    // can never be delivered, so mark them terminal instead of retrying forever.
    if (isFakeAddress(row.to)) {
      try {
        await db
          .update(failedEmailsTable)
          .set({ status: "skipped", lastError: "Skipped — fake/seed address (undeliverable)" })
          .where(eq(failedEmailsTable.id, row.id));
        logger.debug(
          { id: row.id, to: row.to, subject: row.subject },
          "Email queue: skipped fake/seed address",
        );
      } catch (err) {
        logger.error({ err, id: row.id }, "Email queue: failed to mark fake/seed row as skipped");
      }
      continue;
    }

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

/**
 * Forces an immediate delivery attempt for a single queued email, bypassing the
 * backoff schedule. Used by the admin dashboard. Mirrors the per-row state
 * transitions in drainEmailQueue (delivered / failed / rescheduled) but acts on
 * one row regardless of its nextRetryAt.
 */
export async function retryFailedEmail(id: number): Promise<RetryFailedEmailResult> {
  let row: FailedEmailRow | undefined;
  try {
    [row] = await db.select().from(failedEmailsTable).where(eq(failedEmailsTable.id, id)).limit(1);
  } catch (err) {
    logger.error({ err, id }, "Email queue retry: failed to load row");
    throw err;
  }

  if (!row) return { found: false, delivered: false };

  // Fake/seed addresses can never be delivered, so a manual retry would just
  // bounce the row back to "pending" forever. Mark it terminal instead.
  if (isFakeAddress(row.to)) {
    const [updated] = await db
      .update(failedEmailsTable)
      .set({ status: "skipped", lastError: "Skipped — fake/seed address (undeliverable)" })
      .where(eq(failedEmailsTable.id, row.id))
      .returning();
    logger.info(
      { id: row.id, to: row.to, subject: row.subject, contextId: row.contextId, label: row.label },
      "Email queue retry: skipped fake/seed address (undeliverable)",
    );
    return { found: true, delivered: false, ...(updated ? { row: updated } : {}) };
  }

  const payload: EmailPayload = {
    to: row.to,
    subject: row.subject,
    html: row.html,
    ...(row.from ? { from: row.from } : {}),
  };

  const ok = await sendEmail(payload);
  const newAttempts = row.attempts + 1;

  if (ok) {
    const [updated] = await db
      .update(failedEmailsTable)
      .set({ status: "delivered", attempts: newAttempts, deliveredAt: new Date() })
      .where(eq(failedEmailsTable.id, row.id))
      .returning();
    logger.info(
      { id: row.id, to: row.to, subject: row.subject, contextId: row.contextId, label: row.label },
      "Email queue retry: manual retry delivered successfully",
    );
    return { found: true, delivered: true, ...(updated ? { row: updated } : {}) };
  }

  if (newAttempts >= MAX_PERSISTENT_ATTEMPTS) {
    const [updated] = await db
      .update(failedEmailsTable)
      .set({ status: "failed", attempts: newAttempts, lastError: "Max persistent retry attempts exhausted" })
      .where(eq(failedEmailsTable.id, row.id))
      .returning();
    logger.error(
      { id: row.id, to: row.to, subject: row.subject, attempts: newAttempts },
      "Email queue retry: manual retry exhausted max attempts",
    );
    return { found: true, delivered: false, ...(updated ? { row: updated } : {}) };
  }

  const delayMs = nextRetryDelay(newAttempts);
  const nextRetryAt = new Date(Date.now() + delayMs);
  const [updated] = await db
    .update(failedEmailsTable)
    .set({ attempts: newAttempts, nextRetryAt, lastError: "Manual retry attempt failed" })
    .where(eq(failedEmailsTable.id, row.id))
    .returning();
  logger.warn(
    { id: row.id, to: row.to, subject: row.subject, attempts: newAttempts, nextRetryAt },
    "Email queue retry: manual retry failed, rescheduled",
  );
  return { found: true, delivered: false, ...(updated ? { row: updated } : {}) };
}
