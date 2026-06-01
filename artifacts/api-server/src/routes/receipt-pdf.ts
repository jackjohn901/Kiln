import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ordersTable, profilesTable, usersTable, userSettingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { logger } from "../lib/logger";
import {
  buildReceiptPdf,
  fmtDate,
  ordinalId,
  sessionReceiptId,
  STATUS_LABELS,
  TYPE_LABELS,
  type ReceiptData,
} from "../lib/receiptPdf";

const router: IRouter = Router();

// ─── Shared order-column selector ───────────────────────────────────────────
const ORDER_COLS = {
  id:                   ordersTable.id,
  type:                 ordersTable.type,
  title:                ordersTable.title,
  description:          ordersTable.description,
  amount:               ordersTable.amount,
  status:               ordersTable.status,
  sellerId:             ordersTable.sellerId,
  notes:                ordersTable.notes,
  shippingAddress:      ordersTable.shippingAddress,
  trackingNumber:       ordersTable.trackingNumber,
  processingWindowDays: ordersTable.processingWindowDays,
  processingWindowLabel:ordersTable.processingWindowLabel,
  buyerId:              ordersTable.buyerId,
  createdAt:            ordersTable.createdAt,
  quantity:             ordersTable.quantity,
} as const;

// ─── Route: single order or its siblings ────────────────────────────────────
// GET /me/orders/:id/receipt.pdf
router.get("/me/orders/:id/receipt.pdf", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const rows = await db.select(ORDER_COLS).from(ordersTable)
      .where(and(eq(ordersTable.id, req.params.id), eq(ordersTable.buyerId, req.user.id)))
      .limit(1);

    if (rows.length === 0) { res.status(404).json({ error: "Order not found" }); return; }

    let order = rows[0]!;

    // Backfill processing window from seller settings if order has none stamped
    if (order.processingWindowDays === null && order.processingWindowLabel === null && order.sellerId) {
      const [settingsRow] = await db
        .select({ paymentSettings: userSettingsTable.paymentSettings })
        .from(userSettingsTable)
        .where(eq(userSettingsTable.userId, order.sellerId))
        .limit(1);
      if (settingsRow) {
        const ps = settingsRow.paymentSettings as Record<string, unknown> | null;
        const liveDays  = ps && typeof ps.processingWindow === "number" ? ps.processingWindow : null;
        const liveLabel = ps && typeof ps.processingWindowLabel === "string" && (ps.processingWindowLabel as string).trim()
          ? (ps.processingWindowLabel as string).trim() : null;
        if (liveDays !== null || liveLabel !== null) {
          order = { ...order, processingWindowDays: liveDays, processingWindowLabel: liveLabel };
        }
      }
    }

    // Fetch sibling orders if this is a Stripe cart session
    let lineOrders = [order];
    if (order.notes && order.notes.startsWith("stripe:")) {
      const siblings = await db.select(ORDER_COLS).from(ordersTable)
        .where(and(eq(ordersTable.notes, order.notes), eq(ordersTable.buyerId, req.user.id)));
      if (siblings.length > 1) lineOrders = siblings;
    }

    const [buyerProfileRow, buyerUserRow] = await Promise.all([
      db.select({ displayName: profilesTable.displayName, location: profilesTable.location })
        .from(profilesTable).where(eq(profilesTable.userId, req.user.id)).limit(1).then(r => r[0] ?? null),
      db.select({ email: usersTable.email })
        .from(usersTable).where(eq(usersTable.id, req.user.id)).limit(1).then(r => r[0] ?? null),
    ]);

    const isCart = lineOrders.length > 1;
    const refNum = isCart
      ? sessionReceiptId(order.notes!.slice(7))
      : ordinalId(order.id);

    const processingWindowText = order.processingWindowLabel
      ? `Ships ${order.processingWindowLabel}`
      : order.processingWindowDays !== null
        ? `Ships within ${order.processingWindowDays} business day${order.processingWindowDays === 1 ? "" : "s"}`
        : null;

    const data: ReceiptData = {
      refNum,
      receiptTitle:  isCart ? "Cart Receipt" : "Order Receipt",
      dateStr:       fmtDate(order.createdAt),
      statusLabel:   STATUS_LABELS[order.status] ?? order.status,
      typeLabel:     TYPE_LABELS[order.type]     ?? order.type,
      lines:         lineOrders.map(o => ({ title: o.title, description: o.description ?? null, amount: o.amount })),
      total:         lineOrders.reduce((s, o) => s + o.amount, 0),
      buyerName:     buyerProfileRow?.displayName ?? null,
      buyerAddress:  order.shippingAddress ?? buyerProfileRow?.location ?? null,
      buyerEmail:    buyerUserRow?.email ?? null,
      trackingNumber:order.trackingNumber ?? null,
      processingWindow: processingWindowText,
    };

    const pdf      = await buildReceiptPdf(data);
    const filename = `Kiln_Receipt_${refNum}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdf.length);
    res.end(Buffer.from(pdf));
  } catch (err) {
    logger.error({ err }, "me/orders/:id/receipt.pdf GET error");
    res.status(500).json({ error: "Failed to generate receipt PDF" });
  }
});

// ─── Route: cart receipt by Stripe session key ───────────────────────────────
// GET /me/orders/cart/:sessionKey/receipt.pdf
router.get("/me/orders/cart/:sessionKey/receipt.pdf", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const dedupeKey = `stripe:${req.params.sessionKey}`;
    const siblings  = await db.select(ORDER_COLS).from(ordersTable)
      .where(and(eq(ordersTable.notes, dedupeKey), eq(ordersTable.buyerId, req.user.id)));

    if (siblings.length === 0) { res.status(404).json({ error: "Cart receipt not found" }); return; }

    const order = siblings[0]!;

    const [buyerProfileRow, buyerUserRow] = await Promise.all([
      db.select({ displayName: profilesTable.displayName, location: profilesTable.location })
        .from(profilesTable).where(eq(profilesTable.userId, req.user.id)).limit(1).then(r => r[0] ?? null),
      db.select({ email: usersTable.email })
        .from(usersTable).where(eq(usersTable.id, req.user.id)).limit(1).then(r => r[0] ?? null),
    ]);

    const refNum = sessionReceiptId(req.params.sessionKey);

    const data: ReceiptData = {
      refNum,
      receiptTitle:  "Cart Receipt",
      dateStr:       fmtDate(order.createdAt),
      statusLabel:   STATUS_LABELS[order.status] ?? order.status,
      typeLabel:     TYPE_LABELS[order.type]     ?? order.type,
      lines:         siblings.map(o => ({ title: o.title, description: o.description ?? null, amount: o.amount })),
      total:         siblings.reduce((s, o) => s + o.amount, 0),
      buyerName:     buyerProfileRow?.displayName ?? null,
      buyerAddress:  order.shippingAddress ?? buyerProfileRow?.location ?? null,
      buyerEmail:    buyerUserRow?.email ?? null,
      trackingNumber:order.trackingNumber ?? null,
      processingWindow: null,
    };

    const pdf      = await buildReceiptPdf(data);
    const filename = `Kiln_Receipt_${refNum}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdf.length);
    res.end(Buffer.from(pdf));
  } catch (err) {
    logger.error({ err }, "me/orders/cart/:sessionKey/receipt.pdf GET error");
    res.status(500).json({ error: "Failed to generate cart receipt PDF" });
  }
});

