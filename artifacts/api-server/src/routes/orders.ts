import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ordersTable, profilesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// GET /orders/cart/:sessionKey — public read-only cart receipt by Stripe session key.
// Does NOT require authentication. Returns purchase items and seller info only;
// buyer PII (email, name, address) is intentionally omitted from this public view.
// The session key is sufficient to scope the response — it is a long, opaque Stripe ID
// that is only shared by the buyer who completed checkout.
router.get("/orders/cart/:sessionKey", async (req, res): Promise<void> => {
  try {
    const orderColumns = {
      id: ordersTable.id,
      type: ordersTable.type,
      refId: ordersTable.refId,
      title: ordersTable.title,
      description: ordersTable.description,
      imageUrl: ordersTable.imageUrl,
      amount: ordersTable.amount,
      currency: ordersTable.currency,
      status: ordersTable.status,
      sellerId: ordersTable.sellerId,
      trackingNumber: ordersTable.trackingNumber,
      notes: ordersTable.notes,
      processingWindowDays: ordersTable.processingWindowDays,
      processingWindowLabel: ordersTable.processingWindowLabel,
      manualPayout: ordersTable.manualPayout,
      createdAt: ordersTable.createdAt,
      updatedAt: ordersTable.updatedAt,
    } as const;

    const dedupeKey = `stripe:${req.params.sessionKey}`;
    const siblingOrders = await db.select(orderColumns).from(ordersTable)
      .where(eq(ordersTable.notes, dedupeKey));

    if (siblingOrders.length === 0) {
      res.status(404).json({ error: "Cart receipt not found" });
      return;
    }

    const order = siblingOrders[0]!;

    const sellerProfile = order.sellerId
      ? await db.select({
          displayName: profilesTable.displayName,
          handle: profilesTable.handle,
          avatarUrl: profilesTable.avatarUrl,
        })
          .from(profilesTable)
          .where(eq(profilesTable.userId, order.sellerId))
          .limit(1)
          .then(r => r[0] ?? null)
      : null;

    res.json({
      order,
      siblingOrders,
      buyerProfile: null,
      sellerProfile: sellerProfile
        ? {
            displayName: sellerProfile.displayName ?? null,
            handle: sellerProfile.handle ?? null,
            avatarUrl: sellerProfile.avatarUrl ?? null,
          }
        : null,
      buyerEmail: null,
      isPublicView: true,
    });
  } catch (err) {
    logger.error({ err }, "orders/cart/:sessionKey GET error");
    res.status(500).json({ error: "Failed to load cart receipt" });
  }
});

export default router;
