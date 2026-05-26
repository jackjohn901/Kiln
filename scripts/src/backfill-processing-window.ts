/**
 * Backfill processing window onto older orders.
 *
 * Stamps `processing_window_days` / `processing_window_label` on every
 * order row where both columns are NULL, using the seller's current
 * `paymentSettings` from user_settings at the time of backfill.
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run backfill-processing-window
 *
 * Safe to re-run: only touches rows where BOTH fields are still NULL.
 */

import { db, pool } from "@workspace/db";
import { ordersTable, userSettingsTable } from "@workspace/db";
import { isNull, and, eq, inArray } from "drizzle-orm";

async function main() {
  console.log("=== backfill-processing-window starting ===");

  // 1. Find all order IDs + seller IDs where both window fields are null.
  const nullRows = await db
    .select({ id: ordersTable.id, sellerId: ordersTable.sellerId })
    .from(ordersTable)
    .where(
      and(
        isNull(ordersTable.processingWindowDays),
        isNull(ordersTable.processingWindowLabel),
      ),
    );

  if (nullRows.length === 0) {
    console.log("No orders with null processing window — nothing to do.");
    await pool.end();
    return;
  }

  console.log(`Found ${nullRows.length} order(s) with null processing window.`);

  // 2. Collect unique seller IDs and fetch their payment settings in one query.
  const sellerIds = [...new Set(nullRows.map((r) => r.sellerId))];
  console.log(`Fetching settings for ${sellerIds.length} unique seller(s)…`);

  const settingsRows = await db
    .select({
      userId: userSettingsTable.userId,
      paymentSettings: userSettingsTable.paymentSettings,
    })
    .from(userSettingsTable)
    .where(inArray(userSettingsTable.userId, sellerIds));

  // 3. Build a map: sellerId → { days, label }
  type WindowValues = { days: number | null; label: string | null };
  const sellerWindowMap = new Map<string, WindowValues>();

  for (const row of settingsRows) {
    const ps = row.paymentSettings as Record<string, unknown> | null;
    const days =
      ps && typeof ps.processingWindow === "number"
        ? ps.processingWindow
        : null;
    const label =
      ps &&
      typeof ps.processingWindowLabel === "string" &&
      (ps.processingWindowLabel as string).trim()
        ? (ps.processingWindowLabel as string).trim()
        : null;
    sellerWindowMap.set(row.userId, { days, label });
  }

  // 4. Group orders by (days, label) pair so we can do bulk updates.
  type UpdateBucket = {
    days: number | null;
    label: string | null;
    orderIds: string[];
  };
  const buckets = new Map<string, UpdateBucket>();

  let skipped = 0;
  for (const row of nullRows) {
    const window = sellerWindowMap.get(row.sellerId);
    if (!window || (window.days === null && window.label === null)) {
      // Seller has no processing window configured — leave the row as-is.
      skipped++;
      continue;
    }
    const key = `${window.days ?? "null"}|${window.label ?? "null"}`;
    if (!buckets.has(key)) {
      buckets.set(key, { days: window.days, label: window.label, orderIds: [] });
    }
    buckets.get(key)!.orderIds.push(row.id);
  }

  console.log(
    `Skipped ${skipped} order(s) where seller has no processing window set.`,
  );
  console.log(`Updating in ${buckets.size} bucket(s)…`);

  // 5. Execute the updates.
  let totalUpdated = 0;
  for (const bucket of buckets.values()) {
    await db
      .update(ordersTable)
      .set({
        processingWindowDays: bucket.days,
        processingWindowLabel: bucket.label,
        updatedAt: new Date(),
      })
      .where(inArray(ordersTable.id, bucket.orderIds));
    totalUpdated += bucket.orderIds.length;
    console.log(
      `  Updated ${bucket.orderIds.length} order(s) → days=${bucket.days}, label="${bucket.label}"`,
    );
  }

  console.log(`=== Done. ${totalUpdated} order(s) stamped. ===`);
  await pool.end();
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
