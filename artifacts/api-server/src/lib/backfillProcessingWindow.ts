import { isNull, ne, inArray, eq } from "drizzle-orm";
import { db, ordersTable, userSettingsTable } from "@workspace/db";
import { logger } from "./logger";

export async function backfillProcessingWindow(): Promise<void> {
  try {
    const nullOrders = await db
      .select({ id: ordersTable.id, sellerId: ordersTable.sellerId })
      .from(ordersTable)
      .where(isNull(ordersTable.processingWindowDays));

    const eligibleOrders = nullOrders.filter((o) => o.sellerId !== "kiln");

    if (eligibleOrders.length === 0) {
      logger.info("backfillProcessingWindow: no orders to backfill");
      return;
    }

    const sellerIds = [...new Set(eligibleOrders.map((o) => o.sellerId))];

    const settingsRows = await db
      .select({ userId: userSettingsTable.userId, paymentSettings: userSettingsTable.paymentSettings })
      .from(userSettingsTable)
      .where(inArray(userSettingsTable.userId, sellerIds));

    const windowMap = new Map<string, { days: number | null; label: string | null }>();
    for (const row of settingsRows) {
      const ps = row.paymentSettings as Record<string, unknown> | null;
      const days =
        ps && typeof ps.processingWindow === "number" ? ps.processingWindow : null;
      const label =
        ps && typeof ps.processingWindowLabel === "string" && ps.processingWindowLabel.trim()
          ? ps.processingWindowLabel.trim()
          : null;
      windowMap.set(row.userId, { days, label });
    }

    let updated = 0;
    for (const [sellerId, win] of windowMap.entries()) {
      if (win.days === null && win.label === null) continue;

      const orderIds = eligibleOrders
        .filter((o) => o.sellerId === sellerId)
        .map((o) => o.id);

      if (orderIds.length === 0) continue;

      await db
        .update(ordersTable)
        .set({
          processingWindowDays: win.days,
          processingWindowLabel: win.label,
        })
        .where(inArray(ordersTable.id, orderIds));

      updated += orderIds.length;
    }

    logger.info(
      { total: eligibleOrders.length, updated, sellersFound: windowMap.size },
      "backfillProcessingWindow: complete"
    );
  } catch (err) {
    logger.error({ err }, "backfillProcessingWindow: error (non-fatal)");
  }
}
