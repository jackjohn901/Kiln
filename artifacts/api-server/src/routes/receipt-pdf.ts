import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { ordersTable, profilesTable, usersTable, userSettingsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ─── Colours ────────────────────────────────────────────────────────────────
const DARK   = rgb(0.173, 0.149, 0.129); // #2c2621
const MID    = rgb(0.541, 0.494, 0.455); // #8a7e74
const RULE   = rgb(0.906, 0.890, 0.863); // #e7e3dc
const BLACK  = rgb(0,     0,     0    );

// ─── Helpers ────────────────────────────────────────────────────────────────
function usd(cents: number): string {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function usdDollars(dollars: number): string {
  return dollars.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function fmtDate(val: Date | string): string {
  return new Date(val).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function ordinalId(id: string): string {
  return "KLN-" + id.slice(0, 8).toUpperCase();
}

function sessionReceiptId(sessionKey: string): string {
  return "KLN-CART-" + sessionKey.slice(-6).toUpperCase();
}

// ─── Core receipt-builder ────────────────────────────────────────────────────
interface ReceiptLine {
  title:       string;
  description: string | null;
  amount:      number;   // dollars
}

interface ReceiptData {
  refNum:         string;
  receiptTitle:   string;
  dateStr:        string;
  statusLabel:    string;
  typeLabel:      string;
  lines:          ReceiptLine[];
  total:          number;  // dollars
  buyerName:      string | null;
  buyerAddress:   string | null;
  buyerEmail:     string | null;
  trackingNumber: string | null;
  processingWindow: string | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending:     "Pending",
  inquiry:     "Inquiry sent",
  in_progress: "In Progress",
  shipped:     "Shipped",
  delivered:   "Delivered",
  waitlisted:  "Waitlisted",
  confirmed:   "Confirmed",
  cancelled:   "Cancelled",
};

const TYPE_LABELS: Record<string, string> = {
  drop:       "Drop",
  listing:    "Shop",
  commission: "Commission",
  workshop:   "Workshop",
  inquiry:    "Inquiry",
};

async function buildReceiptPdf(data: ReceiptData): Promise<Uint8Array> {
  const doc    = await PDFDocument.create();
  const bold   = await doc.embedFont(StandardFonts.HelveticaBold);
  const normal = await doc.embedFont(StandardFonts.Helvetica);

  const page  = doc.addPage([595, 842]); // A4
  const { width, height } = page.getSize();
  const ML = 60;   // margin left
  const MR = 60;   // margin right
  const CW = width - ML - MR;  // content width
  let y = height - 60;

  // ── Header ────────────────────────────────────────────────────────────────
  page.drawText("Kiln", { x: ML, y, font: bold, size: 22, color: DARK });
  page.drawText("kilnfire.replit.app", { x: ML, y: y - 14, font: normal, size: 9, color: MID });

  page.drawText(data.refNum, { x: ML + CW - bold.widthOfTextAtSize(data.refNum, 14), y, font: bold, size: 14, color: DARK });
  page.drawText(data.receiptTitle, {
    x: ML + CW - normal.widthOfTextAtSize(data.receiptTitle, 9),
    y: y - 14, font: normal, size: 9, color: MID,
  });

  y -= 30;
  page.drawLine({ start: { x: ML, y }, end: { x: ML + CW, y }, thickness: 1.5, color: BLACK });
  y -= 22;

  // ── Meta row: Date · Status · Type ───────────────────────────────────────
  const colW = CW / 3;
  const metaItems = [
    { label: "Date",       value: data.dateStr },
    { label: "Status",     value: data.statusLabel },
    { label: "Order type", value: data.typeLabel },
  ];
  metaItems.forEach((item, i) => {
    const x = ML + i * colW;
    page.drawText(item.label.toUpperCase(), { x, y, font: bold, size: 7, color: MID });
    page.drawText(item.value, { x, y: y - 12, font: normal, size: 11, color: DARK });
  });

  y -= 38;
  page.drawLine({ start: { x: ML, y }, end: { x: ML + CW, y }, thickness: 0.5, color: RULE });
  y -= 14;

  // ── Items table header ────────────────────────────────────────────────────
  page.drawText("ITEM", { x: ML, y, font: bold, size: 7, color: MID });
  page.drawText("PRICE", {
    x: ML + CW - bold.widthOfTextAtSize("PRICE", 7),
    y, font: bold, size: 7, color: MID,
  });
  y -= 6;
  page.drawLine({ start: { x: ML, y }, end: { x: ML + CW, y }, thickness: 0.5, color: RULE });
  y -= 16;

  // ── Line items ────────────────────────────────────────────────────────────
  const maxTitleWidth = CW - 70;
  for (const line of data.lines) {
    const priceStr = usdDollars(line.amount);
    const priceW   = normal.widthOfTextAtSize(priceStr, 11);

    // Truncate long titles to fit
    let title = line.title;
    while (title.length > 4 && normal.widthOfTextAtSize(title, 11) > maxTitleWidth) {
      title = title.slice(0, -1);
    }
    if (title !== line.title) title = title.slice(0, -1) + "…";

    page.drawText(title, { x: ML, y, font: normal, size: 11, color: DARK });
    page.drawText(priceStr, { x: ML + CW - priceW, y, font: bold, size: 11, color: DARK });

    if (line.description) {
      y -= 13;
      let desc = line.description;
      while (desc.length > 4 && normal.widthOfTextAtSize(desc, 8) > maxTitleWidth) {
        desc = desc.slice(0, -1);
      }
      if (desc !== line.description) desc = desc.slice(0, -1) + "…";
      page.drawText(desc, { x: ML, y, font: normal, size: 8, color: MID });
    }

    y -= 10;
    page.drawLine({ start: { x: ML, y }, end: { x: ML + CW, y }, thickness: 0.5, color: RULE });
    y -= 16;
  }

  // ── Total ─────────────────────────────────────────────────────────────────
  y -= 4;
  page.drawLine({ start: { x: ML, y }, end: { x: ML + CW, y }, thickness: 1.5, color: BLACK });
  y -= 18;

  const totalStr = usdDollars(data.total);
  const totalLabelW = bold.widthOfTextAtSize("TOTAL", 7);
  const totalValW   = bold.widthOfTextAtSize(totalStr, 16);
  const totalX = ML + CW - Math.max(totalLabelW, totalValW);

  page.drawText("TOTAL", { x: totalX, y, font: bold, size: 7, color: MID });
  y -= 16;
  page.drawText(totalStr, {
    x: ML + CW - totalValW, y, font: bold, size: 16, color: DARK,
  });
  y -= 32;

  // ── Optional metadata blocks ───────────────────────────────────────────────
  function drawMeta(label: string, value: string) {
    page.drawText(label.toUpperCase(), { x: ML, y, font: bold, size: 7, color: MID });
    y -= 13;
    // Wrap value at 80 chars visually (crude but safe)
    const words = value.split(" ");
    let line = "";
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (normal.widthOfTextAtSize(candidate, 11) > CW) {
        page.drawText(line, { x: ML, y, font: normal, size: 11, color: DARK });
        y -= 13;
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) {
      page.drawText(line, { x: ML, y, font: normal, size: 11, color: DARK });
      y -= 13;
    }
    y -= 8;
  }

  if (data.buyerName || data.buyerAddress) {
    const billTo = [data.buyerName, data.buyerAddress].filter(Boolean).join("\n");
    drawMeta("Billed to", billTo);
  }

  if (data.processingWindow) {
    drawMeta("Processing time", data.processingWindow);
  }

  if (data.trackingNumber) {
    drawMeta("Tracking", data.trackingNumber);
  }

  if (data.buyerEmail) {
    drawMeta("Receipt emailed to", data.buyerEmail);
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const footerY = 40;
  page.drawLine({ start: { x: ML, y: footerY + 14 }, end: { x: ML + CW, y: footerY + 14 }, thickness: 0.5, color: RULE });
  const footerText = "Thank you for your purchase. Questions? Visit kilnfire.replit.app/kiln/messages";
  const footerW = normal.widthOfTextAtSize(footerText, 8);
  page.drawText(footerText, {
    x: ML + (CW - footerW) / 2, y: footerY, font: normal, size: 8, color: MID,
  });

  return doc.save();
}

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

export default router;
