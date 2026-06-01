/**
 * Standalone script — backfill processing window onto older orders.
 *
 * Stamps `processing_window_days` / `processing_window_label` on every
 * order row where BOTH columns are NULL, using each seller's current
 * `paymentSettings` at the time of backfill.
 *
 * Usage:
 *   pnpm --filter @workspace/scripts run backfill-processing-window
 *
 * Safe to re-run: only touches rows where BOTH fields are still NULL.
 *
 * Note: The same logic runs automatically on server startup via
 * `artifacts/api-server/src/lib/backfillProcessingWindow.ts`, which calls
 * the shared helper exported from `@workspace/db`. This script is the
 * standalone ops tool for running the backfill on demand.
 */

import { backfillProcessingWindow, pool } from "@workspace/db";

async function main() {
  console.log("=== backfill-processing-window starting ===");

  const result = await backfillProcessingWindow((msg) => console.log(msg));

  console.log(
    `=== Done. found=${result.found}, stamped=${result.stamped}, skipped=${result.skipped} ===`,
  );

  await pool.end();
}

main().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});
