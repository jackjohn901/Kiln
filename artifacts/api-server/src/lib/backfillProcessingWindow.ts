/**
 * Thin server-side wrapper around the shared backfill helper from @workspace/db.
 * Wires in the server's structured logger and wraps errors as non-fatal.
 */

import { backfillProcessingWindow as _backfill } from "@workspace/db";
import { logger } from "./logger";

export async function backfillProcessingWindow(): Promise<void> {
  try {
    const result = await _backfill((msg) => logger.info(msg));
    logger.info(
      { found: result.found, stamped: result.stamped, skipped: result.skipped },
      "backfillProcessingWindow: complete",
    );
  } catch (err) {
    logger.error({ err }, "backfillProcessingWindow: error (non-fatal)");
  }
}