// ─── Route: seller packing slip PDF ─────────────────────────────────────────
// GET /me/sales/:id/packing-slip.pdf
router.get("/me/sales/:id/packing-slip.pdf", async (req, res): Promise<void> => {
  if (!req.isAuthenticated()) { res.status(401).json({ error: "Unauthorized" }); return; }

  try {
    const rows = await db.select(ORDER_COLS).from(ordersTable)
      .where(and(eq(ordersTable.id, req.params.id), eq(ordersTable.sellerId, req.user.id)))
      .limit(1);

    if (rows.length === 0) { res.status(404).json({ error: "Sale not found" }); return; }

    const order = rows[0]!;

    const buyerProfileRow = order.buyerId
      ? await db.select({ displayName: profilesTable.displayName })
          .from(profilesTable).where(eq(profilesTable.userId, order.buyerId)).limit(1).then(r => r[0] ?? null)
      : null;

    const refNum = ordinalId(order.id);

    const processingWindowText = order.processingWindowLabel
      ? `Ships ${order.processingWindowLabel}`
      : order.processingWindowDays !== null
        ? `Ships within ${order.processingWindowDays} business day${order.processingWindowDays === 1 ? "" : "s"}`
        : null;

    const buyerNotes = order.notes && !order.notes.startsWith("stripe:") ? order.notes : null;

    const data: ReceiptData = {
      refNum,
      receiptTitle:     "Packing Slip",
      dateStr:          fmtDate(order.createdAt),
      statusLabel:      STATUS_LABELS[order.status] ?? order.status,
      typeLabel:        TYPE_LABELS[order.type]     ?? order.type,
      lines:            [{ title: order.title, description: order.description ?? null, amount: order.amount, quantity: order.quantity ?? 1 }],
      total:            order.amount,
      buyerName:        buyerProfileRow?.displayName ?? null,
      buyerAddress:     order.shippingAddress ?? null,
      buyerEmail:       null,
      trackingNumber:   order.trackingNumber ?? null,
      processingWindow: processingWindowText,
      notes:            buyerNotes,
    };

    const pdf      = await buildReceiptPdf(data);
    const filename = `Kiln_PackingSlip_${refNum}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdf.length);
    res.end(Buffer.from(pdf));
  } catch (err) {
    logger.error({ err }, "me/sales/:id/packing-slip.pdf GET error");
    res.status(500).json({ error: "Failed to generate packing slip PDF" });
  }
});

export default router;
