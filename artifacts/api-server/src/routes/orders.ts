import { Router, type IRouter } from "express";
import rateLimit from "express-rate-limit";
import { db } from "@workspace/db";
import { ordersTable, profilesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// Per-IP rate limit for the public cart receipt endpoint. The endpoint is open
// (no auth) so this is a defensive measure against bulk scanning / order
// enumeration. 30 requests/minute is permissive enough for legitimate viewing
// (a buyer revisiting their receipt) while blocking automated enumeration.
//
// `req.ip` resolves to the real client IP via the platform-set X-Forwarded-For
// header (the app sets `trust proxy` in app.ts). We disable express-rate-limit's
// `trustProxy` validation because a permissive trust-proxy is intentional here:
// per-IP keying must reflect the real client rather than collapsing every user
// onto the shared proxy IP (which would break legitimate use). The residual
// XFF-spoofing risk is acceptable — session keys are long, opaque Stripe IDs, so
// enumeration is already impractical and this limit is purely defense-in-depth.
const cartReceiptLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  validate: { trustProxy: false },
  message: { error: "Too many requests. Please try again later." },
});

// GET /orders/cart/:sessionKey — public read-only cart receipt by Stripe session key.
// Does NOT require authentication. Returns purchase items and seller info only;
// buyer PII (email, name, address) is intentionally omitted from this public view.
// The session key is sufficient to scope the response — it is a long, opaque Stripe ID
// that is only shared by the buyer who completed checkout.
router.get("/orders/cart/:sessionKey", cartReceiptLimiter, async (req, res): Promise<void> => {
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
